// GET /api/admin/users — the staff directory with roles. Intended for admins.
import type { NextRequest } from 'next/server';
import { json, requireSession } from '@/lib/api';
import { listUsers } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  // Authentication: a valid signed session must exist …
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  // ⚠️ MISSING ROLE CHECK (read). … but nobody asks whether this user is an
  // admin. The Admin console is hidden from members in the UI, and that is the
  // only thing standing between them and this response.
  return json({ users: await listUsers() });
}
