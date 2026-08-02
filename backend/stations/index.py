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


def station_row_to_json(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(s['id']),
        'name': s['name'],
        'code1c': s['code1c'],
        'address': s['address'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD автозаправочных станций (АЗС) для менеджера с правом 'stations'.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом АЗС либо ошибкой.
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

        # АЗС видны любой авторизованной роли для GET,
        # но изменять их может только менеджер с правами 'stations'.
        is_manager = session['role'] == 'manager'
        manager = None
        if is_manager:
            cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
            manager = cur.fetchone()

        if method == 'GET':
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM stations')
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, name, code1c, address FROM stations ORDER BY id LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
            items = [station_row_to_json(s) for s in rows]
            pages = max(1, (total + limit - 1) // limit)

            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if not is_manager or not manager or 'stations' not in (manager['sections'] or []):
            return response(403, {'error': 'Доступ запрещён'})
        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = json.loads(event.get('body') or '{}')
            name = (body_data.get('name') or '').strip()
            code1c = body_data.get('code1c') or ''
            address = body_data.get('address') or ''

            if not name:
                return response(400, {'error': 'Укажите наименование'})

            cur.execute(
                'INSERT INTO stations (name, code1c, address) VALUES (%s, %s, %s) '
                'RETURNING id, name, code1c, address',
                (name, code1c, address),
            )
            s = cur.fetchone()
            return response(201, station_row_to_json(s))

        if method == 'PUT':
            body_data = json.loads(event.get('body') or '{}')
            sid = body_data.get('id')
            if not sid:
                return response(400, {'error': 'Не указан id'})

            name = (body_data.get('name') or '').strip()
            code1c = body_data.get('code1c') or ''
            address = body_data.get('address') or ''

            cur.execute(
                'UPDATE stations SET name=%s, code1c=%s, address=%s WHERE id=%s '
                'RETURNING id, name, code1c, address',
                (name, code1c, address, sid),
            )
            s = cur.fetchone()
            if not s:
                return response(404, {'error': 'АЗС не найдена'})
            return response(200, station_row_to_json(s))

        if method == 'DELETE':
            sid = params.get('id')
            if not sid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM stations WHERE id = %s', (sid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
