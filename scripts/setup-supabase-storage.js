// Creates/updates the avatars bucket. Run: node scripts/setup-supabase-storage.js
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'storage.sql'), 'utf8'));
  const r = await c.query(`select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='avatars'`);
  const rls = await c.query(`select relrowsecurity from pg_class where oid='storage.objects'::regclass`);
  const pol = await c.query(`select count(*)::int n from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('INSERT','UPDATE','DELETE','ALL')`);
  console.log('bucket:', JSON.stringify(r.rows[0]));
  console.log('storage.objects RLS:', rls.rows[0].relrowsecurity, '| write policies:', pol.rows[0].n);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
