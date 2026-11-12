import { route } from '@/lib/bff';
import { siteConfigSchema } from '@/features/cms/schemas/site';
import { getState, saveDraft } from '@/services/content';

export const PUT = route(
  { permission: 'cms.write', schema: siteConfigSchema },
  async ({ body, audit }) => {
    const before = (await getState()).draft;
    await saveDraft(body);
    await audit('Saved website draft', 'Content · Landing page', { before, after: body });
    return { saved: true };
  },
);
