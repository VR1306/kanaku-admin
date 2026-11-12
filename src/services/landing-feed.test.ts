import { describe, expect, it } from 'vitest';
import { col } from '@/lib/db';
import { hasDb, useTestDb } from '@/test/db';
import { saveDraft, publish } from './content';
import { buildLanding, saveExtras } from './landing-feed';
import { plans } from './billing';
import baseline from '../../scripts/landing-baseline.json';
import type { LandingExtras } from '@/types/cms';
import { siteConfigSchema, type SiteConfig } from '@/features/cms/schemas/site';

type Section = {
  type: string;
  plans?: Array<{ name: string; price: { text: string; suffix?: string } }>;
};
const plan = (id: string, over: object = {}) => ({
  id,
  name: id === 'plan_pro' ? 'Pro' : 'Starter',
  description: '',
  badge: '',
  visible: true,
  monthly: id === 'plan_pro' ? 199 : 0,
  yearly: id === 'plan_pro' ? 1910 : 0,
  gstPct: 18,
  gstMode: 'exclusive' as const,
  subscribers: 0,
  version: 1,
  status: 'live' as const,
  ...over,
});

describe.skipIf(!hasDb)('landing feed', () => {
  useTestDb();
  it('returns nothing until content is published', async () => {
    expect(await buildLanding()).toBeNull();
  });
  it('merges CMS content, structure and live plan prices; hides what the admin hides', async () => {
    await plans.insert(plan('plan_starter'));
    await plans.insert(plan('plan_pro'));
    await saveExtras(baseline.extras as unknown as LandingExtras);
    const cms = structuredClone(baseline.cms) as unknown as SiteConfig;
    await saveDraft(cms);
    await publish('test');

    let cfg = (await buildLanding()) as { sections: Section[] };
    expect(cfg.sections.map((s) => s.type)).toEqual([
      'navbar',
      'hero',
      'features',
      'steps',
      'pricing',
      'faq',
      'cta',
      'footer',
    ]);
    const pricing = cfg.sections.find((s) => s.type === 'pricing')!;
    expect(pricing.plans!.map((p) => `${p.name}:${p.price.text}`)).toEqual([
      'Starter:Free',
      'Pro:₹199',
    ]);

    // the admin edits a price, hides the Starter plan and removes every FAQ → reflected on the next read
    await plans.update('plan_pro', { monthly: 249 });
    cms.pricing.plans[0].visible = false;
    cms.faq = cms.faq.map((f) => ({ ...f, visible: false }));
    await saveDraft(cms);
    await publish('test');
    cfg = (await buildLanding()) as { sections: Section[] };
    expect(cfg.sections.find((s) => s.type === 'pricing')!.plans!.map((p) => p.price.text)).toEqual(
      ['₹249'],
    );
    expect(cfg.sections.some((s) => s.type === 'faq')).toBe(false);

    // an archived plan never appears
    await plans.update('plan_pro', { status: 'archived' });
    cfg = (await buildLanding()) as { sections: Section[] };
    expect(cfg.sections.some((s) => s.type === 'pricing')).toBe(false);
    void col;
  });
  it('renders the hero card, note and navigation exactly as the admin edited them', async () => {
    process.env.USER_APP_URL = 'https://app.example.test/';
    const cms = structuredClone(baseline.cms) as unknown as SiteConfig;
    cms.hero.note = 'Edited note';
    cms.hero.visual = {
      label: 'Q3 overview',
      value: '₹99,999',
      caption: 'edited caption',
      bars: [
        { value: 50, highlight: false },
        { value: 80, highlight: true },
      ],
      floating: null,
    };
    cms.navbar = {
      links: [{ id: 'a', label: 'Why Kanaku', href: '#features' }],
      loginLabel: 'Sign in',
      loginHref: '{userApp}/login',
      signupLabel: 'Join now',
      signupHref: '{userApp}/signup',
    };
    await saveDraft(cms);
    await publish('test');
    const out = (await buildLanding()) as {
      sections: Array<{
        type: string;
        links?: Array<{ label: string }>;
        note?: string;
        visual?: { value: string; bars: unknown[]; floating?: unknown };
        primaryCta?: { label: string; href: string };
      }>;
    };
    const nav = out.sections.find((x) => x.type === 'navbar')!;
    expect(nav.links).toEqual([{ label: 'Why Kanaku', href: '#features' }]);
    expect(nav.primaryCta).toMatchObject({
      label: 'Join now',
      href: 'https://app.example.test/signup',
    });
    const hero = out.sections.find((x) => x.type === 'hero')!;
    expect(hero.note).toBe('Edited note');
    expect(hero.visual).toMatchObject({ value: '₹99,999' });
    expect(hero.visual!.bars).toHaveLength(2);
    expect(hero.visual!.floating).toBeUndefined();
  });
  it('falls back to the structural defaults for content saved before these fields existed', async () => {
    const { withLandingDefaults } = await import('./landing-feed');
    const old = structuredClone(baseline.cms) as unknown as SiteConfig;
    delete old.navbar;
    delete old.hero.note;
    delete old.hero.visual;
    const merged = withLandingDefaults(old, baseline.extras as unknown as LandingExtras);
    expect(merged.navbar?.links.map((l) => l.label)).toEqual([
      'Features',
      'How it works',
      'Pricing',
      'FAQ',
    ]);
    expect(merged.hero.visual?.value).toBe('₹46,580');
    expect(merged.hero.note).toContain('Free to start');
    // regression: the editor must be able to publish what it pre-filled (bars without a highlight flag used to fail)
    expect(siteConfigSchema.safeParse(merged).success).toBe(true);
  });
  it('resolves {userApp} placeholders to the configured User App origin', async () => {
    process.env.USER_APP_URL = 'https://app.example.test/';
    const cfg = JSON.stringify(await buildLanding());
    expect(cfg).toContain('https://app.example.test/signup');
    expect(cfg).not.toContain('{userApp}');
  });
});
