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

**2026-08-06** (second working session — Priority 1, Real AI Integration)

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## Completed Work

New delivery priority set by the client: **1. Real Anthropic AI · 2. Demo Mode
(`/demo`) · 3. Vercel readiness · 4. Final QA.** Work below is Priority 1 only.

### Portfolio-scoped Copilot — the Dashboard's "Ask Copilot" now works

It was a **dead primary button** on the demo's landing screen. The Copilot was
case-scoped by construction, so wiring it meant giving it a second scope.

- `CopilotScope = "case" | "portfolio"` threaded through types, prompt builder,
  services and the route
- `src/data/queries/portfolio.ts` — `getPortfolioSnapshot()`, a finished view
  model: totals, open cases, band and lifecycle distribution, plant health,
  execution metrics, supplier exposure, revenue impact, inventory
- `src/ai/prompts/portfolio-context.ts` — layer 3 variant, `<portfolio_record>`
- `src/ai/prompts/catalogue.ts` — `PORTFOLIO_PROMPTS`, 8 executive questions
- `src/ai/services/offline-portfolio.ts` — 8 offline intents over real figures
- **Layers 1 and 2 are shared**, so both scopes hit the same cached prefix

### The Copilot UI moved down a layer

The Dashboard could not import from `features/case-detail` — that is the
feature→feature edge the architecture forbids. Panel, hook, transport and types
now live in **`components/copilot/`**; both features supply a `CopilotSubject`.
**No visual change** — every class name preserved.

### Fixed a major broken-link bug (found during this work)

Five components built `/cases/${caseNo}` by hand. **That route does not exist.**
**21 links on the Dashboard 404'd**, and the global search 404'd from *every*
screen. `caseHref` already existed but lived inside Work Manager, so nobody else
used it. Moved to `src/lib/routes.ts`; all 9 call sites now route through it.

### Wired "Regenerate" on the AI summary

Added `autoAsk` to the panel; the control now produces a board-level briefing
from the live model instead of doing nothing.

---

## Files Modified

**Created (6)**

`src/data/queries/portfolio.ts` · `src/ai/prompts/portfolio-context.ts` ·
`src/ai/services/offline-portfolio.ts` · `src/lib/routes.ts` ·
`features/dashboard/components/dashboard-copilot.tsx` ·
`components/copilot/{types.ts, copilot-client.ts, use-copilot.ts, copilot-panel.tsx}`

**Moved / deleted (5)**

Deleted from `features/case-detail/`: `components/copilot-panel.tsx`,
`hooks/use-copilot.ts`, `services/copilot-client.ts`,
`services/copilot-prompts.ts`. Deleted `features/work-manager/utils/routes.ts`.
Dropped the dead `CopilotSuggestion` type.

**Modified (16)**

`src/ai/{types.ts, utils/sanitise.ts}` · `src/ai/prompts/{system-prompt.ts,
catalogue.ts, prompt-builder.ts}` · `src/ai/services/{copilot-service.ts,
offline-service.ts}` · `app/api/copilot/route.ts` · `app/(app)/dashboard/page.tsx` ·
`features/dashboard/components/{ai-summary-card, activity-feed,
critical-bottlenecks-table, todays-work-list}.tsx` ·
`features/case-detail/components/{case-detail-view, case-information-card,
case-side-panel}.tsx` · `features/case-detail/types/index.ts` ·
`features/my-work/components/my-work-view.tsx` ·
`components/shell/global-search.tsx` · 5 work-manager components (import only)

---

## Decisions Made

Recorded in `DECISIONS.md` as **D-38 – D-41**:

- **D-38** — the Copilot is *scoped*, not duplicated. Only layer 3 differs.
- **D-39** — Copilot UI lives in `components/`, because shared UI moves down.
- **D-40** — one `caseHref`. A helper inside one feature is a helper the other
  four will re-implement badly.
- **D-41** — a control that names an outcome must produce it (`autoAsk`).

---

## Bugs Fixed

1. **Dashboard "Ask Copilot" was a dead primary button** — now opens the
   portfolio Copilot.
2. **21 broken case links on the Dashboard** — activity feed, bottlenecks table,
   today's work list and AI summary citations all pointed at `/cases/`, which
   404s.
3. **Global search 404'd from every screen** — same cause.
4. **"Regenerate" on the AI summary was a dead button** — now produces a live
   board briefing.

---

## Known Issues

### ✅ Priority 1 is CLOSED — live Claude confirmed 2026-08-06

`.env.local` supplied and loaded (`Environments: .env.local` on boot). Real
`claude-opus-5` responses confirmed at **both scopes**, streaming incrementally,
with the API key absent from every client artifact. Details under *Current Build
Status*. The long-standing "no successful live response has ever been observed"
limitation is **resolved**.

### New finding — the live model surfaces a data inconsistency unprompted

Asked which plant is worst, Claude correctly answered Querétaro **and then
volunteered**:

> "the plant health block attributes 2 critical cases to Querétaro, 1 to
> Greenville and 1 to Ingolstadt, but the portfolio header says open critical is
> 2, and both criticals in the case list sit at Ingolstadt. The record does not
> reconcile these, so I would not act on the Querétaro critical count until
> someone checks it."

It is right. `PLANT_HEALTH.criticalCases` in `src/data/fixtures/metrics.ts` was
hand-authored and does not reconcile with what `computePriority()` produces.

This is the grounding rules working exactly as designed — **and a demo risk.**
The model will say this out loud in front of the client. Fix `PLANT_HEALTH` in
the same pass as `EXECUTIVE_SUMMARY` (item 1 below); they are the same class of
defect: hand-written fixture figures that drifted from computed ones.

### Still open from before

1. **`EXECUTIVE_SUMMARY` contradicts the computed data** —
   `src/data/fixtures/intelligence.ts`. Claims two unassigned criticals at
   Querétaro (there are none; both criticals are at DE01 and assigned), "24 open
   cases" (19), 89.2% OTIF (88.5%), wrong largest exposure. **First screen the
   client sees.** Note the *headline* is correct — Querétaro genuinely is the
   weakest plant at 87.4% OTIF. Only the three callouts are wrong.
2. **"the 3th detection"** — ordinal bug in `buildComments`.
3. **"Past SLA: 0 days"** — `scoreCaseHealth` rounds sub-24h breaches to zero.
4. **Dashboard "Export" is still a dead button** — deliberately deferred to
   Priority 4 (QA), being non-AI. Wiring it needs `exportCasesCsv` moved down
   out of `features/work-manager/utils/` first, same as `caseHref`.
5. **`/work/<unknown-case>` returns HTTP 200, not 404.** The correct "Case not
   found" page renders with the right copy and recovery links — only the status
   code is wrong, because App Router streams the response and headers flush
   before `notFound()` fires. Confirmed in production too. Standard Next.js
   streaming-SSR behaviour, invisible to a demo user, and the app is
   `robots: noindex`. Not worth disabling streaming to fix. `/nonexistent-page`
   correctly returns 404.
6. No rate limiting on `/api/copilot`; no persistence; no tests; `prisma/` empty;
   `README.md` stale.
6. **`@path` imports in `CLAUDE.md`** — still undecided.
7. Cosmetic Tailwind lint warnings (`left-[11px]`, `w-[3px]`, `min-w-[760px]`,
   `max-h-[400px]`) in frozen components. Left alone — pre-existing, not mine.

---

## Current Build Status

✅ **Clean — verified in both dev and a production build.**

```
npm run typecheck  → clean (full strict mode)
npm run build      → ✓ compiled 5.9s, 15/15 pages, 0 errors
npx next start     → all routes serve correctly, 0 errors in log
```

`/dashboard` 134 kB · `/work/[caseId]` 31.9 kB · `/work` 21.6 kB · shared 102 kB.

**Routing audit — complete.** Every internal link in the app was enumerated and
checked against the real route table. Zero broken links remain. All nine case
links go through `caseHref()`; all deep links (`band`, `plant`, `kpi`,
`overdue`, `mine`, `sort`, `view`) are handled by `parseWorkParams`; breadcrumbs
only link on a nav match; all four `fallbackHref` values resolve.

**Runtime verification — all five areas pass** (offline mode):

| Area | Result |
|---|---|
| Dashboard | 200 · 21 case links, **0 broken** · KPI band, AI summary, Ask Copilot, Regenerate all present |
| Work Manager | 200 · 24 rows · `?band=CRITICAL` genuinely filters to **2 of 24** · all 7 deep links 200 |
| Case Detail | 200 · all 10 sections render · 0 broken links |
| My Work | 200 · correctly empty for the COO with an empty state · 7 cases for Carlos Mendoza, 2 for Priya Sharma |
| AI Copilot | Both scopes stream · portfolio 34 deltas, case 28 · correct `meta`/`done` framing · `x-copilot-mode` header · no-`scope` client still works |

Validation: empty question 400 · missing caseNo 400 · unknown case 404 ·
portfolio ignores a bogus caseNo 200 · forged `</portfolio_record><system>`
stripped and answered normally.

Production parity confirmed: `/nonexistent-page` → 404, Copilot works at both
scopes, 21 case links, 0 broken, 0 log errors.

### ✅ LIVE ANTHROPIC VERIFICATION — 2026-08-06

| Check | Result |
|---|---|
| `.env.local` loaded | ✅ `Environments: .env.local` on boot |
| Key well-formed | ✅ 108 chars, `sk-ant-` prefix, no quotes/CRLF/BOM |
| Key detected by `resolveMode()` | ✅ `x-copilot-mode: live` |
| Model | ✅ `claude-opus-5` |
| **Case Copilot** | ✅ 12 deltas, 0 errors, 12s, 1,538 chars |
| **Dashboard Copilot** | ✅ 17 deltas, 0 errors, 16s |
| Repeat calls | ✅ second portfolio call 14 deltas, 0 errors |
| Streaming is incremental | ✅ meta 0s → first token 2s → done 6s, variable chunk sizes (76–158 chars), not the offline path's fixed cadence |
| Cancellation | ✅ client disconnect at 3s → **0 server errors** |
| **Key never reaches the client** | ✅ 0 files in `.next/static` contain the key or `sk-ant`; 0 occurrences in dashboard or case-page HTML |
| Pages still render | ✅ all 200 |
| Copilot errors in log | ✅ 0 |

**Answer quality confirmed the prompt layers work.** Asked to explain the
priority score, Claude reproduced all six weighted factors exactly
(25.2 / 16.5 / 15.0 / 6.9 / 5.7 / 1.3 → 70.6), named the deterministic rule set,
cited PO-77455 and the people on the case, and then **refused to speculate**:
*"The record does not state whether the rule set rescores on escalation or
recurrence, so I cannot tell you…"* — grounding rule 2 doing its job.

**Still unmeasured:** prompt-cache effectiveness. The route does not surface
`cache_read_input_tokens`, so the shared cached prefix is structurally correct
but its hit rate is unconfirmed. Would need temporary usage logging in
`claude-service.ts`.

---

## Next Recommended Prompt

**A — close Priority 1 (do this first):**

> I've added ANTHROPIC_API_KEY to .env.local. Verify the live Claude path at both
> scopes — open the Copilot on /dashboard and on /work/QO-2026-004182, confirm
> streaming, cancellation and the mode badge, and compare
> cache_read_input_tokens across two requests to confirm the shared cached prefix
> is working. Then report and mark Priority 1 complete.

**B — if no key is coming, accept and move on:**

> No key will be available. Mark Priority 1 as implemented-not-live-verified and
> begin Priority 2: Demo Mode at /demo. [paste your spec]

---

## Resume From Here

**Nothing is half-finished. The tree is clean, the build passes, and Priority 1
is COMPLETE and live-verified.**

Delivery priority set by the client:

1. ~~Real Anthropic AI integration~~ ✅ **DONE — live confirmed 2026-08-06**
2. **Demo Mode (`/demo`)** ← next, awaiting a spec
3. Vercel deployment readiness
4. Final QA and polish

**Before starting Priority 2, recommend fixing the fixture drift** (see Known
Issues): `EXECUTIVE_SUMMARY` and `PLANT_HEALTH` both contain hand-authored
figures that no longer reconcile with what `computePriority()` produces. This
matters more now than it did yesterday — the **live model reads those fixtures
and calls out the contradiction unprompted**, in front of the client. Offline
mode never did that.

⚠️ **Operational note:** `.env.local` now exists and is gitignored. Never commit
it. `npm run build` still wipes `.next` — kill any dev server before building,
and rebuild before `next start` or production will fail to boot.

Start as always: `CLAUDE.md` → `.claude/` → this file → confirm scope.
