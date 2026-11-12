import 'server-only';
import { NAV } from '@/components/layout/nav';
import { permissionsFor, roleLabel, can } from '@/services/roles';
import type { Permission } from '@/types/auth';

export { can, permissionsFor, roleLabel };

/** First console page the role may open — used so a role without dashboard access never lands on a dead end. */
export const homeFor = (perms: readonly Permission[]) =>
  NAV.find((n) => perms.includes(n.permission))?.href ?? '/no-access';
