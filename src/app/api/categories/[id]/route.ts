import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { categoryBody, toggleCategory } from '@/features/categories/schemas/categories';
import { categories } from '@/services/categories';

const find = async (id: string) => {
  const c = await categories.get(id);
  if (!c) throw new HttpError(404, 'Category not found', 'not_found');
  return c;
};

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/categories/[id]'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'categories.write', schema: toggleCategory },
    async ({ body, audit }) => {
      const c = await find(id);
      const before = c.enabled;
      const next = (await categories.update(id, { enabled: body.enabled }))!;
      await audit(
        body.enabled ? 'Enabled default category' : 'Disabled default category',
        `Category · ${c.name}`,
        { before, after: body.enabled },
      );
      return next;
    },
  )(req);
}

/** Rename / recolour. Existing users' categories keep working; only the default template changes. */
export async function PUT(req: NextRequest, ctx: RouteContext<'/api/categories/[id]'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'categories.write', schema: categoryBody },
    async ({ body, audit }) => {
      const c = await find(id);
      if (
        (await categories.list()).some(
          (x) => x.id !== id && x.name.toLowerCase() === body.name.toLowerCase(),
        )
      )
        throw new HttpError(409, 'A category with this name already exists', 'conflict');
      const before = {
        name: c.name,
        color: c.color,
        kind: c.kind,
        icon: c.icon,
        description: c.description,
        enabled: c.enabled,
      };
      // Type can only change while nobody uses the category (existing transactions are typed).
      if (body.kind !== c.kind && c.users > 0)
        throw new HttpError(
          409,
          'Type can’t change while users have transactions in this category',
          'conflict',
        );
      const next = (await categories.update(id, {
        name: body.name,
        color: body.color,
        icon: body.icon,
        description: body.description,
        kind: body.kind,
        enabled: body.enabled,
      }))!;
      await audit('Edited default category', `Category · ${next.name}`, {
        before,
        after: {
          name: next.name,
          color: next.color,
          kind: next.kind,
          icon: next.icon,
          description: next.description,
          enabled: next.enabled,
        },
      });
      return next;
    },
  )(req);
}

/** Only categories created in the admin and not used by anyone can be deleted; everything else is disabled instead. */
export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/categories/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'categories.write' }, async ({ audit }) => {
    const c = await find(id);
    if (c.builtin)
      throw new HttpError(
        409,
        'Starter categories can’t be deleted. Disable it instead.',
        'conflict',
      );
    if (c.users > 0)
      throw new HttpError(
        409,
        `${c.users} users use this category. Disable it instead.`,
        'conflict',
      );
    await categories.remove(id);
    await audit('Deleted default category', `Category · ${c.name}`);
    return { deleted: true };
  })(req);
}
