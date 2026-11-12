'use client';

import { Button } from '@/components/ui/Button';
import { Checkbox, TextField } from '@/components/ui/Field';
import type { SiteConfig } from '@/types/cms';
import { SubHeading } from './ListRow';

type Hero = SiteConfig['hero'];
type Visual = NonNullable<Hero['visual']>;
const BLANK: Visual = {
  label: 'This month',
  value: '₹0',
  caption: 'saved so far',
  bars: [
    { value: 60, highlight: false },
    { value: 90, highlight: false },
    { value: 120, highlight: true },
  ],
  floating: { label: 'Budget', value: '₹0 left', progress: 50 },
};

/** The card beside the headline: label, figure, caption, the bars and the floating "budget" chip. */
export function HeroVisualForm({ hero, onChange }: { hero: Hero; onChange: (h: Hero) => void }) {
  const v = hero.visual;
  const set = (next: Visual | null) => onChange({ ...hero, visual: next });
  if (!v)
    return (
      <section className="space-y-4">
        <SubHeading title="Overview card" hint="The card shown next to the headline." />
        <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
          No card is shown on the website right now.
        </p>
        <Button variant="outline" onClick={() => set(BLANK)}>
          Add overview card
        </Button>
      </section>
    );
  const patch = (p: Partial<Visual>) => set({ ...v, ...p });
  const setBar = (i: number, p: Partial<Visual['bars'][number]>) =>
    patch({
      bars: v.bars.map((b, j) =>
        j === i ? { ...b, ...p } : p.highlight ? { ...b, highlight: false } : b,
      ),
    });
  const fl = v.floating;
  return (
    <section className="space-y-5">
      <SubHeading
        title="Overview card"
        hint="The card shown next to the headline."
        action={
          <Button variant="outline" className="h-10" onClick={() => set(null)}>
            Remove card
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Label"
          value={v.label}
          maxLength={40}
          onChange={(e) => patch({ label: e.target.value })}
        />
        <TextField
          label="Main figure"
          value={v.value}
          maxLength={20}
          onChange={(e) => patch({ value: e.target.value })}
        />
        <TextField
          label="Caption"
          value={v.caption}
          maxLength={60}
          onChange={(e) => patch({ caption: e.target.value })}
        />
      </div>
      <fieldset className="space-y-4 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">Bars (relative heights)</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {v.bars.map((b, i) => (
            <div key={i} className="space-y-3 rounded-xl bg-canvas p-3">
              <TextField
                label={`Bar ${i + 1}`}
                type="number"
                min={1}
                value={String(b.value)}
                onChange={(e) => setBar(i, { value: Number(e.target.value) || 0 })}
              />
              <Checkbox
                label="Highlight"
                checked={!!b.highlight}
                onChange={(e) => setBar(i, { highlight: e.target.checked })}
              />
              <Button
                variant="outline"
                className="h-10 w-full"
                disabled={v.bars.length <= 2}
                aria-label={`Remove bar ${i + 1}`}
                onClick={() => patch({ bars: v.bars.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={v.bars.length >= 8}
          onClick={() => patch({ bars: [...v.bars, { value: 80, highlight: false }] })}
        >
          + Add bar
        </Button>
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">Floating budget chip</legend>
        {fl ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Label"
                value={fl.label}
                maxLength={30}
                onChange={(e) => patch({ floating: { ...fl, label: e.target.value } })}
              />
              <TextField
                label="Value"
                value={fl.value}
                maxLength={30}
                onChange={(e) => patch({ floating: { ...fl, value: e.target.value } })}
              />
              <TextField
                label="Progress (0–100)"
                type="number"
                min={0}
                max={100}
                value={String(fl.progress)}
                onChange={(e) =>
                  patch({
                    floating: {
                      ...fl,
                      progress: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    },
                  })
                }
              />
            </div>
            <Button variant="outline" onClick={() => patch({ floating: null })}>
              Remove chip
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => patch({ floating: BLANK.floating })}>
            Add chip
          </Button>
        )}
      </fieldset>
    </section>
  );
}
