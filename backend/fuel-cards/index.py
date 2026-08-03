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
    cur.execute('SELECT role, user_id, account_id, expires_at FROM sessions WHERE token = %s', (token,))
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
        'price': float(c['price']),
        'status': c['status'],
        'blockReason': c['block_reason'],
        'dailyLimit': float(c['daily_limit']),
        'activatedAt': c['activated_at'].isoformat() if c['activated_at'] else '',
        'blockedAt': c['blocked_at'].isoformat() if c['blocked_at'] else '',
    }


def unit_short(unit: str) -> str:
    return {'литр': 'л', 'руб': '₽', 'шт': 'шт'}.get(unit, 'шт')


def card_number_str(code: str, idx: int) -> str:
    return f'{code}/{idx}'


def get_client_name(cur, client_id) -> str:
    if not client_id:
        return ''
    cur.execute('SELECT name FROM clients WHERE id = %s', (client_id,))
    row = cur.fetchone()
    return row['name'] if row else ''


def get_fuel_info(cur, fuel_type_id) -> Dict[str, Any]:
    if not fuel_type_id:
        return {'name': '', 'price': 0, 'unit': 'литр'}
    cur.execute('SELECT name, price, unit FROM fuel_types WHERE id = %s', (fuel_type_id,))
    row = cur.fetchone()
    return row if row else {'name': '', 'price': 0, 'unit': 'литр'}


def get_station_name(cur, station_id) -> str:
    if not station_id:
        return ''
    cur.execute('SELECT name FROM stations WHERE id = %s', (station_id,))
    row = cur.fetchone()
    return row['name'] if row else ''


def log_operation(
    cur,
    fuel_card_id,
    card_number: str,
    client_id,
    client_name: str,
    fuel_type_id,
    fuel_name: str,
    station_id,
    station_name: str,
    operation: str,
    quantity: float,
    price: float,
    amount: float,
    comment: str,
):
    cur.execute(
        'INSERT INTO fuel_card_operations '
        '(fuel_card_id, card_number, client_id, client_name, fuel_type_id, fuel_name, station_id, station_name, operation, quantity, price, amount, comment) '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (
            fuel_card_id, card_number, client_id, client_name, fuel_type_id, fuel_name,
            station_id, station_name, operation, quantity, price, amount, comment,
        ),
    )


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
        "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
        (free_idx, fuel_type_id, client_id, date.today()),
    )
    new_card = cur.fetchone()

    return new_card


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: CRUD и спец-действия (block/unblock/topup/move/refuel) топливных карт для менеджера,
    просмотр своих карт для клиента. В журнал fuel_card_operations фиксируются только
    операции с движением топлива (topup/refuel/move_out/move_in).
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
                'SELECT id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at '
                'FROM fuel_cards WHERE client_id = %s ORDER BY id LIMIT %s OFFSET %s',
                (session['user_id'], limit, offset),
            )
            rows = cur.fetchall()
            items = [card_row_to_json(c) for c in rows]
            pages = max(1, (total + limit - 1) // limit)
            return response(200, {'items': items, 'total': total, 'page': page, 'pages': pages})

        # Клиент: ограниченные действия над своими картами —
        # блокировка/разблокировка, перемещение топлива между своими картами
        # одного вида топлива, изменение дневного лимита.
        if session['role'] == 'client':
            client_id = session['user_id']

            cur.execute('SELECT read_only FROM client_accounts WHERE id = %s', (session['account_id'],))
            account = cur.fetchone()
            if method in ('POST', 'PUT') and (not account or account['read_only']):
                return response(403, {'error': 'Режим только просмотр'})

            if method == 'POST' and action == 'block':
                body_data = json.loads(event.get('body') or '{}')
                cid = body_data.get('id')
                reason = body_data.get('reason') or ''
                if not cid:
                    return response(400, {'error': 'Не указан id'})
                cur.execute('SELECT client_id FROM fuel_cards WHERE id = %s', (cid,))
                owner = cur.fetchone()
                if not owner or str(owner['client_id']) != str(client_id):
                    return response(403, {'error': 'Доступ запрещён'})
                cur.execute(
                    "UPDATE fuel_cards SET status='blocked', block_reason=%s, blocked_at=%s WHERE id=%s "
                    "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
                    (reason, date.today(), cid),
                )
                c = cur.fetchone()
                return response(200, card_row_to_json(c))

            if method == 'POST' and action == 'unblock':
                body_data = json.loads(event.get('body') or '{}')
                cid = body_data.get('id')
                if not cid:
                    return response(400, {'error': 'Не указан id'})
                cur.execute('SELECT client_id FROM fuel_cards WHERE id = %s', (cid,))
                owner = cur.fetchone()
                if not owner or str(owner['client_id']) != str(client_id):
                    return response(403, {'error': 'Доступ запрещён'})
                cur.execute(
                    "UPDATE fuel_cards SET status='active', block_reason='', blocked_at=NULL WHERE id=%s "
                    "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
                    (cid,),
                )
                c = cur.fetchone()
                return response(200, card_row_to_json(c))

            if method == 'POST' and action == 'move':
                body_data = json.loads(event.get('body') or '{}')
                from_id = body_data.get('from_id')
                to_id = body_data.get('to_id')
                amount = body_data.get('amount')
                if not from_id or not to_id or amount is None:
                    return response(400, {'error': 'Не указаны карты или количество'})
                try:
                    amount = float(amount)
                except (TypeError, ValueError):
                    return response(400, {'error': 'Некорректное количество'})
                if amount <= 0:
                    return response(400, {'error': 'Количество должно быть положительным'})
                if str(from_id) == str(to_id):
                    return response(400, {'error': 'Карты должны различаться'})

                cur.execute('SELECT id, code, idx, client_id, balance, fuel_type_id FROM fuel_cards WHERE id = %s', (from_id,))
                src = cur.fetchone()
                if not src or str(src['client_id']) != str(client_id):
                    return response(403, {'error': 'Доступ запрещён'})
                if float(src['balance']) < amount:
                    return response(400, {'error': 'Недостаточно средств на карте'})

                cur.execute('SELECT id, code, idx, client_id, fuel_type_id FROM fuel_cards WHERE id = %s', (to_id,))
                dst = cur.fetchone()
                if not dst or str(dst['client_id']) != str(client_id):
                    return response(403, {'error': 'Доступ запрещён'})
                if str(src['fuel_type_id']) != str(dst['fuel_type_id']):
                    return response(400, {'error': 'Перемещение доступно только между картами одного вида топлива'})

                cur.execute('UPDATE fuel_cards SET balance = balance - %s WHERE id = %s', (amount, from_id))
                cur.execute('UPDATE fuel_cards SET balance = balance + %s WHERE id = %s', (amount, to_id))

                fuel_info = get_fuel_info(cur, src['fuel_type_id'])
                client_name = get_client_name(cur, client_id)
                src_number = card_number_str(src['code'], src['idx'])
                dst_number = card_number_str(dst['code'], dst['idx'])
                unit = unit_short(fuel_info['unit'])
                price = float(fuel_info['price'] or 0)

                src_comment = f'Перемещение: списание {amount:.3f} {unit} ({fuel_info["name"]}) -> карта {dst_number} ({client_name})'
                dst_comment = f'Перемещение: оприходование {amount:.3f} {unit} ({fuel_info["name"]}) с карты {src_number} ({client_name})'

                log_operation(
                    cur, from_id, src_number, client_id, client_name, src['fuel_type_id'], fuel_info['name'],
                    None, '', 'move_out', amount, price, round(amount * price, 2), src_comment,
                )
                log_operation(
                    cur, to_id, dst_number, client_id, client_name, src['fuel_type_id'], fuel_info['name'],
                    None, '', 'move_in', amount, price, round(amount * price, 2), dst_comment,
                )

                cur.execute(
                    'SELECT id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at '
                    'FROM fuel_cards WHERE id IN (%s, %s)',
                    (from_id, to_id),
                )
                rows = cur.fetchall()
                return response(200, {'items': [card_row_to_json(c) for c in rows]})

            if method == 'PUT':
                body_data = json.loads(event.get('body') or '{}')
                cid = body_data.get('id')
                daily_limit = body_data.get('daily_limit')
                if not cid or daily_limit is None:
                    return response(400, {'error': 'Не указан id или лимит'})
                cur.execute('SELECT client_id FROM fuel_cards WHERE id = %s', (cid,))
                owner = cur.fetchone()
                if not owner or str(owner['client_id']) != str(client_id):
                    return response(403, {'error': 'Доступ запрещён'})
                cur.execute(
                    'UPDATE fuel_cards SET daily_limit=%s WHERE id=%s '
                    'RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at',
                    (daily_limit, cid),
                )
                c = cur.fetchone()
                if not c:
                    return response(404, {'error': 'Карта не найдена'})
                return response(200, card_row_to_json(c))

            return response(403, {'error': 'Доступ запрещён'})

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
                f'SELECT id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at '
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
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
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
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
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
            user_comment = (body_data.get('comment') or '').strip()
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
                'RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at',
                (amount, cid),
            )
            c = cur.fetchone()
            if not c:
                return response(404, {'error': 'Карта не найдена'})

            fuel_info = get_fuel_info(cur, c['fuel_type_id'])
            client_name = get_client_name(cur, c['client_id'])
            number = card_number_str(c['code'], c['idx'])
            unit = unit_short(fuel_info['unit'])
            price = float(fuel_info['price'] or 0)
            amount_sum = round(amount * price, 2)
            comment = f'Пополнение баланса: +{amount:.3f} {unit} ({fuel_info["name"]})'
            if user_comment:
                comment = f'{comment}. {user_comment}'
            log_operation(
                cur, c['id'], number, c['client_id'], client_name, c['fuel_type_id'], fuel_info['name'],
                None, '', 'topup', amount, price, amount_sum, comment,
            )

            return response(200, card_row_to_json(c))

        if method == 'POST' and action == 'refuel':
            body_data = json.loads(event.get('body') or '{}')
            cid = body_data.get('id')
            station_id = body_data.get('station_id')
            quantity = body_data.get('quantity')
            custom_price = body_data.get('price')
            if not cid or not station_id or quantity is None:
                return response(400, {'error': 'Не указана карта, АЗС или количество'})
            try:
                quantity = float(quantity)
            except (TypeError, ValueError):
                return response(400, {'error': 'Некорректное количество'})
            if quantity <= 0:
                return response(400, {'error': 'Количество должно быть положительным'})

            cur.execute('SELECT id, code, idx, fuel_type_id, client_id, balance FROM fuel_cards WHERE id = %s', (cid,))
            card = cur.fetchone()
            if not card:
                return response(404, {'error': 'Карта не найдена'})
            if float(card['balance']) < quantity:
                return response(400, {'error': 'Недостаточно средств на карте'})

            station_name = get_station_name(cur, station_id)
            if not station_name:
                return response(404, {'error': 'АЗС не найдена'})

            fuel_info = get_fuel_info(cur, card['fuel_type_id'])
            unit = unit_short(fuel_info['unit'])
            try:
                price = float(custom_price) if custom_price is not None else float(fuel_info['price'] or 0)
            except (TypeError, ValueError):
                price = float(fuel_info['price'] or 0)
            amount_sum = round(quantity * price, 2)

            cur.execute(
                'UPDATE fuel_cards SET balance = balance - %s WHERE id = %s '
                'RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at',
                (quantity, cid),
            )
            c = cur.fetchone()

            client_name = get_client_name(cur, c['client_id'])
            number = card_number_str(c['code'], c['idx'])
            comment = f'Заправка на АЗС «{station_name}»: списано {quantity:.3f} {unit} ({fuel_info["name"]}) по цене {price:.2f} ₽, на сумму {amount_sum:.2f} ₽'
            log_operation(
                cur, c['id'], number, c['client_id'], client_name, c['fuel_type_id'], fuel_info['name'],
                station_id, station_name, 'refuel', quantity, price, amount_sum, comment,
            )

            return response(200, card_row_to_json(c))

        if method == 'POST' and action == 'move':
            body_data = json.loads(event.get('body') or '{}')
            from_id = body_data.get('from_id')
            to_id = body_data.get('to_id')
            amount = body_data.get('amount')
            to_amount = body_data.get('to_amount')
            if not from_id or not to_id or amount is None:
                return response(400, {'error': 'Не указаны карты или количество'})
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                return response(400, {'error': 'Некорректное количество'})
            if amount <= 0:
                return response(400, {'error': 'Количество должно быть положительным'})
            if str(from_id) == str(to_id):
                return response(400, {'error': 'Карты должны различаться'})

            cur.execute('SELECT id, code, idx, client_id, balance, fuel_type_id FROM fuel_cards WHERE id = %s', (from_id,))
            src = cur.fetchone()
            if not src:
                return response(404, {'error': 'Карта-источник не найдена'})
            if float(src['balance']) < amount:
                return response(400, {'error': 'Недостаточно средств на карте'})

            cur.execute('SELECT id, code, idx, client_id, fuel_type_id FROM fuel_cards WHERE id = %s', (to_id,))
            dst = cur.fetchone()
            if not dst:
                return response(404, {'error': 'Карта назначения не найдена'})

            # Если виды топлива различаются, нужно отдельное количество к зачислению.
            if str(src['fuel_type_id']) != str(dst['fuel_type_id']):
                if to_amount is None:
                    return response(400, {'error': 'Укажите количество к получению для другого вида топлива'})
                try:
                    to_amount = float(to_amount)
                except (TypeError, ValueError):
                    return response(400, {'error': 'Некорректное количество к получению'})
                if to_amount <= 0:
                    return response(400, {'error': 'Количество к получению должно быть положительным'})
            else:
                to_amount = amount

            cur.execute('UPDATE fuel_cards SET balance = balance - %s WHERE id = %s', (amount, from_id))
            cur.execute('UPDATE fuel_cards SET balance = balance + %s WHERE id = %s', (to_amount, to_id))

            src_fuel = get_fuel_info(cur, src['fuel_type_id'])
            dst_fuel = get_fuel_info(cur, dst['fuel_type_id'])
            src_client_name = get_client_name(cur, src['client_id'])
            dst_client_name = get_client_name(cur, dst['client_id'])
            src_number = card_number_str(src['code'], src['idx'])
            dst_number = card_number_str(dst['code'], dst['idx'])
            src_unit = unit_short(src_fuel['unit'])
            dst_unit = unit_short(dst_fuel['unit'])
            src_price = float(src_fuel['price'] or 0)
            dst_price = float(dst_fuel['price'] or 0)

            if str(src['fuel_type_id']) == str(dst['fuel_type_id']):
                src_comment = f'Перемещение: списание {amount:.3f} {src_unit} ({src_fuel["name"]}) -> карта {dst_number} ({dst_client_name})'
                dst_comment = f'Перемещение: оприходование {to_amount:.3f} {dst_unit} ({dst_fuel["name"]}) с карты {src_number} ({src_client_name})'
            else:
                src_comment = (
                    f'Перемещение: списание {amount:.3f} {src_unit} ({src_fuel["name"]}) -> карта {dst_number} ({dst_client_name}), '
                    f'оприходовано {to_amount:.3f} {dst_unit} ({dst_fuel["name"]})'
                )
                dst_comment = (
                    f'Перемещение: оприходование {to_amount:.3f} {dst_unit} ({dst_fuel["name"]}) с карты {src_number} ({src_client_name}), '
                    f'списано {amount:.3f} {src_unit} ({src_fuel["name"]})'
                )

            log_operation(
                cur, from_id, src_number, src['client_id'], src_client_name, src['fuel_type_id'], src_fuel['name'],
                None, '', 'move_out', amount, src_price, round(amount * src_price, 2), src_comment,
            )
            log_operation(
                cur, to_id, dst_number, dst['client_id'], dst_client_name, dst['fuel_type_id'], dst_fuel['name'],
                None, '', 'move_in', to_amount, dst_price, round(to_amount * dst_price, 2), dst_comment,
            )

            cur.execute(
                'SELECT id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at '
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
            price = body_data.get('price') or 0

            if not code or idx is None or not fuel_type_id or not client_id:
                return response(400, {'error': 'Заполните код, индекс, вид топлива и клиента'})

            cur.execute(
                'SELECT id FROM fuel_cards WHERE code=%s AND idx=%s AND client_id=%s',
                (code, idx, client_id),
            )
            if cur.fetchone():
                return response(400, {'error': f'Карта {code}/{idx} уже существует'})

            cur.execute(
                "INSERT INTO fuel_cards (code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at) "
                "VALUES (%s, %s, %s, %s, 0, %s, 'active', '', %s, %s) "
                "RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at",
                (code, idx, fuel_type_id, client_id, price, daily_limit, date.today()),
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
            price = body_data.get('price') or 0
            code = body_data.get('code')
            idx = body_data.get('idx')

            cur.execute(
                'UPDATE fuel_cards SET fuel_type_id=%s, client_id=%s, daily_limit=%s, balance=%s, price=%s, code=%s, idx=%s '
                'WHERE id=%s RETURNING id, code, idx, fuel_type_id, client_id, balance, price, status, block_reason, daily_limit, activated_at, blocked_at',
                (fuel_type_id, client_id, daily_limit, balance, price, code, idx, cid),
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