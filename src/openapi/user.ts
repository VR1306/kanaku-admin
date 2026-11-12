import { buildSpec, type Op } from './dsl';
import { extraOps } from './user-ops-extra';

const ck = ['cookieAuth'];
const q = (name: string, type = 'string', extra: object = {}) => ({ name, type, ...extra });

const ops: Op[] = [
  { method: 'get', path: '/api/health', tag: 'System', auth: [], summary: 'Liveness probe' },
  // Categories: read-only for users, owned by the Admin Portal.
  {
    method: 'get',
    path: '/api/categories',
    tag: 'Categories',
    summary: 'Categories managed by the admin',
    description:
      'Read-only mirror of the Admin Portal’s enabled categories. Users cannot create, edit or delete categories.',
  },
  // Billing
  {
    method: 'get',
    path: '/api/billing',
    tag: 'Subscriptions',
    summary: 'Plans (from the Admin Portal), current subscription and invoices',
  },
  {
    method: 'post',
    path: '/api/billing/checkout',
    tag: 'Subscriptions',
    summary: 'Create a payment order',
    body: {
      type: 'object',
      required: ['plan', 'interval'],
      properties: {
        plan: { type: 'string' },
        interval: { enum: ['monthly', 'yearly'] },
        coupon: { type: 'string' },
      },
    },
  },
  {
    method: 'post',
    path: '/api/billing/verify',
    tag: 'Subscriptions',
    summary: 'Verify a completed payment',
    body: { type: 'object' },
  },
  {
    method: 'post',
    path: '/api/billing/webhook',
    tag: 'Subscriptions',
    auth: [],
    summary: 'Payment gateway webhook',
    description: 'Authenticated by the gateway’s signature header.',
  },
  // Notifications
  {
    method: 'get',
    path: '/api/notifications',
    tag: 'Notifications',
    summary: 'Notification history',
    query: [q('unread', 'boolean'), q('page', 'integer')],
  },
  {
    method: 'get',
    path: '/api/notifications/unread-count',
    tag: 'Notifications',
    summary: 'Unread badge count',
  },
  {
    method: 'patch',
    path: '/api/notifications/{id}',
    tag: 'Notifications',
    summary: 'Mark one notification read/unread',
    body: { type: 'object', properties: { read: { type: 'boolean' } } },
  },
  {
    method: 'post',
    path: '/api/notifications/read-all',
    tag: 'Notifications',
    summary: 'Mark every notification read',
  },
  {
    method: 'get',
    path: '/api/realtime/token',
    tag: 'Realtime',
    summary: 'Short-lived token for the Socket.IO connection',
    description:
      'Pass it as `auth.token` when connecting. Events: `notification:created`, `notification:changed`, `chat:message`, `chat:status`, `chat:typing`.',
  },
  // Support chat
  { method: 'get', path: '/api/support/tickets', tag: 'Support chat', summary: 'My conversations' },
  {
    method: 'post',
    path: '/api/support/tickets',
    tag: 'Support chat',
    summary: 'Start a conversation',
    body: {
      type: 'object',
      required: ['topic', 'subject', 'message'],
      properties: {
        topic: { type: 'string' },
        subject: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
  {
    method: 'get',
    path: '/api/support/tickets/{id}',
    tag: 'Support chat',
    summary: 'Conversation history',
    codes: { 404: 'Not found' },
  },
  {
    method: 'post',
    path: '/api/support/tickets/{id}/messages',
    tag: 'Support chat',
    summary: 'Send a message',
    description:
      'Refused with `409 resolved` once the ticket is resolved; the customer must start a new request. An agent can reopen it.',
    codes: { 409: 'Ticket is resolved' },
    body: {
      type: 'object',
      required: ['message'],
      properties: { message: { type: 'string', maxLength: 2000 } },
    },
  },
  {
    method: 'post',
    path: '/api/support/tickets/{id}/resolve',
    tag: 'Support chat',
    summary: 'Mark the conversation resolved',
  },
  {
    method: 'post',
    path: '/api/support/staff/tickets/{number}/reply',
    tag: 'Support chat',
    auth: ['serviceKey'],
    summary: 'Agent reply (Admin Portal → User App)',
    description: 'Server-to-server. `Authorization: Bearer <SUPPORT_API_KEY>`.',
    body: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
        status: { enum: ['open', 'pending', 'resolved'] },
      },
    },
  },
  // Settings / account
  {
    method: 'get',
    path: '/api/settings',
    tag: 'Account',
    summary: 'Profile, preferences and notification consent',
  },
  {
    method: 'patch',
    path: '/api/settings/profile',
    tag: 'Account',
    summary: 'Update profile',
    body: { type: 'object' },
  },
  {
    method: 'patch',
    path: '/api/settings/preferences',
    tag: 'Account',
    summary: 'Update preferences and notification channels',
    description: 'Announcements respect the channels (email, push, SMS) the user has opted into.',
    body: { type: 'object' },
  },
  {
    method: 'post',
    path: '/api/settings/password',
    tag: 'Account',
    summary: 'Change password',
    body: {
      type: 'object',
      required: ['current', 'next'],
      properties: { current: { type: 'string' }, next: { type: 'string' } },
    },
  },
  {
    method: 'delete',
    path: '/api/settings/sessions/{id}',
    tag: 'Account',
    summary: 'Sign out a device',
  },
  { method: 'get', path: '/api/settings/export', tag: 'Account', summary: 'Export my data' },
  { method: 'delete', path: '/api/settings/account', tag: 'Account', summary: 'Delete my account' },
  // Money data
  { method: 'get', path: '/api/dashboard', tag: 'Finance', summary: 'Dashboard summary' },
  {
    method: 'get',
    path: '/api/transactions',
    tag: 'Finance',
    summary: 'List transactions',
    query: [q('q'), q('category'), q('type'), q('page', 'integer')],
  },
  {
    method: 'post',
    path: '/api/transactions',
    tag: 'Finance',
    summary: 'Add a transaction',
    body: { type: 'object' },
  },
  {
    method: 'patch',
    path: '/api/transactions/{id}',
    tag: 'Finance',
    summary: 'Edit a transaction',
    body: { type: 'object' },
  },
  {
    method: 'delete',
    path: '/api/transactions/{id}',
    tag: 'Finance',
    summary: 'Delete a transaction',
  },
  { method: 'get', path: '/api/budgets', tag: 'Finance', summary: 'Budgets' },
  { method: 'get', path: '/api/recurring', tag: 'Finance', summary: 'Recurring payments' },
  { method: 'get', path: '/api/reports', tag: 'Finance', summary: 'Reports', query: [q('range')] },
];

export const userSpec = () =>
  buildSpec({
    title: 'Kanaku User Application API',
    description:
      'APIs behind the User App (BFF). Browsers use the HttpOnly session cookie; real-time features use Socket.IO authenticated with `/api/realtime/token`. Categories, plans and coupons are owned by the Admin Portal and only read here. Responses are `{ data }` on success and `{ error: { code, message } }` on failure.',
    servers: [{ url: '/', description: 'User App origin' }],
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'kanaku_session' },
      serviceKey: {
        type: 'http',
        scheme: 'bearer',
        description: 'Shared secret for server-to-server calls',
      },
    },
    defaultAuth: ck,
    tags: [
      'System',
      'Categories',
      'Subscriptions',
      'Notifications',
      'Realtime',
      'Help',
      'Support chat',
      'Integration (Admin Portal)',
      'Account',
      'Finance',
    ].map((name) => ({ name, description: '' })),
    ops: [
      ...ops.filter(
        (o) =>
          !extraOps.some((e) => e.method === o.method && e.path === o.path) &&
          !o.path.startsWith('/api/support/staff'),
      ),
      ...extraOps,
    ],
  });
