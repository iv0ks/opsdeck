// GET /api/admin/secrets — the break-glass credentials. Intended for admins.
import type { NextRequest } from 'next/server';
import { json, requireSession } from '@/lib/api';
import { listSecrets } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  // Authentication only …
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  // ⚠️ MISSING ROLE CHECK (read) — the most sensitive data in the app is
  // returned to any signed-in user who asks for it.
  return json({ secrets: await listSecrets() });
}
