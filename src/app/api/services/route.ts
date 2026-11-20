// GET /api/services — the service catalogue and its live status. Any signed-in
// staff member may read it.
import type { NextRequest } from 'next/server';
import { json, requireSession } from '@/lib/api';
import { listServices } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  return json({ services: await listServices() });
}
