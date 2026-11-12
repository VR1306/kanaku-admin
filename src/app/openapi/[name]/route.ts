import { NextResponse } from 'next/server';
import { adminSpec } from '@/openapi/admin';
import { landingSpec } from '@/openapi/landing';
import { userSpec } from '@/openapi/user';

const specs = { admin: adminSpec, user: userSpec, landing: landingSpec } as const;

export async function GET(_: Request, ctx: RouteContext<'/openapi/[name]'>) {
  const { name } = await ctx.params;
  const build = specs[name.replace(/\.json$/, '') as keyof typeof specs];
  if (!build) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 });
  return NextResponse.json(build(), { headers: { 'access-control-allow-origin': '*' } });
}
