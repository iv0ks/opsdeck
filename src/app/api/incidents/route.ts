// GET /api/incidents — open and recent incidents. Any signed-in staff member may
// read them.
import type { NextRequest } from 'next/server';
import { json, requireSession } from '@/lib/api';
import { listIncidents } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  return json({ incidents: await listIncidents() });
}
