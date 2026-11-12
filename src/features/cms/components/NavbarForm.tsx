'use client';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { uid } from '@/utils/list';
import type { SiteConfig } from '@/types/cms';
import { SubHeading } from './ListRow';

type Nav = NonNullable<SiteConfig['navbar']>;
const HINT = '#anchor, /path, https://… or {userApp}/signup (the User App)';

/** The top navigation: menu links and the two buttons. Published together with the hero. */
export function NavbarForm({
  navbar,
  onChange,
}: {
  navbar: SiteConfig['navbar'];
  onChange: (n: Nav) => void;
}) {
  if (!navbar) return null;
  const set = (p: Partial<Nav>) => onChange({ ...navbar, ...p });
  const setLink = (i: number, p: Partial<Nav['links'][number]>) =>
    set({ links: navbar.links.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  return (
    <section className="space-y-5">
      <SubHeading
        title="Navigation bar"
        hint={`Menu links and the two buttons at the top of the website. Links can be ${HINT}.`}
      />
      <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
        {navbar.links.map((l, i) => (
          <div
            key={l.id}
            className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end"
          >
            <TextField
              label={`Menu link ${i + 1}`}
              value={l.label}
              maxLength={24}
              onChange={(e) => setLink(i, { label: e.target.value })}
            />
            <TextField
              label="Goes to"
              value={l.href}
              onChange={(e) => setLink(i, { href: e.target.value })}
            />
            <Button
              variant="outline"
              className="h-[54px]"
              disabled={navbar.links.length <= 1}
              aria-label={`Remove menu link ${i + 1}`}
              onClick={() => set({ links: navbar.links.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <div className="bg-canvas p-3">
          <Button
            variant="outline"
            disabled={navbar.links.length >= 6}
            onClick={() =>
              set({ links: [...navbar.links, { id: uid('n'), label: '', href: '#' }] })
            }
          >
            + Add menu link
          </Button>
        </div>
      </div>
      <div className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
        <p className="text-sm font-semibold sm:col-span-2">Buttons</p>
        <TextField
          label="Log-in button"
          value={navbar.loginLabel}
          maxLength={24}
          onChange={(e) => set({ loginLabel: e.target.value })}
        />
        <TextField
          label="Log-in link"
          value={navbar.loginHref}
          onChange={(e) => set({ loginHref: e.target.value })}
        />
        <TextField
          label="Sign-up button"
          value={navbar.signupLabel}
          maxLength={24}
          onChange={(e) => set({ signupLabel: e.target.value })}
        />
        <TextField
          label="Sign-up link"
          value={navbar.signupHref}
          onChange={(e) => set({ signupHref: e.target.value })}
        />
      </div>
    </section>
  );
}
