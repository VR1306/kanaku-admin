import { after } from 'next/server';
import { route } from '@/lib/bff';
import { announcementBody } from '@/features/announcements/schemas/announcements';
import * as ann from '@/services/announcements';
import { dispatch, processPending } from '@/services/delivery';

export const GET = route({ permission: 'announcements.write' }, async () => ann.list());

export const POST = route(
  { permission: 'announcements.write', schema: announcementBody, rateLimit: 20 },
  async ({ body, audit }) => {
    const a = await ann.create(body);
    const s = ann.status(a);
    if (s === 'live') {
      // Published now: queue every (user × channel) delivery, then send in the background. Scheduled ones are picked up by the tick.
      await dispatch(a);
      after(() => processPending().then(() => undefined));
    }
    await audit(
      a.draft
        ? 'Saved announcement draft'
        : s === 'live'
          ? 'Sent announcement'
          : 'Scheduled announcement',
      `Announcement · ${a.title}`,
      {
        after: {
          audience: a.audience,
          channels: a.channels,
          publishAt: a.publishAt,
          expiresAt: a.expiresAt,
          reach: await ann.reachOf(a),
        },
      },
    );
    return ann.row(a);
  },
);
