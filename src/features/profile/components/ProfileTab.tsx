'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { profileBody } from '../schemas/profile';
import type { ProfileData } from '../types';
import { AvatarCropper } from './AvatarCropper';
import { SectionShell } from './SectionShell';

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export function ProfileTab({ data, onSaved }: { data: ProfileData; onSaved: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({ name: data.name, phone: data.phone });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const parsed = profileBody.safeParse(v);
  const err = (k: 'name' | 'phone') =>
    !parsed.success ? parsed.error.issues.find((i) => i.path[0] === k)?.message : undefined;

  const refresh = () => {
    onSaved();
    router.refresh();
  }; // the sidebar shows the name + photo

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) return;
    setSaving(true);
    setStatus(null);
    try {
      await api('/api/profile', { method: 'PUT', body: parsed.data });
      setStatus({ tone: 'success', text: 'Saved' });
      refresh();
    } catch (x) {
      setStatus({ tone: 'danger', text: x instanceof ApiError ? x.message : 'Couldn’t save.' });
    } finally {
      setSaving(false);
    }
  }
  function pick(f?: File) {
    if (file.current) file.current.value = '';
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type))
      return setStatus({ tone: 'danger', text: 'Choose a PNG, JPG or WebP image.' });
    setStatus(null);
    setCropFile(f);
  }
  async function savePhoto(dataUrl: string) {
    await api('/api/profile/avatar', { body: { dataUrl } });
    refresh();
  }
  async function drop() {
    setPhotoBusy(true);
    try {
      await api('/api/profile/avatar', { method: 'DELETE' });
      refresh();
    } catch {
      setStatus({ tone: 'danger', text: 'Couldn’t remove the photo.' });
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <SectionShell title="Profile" formId="profile-form" saving={saving} status={status}>
      <div className="flex flex-wrap items-center gap-6">
        {data.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- small data URL stored with the profile
          <img
            src={data.avatar}
            alt=""
            className="size-[90px] rounded-full object-cover ring-[3px] ring-cyan"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[90px] place-items-center rounded-full bg-brand font-display text-[32px] font-bold text-cyan ring-[3px] ring-cyan"
          >
            {initials(data.name)}
          </span>
        )}
        <div className="flex items-center gap-5">
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Choose a profile photo"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => file.current?.click()}
            className="h-11 rounded-[12px] border border-line-strong bg-surface px-5 text-base font-semibold text-link transition-colors hover:bg-canvas disabled:opacity-60"
          >
            {data.avatar ? 'Change photo' : 'Upload photo'}
          </button>
          {data.avatar && (
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => void drop()}
              className="text-base font-semibold text-bad hover:underline disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <form id="profile-form" onSubmit={save} noValidate className="mt-8 grid gap-6 sm:grid-cols-2">
        <TextField
          label="Full name"
          autoComplete="name"
          placeholder="e.g. Priya Sharma"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          error={err('name')}
        />
        <TextField
          label="Work email"
          value={data.email}
          readOnly
          disabled
          hint="Your sign-in email is managed by a Super Admin."
        />
        <TextField
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={v.phone}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
          error={err('phone')}
        />
        <TextField
          label="Role"
          value={data.roleLabel}
          readOnly
          disabled
          hint="Roles are changed in Team & roles."
        />
        <TextField
          label="Two-step verification"
          value={data.mfa ? 'On · authenticator app' : 'Not set up'}
          readOnly
          disabled
        />
        <TextField
          label="Last active"
          value={data.lastActive ? new Date(data.lastActive).toLocaleString('en-IN') : '—'}
          readOnly
          disabled
        />
      </form>
      <AvatarCropper file={cropFile} onSave={savePhoto} onClose={() => setCropFile(null)} />
    </SectionShell>
  );
}
