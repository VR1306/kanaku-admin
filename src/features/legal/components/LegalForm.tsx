'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { SubHeading } from '@/features/cms/components/ListRow';
import {
  LEGAL_LABEL,
  LEGAL_SLUGS,
  type LegalContent,
  type LegalSlug,
  type LegalState,
} from '@/types/legal';
import { move, uid } from '@/utils/list';
import { legalContentSchema } from '../schemas/legal';
import { blocksToText, textToBlocks } from '../text';

interface EditSection {
  key: string;
  id: string;
  title: string;
  text: string;
}
interface Edit {
  title: string;
  summary: string;
  sections: EditSection[];
}

const toEdit = (c: LegalContent): Edit => ({
  title: c.title,
  summary: c.summary,
  sections: c.sections.map((s) => ({
    key: s.id,
    id: s.id,
    title: s.title,
    text: blocksToText(s.blocks),
  })),
});
const toContent = (e: Edit): LegalContent => ({
  title: e.title,
  summary: e.summary,
  sections: e.sections.map((s) => ({ id: s.id, title: s.title, blocks: textToBlocks(s.text) })),
});
const slugify = (t: string, taken: string[]) => {
  const base =
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'section';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
};

/** Privacy Policy and Terms & Conditions. Published versions are what the User App and the website show. */
export function LegalForm() {
  const { toast } = useToast();
  const { data, error, loading, reload } = useApi<LegalState[]>('/api/legal');
  const [slug, setSlug] = useState<LegalSlug>('privacy');
  const [local, setLocal] = useState<Partial<Record<LegalSlug, Edit>>>({});
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Skeleton className="h-96 rounded-[24px]" />;
  const state = data?.find((s) => s.slug === slug);
  if (error || !state)
    return (
      <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
        {error ?? 'Could not load'}
      </p>
    );
  const edit = local[slug] ?? toEdit(state.draft);
  const dirty = !!local[slug];
  const content = toContent(edit);
  const parsed = legalContentSchema.safeParse(content);
  const problem = !parsed.success ? (parsed.error.issues[0]?.message ?? 'Invalid') : '';
  const set = (next: Edit) => setLocal({ ...local, [slug]: next });
  const setSection = (i: number, p: Partial<EditSection>) =>
    set({ ...edit, sections: edit.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      setLocal({ ...local, [slug]: undefined });
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }
  const save = () => api(`/api/legal/${slug}/draft`, { method: 'PUT', body: content });
  const publish = async () => {
    await save();
    await api(`/api/legal/${slug}/publish`, { body: {} });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Document"
          options={LEGAL_SLUGS.map((s) => ({ value: s, label: LEGAL_LABEL[s] }))}
          value={slug}
          onChange={setSlug}
        />
        <div className="flex flex-wrap items-center gap-2">
          {state.published ? (
            <Badge tone="green">
              Live · v{state.published.version} ·{' '}
              {new Date(state.published.publishedAt).toLocaleDateString('en-IN')}
            </Badge>
          ) : (
            <Badge tone="amber">Not published</Badge>
          )}
          {dirty ? (
            <Badge tone="amber">Unsaved changes</Badge>
          ) : state.draftDirty ? (
            <Badge tone="blue">Draft ahead of live</Badge>
          ) : null}
        </div>
      </div>
      <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        Shown on the website and in the app at <b>/{slug}</b>. The “Last updated” date is the
        publish date. Use a blank line between paragraphs and start a line with <b>- </b> for a
        bulleted list.
      </p>
      {problem && dirty && (
        <p
          role="alert"
          className="rounded-2xl bg-warn-soft px-5 py-3 text-sm font-semibold text-warn"
        >
          {problem}
        </p>
      )}

      <TextField
        label="Title"
        value={edit.title}
        maxLength={80}
        onChange={(e) => set({ ...edit, title: e.target.value })}
      />
      <TextArea
        label={`Summary · ${edit.summary.length}/300`}
        rows={2}
        maxLength={300}
        value={edit.summary}
        onChange={(e) => set({ ...edit, summary: e.target.value })}
      />

      <SubHeading
        title={`Sections (${edit.sections.length})`}
        hint="Numbered automatically on the page."
      />
      <div className="space-y-4">
        {edit.sections.map((s, i) => (
          <div key={s.key} className="space-y-3 rounded-2xl border border-line p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <TextField
                  label={`Section ${i + 1} title`}
                  value={s.title}
                  maxLength={100}
                  onChange={(e) => setSection(i, { title: e.target.value })}
                />
              </div>
              <Button
                variant="outline"
                disabled={i === 0}
                aria-label="Move up"
                onClick={() => set({ ...edit, sections: move(edit.sections, i, i - 1) })}
              >
                ↑
              </Button>
              <Button
                variant="outline"
                disabled={i === edit.sections.length - 1}
                aria-label="Move down"
                onClick={() => set({ ...edit, sections: move(edit.sections, i, i + 1) })}
              >
                ↓
              </Button>
              <Button
                variant="outline"
                disabled={edit.sections.length <= 1}
                onClick={() => set({ ...edit, sections: edit.sections.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
            <TextArea
              label="Text"
              rows={7}
              value={s.text}
              onChange={(e) => setSection(i, { text: e.target.value })}
            />
            <p className="text-xs text-muted">Link anchor: #{s.id}</p>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            set({
              ...edit,
              sections: [
                ...edit.sections,
                {
                  key: uid('s'),
                  id: slugify(
                    'new-section',
                    edit.sections.map((x) => x.id),
                  ),
                  title: '',
                  text: '',
                },
              ],
            })
          }
        >
          + Add section
        </Button>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          disabled={!dirty}
          onClick={() => setLocal({ ...local, [slug]: undefined })}
        >
          Discard changes
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || !!problem}
          loading={busy}
          onClick={() => run(save, 'Draft saved')}
        >
          Save draft
        </Button>
        <Button
          disabled={!!problem || (!dirty && !state.draftDirty && !!state.published)}
          loading={busy}
          onClick={() => run(publish, `${LEGAL_LABEL[slug]} published — website and app updated`)}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}
