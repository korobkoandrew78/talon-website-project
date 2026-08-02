INSERT INTO client_accounts (client_id, login, password, read_only, sections)
SELECT id, 'auto2', 'Client1View!', true, ARRAY['fuelCards','coupons']
FROM clients WHERE name = 'АвтоТранс-Логистик'
AND NOT EXISTS (SELECT 1 FROM client_accounts WHERE login = 'auto2');
