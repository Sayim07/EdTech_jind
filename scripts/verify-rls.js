// Reports Row Level Security status for every public table. Run: node scripts/verify-rls.js
// Exits non-zero if any table is unprotected, so it can run in CI before a deploy.
require('dotenv/config');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tables = (await c.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`)).rows;
  const policies = (await c.query(`select tablename, count(*)::int n from pg_policies where schemaname='public' group by 1`)).rows;
  const trig = (await c.query(`select evtname from pg_event_trigger where evtname='enable_rls_on_new_tables'`)).rowCount;
  const grants = (await c.query(`select count(*)::int n from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated')`)).rows[0].n;
  await c.end();

  for (const t of tables) console.log(`${t.relrowsecurity ? 'RLS on ' : 'RLS OFF'}  ${t.relname}`);
  console.log(`policies: ${policies.length ? JSON.stringify(policies) : 'none (deny-all for anon/authenticated)'}`);
  console.log(`auto-RLS event trigger: ${trig ? 'installed' : 'missing'}`);
  console.log(`table grants left for anon/authenticated: ${grants}`);
  process.exit(tables.every((t) => t.relrowsecurity) && grants === 0 ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
