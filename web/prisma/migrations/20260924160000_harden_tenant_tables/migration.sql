-- TECH-008 / ADR-0006: tables added after the initial RLS migration also need isolation.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['document_read', 'notification_preference', 'ikomek_complaint']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_iso ON %I
       USING (osi_id = nullif(current_setting(''app.current_osi_id'', true), '''')::uuid)
       WITH CHECK (osi_id = nullif(current_setting(''app.current_osi_id'', true), '''')::uuid)', t
    );
  END LOOP;
END
$$;
