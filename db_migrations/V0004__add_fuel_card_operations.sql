CREATE TABLE fuel_card_operations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    fuel_card_id INTEGER,
    card_number VARCHAR(10) NOT NULL DEFAULT '',
    client_id INTEGER,
    client_name VARCHAR(255) NOT NULL DEFAULT '',
    fuel_type_id INTEGER,
    fuel_name VARCHAR(255) NOT NULL DEFAULT '',
    station_id INTEGER,
    station_name VARCHAR(255) NOT NULL DEFAULT '',
    operation VARCHAR(30) NOT NULL,
    quantity NUMERIC(14,3),
    price NUMERIC(12,2),
    amount NUMERIC(14,2),
    comment TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_fc_ops_created_at ON fuel_card_operations(created_at);
CREATE INDEX idx_fc_ops_client ON fuel_card_operations(client_id);
CREATE INDEX idx_fc_ops_fuel_type ON fuel_card_operations(fuel_type_id);
CREATE INDEX idx_fc_ops_card ON fuel_card_operations(fuel_card_id);
CREATE INDEX idx_fc_ops_station ON fuel_card_operations(station_id);
CREATE INDEX idx_fc_ops_operation ON fuel_card_operations(operation);
