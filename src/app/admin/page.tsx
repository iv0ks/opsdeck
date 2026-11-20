'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusLed } from '@/components/status-led';
import { api, type Me } from '@/lib/client';

type StaffMember = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  team: string;
};
type Secret = { id: number; name: string; value: string; description: string };
type Service = { id: number; name: string; status: string };

const STATUSES = ['operational', 'degraded', 'outage'] as const;

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [notice, setNotice] = useState('');

  const loadAll = useCallback(async () => {
    const [u, s, svc] = await Promise.all([
      api<{ users: StaffMember[] }>('/api/admin/users'),
      api<{ secrets: Secret[] }>('/api/admin/secrets'),
      api<{ services: Service[] }>('/api/services'),
    ]);
    if (u.ok) setUsers(u.data.users);
    if (s.ok) setSecrets(s.data.secrets);
    if (svc.ok) setServices(svc.data.services);
  }, []);

  useEffect(() => {
    api<{ user: Me }>('/api/me').then(async (res) => {
      if (res.status === 401) return router.push('/login');
      const user = res.ok ? res.data.user : null;
      setMe(user);
      // CLIENT-SIDE guard: only admins get the console's data requested. This is
      // a presentation rule — the API behind it enforces nothing of the sort.
      if (user?.role === 'admin') await loadAll();
    });
  }, [router, loadAll]);

  async function setRole(id: number, role: string) {
    const res = await api<{ error?: string }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    setNotice(res.ok ? `Role updated.` : (res.data.error ?? 'Update failed.'));
    if (res.ok) await loadAll();
  }

  async function setStatus(id: number, status: string) {
    const res = await api<{ error?: string }>(`/api/admin/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setNotice(res.ok ? 'Status overridden.' : (res.data.error ?? 'Update failed.'));
    if (res.ok) await loadAll();
  }

  if (me === undefined) return <p className="text-muted-foreground">Checking clearance…</p>;

  if (me?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md">
        <Card className="items-center gap-3 py-10 text-center">
          <Lock className="size-8 text-warning" />
          <h1 className="text-xl">Restricted area</h1>
          <p className="text-muted-foreground">
            The admin console is available to administrators only.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Admin console</h1>
          <p className="text-muted-foreground">
            People, break-glass credentials and service overrides.
          </p>
        </div>
        {notice && (
          <Badge variant="accent" role="status">
            {notice}
          </Badge>
        )}
      </div>

      <section className="space-y-3" aria-labelledby="people">
        <h2 id="people" className="text-xl">
          People &amp; roles
        </h2>
        <Card className="gap-0 p-0">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-4 border-b p-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans font-semibold">{u.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {u.username} · {u.team}
                </p>
              </div>
              <Badge variant={u.role === 'admin' ? 'warning' : 'accent'}>{u.role}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRole(u.id, u.role === 'admin' ? 'member' : 'admin')}
              >
                {u.role === 'admin' ? 'Demote' : 'Promote'}
              </Button>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="secrets">
        <h2 id="secrets" className="text-xl">
          Break-glass credentials
        </h2>
        <div className="space-y-3">
          {secrets.map((s) => {
            const open = revealed.includes(s.id);
            return (
              <Card key={s.id} className="gap-2 p-4">
                <CardHeader>
                  <CardTitle className="font-mono">{s.name}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <div className="flex items-center gap-3">
                  <code className="min-w-0 flex-1 rounded border bg-background px-3 py-2 break-all">
                    {open ? s.value : '•'.repeat(24)}
                  </code>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={open ? `Hide ${s.name}` : `Reveal ${s.name}`}
                    onClick={() =>
                      setRevealed((r) => (open ? r.filter((x) => x !== s.id) : [...r, s.id]))
                    }
                  >
                    {open ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="overrides">
        <h2 id="overrides" className="text-xl">
          Service status override
        </h2>
        <Card className="gap-0 p-0">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-4 border-b p-4 last:border-b-0"
            >
              <span className="min-w-0 flex-1 font-semibold">{s.name}</span>
              <StatusLed status={s.status} />
              <div className="flex gap-1">
                {STATUSES.map((st) => (
                  <Button
                    key={st}
                    variant={s.status === st ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatus(s.id, st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
