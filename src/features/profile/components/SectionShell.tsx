'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

/** The white card each profile section sits in: title, body, then Log out and Save changes (as in the user app's settings). */
export function SectionShell({
  title,
  children,
  formId,
  saving,
  status,
  saveLabel = 'Save changes',
}: {
  title: string;
  children: ReactNode;
  formId?: string;
  saving?: boolean;
  status?: { tone: 'success' | 'danger'; text: string } | null;
  saveLabel?: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section
      aria-labelledby="profile-section-title"
      className="rounded-[24px] border border-line bg-surface p-6 sm:p-[33px]"
    >
      <h2 id="profile-section-title" className="font-display text-[26px] font-bold text-ink">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5">
        <Button
          variant="outlineDanger"

          onClick={() => setConfirm(true)}
        >
          <Icon name="logout" size={18} />
          Log out
        </Button>
        <div className="flex items-center gap-4">
          {status && (
            <p
              role="status"
              className={cn(
                'text-sm font-semibold',
                status.tone === 'success' ? 'text-ok' : 'text-bad',
              )}
            >
              {status.text}
            </p>
          )}
          {formId && (
            <Button type="submit" form={formId} loading={saving}>
              {saveLabel}
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        icon="logout"
        title="Log out of Kanaku Admin?"
        body="You'll need to sign in again, and enter a code from your authenticator app, to get back in."
        confirmLabel="Log out"
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api('/api/auth/logout', { body: {} });
            router.push('/login');
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      />
    </section>
  );
}
