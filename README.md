# opsdeck

![CWE-284](https://img.shields.io/badge/CWE--284-Broken%20Access%20Control-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
[![GHCR](https://img.shields.io/badge/ghcr.io-iv0ks%2Fopsdeck-blue?logo=docker)](https://github.com/iv0ks/opsdeck/pkgs/container/opsdeck)

**opsdeck is an intentionally vulnerable application built for security education.** It contains a deliberate [broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-284) flaw in an **operations dashboard** — proving that hiding an admin button in the UI is not the same as forbidding the action on the server.

<br>

<div align="center">

| 🛡️ Vulnerability | 🎯 Difficulty | 🛠️ Stack | 🚩 Entry point |
| :--- | :--- | :--- | :--- |
| Vertical privilege escalation, UI-only role check (CWE-284) | ⭐⭐⭐⭐⭐⭐ Level 8 | Node · Next.js | `GET /api/admin/users` · `PATCH /api/admin/users/:id` · `GET /api/admin/secrets` |

</div>

<br>

> [!NOTE]
> The guided, spoiler-free path is [GUIDE.md](GUIDE.md); the full answer waits in [SOLUTION.md](SOLUTION.md) whenever you want it.

<br>

## 📂 Project layout

The repository is organised so the vulnerable code is easy to find and reason
about. The **application** is a Next.js (App Router) project in `src/` — React
pages styled with Tailwind and shadcn/ui, plus **Route Handlers** that form the
API. The **data layer** is Drizzle ORM over Postgres (`src/db/` + `drizzle/`
migrations), and the **tooling** around it (Docker, CI/CD, linters) turns the
lab into a production-shaped project. The challenge flag is never in the repo —
it is baked into the image and seeded as an admin-only secret.

```
opsdeck/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # service overview
│   │   ├── incidents/            # incident list + acknowledge
│   │   ├── admin/page.tsx        # the admin console (hidden from members in the UI)
│   │   ├── login/                # sign-in page
│   │   ├── healthz/route.ts      # GET /healthz → "ok"
│   │   └── api/                  # Route Handlers (the bug lives here)
│   │       ├── login/ logout/ me/ services/ incidents/
│   │       └── admin/
│   │           ├── users/route.ts           # GET   staff + roles   (no role check)
│   │           ├── users/[id]/route.ts      # PATCH change a role   (no role check)
│   │           ├── secrets/route.ts         # GET   break-glass keys (no role check)
│   │           └── services/[id]/route.ts   # PATCH status override  (checks the role)
│   ├── components/               # shadcn/ui components + header
│   ├── lib/
│   │   ├── session.ts            # signed session cookie (done right)
│   │   ├── api.ts                # requireSession() · requireAdmin()
│   │   ├── ops.ts                # queries
│   │   └── password.ts           # password hashing
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (users + role, services, incidents, secrets)
│   │   ├── client.ts             # Postgres connection
│   │   ├── migrate.ts            # applies migrations on startup
│   │   └── seed.ts               # seeds 3 staff accounts (flag = admin-only secret)
│   └── config.ts                 # env-backed configuration
├── drizzle/                      # generated SQL migrations
├── tests/                        # route-handler tests (vitest)
├── GUIDE.md                      # non-spoiler learning guide
├── SOLUTION.md                   # exploit writeup + the fix (spoilers)
├── SECURITY.md                   # security policy (it's a lab — read before reporting)
├── .github/workflows/            # integration · delivery · security · release
├── Dockerfile                    # hardened multi-stage image (node:26-slim, standalone)
├── docker-compose.yml            # postgres + opsdeck + traefik stack
├── docker-entrypoint.sh          # migrates + seeds, then starts the app
└── .env.example                  # DB creds, session secret, Traefik ACME
```

The flag is **not** in the repo: the `Dockerfile` bakes it in via a build arg
and the seed writes it into the admin-only `break-glass-token` secret.

<br>

## 🚀 The Lab

The lab ships as a Docker Compose stack with three services:

- **`postgres`** — Postgres 16. The app waits until it is *healthy* before migrating.
- **`opsdeck`** — the dashboard UI + API, published on port `3000`.
- **`traefik`** — an optional reverse proxy for HTTPS on a real hostname.

Because the stack attaches to an **external** Docker network (`iv0ks-dev`),
create it once before the first run:

```bash
docker network create iv0ks-dev
```

<br>

#### Option A — app + database (quickest)

Copy the example environment file, then build and start the database and the app
(Compose skips `traefik` when you name services explicitly):

```bash
cp .env.example .env
docker compose up -d --build postgres opsdeck
```

The entrypoint migrates the schema and seeds the data automatically, so the app
is ready at:

- **<http://localhost:3000>**

Sign in with the seeded on-call account **`alice` / `password123`**. That is all
you need to start playing with Burp Suite.

> [!TIP]
> The seed runs on every start and resets roles, so if you promoted yourself and
> want a clean slate, just restart the container: `docker compose restart opsdeck`.

<br>

#### Option B — full stack with Traefik (HTTPS + hostname)

Bring up everything to also expose the app through Traefik with TLS:

```bash
docker compose up -d --build
```

Now the _same_ app is reachable two ways at once:

- **<http://localhost:3000>** — direct, no TLS (handy for quick testing).
- **<https://opsdeck.iv0ks.dev>** — proxied by Traefik with a real certificate.

Traefik routing is defined in `tools/traefik/`. TLS uses the ACME DNS-01
challenge via Namecheap, so Traefik needs those API credentials — fill them in
`.env` (it is gitignored). The dashboard is at `https://traefik.iv0ks.dev`.

<br>

> [!CAUTION]
> The `opsdeck.iv0ks.dev` hostname must resolve to the host running the stack.
> For purely local experiments, Option A (localhost) is simpler and needs no
> DNS or certificates.

<br>

## 🎯 The Challenge

### The Scenario

opsdeck is the internal operations console of a small software company: a live
service overview, an incident queue, and an **admin console** where
administrators manage people, hold the emergency **break-glass credentials** and
override service status. You sign in as **alice**, an on-call engineer. You are a
regular *member*, and the app treats you like one — your menu has no Admin entry
and the admin page politely tells you it is for administrators only.

### Your objective

Get to the **break-glass credentials** that only an administrator is meant to
see, and capture the flag hidden among them. Then prove the damage is real: make
yourself an administrator.

> [!NOTE]
> The flag has the format `FLAG{...}`.

### The rules

Everything happens over HTTP against the running app — no need to read the
source to win (though you can). The flag is **not** in the repo: it lives in the
database, reachable only by breaking access control on the running app. The
front end will not help you; ask yourself what the **server** thinks about your
requests, not what the **page** shows you.

> [!TIP]
> For the full method, the **[Learning Guide](GUIDE.md)** walks you through it.

<br>

## ⚖️ Legal / ethics

This is an **educational, deliberately vulnerable** lab. Run it only locally, on
owned, isolated infrastructure (Docker). Never deploy it publicly, and never use
these techniques against systems without explicit written authorization.
