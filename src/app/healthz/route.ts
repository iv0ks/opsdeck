// Liveness probe used by the Docker HEALTHCHECK. Returns the literal text "ok".
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return new Response('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
