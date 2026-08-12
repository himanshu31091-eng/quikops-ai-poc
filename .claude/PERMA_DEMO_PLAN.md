# PERMA DEMO PLAN

> Gap analysis for the Perma Construction Aids demonstration scenario.
> Written 2026-08-15, after commits `1e698b6` and `93f6592` had already seated
> the scenario. This document states what is **built**, what is **missing**, and
> what is **not achievable as specified** — in that order, because a plan that
> re-proposes finished work wastes the reader's time.

---

## 0. Standing rule — Perma is illustrative, not a customer

**There is no evidence in this repository that Perma Construction Aids is a
QuikOps customer.** No contract, no implementation record, no correspondence.
The name entered this codebase on 2026-08-15 as a demonstration scenario and
nothing more.

Therefore: **the product must never state or imply that this was implemented
for Perma.** The company is a representative Indian construction-chemicals
manufacturer used to show how the platform would address a real operational
problem. Every figure on every screen is illustrative.

This is not a presentation nicety. Claiming a customer the vendor does not have
is the one demo error that cannot be walked back in the room.

---

## A. Current architecture

Unchanged by the Perma work, and the reason the Perma work was possible at all.

```
app  →  features  →  components  →  src
```

- `src/domain` — framework-free business rules. Priority, SLA, case status,
  health, flow balance, portfolio metrics.
- `src/data/fixtures` — the seeded corpus. **Only `src/data/queries` reads it.**
- `src/data/queries` — async, returns finished view models. The swap point for a
  real database.
- `src/ai` — four-layer prompt builder; layers 1–2 frozen and cached.
- `features/*` — one folder per screen, five subfolders each.

**The load-bearing property is D-48: every portfolio figure is derived.** Open
counts, exposure, SLA adherence, MTTR, recurrence, verification pass rate, plant
rollups, the backlog ledger and the dashboard AI summary are all computed from
the case corpus by `portfolio-metrics.ts` and `flow-balance.ts`. Nothing is
asserted separately, so **no two screens can disagree**. This is what makes the
demo survive a client who counts rows.

---

## B. Current demo story — already Perma

Seated in `1e698b6`:

| | |
|---|---|
| Company | Perma Construction Aids — construction chemicals, India |
| Plants | Vapi (VP01), Roorkee (RK01), Hyderabad (HY01), Chennai (CH01) |
| People | 9 across procurement, production, quality, logistics, planning, admin |
| Personas | Supply Chain Head · Head of Operations · Procurement Manager · Administrator |
| Currency | INR, `en-IN` — lakh and crore |
| Clock | `DEMO_NOW` = 15 Aug 2026, three days after the hero case is detected |
| Corpus | 58 authored cases, 36 open |
| Hero case | `QO-PA-2026-00421` — polymer resin delay, Vapi, CRITICAL 81.7, ₹42,00,000 |

**Vapi is worst on its own merits**, not by assertion: 15 open cases, both
criticals, OTIF 87.0% and the worst movement at −4.1 pts. The dashboard AI
summary names the hero case unprompted because it reads the same corpus.

---

## C. Current data sources

Two mechanisms, both already present:

1. **`src/data/fixtures/connectors.ts`** — seven feeds including two SAP ERP
   channels (`SAP S/4HANA`), Oracle Fusion SCM and Microsoft 365. This is the
   Connector Health screen and it predates the Perma work.
2. **`sourceSystem` + `sourceRecord` on every case** — added in `1e698b6`. The
   hero case carries `SAP ERP` / `PO-PA-45821`. Others carry the Quality
   Management System, the Procurement System, Logistics & Dispatch, or
   `Manual entry` for floor observations.

Rendered by **`features/case-detail/components/data-lineage-card.tsx`** — "How
this case reached QuikOps": system of record → source record → operational
signal → business rule → case → owner.

The chain stops at the owner deliberately. What happens next is the rest of the
screen; extending the lineage into the outcome would imply the platform decided
the outcome.

---

## D. Current case lifecycle

Nine persisted statuses collapse onto six the manager works from
(`src/domain/case-status.ts`, the single definition):

```
detected → assigned → in progress → waiting verification → verified → closed
```

Invariants that matter to this demo:

- **Verification is the only route to recovered revenue.** Closing a case
  administratively recovers nothing (`src/workflow/projections.ts`).
- **The owner cannot verify their own work.**
- **Outcomes are measured over a 14-day window**, so a case is not truly closed
  until the KPI has held.

---

## E. What is missing for the Perma scenario

Ordered by how much it costs the story.

| # | Gap | Size | Why it matters |
|---|---|---|---|
| 1 | **Nothing states Perma is illustrative.** The badge says "Demo Mode · Synthetic Data" but never that the company is a scenario. | S | §0. The one error that cannot be walked back. |
| 2 | **No unintended-impact panel.** The Copilot can answer the question; no screen shows it. | M | Step 11. It is the credibility beat of the whole demo. |
| 3 | **Verification does not show baseline vs current visually.** The data exists; the framing is not written. | M | Step 10. "Did it work?" is the closing question. |
| 4 | **`.claude/` docs describe the previous organisation.** `PROJECT_CONTEXT.md`, `DEVELOPMENT_STATUS.md`, `SESSION_HANDOFF.md`. | M | Actively misleads the next session. |
| 5 | Help Center, guided tour, knowledge base and reports copy renamed mechanically, not rewritten for construction chemicals. | L | Visible if the presenter opens Help. |
| 6 | Analytics narrative not framed as a story. | M | Numbers reconcile; the sentence around them is missing. |
| 7 | Presentation screenshots show the previous organisation entirely. | L | All 41 assets are stale. |

---

## F. Modules reusable as-is

**All of them.** No module needs replacing. The Perma work changed fixtures,
two domain constants and one additive panel — not one screen was redesigned.

Dashboard · Work Manager · Case Detail · My Work · Action Center · Execution
Analytics · Playbooks · Reports · Connector Health · Audit Log · Administration
· Help Center · AI Copilot · Execution Workflow.

---

## G. Files needing modification

| File | Change |
|---|---|
| `components/shell/demo-mode-badge.tsx` | Name the scenario and mark it illustrative |
| `features/case-detail/components/verification-card.tsx` | Baseline vs current, measurement window state |
| `features/case-detail/components/` *(new)* | Related-KPI / unintended-impact panel |
| `.claude/PROJECT_CONTEXT.md` | Rewrite for Perma |
| `.claude/DEVELOPMENT_STATUS.md` · `SESSION_HANDOFF.md` | Bring current |
| `src/help/content.ts` · `src/tour/tours.ts` | Construction-chemicals copy |

---

## H. New components genuinely required

Exactly one: **the related-KPI panel**. Everything else is copy, data or an
edit to an existing component.

---

## CURRENT FLOW → TARGET FLOW

**Current** (after `1e698b6` / `93f6592`) — the spine is built:

```
SAP ERP ✓ → PO-PA-45821 ✓ → signal ✓ → business rule ✓ → QO-PA-2026-00421 ✓
  → Arun Iyer ✓ → 3 corrective actions ✓ → evidence ✓ → verification ✗
  → KPI movement ✗ → unintended impact ✗ → management ✗ → playbook ✓
```

**Target** — three links to close, all on Case Detail:

```
… → evidence ✓ → VERIFICATION (baseline 87% → current 92%, window open at day 3)
  → RELATED KPI (finished-goods inventory, surfaced not attributed)
  → management reads both → playbook ✓
```

---

## Not achievable as specified — and what to do instead

**Step 12's analytics figures cannot be derived from a 58-case corpus.**

`42 + 31 − 22 = 51` is the *7-day* ledger and `21/24/27/31` is the *4-week*
inflow series — both are readings of `flow-balance.ts`, and they are mutually
consistent, but together they require **103 cases detected in 28 days with 51
still open**, i.e. a corpus of roughly 150 authored cases. The current corpus is
58 and computes `8 → 36 over 28 days, 46 detected / 18 resolved`.

Three options, in preference order:

1. **Report what the corpus computes** (current state). The management insight —
   *new exceptions arriving faster than they are resolved* — holds exactly, and
   the equation reconciles on screen. Only the digits differ.
2. Grow the corpus to ~150 cases. Several sessions; tail cases would be terser.
3. Seed the ledger directly. **Rejected**: Work Manager would show 36 open
   against a dashboard claiming 51, which a client can disprove by counting.

Option 1 is in force, agreed in session.

**Step 20's route list is wrong.** The real routes are `/work/QO-PA-2026-00421`
(not `QO-2026-00421`), `/system/connectors`, `/system/audit` and `/admin`.

---

## Verification standard for this work

Browser click-through **is** possible in this environment via CDP — established
2026-08-11. Screens are captured at 1920×1080 at 2× with reduced motion, fonts
settled and zero skeletons asserted, then read. Claims about rendering are
observed, not inferred.

The one thing still unobservable: **a successful live Claude answer.** No API
key has ever been available here, so the Copilot is verified as far as prompt
assembly and grounding data, never a 200-with-content.
