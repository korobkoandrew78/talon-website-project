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


def client_row_to_json(c: Dict[str, Any], include_password: bool = True) -> Dict[str, Any]:
    out = {
        'id': str(c['id']),
        'inn': c['inn'],
        'name': c['name'],
        'phone': c['phone'],
        'email': c['email'],
        'login': c['login'],
        'readOnly': c['read_only'],
        'sections': c['sections'],
    }
    if include_password and 'password' in c:
        out['password'] = c['password']
    return out


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD клиентов для менеджера, самопросмотр для клиента.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом клиента либо ошибкой.
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

        # Клиент смотрит только себя
        if method == 'GET' and params.get('self') == '1':
            if session['role'] != 'client':
                return response(403, {'error': 'Доступ запрещён'})
            cur.execute(
                'SELECT id, inn, name, phone, email, login, read_only, sections FROM clients WHERE id = %s',
                (session['user_id'],),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Клиент не найден'})
            return response(200, client_row_to_json(c, include_password=False))

        # Остальные операции — только для менеджера
        if session['role'] != 'manager':
            return response(403, {'error': 'Доступ запрещён'})

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager:
            return response(403, {'error': 'Доступ запрещён'})
        if 'clients' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        if method == 'GET':
            f_inn = (params.get('inn') or '').strip()
            f_name = (params.get('name') or '').strip()
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            where = []
            args = []
            if f_inn:
                where.append('inn ILIKE %s')
                args.append(f'%{f_inn}%')
            if f_name:
                where.append('name ILIKE %s')
                args.append(f'%{f_name}%')
            where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

            cur.execute(f'SELECT COUNT(*) AS cnt FROM clients {where_sql}', args)
            total = cur.fetchone()['cnt']

            cur.execute(
                f'SELECT id, inn, name, phone, email, login, password, read_only, sections FROM clients '
                f'{where_sql} ORDER BY id LIMIT %s OFFSET %s',
                args + [limit, offset],
            )
            rows = cur.fetchall()
            items = [client_row_to_json(c) for c in rows]
            pages = max(1, (total + limit - 1) // limit)

            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST':
            body_data = parse_body(event)
            inn = (body_data.get('inn') or '').strip()
            name = (body_data.get('name') or '').strip()
            phone = body_data.get('phone') or ''
            email = body_data.get('email') or ''
            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            if not inn or not name or not login:
                return response(400, {'error': 'Укажите ИНН, наименование и логин'})

            cur.execute(
                'INSERT INTO clients (inn, name, phone, email, login, password, read_only, sections) '
                'VALUES (%s, %s, %s, %s, %s, %s, %s, %s) '
                'RETURNING id, inn, name, phone, email, login, password, read_only, sections',
                (inn, name, phone, email, login, password, read_only, sections),
            )
            c = cur.fetchone()
            return response(201, client_row_to_json(c))

        if method == 'PUT':
            body_data = parse_body(event)
            cid = body_data.get('id')
            if not cid:
                return response(400, {'error': 'Не указан id'})

            inn = (body_data.get('inn') or '').strip()
            name = (body_data.get('name') or '').strip()
            phone = body_data.get('phone') or ''
            email = body_data.get('email') or ''
            login = (body_data.get('login') or '').strip()
            password = body_data.get('password') or ''
            read_only = bool(body_data.get('readOnly', False))
            sections = body_data.get('sections') or []

            cur.execute(
                'UPDATE clients SET inn=%s, name=%s, phone=%s, email=%s, login=%s, password=%s, read_only=%s, sections=%s '
                'WHERE id=%s RETURNING id, inn, name, phone, email, login, password, read_only, sections',
                (inn, name, phone, email, login, password, read_only, sections, cid),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Клиент не найден'})
            return response(200, client_row_to_json(c))

        if method == 'DELETE':
            cid = params.get('id')
            if not cid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM clients WHERE id = %s', (cid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()