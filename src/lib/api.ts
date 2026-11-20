// Small helpers shared by the route handlers.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken, type Session } from './session';
import { findUserById } from './ops';
import type { User } from '@/db/schema';

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function error(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Authentication only: "is there a valid, correctly signed session?". It says
// nothing about what the caller is allowed to do.
export function requireSession(
  request: NextRequest,
): { ok: true; session: Session } | { ok: false; response: NextResponse } {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { ok: false, response: error('authentication required', 401) };
  return { ok: true, session };
}

// Authorization: authenticated AND holding the admin role, checked against the
// database. This is what every /api/admin/* route should call. Only ONE of them
// does — the rest are the lab.
export async function requireAdmin(
  request: NextRequest,
): Promise<{ ok: true; user: User } | { ok: false; response: NextResponse }> {
  const auth = requireSession(request);
  if (!auth.ok) return auth;

  const user = await findUserById(auth.session.userId);
  if (!user) return { ok: false, response: error('authentication required', 401) };
  if (user.role !== 'admin') return { ok: false, response: error('admin role required', 403) };
  return { ok: true, user };
}

// Parse a positive integer from untrusted input, or return null.
export function toId(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
