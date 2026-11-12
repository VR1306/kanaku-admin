'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import type { LandingExtras } from '@/types/cms';

type Link = { label: string; href: string };
type Item = { title: string; description: string };
type Column = { title: string; links: Link[] };

/** Use `{userApp}` in a link to point at the User App (e.g. `{userApp}/signup`). */
const HINT = 'Links can be /path, #anchor, https://… or {userApp}/signup (the User App).';

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="space-y-4 rounded-2xl border border-line p-5">
    <legend className="px-2 text-sm font-bold">{title}</legend>
    {children}
  </fieldset>
);

function Links({
  links,
  onChange,
  noun = 'link',
}: {
  links: Link[];
  onChange: (l: Link[]) => void;
  noun?: string;
}) {
  return (
    <div className="space-y-3">
      {links.map((l, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField
            label="Label"
            value={l.label}
            onChange={(e) =>
              onChange(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
          />
          <TextField
            label="Link"
            value={l.href}
            onChange={(e) =>
              onChange(links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))
            }
          />
          <Button
            variant="outline"
            className="h-[54px]"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => onChange([...links, { label: '', href: '#' }])}>
        + Add {noun}
      </Button>
    </div>
  );
}

/** how-it-works steps, call-to-action, footer links and SEO. Saved separately from the content draft and live immediately. */
export function StructureForm() {
  const { toast } = useToast();
  const { data, error, loading, reload } = useApi<{ extras: LandingExtras | null }>(
    '/api/cms/extras',
  );
  const [local, setLocal] = useState<LandingExtras | null>(null);
  const [busy, setBusy] = useState(false);
  const x = local ?? data?.extras ?? null;

  if (loading && !data) return <Skeleton className="h-96 rounded-[24px]" />;
  if (error || !x)
    return (
      <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
        {error ??
          'No landing structure found. Run `npm run seed` once to create the starting content.'}
      </p>
    );
  const set = (next: Partial<LandingExtras>) => setLocal({ ...x, ...next });
  const seo = x.site.seo as { title: string; description?: string };
  const cta = x.cta as { title: string; description?: string; cta: Link };

  async function save() {
    setBusy(true);
    try {
      await api('/api/cms/extras', { method: 'PUT', body: x });
      toast('Saved — the landing page is updated');
      setLocal(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        These parts of the page are not versioned: saving updates the live landing page immediately.
      </p>
      <Group title="Brand & search (SEO)">
        <TextField
          label="Brand name"
          value={(x.site.brand as { name: string }).name}
          onChange={(e) => set({ site: { ...x.site, brand: { name: e.target.value } } })}
        />
        <TextField
          label="Page title"
          value={seo.title}
          onChange={(e) => set({ site: { ...x.site, seo: { ...seo, title: e.target.value } } })}
        />
        <TextArea
          label="Search description"
          value={seo.description ?? ''}
          onChange={(e) =>
            set({ site: { ...x.site, seo: { ...seo, description: e.target.value } } })
          }
        />
      </Group>

      <p className="text-xs text-muted">{HINT}</p>
      <Group title="Section headings">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Features heading"
            value={x.features?.title ?? ''}
            onChange={(e) => set({ features: { ...x.features, title: e.target.value } })}
          />
          <TextField
            label="Pricing heading"
            value={x.pricing?.title ?? ''}
            onChange={(e) => set({ pricing: { title: e.target.value } })}
          />
          <TextField
            label="FAQ heading"
            value={x.faq?.title ?? ''}
            onChange={(e) => set({ faq: { title: e.target.value } })}
          />
        </div>
      </Group>

      <Group title="How it works">
        <TextField
          label="Heading"
          value={x.steps.title}
          onChange={(e) => set({ steps: { ...x.steps, title: e.target.value } })}
        />
        {(x.steps.items as Item[]).map((it, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <TextField
              label={`Step ${i + 1}`}
              value={it.title}
              onChange={(e) =>
                set({
                  steps: {
                    ...x.steps,
                    items: x.steps.items.map((s, j) =>
                      j === i ? { ...s, title: e.target.value } : s,
                    ),
                  },
                })
              }
            />
            <TextField
              label="Description"
              value={it.description}
              onChange={(e) =>
                set({
                  steps: {
                    ...x.steps,
                    items: x.steps.items.map((s, j) =>
                      j === i ? { ...s, description: e.target.value } : s,
                    ),
                  },
                })
              }
            />
            <Button
              variant="outline"
              disabled={x.steps.items.length <= 1}
              onClick={() =>
                set({ steps: { ...x.steps, items: x.steps.items.filter((_, j) => j !== i) } })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            set({
              steps: { ...x.steps, items: [...x.steps.items, { title: '', description: '' }] },
            })
          }
        >
          + Add step
        </Button>
      </Group>

      <Group title="Closing call-to-action">
        <TextField
          label="Heading"
          value={cta.title}
          onChange={(e) => set({ cta: { ...cta, title: e.target.value } })}
        />
        <TextField
          label="Text"
          value={cta.description ?? ''}
          onChange={(e) => set({ cta: { ...cta, description: e.target.value } })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Button label"
            value={cta.cta.label}
            onChange={(e) => set({ cta: { ...cta, cta: { ...cta.cta, label: e.target.value } } })}
          />
          <TextField
            label="Button link"
            value={cta.cta.href}
            onChange={(e) => set({ cta: { ...cta, cta: { ...cta.cta, href: e.target.value } } })}
          />
        </div>
      </Group>

      <Group title="Footer links">
        {(x.footer.columns as Column[]).map((c, i) => (
          <div key={i} className="space-y-3 rounded-xl bg-canvas p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TextField
                  label="Column title"
                  value={c.title}
                  onChange={(e) =>
                    set({
                      footer: {
                        columns: x.footer.columns.map((k, j) =>
                          j === i ? { ...k, title: e.target.value } : k,
                        ),
                      },
                    })
                  }
                />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  set({ footer: { columns: x.footer.columns.filter((_, j) => j !== i) } })
                }
              >
                Remove column
              </Button>
            </div>
            <Links
              links={c.links}
              onChange={(links) =>
                set({
                  footer: {
                    columns: x.footer.columns.map((k, j) => (j === i ? { ...k, links } : k)),
                  },
                })
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            set({ footer: { columns: [...x.footer.columns, { title: '', links: [] }] } })
          }
        >
          + Add column
        </Button>
      </Group>

      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled={!local} onClick={() => setLocal(null)}>
          Discard changes
        </Button>
        <Button disabled={!local} loading={busy} onClick={save}>
          Save structure
        </Button>
      </div>
    </div>
  );
}
