import { route, HttpError } from '@/lib/bff';
import { siteConfigSchema } from '@/features/cms/schemas/site';
import { getState, publish } from '@/services/content';
import { revalidateLanding } from '@/services/landing-revalidate';

export const POST = route(
  { permission: 'cms.write', rateLimit: 20 },
  async ({ session, audit }) => {
    const parsed = siteConfigSchema.safeParse((await getState()).draft);
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Draft is invalid', 'validation');
    const v = await publish(session!.email);
    revalidateLanding();
    await audit('Published website', `Content · Landing page v${v.version}`, {
      after: { version: v.version },
    });
    return { version: v.version };
  },
);
