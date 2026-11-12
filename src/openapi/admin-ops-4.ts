import type { Op } from './dsl';

const svc = ['serviceKey'];
export const ops: Op[] = [
  {
    method: 'get',
    path: '/api/notifications',
    tag: 'Notifications & realtime',
    summary: 'My notifications and unread count',
    description:
      'New support messages and assignments. Also pushed live as `notification:new` over the realtime socket.',
  },
  {
    method: 'post',
    path: '/api/notifications',
    tag: 'Notifications & realtime',
    summary: 'Mark one (`id`) or all notifications read',
    body: { type: 'object', properties: { id: { type: 'string' } } },
  },
  {
    method: 'get',
    path: '/api/realtime/token',
    tag: 'Notifications & realtime',
    summary: 'Short-lived Socket.IO connection token (5 min)',
    description:
      'Connect with `io(url, { auth: { token } })`. Events: `chat:updated`, `chat:typing`, `notification:new`, `notification:read`. Agents (`support.manage`) also join the staff room. Clients send `typing { ticketId }`.',
  },
  {
    method: 'get',
    path: '/api/v1/service/coupons',
    tag: 'Integration (v1)',
    auth: svc,
    summary: 'Coupons to show users at checkout',
    description:
      'Coupons that are active, in date, not fully redeemed and valid for the plan and billing period. Coupons the admin unticked “show in checkout” (private codes) never appear.',
    query: [{ name: 'plan' }, { name: 'interval', enum: ['monthly', 'yearly'] }],
  },
  {
    method: 'post',
    path: '/api/v1/service/users/sync',
    tag: 'Integration (v1)',
    auth: svc,
    summary: 'Upsert a user mirrored from the User App',
    description:
      'Keeps the directory, announcement audiences and consent flags (`notify`) current. Idempotent by `userId`.',
    body: {
      type: 'object',
      required: ['userId', 'name', 'email'],
      properties: {
        userId: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        plan: { enum: ['starter', 'pro_monthly', 'pro_yearly'] },
        status: { enum: ['invited', 'active', 'inactive', 'suspended'] },
        notify: {
          type: 'object',
          properties: {
            inApp: { type: 'boolean' },
            email: { type: 'boolean' },
            push: { type: 'boolean' },
            sms: { type: 'boolean', description: 'SMS is opt-in only' },
          },
        },
        pushTokens: {
          type: 'array',
          items: { type: 'string' },
          description: 'FCM registration tokens',
        },
      },
    },
    codes: { 409: 'Email belongs to another user' },
  },
  {
    method: 'post',
    path: '/api/v1/service/payments/record',
    tag: 'Integration (v1)',
    auth: svc,
    summary: 'Record a payment (idempotent by `id`)',
    description: 'Feeds revenue, invoices and coupon redemption counts. Replays are ignored.',
    body: {
      type: 'object',
      required: ['id', 'userId', 'user', 'plan', 'amount'],
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        user: { type: 'string' },
        plan: { type: 'string' },
        amount: { type: 'number', description: 'Rupees incl. GST' },
        method: { type: 'string' },
        status: { enum: ['paid', 'failed', 'refunded'] },
        couponCode: { type: 'string' },
      },
    },
  },
  {
    method: 'post',
    path: '/api/v1/service/jobs/tick',
    tag: 'Integration (v1)',
    auth: svc,
    summary: 'Publish due announcements and send pending deliveries',
    description:
      'Called every ~30 s by the realtime service. Retries transient failures with exponential back-off (1 min, 5 min, 30 min; 4 attempts).',
  },
  {
    method: 'get',
    path: '/api/v1/service/support/tickets',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'A user’s conversations',
    query: [{ name: 'userId', required: true }],
  },
  {
    method: 'post',
    path: '/api/v1/service/support/tickets',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'Start a conversation',
    description: 'Auto-assigns an online agent and alerts staff in real time.',
    body: {
      type: 'object',
      required: ['userId', 'name', 'topic', 'subject', 'message'],
      properties: {
        userId: { type: 'string' },
        name: { type: 'string' },
        plan: { type: 'string' },
        topic: { type: 'string' },
        subject: { type: 'string', maxLength: 120 },
        message: { type: 'string', maxLength: 4000 },
      },
    },
  },
  {
    method: 'get',
    path: '/api/v1/service/support/tickets/{id}',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'Conversation (internal notes are never included)',
    query: [{ name: 'userId', required: true }],
    codes: { 404: 'Not found or not this user’s' },
  },
  {
    method: 'post',
    path: '/api/v1/service/support/tickets/{id}/messages',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'User sends a message',
    body: {
      type: 'object',
      required: ['userId', 'message'],
      properties: { userId: { type: 'string' }, message: { type: 'string', maxLength: 4000 } },
    },
    codes: {
      404: 'Not found',
      409: 'Ticket is resolved/closed: the customer can no longer message',
    },
  },
  {
    method: 'post',
    path: '/api/v1/service/support/tickets/{id}/read',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'Delivery / read receipt for agent messages',
    body: {
      type: 'object',
      required: ['userId'],
      properties: { userId: { type: 'string' }, kind: { enum: ['delivered', 'read'] } },
    },
  },
  {
    method: 'post',
    path: '/api/v1/service/support/tickets/{id}/resolve',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'User marks it resolved (optional 1–5 rating)',
    body: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
      },
    },
    codes: { 409: 'Invalid state' },
  },
  {
    method: 'get',
    path: '/api/public/site',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Published CMS configuration (raw, legacy)',
    description:
      'Unmerged published site config. New consumers should use `/api/v1/public/landing`.',
  },
  {
    method: 'get',
    path: '/api/public/site',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Published CMS configuration (raw, legacy)',
    description:
      'Unmerged published site config. New consumers should use `/api/v1/public/landing`.',
  },
  {
    method: 'get',
    path: '/api/legal',
    tag: 'Legal documents',
    perm: 'cms.write',
    summary: 'Draft and published state of the Privacy Policy and Terms',
  },
  {
    method: 'put',
    path: '/api/legal/{slug}/draft',
    tag: 'Legal documents',
    perm: 'cms.write',
    summary: 'Save a draft (`slug`: privacy | terms)',
    body: {
      type: 'object',
      required: ['title', 'sections'],
      properties: {
        title: { type: 'string', maxLength: 80 },
        summary: { type: 'string', maxLength: 300 },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title', 'blocks'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              blocks: {
                type: 'array',
                items: {
                  oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                },
                description: 'A string is a paragraph; an array of strings is a bulleted list',
              },
            },
          },
        },
      },
    },
    codes: { 404: 'Unknown document' },
  },
  {
    method: 'post',
    path: '/api/legal/{slug}/publish',
    tag: 'Legal documents',
    perm: 'cms.write',
    summary: 'Publish the draft as a new immutable version',
    description:
      'Refreshes the website’s cached copy immediately. The User App picks it up within a minute.',
    codes: { 404: 'Unknown document' },
  },
  {
    method: 'get',
    path: '/api/v1/public/legal/{slug}',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Published Privacy Policy / Terms & Conditions',
    description:
      '`{ title, summary, updated, version, sections[] }`. Drafts are never exposed. Consumed by the User App and the Landing Page.',
    codes: { 404: 'Unknown or not published' },
  },
  {
    method: 'get',
    path: '/api/v1/service/support/availability',
    tag: 'Support chat (v1)',
    auth: svc,
    summary: 'Is an agent available for live chat?',
    description:
      'Eligible agents (permission `support.manage`) with a live console session. Returns first names only, at most 3.',
    res: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            online: { type: 'boolean' },
            count: { type: 'integer' },
            agents: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' } } },
            },
          },
        },
      },
    },
  },
];
