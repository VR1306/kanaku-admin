import type { CSSProperties, ReactNode } from 'react';

/** Re-mounts on every navigation, giving each page a soft fade/slide-in (CSS only, so it never delays first paint). */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="reveal-mount" style={{ '--ry': '10px' } as CSSProperties}>
      {children}
    </div>
  );
}
