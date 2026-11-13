'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * One shared Socket.IO connection per tab. The token is fetched from the BFF on every (re)connect, so a long
 * disconnect never leaves the client holding an expired credential. Socket.IO handles backoff/reconnection.
 */
let shared: { socket: Socket; users: number } | null = null;

async function connect(): Promise<Socket | null> {
  const r = await fetch('/api/realtime/token', { credentials: 'same-origin' }).catch(() => null);
  if (!r?.ok) return null;
  const { url } = (await r.json()) as { token: string; url: string | null };
  if (!url) return null; // realtime isn't configured on this deployment
  return io(url, {
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10_000,
    auth: (cb) => {
      fetch('/api/realtime/token', { credentials: 'same-origin' })
        .then((x) => x.json())
        .then((j: { token: string }) => cb({ token: j.token }))
        .catch(() => cb({ token: '' }));
    },
  });
}

/** Subscribe to realtime events. `onEvent` handlers may change every render; `onResync` runs after every (re)connect. */
export function useRealtime(
  handlers: Record<string, (payload: never) => void>,
  onResync?: () => void,
) {
  const [connected, setConnected] = useState(false);
  const [available, setAvailable] = useState(true); // false when no realtime service is configured
  const ref = useRef({ handlers, onResync });
  useEffect(() => {
    ref.current = { handlers, onResync };
  });
  const names = Object.keys(handlers).join(',');

  useEffect(() => {
    let off = () => {};
    let dead = false;
    void (async () => {
      if (!shared) {
        const socket = await connect();
        if (!socket) {
          if (!dead) setAvailable(false);
          return;
        }
        shared ??= { socket, users: 0 };
        if (shared.socket !== socket) socket.close();
      }
      if (dead || !shared) return;
      const { socket } = shared;
      shared.users++;
      const onConnect = () => {
        setConnected(true);
        ref.current.onResync?.();
      };
      const onDisconnect = () => setConnected(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      if (socket.connected) setConnected(true);
      const subs = names
        .split(',')
        .filter(Boolean)
        .map((n) => {
          const fn = (p: never) => ref.current.handlers[n]?.(p);
          socket.on(n, fn as (...a: unknown[]) => void);
          return [n, fn] as const;
        });
      off = () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        subs.forEach(([n, fn]) => socket.off(n, fn as (...a: unknown[]) => void));
        if (shared && --shared.users <= 0) {
          shared.socket.close();
          shared = null;
        }
      };
    })();
    return () => {
      dead = true;
      off();
    };
  }, [names]);

  const emit = (event: string, payload: unknown) => shared?.socket.emit(event, payload);
  return { connected, available, emit };
}
