'use client';

/* eslint-disable @next/next/no-img-element -- hero image may be an admin-uploaded data URL */
import { useState } from 'react';
import type { PlanPrice, SiteConfig } from '@/types/cms';
import { inr, savingPct, withGst } from '@/utils/pricing';
import { RichText } from '../rich';

const RADIUS = { sm: '6px', md: '12px', lg: '20px' } as const;
const ICONS = {
  plus: '＋',
  wallet: '▣',
  chart: '▥',
  repeat: '↻',
  receipt: '▤',
  bell: '◔',
  shield: '⛨',
} as const;

/**
 * Renders the landing page purely from config. The theme is scoped to this subtree via CSS variables, independent of the
 * admin/user app themes. Used by both the editor's live preview and the public /site page. Prices always come from the plans.
 */
export function LandingPage({
  config: c,
  plans,
  compact,
}: {
  config: SiteConfig;
  plans: PlanPrice[];
  compact?: boolean;
}) {
  const t = c.theme;
  const [view, setView] = useState<'monthly' | 'yearly'>(c.pricing.defaultView);
  const style = {
    '--lp-primary': t.primary,
    '--lp-secondary': t.secondary,
    '--lp-accent': t.accent,
    '--lp-bg': t.background,
    '--lp-surface': t.surface,
    '--lp-text': t.text,
    '--lp-radius': RADIUS[t.radius],
  } as React.CSSProperties;
  const btn = (primary: boolean) => ({
    borderRadius: 'var(--lp-radius)',
    background: primary && t.buttonStyle === 'solid' ? 'var(--lp-accent)' : 'transparent',
    color: primary && t.buttonStyle === 'solid' ? 'var(--lp-secondary)' : 'inherit',
    border: '1px solid var(--lp-accent)',
  });
  const faqs = c.faq.filter((f) => f.visible);
  const shown = c.pricing.plans.filter((p) => p.visible);
  const pad = compact ? 'px-6' : 'px-10';

  return (
    <div
      style={{ ...style, background: 'var(--lp-bg)', color: 'var(--lp-text)' }}
      className="@container text-sm"
    >
      <section
        style={{ background: 'var(--lp-secondary)', color: '#fff' }}
        className={`${pad} py-14`}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--lp-accent)' }}>
          {c.hero.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{c.hero.headline}</h1>
        <p className="mt-3 max-w-lg opacity-80">{c.hero.subheading}</p>
        {c.hero.image && (
          <img src={c.hero.image.src} alt={c.hero.image.alt} className="mt-6 max-h-64 rounded-xl" />
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {c.hero.ctas.map((b) => (
            <a
              key={b.id}
              href={b.href}
              style={btn(b.style === 'primary')}
              className="px-5 py-2.5 font-semibold"
            >
              {b.label}
            </a>
          ))}
        </div>
      </section>
      <section id="features" className={`grid gap-4 ${pad} py-10 @2xl:grid-cols-3`}>
        {c.features
          .filter((f) => f.visible)
          .map((f) => (
            <article
              key={f.id}
              style={{ background: 'var(--lp-surface)', borderRadius: 'var(--lp-radius)' }}
              className="border border-black/5 p-5"
            >
              <span
                aria-hidden
                style={{ background: 'var(--lp-primary)', borderRadius: 'var(--lp-radius)' }}
                className="grid size-9 place-items-center text-white"
              >
                {ICONS[f.icon]}
              </span>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 opacity-70">{f.description}</p>
            </article>
          ))}
      </section>
      <section id="pricing" className={`${pad} py-10`}>
        <h2 className="text-center text-2xl font-extrabold">Simple, transparent pricing</h2>
        <div className="mt-4 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Billing period"
            className="inline-flex rounded-full border border-black/10 p-1"
            style={{ background: 'var(--lp-surface)' }}
          >
            {(['monthly', 'yearly'] as const).map((v) => {
              const pro = plans.find((p) => p.yearly && p.monthly);
              const save =
                v === 'yearly' ? savingPct(pro?.monthly ?? null, pro?.yearly ?? null) : null;
              return (
                <button
                  key={v}
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className="rounded-full px-4 py-1.5 text-xs font-bold capitalize"
                  style={
                    view === v ? { background: 'var(--lp-primary)', color: '#fff' } : undefined
                  }
                >
                  {v}
                  {save ? ` · save ${save}%` : ''}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-6 grid gap-4 @xl:grid-cols-2">
          {shown.map((p) => {
            const plan = plans.find((x) => x.id === p.planId);
            const listed = plan ? (view === 'monthly' ? plan.monthly : plan.yearly) : null;
            const free = listed === 0;
            const tax = listed && plan ? withGst(listed, plan.gstPct, plan.gstMode) : null;
            return (
              <article
                key={p.planId}
                style={{
                  background: p.badge ? 'var(--lp-primary)' : 'var(--lp-surface)',
                  color: p.badge ? '#fff' : 'inherit',
                  borderRadius: 'var(--lp-radius)',
                }}
                className="border border-black/5 p-6"
              >
                <div className="flex justify-between">
                  <h3 className="font-bold">{plan?.name ?? p.planId}</h3>
                  {p.badge && (
                    <span
                      style={{ background: 'var(--lp-accent)', color: 'var(--lp-secondary)' }}
                      className="rounded-full px-2 text-xs font-bold"
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-3xl font-extrabold">
                  {listed === null ? 'Price to be announced' : free ? 'Free' : inr(listed)}
                  {!!listed && (
                    <span className="text-sm font-semibold opacity-80">
                      {' '}
                      /{view === 'monthly' ? 'mo' : 'yr'}
                      {plan?.gstMode === 'exclusive' ? ' + GST' : ' incl. GST'}
                    </span>
                  )}
                </p>
                {tax && plan?.gstMode === 'exclusive' && (
                  <p className="text-xs opacity-75">
                    {inr(tax.total)} with {plan.gstPct}% GST
                  </p>
                )}
                <ul className="mt-3 space-y-1">
                  {p.bullets.map((b) => (
                    <li key={b}>✓ {b}</li>
                  ))}
                </ul>
                <a
                  href={p.ctaHref}
                  style={btn(true)}
                  className="mt-4 inline-block px-4 py-2 font-semibold"
                >
                  {p.ctaLabel}
                </a>
              </article>
            );
          })}
        </div>
      </section>
      <section id="faq" className={`${pad} py-10`}>
        <h2 className="text-center text-2xl font-extrabold">Frequently asked questions</h2>
        <div className="mx-auto mt-4 max-w-xl space-y-2">
          {faqs.map((f) => (
            <details
              key={f.id}
              style={{ background: 'var(--lp-surface)', borderRadius: 'var(--lp-radius)' }}
              className="p-3"
            >
              <summary className="cursor-pointer font-semibold">{f.question}</summary>
              <div className="mt-2 space-y-1 opacity-70">
                <RichText text={f.answer} />
              </div>
            </details>
          ))}
        </div>
      </section>
      <footer
        style={{ background: 'var(--lp-secondary)', color: '#fff' }}
        className={`flex flex-wrap justify-between gap-2 ${pad} py-6 text-xs`}
      >
        <span>{c.footer.tagline}</span>
        <a href={`mailto:${c.footer.supportEmail}`}>{c.footer.supportEmail}</a>
        <span>{c.footer.copyright}</span>
      </footer>
    </div>
  );
}
