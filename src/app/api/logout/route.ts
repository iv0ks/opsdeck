// POST /api/logout — clear the session cookie.
import { json } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  const response = json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
