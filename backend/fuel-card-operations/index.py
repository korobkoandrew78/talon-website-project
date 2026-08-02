import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_header(event: Dict[str, Any], name: str):
    headers = event.get('headers') or {}
    lname = name.lower()
    for k, v in headers.items():
        if k.lower() == lname:
            return v
    return None


def response(status: int, body: Dict[str, Any]):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str),
    }


def get_session(cur, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    token = get_header(event, 'X-Auth-Token')
    if not token:
        return None
    cur.execute('SELECT role, user_id, expires_at FROM sessions WHERE token = %s', (token,))
    session = cur.fetchone()
    if not session or session['expires_at'] < datetime.utcnow():
        return None
    return session


def op_row_to_json(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(r['id']),
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
        'fuelCardId': str(r['fuel_card_id']) if r['fuel_card_id'] else '',
        'cardNumber': r['card_number'],
        'clientId': str(r['client_id']) if r['client_id'] else '',
        'clientName': r['client_name'],
        'fuelTypeId': str(r['fuel_type_id']) if r['fuel_type_id'] else '',
        'fuelName': r['fuel_name'],
        'stationId': str(r['station_id']) if r['station_id'] else '',
        'stationName': r['station_name'],
        'operation': r['operation'],
        'quantity': float(r['quantity']) if r['quantity'] is not None else 0,
        'price': float(r['price']) if r['price'] is not None else 0,
        'amount': float(r['amount']) if r['amount'] is not None else 0,
        'comment': r['comment'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: журнал операций по топливным картам (только чтение) для менеджера с правом 'operations'.
    Args: event с httpMethod, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком операций с учётом фильтров.
    '''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    conn = get_conn()
    try:
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        session = get_session(cur, event)
        if not session:
            return response(401, {'error': 'Не авторизован'})
        if session['role'] != 'manager':
            return response(403, {'error': 'Доступ запрещён'})

        if method != 'GET':
            return response(405, {'error': 'Метод не поддерживается'})

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager or 'operations' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        params = event.get('queryStringParameters') or {}
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        client_id = params.get('client_id')
        fuel_type_id = params.get('fuel_type_id')
        station_id = params.get('station_id')
        operation = params.get('operation')
        card = (params.get('card') or '').strip()

        page = max(1, int(params.get('page', 1)))
        limit = max(1, int(params.get('limit', 50)))
        offset = (page - 1) * limit

        where = []
        args: list = []
        if date_from:
            where.append('created_at >= %s')
            args.append(f'{date_from} 00:00:00')
        if date_to:
            where.append('created_at <= %s')
            args.append(f'{date_to} 23:59:59')
        if client_id:
            where.append('client_id = %s')
            args.append(client_id)
        if fuel_type_id:
            where.append('fuel_type_id = %s')
            args.append(fuel_type_id)
        if station_id:
            where.append('station_id = %s')
            args.append(station_id)
        if operation:
            where.append('operation = %s')
            args.append(operation)
        if card:
            where.append('card_number ILIKE %s')
            args.append(f'%{card}%')
        where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

        cur.execute(f'SELECT COUNT(*) AS cnt FROM fuel_card_operations {where_sql}', args)
        total = cur.fetchone()['cnt']

        cur.execute(
            f'SELECT id, created_at, fuel_card_id, card_number, client_id, client_name, fuel_type_id, fuel_name, '
            f'station_id, station_name, operation, quantity, price, amount, comment '
            f'FROM fuel_card_operations {where_sql} ORDER BY created_at DESC, id DESC LIMIT %s OFFSET %s',
            args + [limit, offset],
        )
        rows = cur.fetchall()
        items = [op_row_to_json(r) for r in rows]
        pages = max(1, (total + limit - 1) // limit)

        return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})
    finally:
        conn.close()