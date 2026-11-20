// POST /api/login — verify credentials and start a session.
import type { NextRequest } from 'next/server';
import { error, json, readJson } from '@/lib/api';
import { findUserByUsername } from '@/lib/ops';
import { verifyPassword } from '@/lib/password';
import { createSessionToken, SESSION_COOKIE, sessionMaxAge } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await readJson(request);
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) return error('username and password are required', 400);

  const user = await findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return error('invalid credentials', 401);
  }

  const response = json({
    ok: true,
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAge,
  });
  return response;
}
