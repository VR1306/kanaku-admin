import 'server-only';
import { col, newId } from '@/lib/db';
import type { AuditEntry } from '@/types/audit';

/**
 * Append-only audit store (MongoDB `audit`). Only `record` and read functions are exported — there is deliberately
 * no update or delete path. (For defence in depth, also restrict this collection's role in Atlas to insert/find.)
 */
type Doc = Omit<AuditEntry, 'id'> & { _id: string };
const toEntry = ({ _id, ...rest }: Doc): AuditEntry => ({ id: _id, ...rest });

export async function record(e: Omit<AuditEntry, 'id' | 'at'>): Promise<AuditEntry> {
  const doc: Doc = { _id: newId('aud'), at: new Date().toISOString(), ...e };
  await (await col<Doc>('audit')).insertOne(doc);
  return toEntry(doc);
}

export interface AuditFilter {
  q?: string;
  result?: 'all' | 'success' | 'failed';
  actor?: string;
  role?: string;
  action?: string;
  resource?: string;
  ip?: string;
  fromUtc?: string;
  toUtc?: string;
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function queryAudit(
  f: AuditFilter = {},
  limit = 500,
): Promise<{ items: AuditEntry[]; actors: string[]; roles: string[] }> {
  const c = await col<Doc>('audit');
  const q: Record<string, unknown> = {};
  if (f.result && f.result !== 'all') q.result = f.result;
  if (f.actor) q.actor = f.actor;
  if (f.role) q.actorRole = f.role;
  if (f.action) q.action = { $regex: esc(f.action), $options: 'i' };
  if (f.resource) q.resource = { $regex: esc(f.resource), $options: 'i' };
  if (f.ip) q.ip = { $regex: esc(f.ip), $options: 'i' };
  if (f.fromUtc || f.toUtc)
    q.at = { ...(f.fromUtc && { $gte: f.fromUtc }), ...(f.toUtc && { $lt: f.toUtc }) };
  if (f.q) {
    const r = { $regex: esc(f.q), $options: 'i' };
    q.$or = [{ actor: r }, { action: r }, { resource: r }, { ip: r }];
  }
  const [docs, actors, roles] = await Promise.all([
    c.find(q).sort({ at: -1 }).limit(limit).toArray(),
    c.distinct('actor'),
    c.distinct('actorRole'),
  ]);
  return {
    items: docs.map(toEntry),
    actors: (actors as string[]).sort(),
    roles: (roles as string[]).sort(),
  };
}
export async function listAudit(limit = 5000): Promise<AuditEntry[]> {
  return (await (await col<Doc>('audit')).find().sort({ at: -1 }).limit(limit).toArray()).map(
    toEntry,
  );
}

export interface SecurityAlert {
  id: string;
  kind: 'failed_signins' | 'new_country' | 'bulk_export';
  message: string;
  at: string;
}

/** Derived alerts for Super Admins: 5+ failed sign-ins per account in 15 min, sign-in from an unseen network, and CSV exports. */
export async function securityAlerts(): Promise<SecurityAlert[]> {
  const all = (await listAudit(1000)).reverse(); // oldest → newest
  const out: SecurityAlert[] = [];
  const failed = new Map<string, AuditEntry[]>();
  for (const e of all)
    if (e.action === 'Failed sign-in' || e.action === 'MFA failed')
      failed.set(e.resource, [...(failed.get(e.resource) ?? []), e]);
  for (const [res, es] of failed) {
    const recent = es.filter((e) => Date.now() - new Date(e.at).getTime() < 15 * 60_000);
    if (recent.length >= 5)
      out.push({
        id: `fs_${res}`,
        kind: 'failed_signins',
        message: `${recent.length} failed sign-ins for ${res.replace('Account · ', '')} in 15 minutes`,
        at: recent.at(-1)!.at,
      });
  }
  const seen = new Set<string>();
  for (const e of all)
    if (e.action === 'Signed in') {
      const net = e.ip.split('.').slice(0, 2).join('.');
      if (e.ip !== 'unknown' && seen.size > 0 && !seen.has(net))
        out.push({
          id: `nc_${e.id}`,
          kind: 'new_country',
          message: `Sign-in by ${e.actor} from a new network (${e.ip})`,
          at: e.at,
        });
      seen.add(net);
    }
  for (const e of all)
    if (e.action.startsWith('Exported'))
      out.push({
        id: `ex_${e.id}`,
        kind: 'bulk_export',
        message: `${e.actor} — ${e.action.toLowerCase()}`,
        at: e.at,
      });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}
