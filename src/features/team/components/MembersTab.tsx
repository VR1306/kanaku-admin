'use client';

import { useState } from 'react';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Identity, type Column } from '@/components/ui/DataTable';
import { SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import type { Member, RoleRow } from '@/types/team';
import { inviteMember } from '../schemas/team';

type Action = { kind: 'role' | 'mfa' | 'remove'; m: Member };
const blank = { name: '', email: '', role: 'chat_support', accessExpires: '' };

export function MembersTab({
  isSuper,
  add,
  onAddChange,
}: {
  isSuper: boolean;
  add: boolean;
  onAddChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const members = useApi<Member[]>('/api/team/members');
  const roles = useApi<RoleRow[]>('/api/team/roles');
  const [f, setF] = useState(blank);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [act, setAct] = useState<Action | null>(null);
  const [newRole, setNewRole] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const roleOptions = (roles.data ?? [])
    .filter((r) => isSuper || r.id !== 'super_admin')
    .map((r) => ({ value: r.id, label: r.name }));
  const parsed = inviteMember.safeParse({ ...f, accessExpires: f.accessExpires || undefined });
  const fieldErr = (k: string) =>
    (f.name || f.email) && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === k)?.message
      : undefined;

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
      members.reload();
      roles.reload();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Action failed';
      setErr(m);
      toast(m);
    } finally {
      setBusy(false);
    }
  };

  const menu = (m: Member): MenuAction[] => [
    {
      label: 'Change role',
      icon: 'team',
      onSelect: () => {
        setNewRole(m.role);
        setAct({ kind: 'role', m });
      },
    },
    m.status === 'invited'
      ? {
          label: 'Resend invitation',
          icon: 'mail',
          onSelect: () =>
            run(async () => {
              const r = await api<{ inviteLink: string }>(`/api/team/members/${m.id}/resend`, {
                body: {},
              });
              setLink({ email: m.email, url: r.inviteLink });
            }),
        }
      : { label: 'Reset MFA', icon: 'lock', onSelect: () => setAct({ kind: 'mfa', m }) },
    {
      label: 'Remove from team',
      icon: 'trash',
      danger: true,
      onSelect: () => setAct({ kind: 'remove', m }),
    },
  ];

  const columns: Column<Member>[] = [
    { key: 'm', header: 'Member', render: (m) => <Identity name={m.name} sub={m.email} /> },
    { key: 'r', header: 'Role', render: (m) => <Badge tone="blue">{m.roleLabel}</Badge> },
    {
      key: 's',
      header: 'Status',
      render: (m) => (
        <Badge tone={m.status === 'active' ? 'green' : 'amber'}>
          {m.status === 'active' ? 'Active' : 'Invited'}
        </Badge>
      ),
    },
    {
      key: 'l',
      header: 'Last active',
      className: 'hidden md:table-cell',
      render: (m) => (
        <span className="text-muted">
          {m.status === 'invited'
            ? 'Invite expires in 3 days'
            : m.lastActive
              ? new Date(m.lastActive).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '—'}
        </span>
      ),
    },
    {
      key: 'x',
      header: 'Security',
      className: 'hidden lg:table-cell',
      render: (m) =>
        m.mfa ? <Badge tone="green">MFA on</Badge> : <Badge tone="amber">Set-up pending</Badge>,
    },
    {
      key: 'a',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <div className="flex justify-end">
          <ActionMenu label={`Actions for ${m.name}`} actions={menu(m)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        <DataTable
          caption="Team members"
          loading={members.loading}
          refreshing={members.refreshing}
          error={members.error}
          onRetry={members.reload}
          columns={columns}
          rows={members.data ?? []}
          rowKey={(m) => m.id}
          emptyTitle="No team members"
        />
      </Card>

      <Modal
        open={add}
        variant="drawer"
        busy={busy}
        title="Add team member"
        subtitle="They get a single-use link (valid 72 hours) to set a password and two-step verification."
        onClose={() => onAddChange(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => onAddChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={!parsed.success}
              loading={busy}
              onClick={() =>
                run(async () => {
                  const r = await api<{ inviteLink: string; email: string }>('/api/team/members', {
                    body: { ...f, accessExpires: f.accessExpires || undefined },
                  });
                  onAddChange(false);
                  setLink({ email: r.email, url: r.inviteLink });
                  setF(blank);
                })
              }
            >
              Send invite
            </Button>
          </>
        }
      >
        <TextField
          label="Full name"
          placeholder="e.g. Kavya Menon"
          autoComplete="off"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          error={fieldErr('name')}
        />
        <TextField
          label="Work email"
          type="email"
          placeholder="name@kanaku.com"
          autoComplete="off"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          error={fieldErr('email')}
          hint="Any email address works."
        />
        <SelectField
          label="Role"
          value={f.role}
          onChange={(e) => setF({ ...f, role: e.target.value })}
          options={roleOptions}
          hint={isSuper ? undefined : 'Only a Super Admin can grant the Super Admin role.'}
        />
        <TextField
          label="Access expires (optional)"
          type="date"
          placeholder="dd/mm/yyyy"
          value={f.accessExpires}
          onChange={(e) => setF({ ...f, accessExpires: e.target.value })}
          hint="For contractors — access ends automatically on this date."
        />
        {err && (
          <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {err}
          </p>
        )}
      </Modal>

      <Modal
        open={!!link}
        variant="drawer"
        title="Invitation sent"
        subtitle="The invitation is emailed to the member. No password is ever emailed."
        onClose={() => setLink(null)}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                navigator.clipboard?.writeText(link!.url).then(() => toast('Invite link copied'))
              }
            >
              Copy link
            </Button>
            <Button onClick={() => setLink(null)}>Done</Button>
          </>
        }
      >
        <div className="space-y-3 rounded-2xl border border-line p-5 text-sm">
          <p className="text-xs text-muted">
            To: {link?.email} · Subject: You&apos;ve been invited to the Kanaku admin console
          </p>
          <p>
            Sign in with the single-use link below, choose a password and set up two-step
            verification. It expires in 72 hours.
          </p>
          <p className="rounded-xl bg-canvas p-3 font-mono text-xs break-all">{link?.url}</p>
        </div>
      </Modal>

      <Modal
        open={act?.kind === 'role'}
        variant="drawer"
        busy={busy}
        title="Change role"
        subtitle={act ? `${act.m.name} · ${act.m.email}` : undefined}
        onClose={() => setAct(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setAct(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={newRole === act?.m.role}
              onClick={() =>
                run(async () => {
                  await api(`/api/team/members/${act!.m.id}`, {
                    method: 'PATCH',
                    body: { role: newRole },
                  });
                  toast('Role updated — applies on their next request');
                  setAct(null);
                })
              }
            >
              Save role
            </Button>
          </>
        }
      >
        <SelectField
          label="Role"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          options={roleOptions}
        />
        <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
          Permission changes take effect on the member&apos;s next request and are recorded in the
          audit log.
        </p>
        {err && (
          <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {err}
          </p>
        )}
      </Modal>
      <ConfirmDialog
        open={act?.kind === 'mfa'}
        title="Reset MFA?"
        confirmLabel="Reset MFA"
        loading={busy}
        body={`${act?.m.name} will be signed out everywhere and must set up two-step verification again at next sign-in.`}
        onCancel={() => setAct(null)}
        onConfirm={() =>
          run(async () => {
            await api(`/api/team/members/${act!.m.id}/reset-mfa`, { body: {} });
            toast('MFA reset');
            setAct(null);
          })
        }
      />
      <ConfirmDialog
        open={act?.kind === 'remove'}
        title="Remove from team?"
        confirmLabel="Remove member"
        loading={busy}
        body={`${act?.m.name} will lose access immediately. This is recorded in the audit log.`}
        onCancel={() => setAct(null)}
        onConfirm={() =>
          run(async () => {
            await api(`/api/team/members/${act!.m.id}`, { method: 'DELETE' });
            toast('Member removed');
            setAct(null);
          })
        }
      />
    </div>
  );
}
