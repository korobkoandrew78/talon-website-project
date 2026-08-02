CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code1c VARCHAR(50) NOT NULL DEFAULT '',
    address VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO stations (name, code1c, address) VALUES
('АЗС №1 Центральная', '10-0001', 'г. Санкт-Петербург, Московский пр-т, 15'),
('АЗС №2 Северная', '10-0002', 'г. Санкт-Петербург, пр-т Энгельса, 88'),
('АЗС №3 Южная', '10-0003', 'г. Санкт-Петербург, Пулковское шоссе, 40');
