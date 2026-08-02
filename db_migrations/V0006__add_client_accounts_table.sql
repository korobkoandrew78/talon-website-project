CREATE TABLE client_accounts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    login VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    read_only BOOLEAN NOT NULL DEFAULT false,
    sections TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_accounts_client_id ON client_accounts(client_id);
