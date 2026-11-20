'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/client';

type Incident = {
  id: number;
  title: string;
  severity: string;
  status: string;
  service: string;
  createdAt: string;
};

const severity = { sev1: 'destructive', sev2: 'warning', sev3: 'accent' } as const;

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ incidents: Incident[] }>('/api/incidents');
    if (res.status === 401) router.push('/login');
    else if (res.ok) setIncidents(res.data.incidents);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function acknowledge(id: number) {
    const res = await api(`/api/incidents/${id}/ack`, { method: 'POST' });
    if (res.ok) await load();
  }

  if (!incidents) return <p className="text-muted-foreground">Loading incidents…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Incidents</h1>
        <p className="text-muted-foreground">
          {incidents.filter((i) => i.status === 'open').length} open · acknowledge to take
          ownership.
        </p>
      </div>
      <div className="space-y-3">
        {incidents.map((i) => (
          <Card key={i.id} className="flex-row flex-wrap items-center gap-4 p-4">
            <Badge variant={severity[i.severity as keyof typeof severity] ?? 'outline'}>
              {i.severity}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-sans font-semibold">{i.title}</p>
              <p className="text-xs text-muted-foreground">
                #{i.id} · {i.service}
              </p>
            </div>
            {i.status === 'open' ? (
              <Button variant="outline" size="sm" onClick={() => acknowledge(i.id)}>
                <BellRing /> Acknowledge
              </Button>
            ) : (
              <Badge variant="default">
                <Check className="size-3" /> {i.status}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
