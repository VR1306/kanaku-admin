/**
 * Standalone Socket.IO service (Next route handlers can't hold WebSockets open).
 *   npm run realtime        (dev: tsx watch · prod: node via tsx)
 * Env: REALTIME_PORT (4100), REALTIME_SECRET, REALTIME_ORIGINS (comma list), MONGODB_URI / MONGODB_DB.
 *
 * - Clients connect with `auth: { token }` minted by the Admin Portal (/api/realtime/token) or, for the
 *   User App, by its server with the same REALTIME_SECRET. Nothing else is trusted.
 * - Events are produced by the apps through the `outbox` collection (change stream, with polling fallback)
 *   so delivery works no matter which process created them and survives service restarts.
 * - Typing indicators are the only client-originated events; ownership of the ticket is verified first.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { MongoClient, type Db } from 'mongodb';
import { Server } from 'socket.io';

const port = Number(process.env.REALTIME_PORT ?? 4100);
const key = process.env.REALTIME_SECRET ?? '';
if (key.length < 32) throw new Error('REALTIME_SECRET (≥ 32 chars) is required');
const origins = (process.env.REALTIME_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

interface Tok {
  kind: 'admin' | 'user';
  id: string;
  agent?: boolean;
  exp: number;
}
function verify(token: string): Tok | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const good = createHmac('sha256', key).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig)))
    return null;
  try {
    const t = JSON.parse(Buffer.from(body, 'base64url').toString()) as Tok;
    return t.exp > Date.now() && t.id ? t : null;
  } catch {
    return null;
  }
}

const mongo = new MongoClient(process.env.MONGODB_URI ?? '');
const db: Db = mongo.db(process.env.MONGODB_DB ?? 'kanaku_admin');

const http = createServer((req, res) => {
  if (req.url === '/health')
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
  else res.writeHead(404).end();
});
const io = new Server(http, {
  cors: { origin: origins },
  pingInterval: 20_000,
  pingTimeout: 20_000,
});

io.use((socket, next) => {
  const t = verify(String(socket.handshake.auth?.token ?? ''));
  if (!t) return next(new Error('unauthenticated'));
  socket.data.tok = t;
  next();
});

io.on('connection', (socket) => {
  const t = socket.data.tok as Tok;
  if (t.kind === 'user') void socket.join(`user:${t.id}`);
  else {
    void socket.join(`admin:${t.id}`);
    if (t.agent) void socket.join('agents');
  }
  let last = 0;
  socket.on('typing', async (msg: { ticketId?: string }) => {
    const ticketId = String(msg?.ticketId ?? '');
    if (!ticketId || Date.now() - last < 1500) return;
    last = Date.now();
    const ticket = await db
      .collection<{ _id: string; user: { id: string } }>('tickets')
      .findOne({ _id: ticketId }, { projection: { user: 1 } });
    if (!ticket) return;
    if (t.kind === 'user' && ticket.user.id === t.id)
      io.to('agents').emit('chat:typing', { ticketId, who: 'user' });
    else if (t.kind === 'admin' && t.agent)
      io.to(`user:${ticket.user.id}`).emit('chat:typing', { ticketId, who: 'agent' });
  });
});

interface Out {
  _id: unknown;
  rooms: string[];
  event: string;
  payload: unknown;
  at: Date;
}
const seen = new Set<string>(); // the stream and the poll can both see an event; deliver once
const forward = (d: Out) => {
  const id = String(d._id);
  if (seen.has(id)) return;
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value as string);
  if (d.rooms.length && d.event) io.to(d.rooms).emit(d.event, d.payload);
};

// Change stream when available (Atlas); otherwise poll the outbox. A cursor guards against duplicates.
let watermark = new Date();
async function poll() {
  const docs = await db
    .collection<Out>('outbox')
    .find({ at: { $gt: watermark } })
    .sort({ at: 1 })
    .toArray();
  for (const d of docs) {
    forward(d);
    watermark = d.at;
  }
}
function watch() {
  const stream = db.collection<Out>('outbox').watch([{ $match: { operationType: 'insert' } }]);
  stream.on('change', (c) => {
    const d = (c as unknown as { fullDocument?: Out }).fullDocument;
    if (d) {
      forward(d);
      watermark = d.at > watermark ? d.at : watermark;
    }
  });
  stream.on('error', (e) => {
    console.error('[realtime] change stream error — retry in 3s:', e.message);
    void stream.close().catch(() => undefined);
    setTimeout(watch, 3000);
  });
}
mongo
  .connect()
  .then(() => {
    watch();
  })
  .catch((e) => {
    console.error('[realtime] cannot reach MongoDB', e);
    process.exit(1);
  });
setInterval(() => void poll().catch(() => undefined), 2000); // safety net: catches anything the stream missed

// Scheduler: ask the Admin Portal to publish due announcements and send pending deliveries.
const adminUrl = process.env.ADMIN_URL;
if (adminUrl && process.env.SERVICE_API_KEY) {
  setInterval(() => {
    fetch(`${adminUrl.replace(/\/$/, '')}/api/v1/service/jobs/tick`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.SERVICE_API_KEY}` },
      signal: AbortSignal.timeout(25_000),
    }).catch((e) => console.error('[realtime] tick failed:', (e as Error).message));
  }, 30_000);
} else
  console.warn(
    '[realtime] ADMIN_URL/SERVICE_API_KEY not set: scheduled announcements will not auto-publish',
  );

http.listen(port, () =>
  console.log(`[realtime] listening on :${port} (origins: ${origins.join(', ')})`),
);
