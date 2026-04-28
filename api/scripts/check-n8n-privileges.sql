DO $$
DECLARE
  schema_name TEXT;
  table_name TEXT;
  has_write BOOLEAN;
  domain_schemas TEXT[] := ARRAY[
    'recallhub_core',
    'recallhub_memory',
    'recallhub_work',
    'recallhub_workflow',
    'recallhub_audit'
  ];
BEGIN
  FOREACH schema_name IN ARRAY domain_schemas LOOP
    IF has_schema_privilege('n8n', schema_name, 'CREATE') THEN
      RAISE EXCEPTION 'n8n must not have CREATE on schema %', schema_name;
    END IF;

    FOR table_name IN
      SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = schema_name
        AND c.relkind IN ('r', 'p')
    LOOP
      SELECT has_table_privilege('n8n', table_name, 'INSERT')
          OR has_table_privilege('n8n', table_name, 'UPDATE')
          OR has_table_privilege('n8n', table_name, 'DELETE')
          OR has_table_privilege('n8n', table_name, 'TRUNCATE')
      INTO has_write;

      IF has_write THEN
        RAISE EXCEPTION 'n8n has write privilege on table %', table_name;
      END IF;
    END LOOP;
  END LOOP;
END
$$;
