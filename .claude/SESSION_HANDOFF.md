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

**2026-08-14** — Sika evaluation closure. Case Detail finished its move to Neon,
four client-facing defects were fixed, and the demo configuration was frozen.

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## How to run the demo — read before showing a client

**Leave `USE_DATABASE` unset.** The demo runs on the seeded fixture corpus, and
that is deliberate, not a shortcut. Every screen then reads the same eight-case
corpus and they all agree with each other.

Turning the flag on makes Work Manager and Case Detail read Neon while the
Dashboard, Analytics and Reports keep reading fixtures — so the Dashboard would
report seven cases and the queue three, in the same session, in front of the
client. **That is the one thing that must not happen during an evaluation.**

The database path is real, complete for the screens it covers, and verified. It
is staged for the next phase, not for the demo.

### The two cases the demo needs

No single case carries the whole story, because the halves live on two records.

| Case | Shows |
|---|---|
| `QO-PA-2026-00421` | Problem, priority score, ownership, corrective actions, evidence, timeline, audit |
| `QO-PA-2026-00418` | The KPI movement and the independent verification decision |

`00421` is `IN_PROGRESS` with an open action, so it correctly shows **no**
verification card — in either mode. `00418` is the only record that renders the
full panel: 87 baseline → 92 interim, target 95, 14-day window still open,
requested by Arun Iyer, reviewed by Sunil Joshi, decision pending.

---

## Where things stand

| Area | State |
|---|---|
| Work Manager | Neon-backed behind the flag; fixtures by default |
| Case Detail — record, actions, evidence, KPI, verification, timeline, audit | Neon-backed behind the flag; fixtures by default |
| Dashboard · Analytics · Reports · Administration · My Work · Action Center · Playbooks · Connectors · Audit Log | Fixtures in both modes |
| Tenant isolation | Enforced in the query layer, verified both directions |
| RBAC | Authenticated guard on the whole tree; server-side role check on `/admin` |
| Languages | English, Spanish, Portuguese — navigation and shared labels |
| AI Copilot | Live, verified end to end against a real model response |

---

## What changed this session

**Case Detail completed its migration** (`9fa3902`). One mapper,
`src/data/queries/case-detail-db-mapper.ts`, holds every Prisma-facing line.
Three translations, none of them a cast: `fileType` → `EvidenceKind` through a
three-tier validated lookup; stored audit `source` → the UI union by reading
`AUDIT_SOURCE_LABEL` backwards so the two cannot drift; `roleKey` → `UserRole`
checked against the role list. Each has a stated fallback. No `TimelineEvent`
model — a timeline is a reading of the record, not a second copy of it.

**Build reproducibility fixed** (`0ea09ad`, `ec37ed0`). `@prisma/client` v7
installs as a stub with no `PrismaClient` export until `prisma generate` runs,
which had only ever happened locally as a side effect of the migration. Any
clean install could not compile. A `postinstall` hook now generates the client,
and the package moved to `dependencies` where a runtime import belongs.

**Four client-facing defects fixed** (`7e37376`): the dashboard claimed four
plants against three in the data; the summary card printed the model name,
prompt version and a raw system code; Administration was reachable by URL
whatever the role; and Portuguese was offered in the menu with no catalogue
behind it.

---

## Known gaps — state these plainly, do not paper over them

- **Sika cannot be shown their own environment.** The tenant exists in Neon with
  its own site, people, case and euro currency, correctly isolated. There is no
  selector, and the data exists only in Neon — so reaching it means running in
  database mode, which is what breaks Dashboard coherence. **Sika tenant access
  is blocked behind the Dashboard/Analytics/Reports migration**, not behind a
  missing switcher. That chain is the single most valuable next piece of work.
- **No approved Sika logo exists**, so `logoPath` is null and the shell falls
  back to the QuikOps mark. A brand mark is supplied by its owner; do not source
  or approximate one.
- **Translation stops at the navigation and shared labels.** Page bodies are
  English in all three languages.
- **Administration is read-only** — no add or edit user.
- **Segregation of duties is enforced in the UI only.** `decideVerification` has
  no actor check. In database mode no persona id matches a Neon user, so the
  reviewer cannot record a decision at all; in demo mode it works, because
  personas and reviewers come from the same corpus.
- **Analytics 90-day trends are static series**, not calculated from case
  history. Say so if asked.

---

## Verification record

Run against `7e37376` on a clean `npm ci`:

| Gate | Result |
|---|---|
| `npm ci` → `postinstall` → `prisma generate` | pass |
| `prisma validate` | pass |
| `tsc --noEmit`, `tsconfig.tsbuildinfo` deleted first | pass |
| `npx eslint .` | 0 errors, 0 warnings |
| `next build` | 19/19 entries |
| Route smoke test, signed in | 14/14 → 200 |
| Route guard, signed out | `/dashboard` `/work` `/admin` → 307; `/login` → 200 |
| RBAC | Task Owner and Analyst redirected off `/admin`; Administrator and Ops Manager admitted |
| Case Detail six-area gate, rendered DOM | 71/71 assertions |
| Tenant isolation | cross-tenant case → "Case not found" |
| Languages | English / Panel ejecutivo / Painel executivo |
| Responsive, 5 screens × 4 widths | 20/20 no overflow |
| Runtime errors | 0 in both modes |

**Method, stated plainly:** findings come from `document.body.innerText` in real
headless Chrome after hydration — never the RSC payload. Fixture data can appear
in serialised RSC output without being rendered, which misled an earlier
session. The discriminator throughout: a fixture-only record must disappear when
the flag is on, and the database record must appear in its place.

---

## Resume from here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale dev servers before verifying anything.** `netstat -ano | grep
   :3000`, then `taskkill //PID <pid> //F`.
3. **`USE_DATABASE` stays off by default.** Turning it on is a deliberate,
   per-environment act, and not for a client demo until the Dashboard agrees
   with the queue.
4. `tsconfig.json` sets `incremental: true`. Delete `tsconfig.tsbuildinfo`
   before trusting a typecheck — a stale cache once hid a real compile error
   that only surfaced in CI.
5. Next phase, in order: migrate Dashboard, then Analytics and Reports, then
   make the tenant selectable. Those three unlock showing Sika their own data.
