// Signed session cookie.
//
// The session proves *who logged in*, and it is implemented correctly: an
// HMAC-signed token that cannot be edited. It deliberately does NOT carry the
// role — the role is read from the database on each request, so it can't go
// stale. The lab is not in the session; it is in the admin routes that never
// ask what role it resolves to.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config';

export const SESSION_COOKIE = 'opsdeck_session';

const MAX_AGE_SECONDS = 60 * 60 * 8;

export type Session = { userId: number; exp: number };

function sign(payload: string): string {
  return createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

export function createSessionToken(userId: number, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ userId, exp } satisfies Session)).toString(
    'base64url',
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
    if (!Number.isInteger(session.userId) || session.exp * 1000 < now) return null;
    return session;
  } catch {
    return null;
  }
}

export const sessionMaxAge = MAX_AGE_SECONDS;
