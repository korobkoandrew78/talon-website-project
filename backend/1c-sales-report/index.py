import json
import os
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


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Business: отчёт по продажам топлива (только заправки) за период для интеграции с 1С:Бухгалтерия.
    Данные сгруппированы по организации (ИНН) и виду топлива (код 1С) — количество и сумма за период,
    готовые для создания документов "Реализация товаров и услуг".
    Args: event с httpMethod, headers (X-Api-Key), queryStringParameters (date_from, date_to); context с request_id.
    Returns: HTTP JSON ответ со списком строк отчёта по организациям и топливу.
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
    date_from = (params.get('date_from') or '').strip()
    date_to = (params.get('date_to') or '').strip()

    if not date_from or not date_to:
        return response(400, {'error': 'Укажите date_from и date_to (YYYY-MM-DD)'})

    conn = get_conn()
    try:
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT c.inn AS inn, o.client_name AS client_name, "
            "ft.code1c AS code1c, o.fuel_name AS fuel_name, ft.unit AS unit, "
            "SUM(o.quantity) AS quantity, SUM(o.amount) AS amount "
            "FROM fuel_card_operations o "
            "LEFT JOIN clients c ON c.id = o.client_id "
            "LEFT JOIN fuel_types ft ON ft.id = o.fuel_type_id "
            "WHERE o.operation = 'refuel' AND o.created_at >= %s AND o.created_at <= %s "
            "GROUP BY c.inn, o.client_name, ft.code1c, o.fuel_name, ft.unit "
            "ORDER BY c.inn, ft.code1c",
            (f'{date_from} 00:00:00', f'{date_to} 23:59:59'),
        )
        rows = cur.fetchall()

        items = []
        for r in rows:
            quantity = float(r['quantity']) if r['quantity'] is not None else 0.0
            amount = float(r['amount']) if r['amount'] is not None else 0.0
            price = round(amount / quantity, 2) if quantity else 0.0
            items.append({
                'inn': r['inn'] or '',
                'clientName': r['client_name'] or '',
                'code1c': r['code1c'] or '',
                'fuelName': r['fuel_name'] or '',
                'unit': r['unit'] or 'литр',
                'quantity': round(quantity, 3),
                'price': price,
                'amount': round(amount, 2),
            })

        return response(200, {
            'dateFrom': date_from,
            'dateTo': date_to,
            'items': items,
        })
    finally:
        conn.close()
