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


def card_row_to_json(c: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': str(c['id']),
        'code': c['code'],
        'index': c['idx'],
        'fuelTypeId': str(c['fuel_type_id']),
        'clientId': str(c['client_id']),
        'balance': float(c['balance']),
        'status': c['status'],
        'blockReason': c['block_reason'],
        'dailyLimit': float(c['daily_limit']),
        'activatedAt': c['activated_at'].isoformat() if c['activated_at'] else '',
        'blockedAt': c['blocked_at'].isoformat() if c['blocked_at'] else '',
    }


def create_balance_card_if_needed(cur, client_id: int, fuel_type_id: int):
    '''Проверяет наличие балансной карты (code=0000) у клиента для вида топлива,
    и создаёт её при отсутствии с первым свободным idx (1..9).'''
    cur.execute(
        "SELECT id FROM fuel_cards WHERE code='0000' AND client_id=%s AND fuel_type_id=%s",
        (client_id, fuel_type_id),
    )
    if cur.fetchone():
        return None

    cur.execute(
        "SELECT idx FROM fuel_cards WHERE code='0000' AND client_id=%s",
        (client_id,),
    )
    used = {row['idx'] for row in cur.fetchall()}
    free_idx = None
    for i in range(1, 10):
        if i not in used:
            free_idx = i
            break
    if free_idx is None:
        return None

    cur.execute(
        "INSERT INTO fuel_cards (code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at) "
        "VALUES ('0000', %s, %s, %s, 0, 'active', '', 0, %s) "
        "RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at",
        (free_idx, fuel_type_id, client_id, date.today()),
    )
    return cur.fetchone()


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD и спец-действия (block/unblock/topup/move) топливных карт для менеджера,
    просмотр своих карт для клиента.
    Args: event с httpMethod, body, headers, queryStringParameters; context с request_id.
    Returns: HTTP JSON ответ со списком/объектом карты либо ошибкой.
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
        action = params.get('action')

        # Клиент смотрит только свои карты
        if method == 'GET' and params.get('client_self') == '1':
            if session['role'] != 'client':
                return response(403, {'error': 'Доступ запрещён'})
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            cur.execute('SELECT COUNT(*) AS cnt FROM fuel_cards WHERE client_id = %s', (session['user_id'],))
            total = cur.fetchone()['cnt']

            cur.execute(
                'SELECT id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at '
                'FROM fuel_cards WHERE client_id = %s ORDER BY id LIMIT %s OFFSET %s',
                (session['user_id'], limit, offset),
            )
            rows = cur.fetchall()
            items = [card_row_to_json(c) for c in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        # Остальные операции — только для менеджера
        if session['role'] != 'manager':
            return response(403, {'error': 'Доступ запрещён'})

        cur.execute('SELECT read_only, sections FROM managers WHERE id = %s', (session['user_id'],))
        manager = cur.fetchone()
        if not manager or 'fuelCards' not in (manager['sections'] or []):
            return response(403, {'error': 'Нет доступа к разделу'})

        if method == 'GET':
            f_number = (params.get('number') or '').strip()
            f_client = params.get('client_id')
            f_fuel = params.get('fuel_type_id')
            page = max(1, int(params.get('page', 1)))
            limit = max(1, int(params.get('limit', 10)))
            offset = (page - 1) * limit

            where = []
            args: list = []
            if f_number:
                where.append("(code || '/' || idx::text) ILIKE %s")
                args.append(f'%{f_number}%')
            if f_client:
                where.append('client_id = %s')
                args.append(f_client)
            if f_fuel:
                where.append('fuel_type_id = %s')
                args.append(f_fuel)
            where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

            cur.execute(f'SELECT COUNT(*) AS cnt FROM fuel_cards {where_sql}', args)
            total = cur.fetchone()['cnt']

            cur.execute(
                f'SELECT id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at '
                f'FROM fuel_cards {where_sql} ORDER BY id LIMIT %s OFFSET %s',
                args + [limit, offset],
            )
            rows = cur.fetchall()
            items = [card_row_to_json(c) for c in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        # Действия и мутации требуют не-readonly доступа
        if manager['read_only']:
            return response(403, {'error': 'Режим только просмотр'})

        if method == 'POST' and action == 'block':
            body_data = json.loads(event.get('body') or '{}')
            cid = body_data.get('id')
            reason = body_data.get('reason') or ''
            if not cid:
                return response(400, {'error': 'Не указан id'})
            cur.execute(
                "UPDATE fuel_cards SET status='blocked', block_reason=%s, blocked_at=%s WHERE id=%s "
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at",
                (reason, date.today(), cid),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Карта не найдена'})
            return response(200, card_row_to_json(c))

        if method == 'POST' and action == 'unblock':
            body_data = json.loads(event.get('body') or '{}')
            cid = body_data.get('id')
            if not cid:
                return response(400, {'error': 'Не указан id'})
            cur.execute(
                "UPDATE fuel_cards SET status='active', block_reason='', blocked_at=NULL WHERE id=%s "
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at",
                (cid,),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Карта не найдена'})
            return response(200, card_row_to_json(c))

        if method == 'POST' and action == 'topup':
            body_data = json.loads(event.get('body') or '{}')
            cid = body_data.get('id')
            amount = body_data.get('amount')
            if not cid or amount is None:
                return response(400, {'error': 'Не указан id или сумма'})
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                return response(400, {'error': 'Некорректная сумма'})
            if amount <= 0:
                return response(400, {'error': 'Сумма должна быть положительной'})
            cur.execute(
                'UPDATE fuel_cards SET balance = balance + %s WHERE id=%s '
                'RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at',
                (amount, cid),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Карта не найдена'})
            return response(200, card_row_to_json(c))

        if method == 'POST' and action == 'move':
            body_data = json.loads(event.get('body') or '{}')
            from_id = body_data.get('from_id')
            to_id = body_data.get('to_id')
            amount = body_data.get('amount')
            if not from_id or not to_id or amount is None:
                return response(400, {'error': 'Не указаны карты или сумма'})
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                return response(400, {'error': 'Некорректная сумма'})
            if amount <= 0:
                return response(400, {'error': 'Сумма должна быть положительной'})
            if str(from_id) == str(to_id):
                return response(400, {'error': 'Карты должны различаться'})

            cur.execute('SELECT id, balance FROM fuel_cards WHERE id = %s', (from_id,))
            src = cur.fetchone()
            if not src:
                return response(404, {'error': 'Карта-источник не найдена'})
            if float(src['balance']) < amount:
                return response(400, {'error': 'Недостаточно средств на карте'})

            cur.execute('SELECT id FROM fuel_cards WHERE id = %s', (to_id,))
            dst = cur.fetchone()
            if not dst:
                return response(404, {'error': 'Карта назначения не найдена'})

            cur.execute('UPDATE fuel_cards SET balance = balance - %s WHERE id = %s', (amount, from_id))
            cur.execute('UPDATE fuel_cards SET balance = balance + %s WHERE id = %s', (amount, to_id))

            cur.execute(
                'SELECT id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at '
                'FROM fuel_cards WHERE id IN (%s, %s)',
                (from_id, to_id),
            )
            rows = cur.fetchall()
            return response(200, {'items': [card_row_to_json(c) for c in rows]})

        if method == 'POST':
            body_data = json.loads(event.get('body') or '{}')
            code = body_data.get('code') or ''
            idx = body_data.get('idx')
            fuel_type_id = body_data.get('fuel_type_id')
            client_id = body_data.get('client_id')
            daily_limit = body_data.get('daily_limit') or 0

            if not code or idx is None or not fuel_type_id or not client_id:
                return response(400, {'error': 'Заполните код, индекс, вид топлива и клиента'})

            cur.execute(
                'SELECT id FROM fuel_cards WHERE code=%s AND idx=%s AND client_id=%s',
                (code, idx, client_id),
            )
            if cur.fetchone():
                return response(400, {'error': f'Карта {code}/{idx} уже существует'})

            cur.execute(
                "INSERT INTO fuel_cards (code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at) "
                "VALUES (%s, %s, %s, %s, 0, 'active', '', %s, %s) "
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at",
                (code, idx, fuel_type_id, client_id, daily_limit, date.today()),
            )
            new_card = cur.fetchone()

            created = [card_row_to_json(new_card)]

            if code != '0000':
                balance_card = create_balance_card_if_needed(cur, client_id, fuel_type_id)
                if balance_card:
                    created.append(card_row_to_json(balance_card))

            return response(201, {'items': created})

        if method == 'PUT':
            body_data = json.loads(event.get('body') or '{}')
            cid = body_data.get('id')
            if not cid:
                return response(400, {'error': 'Не указан id'})

            fuel_type_id = body_data.get('fuel_type_id')
            client_id = body_data.get('client_id')
            daily_limit = body_data.get('daily_limit') or 0
            balance = body_data.get('balance')
            code = body_data.get('code')
            idx = body_data.get('idx')

            cur.execute(
                'UPDATE fuel_cards SET fuel_type_id=%s, client_id=%s, daily_limit=%s, balance=%s, code=%s, idx=%s '
                'WHERE id=%s RETURNING id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at',
                (fuel_type_id, client_id, daily_limit, balance, code, idx, cid),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Карта не найдена'})
            return response(200, card_row_to_json(c))

        if method == 'DELETE':
            cid = params.get('id')
            if not cid:
                return response(400, {'error': 'Не указан id'})
            cur.execute('DELETE FROM fuel_cards WHERE id = %s', (cid,))
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
