import { describeDevice } from '@/utils/device';
import { route, HttpError } from '@/lib/bff';
import { newSession, writeSession } from '@/lib/session';
import { activate, mustChangePassword, needsMfaSetup, registerSession } from '@/services/identity';

// Dashboard access only after BOTH password change and MFA enrolment are done.
export const POST = route({ stages: ['setup'] }, async ({ session, audit, req }) => {
  if (await mustChangePassword(session!.id))
    throw new HttpError(409, 'Choose a new password first', 'setup_incomplete');
  if (await needsMfaSetup(session!.id))
    throw new HttpError(409, 'Set up two-step verification first', 'setup_incomplete');
  await activate(session!.id);
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
  await audit('Completed first-time setup', `Account · ${session!.email}`);
  return { next: '/' };
});
