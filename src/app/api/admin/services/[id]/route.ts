// PATCH /api/admin/services/:id — manually override a service's status.
// Intended for admins — and this is the ONE admin route that enforces it.
import type { NextRequest } from 'next/server';
import { error, json, readJson, requireAdmin, toId } from '@/lib/api';
import { setServiceStatus } from '@/lib/ops';
import { SERVICE_STATUSES, type ServiceStatus } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  // ✅ SAFE: authenticated AND checked against the database for the admin role.
  // Compare with the three other /api/admin routes, which skip this line.
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const id = toId((await context.params).id);
  const body = await readJson(request);
  const status = body?.status;
  if (!id) return error('invalid service id', 400);
  if (typeof status !== 'string' || !SERVICE_STATUSES.includes(status as ServiceStatus)) {
    return error(`status must be one of: ${SERVICE_STATUSES.join(', ')}`, 400);
  }

  const service = await setServiceStatus(id, status as ServiceStatus);
  if (!service) return error('service not found', 404);
  return json({ service });
}
