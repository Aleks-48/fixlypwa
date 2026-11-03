-- ACCEPT-004: legacy policies existed but their enforcement was disabled.
-- Restore isolation without changing rows or marketplace-specific policies.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'tenant_iso'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
