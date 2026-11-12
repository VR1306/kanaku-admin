#!/usr/bin/env node
// Restores a backup made by reset-db.mjs:  node scripts/restore-db.mjs --env <.env.local> <backup dir> --confirm <dbName>
import { EJSON } from 'bson';
import { readdirSync, readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const arg = (n) => process.argv[process.argv.indexOf(`--${n}`) + 1];
const dir = process.argv.find(
  (a, i) =>
    i > 1 &&
    !a.startsWith('--') &&
    process.argv[i - 1] !== '--env' &&
    process.argv[i - 1] !== '--confirm',
);
const env = Object.fromEntries(
  readFileSync(arg('env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [
      l.slice(0, l.indexOf('=')),
      l
        .slice(l.indexOf('=') + 1)
        .trim()
        .replace(/^["']|["']$/g, ''),
    ]),
);
const dbName = env.MONGODB_DB ?? 'kanaku_admin';
if (arg('confirm') !== dbName) {
  console.error(`Refusing: pass --confirm ${dbName}`);
  process.exit(1);
}
const client = await new MongoClient(env.MONGODB_URI).connect();
const db = client.db(dbName);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.ndjson'))) {
  const name = f.replace('.ndjson', '');
  const docs = readFileSync(`${dir}/${f}`, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => EJSON.parse(l));
  await db.collection(name).deleteMany({});
  if (docs.length) await db.collection(name).insertMany(docs);
  console.log(`restored ${name}: ${docs.length}`);
}
await client.close();
