import { z } from 'zod';
import { route } from '@/lib/bff';
import { getExtras, saveExtras, type LandingExtras } from '@/services/landing-feed';
import { revalidateLanding } from '@/services/landing-revalidate';

const link = z
  .object({ label: z.string().min(1).max(60), href: z.string().min(1).max(300) })
  .loose();
const extras = z
  .object({
    site: z
      .object({
        brand: z.object({ name: z.string().min(1) }),
        seo: z.object({ title: z.string().min(1) }).loose(),
      })
      .loose(),
    theme: z.record(z.string(), z.unknown()).optional(),
    flags: z.record(z.string(), z.boolean()).optional(),
    notFound: z.object({ heading: z.string().min(1) }).loose(),
    navbar: z.object({ links: z.array(link) }).loose(),
    hero: z.record(z.string(), z.unknown()).optional(),
    features: z.object({ eyebrow: z.string().optional(), title: z.string().min(1) }).optional(),
    steps: z.object({
      title: z.string().min(1),
      items: z
        .array(z.object({ title: z.string().min(1), description: z.string() }).loose())
        .min(1),
    }),
    pricing: z.object({ title: z.string().min(1) }).optional(),
    faq: z.object({ title: z.string().min(1) }).optional(),
    cta: z.object({ title: z.string().min(1), cta: link.loose() }).loose(),
    footer: z.object({
      columns: z.array(z.object({ title: z.string().min(1), links: z.array(link) })),
    }),
  })
  .loose();

export const GET = route({ permission: 'cms.write' }, async () => ({ extras: await getExtras() }));
export const PUT = route(
  { permission: 'cms.write', schema: extras, rateLimit: 30 },
  async ({ body, audit }) => {
    await saveExtras(body as unknown as LandingExtras);
    revalidateLanding();
    await audit('Updated landing structure', 'Content · Landing page (navigation, steps, footer)');
    return { saved: true };
  },
);
