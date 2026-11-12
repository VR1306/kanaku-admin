import { buildSpec } from './dsl';
import { ops as ops1 } from './admin-ops-1';
import { ops as ops2 } from './admin-ops-2';
import { ops as ops3 } from './admin-ops-3';
import { ops as ops4 } from './admin-ops-4';

const sess = ['cookieAuth'];
const ops = [...ops1, ...ops2, ...ops3, ...ops4];

export const adminSpec = () =>
  buildSpec({
    title: 'Kanaku Admin Portal API',
    description:
      'Administrative APIs behind the Admin Portal (BFF). Browser calls use the HttpOnly session cookie; every endpoint re-checks the caller’s permission on the server. Responses are `{ …data }` on success and `{ error: { code, message, requestId } }` on failure. The `/api/v1` integration endpoints are consumed by the Landing Page and User App.',
    servers: [{ url: '/', description: 'This server' }],
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'kanaku_admin_session' },
      serviceKey: {
        type: 'http',
        scheme: 'bearer',
        description: 'SERVICE_API_KEY (server-to-server only)',
      },
    },
    defaultAuth: sess,
    tags: [
      'Auth',
      'Profile',
      'Team & roles',
      'Users',
      'Plans',
      'Coupons',
      'Payments',
      'Categories',
      'Landing page',
      'Legal documents',
      'Announcements',
      'Support',
      'Notifications & realtime',
      'Audit & dashboard',
      'Integration (v1)',
      'Support chat (v1)',
    ].map((name) => ({ name, description: '' })),
    ops,
  });
