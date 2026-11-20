'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusLed } from '@/components/status-led';
import { api } from '@/lib/client';

type Service = {
  id: number;
  name: string;
  description: string;
  status: string;
  uptime: string;
  latencyMs: number;
  owner: string;
};

export default function OverviewPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[] | null>(null);

  useEffect(() => {
    api<{ services: Service[] }>('/api/services').then((res) => {
      if (res.status === 401) router.push('/login');
      else if (res.ok) setServices(res.data.services);
    });
  }, [router]);

  if (!services) return <p className="text-muted-foreground">Connecting to the fleet…</p>;

  const down = services.filter((s) => s.status !== 'operational').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Service overview</h1>
          <p className="text-muted-foreground">
            {services.length} services ·{' '}
            {down === 0 ? 'all systems nominal' : `${down} need attention`}
          </p>
        </div>
        <Badge variant={down === 0 ? 'default' : 'warning'}>
          {down === 0 ? 'all clear' : `${down} impacted`}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <Card key={s.id} className="gap-3 p-4">
            <CardHeader>
              <StatusLed status={s.status} />
              <CardTitle className="font-mono text-base">{s.name}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <div>
                <dt className="text-muted-foreground">uptime</dt>
                <dd className="font-semibold">{s.uptime}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">p95</dt>
                <dd className="font-semibold">{s.latencyMs ? `${s.latencyMs} ms` : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">owner</dt>
                <dd className="font-semibold">{s.owner}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
