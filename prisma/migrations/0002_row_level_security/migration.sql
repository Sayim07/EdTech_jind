-- Row Level Security by default.
--
-- The app never lets browsers talk to the database directly: every query goes through Next.js API routes
-- using Prisma, which connects as the `postgres` role (it bypasses RLS). Supabase also exposes every public
-- table over its REST/GraphQL API to the `anon` and `authenticated` roles. Enabling RLS with NO policies
-- means those roles can read and write nothing, so the public anon key can never leak student data.
--
-- If you ever need direct client access to a table, add an explicit policy for it in a new migration.

-- 1. Enable RLS on every table that exists today (including Prisma's own bookkeeping table).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Belt and braces: take away the table privileges Supabase grants to its API roles.
--    (Roles only exist on Supabase, so this is skipped on a plain Postgres.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;

-- 3. Any table created later (by a future Prisma migration) gets RLS switched on automatically.
CREATE OR REPLACE FUNCTION public.enable_rls_on_new_tables() RETURNS event_trigger
LANGUAGE plpgsql AS $$
DECLARE cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE' AND schema_name = 'public' LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
  END LOOP;
END $$;

DROP EVENT TRIGGER IF EXISTS enable_rls_on_new_tables;
CREATE EVENT TRIGGER enable_rls_on_new_tables ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION public.enable_rls_on_new_tables();
