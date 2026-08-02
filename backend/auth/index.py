import json
import os
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any

import psycopg2
import psycopg2.extras


ADMIN_LOGIN = 'Pi0neer78'
ADMIN_PASSWORD = 'Tytparol1!'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: аутентификация admin/manager/client, выдача и проверка токенов сессии.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ с токеном/пользователем либо ошибкой.
    '''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    conn = get_conn()
    try:
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if method == 'POST':
            body_data = parse_body(event)
            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''

            if not login or not password:
                return response(400, {'error': 'Укажите логин и пароль'})

            role = None
            user_id = None
            user_payload: Dict[str, Any] = {}

            if login == ADMIN_LOGIN and password == ADMIN_PASSWORD:
                role = 'admin'
                user_id = None
                user_payload = {'login': ADMIN_LOGIN}
            else:
                cur.execute(
                    'SELECT id, login, password, full_name, phone, status, read_only, sections '
                    'FROM managers WHERE login = %s',
                    (login,),
                )
                manager = cur.fetchone()
                if manager and manager['password'] == password:
                    if manager['status'] == 'blocked':
                        return response(403, {'error': 'Учётная запись заблокирована'})
                    role = 'manager'
                    user_id = manager['id']
                    user_payload = {
                        'id': str(manager['id']),
                        'login': manager['login'],
                        'fullName': manager['full_name'],
                        'phone': manager['phone'],
                        'status': manager['status'],
                        'readOnly': manager['read_only'],
                        'sections': manager['sections'],
                    }
                else:
                    cur.execute(
                        'SELECT id, inn, name, phone, email, login, password, read_only, sections '
                        'FROM clients WHERE login = %s',
                        (login,),
                    )
                    client = cur.fetchone()
                    if client and client['password'] == password:
                        role = 'client'
                        user_id = client['id']
                        user_payload = {
                            'id': str(client['id']),
                            'inn': client['inn'],
                            'name': client['name'],
                            'phone': client['phone'],
                            'email': client['email'],
                            'login': client['login'],
                            'readOnly': client['read_only'],
                            'sections': client['sections'],
                        }

            if role is None:
                return response(401, {'error': 'Неверный логин или пароль'})

            token = secrets.token_hex(32)
            expires_at = datetime.utcnow() + timedelta(days=7)
            cur.execute(
                'INSERT INTO sessions (token, role, user_id, expires_at) VALUES (%s, %s, %s, %s)',
                (token, role, user_id, expires_at),
            )

            return response(200, {'token': token, 'role': role, 'user': user_payload})

        if method == 'GET':
            token = get_header(event, 'X-Auth-Token')
            if not token:
                return response(401, {'error': 'Не авторизован'})

            cur.execute(
                'SELECT role, user_id, expires_at FROM sessions WHERE token = %s',
                (token,),
            )
            session = cur.fetchone()
            if not session or session['expires_at'] < datetime.utcnow():
                return response(401, {'error': 'Сессия истекла'})

            role = session['role']
            user_id = session['user_id']
            user_payload: Dict[str, Any] = {}

            if role == 'admin':
                user_payload = {'login': ADMIN_LOGIN}
            elif role == 'manager':
                cur.execute(
                    'SELECT id, login, full_name, phone, status, read_only, sections '
                    'FROM managers WHERE id = %s',
                    (user_id,),
                )
                m = cur.fetchone()
                if not m:
                    return response(401, {'error': 'Пользователь не найден'})
                user_payload = {
                    'id': str(m['id']),
                    'login': m['login'],
                    'fullName': m['full_name'],
                    'phone': m['phone'],
                    'status': m['status'],
                    'readOnly': m['read_only'],
                    'sections': m['sections'],
                }
            elif role == 'client':
                cur.execute(
                    'SELECT id, inn, name, phone, email, login, read_only, sections '
                    'FROM clients WHERE id = %s',
                    (user_id,),
                )
                c = cur.fetchone()
                if not c:
                    return response(401, {'error': 'Пользователь не найден'})
                user_payload = {
                    'id': str(c['id']),
                    'inn': c['inn'],
                    'name': c['name'],
                    'phone': c['phone'],
                    'email': c['email'],
                    'login': c['login'],
                    'readOnly': c['read_only'],
                    'sections': c['sections'],
                }

            return response(200, {'role': role, 'user': user_payload})

        if method == 'DELETE':
            token = get_header(event, 'X-Auth-Token')
            if not token:
                return response(401, {'error': 'Не авторизован'})
            cur.execute('DELETE FROM sessions WHERE token = %s', (token,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()