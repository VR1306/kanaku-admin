'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/utils/cn';
import type { PlanPrice, SiteConfig } from '@/types/cms';
import { LandingPage } from './LandingPage';

type Device = 'desktop' | 'tablet' | 'mobile';
// Screen = the real CSS viewport the page is laid out in (so responsive breakpoints are accurate); the frame is scaled to fit.
const SCREEN: Record<Device, { w: number; h: number; pad: number; radius: string }> = {
  desktop: { w: 1280, h: 760, pad: 14, radius: 'rounded-t-[22px]' },
  tablet: { w: 820, h: 1040, pad: 16, radius: 'rounded-[34px]' },
  mobile: { w: 390, h: 800, pad: 12, radius: 'rounded-[44px]' },
};
const OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
] as const;

/**
 * Full-screen preview of the DRAFT (including unsaved edits) inside a laptop / tablet / phone frame.
 * Laid out at the device's real width and scaled down to fit, so breakpoints behave exactly as on the real site.
 */
export function PreviewScreen({
  config,
  plans,
  dirty,
  onClose,
}: {
  config: SiteConfig;
  plans: PlanPrice[];
  dirty: boolean;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const [stage, setStage] = useState({ w: 1200, h: 700 });
  const stageRef = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setStage({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    back.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const d = SCREEN[device];
  const frameW = d.w + d.pad * 2;
  const frameH = d.h + d.pad * 2 + (device === 'desktop' ? 30 : 0); // laptop base
  const scale = Math.max(0.2, Math.min(1, (stage.w - 32) / frameW, (stage.h - 24) / frameH));

  return (
    <div
      data-fullscreen
      role="dialog"
      aria-modal="true"
      aria-label="Website preview"
      className="fixed inset-0 z-50 flex flex-col bg-canvas"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Button ref={back} variant="outline" className="h-11" onClick={onClose}>
          <Icon name="chevronLeft" size={18} strokeWidth={2.4} />
          Back to editing
        </Button>
        <div className="mx-auto order-last w-full sm:order-none sm:w-auto">
          <SegmentedControl
            aria-label="Preview size"
            options={OPTIONS}
            value={device}
            onChange={setDevice}
            className="w-full sm:w-auto"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge tone="amber">Draft preview</Badge>
          {dirty && (
            <span className="hidden text-xs font-semibold text-warn md:inline">
              Includes unsaved edits
            </span>
          )}
          <a
            href="/site"
            target="_blank"
            rel="noreferrer"
            className="hidden h-11 items-center gap-2 rounded-control border border-line-strong px-4 text-sm font-bold text-link hover:bg-canvas md:inline-flex"
          >
            <Icon name="external" size={16} />
            Published site
          </a>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,var(--color-line-soft),transparent_70%)] py-3"
      >
        <div
          style={{ width: frameW * scale, height: frameH * scale }}
          className="shrink-0 transition-[width,height] duration-300"
        >
          <div
            style={{
              width: frameW,
              height: frameH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="transition-transform duration-300"
          >
            <div
              style={{ padding: d.pad }}
              className={cn(
                'bg-[#0b1220] shadow-[0_30px_80px_rgb(0_0_0/0.35)] ring-1 ring-white/10',
                d.radius,
              )}
            >
              <div
                style={{ width: d.w, height: d.h }}
                className={cn(
                  'relative overflow-hidden bg-surface',
                  device === 'desktop'
                    ? 'rounded-t-[10px]'
                    : device === 'tablet'
                      ? 'rounded-[22px]'
                      : 'rounded-[32px]',
                )}
              >
                {device === 'mobile' && (
                  <span
                    aria-hidden
                    className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0b1220]"
                  />
                )}
                {device === 'desktop' && (
                  <div
                    className="flex h-9 items-center gap-3 border-b border-line-soft bg-canvas px-4"
                    aria-hidden
                  >
                    <span className="flex gap-1.5">
                      <i className="size-2.5 rounded-full bg-[#ff5f57]" />
                      <i className="size-2.5 rounded-full bg-[#febc2e]" />
                      <i className="size-2.5 rounded-full bg-[#28c840]" />
                    </span>
                    <span className="mx-auto flex h-6 w-72 items-center justify-center rounded-full bg-surface text-xs text-muted">
                      kanaku.com
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'overflow-y-auto overflow-x-hidden overscroll-contain',
                    device === 'desktop' ? 'h-[calc(100%-36px)]' : 'h-full',
                    device === 'mobile' && 'pt-8',
                  )}
                  tabIndex={0}
                  aria-label={`${device} preview, scrollable`}
                >
                  <LandingPage config={config} plans={plans} compact={device !== 'desktop'} />
                </div>
              </div>
            </div>
            {device === 'desktop' && (
              <div
                aria-hidden
                className="mx-auto h-[30px] w-[112%] -translate-x-[5.4%] rounded-b-[22px] bg-gradient-to-b from-[#cbd5e1] to-[#94a3b8] shadow-md before:mx-auto before:block before:h-2 before:w-32 before:rounded-b-lg before:bg-[#94a3b8]/60"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
