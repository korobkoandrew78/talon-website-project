import json
import os
from datetime import date, datetime
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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


def parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    raw = event.get('body') or '{}'
    data = json.loads(raw) if isinstance(raw, str) else raw
    if isinstance(data, str):
        data = json.loads(data)
    return data or {}


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


def row_to_json(t: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(t['id']),
        'number': t['number'],
        'fuelTypeId': str(t['fuel_type_id']),
        'clientId': str(t['client_id']),
        'volume': float(t['volume']),
        'status': t['status'],
        'issuedAt': t['issued_at'].isoformat() if t['issued_at'] else '',
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD талонов для менеджера, просмотр своих талонов для клиента.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом талона либо ошибкой.
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

        params = event.get('queryStringParameters') or {}

        if method == 'GET' and params.get('client_self') == '1':
            if session['role'] != 'client':
                return response(403, {'error': 'Доступ запрещён'})
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM coupons WHERE client_id = %s', (session['user_id'],))
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, number, fuel_type_id, client_id, volume, status, issued_at FROM coupons '
                'WHERE client_id = %s ORDER BY id LIMIT %s OFFSET %s',
                (session['user_id'], limit, offset),
            )
            rows = cur.fetchall()
            items = [row_to_json(t) for t in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if session['role'] != 'manager':
            return response(403, {'error': 'Доступ запрещён'})

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager or 'coupons' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        if method == 'GET':
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM coupons')
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, number, fuel_type_id, client_id, volume, status, issued_at FROM coupons '
                'ORDER BY id LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
            items = [row_to_json(t) for t in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = parse_body(event)
            number = (body_data.get('number') or '').strip()
            fuel_type_id = body_data.get('fuelTypeId')
            client_id = body_data.get('clientId')
            volume = body_data.get('volume') or 0
            status = body_data.get('status') or 'active'
            issued_at = body_data.get('issuedAt') or date.today().isoformat()

            if not number or not fuel_type_id or not client_id:
                return response(400, {'error': 'Укажите номер, вид топлива и клиента'})

            cur.execute(
                'INSERT INTO coupons (number, fuel_type_id, client_id, volume, status, issued_at) '
                'VALUES (%s, %s, %s, %s, %s, %s) '
                'RETURNING id, number, fuel_type_id, client_id, volume, status, issued_at',
                (number, fuel_type_id, client_id, volume, status, issued_at),
            )
            t = cur.fetchone()
            return response(201, row_to_json(t))

        if method == 'PUT':
            body_data = parse_body(event)
            tid = body_data.get('id')
            if not tid:
                return response(400, {'error': 'Не указан id'})

            number = (body_data.get('number') or '').strip()
            fuel_type_id = body_data.get('fuelTypeId')
            client_id = body_data.get('clientId')
            volume = body_data.get('volume') or 0
            status = body_data.get('status') or 'active'
            issued_at = body_data.get('issuedAt') or date.today().isoformat()

            cur.execute(
                'UPDATE coupons SET number=%s, fuel_type_id=%s, client_id=%s, volume=%s, status=%s, issued_at=%s '
                'WHERE id=%s RETURNING id, number, fuel_type_id, client_id, volume, status, issued_at',
                (number, fuel_type_id, client_id, volume, status, issued_at, tid),
            )
            t = cur.fetchone()
            if not t:
                return response(404, {'error': 'Талон не найден'})
            return response(200, row_to_json(t))

        if method == 'DELETE':
            tid = params.get('id')
            if not tid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM coupons WHERE id = %s', (tid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()