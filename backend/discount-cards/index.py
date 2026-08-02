import json
import os
from datetime import datetime
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


def row_to_json(d: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(d['id']),
        'number': d['number'],
        'clientId': str(d['client_id']),
        'discount': float(d['discount']),
        'bonus': float(d['bonus']),
        'status': d['status'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD дисконтных карт для менеджера, просмотр своих карт для клиента.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом дисконтной карты либо ошибкой.
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

            cur.execute('SELECT COUNT(*) AS cnt FROM discount_cards WHERE client_id = %s', (session['user_id'],))
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, number, client_id, discount, bonus, status FROM discount_cards '
                'WHERE client_id = %s ORDER BY id LIMIT %s OFFSET %s',
                (session['user_id'], limit, offset),
            )
            rows = cur.fetchall()
            items = [row_to_json(d) for d in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if session['role'] != 'manager':
            return response(403, {'error': 'Доступ запрещён'})

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager or 'discountCards' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        if method == 'GET':
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM discount_cards')
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, number, client_id, discount, bonus, status FROM discount_cards '
                'ORDER BY id LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
            items = [row_to_json(d) for d in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = json.loads(event.get('body') or '{}')
            number = (body_data.get('number') or '').strip()
            client_id = body_data.get('clientId')
            discount = body_data.get('discount') or 0
            bonus = body_data.get('bonus') or 0
            status = body_data.get('status') or 'active'

            if not number or not client_id:
                return response(400, {'error': 'Укажите номер и клиента'})

            cur.execute(
                'INSERT INTO discount_cards (number, client_id, discount, bonus, status) '
                'VALUES (%s, %s, %s, %s, %s) RETURNING id, number, client_id, discount, bonus, status',
                (number, client_id, discount, bonus, status),
            )
            d = cur.fetchone()
            return response(201, row_to_json(d))

        if method == 'PUT':
            body_data = json.loads(event.get('body') or '{}')
            did = body_data.get('id')
            if not did:
                return response(400, {'error': 'Не указан id'})

            number = (body_data.get('number') or '').strip()
            client_id = body_data.get('clientId')
            discount = body_data.get('discount') or 0
            bonus = body_data.get('bonus') or 0
            status = body_data.get('status') or 'active'

            cur.execute(
                'UPDATE discount_cards SET number=%s, client_id=%s, discount=%s, bonus=%s, status=%s '
                'WHERE id=%s RETURNING id, number, client_id, discount, bonus, status',
                (number, client_id, discount, bonus, status, did),
            )
            d = cur.fetchone()
            if not d:
                return response(404, {'error': 'Карта не найдена'})
            return response(200, row_to_json(d))

        if method == 'DELETE':
            did = params.get('id')
            if not did:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM discount_cards WHERE id = %s', (did,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
