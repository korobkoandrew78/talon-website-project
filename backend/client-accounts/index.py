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


def account_row_to_json(a: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(a['id']),
        'clientId': str(a['client_id']),
        'login': a['login'],
        'password': a['password'],
        'readOnly': a['read_only'],
        'sections': a['sections'],
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD учётных записей клиента (логин/пароль/доступ) для менеджера с правом 'clients'.
    У одной компании (clients) может быть несколько учётных записей для входа.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом учётной записи либо ошибкой.
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

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager or 'clients' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        params = event.get('queryStringParameters') or {}

        if method == 'GET':
            client_id = params.get('client_id')
            if not client_id:
                return response(400, {'error': 'Не указан client_id'})
            cur.execute(
                'SELECT id, client_id, login, password, read_only, sections FROM client_accounts '
                'WHERE client_id = %s ORDER BY id',
                (client_id,),
            )
            rows = cur.fetchall()
            items = [account_row_to_json(a) for a in rows]
            return response(200, {'items': items})

        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = parse_body(event)
            client_id = body_data.get('clientId')
            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            if not client_id or not login or not password:
                return response(400, {'error': 'Укажите клиента, логин и пароль'})

            cur.execute('SELECT id FROM client_accounts WHERE login = %s', (login,))
            if cur.fetchone():
                return response(400, {'error': f'Логин «{login}» уже занят'})

            cur.execute(
                'INSERT INTO client_accounts (client_id, login, password, read_only, sections) '
                'VALUES (%s, %s, %s, %s, %s) '
                'RETURNING id, client_id, login, password, read_only, sections',
                (client_id, login, password, read_only, sections),
            )
            a = cur.fetchone()
            return response(201, account_row_to_json(a))

        if method == 'PUT':
            body_data = parse_body(event)
            aid = body_data.get('id')
            if not aid:
                return response(400, {'error': 'Не указан id'})

            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            if not login or not password:
                return response(400, {'error': 'Укажите логин и пароль'})

            cur.execute('SELECT id FROM client_accounts WHERE login = %s AND id != %s', (login, aid))
            if cur.fetchone():
                return response(400, {'error': f'Логин «{login}» уже занят'})

            cur.execute(
                'UPDATE client_accounts SET login=%s, password=%s, read_only=%s, sections=%s '
                'WHERE id=%s RETURNING id, client_id, login, password, read_only, sections',
                (login, password, read_only, sections, aid),
            )
            a = cur.fetchone()
            if not a:
                return response(404, {'error': 'Учётная запись не найдена'})
            return response(200, account_row_to_json(a))

        if method == 'DELETE':
            aid = params.get('id')
            if not aid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM client_accounts WHERE id = %s', (aid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
