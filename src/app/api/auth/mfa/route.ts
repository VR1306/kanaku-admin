import { describeDevice } from '@/utils/device';
import { route, HttpError } from '@/lib/bff';
import { mfaSchema } from '@/features/auth/schemas/auth';
import { newSession, writeSession } from '@/lib/session';
import { attemptsLeft, registerSession, verifyMfa } from '@/services/identity';

export const POST = route(
  { stages: ['mfa'], schema: mfaSchema, rateLimit: 30 },
  async ({ body, session, audit, req }) => {
    const r = await verifyMfa(session!.id, body.code);
    if (r === 'locked') {
      await audit('MFA locked', `Account · ${session!.email}`, { result: 'failed' });
      throw new HttpError(423, 'Too many attempts. Verification locked for 15 minutes.', 'locked');
    }
    if (r !== 'ok') {
      await audit('MFA failed', `Account · ${session!.email}`, { result: 'failed' });
      throw new HttpError(
        401,
        `That code is incorrect · ${await attemptsLeft(session!.id)} attempts left`,
        'invalid_code',
      );
    }
    const next = newSession(
      { id: session!.id, name: session!.name, email: session!.email, role: session!.role },
      'active',
      session!.rem,
    );
    await registerSession(
      next.id,
      next.sid,
      describeDevice(req.headers.get('user-agent') ?? ''),
      req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    );
    await writeSession(next);
    await audit('Signed in', `Session · ${session!.email}`);
    return { next: '/' };
  },
);
