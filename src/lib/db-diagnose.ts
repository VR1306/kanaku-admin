import 'server-only';

/**
 * Turns a MongoDB driver error into a plain-English cause a deployer can act on. Never includes the connection
 * string, user name or any secret: only the category of failure.
 */
export function describeDbProblem(error: unknown): { code: string; message: string } {
  const e = error as { name?: string; code?: number | string; message?: string };
  const msg = e?.message ?? '';
  if (msg.includes('MONGODB_URI is not set'))
    return { code: 'uri_missing', message: 'MONGODB_URI is not set in this environment.' };
  if (e?.name === 'MongoParseError' || /Invalid scheme|Invalid connection string/i.test(msg))
    return {
      code: 'uri_invalid',
      message:
        'MONGODB_URI is not a valid connection string (it must start with mongodb+srv:// or mongodb://). Is a <PLACEHOLDER> still there?',
    };
  if (e?.code === 18 || /auth(entication)? failed|bad auth/i.test(msg))
    return {
      code: 'auth_failed',
      message:
        'The database rejected the login: wrong username or password in MONGODB_URI (a rotated password must be updated here, and special characters in it must be URL-encoded).',
    };
  if (
    e?.name === 'MongoServerSelectionError' ||
    e?.name === 'MongoNetworkError' ||
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timed out/i.test(msg)
  )
    return {
      code: 'unreachable',
      message:
        'Cannot reach the cluster. In Atlas: Network Access must allow 0.0.0.0/0 (Vercel uses changing IPs), and the cluster must not be paused. Also check the host name in MONGODB_URI.',
    };
  return {
    code: 'unknown',
    message: `Unexpected database error (${e?.name ?? 'Error'}). Check the function logs in Vercel.`,
  };
}
