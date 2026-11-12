import { route } from '@/lib/bff';
import { getState } from '@/services/legal';
import { LEGAL_SLUGS } from '@/types/legal';

/** Draft + published state of both legal documents. */
export const GET = route({ permission: 'cms.write' }, async () =>
  Promise.all(LEGAL_SLUGS.map((s) => getState(s))),
);
