// GET /api/me — who am I, and what role do I hold? Derived from the signed
// session plus the database. The UI reads `role` to decide whether to draw the
// Admin console. That is a *presentation* decision, not a security control.
import type { NextRequest } from 'next/server';
import { error, json, requireSession } from '@/lib/api';
import { findUserById } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const user = await findUserById(auth.session.userId);
  if (!user) return error('authentication required', 401);
  return json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      team: user.team,
    },
  });
}
