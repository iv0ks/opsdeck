// Database schema (Drizzle ORM).
//
// opsdeck is the internal operations dashboard of a small SaaS company. Every
// staff member has a `role`: 'member' (on-call engineers, read + acknowledge) or
// 'admin' (manage people, rotate break-glass credentials, override service
// status).
//
// The role is stored server-side in `users.role` and is returned by `/api/me`.
// The UI uses it to decide which controls to *draw*. The flaw (CWE-284) is that
// the admin API routes never look at it: hiding a button is not access control.
import { pgTable, integer, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  // 'member' | 'admin'
  role: text('role').notNull().default('member'),
  team: text('team').notNull(),
});

export const services = pgTable('services', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  // 'operational' | 'degraded' | 'outage'
  status: text('status').notNull().default('operational'),
  uptime: text('uptime').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  owner: text('owner').notNull(),
});

export const incidents = pgTable('incidents', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id')
    .notNull()
    .references(() => services.id),
  title: text('title').notNull(),
  // 'sev1' | 'sev2' | 'sev3'
  severity: text('severity').notNull(),
  // 'open' | 'acknowledged' | 'resolved'
  status: text('status').notNull().default('open'),
  acknowledgedBy: integer('acknowledged_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Break-glass credentials: the keys to the kingdom, meant for admins only. The
// FLAG is the value of the `break-glass-token` entry.
export const secrets = pgTable('secrets', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
  description: text('description').notNull(),
});

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Secret = typeof secrets.$inferSelect;

export const ROLES = ['member', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const SERVICE_STATUSES = ['operational', 'degraded', 'outage'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
