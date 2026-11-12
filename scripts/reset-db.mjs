#!/usr/bin/env node
// Safe reset of a TEST database: dry-run by default, backup first, explicit typed confirmation to execute.
//
//   node scripts/reset-db.mjs --env <path-to-.env.local> --kind admin|user              (dry run: shows what would be removed)
//   node scripts/reset-db.mjs --env <...> --kind admin --execute --confirm <dbName>     (backup → wipe → re-seed)
//
// What it does NOT touch: collections themselves, their indexes, and (admin) the `admins` + `roles` collections,
// so Super Admin accounts keep working. Everything else is emptied. For --kind admin the starter configuration
// (plans, categories, landing page content) is restored by running the seed script afterwards.
// Refuses any database whose name contains "prod" — production data must never be deleted by this script.
import { EJSON } from 'bson';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (n) => process.argv.includes(`--${n}`);
const die = (m) => {
  console.error(`✖ ${m}`);
  process.exit(1);
};

const envPath = arg('env') ?? die("Pass --env <path to the app's .env.local>");
const kind = arg('kind');
if (!['admin', 'user'].includes(kind)) die('Pass --kind admin|user');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [
      l.slice(0, l.indexOf('=')).trim(),
      l
        .slice(l.indexOf('=') + 1)
        .trim()
        .replace(/^["']|["']$/g, ''),
    ]),
);
const uri = env.MONGODB_URI ?? die('MONGODB_URI missing in that env file');
const dbName = env.MONGODB_DB ?? (kind === 'admin' ? 'kanaku_admin' : die('MONGODB_DB missing'));
const host = (uri.match(/@([^/?]+)/)?.[1] ?? 'unknown host').toLowerCase();

if (/prod/i.test(dbName) || /prod/i.test(host))
  die(`"${dbName}" on ${host} looks like production. This script refuses to touch it.`);

const KEEP = kind === 'admin' ? new Set(['admins', 'roles']) : new Set();
const client = await new MongoClient(uri).connect();
const db = client.db(dbName);
const names = (await db.listCollections().toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith('system.'));
const counts = Object.fromEntries(
  await Promise.all(names.map(async (n) => [n, await db.collection(n).countDocuments()])),
);

console.log(`\nTarget  cluster: ${host}\n        database: ${dbName}   (kind: ${kind})\n`);
console.log('collection'.padEnd(26), 'documents'.padStart(10), '  action');
for (const n of names.sort())
  console.log(
    n.padEnd(26),
    String(counts[n]).padStart(10),
    KEEP.has(n) ? '  keep' : counts[n] ? '  EMPTY' : '  (already empty)',
  );
const total = names.filter((n) => !KEEP.has(n)).reduce((s, n) => s + counts[n], 0);
console.log(`\n${total} documents would be removed.`);

if (!flag('execute')) {
  console.log('\nDRY RUN — nothing was changed. To execute:\n  add  --execute --confirm ' + dbName);
  await client.close();
  process.exit(0);
}
if (arg('confirm') !== dbName)
  die(`Refusing: --confirm must be exactly the database name ("${dbName}").`);

// 1. Backup everything (including the collections we keep) as extended-JSON, one file per collection, plus indexes.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = new URL(`../backups/${dbName}-${stamp}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
for (const n of names) {
  const docs = await db.collection(n).find().toArray();
  writeFileSync(
    `${dir}${n}.ndjson`,
    docs.map((d) => EJSON.stringify(d, { relaxed: false })).join('\n'),
  );
  writeFileSync(
    `${dir}${n}.indexes.json`,
    JSON.stringify(await db.collection(n).indexes(), null, 2),
  );
  if (docs.length !== counts[n])
    die(`Backup of ${n} is incomplete (${docs.length}/${counts[n]}). Nothing was deleted.`);
}
console.log(`\n✔ Backup written and verified: ${dir}`);

// 2. Wipe (documents only; collections and indexes stay).
for (const n of names) if (!KEEP.has(n) && counts[n]) await db.collection(n).deleteMany({});
console.log('✔ Data removed');

// 3. Restore the starter configuration for the admin database.
await client.close();
if (kind === 'admin') {
  const r = spawnSync(
    'node',
    [`--env-file=${envPath}`, new URL('./seed.mjs', import.meta.url).pathname],
    { stdio: 'inherit' },
  );
  if (r.status !== 0)
    die('Wipe done but re-seeding failed — restore from the backup or run `npm run seed`.');
}
console.log('✔ Done. Restore with: node scripts/restore-db.mjs <backup dir> (if ever needed)');
