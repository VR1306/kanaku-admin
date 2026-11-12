import { route, HttpError } from '@/lib/bff';
import { newId } from '@/lib/db';
import { categoryBody } from '@/features/categories/schemas/categories';
import { categories, listCategories } from '@/services/categories';

export const GET = route({ permission: 'categories.write' }, async () => listCategories());

export const POST = route(
  { permission: 'categories.write', schema: categoryBody, rateLimit: 30 },
  async ({ body, audit }) => {
    const all = await categories.list();
    if (all.some((c) => c.name.toLowerCase() === body.name.toLowerCase()))
      throw new HttpError(409, 'A category with this name already exists', 'conflict');
    const c = await categories.insert({
      id: newId('cat'),
      name: body.name,
      users: 0,
      enabled: body.enabled,
      color: body.color,
      kind: body.kind,
      icon: body.icon,
      description: body.description,
      builtin: false,
    });
    await audit('Created default category', `Category · ${c.name}`, {
      after: { color: c.color, enabled: c.enabled },
    });
    return c;
  },
);
