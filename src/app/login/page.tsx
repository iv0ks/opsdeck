'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    const res = await api<{ error?: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
    });
    setBusy(false);
    if (res.ok) router.push('/');
    else setError(res.data.error ?? 'Could not sign in.');
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to opsdeck</CardTitle>
          <CardDescription>
            Staff access only. Demo on-call account: <code className="text-primary">alice</code> /{' '}
            <code className="text-primary">password123</code>
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy}>
            <LogIn /> Authenticate
          </Button>
        </form>
      </Card>
    </div>
  );
}
