'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { m as motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/icons/icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { SIDEBAR_MOTION } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import type { Permission } from '@/types/auth';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';
import { NAV, type NavGroup } from './nav';

export interface SidebarUser {
  name: string;
  roleLabel: string;
  avatar: string | null;
}

interface Props {
  user: SidebarUser;
  permissions: readonly Permission[];
  /** Open support tickets, shown as a badge on Support. */
  supportOpen?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
  onLogout: () => Promise<void>;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/*
 * Smooth collapsing (same technique as the user app): every row keeps the SAME left padding in both
 * states (icon at x=30 = centre of the 80px rail). Labels are never removed, only faded and clipped by
 * the shrinking row, so nothing jumps or re-aligns.
 */
const rowBase =
  'relative flex w-full items-center gap-[10px] overflow-hidden rounded-control pl-[18px] text-[15px] transition-colors';
const rowIdle = 'font-medium text-brand-pale hover:bg-white/10';

function Label({ children, collapsed }: { children: string; collapsed: boolean }) {
  return (
    <span
      aria-hidden={collapsed}
      className={cn(
        'relative shrink-0 whitespace-nowrap transition-opacity duration-200',
        collapsed ? 'opacity-0' : 'opacity-100 delay-100',
      )}
    >
      {children}
    </span>
  );
}

export function Sidebar({
  user,
  permissions,
  supportOpen,
  collapsed = false,
  onNavigate,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const pillId = useId(); // desktop + drawer sidebars must not share one layoutId
  const { theme, toggle } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hiding is UX only — every route handler re-checks permissions server-side.
  const items = NAV.filter((n) => permissions.includes(n.permission));
  const groups = [...new Set(items.map((i) => i.group))] as NavGroup[];

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex h-full flex-col overflow-hidden bg-navy pt-5 pb-4 pl-3 transition-[padding]',
        SIDEBAR_MOTION,
        collapsed ? 'pr-3' : 'pr-5',
      )}
    >
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="Kanaku admin home"
        className={cn(
          'mb-4 flex shrink-0 transition-[padding]',
          SIDEBAR_MOTION,
          collapsed ? 'pl-[9px]' : 'pl-[14px]',
        )}
      >
        <Logo size={38} markOnly={collapsed} admin />
      </Link>

      <div className="scroll-primary -mr-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-2 pb-3 [mask-image:linear-gradient(to_bottom,black_calc(100%-14px),transparent)]">
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <div className="relative mb-2 h-5">
              <p
                aria-hidden={collapsed}
                className={cn(
                  'absolute inset-x-0 top-0 pl-[18px] text-[11px] leading-5 tracking-[0.14em] whitespace-nowrap text-slate-400 uppercase transition-opacity duration-200',
                  collapsed && 'opacity-0',
                )}
              >
                {g}
              </p>
              <div
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-3 top-1/2 h-px bg-white/10 transition-opacity duration-200',
                  collapsed ? 'opacity-100 delay-100' : 'opacity-0',
                )}
              />
            </div>
            <ul className="flex flex-col gap-0.5">
              {items
                .filter((i) => i.group === g)
                .map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const badge = item.href === '/support' ? supportOpen : undefined;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          rowBase,
                          'h-11',
                          active ? 'font-bold text-nav-active-fg' : rowIdle,
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId={`nav-pill-${pillId}`}
                            className="absolute inset-0 rounded-control bg-nav-active-bg"
                            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                          />
                        )}
                        <Icon
                          name={item.icon as IconName}
                          size={19}
                          className="relative shrink-0"
                        />
                        <Label collapsed={collapsed}>{item.label}</Label>
                        {badge ? (
                          <span
                            aria-label={`${badge} open`}
                            className={cn(
                              'absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cyan px-1 text-[10px] font-bold text-on-accent transition-[left,top] duration-300',
                              collapsed
                                ? 'top-[3px] left-[calc(50%+2px)] ring-2 ring-navy'
                                : 'top-[13px] left-[calc(100%-30px)] ring-0',
                            )}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={collapsed ? 'Toggle theme' : undefined}
          className={cn(rowBase, 'h-10', rowIdle)}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} className="relative shrink-0" />
          <Label collapsed={collapsed}>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</Label>
        </button>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label="Log out"
          title={collapsed ? 'Log out' : undefined}
          className={cn(rowBase, 'h-10 font-medium text-red-400 hover:bg-red-500/10')}
        >
          <Icon name="logout" size={19} className="relative shrink-0" />
          <Label collapsed={collapsed}>Log out</Label>
        </button>
      </div>

      <Link
        href="/profile"
        onClick={onNavigate}
        aria-label={`${user.name}, ${user.roleLabel} — profile`}
        title={collapsed ? user.name : undefined}
        className={cn(
          'mt-2 flex shrink-0 items-center gap-3 overflow-hidden bg-navy-2 transition-[width,height,margin,border-radius]',
          SIDEBAR_MOTION,
          collapsed ? 'ml-1 size-12 rounded-full p-1' : 'h-14 w-full rounded-2xl p-2',
        )}
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- small data URL stored with the profile
          <img src={user.avatar} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-on-inverse font-display text-base font-bold text-blue-700">
            {initials(user.name)}
          </span>
        )}
        <span
          aria-hidden={collapsed}
          className={cn(
            'min-w-0 transition-opacity duration-200',
            collapsed ? 'opacity-0' : 'delay-100',
          )}
        >
          <span className="block max-w-[140px] truncate text-sm font-semibold text-on-inverse">
            {user.name}
          </span>
          <span className="block text-xs text-cyan-pale">{user.roleLabel}</span>
        </span>
      </Link>

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
            await onLogout();
          } finally {
            setBusy(false);
          }
        }}
      />
    </nav>
  );
}
