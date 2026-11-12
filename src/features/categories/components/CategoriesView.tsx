'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Reveal } from '@/components/motion/reveal';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextArea, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PillTabs } from '@/components/ui/PillTabs';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryColor,
  type CategoryIcon,
  type CategoryKind,
} from '@/types/admin';
import { categoryBody } from '../schemas/categories';

const TILE: Record<CategoryColor, string> = {
  cyan: 'bg-cyan-soft text-cyan-deep',
  blue: 'bg-brand-soft text-link',
  rose: 'bg-bad-soft text-bad',
  green: 'bg-ok-soft text-ok',
  violet: 'bg-violet-soft text-violet',
  amber: 'bg-warn-soft text-warn',
  slate: 'bg-line-soft text-ink-2',
};
const SWATCH: Record<CategoryColor, string> = {
  cyan: 'bg-cyan',
  blue: 'bg-brand',
  rose: 'bg-bad',
  green: 'bg-ok',
  violet: 'bg-violet',
  amber: 'bg-warn',
  slate: 'bg-muted',
};
const blank = {
  name: '',
  kind: 'expense' as CategoryKind,
  icon: 'tag' as CategoryIcon,
  color: 'cyan' as CategoryColor,
  description: '',
  enabled: true,
};
type Form = typeof blank;

export function CategoriesView() {
  const { toast } = useToast();
  const { data, error, loading, reload } = useApi<Category[]>('/api/categories');
  const [filter, setFilter] = useState<'all' | CategoryKind>('all');
  const [toggle, setToggle] = useState<Category | null>(null);
  const [drawer, setDrawer] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [del, setDel] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const parsed = categoryBody.safeParse(form);
  const nameErr =
    form.name && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === 'name')?.message
      : undefined;
  const run = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      done();
      setFormErr('');
      reload();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Action failed';
      setFormErr(m);
      toast(m);
    } finally {
      setBusy(false);
    }
  };
  const openNew = () => {
    setForm({ ...blank, kind: filter === 'income' ? 'income' : 'expense' });
    setFormErr('');
    setDrawer({});
  };
  const openEdit = (c: Category) => {
    setForm({
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      description: c.description,
      enabled: c.enabled,
    });
    setFormErr('');
    setDrawer({ id: c.id });
  };
  const menu = (c: Category): MenuAction[] => [
    { label: 'Edit category', icon: 'edit', onSelect: () => openEdit(c) },
    ...(!c.builtin && c.users === 0
      ? [{ label: 'Delete', icon: 'trash' as const, danger: true, onSelect: () => setDel(c) }]
      : []),
  ];
  const enabling = toggle ? !toggle.enabled : false;
  const list = (data ?? []).filter((c) => filter === 'all' || c.kind === filter);
  const count = (k: CategoryKind) => data?.filter((c) => c.kind === k).length;
  const editing = drawer?.id ? data?.find((c) => c.id === drawer.id) : undefined;
  const kindLocked = !!editing && editing.users > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Default categories</h1>
          <p className="mt-1 text-sm text-muted">
            The starter set every new user gets
            {data && ` · ${data.filter((c) => c.enabled).length} of ${data.length} enabled`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Add new category
        </Button>
      </header>
      <PillTabs
        aria-label="Category type"
        value={filter}
        onChange={setFilter}
        tabs={
          [
            { value: 'all', label: 'All', count: data?.length },
            { value: 'expense', label: 'Expense', count: count('expense') },
            { value: 'income', label: 'Income', count: count('income') },
          ] as const
        }
      />
      {error && !data && (
        <p role="alert" className="rounded-xl bg-bad-soft p-4 text-sm text-bad">
          {error}{' '}
          <button className="font-semibold underline" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-[24px]" />
          ))}
        </div>
      ) : (
        <Reveal
          key={filter}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {list.map((c) => (
            <Card
              key={c.id}
              className={cn(
                'flex flex-col gap-4 p-5 transition-opacity',
                !c.enabled && 'opacity-75',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  aria-hidden
                  className={cn('grid size-12 place-items-center rounded-[14px]', TILE[c.color])}
                >
                  <Icon name={c.icon} size={22} />
                </span>
                <ActionMenu label={`Actions for ${c.name}`} actions={menu(c)} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{c.name}</p>
                <p className="line-clamp-1 text-[13px] text-muted">{c.description || '—'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                {c.users.toLocaleString('en-IN')} users
                <Badge tone={c.kind === 'income' ? 'green' : 'blue'}>
                  {c.kind === 'income' ? 'Income' : 'Expense'}
                </Badge>
                {!c.builtin && <Badge tone="violet">Custom</Badge>}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-4">
                <span className="text-[13px] text-muted">
                  {c.enabled ? 'Shown to new users' : 'Hidden from new users'}
                </span>
                <Switch
                  size="sm"
                  aria-label={`${c.enabled ? 'Disable' : 'Enable'} ${c.name}`}
                  checked={c.enabled}
                  onChange={() => setToggle(c)}
                />
              </div>
            </Card>
          ))}
          {list.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
              No {filter} categories yet.
            </p>
          )}
        </Reveal>
      )}

      <Modal
        open={!!drawer}
        variant="drawer"
        busy={busy}
        title={drawer?.id ? 'Edit category' : 'Add new category'}
        subtitle="Appears in every new user's category list during onboarding."
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawer(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={!parsed.success}
              loading={busy}
              onClick={() =>
                run(
                  () =>
                    drawer?.id
                      ? api(`/api/categories/${drawer.id}`, { method: 'PUT', body: parsed.data })
                      : api('/api/categories', { body: parsed.data }),
                  drawer?.id ? 'Category updated' : 'Category created',
                  () => setDrawer(null),
                )
              }
            >
              {drawer?.id ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <TextField
          label="Category name"
          placeholder="e.g. Education"
          maxLength={30}
          autoComplete="off"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={nameErr}
        />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Category type</p>
          <SegmentedControl
            aria-label="Category type"
            variant="page"
            options={
              [
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ] as const
            }
            value={form.kind}
            onChange={(kind) => !kindLocked && setForm({ ...form, kind })}
          />
          {kindLocked && (
            <p className="text-[13px] text-muted">
              Type is locked because users already have transactions in this category.
            </p>
          )}
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Icon</legend>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
            {CATEGORY_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={i}
                aria-pressed={form.icon === i}
                onClick={() => setForm({ ...form, icon: i })}
                className={cn(
                  'grid aspect-square place-items-center rounded-[13px] border transition-colors',
                  form.icon === i
                    ? 'border-brand bg-brand-soft text-link'
                    : 'border-line-strong text-ink-2 hover:bg-canvas',
                )}
              >
                <Icon name={i} size={20} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Colour</legend>
          <div className="flex flex-wrap gap-3">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={form.color === c}
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  'grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-surface transition',
                  SWATCH[c],
                  form.color === c ? 'ring-2 ring-ink' : 'hover:scale-105',
                )}
              >
                {form.color === c && (
                  <Icon name="check" size={18} strokeWidth={3} className="text-white" />
                )}
              </button>
            ))}
          </div>
        </fieldset>
        <TextArea
          label={`Description (optional) · ${form.description.length}/80`}
          rows={2}
          maxLength={80}
          placeholder="What kind of spending or income belongs here?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="flex items-center justify-between rounded-2xl bg-canvas p-4">
          <div>
            <p className="font-semibold">Active</p>
            <p className="text-[13px] text-muted">Show to new users right away</p>
          </div>
          <Switch
            aria-label="Active"
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line p-4">
          <span
            aria-hidden
            className={cn('grid size-12 place-items-center rounded-[14px]', TILE[form.color])}
          >
            <Icon name={form.icon} size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Preview</p>
            <p className="truncate font-display font-bold">{form.name.trim() || 'Category name'}</p>
            <p className="truncate text-[13px] text-muted">
              {form.description || (form.kind === 'income' ? 'Income' : 'Expense')}
            </p>
          </div>
        </div>
        {formErr && (
          <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {formErr}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toggle}
        title={enabling ? 'Enable this category?' : 'Disable this category?'}
        tone={enabling ? 'primary' : 'danger'}
        confirmLabel={enabling ? 'Enable category' : 'Disable category'}
        loading={busy}
        onConfirm={() =>
          run(
            () =>
              api(`/api/categories/${toggle!.id}`, {
                method: 'PATCH',
                body: { enabled: !toggle!.enabled },
              }),
            `${toggle!.name} ${toggle!.enabled ? 'disabled' : 'enabled'}`,
            () => setToggle(null),
          )
        }
        onCancel={() => setToggle(null)}
        body={
          enabling ? (
            <>
              <b>{toggle?.name}</b> will appear for new users during onboarding and in
              everyone&apos;s category picker.
            </>
          ) : (
            <>
              New users won&apos;t see <b>{toggle?.name}</b> during onboarding.{' '}
              {toggle?.users.toLocaleString('en-IN')} users already use it; their existing
              transactions and budgets keep it.
            </>
          )
        }
      />
      <ConfirmDialog
        open={!!del}
        title="Delete category?"
        confirmLabel="Delete category"
        loading={busy}
        body={`“${del?.name}” isn't used by anyone and will be removed from the default set.`}
        onCancel={() => setDel(null)}
        onConfirm={() =>
          run(
            () => api(`/api/categories/${del!.id}`, { method: 'DELETE' }),
            'Category deleted',
            () => setDel(null),
          )
        }
      />
    </div>
  );
}
