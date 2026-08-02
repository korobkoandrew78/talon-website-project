-- Менеджеры
CREATE TABLE managers (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    read_only BOOLEAN NOT NULL DEFAULT false,
    sections TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Виды топлива
CREATE TABLE fuel_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code1c VARCHAR(50) NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'литр',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Клиенты
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    inn VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    read_only BOOLEAN NOT NULL DEFAULT false,
    sections TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Топливные карты
CREATE TABLE fuel_cards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL,
    idx INTEGER NOT NULL,
    fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    block_reason VARCHAR(255) NOT NULL DEFAULT '',
    daily_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
    activated_at DATE,
    blocked_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(code, idx, client_id)
);

-- Дисконтные карты
CREATE TABLE discount_cards (
    id SERIAL PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    discount NUMERIC(5,2) NOT NULL DEFAULT 0,
    bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Талоны
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    volume NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    issued_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Сессии (простая токен-аутентификация)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(200) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL, -- admin | manager | client
    user_id INTEGER, -- NULL для admin
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL
);

-- Демо-данные
INSERT INTO fuel_types (name, code1c, price, unit) VALUES
('АИ-92', '00-0001', 52.4, 'литр'),
('АИ-95', '00-0002', 56.9, 'литр'),
('АИ-98', '00-0003', 64.2, 'литр'),
('ДТ', '00-0004', 61.1, 'литр'),
('Газ (СУГ)', '00-0005', 28.7, 'литр');

INSERT INTO clients (inn, name, phone, email, login, password, read_only, sections) VALUES
('7801234567', 'АвтоТранс-Логистик', '+7 812 100-10-10', 'office@autotrans.ru', 'autotrans', 'Client1!', false, '{fuelCards,discountCards,coupons}'),
('7809876543', 'СтройПарк', '+7 812 200-20-20', 'info@stroypark.ru', 'stroypark', 'Client2!', true, '{fuelCards,coupons}'),
('7811122334', 'ГрузСервис 24', '+7 812 300-30-30', 'mail@gruzservice24.ru', 'gruz24', 'Client3!', false, '{fuelCards,discountCards,coupons}');

INSERT INTO managers (login, password, full_name, phone, status, read_only, sections) VALUES
('ivanov', 'Manager1!', 'Иванов Иван Иванович', '+7 900 111-22-33', 'active', false, '{fuel,clients,fuelCards,discountCards,coupons}'),
('petrova', 'Manager2!', 'Петрова Анна Сергеевна', '+7 900 222-33-44', 'active', true, '{clients,fuelCards}'),
('sidorov', 'Manager3!', 'Сидоров Пётр Николаевич', '+7 900 333-44-55', 'blocked', false, '{coupons,discountCards}');

INSERT INTO fuel_cards (code, idx, fuel_type_id, client_id, balance, status, block_reason, daily_limit, activated_at, blocked_at) VALUES
('0001', 1, 1, 1, 12400, 'active', '', 5000, '2025-11-04', NULL),
('0000', 1, 1, 1, 0, 'active', '', 0, '2025-11-04', NULL),
('0002', 1, 4, 3, 8300, 'blocked', 'Просрочена оплата', 3000, '2025-10-18', '2026-01-12');

INSERT INTO discount_cards (number, client_id, discount, bonus, status) VALUES
('DC-1001', 1, 5, 3400, 'active'),
('DC-1002', 3, 3, 1200, 'active'),
('DC-1003', 2, 7, 8900, 'blocked');

INSERT INTO coupons (number, fuel_type_id, client_id, volume, status, issued_at) VALUES
('T-500-01', 1, 1, 500, 'active', '2026-01-10'),
('T-300-02', 4, 3, 300, 'used', '2025-12-22'),
('T-200-03', 2, 2, 200, 'active', '2026-01-15');
