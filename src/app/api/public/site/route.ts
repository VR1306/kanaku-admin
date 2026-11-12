import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { getPublished } from '@/services/content';

// Public, read-only: published config only. Drafts are never exposed here.
export async function GET() {
  await connection(); // never prerender: always serve the latest published version
  const cfg = await getPublished();
  return cfg
    ? NextResponse.json({ data: cfg })
    : NextResponse.json({ error: { code: 'not_found' } }, { status: 404 });
}
