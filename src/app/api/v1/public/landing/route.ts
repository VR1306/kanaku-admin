import { ApiFault, preflight, v1 } from '@/lib/v1';
import { buildLanding } from '@/services/landing-feed';

export const OPTIONS = preflight;
// The raw landing configuration (the Landing Page validates it section by section).
export const GET = v1(
  { raw: true, cache: 'public, s-maxage=60, stale-while-revalidate=300' },
  async () => {
    const cfg = await buildLanding();
    if (!cfg)
      throw new ApiFault(404, 'not_published', 'The landing page has not been published yet');
    return cfg;
  },
);
