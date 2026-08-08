import json
import os
import re
from datetime import date
from typing import Dict, Any

import psycopg2
import psycopg2.extras


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    value = raw.strip()
    if re.fullmatch(r'\d{13}', value) and value.startswith('22'):
        return value[8:12]
    if re.fullmatch(r'\d{1,4}', value):
        return value.zfill(4)
    return ''


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: поиск топливных карт по штрихкоду EAN13 (префикс 22, код карты — цифры 9-12,
    последняя 13-я цифра контрольная и не учитывается) или по коду карты напрямую (например 0003)
    для интеграции с 1С:Бухгалтерия. Возвращает
    таблицу всех карт с таким кодом: номер, индекс, код 1С топлива, цена, баланс, дневной лимит,
    остаток дневного лимита (лимит минус сегодняшние заправки, не считается при нулевом лимите), статус.
    Args: event с httpMethod, headers (X-Api-Key), queryStringParameters (barcode или code); context с request_id.
    Returns: HTTP JSON ответ со списком карт, подходящих под код.
    '''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'GET':
        return response(405, {'error': 'Метод не поддерживается'})

    api_key = get_header(event, 'X-Api-Key')
    expected_key = os.environ.get('ONEC_API_KEY')
    if not expected_key or not api_key or api_key != expected_key:
        return response(401, {'error': 'Неверный или отсутствующий ключ доступа'})

    params = event.get('queryStringParameters') or {}
    raw_input = (params.get('barcode') or params.get('code') or '').strip()

    if not raw_input:
        return response(400, {'error': 'Укажите barcode (EAN13) или code (например 0003)'})

    card_code = extract_card_code(raw_input)
    if not card_code:
        return response(400, {'error': 'Не удалось распознать код карты из переданного значения'})

    conn = get_conn()
    try:
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT fc.id, fc.code, fc.idx, fc.client_id, fc.balance, fc.price, fc.status, "
            "fc.daily_limit, ft.code1c AS fuel_code1c "
            "FROM fuel_cards fc "
            "LEFT JOIN fuel_types ft ON ft.id = fc.fuel_type_id "
            "WHERE fc.code = %s "
            "ORDER BY fc.client_id, fc.idx",
            (card_code,),
        )
        cards = cur.fetchall()

        items = []
        today = date.today()
        for c in cards:
            daily_limit = float(c['daily_limit']) if c['daily_limit'] is not None else 0.0
            remaining_limit = None
            if daily_limit:
                cur.execute(
                    "SELECT COALESCE(SUM(quantity), 0) AS spent FROM fuel_card_operations "
                    "WHERE fuel_card_id = %s AND operation = 'refuel' AND created_at::date = %s",
                    (c['id'], today),
                )
                spent_row = cur.fetchone()
                spent = float(spent_row['spent']) if spent_row and spent_row['spent'] is not None else 0.0
                remaining_limit = round(daily_limit - spent, 3)

            items.append({
                'cardNumber': f"{c['code']}/{c['idx']}",
                'idx': c['idx'],
                'fuelCode1c': c['fuel_code1c'] or '',
                'price': float(c['price']) if c['price'] is not None else 0.0,
                'balance': float(c['balance']) if c['balance'] is not None else 0.0,
                'dailyLimit': daily_limit,
                'remainingDailyLimit': remaining_limit,
                'status': c['status'] or '',
            })

        return response(200, {
            'cardCode': card_code,
            'items': items,
        })
    finally:
        conn.close()