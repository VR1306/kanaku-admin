import 'server-only';
import { col } from '@/lib/db';
import type { SiteConfig } from '@/features/cms/schemas/site';
import type { CmsState, SiteVersion } from '@/types/cms';

// Landing-page CMS (MongoDB `cms` for the working draft, `cms_versions` for immutable published versions).
// Nothing is hard-coded: an empty database starts from this neutral skeleton, which is not publishable until an
// editor fills in the required content. Prices are never stored here (they live in the plans module).
export const EMPTY_CONFIG: SiteConfig = {
  hero: { eyebrow: '', headline: '', subheading: '', image: null, ctaLimit: 2, ctas: [] },
  features: [],
  pricing: { defaultView: 'monthly', plans: [] },
  faq: [],
  footer: { tagline: '', supportEmail: '', copyright: '' },
  theme: {
    primary: '#1d4ed8',
    secondary: '#0b1220',
    accent: '#22d3ee',
    background: '#f1f5fa',
    surface: '#ffffff',
    text: '#0f172a',
    radius: 'lg',
    buttonStyle: 'solid',
  },
};

interface DraftDoc {
  _id: 'draft';
  config: SiteConfig;
  dirty: boolean;
}
type VersionDoc = SiteVersion & { _id?: unknown };
const drafts = () => col<DraftDoc>('cms');
const versions = () => col<VersionDoc>('cms_versions');
const clean = ({ _id, ...v }: VersionDoc): SiteVersion => {
  void _id;
  return v;
};

export async function getState(): Promise<CmsState> {
  const [d, hist] = await Promise.all([
    (await drafts()).findOne({ _id: 'draft' }),
    (await versions()).find().sort({ version: -1 }).limit(50).toArray(),
  ]);
  const history = hist.map(clean);
  return {
    draft: d?.config ?? EMPTY_CONFIG,
    draftDirty: d?.dirty ?? false,
    published: history[0] ?? null,
    history,
  };
}

export async function getPublished(): Promise<SiteConfig | null> {
  const v = await (await versions()).find().sort({ version: -1 }).limit(1).next();
  return v ? v.config : null;
}

export async function saveDraft(cfg: SiteConfig) {
  await (
    await drafts()
  ).replaceOne({ _id: 'draft' }, { config: cfg, dirty: true }, { upsert: true });
}

/** Publishing always creates a new immutable version. */
export async function publish(by: string): Promise<SiteVersion> {
  const { draft } = await getState();
  const last = await (await versions()).find().sort({ version: -1 }).limit(1).next();
  const v: SiteVersion = {
    version: (last?.version ?? 0) + 1,
    publishedAt: new Date().toISOString(),
    by,
    config: draft,
  };
  await (await versions()).insertOne({ ...v });
  await (
    await drafts()
  ).replaceOne({ _id: 'draft' }, { config: draft, dirty: false }, { upsert: true });
  return v;
}

/** Restoring loads an old version into the draft; it goes live only when published again. */
export async function restore(version: number): Promise<SiteVersion | null> {
  const v = await (await versions()).findOne({ version });
  if (!v) return null;
  await saveDraft(v.config);
  return clean(v);
}

/** Pricing rows follow the plans module: every plan gets an (initially hidden) row so editors can switch it on. */
export function withPlanRows(cfg: SiteConfig, planIds: string[]): SiteConfig {
  const have = new Set(cfg.pricing.plans.map((p) => p.planId));
  const missing = planIds
    .filter((id) => !have.has(id))
    .map((planId) => ({
      planId,
      visible: false,
      badge: '',
      ctaLabel: '',
      ctaHref: '',
      bullets: [] as string[],
    }));
  return missing.length
    ? { ...cfg, pricing: { ...cfg.pricing, plans: [...cfg.pricing.plans, ...missing] } }
    : cfg;
}
