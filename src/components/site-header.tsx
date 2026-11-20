'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Flame, LogIn, LogOut, ShieldCheck, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Me } from '@/lib/client';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let live = true;
    api<{ user: Me }>('/api/me').then((res) => {
      if (live) setMe(res.ok ? res.data.user : null);
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  async function logout() {
    await api('/api/logout', { method: 'POST' });
    setMe(null);
    router.push('/login');
  }

  const nav = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/incidents', label: 'Incidents', icon: Flame },
    // The Admin console is only DRAWN for admins. That is the entire "access
    // control" for it on the client side — the lab is that the API behind it
    // has none.
    ...(me?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-sans text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-md border border-primary/50 bg-primary/10 text-primary">
            <Terminal className="size-4" />
          </span>
          <span>
            ops<span className="text-primary">deck</span>
          </span>
        </Link>
        <nav className="flex gap-1" aria-label="Main">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-secondary hover:text-foreground',
                pathname === href && 'bg-secondary text-primary',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {me ? (
            <>
              <span className="text-muted-foreground">
                {me.username}@{me.team.toLowerCase()}{' '}
                <span className={me.role === 'admin' ? 'text-warning' : 'text-accent'}>
                  [{me.role}]
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
