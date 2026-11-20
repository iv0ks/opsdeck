// Data access for the dashboard. None of these functions check who is asking —
// the route handlers decide that (or, in the lab, forget to).
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { incidents, secrets, services, users, type Role, type ServiceStatus } from '@/db/schema';

export async function findUserByUsername(username: string) {
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row;
}

export async function findUserById(id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function listServices() {
  return db.select().from(services).orderBy(asc(services.id));
}

export async function listIncidents() {
  return db
    .select({
      id: incidents.id,
      title: incidents.title,
      severity: incidents.severity,
      status: incidents.status,
      acknowledgedBy: incidents.acknowledgedBy,
      createdAt: incidents.createdAt,
      service: services.name,
    })
    .from(incidents)
    .innerJoin(services, eq(incidents.serviceId, services.id))
    .orderBy(desc(incidents.id));
}

export async function acknowledgeIncident(id: number, userId: number) {
  const [row] = await db
    .update(incidents)
    .set({ status: 'acknowledged', acknowledgedBy: userId })
    .where(eq(incidents.id, id))
    .returning({ id: incidents.id });
  return row !== undefined;
}

// --- admin operations -------------------------------------------------------

// Everything about a user except the password hash.
export async function listUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      team: users.team,
    })
    .from(users)
    .orderBy(asc(users.id));
}

export async function setUserRole(id: number, role: Role) {
  const [row] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    team: users.team,
  });
  return row;
}

export async function listSecrets() {
  return db.select().from(secrets).orderBy(asc(secrets.id));
}

export async function setServiceStatus(id: number, status: ServiceStatus) {
  const [row] = await db.update(services).set({ status }).where(eq(services.id, id)).returning();
  return row;
}
