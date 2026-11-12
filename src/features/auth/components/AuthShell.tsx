import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Split-screen auth layout matching the design: navy brand panel + form. */
export function AuthShell({
  children,
  headline,
  accent,
  blurb,
}: {
  children: React.ReactNode;
  headline: string;
  accent: string;
  blurb: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <Logo admin />
        <div>
          <p className="text-xs font-bold tracking-widest text-cyan">KANAKU TEAM ONLY</p>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight">
            {headline} <span className="text-cyan">{accent}</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-300">{blurb}</p>
        </div>
        <p className="text-xs text-slate-400">
          Protected by two-step verification · Sessions end after 30 minutes idle
        </p>
      </aside>
      <main className="relative flex items-center justify-center bg-canvas p-6">
        <ThemeToggle className="absolute right-4 top-4" />
        {children}
      </main>
    </div>
  );
}

/** Centered single-card layout used by verify / forgot / reset / setup screens. */
export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center bg-canvas p-6">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md space-y-5">
        <div className="flex justify-center">
          <Logo tone="light" admin />
        </div>
        <div className="space-y-4 rounded-3xl border border-line bg-surface p-8">{children}</div>
      </div>
    </main>
  );
}
