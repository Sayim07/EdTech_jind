// One-off copy of the local SQLite data into the Postgres database in DIRECT_URL.
//   node scripts/migrate-sqlite-to-postgres.js [path/to/dev.db]
// Safe to re-run: rows that already exist (same id) are skipped, nothing is deleted. Runs in one transaction.
require('dotenv/config');
const { DatabaseSync } = require('node:sqlite');
const { Client } = require('pg');
const path = require('path');

const sqlitePath = path.resolve(process.argv[2] || 'prisma/dev.db');
// Parents before children so foreign keys are satisfied.
const TABLES = ['User', 'Course', 'Module', 'Lesson', 'Assignment', 'Submission', 'Enrollment', 'LessonProgress', 'PasswordResetToken', 'McqTest', 'McqQuestion', 'McqAttempt', 'Payment'];

function convert(value, pgType) {
  if (value === null || value === undefined) return null;
  if (pgType.startsWith('timestamp')) {
    // Prisma stores SQLite DateTime as epoch milliseconds (integer); older rows may be ISO text.
    return typeof value === 'number' ? new Date(value) : new Date(String(value));
  }
  if (pgType === 'boolean') return value === 1 || value === true || value === '1';
  if (typeof value === 'bigint') return Number(value);
  return value;
}

(async () => {
  const lite = new DatabaseSync(sqlitePath, { readOnly: true });
  const pg = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const summary = [];
  try {
    await pg.query('BEGIN');
    for (const table of TABLES) {
      const exists = lite.prepare("select 1 from sqlite_master where type='table' and name=?").get(table);
      if (!exists) { summary.push([table, 0, 0, 'no such table in SQLite']); continue; }

      const rows = lite.prepare(`select * from "${table}"`).all();
      const cols = (await pg.query(`select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1`, [table])).rows;
      const types = Object.fromEntries(cols.map((c) => [c.column_name, c.data_type]));

      let inserted = 0;
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => k in types);
        const values = keys.map((k) => convert(row[k], types[k]));
        const res = await pg.query(
          `insert into public."${table}" (${keys.map((k) => `"${k}"`).join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) on conflict do nothing`,
          values,
        );
        inserted += res.rowCount;
      }
      summary.push([table, rows.length, inserted, '']);
    }
    await pg.query('COMMIT');
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('Migration failed, nothing was written:', e.message);
    process.exit(1);
  }

  console.log('table'.padEnd(22), 'sqlite'.padStart(7), 'copied'.padStart(7), '  postgres-total');
  let ok = true;
  for (const [table, found, inserted, note] of summary) {
    const total = Number((await pg.query(`select count(*) c from public."${table}"`)).rows[0].c);
    if (total < found) ok = false;
    console.log(table.padEnd(22), String(found).padStart(7), String(inserted).padStart(7), String(total).padStart(16), note);
  }
  await pg.end();
  console.log(ok ? '\nAll SQLite rows are present in Postgres.' : '\nWARNING: some rows are missing in Postgres.');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
