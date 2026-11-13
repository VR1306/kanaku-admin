'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/icons/icon';
import {
  SIDEBAR_MOTION,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/constants/layout';
import { usePersistedFlag } from '@/hooks/usePersistedFlag';
import { api } from '@/lib/api-client';
import type { Permission } from '@/types/auth';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { Sidebar, type SidebarUser } from './Sidebar';

interface Props {
  user: SidebarUser;
  permissions: readonly Permission[];
  supportOpen: number;
  children: ReactNode;
}

/** Authenticated layout: collapsible sidebar on desktop (state persisted), slide-over drawer on small screens. */
export function AppShell({ user, permissions, supportOpen, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedFlag(SIDEBAR_STORAGE_KEY);
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const logout = async () => {
    await api('/api/auth/logout', { body: {} });
    router.push('/login');
    router.refresh();
  };
  const shared = { user, permissions, supportOpen, onLogout: logout };

  return (
    <div
      className="min-h-screen bg-canvas"
      style={{ '--sidebar-w': `${width}px` } as CSSProperties}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden transition-[width] lg:block',
          SIDEBAR_MOTION,
        )}
        style={{ width }}
      >
        <Sidebar {...shared} collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-9 -right-3 grid size-6 place-items-center rounded-full bg-cyan text-on-accent shadow-sm transition-colors hover:bg-cyan-pale"
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} className="grid">
            <Icon name="chevronLeft" size={14} strokeWidth={2.4} />
          </motion.span>
        </button>
      </aside>

      <header className="flex h-16 items-center justify-between bg-navy px-4 lg:hidden">
        <Logo size={32} admin />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-control text-on-inverse hover:bg-white/10"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ONE bell for every screen size (it used to be mounted twice, doubling its requests and subscriptions).
          On phones it sits beside the menu button in the header band; on desktop in the top-right corner. */}
      <div className="fixed top-3 right-[68px] z-30 lg:top-4 lg:right-6">
        <NotificationBell />
      </div>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-navy/60"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative h-full w-[264px] max-w-[85vw]"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <Sidebar {...shared} onNavigate={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main
        id="main"
        className={cn(
          'px-4 py-8 transition-[padding] lg:pt-10 lg:pr-10 lg:pl-[calc(var(--sidebar-w)+40px)]',
          SIDEBAR_MOTION,
        )}
      >
        {children}
      </main>
    </div>
  );
}
