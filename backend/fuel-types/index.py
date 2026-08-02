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


def fuel_row_to_json(f: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(f['id']),
        'name': f['name'],
        'code1c': f['code1c'],
        'price': float(f['price']),
        'unit': f['unit'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD видов топлива для менеджера с правом 'fuel'.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом вида топлива либо ошибкой.
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

        # Виды топлива видны любой авторизованной роли для GET (нужны для выбора в других разделах),
        # но изменять их может только менеджер с правами 'fuel'.
        is_manager = session['role'] == 'manager'
        manager = None
        if is_manager:
            cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
            manager = cur.fetchone()

        if method == 'GET':
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM fuel_types')
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, name, code1c, price, unit FROM fuel_types ORDER BY id LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
            items = [fuel_row_to_json(f) for f in rows]
            pages = max(1, (total + limit - 1) // limit)

            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if not is_manager or not manager or 'fuel' not in (manager['sections'] or []):
            return response(403, {'error': 'Доступ запрещён'})
        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = json.loads(event.get('body') or '{}')
            name = (body_data.get('name') or '').strip()
            code1c = body_data.get('code1c') or ''
            price = body_data.get('price') or 0
            unit = body_data.get('unit') or 'литр'

            if not name:
                return response(400, {'error': 'Укажите наименование'})

            cur.execute(
                'INSERT INTO fuel_types (name, code1c, price, unit) VALUES (%s, %s, %s, %s) '
                'RETURNING id, name, code1c, price, unit',
                (name, code1c, price, unit),
            )
            f = cur.fetchone()
            return response(201, fuel_row_to_json(f))

        if method == 'PUT':
            body_data = json.loads(event.get('body') or '{}')
            fid = body_data.get('id')
            if not fid:
                return response(400, {'error': 'Не указан id'})

            name = (body_data.get('name') or '').strip()
            code1c = body_data.get('code1c') or ''
            price = body_data.get('price') or 0
            unit = body_data.get('unit') or 'литр'

            cur.execute(
                'UPDATE fuel_types SET name=%s, code1c=%s, price=%s, unit=%s WHERE id=%s '
                'RETURNING id, name, code1c, price, unit',
                (name, code1c, price, unit, fid),
            )
            f = cur.fetchone()
            if not f:
                return response(404, {'error': 'Вид топлива не найден'})
            return response(200, fuel_row_to_json(f))

        if method == 'DELETE':
            fid = params.get('id')
            if not fid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM fuel_types WHERE id = %s', (fid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
