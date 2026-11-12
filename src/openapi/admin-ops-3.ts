import { announcementBody } from '@/features/announcements/schemas/announcements';

import { siteConfigSchema } from '@/features/cms/schemas/site';
import { messageBody, patchTicket } from '@/features/support/schemas/support';

import type { Op } from './dsl';

const svc = ['serviceKey'];

export const ops: Op[] = [
  // ---- Landing page (CMS)
  {
    method: 'get',
    path: '/api/cms',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Draft, published version and history',
  },
  {
    method: 'put',
    path: '/api/cms/draft',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Save the draft',
    body: siteConfigSchema,
  },
  {
    method: 'post',
    path: '/api/cms/publish',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Publish the draft as a new immutable version',
  },
  {
    method: 'post',
    path: '/api/cms/restore',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Load an old version into the draft',
    body: { type: 'object', required: ['version'], properties: { version: { type: 'integer' } } },
  },
  {
    method: 'get',
    path: '/api/cms/extras',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Navigation, steps, call-to-action, footer links, labels and SEO',
  },
  {
    method: 'put',
    path: '/api/cms/extras',
    tag: 'Landing page',
    perm: 'cms.write',
    summary: 'Replace the structural landing content',
    body: { type: 'object' },
  },
  // ---- Announcements
  {
    method: 'get',
    path: '/api/announcements',
    tag: 'Announcements',
    perm: 'announcements.write',
    summary: 'List announcements with status, reach and delivery',
  },
  {
    method: 'post',
    path: '/api/announcements',
    tag: 'Announcements',
    perm: 'announcements.write',
    summary: 'Create, schedule or publish an announcement',
    description:
      'On publish it is delivered to the audience over the chosen channels (in-app notification, e-mail, push, SMS).',
    body: announcementBody,
  },
  {
    method: 'put',
    path: '/api/announcements/{id}',
    tag: 'Announcements',
    perm: 'announcements.write',
    summary: 'Edit an announcement',
    body: announcementBody,
  },
  {
    method: 'post',
    path: '/api/announcements/{id}/cancel',
    tag: 'Announcements',
    perm: 'announcements.write',
    summary: 'Cancel a scheduled announcement',
  },
  // ---- Support
  {
    method: 'get',
    path: '/api/support/tickets',
    tag: 'Support',
    perm: 'support.manage',
    summary: 'List conversations',
    query: [{ name: 'status' }, { name: 'q' }, { name: 'assignee' }],
  },
  {
    method: 'get',
    path: '/api/support/tickets/{id}',
    tag: 'Support',
    perm: 'support.manage',
    summary: 'Conversation with full history',
  },
  {
    method: 'patch',
    path: '/api/support/tickets/{id}',
    tag: 'Support',
    perm: 'support.manage',
    summary: 'Change status, priority or assignee',
    body: patchTicket,
  },
  {
    method: 'post',
    path: '/api/support/tickets/{id}/messages',
    tag: 'Support',
    perm: 'support.manage',
    summary: 'Reply to the user (delivered in real time)',
    body: messageBody,
  },
  {
    method: 'post',
    path: '/api/support/tickets/{id}/typing',
    tag: 'Support',
    perm: 'support.manage',
    summary: 'Signal that an agent is typing',
  },
  // ---- Audit / dashboard
  {
    method: 'get',
    path: '/api/audit',
    tag: 'Audit & dashboard',
    perm: 'audit.view',
    summary: 'Query the append-only audit log',
    query: [
      { name: 'actor' },
      { name: 'action' },
      { name: 'from' },
      { name: 'to' },
      { name: 'page', type: 'integer' },
    ],
  },
  {
    method: 'get',
    path: '/api/audit/alerts',
    tag: 'Audit & dashboard',
    perm: 'audit.view',
    summary: 'Security alerts (failed sign-ins, denials)',
  },
  {
    method: 'get',
    path: '/api/audit/export',
    tag: 'Audit & dashboard',
    perm: 'audit.view',
    summary: 'Export the audit log as CSV',
  },
  {
    method: 'get',
    path: '/api/dashboard',
    tag: 'Audit & dashboard',
    perm: 'dashboard.view',
    summary: 'Live KPIs',
    query: [
      { name: 'range', enum: ['7d', '30d', '90d', '12m', 'custom'] },
      { name: 'from' },
      { name: 'to' },
    ],
  },
  // ---- Integration API (v1)
  {
    method: 'get',
    path: '/api/v1/public/landing',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Landing page configuration',
    description:
      'Published CMS content merged with live plans. Cached 60 s. Consumed by the Landing Page.',
    res: {
      type: 'object',
      properties: {
        site: {},
        theme: {},
        notFound: {},
        sections: { type: 'array', items: { type: 'object' } },
      },
    },
    codes: { 404: 'Nothing published yet' },
  },
  {
    method: 'get',
    path: '/api/v1/public/categories',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Enabled categories',
    description: 'The User App only displays these; it cannot create or edit categories.',
  },
  {
    method: 'get',
    path: '/api/v1/public/plans',
    tag: 'Integration (v1)',
    auth: [],
    summary: 'Visible, live pricing plans',
  },
  {
    method: 'post',
    path: '/api/v1/service/coupons/validate',
    tag: 'Integration (v1)',
    auth: svc,
    summary: 'Validate a coupon for a plan',
    description: 'Server-to-server. `Authorization: Bearer <SERVICE_API_KEY>`.',
    body: {
      type: 'object',
      required: ['code', 'plan'],
      properties: {
        code: { type: 'string' },
        plan: { type: 'string', example: 'pro' },
        interval: { enum: ['monthly', 'yearly'] },
      },
    },
  },
];
