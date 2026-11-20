// POST /api/incidents/:id/ack — acknowledge an incident. Every on-call engineer
// may do this, so a valid session is exactly the right level of access.
import type { NextRequest } from 'next/server';
import { error, json, requireSession, toId } from '@/lib/api';
import { acknowledgeIncident } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const id = toId((await context.params).id);
  if (!id) return error('invalid incident id', 400);

  if (!(await acknowledgeIncident(id, auth.session.userId))) {
    return error('incident not found', 404);
  }
  return json({ ok: true });
}
