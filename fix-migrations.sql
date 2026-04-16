-- Marquer les migrations versements-client comme exécutées
INSERT INTO migrations (timestamp, name)
VALUES
  (1776183000000, 'CreateVersementClientTable1776183000000'),
  (1776183100000, 'AddVersementClientPermissions1776183100000')
ON CONFLICT DO NOTHING;
