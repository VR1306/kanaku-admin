'use client';

import { Fragment, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import type { Permission } from '@/types/auth';
import type { RoleRow } from '@/types/team';

export function RolesTab({
  create,
  onCreateChange,
}: {
  create: boolean;
  onCreateChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data, error, reload } = useApi<RoleRow[]>('/api/team/roles');
  // edits: roleId -> permission set (only roles that were changed)
  const [edits, setEdits] = useState<Record<string, Permission[]>>({});
  const [confirm, setConfirm] = useState(false);
  const [nr, setNr] = useState({ name: '', cloneFrom: '' });
  const [del, setDel] = useState<RoleRow | null>(null);
  const [busy, setBusy] = useState(false);

  const roles = data ?? [];
  const perms = (r: RoleRow) => edits[r.id] ?? r.permissions;
  const toggle = (r: RoleRow, p: Permission) => {
    const cur = perms(r);
    const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
    const same =
      next.length === r.permissions.length && next.every((x) => r.permissions.includes(x));
    setEdits((e) => {
      const c = { ...e };
      if (same) delete c[r.id];
      else c[r.id] = next;
      return c;
    });
  };
  const changes = roles
    .filter((r) => edits[r.id])
    .map((r) => ({
      r,
      add: edits[r.id].filter((p) => !r.permissions.includes(p)),
      rem: r.permissions.filter((p) => !edits[r.id].includes(p)),
    }));
  const label = (p: Permission) =>
    PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.key === p)?.label ?? p;
  const affected = changes.reduce((n, c) => n + c.r.members, 0);

  const run = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      done();
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(
      async () => {
        for (const c of changes)
          await api(`/api/team/roles/${c.r.id}`, {
            method: 'PUT',
            body: { permissions: edits[c.r.id] },
          });
      },
      'Permissions saved — effective on each member’s next request',
      () => {
        setEdits({});
        setConfirm(false);
      },
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Tick what each role can do. Menu items and API routes follow these settings. Super Admin
          always keeps full access.
        </p>
        <div className="flex gap-3">
          <Button disabled={changes.length === 0} onClick={() => setConfirm(true)}>
            Save changes{changes.length > 0 && ` (${changes.length})`}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
          {error}
        </p>
      )}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse text-[15px]">
          <caption className="sr-only">Role permissions matrix</caption>
          <thead>
            <tr className="bg-canvas">
              <th
                scope="col"
                className="px-7 py-4 text-left text-xs font-bold tracking-[0.08em] text-muted uppercase"
              >
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r.id}
                  scope="col"
                  className="px-3 py-4 text-center text-xs font-bold tracking-[0.08em] whitespace-nowrap text-muted uppercase"
                >
                  {r.name}
                  {!r.builtin && (
                    <button
                      className="ml-1.5 rounded text-bad hover:bg-bad-soft"
                      aria-label={`Delete ${r.name}`}
                      onClick={() => setDel(r)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <Fragment key={g.group}>
                <tr className="border-t border-line-soft bg-canvas/60">
                  <td
                    colSpan={roles.length + 1}
                    className="px-7 py-2.5 text-xs font-bold tracking-[0.08em] text-ink-2 uppercase"
                  >
                    {g.group}
                  </td>
                </tr>
                {g.items.map((it) => (
                  <tr
                    key={it.key}
                    className="border-t border-line-soft transition-colors hover:bg-canvas/50"
                  >
                    <td className="px-7 py-3">{it.label}</td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${r.name}: ${it.label}`}
                          checked={r.id === 'super_admin' || perms(r).includes(it.key)}
                          disabled={r.id === 'super_admin'}
                          onChange={() => toggle(r, it.key)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={confirm}
        title="Save permission changes?"
        busy={busy}
        onClose={() => setConfirm(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>
              Cancel
            </Button>
            <Button loading={busy} onClick={save}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-1.5 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
          {changes.map((c) => (
            <p key={c.r.id}>
              <b>{c.r.name}</b>
              {c.add.length > 0 && <> will gain: {c.add.map(label).join(', ')}.</>}
              {c.rem.length > 0 && <> will lose: {c.rem.map(label).join(', ')}.</>}
            </p>
          ))}
        </div>
        <p className="text-sm text-muted">
          Changes apply to {affected} member{affected === 1 ? '' : 's'} at their next action. This
          is recorded in the audit log.
        </p>
      </Modal>
      <Modal
        open={create}
        variant="drawer"
        busy={busy}
        title="Create role"
        subtitle="Start blank or clone an existing role, then fine-tune the matrix."
        onClose={() => onCreateChange(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => onCreateChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={nr.name.trim().length < 2}
              loading={busy}
              onClick={() =>
                run(
                  () =>
                    api('/api/team/roles', {
                      body: { name: nr.name, cloneFrom: nr.cloneFrom || undefined },
                    }),
                  'Role created',
                  () => {
                    onCreateChange(false);
                    setNr({ name: '', cloneFrom: '' });
                  },
                )
              }
            >
              Create role
            </Button>
          </>
        }
      >
        <TextField
          label="Role name"
          placeholder="e.g. Finance reviewer"
          autoComplete="off"
          value={nr.name}
          onChange={(e) => setNr({ ...nr, name: e.target.value })}
        />
        <SelectField
          label="Start from"
          value={nr.cloneFrom}
          onChange={(e) => setNr({ ...nr, cloneFrom: e.target.value })}
          options={[
            { value: '', label: 'Blank (no permissions)' },
            ...roles
              .filter((r) => r.id !== 'super_admin')
              .map((r) => ({ value: r.id, label: `Clone ${r.name}` })),
          ]}
        />
      </Modal>
      <ConfirmDialog
        open={!!del}
        title="Delete role?"
        confirmLabel="Delete role"
        loading={busy}
        body={`${del?.name} will be removed. Roles that still have members can't be deleted.`}
        onCancel={() => setDel(null)}
        onConfirm={() =>
          run(
            () => api(`/api/team/roles/${del!.id}`, { method: 'DELETE' }),
            'Role deleted',
            () => setDel(null),
          )
        }
      />
    </div>
  );
}
