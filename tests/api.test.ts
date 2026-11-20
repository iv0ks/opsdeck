// Route-handler tests that do not need a live database.
//
// The full exploit (log in as alice, PATCH your own role to admin, read the
// break-glass secrets and the flag) is verified end-to-end against the Docker
// stack (see SOLUTION.md). Here the data layer is replaced by a spy, which lets
// us pin the things that matter without Postgres:
//   1. every protected route still demands a valid *session* (authentication),
//   2. the vulnerable /api/admin routes then serve a plain MEMBER — no role
//      check (the lab, CWE-284), and
//   3. the one admin route that does check the role refuses the same member.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ALICE = { id: 1, username: 'alice', role: 'member' };
const BOB = { id: 2, username: 'bob', role: 'admin' };

const ops = vi.hoisted(() => ({
  findUserById: vi.fn(async (id: number) =>
    id === 2
      ? { id: 2, username: 'bob', role: 'admin', displayName: 'Bob', team: 'Infra' }
      : { id: 1, username: 'alice', role: 'member', displayName: 'Alice', team: 'Platform' },
  ),
  findUserByUsername: vi.fn(),
  listServices: vi.fn(async () => []),
  listIncidents: vi.fn(async () => []),
  acknowledgeIncident: vi.fn(async () => true),
  listUsers: vi.fn(async () => []),
  setUserRole: vi.fn(async (id: number, role: string) => ({ id, role })),
  listSecrets: vi.fn(async () => []),
  setServiceStatus: vi.fn(async (id: number, status: string) => ({ id, status })),
}));
vi.mock('../src/lib/ops', () => ops);

import { GET as healthz } from '../src/app/healthz/route';
import { POST as login } from '../src/app/api/login/route';
import { GET as me } from '../src/app/api/me/route';
import { GET as services } from '../src/app/api/services/route';
import { GET as incidents } from '../src/app/api/incidents/route';
import { POST as ack } from '../src/app/api/incidents/[id]/ack/route';
import { GET as adminUsers } from '../src/app/api/admin/users/route';
import { PATCH as adminSetRole } from '../src/app/api/admin/users/[id]/route';
import { GET as adminSecrets } from '../src/app/api/admin/secrets/route';
import { PATCH as adminSetStatus } from '../src/app/api/admin/services/[id]/route';
import { createSessionToken } from '../src/lib/session';

function req(path: string, init: { method?: string; body?: unknown; as?: { id: number } } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(init.as ? { cookie: `opsdeck_session=${createSessionToken(init.as.id)}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe('opsdeck http surface', () => {
  it('serves the health check', async () => {
    const res = healthz();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('rejects a login without credentials', async () => {
    const res = await login(req('/api/login', { method: 'POST', body: {} }));
    expect(res.status).toBe(400);
  });

  it.each([
    ['GET /api/me', () => me(req('/api/me'))],
    ['GET /api/services', () => services(req('/api/services'))],
    ['GET /api/incidents', () => incidents(req('/api/incidents'))],
    [
      'POST /api/incidents/1/ack',
      () => ack(req('/api/incidents/1/ack', { method: 'POST' }), params('1')),
    ],
    ['GET /api/admin/users', () => adminUsers(req('/api/admin/users'))],
    [
      'PATCH /api/admin/users/1',
      () =>
        adminSetRole(
          req('/api/admin/users/1', { method: 'PATCH', body: { role: 'admin' } }),
          params('1'),
        ),
    ],
    ['GET /api/admin/secrets', () => adminSecrets(req('/api/admin/secrets'))],
    [
      'PATCH /api/admin/services/1',
      () =>
        adminSetStatus(
          req('/api/admin/services/1', { method: 'PATCH', body: { status: 'outage' } }),
          params('1'),
        ),
    ],
  ])('requires a session: %s', async (_name, call) => {
    expect((await call()).status).toBe(401);
  });

  it('does not accept a tampered session cookie', async () => {
    const [, signature] = createSessionToken(ALICE.id).split('.');
    const forged = Buffer.from(JSON.stringify({ userId: BOB.id, exp: 9999999999 })).toString(
      'base64url',
    );
    const res = await adminSecrets(
      new NextRequest('http://localhost:3000/api/admin/secrets', {
        headers: { cookie: `opsdeck_session=${forged}.${signature}` },
      }),
    );
    expect(res.status).toBe(401);
    expect(ops.listSecrets).not.toHaveBeenCalled();
  });

  it('reports the real role from the database on /api/me', async () => {
    const res = await me(req('/api/me', { as: ALICE }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe('member');
  });

  it('lets any signed-in member acknowledge an incident', async () => {
    const res = await ack(req('/api/incidents/3/ack', { method: 'POST', as: ALICE }), params('3'));
    expect(res.status).toBe(200);
    expect(ops.acknowledgeIncident).toHaveBeenCalledWith(3, ALICE.id);
  });
});

describe('the lab: admin routes never check the role (CWE-284)', () => {
  it('GET /api/admin/users serves a plain member', async () => {
    const res = await adminUsers(req('/api/admin/users', { as: ALICE }));
    expect(res.status).toBe(200);
    expect(ops.listUsers).toHaveBeenCalled();
  });

  it('GET /api/admin/secrets serves a plain member', async () => {
    const res = await adminSecrets(req('/api/admin/secrets', { as: ALICE }));
    expect(res.status).toBe(200);
    expect(ops.listSecrets).toHaveBeenCalled();
  });

  it('PATCH /api/admin/users/:id lets a member promote THEMSELVES to admin', async () => {
    const res = await adminSetRole(
      req('/api/admin/users/1', { method: 'PATCH', body: { role: 'admin' }, as: ALICE }),
      params('1'),
    );
    expect(res.status).toBe(200);
    expect(ops.setUserRole).toHaveBeenCalledWith(ALICE.id, 'admin');
  });

  it('rejects an unknown role before it reaches the data layer', async () => {
    const res = await adminSetRole(
      req('/api/admin/users/1', { method: 'PATCH', body: { role: 'root' }, as: ALICE }),
      params('1'),
    );
    expect(res.status).toBe(400);
    expect(ops.setUserRole).not.toHaveBeenCalled();
  });
});

describe('contrast: the one admin route that checks the role', () => {
  it('PATCH /api/admin/services/:id refuses a member with 403', async () => {
    const res = await adminSetStatus(
      req('/api/admin/services/1', { method: 'PATCH', body: { status: 'outage' }, as: ALICE }),
      params('1'),
    );
    expect(res.status).toBe(403);
    expect(ops.setServiceStatus).not.toHaveBeenCalled();
  });

  it('PATCH /api/admin/services/:id accepts an admin', async () => {
    const res = await adminSetStatus(
      req('/api/admin/services/1', { method: 'PATCH', body: { status: 'outage' }, as: BOB }),
      params('1'),
    );
    expect(res.status).toBe(200);
    expect(ops.setServiceStatus).toHaveBeenCalledWith(1, 'outage');
  });
});
