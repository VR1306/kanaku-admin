import { preflight, v1 } from '@/lib/v1';
import { listCategories } from '@/services/categories';

export const OPTIONS = preflight;
/** Enabled categories only; the User App renders these and cannot create its own. */
export const GET = v1({ cache: 'public, s-maxage=30, stale-while-revalidate=120' }, async () =>
  (await listCategories())
    .filter((c) => c.enabled)
    .map(({ id, name, kind, color, icon, description }) => ({
      id,
      name,
      kind,
      color,
      icon,
      description,
    })),
);
