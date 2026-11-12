import 'server-only';
import { col } from '@/lib/db';
import { getPublished } from '@/services/content';
import { listPlans } from '@/services/billing';
import type { SiteConfig } from '@/features/cms/schemas/site';
import type { LandingExtras } from '@/types/cms';

type Json = Record<string, unknown>;

/**
 * Builds the Landing Page configuration. Content the admin edits in the CMS (hero, features, FAQs,
 * pricing, footer text, colours) is combined with the structural content stored in `cms_extras`
 * (navigation, steps, call-to-action, footer links, labels, SEO). Prices come from live plans.
 */
export type { LandingExtras };

const extrasCol = () => col<{ _id: string; config: LandingExtras }>('cms_extras');
export async function getExtras(): Promise<LandingExtras | null> {
  return (await (await extrasCol()).findOne({ _id: 'landing' }))?.config ?? null;
}
export async function saveExtras(config: LandingExtras) {
  await (await extrasCol()).replaceOne({ _id: 'landing' }, { config }, { upsert: true });
}

/** `{userApp}` in stored links resolves to the user app's origin. */
const userApp = () =>
  (process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app').replace(/\/$/, '');
const resolveLinks = <T>(v: T): T =>
  JSON.parse(JSON.stringify(v).replaceAll('{userApp}', userApp())) as T;

/**
 * Hero note/card and the navigation bar are edited in the CMS Hero tab. Content saved before those fields existed
 * falls back to the structural defaults so nothing disappears and the editor shows what is live.
 */
const normaliseVisual = (v: SiteConfig['hero']['visual']): SiteConfig['hero']['visual'] =>
  v ? { ...v, bars: v.bars.map((b) => ({ value: b.value, highlight: !!b.highlight })) } : v;

export function withLandingDefaults(cfg: SiteConfig, extras: LandingExtras | null): SiteConfig {
  if (!extras) return cfg;
  const nav = extras.navbar as {
    links?: Array<{ label: string; href: string }>;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  const hero = extras.hero as { note?: string; visual?: SiteConfig['hero']['visual'] } | undefined;
  return {
    ...cfg,
    hero: {
      ...cfg.hero,
      note: cfg.hero.note ?? hero?.note ?? '',
      visual: normaliseVisual(
        cfg.hero.visual === undefined ? (hero?.visual ?? null) : cfg.hero.visual,
      ),
    },
    navbar:
      cfg.navbar ??
      (nav?.links?.length
        ? {
            links: nav.links.map((l, i) => ({ id: `n${i + 1}`, ...l })),
            loginLabel: nav.secondaryCta?.label ?? 'Log in',
            loginHref: nav.secondaryCta?.href ?? '{userApp}/login',
            signupLabel: nav.primaryCta?.label ?? 'Get started free',
            signupHref: nav.primaryCta?.href ?? '{userApp}/signup',
          }
        : undefined),
  };
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export async function buildLanding(): Promise<Json | null> {
  const [published, extras, allPlans] = await Promise.all([
    getPublished(),
    getExtras(),
    listPlans(),
  ]);
  if (!published || !extras) return null;
  const cfg = withLandingDefaults(published, extras);
  const x = resolveLinks(extras);
  const nb = cfg.navbar;
  const sections: Json[] = [
    nb
      ? {
          id: 'top',
          type: 'navbar',
          links: nb.links.map(({ label, href }) => ({ label, href })),
          secondaryCta: { label: nb.loginLabel, href: nb.loginHref, variant: 'outline-inverse' },
          primaryCta: { label: nb.signupLabel, href: nb.signupHref },
          themeToggle: (x.navbar as { themeToggle?: boolean }).themeToggle ?? true,
        }
      : { id: 'top', type: 'navbar', ...x.navbar },
  ];

  const lines = cfg.hero.headline.split(/(?<=[.!?])\s+/).filter(Boolean);
  const cta = (style: 'primary' | 'secondary') => {
    const c = cfg.hero.ctas.find((c) => c.style === style);
    return c
      ? {
          label: c.label,
          href: c.href,
          ...(style === 'primary' ? { icon: 'arrow-right' } : { variant: 'outline-inverse' }),
        }
      : undefined;
  };
  sections.push({
    id: 'hero',
    type: 'hero',
    ...(cfg.hero.eyebrow ? { badge: cfg.hero.eyebrow } : {}),
    headline: lines.map((text, i) => ({
      text,
      ...(lines.length > 1 && i === lines.length - 1 ? { accent: true } : {}),
    })),
    description: cfg.hero.subheading,
    primaryCta: cta('primary'),
    secondaryCta: cta('secondary'),
    ...(cfg.hero.note ? { note: cfg.hero.note } : {}),
    ...(cfg.hero.visual
      ? {
          visual: {
            kind: 'overview-card',
            label: cfg.hero.visual.label,
            value: cfg.hero.visual.value,
            caption: cfg.hero.visual.caption,
            bars: cfg.hero.visual.bars.map((b) => ({
              value: b.value,
              ...(b.highlight ? { highlight: true } : {}),
            })),
            ...(cfg.hero.visual.floating ? { floating: cfg.hero.visual.floating } : {}),
          },
        }
      : {}),
  });

  const features = cfg.features.filter((f) => f.visible);
  if (features.length)
    sections.push({
      id: 'features',
      type: 'features',
      ...x.features,
      title: x.features?.title ?? 'Features',
      items: features.map(({ icon, title, description }) => ({ icon, title, description })),
    });
  sections.push({ id: 'how-it-works', type: 'steps', ...x.steps });
  const pricing = pricingPlans(cfg, allPlans);
  if (pricing.length)
    sections.push({
      id: 'pricing',
      type: 'pricing',
      title: x.pricing?.title ?? 'Pricing',
      plans: pricing,
    });
  const faq = cfg.faq.filter((f) => f.visible);
  if (faq.length)
    sections.push({
      id: 'faq',
      type: 'faq',
      title: x.faq?.title ?? 'FAQ',
      items: faq.map((f) => ({ question: f.question, answer: f.answer })),
    });
  sections.push({ id: 'get-started', type: 'cta', ...x.cta });
  sections.push({
    id: 'footer',
    type: 'footer',
    tagline: cfg.footer.tagline,
    columns: x.footer.columns,
    copyright: cfg.footer.copyright,
  });

  const t = cfg.theme;
  const theme = {
    ...(x.theme ?? {}),
    light: {
      primary: t.primary,
      accent: t.accent,
      canvas: t.background,
      surface: t.surface,
      ink: t.text,
    },
  };
  return resolveLinks({
    site: x.site,
    theme,
    flags: x.flags ?? {},
    notFound: x.notFound,
    sections,
  });
}

function pricingPlans(cfg: SiteConfig, plans: Awaited<ReturnType<typeof listPlans>>) {
  const signup = `${userApp()}/signup`;
  return cfg.pricing.plans
    .filter((row) => row.visible)
    .flatMap((row) => {
      const p = plans.find((p) => p.id === row.planId);
      if (!p || !p.visible || p.status !== 'live') return [];
      const yearly = cfg.pricing.defaultView === 'yearly' && p.yearly;
      const amount = yearly ? p.yearly! : p.monthly;
      const highlighted = !!row.badge;
      return [
        {
          name: p.name,
          price: amount
            ? { text: money(amount), suffix: yearly ? '/ year' : '/ month' }
            : { text: 'Free' },
          ...(row.badge ? { badge: row.badge } : {}),
          highlighted,
          features: row.bullets,
          cta: {
            label: row.ctaLabel || 'Get started',
            href: row.ctaHref || signup,
            variant: highlighted ? 'accent' : 'outline-primary',
          },
        },
      ];
    });
}
