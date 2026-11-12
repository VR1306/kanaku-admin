import type { SiteConfig } from '@/features/cms/schemas/site';

export type { SiteConfig };
export interface SiteVersion {
  version: number;
  publishedAt: string;
  by: string;
  config: SiteConfig;
}
export interface CmsState {
  draft: SiteConfig;
  draftDirty: boolean;
  published: SiteVersion | null;
  history: SiteVersion[];
}
export interface PlanPrice {
  id: string;
  name: string;
  monthly: number | null;
  yearly: number | null;
  gstPct: number;
  gstMode: 'exclusive' | 'inclusive';
  status: 'live' | 'archived';
}
export type CmsResponse = CmsState & { plans: PlanPrice[] };

/** Structural landing content (navigation, steps, call-to-action, footer links, labels, SEO) edited in the console's Structure tab. */
type Json = Record<string, unknown>;
export interface LandingExtras {
  site: Json;
  theme?: Json;
  flags?: Record<string, boolean>;
  notFound: Json;
  navbar: Json;
  hero?: Json;
  features?: { eyebrow?: string; title: string };
  steps: { title: string; items: Json[] };
  pricing?: { title: string };
  faq?: { title: string };
  cta: Json;
  footer: { columns: Json[] };
}
