import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SortableList } from '@/components/ui/SortableList';
import { Switch } from '@/components/ui/Switch';
import { TextArea, TextField } from '@/components/ui/Field';
import { move } from '@/utils/list';
import { inr, savingPct } from '@/utils/pricing';
import type { PlanPrice, SiteConfig } from '@/types/cms';
import { ListRow, MoveButtons, SubHeading } from './ListRow';

type Pricing = SiteConfig['pricing'];

/** Visibility/order/badge/CTA/bullets only. Prices are read from Plans & payments and can't be edited here. */
export function PricingForm({
  pricing,
  plans,
  onChange,
}: {
  pricing: Pricing;
  plans: PlanPrice[];
  onChange: (p: Pricing) => void;
}) {
  const setPlan = (i: number, p: Partial<Pricing['plans'][number]>) =>
    onChange({ ...pricing, plans: pricing.plans.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="space-y-6">
      <SubHeading
        title="Pricing section"
        hint="Choose which plans appear and how they’re presented. Prices come from Plans & payments."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-4">
        <div>
          <p className="font-semibold">Default billing view</p>
          <p className="text-[13px] text-muted">Visitors can switch between monthly and yearly.</p>
        </div>
        <SegmentedControl
          aria-label="Default view"
          variant="card"
          options={
            [
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ] as const
          }
          value={pricing.defaultView}
          onChange={(v) => onChange({ ...pricing, defaultView: v })}
        />
      </div>
      <SortableList
        className="space-y-4"
        items={pricing.plans}
        keyOf={(p) => p.planId}
        onReorder={(a, b) => onChange({ ...pricing, plans: move(pricing.plans, a, b) })}
        render={(p, i) => {
          const plan = plans.find((x) => x.id === p.planId);
          const s = savingPct(plan?.monthly ?? null, plan?.yearly ?? null);
          return (
            <ListRow
              tall
              muted={!p.visible}
              controls={
                <>
                  <MoveButtons
                    onUp={() => onChange({ ...pricing, plans: move(pricing.plans, i, i - 1) })}
                    onDown={() => onChange({ ...pricing, plans: move(pricing.plans, i, i + 1) })}
                    disabledUp={i === 0}
                    disabledDown={i === pricing.plans.length - 1}
                  />
                  <Switch
                    size="sm"
                    aria-label={`${p.visible ? 'Hide' : 'Show'} ${plan?.name ?? p.planId}`}
                    checked={p.visible}
                    onChange={(v) => setPlan(i, { visible: v })}
                  />
                </>
              }
            >
              <div className="space-y-4 py-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-bold">{plan?.name ?? p.planId}</p>
                  {plan?.status === 'archived' && <Badge tone="gray">Archived</Badge>}
                  {!plan && <Badge tone="red">Plan missing</Badge>}
                </div>
                {plan && (
                  <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-sm text-muted">
                    {plan.monthly === null ? (
                      'Price not set'
                    ) : plan.monthly === 0 ? (
                      'Free'
                    ) : (
                      <>
                        <b className="text-ink">{inr(plan.monthly)}</b>/mo
                        {plan.gstMode === 'exclusive' ? ' + GST' : ''}
                        {plan.yearly ? (
                          <>
                            {' '}
                            · <b className="text-ink">{inr(plan.yearly)}</b>/yr
                            {s ? ` (save ${s}%)` : ''}
                          </>
                        ) : null}
                      </>
                    )}
                    {' · '}
                    <Link href="/billing" className="font-semibold text-link underline">
                      Edit in Plans &amp; payments
                    </Link>
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TextField
                    label="Badge"
                    placeholder="e.g. Most popular"
                    maxLength={24}
                    value={p.badge}
                    onChange={(e) => setPlan(i, { badge: e.target.value })}
                  />
                  <TextField
                    label="Button label"
                    placeholder="e.g. Upgrade to Pro"
                    maxLength={24}
                    value={p.ctaLabel}
                    onChange={(e) => setPlan(i, { ctaLabel: e.target.value })}
                  />
                  <TextField
                    label="Button link"
                    placeholder="/signup?plan=pro"
                    value={p.ctaHref}
                    onChange={(e) => setPlan(i, { ctaHref: e.target.value })}
                  />
                </div>
                <TextArea
                  label={`Feature bullets · ${p.bullets.length}/8 (one per line)`}
                  rows={4}
                  placeholder={'Unlimited budgets\nReceipt vault & PDF exports'}
                  value={p.bullets.join('\n')}
                  onChange={(e) =>
                    setPlan(i, {
                      bullets: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 8),
                    })
                  }
                />
              </div>
            </ListRow>
          );
        }}
      />
    </div>
  );
}
