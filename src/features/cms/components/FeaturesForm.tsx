'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { SortableList } from '@/components/ui/SortableList';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/utils/cn';
import { move, uid } from '@/utils/list';
import type { SiteConfig } from '@/types/cms';
import { FEATURE_ICONS, type FeatureIcon } from '../icons';
import { IconButton, ListRow, MoveButtons, SubHeading } from './ListRow';

type Feature = SiteConfig['features'][number];

export function FeaturesForm({
  features,
  onChange,
}: {
  features: Feature[];
  onChange: (f: Feature[]) => void;
}) {
  const [editing, setEditing] = useState<Feature | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [del, setDel] = useState<Feature | null>(null);
  const visible = features.filter((f) => f.visible).length;
  const commit = () => {
    if (!editing) return;
    onChange(
      isNew ? [...features, editing] : features.map((f) => (f.id === editing.id ? editing : f)),
    );
    setEditing(null);
  };
  // Never let the visible count fall below 3.
  const locked = (f: Feature) => f.visible && visible <= 3;
  const openNew = () => {
    setIsNew(true);
    setEditing({ id: uid('f'), icon: 'plus', title: '', description: '', visible: true });
  };

  return (
    <div className="space-y-5">
      <SubHeading
        title="Feature cards"
        hint={`${features.length} features · ${visible} visible · at least 3 must stay visible`}
        action={
          <Button className="h-10" onClick={openNew}>
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Add feature
          </Button>
        }
      />
      <SortableList
        className="space-y-3"
        items={features}
        keyOf={(f) => f.id}
        onReorder={(a, b) => onChange(move(features, a, b))}
        render={(f, i) => (
          <ListRow
            muted={!f.visible}
            controls={
              <>
                <MoveButtons
                  onUp={() => onChange(move(features, i, i - 1))}
                  onDown={() => onChange(move(features, i, i + 1))}
                  disabledUp={i === 0}
                  disabledDown={i === features.length - 1}
                />
                <Switch
                  size="sm"
                  aria-label={`${f.visible ? 'Hide' : 'Show'} ${f.title}`}
                  checked={f.visible}
                  disabled={locked(f)}
                  onChange={(v) =>
                    onChange(features.map((x) => (x.id === f.id ? { ...x, visible: v } : x)))
                  }
                />
                <IconButton
                  label={`Edit ${f.title}`}
                  onClick={() => {
                    setIsNew(false);
                    setEditing(f);
                  }}
                >
                  <Icon name="edit" size={16} />
                </IconButton>
                <IconButton
                  label={`Delete ${f.title}`}
                  danger
                  disabled={locked(f)}
                  onClick={() => setDel(f)}
                >
                  <Icon name="trash" size={16} />
                </IconButton>
              </>
            }
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-brand-soft text-lg text-link"
              >
                {FEATURE_ICONS[f.icon]}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{f.title}</p>
                <p className="truncate text-[13px] text-muted">{f.description}</p>
              </div>
            </div>
          </ListRow>
        )}
      />
      <Modal
        open={!!editing}
        variant="drawer"
        title={isNew ? 'Add feature' : 'Edit feature'}
        subtitle="Shown as a card in the Features section."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.title.trim() || !editing?.description.trim()}
              onClick={commit}
            >
              Save feature
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Icon</legend>
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(FEATURE_ICONS) as FeatureIcon[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k}
                    aria-pressed={editing.icon === k}
                    onClick={() => setEditing({ ...editing, icon: k })}
                    className={cn(
                      'grid size-12 place-items-center rounded-[14px] border text-xl transition-colors',
                      editing.icon === k
                        ? 'border-brand bg-brand-soft text-link'
                        : 'border-line-strong text-ink-2 hover:bg-canvas',
                    )}
                  >
                    {FEATURE_ICONS[k]}
                  </button>
                ))}
              </div>
            </fieldset>
            <TextField
              label={`Title · ${editing.title.length}/40`}
              placeholder="e.g. Record in seconds"
              maxLength={40}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <TextArea
              label={`Description · ${editing.description.length}/140`}
              rows={3}
              placeholder="One sentence on what it does"
              maxLength={140}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <div className="flex items-center justify-between rounded-2xl bg-canvas p-4">
              <div>
                <p className="font-semibold">Visible on the landing page</p>
                <p className="text-[13px] text-muted">Hidden cards stay saved but aren’t shown.</p>
              </div>
              <Switch
                aria-label="Visible"
                checked={editing.visible}
                disabled={
                  !isNew &&
                  features.find((x) => x.id === editing.id)?.visible === true &&
                  visible <= 3
                }
                onChange={(v) => setEditing({ ...editing, visible: v })}
              />
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!del}
        title="Delete this feature?"
        confirmLabel="Delete feature"
        body={
          <>
            &ldquo;{del?.title}&rdquo; will be removed from the landing page when you next publish.
          </>
        }
        onCancel={() => setDel(null)}
        onConfirm={() => {
          onChange(features.filter((f) => f.id !== del!.id));
          setDel(null);
        }}
      />
    </div>
  );
}
