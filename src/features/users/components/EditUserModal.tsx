'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api-client';
import type { AppUser } from '@/types/users';
import { editUserBody } from '../schemas/users';

/** Edit User drawer. Only name and phone are editable; email is the sign-in identity. */
export function EditUserModal({
  user,
  onClose,
  onDone,
}: {
  user: AppUser | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Modal
      open={!!user}
      variant="drawer"
      title="Edit user"
      subtitle={user?.email}
      onClose={onClose}
    >
      {user && <Form key={user.id} user={user} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function Form({
  user,
  onClose,
  onDone,
}: {
  user: AppUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [v, setV] = useState({ name: user.name, phone: user.phone });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const parsed = editUserBody.safeParse(v);
  const field = (k: 'name' | 'phone') =>
    !parsed.success ? parsed.error.issues.find((i) => i.path[0] === k)?.message : undefined;
  const changed = v.name !== user.name || v.phone !== user.phone;

  async function save() {
    if (!parsed.success) return;
    setBusy(true);
    try {
      await api(`/api/users/${user.id}`, { method: 'PUT', body: parsed.data });
      toast('User updated');
      onClose();
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex h-full flex-col gap-5">
      <TextField
        label="Full name"
        placeholder="e.g. Priya Sharma"
        autoComplete="off"
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        error={field('name')}
      />
      <TextField
        label="Email"
        value={user.email}
        readOnly
        disabled
        placeholder="—"
        hint="The sign-in email can’t be changed here."
      />
      <TextField
        label="Phone"
        type="tel"
        placeholder="+91 98765 43210"
        value={v.phone}
        onChange={(e) => setV({ ...v, phone: e.target.value })}
        error={field('phone')}
      />
      {err && (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {err}
        </p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button loading={busy} disabled={!parsed.success || !changed} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
