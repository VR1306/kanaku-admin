'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { SortableList } from '@/components/ui/SortableList';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/utils/cn';
import { move, uid } from '@/utils/list';
import type { SiteConfig } from '@/types/cms';
import { RichText } from '../rich';
import { FAQ_CATEGORIES } from '../schemas/site';
import { IconButton, ListRow, MoveButtons, SubHeading } from './ListRow';
import { RichToolbar } from './RichToolbar';

type Faq = SiteConfig['faq'][number];
const CATS = FAQ_CATEGORIES.map((c) => ({ value: c, label: c }));
const TONE: Record<Faq['category'], Tone> = {
  General: 'blue',
  Billing: 'amber',
  Security: 'violet',
  'Data & privacy': 'cyan',
  Account: 'gray',
};

export function FaqForm({ faq, onChange }: { faq: Faq[]; onChange: (f: Faq[]) => void }) {
  const [cat, setCat] = useState('all');
  const [editing, setEditing] = useState<Faq | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [del, setDel] = useState<Faq | null>(null);
  const rows = faq.filter((f) => cat === 'all' || f.category === cat);

  // Reorder within the same category only.
  const shift = (f: Faq, dir: -1 | 1) => {
    const same = faq.filter((x) => x.category === f.category);
    const target = same[same.indexOf(f) + dir];
    if (target) onChange(move(faq, faq.indexOf(f), faq.indexOf(target)));
  };
  const commit = () => {
    if (!editing) return;
    onChange(isNew ? [...faq, editing] : faq.map((f) => (f.id === editing.id ? editing : f)));
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <SubHeading
        title="Frequently asked questions"
        hint={`${faq.length} questions · tag each one so visitors can filter`}
        action={
          <Button
            className="h-10"
            onClick={() => {
              setIsNew(true);
              setEditing({
                id: uid('q'),
                question: '',
                answer: '',
                category: 'General',
                visible: true,
              });
            }}
          >
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Add FAQ
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
        {['all', ...FAQ_CATEGORIES].map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={cn(
              'h-9 rounded-full border px-4 text-sm font-semibold transition-colors',
              cat === c
                ? 'border-brand bg-brand text-white'
                : 'border-line-strong bg-surface text-ink-2 hover:bg-canvas',
            )}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">
          No questions in this category yet.
        </p>
      )}
      <SortableList
        className="space-y-3"
        items={rows}
        keyOf={(f) => f.id}
        onReorder={(a, b) => {
          if (rows[a].category === rows[b].category)
            onChange(move(faq, faq.indexOf(rows[a]), faq.indexOf(rows[b])));
        }}
        render={(f) => (
          <ListRow
            muted={!f.visible}
            controls={
              <>
                <MoveButtons onUp={() => shift(f, -1)} onDown={() => shift(f, 1)} />
                <Switch
                  size="sm"
                  aria-label={`${f.visible ? 'Hide' : 'Show'} ${f.question}`}
                  checked={f.visible}
                  onChange={(v) =>
                    onChange(faq.map((x) => (x.id === f.id ? { ...x, visible: v } : x)))
                  }
                />
                <IconButton
                  label={`Edit ${f.question}`}
                  onClick={() => {
                    setIsNew(false);
                    setEditing(f);
                  }}
                >
                  <Icon name="edit" size={16} />
                </IconButton>
                <IconButton label={`Delete ${f.question}`} danger onClick={() => setDel(f)}>
                  <Icon name="trash" size={16} />
                </IconButton>
              </>
            }
          >
            <p className="truncate font-semibold">{f.question}</p>
            <div className="mt-1">
              <Badge tone={TONE[f.category]}>{f.category}</Badge>
            </div>
          </ListRow>
        )}
      />
      <Modal
        open={!!editing}
        variant="drawer"
        width="lg"
        title={isNew ? 'Add FAQ' : 'Edit FAQ'}
        subtitle="Answers support bold, links and bullet lists."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.question.trim() || !editing?.answer.trim()}
              onClick={commit}
            >
              Save FAQ
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <TextField
              label={`Question · ${editing.question.length}/120`}
              placeholder="e.g. Is my data safe?"
              maxLength={120}
              value={editing.question}
              onChange={(e) => setEditing({ ...editing, question: e.target.value })}
            />
            <div className="space-y-3">
              <RichToolbar
                target="ans"
                value={editing.answer}
                onChange={(answer) => setEditing({ ...editing, answer })}
              />
              <TextArea
                id="ans"
                label={`Answer · ${editing.answer.length}/800`}
                maxLength={800}
                rows={6}
                placeholder="Write a short, clear answer."
                value={editing.answer}
                onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
              />
              <div className="rounded-2xl bg-canvas p-4 text-sm">
                <p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  Preview
                </p>
                <div className="space-y-1.5">
                  <RichText text={editing.answer || 'Your formatted answer appears here.'} />
                </div>
              </div>
            </div>
            <SelectField
              label="Category tag"
              value={editing.category}
              onChange={(e) =>
                setEditing({ ...editing, category: e.target.value as Faq['category'] })
              }
              options={CATS}
            />
            <div className="flex items-center justify-between rounded-2xl bg-canvas p-4">
              <div>
                <p className="font-semibold">Visible on the website</p>
              </div>
              <Switch
                aria-label="Visible"
                checked={editing.visible}
                onChange={(v) => setEditing({ ...editing, visible: v })}
              />
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!del}
        title="Delete this FAQ?"
        confirmLabel="Delete FAQ"
        body={
          <>&ldquo;{del?.question}&rdquo; will be removed from the website when you next publish.</>
        }
        onCancel={() => setDel(null)}
        onConfirm={() => {
          onChange(faq.filter((f) => f.id !== del!.id));
          setDel(null);
        }}
      />
    </div>
  );
}
