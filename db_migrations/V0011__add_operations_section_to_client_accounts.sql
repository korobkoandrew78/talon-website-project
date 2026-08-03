UPDATE client_accounts
SET sections = array_append(sections, 'operations')
WHERE NOT ('operations' = ANY(sections));
