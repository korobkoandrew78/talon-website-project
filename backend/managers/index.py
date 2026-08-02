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


def manager_row_to_json(m: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(m['id']),
        'login': m['login'],
        'password': m['password'],
        'fullName': m['full_name'],
        'phone': m['phone'],
        'status': m['status'],
        'readOnly': m['read_only'],
        'sections': m['sections'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD менеджеров для администратора с пагинацией.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом менеджера либо ошибкой.
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
        if session['role'] != 'admin':
            return response(403, {'error': 'Доступ запрещён'})

        params = event.get('queryStringParameters') or {}

        if method == 'GET':
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM managers')
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, login, password, full_name, phone, status, read_only, sections '
                'FROM managers ORDER BY id LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
            items = [manager_row_to_json(m) for m in rows]
            pages = max(1, (total + limit - 1) // limit)

            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if method == 'POST':
            body_data = json.loads(event.get('body') or '{}')
            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            full_name = (body_data.get('fullName') or '').strip()
            phone = body_data.get('phone') or ''
            status = body_data.get('status') or 'active'
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            if not login or not full_name:
                return response(400, {'error': 'Укажите логин и ФИО'})

            cur.execute(
                'INSERT INTO managers (login, password, full_name, phone, status, read_only, sections) '
                'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, login, password, full_name, phone, status, read_only, sections',
                (login, password, full_name, phone, status, read_only, sections),
            )
            m = cur.fetchone()
            return response(201, manager_row_to_json(m))

        if method == 'PUT':
            body_data = json.loads(event.get('body') or '{}')
            mid = body_data.get('id')
            if not mid:
                return response(400, {'error': 'Не указан id'})

            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            full_name = (body_data.get('fullName') or '').strip()
            phone = body_data.get('phone') or ''
            status = body_data.get('status') or 'active'
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            cur.execute(
                'UPDATE managers SET login=%s, password=%s, full_name=%s, phone=%s, status=%s, read_only=%s, sections=%s '
                'WHERE id=%s RETURNING id, login, password, full_name, phone, status, read_only, sections',
                (login, password, full_name, phone, status, read_only, sections, mid),
            )
            m = cur.fetchone()
            if not m:
                return response(404, {'error': 'Менеджер не найден'})
            return response(200, manager_row_to_json(m))

        if method == 'DELETE':
            mid = params.get('id')
            if not mid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM managers WHERE id = %s', (mid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
