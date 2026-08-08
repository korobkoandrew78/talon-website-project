import json
import os
import re
from datetime import date
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
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


def extract_card_code(raw: str) -> str:
    '''Извлекает 4-значный код карты из штрихкода EAN13 (префикс 22, последняя цифра — контрольная,
    отбрасывается) или принимает код напрямую.'''
    value = (raw or '').strip()
    if re.fullmatch(r'\d{13}', value) and value.startswith('22'):
        return value[8:12]
    if re.fullmatch(r'\d{1,4}', value):
        return value.zfill(4)
    return ''


def unit_short(unit: str) -> str:
    return {'литр': 'л', 'руб': '₽', 'шт': 'шт'}.get(unit, 'шт')


def card_number_str(code: str, idx: int) -> str:
    return f'{code}/{idx}'


def get_fuel_info(cur, fuel_type_id) -> Dict[str, Any]:
    if not fuel_type_id:
        return {'name': '', 'price': 0, 'unit': 'литр'}
    cur.execute('SELECT name, price, unit FROM fuel_types WHERE id = %s', (fuel_type_id,))
    row = cur.fetchone()
    return row if row else {'name': '', 'price': 0, 'unit': 'литр'}


def get_client_name(cur, client_id) -> str:
    if not client_id:
        return ''
    cur.execute('SELECT name FROM clients WHERE id = %s', (client_id,))
    row = cur.fetchone()
    return row['name'] if row else ''


def log_operation(
    cur, fuel_card_id, card_number: str, client_id, client_name: str, fuel_type_id, fuel_name: str,
    station_id, station_name: str, operation: str, quantity: float, price: float, amount: float, comment: str,
):
    cur.execute(
        'INSERT INTO fuel_card_operations '
        '(fuel_card_id, card_number, client_id, client_name, fuel_type_id, fuel_name, station_id, station_name, operation, quantity, price, amount, comment) '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (fuel_card_id, card_number, client_id, client_name, fuel_type_id, fuel_name,
         station_id, station_name, operation, quantity, price, amount, comment),
    )


def parse_number(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: регистрация заправки (списания топлива) по топливной карте для интеграции с 1С:Бухгалтерия.
    Принимает штрихкод EAN13 или код карты + ОБЯЗАТЕЛЬНЫЙ idx (индекс карты) для точной идентификации,
    количество, цену, сумму и код 1С АЗС. Проверяет статус карты, баланс и дневной лимит, списывает
    топливо и создаёт запись в журнале операций с автогенерируемым комментарием. Возвращает результат:
    успех либо причину отказа с разными HTTP-кодами: 400 не указан idx, 404 карта/АЗС не найдена,
    423 карта заблокирована, 402 недостаточно топлива, 429 превышен дневной лимит.
    Args: event с httpMethod, headers (X-Api-Key), body (JSON: barcode/code, idx (обязателен), quantity, price, amount, station_code1c);
          context с request_id.
    Returns: HTTP JSON ответ с результатом операции.
    '''
    method = event.get('httpMethod', 'POST')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return response(405, {'error': 'Метод не поддерживается'})

    api_key = get_header(event, 'X-Api-Key')
    expected_key = os.environ.get('ONEC_API_KEY')
    if not expected_key or not api_key or api_key != expected_key:
        return response(401, {'error': 'Неверный или отсутствующий ключ доступа'})

    try:
        body_data = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return response(400, {'error': 'Некорректный JSON в теле запроса'})

    raw_card = (body_data.get('barcode') or body_data.get('code') or '').strip()
    idx = body_data.get('idx')
    station_code1c = (body_data.get('station_code1c') or '').strip()
    quantity = parse_number(body_data.get('quantity'))
    price = parse_number(body_data.get('price'))
    amount = parse_number(body_data.get('amount'))

    if not raw_card:
        return response(400, {'error': 'Укажите barcode (EAN13) или code карты'})
    if idx is None or not str(idx).strip():
        return response(400, {'error': 'Укажите idx (индекс карты) для точной идентификации'})
    try:
        idx = int(idx)
    except (TypeError, ValueError):
        return response(400, {'error': 'Некорректный idx (индекс карты)'})
    if not station_code1c:
        return response(400, {'error': 'Укажите station_code1c (код 1С АЗС)'})
    if quantity is None or quantity <= 0:
        return response(400, {'error': 'Некорректное количество'})
    if price is None or price < 0:
        return response(400, {'error': 'Некорректная цена'})

    card_code = extract_card_code(raw_card)
    if not card_code:
        return response(400, {'error': 'Не удалось распознать код карты из переданного значения'})

    if amount is None:
        amount = round(quantity * price, 2)

    conn = get_conn()
    try:
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute('SELECT id, name FROM stations WHERE code1c = %s', (station_code1c,))
        station = cur.fetchone()
        if not station:
            return response(404, {'error': 'АЗС не найдена', 'result': 'station_not_found'})

        cur.execute(
            'SELECT id, code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit '
            'FROM fuel_cards WHERE code = %s AND idx = %s',
            (card_code, idx),
        )
        candidates = cur.fetchall()

        if not candidates:
            return response(404, {'error': 'Карта не найдена', 'result': 'card_not_found'})

        if len(candidates) > 1:
            return response(409, {
                'error': 'Найдено несколько карт с таким кодом и индексом у разных клиентов, обратитесь к менеджеру',
                'result': 'ambiguous_card',
            })

        card = candidates[0]

        if card['status'] != 'active':
            return response(423, {
                'error': 'Карта заблокирована',
                'result': 'card_blocked',
                'blockReason': card['block_reason'] or '',
            })

        if float(card['balance']) < quantity:
            return response(402, {
                'error': 'Недостаточно топлива на карте',
                'result': 'insufficient_balance',
                'balance': float(card['balance']),
            })

        daily_limit = float(card['daily_limit']) if card['daily_limit'] is not None else 0.0
        if daily_limit:
            today = date.today()
            cur.execute(
                "SELECT COALESCE(SUM(quantity), 0) AS spent FROM fuel_card_operations "
                "WHERE fuel_card_id = %s AND operation = 'refuel' AND created_at::date = %s",
                (card['id'], today),
            )
            spent_row = cur.fetchone()
            spent = float(spent_row['spent']) if spent_row and spent_row['spent'] is not None else 0.0
            remaining = round(daily_limit - spent, 3)
            if quantity > remaining:
                return response(429, {
                    'error': 'Превышен дневной лимит',
                    'result': 'daily_limit_exceeded',
                    'dailyLimit': daily_limit,
                    'remainingDailyLimit': remaining,
                })

        cur.execute(
            'UPDATE fuel_cards SET balance = balance - %s WHERE id = %s '
            'RETURNING id, code, idx, fuel_type_id, client_id, balance, daily_limit',
            (quantity, card['id']),
        )
        updated = cur.fetchone()

        fuel_info = get_fuel_info(cur, updated['fuel_type_id'])
        unit = unit_short(fuel_info['unit'])
        client_name = get_client_name(cur, updated['client_id'])
        number = card_number_str(updated['code'], updated['idx'])

        comment = (
            f'Заправка на АЗС «{station["name"]}»: списано {quantity:.3f} {unit} ({fuel_info["name"]}) '
            f'по цене {price:.2f} ₽, на сумму {amount:.2f} ₽'
        )
        log_operation(
            cur, updated['id'], number, updated['client_id'], client_name, updated['fuel_type_id'], fuel_info['name'],
            station['id'], station['name'], 'refuel', quantity, price, amount, comment,
        )

        remaining_after = None
        if daily_limit:
            remaining_after = round(daily_limit - (spent + quantity), 3)

        return response(200, {
            'result': 'success',
            'message': 'Заправка успешно проведена',
            'cardNumber': number,
            'balance': float(updated['balance']),
            'dailyLimit': daily_limit,
            'remainingDailyLimit': remaining_after,
            'quantity': quantity,
            'price': price,
            'amount': amount,
            'station': station['name'],
        })
    finally:
        conn.close()