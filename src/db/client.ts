// Database client: a single postgres.js pool wrapped by Drizzle.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

// Next.js dev mode re-evaluates modules on every hot reload; keep the pool on
// globalThis so reloads don't leak connections.
const globalForDb = globalThis as unknown as { __opsdeckSql?: ReturnType<typeof postgres> };

// postgres.js connects lazily; importing this module opens no socket until the
// first query. `max: 5` keeps the pool small — this is a lab.
export const sql = globalForDb.__opsdeckSql ?? postgres(config.databaseUrl, { max: 5 });
if (process.env.NODE_ENV !== 'production') globalForDb.__opsdeckSql = sql;

export const db = drizzle(sql, { schema });
