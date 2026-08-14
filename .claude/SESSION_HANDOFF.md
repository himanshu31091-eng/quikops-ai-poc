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

**2026-08-14** — Phase 7: Case Detail completed its migration to Neon. The whole
execution record — corrective actions, evidence, KPI, verification, timeline and
audit — now reads from the database when `USE_DATABASE=true`.

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## Where Things Stand

`USE_DATABASE` is still **off by default** and is not set in `.env.local`. It is
passed per process (`USE_DATABASE=true npm start`). Fixtures remain the fallback
and were not touched as data.

Database-backed when the flag is on:

| Screen | Source |
|---|---|
| Work Manager | Neon (`case-db-mapper.ts`) |
| Case Detail — case record | Neon (`case-db-mapper.ts`) |
| Case Detail — actions, evidence, verification, KPI, audit | Neon (`case-detail-db-mapper.ts`) |
| Case Detail — timeline | Derived from the above by `buildTimeline` |
| Case Detail — discussion | Empty; there is no comment table yet |
| Everything else | Fixtures, in both modes |

`getCaseDetail` now branches once, at the top, and assembles the same six view
models from either source. Nothing below the branch knows which one ran.

---

## What Changed

**Added**

- `src/data/queries/case-detail-db-mapper.ts` — the only place Prisma types are
  visible for the case *record*. Holds the three validated translations:
  `fileType` → `EvidenceKind`, stored audit `source` → the UI union (read
  backwards out of `AUDIT_SOURCE_LABEL`, so the two cannot disagree), and
  `roleKey` → `UserRole`. None of them is a cast; each has a stated fallback.

**Modified**

- `src/data/queries/case-detail.ts` — database branch assembles the full record.
- `src/data/fixtures/case-detail.ts` — `buildTimeline` and `buildComments` take
  an optional `CaseActorDirectory` so one builder serves both sources. Defaults
  to the fixture organisation, so fixture output is unchanged.
- `src/config/app-config.ts` — `AUDIT_EVENT_LABEL` and `auditEventLabel()`.
- `src/domain/types.ts` — `EVIDENCE_KINDS` const array, so `EvidenceKind` can be
  validated at runtime the way `KpiKey` and `UserRole` already are.
- `prisma/seed.mjs` — three data gaps closed (see below). No schema change.

**Schema: unchanged.** No `TimelineEvent` model was created; a timeline is a
reading of the record, not a second copy of it.

---

## Data Gaps Closed

The seed was missing rows the UI needs to tell the truth. All additive; nothing
was deleted and the database was never reset.

1. `QO-PA-2026-00421` had no `KpiMeasurement`, so the mapper reported baseline 0
   against target 0. Added OTIF 87 → 95, interim 92, 14-day window.
2. `QO-PA-2026-00400` had none either. Added `INVENTORY_DAYS` 34 → 25 (with the
   KPI definition it needs).
3. `QO-PA-2026-00418` is submitted for verification and its own description says
   "All four corrective actions are complete and evidenced" — but no actions or
   evidence existed. Added the four playbook steps and one evidence file each.

---

## Verification Method

Rendered UI in **real headless Chrome over CDP**, reading
`document.body.innerText` after hydration. Deliberately not the RSC flight
payload: fixture data can appear in serialised RSC data without being rendered,
which has misled an earlier session. `innerText` cannot contain a `<script>`
body, so a record that is serialised but not rendered cannot show up.

The discriminator: a record that exists **only** in fixtures must disappear when
the flag is on, and the database record must appear in its place. It does — for
every section, individually.

Fixture mode renders **byte-identical** to the capture taken before any of this
session's changes.

---

## Known Gaps

- **Session identity is still fixture-backed.** `src/auth/session.ts` resolves
  the persona cookie against `USER_BY_ID`, so in database mode the signed-in
  user's id never matches a database user id. The verification card therefore
  shows "Only X can record the decision" rather than the decision form. Auth was
  out of scope this session; migrating it is the next thing that matters.
- **No comment table.** The discussion renders empty in database mode. That is
  honest — composing a thread from fixture people would put strangers on a real
  case — but it is a visible gap in the demo.
- Dashboard, Analytics, Reports, My Work, Action Center and the global Audit Log
  still read fixtures in both modes.

---

## Resume From Here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale dev servers before verifying anything.** `netstat -ano | grep
   :3000`, then `taskkill //PID <pid> //F`. A process serving a wiped `.next`
   produces 500s that look like code failures and are not.
3. Frozen and not to be redesigned: Executive Dashboard, Work Manager, Case
   Detail, My Work, Execution Workflow. Bug fixes only.
4. **`USE_DATABASE` must stay off by default.** Turning it on is a deliberate,
   per-environment act.
5. When adding a database read, put the Prisma types in a `*-db-mapper.ts` and
   return a finished view model. Validate a stored string against the union's
   own member list before widening it — never cast.
6. Every change ends with `npx eslint .`, `npm run typecheck`, `npm run build`,
   a rendered-UI pass, then updates to `DEVELOPMENT_STATUS.md`, `NEXT_STEPS.md`,
   `DECISIONS.md` and this file.
