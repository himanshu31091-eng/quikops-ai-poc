# SESSION_HANDOFF

> The state of play at the end of the last development session.
> **Every session must rewrite this file before ending.** Replace the content —
> do not append. This is a snapshot of *now*, not a history; history belongs in
> `DECISIONS.md` and `DEVELOPMENT_STATUS.md`.
>
> Keep every section heading below, even when a section is empty. "None this
> session" is a useful answer; a missing heading is not.

---

## Session Date

**2026-08-10 (second session)** — Sign-in, sign-out and persona re-selection
fixed. The login screen now ends somewhere.

**2026-08-10** — Branding cleanup: the upstream analytics vendor is no longer
named anywhere a user can see it.

**2026-08-08** — Demo-freeze sprint: saved reports, responsive pass, final QA.

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## Completed Work

### Login / logout / persona re-selection (2026-08-10, second session)

**Reported:** after signing out, clicking a persona card on the login screen did
not sign the user back in.

**Root cause — two halves of one flow, neither finished.**

1. The login screen's server action called `switchPersona`, which writes the
   cookie and revalidates the layout. It never navigated. The action *succeeded*
   every time: the session was written, `/login` re-rendered as `/login`, and the
   card looked dead. Nothing was broken about the click, the handler or the
   cookie — the flow simply had no destination.
2. Sign-out was `<a href="/login">`. It navigated and cleared nothing, so the
   previous session sat behind the chooser the whole time.

**Fixed by giving the existing cookie mechanism the verbs it was missing.** No
second authentication path; the persona chooser is still the only way to get a
session. See D-90.

| Action | Behaviour |
|---|---|
| `signInAsPersona(userId)` | writes the session, then **redirects** to `ROLE_LANDING[role]` |
| `switchPersona(userId)` | writes the session and stays — the in-demo role switch, unchanged |
| `signOut()` | deletes the cookie, then redirects to `/login` |

**Where each persona lands.** `ROLE_LANDING` in `src/config/app-config.ts` is the
single role→route map; every route in it is a `NAVIGATION` href the role could
already reach.

| Persona | Role | Lands on |
|---|---|---|
| Elena Vásquez | `EXECUTIVE` | `/dashboard` |
| Marcus Reinhardt | `OPS_MANAGER` | `/work` |
| Carlos Mendoza | `TASK_OWNER` | `/my-work` |
| Sandra Whitfield | `ADMINISTRATOR` | `/admin` |
| *(not a persona)* Daniel Kim | `ANALYST` | `/work` |

**One guard for the authenticated tree.** `getActiveSessionUser()` returns
`User | null`; `app/(app)/layout.tsx` sends a request without a valid cookie to
`/login`, and `/` resolves to the signed-in role's landing screen or to `/login`.
`getSessionUser()` keeps its non-nullable default-persona fallback for the
screens — the guard is what makes it unreachable, which is what stops a
back-button return after sign-out from re-rendering the previous persona's work.
A cookie naming a user who is no longer seeded is treated as no session.

**The chooser itself.** The four `<form>` elements became one client component,
`components/shell/persona-sign-in.tsx` — the sign-in counterpart of the switcher
in `user-menu.tsx`, calling the same server action. Visual design unchanged.

- The whole card is a single native `<button>`, so the card *and* the arrow are
  one hit area and Enter/Space work without a key handler.
- `aria-label="Sign in as <name>, <job title>"`; an `aria-live` status announces
  the sign-in.
- Focus-visible now gets the hover treatment as well as the global focus ring.
- While a sign-in is in flight the chosen card holds the accent state and reads
  *Signing in…*, the other three recede to 50%, and all four are disabled —
  guarded by a ref, because two clicks can be dispatched before a re-render.
- "Skip to dashboard" became a button that signs in as the default persona. As a
  link to `/dashboard` the new guard would have bounced it back to the chooser.

No new animation was added — the pending state is the existing `anim-fade` and a
colour change. There are still exactly five.

---

## Files Modified

**Created**
- `components/shell/persona-sign-in.tsx` — the persona chooser and the
  "Skip to dashboard" control

**Deleted**
None.

**Code changed**
- `src/auth/session.ts` — added `getActiveSessionUser()`; `getSessionUser()` now
  delegates to it and keeps the default-persona fallback
- `src/auth/session-actions.ts` — `signInAsPersona` and `signOut` added, cookie
  write extracted to one private helper, `switchPersona` behaviour unchanged
- `src/config/app-config.ts` — **new** `ROLE_LANDING`
- `app/page.tsx` — `/` resolves by session instead of always redirecting to `/dashboard`
- `app/(app)/layout.tsx` — the session guard
- `app/(auth)/login/page.tsx` — renders `PersonaSignIn`; the inline server action,
  the four forms and the `/dashboard` link are gone
- `components/shell/user-menu.tsx` — Sign out calls `signOut()` instead of linking

**Docs changed**
`.claude/ARCHITECTURE.md` §10 (rewritten) · `.claude/DECISIONS.md` (D-90 added) ·
`.claude/ROADMAP.md` (debt item 8 reworded) · this file

---

## Decisions Made

| # | Decision |
|---|---|
| D-90 | Sign-in writes the session **and redirects**; sign-out clears it; the authenticated tree has one guard, and `ROLE_LANDING` is the single role→route map |

---

## Bugs Fixed

1. **Sign-in never navigated.** The login screen wrote a session and stayed on
   the login screen. This is the reported defect.
2. **Sign-out never cleared the session.** A link to `/login` left the previous
   persona's cookie in place, so the chooser was decorative.
3. **A stale cookie was trusted.** A `qo_persona` naming a user no longer in the
   fixtures fell through to the default persona; it is now treated as no session.

---

## Known Issues

Stated in full in `RELEASE_NOTES.md` under *Known limitations*. The ones that
matter to the next session:

1. **There is still no authentication.** The guard checks only that the cookie
   names a seeded user. Role filters navigation and the landing route; **no route
   is authorized** — a `TASK_OWNER` who types `/admin` reaches it. Debt item 8.
2. **Light theme only.** No `prefers-color-scheme`, no `dark:` variants, no
   toggle. Do not report dark mode as working (D-66).
3. **i18n is architecture, not translation.** ~900–1,400 literals remain in
   components; the new chooser's strings are literals too.
4. **An unknown case number returns HTTP 200** while rendering the correct
   "Case not found" page.
5. **Plant scope selector is inert** by decision.
6. **No automated tests.** `QA_CHECKLIST.md` is the test suite.
7. **No axe-core audit, no measured contrast.**
8. **Charts are statically imported** — ~110–130 kB of first-load JS on
   `/dashboard` and `/analytics`.
9. **`EVERY_ANGLE` remains in page source**, in the serialised RSC payload. It is
   not rendered text.

---

## Current Build Status

| Gate | Result |
|---|---|
| `npx eslint .` | **0 errors, 0 warnings** |
| `npm run typecheck` | **clean** |
| `npm run build` | **19/19 entries, no warnings** |
| Route smoke test, session held | **13/13 render 200**; `/nope` → 404 |
| Route smoke test, no session | `/`, `/dashboard`, `/work`, `/my-work`, `/admin` → **307 `/login`**; `/login` → 200 |
| Sign-in action, all four personas | 303 + `Set-Cookie` + redirect to the role's landing route |
| Sign-out action | 303 + cookie expired + redirect to `/login` |
| Sign in → sign out → **sign in again** | passes for all four personas, repeated |
| Persona switcher (regression) | 200, cookie rewritten, no redirect — still stays on the screen |
| Identity restored after reload | top-bar reads Executive / Operations Manager / Task Owner / Administrator correctly |

Verification method, stated plainly: the production build was served with
`npm start` and driven over HTTP — the server actions were invoked directly with
their `Next-Action` ids, so the sign-in, switch and sign-out paths were exercised
as the browser exercises them, and the responses were read for `Set-Cookie` and
`x-action-redirect`. **No browser click-through was performed** — that has never
been verifiable from this environment. The keyboard pass, the hover and focus
states and the *Signing in…* transition are therefore **reasoned, not observed**,
and want one manual pass before the client sees them.

---

## Next Recommended Prompt

> Manually click the login flow once in a browser: sign in as each of the four
> personas, confirm the landing screen and the top-bar identity, sign out, and
> sign in again as a different persona. Then tab through the four cards with the
> keyboard only and activate one with Space — the cards are native buttons, so
> this should work, but it has not been observed. Then run the passes in
> `.claude/QA_CHECKLIST.md` still marked ◻: the responsive pass at 1440 / 1024 /
> 768 / 375, the Escape-closes-every-overlay check, and the end-to-end execution
> workflow including Demo Reset. Promote each ◻ to ✅ only after running it.

After that, in order: axe-core audit → i18n string migration → dynamic chart
imports.

---

## Resume From Here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale dev servers before verifying anything.** A previous process
   serving a wiped `.next` produces 500s that look like code failures and are
   not: `netstat -ano | grep :3000`, then `taskkill //PID <pid> //F`.
3. **Never build a large TypeScript block through a shell heredoc or a
   shell-quoted regex.** Backslashes and backticks are consumed before Node sees
   them; this broke a dead-code script and has broken doc edits before. Use the
   Write/Edit tools, or write the script to a file first.
4. Frozen and not to be redesigned: Executive Dashboard, Work Manager, Case
   Detail, My Work, Execution Workflow. Bug fixes only.
5. **Session identity has one owner: `src/auth/` (D-90).** Sign-in redirects,
   sign-out clears, the `(app)` layout is the only guard, and `ROLE_LANDING` is
   the only role→route map. Do not add a second way to obtain a session, and do
   not reintroduce a bare link into the authenticated tree from a signed-out
   screen — the guard will bounce it.
6. **Copy is vendor-neutral (D-89).** Do not reintroduce a vendor name in new UI
   text, fixtures, help content or prompts, and do not render an enum key as
   display text — add a label to `src/config/app-config.ts` instead.
7. Every change ends with `npx eslint .`, `npm run typecheck`, `npm run build`,
   a route pass, then updates to `DEVELOPMENT_STATUS.md`, `NEXT_STEPS.md`,
   `DECISIONS.md` and this file.
