import { z } from 'zod';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX = 2 * 1024 * 1024;
const link = z
  .string()
  .trim()
  .regex(/^(\/|#|https:\/\/)/, 'Use /path, #anchor or https:// link');
const istToUtc = (d: string, t: string) => new Date(`${d}T${t}:00+05:30`).toISOString(); // IST has no DST

export const announcementBody = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(80, 'Title max 80 characters'),
    message: z.string().trim().min(1, 'Message is required').max(500, 'Message max 500 characters'),
    ctaLabel: z.string().trim().max(24).default(''),
    ctaHref: z.string().trim().default(''),
    image: z
      .object({
        dataUrl: z.string().max(3_200_000),
        alt: z.string().trim().min(1, 'Alt text is required for the image').max(140),
        name: z.string().max(120),
        size: z.number().max(IMAGE_MAX, 'Image must be 2 MB or smaller'),
      })
      .nullable()
      .default(null),
    audience: z.enum(['all', 'starter', 'pro', 'inactive30', 'custom']),
    customUserIds: z.array(z.string()).default([]),
    channels: z
      .array(z.enum(['inapp', 'banner', 'modal', 'email', 'push', 'sms']))
      .min(1, 'Choose at least one channel'),
    sendNow: z.boolean(),
    publishDate: z.string().optional(),
    publishTime: z.string().optional(), // IST
    expiryDate: z.string().optional(),
    expiryTime: z.string().optional(),
    trigger: z.enum(['next_login', 'dashboard', 'page', 'inactivity']).default('next_login'),
    triggerValue: z.string().max(100).default(''),
    frequency: z.enum(['once', 'session', 'until_dismissed']).default('once'),
    draft: z.boolean().default(false),
  })
  .refine((v) => !v.ctaLabel || link.safeParse(v.ctaHref).success, {
    message: 'Button link must be /path, #anchor or https://',
    path: ['ctaHref'],
  })
  .refine((v) => v.draft || v.sendNow || (v.publishDate && v.publishTime), {
    message: 'Choose a publish date and time (IST)',
    path: ['publishDate'],
  })
  .refine((v) => v.audience !== 'custom' || v.customUserIds.length > 0, {
    message: 'A custom segment needs at least one user',
    path: ['audience'],
  })
  .refine((v) => v.trigger !== 'page' || v.triggerValue.startsWith('/'), {
    message: 'Enter the page path, e.g. /reports',
    path: ['triggerValue'],
  })
  .refine((v) => v.trigger !== 'inactivity' || Number(v.triggerValue) > 0, {
    message: 'Enter the number of inactive days',
    path: ['triggerValue'],
  })
  .refine(
    (v) =>
      v.draft ||
      v.sendNow ||
      !v.publishDate ||
      !v.publishTime ||
      new Date(istToUtc(v.publishDate, v.publishTime)) > new Date(),
    { message: 'Publish time must be in the future', path: ['publishDate'] },
  )
  .refine(
    (v) =>
      !v.expiryDate ||
      !v.expiryTime ||
      v.sendNow ||
      !v.publishDate ||
      !v.publishTime ||
      istToUtc(v.expiryDate, v.expiryTime) > istToUtc(v.publishDate, v.publishTime),
    { message: 'Expiry must be after the publish time', path: ['expiryDate'] },
  );
export type AnnouncementInput = z.infer<typeof announcementBody>;
export { istToUtc };
