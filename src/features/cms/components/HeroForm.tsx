'use client';

/* eslint-disable @next/next/no-img-element -- hero image may be an admin-uploaded data URL */
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SortableList } from '@/components/ui/SortableList';
import { move, uid } from '@/utils/list';
import type { SiteConfig } from '@/types/cms';
import { IconButton, ListRow, MoveButtons, SubHeading } from './ListRow';

type Hero = SiteConfig['hero'];
const IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function HeroForm({ hero, onChange }: { hero: Hero; onChange: (h: Hero) => void }) {
  const set = (p: Partial<Hero>) => onChange({ ...hero, ...p });
  const atLimit = hero.ctas.length >= hero.ctaLimit;
  const setCta = (i: number, p: Partial<Hero['ctas'][number]>) =>
    set({ ctas: hero.ctas.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <SubHeading title="Headline" hint="The first thing visitors read." />
        <TextField
          label="Eyebrow label"
          placeholder="e.g. Expense tracking for modern professionals"
          value={hero.eyebrow}
          maxLength={60}
          onChange={(e) => set({ eyebrow: e.target.value })}
        />
        <TextField
          label={`Headline · ${hero.headline.length}/60`}
          placeholder="e.g. Spend smart. Grow faster."
          maxLength={60}
          value={hero.headline}
          onChange={(e) => set({ headline: e.target.value })}
        />
        <TextArea
          label={`Sub-heading · ${hero.subheading.length}/200`}
          rows={3}
          placeholder="One or two sentences that explain the value."
          maxLength={200}
          value={hero.subheading}
          onChange={(e) => set({ subheading: e.target.value })}
        />
        <TextField
          label="Small print under the buttons"
          placeholder="e.g. Free to start · No card required · Works on any device"
          value={hero.note ?? ''}
          maxLength={120}
          onChange={(e) => set({ note: e.target.value })}
        />
      </section>
      <HeroImage hero={hero} set={set} />
      <section className="space-y-4">
        <SubHeading
          title="Call-to-action buttons"
          hint={`${hero.ctas.length} of ${hero.ctaLimit} used · only one can be primary · drag to reorder`}
          action={
            <Button
              variant="outline"
              className="h-10"
              disabled={atLimit}
              onClick={() =>
                set({
                  ctas: [...hero.ctas, { id: uid('c'), label: '', href: '', style: 'secondary' }],
                })
              }
            >
              <Icon name="plus" size={16} strokeWidth={2.4} />
              Add button
            </Button>
          }
        />
        <div className="max-w-[220px]">
          <SelectField
            label="Maximum buttons"
            value={String(hero.ctaLimit)}
            onChange={(e) =>
              set({
                ctaLimit: Number(e.target.value) as 2 | 3,
                ctas: hero.ctas.slice(0, Number(e.target.value)),
              })
            }
            options={[
              { value: '2', label: '2 buttons' },
              { value: '3', label: '3 buttons' },
            ]}
          />
        </div>
        {atLimit && (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            Limit reached: up to {hero.ctaLimit} buttons. Remove one to add another.
          </p>
        )}
        <SortableList
          className="space-y-3"
          items={hero.ctas}
          keyOf={(c) => c.id}
          onReorder={(a, b) => set({ ctas: move(hero.ctas, a, b) })}
          render={(c, i) => (
            <ListRow
              tall
              controls={
                <>
                  <MoveButtons
                    onUp={() => set({ ctas: move(hero.ctas, i, i - 1) })}
                    onDown={() => set({ ctas: move(hero.ctas, i, i + 1) })}
                    disabledUp={i === 0}
                    disabledDown={i === hero.ctas.length - 1}
                  />
                  <IconButton
                    label="Remove button"
                    danger
                    disabled={hero.ctas.length <= 1}
                    onClick={() => set({ ctas: hero.ctas.filter((_, j) => j !== i) })}
                  >
                    <Icon name="trash" size={16} />
                  </IconButton>
                </>
              }
            >
              <div className="grid gap-3 py-1 sm:grid-cols-2">
                <TextField
                  label="Label"
                  placeholder="e.g. Get started free"
                  maxLength={24}
                  value={c.label}
                  onChange={(e) => setCta(i, { label: e.target.value })}
                />
                <TextField
                  label="Link"
                  placeholder="/signup or #how"
                  value={c.href}
                  onChange={(e) => setCta(i, { href: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <SegmentedControl
                    aria-label={`Style of ${c.label || 'button'}`}
                    variant="page"
                    options={
                      [
                        { value: 'primary', label: 'Primary' },
                        { value: 'secondary', label: 'Secondary' },
                      ] as const
                    }
                    value={c.style}
                    onChange={(v) => setCta(i, { style: v })}
                  />
                </div>
              </div>
            </ListRow>
          )}
        />
      </section>
    </div>
  );
}

function HeroImage({ hero, set }: { hero: Hero; set: (p: Partial<Hero>) => void }) {
  const [err, setErr] = useState('');
  const onFile = (f?: File) => {
    if (!f) return;
    if (!IMG_TYPES.includes(f.type)) return setErr('Use a PNG, JPG or WebP image');
    if (f.size > 2 * 1024 * 1024) return setErr('Image must be 2 MB or smaller');
    setErr('');
    const r = new FileReader();
    r.onload = () => set({ image: { src: String(r.result), alt: hero.image?.alt ?? '' } });
    r.readAsDataURL(f);
  };
  return (
    <section className="space-y-4">
      <SubHeading title="Hero image" hint="Optional · PNG, JPG or WebP · max 2 MB" />
      {hero.image ? (
        <div className="flex flex-wrap items-start gap-5 rounded-2xl border border-line p-4">
          <img
            src={hero.image.src}
            alt={hero.image.alt}
            className="h-28 w-44 rounded-xl border border-line object-cover"
          />
          <div className="min-w-[220px] flex-1 space-y-3">
            <TextField
              label="Alt text"
              placeholder="Describe the image for screen readers"
              value={hero.image.alt}
              onChange={(e) => set({ image: { ...hero.image!, alt: e.target.value } })}
            />
            <Button variant="outlineDanger" className="h-10" onClick={() => set({ image: null })}>
              Remove image
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong p-8 text-center text-sm text-muted transition-colors hover:border-brand hover:bg-brand-soft/30">
          <Icon name="upload" size={24} className="text-link" />
          <span>
            <b className="text-link">Upload an image</b> or drop it here
          </span>
          <input
            type="file"
            aria-label="Upload hero image"
            accept={IMG_TYPES.join(',')}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
      )}
      {err && (
        <p role="alert" className="text-sm text-bad">
          {err}
        </p>
      )}
    </section>
  );
}
