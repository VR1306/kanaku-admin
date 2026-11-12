'use client';

/* eslint-disable @next/next/no-img-element -- previews are user-supplied data URLs, not optimisable assets */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import {
  AUDIENCE_LABEL,
  CHANNEL_LABEL,
  type Audience,
  type Channel,
  type AnnouncementRow,
} from '@/types/announcements';
import { announcementBody, IMAGE_MAX, IMAGE_TYPES } from '../schemas/announcements';

export interface FormState {
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  image: AnnouncementRow['image'];
  audience: Audience;
  customUserIds: string[];
  channels: Channel[];
  sendNow: boolean;
  publishDate: string;
  publishTime: string;
  expiryDate: string;
  expiryTime: string;
  trigger: 'next_login' | 'dashboard' | 'page' | 'inactivity';
  triggerValue: string;
  frequency: 'once' | 'session' | 'until_dismissed';
}
export const blankForm = (customUserIds: string[] = []): FormState => ({
  title: '',
  message: '',
  ctaLabel: '',
  ctaHref: '',
  image: null,
  audience: customUserIds.length ? 'custom' : 'all',
  customUserIds,
  channels: ['inapp'],
  sendNow: false,
  publishDate: '',
  publishTime: '10:00',
  expiryDate: '',
  expiryTime: '23:59',
  trigger: 'next_login',
  triggerValue: '',
  frequency: 'once',
});

const cropTo2x1 = (dataUrl: string): Promise<string> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(img.width, img.height * 2),
        h = w / 2;
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 600;
      c.getContext('2d')!.drawImage(
        img,
        (img.width - w) / 2,
        (img.height - h) / 2,
        w,
        h,
        0,
        0,
        1200,
        600,
      );
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = rej;
    img.src = dataUrl;
  });

/** Headless submit logic so the drawer can pin the buttons in its footer. */
export function useAnnouncementForm(
  value: FormState,
  editingId: string | null,
  onSaved: () => void,
) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const payload = (draft: boolean) => ({
    ...value,
    draft,
    publishDate: value.publishDate || undefined,
    publishTime: value.publishTime || undefined,
    expiryDate: value.expiryDate || undefined,
    expiryTime: value.expiryTime || undefined,
  });
  const live = announcementBody.safeParse(payload(false));
  async function submit(draft: boolean) {
    setBusy(true);
    try {
      await api(editingId ? `/api/announcements/${editingId}` : '/api/announcements', {
        method: editingId ? 'PUT' : 'POST',
        body: payload(draft),
      });
      toast(draft ? 'Draft saved' : value.sendNow ? 'Announcement sent' : 'Announcement scheduled');
      onSaved();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    canPublish: live.success,
    issue: !live.success ? live.error.issues[0]?.message : '',
    canDraft: !!value.title.trim() && !!value.message.trim(),
    submit,
  };
}

export function AnnouncementFooter({
  value,
  form,
  onCancel,
}: {
  value: FormState;
  form: ReturnType<typeof useAnnouncementForm>;
  onCancel: () => void;
}) {
  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={form.busy}>
        Cancel
      </Button>
      <Button
        variant="outline"
        loading={form.busy}
        disabled={!form.canDraft}
        onClick={() => form.submit(true)}
      >
        Save draft
      </Button>
      <Button loading={form.busy} disabled={!form.canPublish} onClick={() => form.submit(false)}>
        {value.sendNow ? 'Send now' : 'Schedule'}
      </Button>
    </>
  );
}

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-4 border-t border-line-soft pt-6 first:border-0 first:pt-0">
    <div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
    {children}
  </section>
);

export function AnnouncementFields({
  value,
  onChange,
  issue,
}: {
  value: FormState;
  onChange: (v: FormState) => void;
  issue?: string;
}) {
  const { toast } = useToast();
  const set = (p: Partial<FormState>) => onChange({ ...value, ...p });
  const chip = (on: boolean) =>
    cn(
      'h-10 rounded-full border px-4 text-sm font-semibold transition-colors',
      on
        ? 'border-brand bg-brand text-white'
        : 'border-line-strong bg-surface text-ink-2 hover:bg-canvas',
    );
  function onFile(f?: File) {
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return toast('Use a JPG, PNG or WebP image');
    if (f.size > IMAGE_MAX) return toast('Image must be 2 MB or smaller');
    const r = new FileReader();
    r.onload = () =>
      set({
        image: {
          dataUrl: String(r.result),
          alt: value.image?.alt ?? '',
          name: f.name,
          size: f.size,
        },
      });
    r.readAsDataURL(f);
  }
  return (
    <div className="space-y-6">
      <Section title="Content">
        <TextField
          label={`Title · ${value.title.length}/80`}
          placeholder="e.g. New: Export reports as PDF"
          maxLength={80}
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <TextArea
          label={`Message · ${value.message.length}/500`}
          rows={4}
          placeholder="Tell users what's new, in a sentence or two."
          maxLength={500}
          value={value.message}
          onChange={(e) => set({ message: e.target.value })}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Button label (optional)"
            placeholder="e.g. Open reports"
            maxLength={24}
            value={value.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
          />
          <TextField
            label="Button link"
            placeholder="/reports or https://…"
            value={value.ctaHref}
            onChange={(e) => set({ ctaHref: e.target.value })}
          />
        </div>
      </Section>
      <Section title="Image" hint="JPG, PNG or WebP · max 2 MB · 1200×600 recommended">
        {value.image ? (
          <div className="space-y-4">
            <img
              src={value.image.dataUrl}
              alt={value.image.alt || 'Preview'}
              className="max-h-44 rounded-2xl border border-line"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-10"
                onClick={async () =>
                  set({
                    image: { ...value.image!, dataUrl: await cropTo2x1(value.image!.dataUrl) },
                  })
                }
              >
                Crop to 2:1
              </Button>
              <Button variant="outlineDanger" className="h-10" onClick={() => set({ image: null })}>
                Remove
              </Button>
            </div>
            <TextField
              label="Alt text"
              placeholder="Describe the image for screen readers"
              value={value.image.alt}
              onChange={(e) => set({ image: { ...value.image!, alt: e.target.value } })}
            />
          </div>
        ) : (
          <input
            type="file"
            aria-label="Upload image"
            accept={IMAGE_TYPES.join(',')}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="w-full text-sm text-muted"
          />
        )}
      </Section>
      <Section title="Audience & channels">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Audience</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={value.audience === a}
                className={chip(value.audience === a)}
                onClick={() => set({ audience: a })}
              >
                {AUDIENCE_LABEL[a]}
              </button>
            ))}
          </div>
          {value.audience === 'custom' && (
            <p className="mt-2 text-[13px] text-muted">
              {value.customUserIds.length} selected users (choose users on the Users page → Send
              announcement).
            </p>
          )}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Channels</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={value.channels.includes(c)}
                className={chip(value.channels.includes(c))}
                onClick={() =>
                  set({
                    channels: value.channels.includes(c)
                      ? value.channels.filter((x) => x !== c)
                      : [...value.channels, c],
                  })
                }
              >
                {CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>
      </Section>
      <Section title="Schedule" hint="All times are IST. Expired announcements hide automatically.">
        <SegmentedControl
          aria-label="When"
          variant="page"
          options={
            [
              { value: 'now', label: 'Send now' },
              { value: 'later', label: 'Schedule' },
            ] as const
          }
          value={value.sendNow ? 'now' : 'later'}
          onChange={(v) => set({ sendNow: v === 'now' })}
        />
        {!value.sendNow && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Publish date"
              type="date"
              placeholder="dd/mm/yyyy"
              value={value.publishDate}
              onChange={(e) => set({ publishDate: e.target.value })}
            />
            <TextField
              label="Time (IST)"
              type="time"
              placeholder="hh:mm"
              value={value.publishTime}
              onChange={(e) => set({ publishTime: e.target.value })}
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Expires on (optional)"
            type="date"
            placeholder="dd/mm/yyyy"
            value={value.expiryDate}
            onChange={(e) => set({ expiryDate: e.target.value })}
          />
          <TextField
            label="Expiry time (IST)"
            type="time"
            placeholder="hh:mm"
            value={value.expiryTime}
            onChange={(e) => set({ expiryTime: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            label="Display trigger"
            value={value.trigger}
            onChange={(e) => set({ trigger: e.target.value as FormState['trigger'] })}
            options={[
              { value: 'next_login', label: 'On next login' },
              { value: 'dashboard', label: 'On dashboard' },
              { value: 'page', label: 'On a specific page' },
              { value: 'inactivity', label: 'After N days of inactivity' },
            ]}
          />
          <SelectField
            label="Show"
            value={value.frequency}
            onChange={(e) => set({ frequency: e.target.value as FormState['frequency'] })}
            options={[
              { value: 'once', label: 'Once per user' },
              { value: 'session', label: 'Every session' },
              { value: 'until_dismissed', label: 'Until dismissed' },
            ]}
          />
        </div>
        {(value.trigger === 'page' || value.trigger === 'inactivity') && (
          <TextField
            label={value.trigger === 'page' ? 'Page path' : 'Days of inactivity'}
            placeholder={value.trigger === 'page' ? 'e.g. /reports' : 'e.g. 14'}
            value={value.triggerValue}
            onChange={(e) => set({ triggerValue: e.target.value })}
          />
        )}
      </Section>
      {issue && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {issue}
        </p>
      )}
    </div>
  );
}
