'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';

const WARN_MS = 2 * 60_000;
const POLL_MS = 15_000;

/**
 * 30-minute idle timeout with a 2-minute warning. The server owns the clock: the activity time only moves when a real
 * request is made, so this polls a read-only endpoint (which also counts as activity) only when the user is active in the tab.
 */
export function IdleWatcher() {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiresAt = useRef(0);
  const lastInput = useRef(0);

  useEffect(() => {
    const mark = () => {
      lastInput.current = Date.now();
    };
    ['pointerdown', 'keydown', 'scroll'].forEach((e) =>
      window.addEventListener(e, mark, { passive: true }),
    );
    let stop = false;
    const logout = async () => {
      try {
        await api('/api/auth/logout', { body: { reason: 'idle' } });
      } catch {}
      router.push('/login?reason=idle');
      router.refresh();
    };
    const tick = () => {
      if (stop) return;
      const left = expiresAt.current - Date.now();
      if (expiresAt.current && left <= 0) return void logout();
      setRemaining(expiresAt.current && left <= WARN_MS ? left : null);
    };
    const sync = async () => {
      // Real user input in the last interval extends the session; otherwise just read the clock without touching it.
      try {
        const r = await api<{ idleExpiresAt: number }>('/api/auth/session');
        expiresAt.current = r.idleExpiresAt;
      } catch {
        void logout();
      }
    };
    // Prime, then re-check the server clock periodically while the user is active (and never while a warning is showing).
    void sync();
    const poll = setInterval(() => {
      if (Date.now() - lastInput.current < POLL_MS && expiresAt.current - Date.now() > WARN_MS)
        void sync();
    }, POLL_MS);
    const clock = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(clock);
      ['pointerdown', 'keydown', 'scroll'].forEach((e) => window.removeEventListener(e, mark));
    };
  }, [router]);

  const stay = async () => {
    const r = await api<{ idleExpiresAt: number }>('/api/auth/session');
    expiresAt.current = r.idleExpiresAt;
    setRemaining(null);
  };
  const mm =
    remaining === null
      ? ''
      : `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  return (
    <Modal
      open={remaining !== null}
      title="Still there?"
      onClose={stay}
      footer={<Button onClick={stay}>Stay signed in</Button>}
    >
      <p className="text-sm text-muted">
        For your security you&apos;ll be signed out in <b>{mm}</b> because of inactivity.
      </p>
    </Modal>
  );
}
