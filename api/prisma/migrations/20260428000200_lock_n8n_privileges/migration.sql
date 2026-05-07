DO $$
DECLARE
  schema_name TEXT;
  domain_schemas TEXT[] := ARRAY[
    'recallhub_core',
    'recallhub_memory',
    'recallhub_work',
    'recallhub_workflow',
    'recallhub_audit'
  ];
BEGIN
  FOREACH schema_name IN ARRAY domain_schemas LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA %I FROM n8n', schema_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I FROM n8n', schema_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I FROM n8n', schema_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA %I FROM n8n', schema_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM n8n', schema_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM n8n', schema_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM n8n', schema_name);
    END IF;
  END LOOP;
END
$$;
