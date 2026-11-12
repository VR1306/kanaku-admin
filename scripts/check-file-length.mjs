// Fails if any source file exceeds MAX_LINES. Usage: node scripts/check-file-length.mjs [files...]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAX_LINES = 500;
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);
const SKIP = new Set(['node_modules', '.next', '.git', 'out', 'build']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXTS.has(extname(p)) && !name.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}

const args = process.argv.slice(2).filter((a) => EXTS.has(extname(a)));
const files = args.length ? args : walk('.');
const offenders = files
  .map((f) => ({ f, n: readFileSync(f, 'utf8').split('\n').length }))
  .filter(({ n }) => n > MAX_LINES);

if (offenders.length) {
  console.error(`Files over ${MAX_LINES} lines:`);
  for (const { f, n } of offenders) console.error(`  ${f}: ${n}`);
  process.exit(1);
}
console.log(`File length OK (${files.length} files checked, max ${MAX_LINES}).`);
