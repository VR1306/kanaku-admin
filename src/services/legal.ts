import 'server-only';
import { col } from '@/lib/db';
import type { LegalContent, LegalSlug, LegalState, LegalVersion } from '@/types/legal';

/**
 * Privacy Policy and Terms & Conditions, edited in the console and published as immutable versions.
 * Collection `legal`: { _id: slug, draft, dirty, versions: LegalVersion[] (newest first, last 25) }.
 * The User App and Landing Page read only the published version (`/api/v1/public/legal/{slug}`).
 */
interface Doc {
  _id: LegalSlug;
  draft: LegalContent;
  dirty: boolean;
  versions: LegalVersion[];
}
const store = () => col<Doc>('legal');
const EMPTY: LegalContent = { title: '', summary: '', sections: [] };

export async function getState(slug: LegalSlug): Promise<LegalState> {
  const d = await (await store()).findOne({ _id: slug });
  return {
    slug,
    draft: d?.draft ?? EMPTY,
    draftDirty: d?.dirty ?? false,
    published: d?.versions[0] ?? null,
  };
}

export async function getPublished(slug: LegalSlug): Promise<LegalVersion | null> {
  return (await getState(slug)).published;
}

export async function saveDraft(slug: LegalSlug, content: LegalContent) {
  await (
    await store()
  ).updateOne(
    { _id: slug },
    { $set: { draft: content, dirty: true }, $setOnInsert: { versions: [] } },
    { upsert: true },
  );
}

export async function publish(slug: LegalSlug, by: string): Promise<LegalVersion> {
  const s = await getState(slug);
  const v: LegalVersion = {
    version: (s.published?.version ?? 0) + 1,
    publishedAt: new Date().toISOString(),
    by,
    content: s.draft,
  };
  await (
    await store()
  ).updateOne(
    { _id: slug },
    { $set: { dirty: false }, $push: { versions: { $each: [v], $position: 0, $slice: 25 } } },
    { upsert: true },
  );
  return v;
}
