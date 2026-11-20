'use client';

// Browser-side helpers.
export type ApiResult<T> = { ok: boolean; status: number; data: T };

export async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export type Me = {
  id: number;
  username: string;
  displayName: string;
  role: 'member' | 'admin';
  team: string;
};
