import 'server-only';
import { randomBytes } from 'node:crypto';
import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

/**
 * MongoDB access (server only). One cached connection per process, indexes ensured once.
 * Configure with MONGODB_URI (+ optional MONGODB_DB, default "kanaku_admin"). Never expose these to the browser.
 */
const g = globalThis as unknown as { __mongo?: Promise<Db> };

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const client = await new MongoClient(uri, {
    // Keep a few connections warm so a request's parallel queries don't each pay a fresh TLS handshake.
    minPoolSize: 4,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 8000,
  }).connect();
  const db = client.db(process.env.MONGODB_DB ?? 'kanaku_admin');
  await ensureIndexes(db);
  return db;
}

export function getDb(): Promise<Db> {
  // A failed connection must not be cached forever.
  return (g.__mongo ??= connect().catch((e) => {
    g.__mongo = undefined;
    throw e;
  }));
}

export async function col<T extends Document>(name: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

export const newId = (prefix: string) => `${prefix}_${randomBytes(5).toString('hex')}`;

/** Maps a Mongo document (`_id`) to the API shape (`id`). */
export function out<T extends { _id: string }>(d: T): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = d;
  return { id: _id, ...rest };
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('admins').createIndex({ email: 1 }, { unique: true }),
    db.collection('tokens').createIndex({ hash: 1, kind: 1 }),
    db.collection('tokens').createIndex({ exp: 1 }, { expireAfterSeconds: 86_400 }), // purge a day after expiry (exp is a Date)
    db.collection('sessions').createIndex({ sid: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ userId: 1 }),
    db.collection('audit').createIndex({ at: -1 }),
    db.collection('app_users').createIndex({ email: 1 }, { unique: true }),
    db.collection('app_users').createIndex({ status: 1, joined: -1 }),
    db.collection('payments').createIndex({ at: -1 }),
    db.collection('payments').createIndex({ userId: 1, couponCode: 1 }), // per-customer coupon usage
    db.collection('coupons').createIndex({ code: 1 }, { unique: true }),
    db.collection('categories').createIndex({ name: 1 }),
    db.collection('tickets').createIndex({ createdAt: -1 }),
    db.collection('tickets').createIndex({ 'user.id': 1 }),
    db.collection('tickets').createIndex({ status: 1, assignee: 1 }),
    db.collection('announcements').createIndex({ createdAt: -1 }),
    db.collection('cms_versions').createIndex({ version: -1 }, { unique: true }),
    db.collection('outbox').createIndex({ at: 1 }, { expireAfterSeconds: 120 }), // realtime events are ephemeral
    db.collection('admin_notifications').createIndex({ userId: 1, at: -1 }),
    db.collection('deliveries').createIndex({ announcementId: 1, channel: 1 }),
    db.collection('deliveries').createIndex({ status: 1, nextAttempt: 1 }),
  ]);
}

/** Tiny typed repository for collections whose documents are `{ id, ...fields }` in the API (stored as `_id`). */
export function repo<T extends { id: string }>(name: string) {
  type Doc = Record<string, unknown>;
  const c = () => col<Doc>(name);
  const from = (d: Doc): T => {
    const { _id, ...rest } = d;
    return { id: _id, ...rest } as unknown as T;
  };
  return {
    async list(filter: Doc = {}, sort: Record<string, 1 | -1> = { _id: 1 }): Promise<T[]> {
      return (await (await c()).find(filter).sort(sort).toArray()).map(from);
    },
    async get(id: string): Promise<T | undefined> {
      const d = await (await c()).findOne({ _id: id } as Doc);
      return d ? from(d) : undefined;
    },
    async insert(item: T): Promise<T> {
      const { id, ...rest } = item;
      await (await c()).insertOne({ _id: id, ...rest } as Doc);
      return item;
    },
    async update(id: string, set: Partial<T>): Promise<T | undefined> {
      const { id: _i, ...fields } = set as Doc;
      void _i;
      const d = await (
        await c()
      ).findOneAndUpdate({ _id: id } as Doc, { $set: fields }, { returnDocument: 'after' });
      return d ? from(d) : undefined;
    },
    async remove(id: string) {
      return (await (await c()).deleteOne({ _id: id } as Doc)).deletedCount === 1;
    },
    async count(filter: Doc = {}) {
      return (await c()).countDocuments(filter);
    },
  };
}
