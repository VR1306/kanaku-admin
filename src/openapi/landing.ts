import { buildSpec, type Op } from './dsl';

const ops: Op[] = [
  {
    method: 'get',
    path: '/api/landing',
    tag: 'Content',
    auth: [],
    summary: 'Validated landing configuration',
    description:
      'Fetched from the Admin Portal (`GET {LANDING_API_URL}/landing`), validated section by section, cached and served stale-while-revalidate. Falls back to the last good copy if the Admin Portal is unreachable.',
    res: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            site: {},
            theme: {},
            notFound: {},
            sections: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  {
    method: 'post',
    path: '/api/landing/validate',
    tag: 'Content',
    auth: ['bearerAuth'],
    summary: 'Validate a candidate configuration',
    description: 'Returns per-section issues without publishing anything.',
    body: { type: 'object' },
  },
  {
    method: 'get',
    path: '/api/landing/schema',
    tag: 'Content',
    auth: [],
    summary: 'JSON Schema of the landing configuration',
  },
  {
    method: 'post',
    path: '/api/revalidate',
    tag: 'Cache',
    auth: ['bearerAuth'],
    summary: 'Refresh cached content now',
    description:
      'Called by the Admin Portal right after a publish. `Authorization: Bearer <REVALIDATE_SECRET>`.',
    body: {
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' }, maxItems: 10 } },
    },
    res: {
      type: 'object',
      properties: { data: { type: 'object', properties: { revalidated: { type: 'boolean' } } } },
    },
  },
];

export const landingSpec = () =>
  buildSpec({
    title: 'Kanaku Landing Page API',
    description:
      'Public APIs of the Landing Page. All content originates from the Admin Portal (`GET /api/v1/public/landing`), so nothing admin-configurable is hardcoded.',
    servers: [{ url: '/', description: 'Landing Page origin' }],
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    defaultAuth: [],
    tags: [
      { name: 'Content', description: 'Landing configuration' },
      { name: 'Cache', description: 'On-demand revalidation' },
    ],
    ops,
  });
