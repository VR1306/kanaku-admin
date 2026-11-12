import 'server-only';
import { after } from 'next/server';

/**
 * Tells the Landing Page to refresh its cached content right after an admin change (publish, plan edit),
 * so visitors see it immediately instead of after the cache window. Best effort: the Landing Page also
 * re-reads on its own every few minutes. Env: LANDING_URL, LANDING_REVALIDATE_SECRET.
 */
export async function revalidateLandingNow(tags?: string[]) {
  const base = process.env.LANDING_URL;
  const secret = process.env.LANDING_REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify(tags?.length ? { tags } : {}),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error('[landing] revalidate responded', r.status);
  } catch (e) {
    console.error('[landing] revalidate failed:', (e as Error).message);
  }
}

export const revalidateLanding = (tags?: string[]) => {
  try {
    after(() => revalidateLandingNow(tags));
  } catch {
    void revalidateLandingNow(tags);
  }
};
