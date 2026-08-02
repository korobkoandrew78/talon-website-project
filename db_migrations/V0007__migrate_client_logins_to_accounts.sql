INSERT INTO client_accounts (client_id, login, password, read_only, sections)
SELECT id, login, password, read_only, sections FROM clients ORDER BY id;
