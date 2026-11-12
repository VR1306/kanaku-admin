import 'server-only';
import { ttlCache } from '@/lib/ttl';
import { BUILTIN_ROLES, type RoleSeed } from '@/lib/permissions';
import { col } from '@/lib/db';
import { PERMISSIONS, type Permission } from '@/types/auth';

/**
 * Role store (MongoDB `roles`). Built-in roles are system definitions upserted once; edits to them persist.
 * Permissions are resolved from the database on every request, so a role change applies on the member's next request.
 */
interface RoleDoc {
  _id: string;
  name: string;
  permissions: Permission[];
  builtin: boolean;
}
let ensured: Promise<void> | null = null;

async function roles() {
  const c = await col<RoleDoc>('roles');
  ensured ??= Promise.all(
    BUILTIN_ROLES.map((r) =>
      c.updateOne(
        { _id: r.id },
        { $setOnInsert: { name: r.name, permissions: r.permissions, builtin: true } },
        { upsert: true },
      ),
    ),
  )
    .then(() => undefined)
    .catch((e) => {
      ensured = null;
      throw e;
    });
  await ensured;
  return c;
}
const toSeed = (d: RoleDoc): RoleSeed => ({
  id: d._id,
  name: d.name,
  permissions: d.permissions,
  builtin: d.builtin,
});

export const listRoles = async (): Promise<RoleSeed[]> =>
  (await (await roles()).find().toArray()).map(toSeed);
export const getRole = async (id: string) => {
  const d = await (await roles()).findOne({ _id: id });
  return d ? toSeed(d) : undefined;
};

// Resolved on every request (so edits apply on the member's next request), but cached for 10 s: it's read by the
// layout, the BFF wrapper and each page guard. Role writes below clear it at once.
const permCache = ttlCache<readonly Permission[]>(10_000, 100);
const labelCache = ttlCache<string>(10_000, 100);
const clearRoleCache = () => {
  permCache.clear();
  labelCache.clear();
};
export async function permissionsFor(id: string): Promise<readonly Permission[]> {
  if (id === 'super_admin') return PERMISSIONS; // locked: always everything
  const hit = permCache.get(id);
  if (hit) return hit;
  const p = (await (await roles()).findOne({ _id: id }))?.permissions ?? [];
  permCache.set(id, p);
  return p;
}
export async function roleLabel(id: string) {
  const hit = labelCache.get(id);
  if (hit) return hit;
  const name = (await (await roles()).findOne({ _id: id }))?.name ?? id;
  labelCache.set(id, name);
  return name;
}
export async function can(id: string, p: Permission) {
  return (await permissionsFor(id)).includes(p);
}

export async function createRole(name: string, permissions: Permission[]): Promise<RoleSeed> {
  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `role_${Date.now()}`;
  const c = await roles();
  if (await c.findOne({ _id: id })) throw new Error('A role with this name already exists');
  await c.insertOne({ _id: id, name, permissions, builtin: false });
  clearRoleCache();
  return { id, name, permissions, builtin: false };
}
export async function updateRolePermissions(id: string, permissions: Permission[]) {
  if (id === 'super_admin') return null; // Super Admin column is locked
  const r = await (
    await roles()
  ).findOneAndUpdate({ _id: id }, { $set: { permissions } }, { returnDocument: 'after' });
  clearRoleCache();
  return r ? toSeed(r) : null;
}
export async function renameRole(id: string, name: string) {
  const r = await (
    await roles()
  ).findOneAndUpdate({ _id: id, builtin: false }, { $set: { name } }, { returnDocument: 'after' });
  clearRoleCache();
  return r ? toSeed(r) : null;
}
export async function deleteRole(id: string) {
  const r = await (await roles()).deleteOne({ _id: id, builtin: false });
  clearRoleCache();
  return r.deletedCount === 1;
}
