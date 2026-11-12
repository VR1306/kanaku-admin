import { TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SiteConfig } from '@/types/cms';
import { SubHeading } from './ListRow';

type Theme = SiteConfig['theme'];
type Footer = SiteConfig['footer'];
const COLORS: Array<[keyof Theme, string, string]> = [
  ['primary', 'Primary', 'Cards, icons, highlights'],
  ['secondary', 'Secondary', 'Hero & footer background'],
  ['accent', 'Accent', 'Buttons & eyebrow'],
  ['background', 'Background', 'Page'],
  ['surface', 'Surface', 'Cards & FAQ'],
  ['text', 'Text', 'Body copy'],
];
const PRESETS: Array<{ name: string; t: Partial<Theme> }> = [
  {
    name: 'Kanaku',
    t: {
      primary: '#1d4ed8',
      secondary: '#0b1220',
      accent: '#22d3ee',
      background: '#f1f5fa',
      surface: '#ffffff',
      text: '#0f172a',
    },
  },
  {
    name: 'Emerald',
    t: {
      primary: '#047857',
      secondary: '#052e22',
      accent: '#34d399',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#0f172a',
    },
  },
  {
    name: 'Violet',
    t: {
      primary: '#6d28d9',
      secondary: '#1e1033',
      accent: '#a78bfa',
      background: '#f5f3ff',
      surface: '#ffffff',
      text: '#0f172a',
    },
  },
];

export function ThemeForm({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="space-y-8">
      <SubHeading
        title="Colours"
        hint="Landing-page tokens only — they don’t affect the admin or user app themes."
      />
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange({ ...theme, ...p.t })}
            className="flex items-center gap-2.5 rounded-full border border-line-strong bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold hover:bg-canvas"
          >
            <span className="flex">
              {[p.t.primary, p.t.secondary, p.t.accent].map((c) => (
                <i
                  key={c}
                  className="-ml-1.5 size-6 rounded-full border-2 border-surface first:ml-0"
                  style={{ background: c }}
                />
              ))}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COLORS.map(([k, label, hint]) => (
          <div key={k} className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
            <label
              className="relative mt-7 size-[54px] shrink-0 cursor-pointer overflow-hidden rounded-[14px] border border-line-strong"
              style={{ background: theme[k] as string }}
            >
              <input
                type="color"
                aria-label={`${label} colour`}
                value={theme[k] as string}
                onChange={(e) => onChange({ ...theme, [k]: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <div className="min-w-0 flex-1">
              <TextField
                label={label}
                placeholder="#1d4ed8"
                hint={hint}
                value={theme[k] as string}
                onChange={(e) => onChange({ ...theme, [k]: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <section className="space-y-4">
        <SubHeading title="Shape & buttons" />
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Border radius</p>
            <SegmentedControl
              aria-label="Border radius"
              variant="page"
              options={
                [
                  { value: 'sm', label: 'Sharp' },
                  { value: 'md', label: 'Soft' },
                  { value: 'lg', label: 'Round' },
                ] as const
              }
              value={theme.radius}
              onChange={(v) => onChange({ ...theme, radius: v })}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Button style</p>
            <SegmentedControl
              aria-label="Button style"
              variant="page"
              options={
                [
                  { value: 'solid', label: 'Solid' },
                  { value: 'outline', label: 'Outline' },
                ] as const
              }
              value={theme.buttonStyle}
              onChange={(v) => onChange({ ...theme, buttonStyle: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function FooterForm({
  footer,
  onChange,
}: {
  footer: Footer;
  onChange: (f: Footer) => void;
}) {
  return (
    <div className="space-y-5">
      <SubHeading title="Footer" hint="Shown at the bottom of every page on the website." />
      <TextField
        label="Tagline"
        placeholder="e.g. Spend smart. Grow faster."
        maxLength={80}
        value={footer.tagline}
        onChange={(e) => onChange({ ...footer, tagline: e.target.value })}
      />
      <TextField
        label="Support email"
        type="email"
        placeholder="support@kanaku.com"
        value={footer.supportEmail}
        onChange={(e) => onChange({ ...footer, supportEmail: e.target.value })}
      />
      <TextField
        label="Copyright"
        placeholder="© 2026 Kanaku. All rights reserved."
        maxLength={80}
        value={footer.copyright}
        onChange={(e) => onChange({ ...footer, copyright: e.target.value })}
      />
    </div>
  );
}
