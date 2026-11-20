// PATCH /api/admin/users/:id — change a user's role. Intended for admins.
import type { NextRequest } from 'next/server';
import { error, json, readJson, requireSession, toId } from '@/lib/api';
import { setUserRole } from '@/lib/ops';
import { ROLES, type Role } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  // Authentication only …
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  // ⚠️ MISSING ROLE CHECK (write) — VERTICAL PRIVILEGE ESCALATION. Any signed-in
  // member can PATCH any user's role, including their own, to 'admin'.
  const id = toId((await context.params).id);
  const body = await readJson(request);
  const role = body?.role;
  if (!id) return error('invalid user id', 400);
  if (typeof role !== 'string' || !ROLES.includes(role as Role)) {
    return error(`role must be one of: ${ROLES.join(', ')}`, 400);
  }

  const user = await setUserRole(id, role as Role);
  if (!user) return error('user not found', 404);
  return json({ user });
}
