# opsdeck: Learning Guide

![CWE-284](https://img.shields.io/badge/CWE--284-Broken%20Access%20Control-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**opsdeck is an intentionally vulnerable application built for security education.** It contains a deliberate [broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-284) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!TIP]
> A guided, **non-spoiler** path to solving this lab. It teaches the *method*, not the answer — the exact winning request and the flag stay in [SOLUTION.md](SOLUTION.md).

<br>

## 🧬 What broken access control is

Here is the whole idea in one sentence:

> **Broken access control happens when an app checks _who you are_ but forgets
> to check _whether you're allowed to do this_.**

Logging in answers "who are you?" — that's **authentication**. Deciding whether
*this* user may perform *this* action is a separate question — that's
**authorization**. The earlier labs were **horizontal**: you reached another
user's data *at your own privilege level* (same role, different owner). This lab
is **vertical**: you reach functionality reserved for a **higher role**. That is
**privilege escalation**.

The question has changed from "is this *yours*?" to "are you *allowed*?". And
the most common way to get that wrong is deceptively comfortable: the
interface knows your role, so it simply **doesn't show you** the buttons you
shouldn't press. The menu has no Admin entry; the admin page says "restricted".
It *feels* like access control. It is only **presentation**.

Think of a restaurant with a door marked "Staff only" — but the door isn't
locked, and nobody inside asks who walks in. The sign works on polite customers.

> Want the deeper background — horizontal vs vertical escalation, why a hidden
> control is not a control, and the full workflow with **Burp Suite** and **OWASP
> ZAP**? Read the shared
> **[Broken Access Control field guide](https://github.com/iv0ks/appsec-labs/blob/main/docs/broken-access-control.md)**.
> This lab is a hands-on application of it.

<br>

## 🎓 What this level teaches

**Level 8 — vertical escalation: the role check lives only in the UI.** The admin
console is hidden from members in the front end. The API routes that power it
are a different story.

- **Entry points:** the `/api/admin/*` routes behind the Admin console — one of
  them reads data, one changes who is an administrator.
- **The broken defence:** "members never see the Admin page, so members never
  call these routes" — the server relies on the client to behave.
- **What you can see legitimately:** the service overview, the incident queue,
  and whatever your own role is, via `GET /api/me`.
- **The target:** the administrator's break-glass credentials — and the ability
  to become an administrator yourself.

## 🪧 How to approach it

1. Sign in as `alice` through your proxy. Click around everything you are
   allowed to see and watch **Proxy > HTTP history**. Note which `/api/` routes
   the pages call.
2. Find the request that tells the page *who you are and what role you hold*.
   Read the response. This is the data the front end uses to decide what to
   draw.
3. Try to open the admin page by its URL. What does the page say — and, more
   importantly, **what requests does it (not) make?**
4. The page is a *client* of an API. Admins use that API; the front end is just
   one way to talk to it. Guess, or work out, what the admin console would call
   behind the scenes, and send those requests yourself from **Repeater**.
5. Compare what the server answers with what the interface promised. Did it ask
   about your role? Is there any route that *does* refuse you — and if so, what
   is different about it?
6. Once you can read what an administrator can read, ask whether you can also
   *change* what an administrator can change.

## 🕵️♂️ Going further

Not every `/api/admin` route is built the same way — notice which ones answer you
and which ones don't, and use the difference to understand **what a correct
check looks like**. A single route that enforces the rule proves the team knew
how; the ones that don't prove the rule was applied by hand, route by route,
and forgotten. Also notice that a role change takes effect on the **next
request**: after escalating, re-check `GET /api/me` and see how the interface
itself changes.

Be careful with the write routes on shared lab data: changing roles persists
until the container restarts (the seed resets everything on boot).

## 🤔 Why it matters

"The button is hidden" is one of the most common false comforts in web
development. It shows up as admin panels only linked for admins, `if (user.isAdmin)`
in a React component, disabled form fields, `display: none` buttons — and then an
API behind them that was built for the UI and never expected to hear from anyone
else. Because every honest user goes through the UI, it works perfectly in
testing. Attackers don't use your UI; they use your API. Testing for it means
taking the routes only a **high-privilege** account uses and replaying them with
a **low-privilege** session.

---

When you have captured the flag (or want to check the fix and the *why* behind
it), continue to **[SOLVE → SOLUTION.md](SOLUTION.md)**.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
