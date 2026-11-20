// Seed script — idempotent.
//
// Three staff accounts, eight services, five incidents and three break-glass
// secrets. Every boot resets roles, incident state and secrets to the known
// starting point, so a lab you broke (alice promoted to admin, incidents
// acknowledged) is fixed by restarting the container.
//
//   alice (id 1, you)        role: member   — Platform on-call
//   bob   (id 2, the admin)  role: admin    — Head of Infrastructure
//   carol (id 3, bystander)  role: member   — Payments on-call
//
// The FLAG is the value of the `break-glass-token` secret, which only an admin
// is meant to read.
import { db, sql } from './client';
import { incidents, secrets, services, users } from './schema';
import { hashPassword } from '../lib/password';
import { config } from '../config';

const seedUsers = [
  {
    id: 1,
    username: 'alice',
    password: 'password123',
    displayName: 'Alice Martins',
    role: 'member',
    team: 'Platform',
  },
  {
    id: 2,
    username: 'bob',
    password: 'correct-horse-battery-staple',
    displayName: 'Bob Keller',
    role: 'admin',
    team: 'Infrastructure',
  },
  {
    id: 3,
    username: 'carol',
    password: 'hunter2hunter2',
    displayName: 'Carol Nwosu',
    role: 'member',
    team: 'Payments',
  },
];

const seedServices = [
  {
    id: 1,
    name: 'api-gateway',
    description: 'Public edge: routing, rate limiting, TLS termination.',
    status: 'operational',
    uptime: '99.99',
    latencyMs: 42,
    owner: 'Platform',
  },
  {
    id: 2,
    name: 'auth-service',
    description: 'Sessions, SSO and API tokens.',
    status: 'operational',
    uptime: '99.97',
    latencyMs: 61,
    owner: 'Platform',
  },
  {
    id: 3,
    name: 'billing-core',
    description: 'Invoices, subscriptions and payment retries.',
    status: 'degraded',
    uptime: '99.82',
    latencyMs: 380,
    owner: 'Payments',
  },
  {
    id: 4,
    name: 'search-index',
    description: 'Full-text index behind the customer search box.',
    status: 'operational',
    uptime: '99.95',
    latencyMs: 88,
    owner: 'Discovery',
  },
  {
    id: 5,
    name: 'notifications',
    description: 'Email, SMS and push fan-out.',
    status: 'degraded',
    uptime: '99.71',
    latencyMs: 540,
    owner: 'Growth',
  },
  {
    id: 6,
    name: 'media-cdn',
    description: 'Image and asset delivery via the CDN origin.',
    status: 'operational',
    uptime: '99.99',
    latencyMs: 24,
    owner: 'Platform',
  },
  {
    id: 7,
    name: 'data-warehouse',
    description: 'Nightly ETL and the analytics replica.',
    status: 'operational',
    uptime: '99.90',
    latencyMs: 210,
    owner: 'Data',
  },
  {
    id: 8,
    name: 'legacy-reports',
    description: 'The old PDF report generator. Scheduled for retirement.',
    status: 'outage',
    uptime: '97.40',
    latencyMs: 0,
    owner: 'Data',
  },
];

const seedIncidents = [
  {
    id: 1,
    serviceId: 3,
    title: 'Payment retries queueing behind a slow card processor',
    severity: 'sev2',
  },
  {
    id: 2,
    serviceId: 5,
    title: 'Push notifications delayed by 8–10 minutes',
    severity: 'sev3',
  },
  {
    id: 3,
    serviceId: 8,
    title: 'legacy-reports returns 502 on every export',
    severity: 'sev2',
  },
  {
    id: 4,
    serviceId: 2,
    title: 'Elevated login latency from the EU region',
    severity: 'sev3',
  },
  {
    id: 5,
    serviceId: 1,
    title: 'Certificate for status.example.com expires in 6 days',
    severity: 'sev3',
  },
];

const seedSecrets = [
  {
    id: 1,
    name: 'break-glass-token',
    value: config.flag,
    description: 'Emergency super-admin token. Use only when SSO is down. Rotate after use.',
  },
  {
    id: 2,
    name: 'grafana-service-key',
    value: 'glsa_7Qm2xV9dKfL3pTzR8cYh1WnB4uJe6AoS',
    description: 'Read/write key for the production Grafana service account.',
  },
  {
    id: 3,
    name: 'pagerduty-routing-key',
    value: 'R0UT1NGK3Y-9f2c41d7a8b3e65f0c1d2a4b',
    description: 'Events API v2 routing key for the primary on-call schedule.',
  },
];

async function main(): Promise<void> {
  console.log('[seed] seeding staff …');
  for (const u of seedUsers) {
    const passwordHash = hashPassword(u.password);
    await db
      .insert(users)
      .values({
        id: u.id,
        username: u.username,
        passwordHash,
        displayName: u.displayName,
        role: u.role,
        team: u.team,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: u.username,
          passwordHash,
          displayName: u.displayName,
          role: u.role,
          team: u.team,
        },
      });
  }

  console.log('[seed] seeding services …');
  for (const s of seedServices) {
    await db
      .insert(services)
      .values(s)
      .onConflictDoUpdate({
        target: services.id,
        set: {
          name: s.name,
          description: s.description,
          status: s.status,
          uptime: s.uptime,
          latencyMs: s.latencyMs,
          owner: s.owner,
        },
      });
  }

  console.log('[seed] seeding incidents …');
  for (const i of seedIncidents) {
    await db
      .insert(incidents)
      .values({ ...i, status: 'open', acknowledgedBy: null })
      .onConflictDoUpdate({
        target: incidents.id,
        set: {
          serviceId: i.serviceId,
          title: i.title,
          severity: i.severity,
          status: 'open',
          acknowledgedBy: null,
        },
      });
  }

  console.log('[seed] seeding break-glass secrets …');
  for (const s of seedSecrets) {
    await db
      .insert(secrets)
      .values(s)
      .onConflictDoUpdate({
        target: secrets.id,
        set: { name: s.name, value: s.value, description: s.description },
      });
  }

  console.log(
    "[seed] done. staff: alice (member), bob (admin), carol (member). flag seeded as the 'break-glass-token' secret.",
  );
  await sql.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
