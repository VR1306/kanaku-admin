import { describe, expect, it } from 'vitest';
import { announcementBody } from './announcements/schemas/announcements';
import { newPassword } from './auth/schemas/auth';
import { couponCreate, planUpdate, refundBody } from './billing/schemas/billing';
import { categoryBody } from './categories/schemas/categories';
import { siteConfigSchema } from './cms/schemas/site';
import { RichText } from './cms/rich';
import { EMPTY_CONFIG } from '@/services/content';
import type { SiteConfig } from './cms/schemas/site';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const good = {
  title: 'Hi',
  message: 'Body',
  audience: 'all',
  channels: ['banner'],
  sendNow: true,
} as const;

/** Test fixture only — a minimal valid landing-page config (the app itself ships no marketing content). */
function sampleConfig(): SiteConfig {
  const f = (i: number) => ({
    id: `f${i}`,
    icon: 'plus' as const,
    title: `Feature ${i}`,
    description: 'Does something useful.',
    visible: true,
  });
  return {
    ...structuredClone(EMPTY_CONFIG),
    hero: {
      eyebrow: '',
      headline: 'Spend smart',
      subheading: 'Track every rupee.',
      image: null,
      ctaLimit: 2,
      ctas: [
        { id: 'c1', label: 'Get started', href: '/signup', style: 'primary' },
        { id: 'c2', label: 'Learn more', href: '#how', style: 'secondary' },
      ],
    },
    features: [f(1), f(2), f(3), f(4)],
    footer: { tagline: 'Spend smart.', supportEmail: 'support@kanaku.com', copyright: '© Kanaku' },
  };
}

describe('schemas', () => {
  it('password policy', () => {
    expect(newPassword.safeParse('short1!').success).toBe(false);
    expect(newPassword.safeParse('nodigits!!').success).toBe(false);
    expect(newPassword.safeParse('Good1pass!').success).toBe(true);
  });
  it('coupon rules', () => {
    const c = {
      code: 'DIWALI26',
      type: 'percent',
      value: 20,
      plans: ['Pro yearly'],
      duration: 'once',
      from: '2026-11-01',
      until: '2026-11-30',
      maxRedemptions: 10,
      perUser: 1,
    };
    expect(couponCreate.safeParse(c).success).toBe(true);
    expect(couponCreate.safeParse({ ...c, code: 'abc' }).success).toBe(false);
    expect(couponCreate.safeParse({ ...c, value: 101 }).success).toBe(false);
    expect(couponCreate.safeParse({ ...c, until: '2026-10-01' }).success).toBe(false);
  });
  it('plan yearly price cannot exceed 12 × monthly', () => {
    const base = {
      name: 'Pro',
      description: '',
      badge: '',
      visible: true,
      gstPct: 18,
      gstMode: 'exclusive' as const,
    };
    expect(planUpdate.safeParse({ ...base, monthly: 199, yearly: 1910 }).success).toBe(true);
    expect(planUpdate.safeParse({ ...base, monthly: 199, yearly: 2500 }).success).toBe(false);
  });
  it('category names are 2–30 characters', () => {
    expect(categoryBody.safeParse({ name: 'Education' }).success).toBe(true);
    expect(categoryBody.safeParse({ name: 'E' }).success).toBe(false);
    expect(categoryBody.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
    expect(categoryBody.safeParse({ name: 'Ok', color: 'pink' }).success).toBe(false);
  });
  it('partial refunds need an amount', () => {
    expect(refundBody.safeParse({ type: 'partial', reason: 'x' }).success).toBe(false);
    expect(refundBody.safeParse({ type: 'full', reason: 'x' }).success).toBe(true);
  });
  it('plan updates reject negative prices', () =>
    expect(
      planUpdate.safeParse({
        name: 'Pro',
        description: '',
        badge: '',
        visible: true,
        monthly: -1,
        yearly: null,
      }).success,
    ).toBe(false));
  it('announcements: limits, links and schedule', () => {
    expect(announcementBody.safeParse(good).success).toBe(true);
    expect(announcementBody.safeParse({ ...good, title: 'x'.repeat(81) }).success).toBe(false);
    expect(announcementBody.safeParse({ ...good, message: 'x'.repeat(501) }).success).toBe(false);
    expect(
      announcementBody.safeParse({ ...good, ctaLabel: 'Go', ctaHref: 'javascript:alert(1)' })
        .success,
    ).toBe(false);
    expect(announcementBody.safeParse({ ...good, sendNow: false }).success).toBe(false); // needs publish date
    expect(
      announcementBody.safeParse({
        ...good,
        sendNow: false,
        publishDate: '2020-01-01',
        publishTime: '10:00',
      }).success,
    ).toBe(false); // past
    expect(announcementBody.safeParse({ ...good, channels: [] }).success).toBe(false);
    expect(
      announcementBody.safeParse({
        ...good,
        image: { dataUrl: 'x', alt: '', name: 'a.png', size: 10 },
      }).success,
    ).toBe(false); // alt required
  });
  it('CMS rules', () => {
    const cfg = sampleConfig();
    expect(siteConfigSchema.safeParse(cfg).success).toBe(true);
    const clone = () => structuredClone(cfg);
    const long = clone();
    long.hero.headline = 'x'.repeat(61);
    expect(siteConfigSchema.safeParse(long).success).toBe(false);
    const two = clone();
    two.hero.ctas[1].style = 'primary';
    expect(siteConfigSchema.safeParse(two).success).toBe(false);
    const three = clone();
    three.hero.ctas.push({ ...three.hero.ctas[0], id: 'c9', style: 'secondary' });
    expect(siteConfigSchema.safeParse(three).success).toBe(false); // limit 2
    const few = clone();
    few.features.forEach((f, i) => (f.visible = i < 2));
    expect(siteConfigSchema.safeParse(few).success).toBe(false);
    const color = clone();
    color.theme.primary = 'red';
    expect(siteConfigSchema.safeParse(color).success).toBe(false);
    const img = clone();
    img.hero.image = { src: 'javascript:alert(1)', alt: 'x' };
    expect(siteConfigSchema.safeParse(img).success).toBe(false);
  });
  it('rich text renders safely', () => {
    const html = renderToStaticMarkup(
      createElement(RichText, {
        text: '**bold** [ok](https://a.com) [bad](javascript:alert(1)) <script>x</script>\n- one\n- two',
      }),
    );
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://a.com"');
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<li>one</li>');
  });
});
