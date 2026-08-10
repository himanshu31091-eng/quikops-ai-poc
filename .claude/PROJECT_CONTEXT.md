# PROJECT_CONTEXT

> What this product is, who it is for, and the vocabulary the code uses.
> Read this first. Everything else assumes it.

---

## 1. What QuikOps AI is

QuikOps AI is an **operational execution platform** for manufacturing. It is a
client-facing demonstration build (a POC being walked through in a live client
presentation), implemented to production standards rather than as a mockup.

The product's positioning, stated on the login screen in the codebase:

> Your enterprise data identifies operational bottlenecks. QuikOps AI turns them
> into executed, verified outcomes.

The **enterprise data platform** is the upstream analytics system. It evaluates
rules against plant data and raises signals. QuikOps AI is the
**execution layer** that sits after it: a signal becomes a case, the case gets
scored, owned, worked, evidenced and independently verified, and only then does
its revenue exposure count as recovered.

The gap the product claims to close: analytics tells you a problem exists;
nothing owns it, tracks it to closure, or proves the fix held.

**The upstream platform is never named.** Customer feedback asked for
vendor neutrality, so no screen, export, prompt or notification identifies a
specific analytics vendor — see D-67. Copy says *enterprise data platform*,
*connected enterprise data* or simply *detected*. The internal enum key stays
`EVERY_ANGLE` because renaming it would rewrite the fixture corpus for no
user-visible gain; it is never rendered directly.

- Vendor: **MoreYeahs** (`APP.vendor` in `src/config/app-config.ts`)
- Product name / tagline: **QuikOps AI — Operational Execution Platform**
- Version: `0.9.0-poc`, environment `Demo`

---

## 2. Who uses it

Five roles, defined in `USER_ROLES` (`src/domain/types.ts`):

| Role | Who they are | What they do in the product |
|---|---|---|
| `EXECUTIVE` | COO, VP level | Reads the dashboard. Sponsors work, never owns a case. |
| `OPS_MANAGER` | Plant / global ops managers | Triages, assigns, verifies. |
| `TASK_OWNER` | Procurement, planning, logistics leads | Owns cases, executes corrective actions. |
| `ANALYST` | Supply chain analysts | Investigates, can own cases. |
| `ADMINISTRATOR` | Platform admin | Configuration, users, routing rules. |

Only `OPS_MANAGER`, `TASK_OWNER` and `ANALYST` are assignable
(`ASSIGNABLE_ROLES` in `src/data/queries/case-mapper.ts`) — *executives sponsor
work; they do not own it.*

---

## 3. The seeded organisation

A fictional tier-one **automotive and aerospace components manufacturer**
(email domain `northbridge-industrial.com`), four production sites:

| Code | Plant | Country |
|---|---|---|
| `MX01` | Querétaro | Mexico |
| `US01` | Greenville | United States |
| `DE01` | Ingolstadt | Germany |
| `IN01` | Pune | India |

**Eight users** (`src/data/fixtures/organisation.ts`). Four are offered as demo
personas on the login screen and in the role switcher:

- `usr_evasquez` — **Elena Vásquez**, Chief Operating Officer *(default session user)*
- `usr_mreinhardt` — **Marcus Reinhardt**, VP Global Operations
- `usr_cmendoza` — **Carlos Mendoza**, Procurement Manager — Americas
- `usr_swhitfield` — **Sandra Whitfield**, Platform Administrator

Also seeded, assignable but not personas: Priya Sharma (Plant Ops Manager,
Querétaro), Thomas Berger (Senior Production Planner, DE01), Aisha Okonkwo
(Logistics Lead), Daniel Kim (Supply Chain Analyst).

**29 operational cases** (`src/data/fixtures/cases.ts`), distributed:

- Status: 2 `NEW`, 3 `TRIAGED`, 4 `ASSIGNED`, 6 `IN_PROGRESS`, 3 `PENDING_VERIFY`, 5 `VERIFIED`, 5 `CLOSED`, 1 `REOPENED` — **19 open, 10 resolved**
- Detection source: 17 `EVERY_ANGLE`, 6 `PLAYBOOK_MONITOR`, 6 `MANUAL`
- Priority band is **not seeded** — it is computed by `computePriority()` from the seed's inputs.
- Resolution time is **not seeded** either — `resolutionFactor(caseNo)` spreads it
  either side of each case's SLA target, so 8 of the 10 resolved cases met their
  target and 2 missed. A flat multiplier previously made adherence 100% by
  construction (D-50).

**Every portfolio figure is derived** from this corpus by
`src/domain/portfolio-metrics.ts` — open counts, exposure, breaches, MTTR, SLA
adherence, verification pass rate, recurrence, plant rollups and the dashboard's
AI summary. Nothing is asserted separately, so no two screens can disagree
(D-48). The exceptions are OTIF, inventory days and schedule adherence, which
are enterprise data platform measurements, and quarter-on-quarter deltas, which need a prior
period the snapshot does not contain.

---

## 4. The domain vocabulary

These words have precise meanings in this codebase. Use them exactly.

**Case** — one detected operational exception, owned end to end. Identified by
`caseNo` (`QO-2026-004xxx`), which is the identifier every module carries.
`caseNo`, not `id`, is the key for cross-module state and the URL segment.

**Exception type** — the nine categories of thing that can go wrong:
`VENDOR_DELAY`, `MATERIAL_SHORTAGE`, `CAPACITY_CONSTRAINT`, `QUALITY_HOLD`,
`INVENTORY_EXCESS`, `INVENTORY_STOCKOUT`, `PLANNING_DEVIATION`,
`DELIVERY_AT_RISK`, `OTHER`.

**Detection source** — where the case came from: `EVERY_ANGLE` (the connector),
`PLAYBOOK_MONITOR` (a playbook's own recurrence/threshold rule), `MANUAL`
(opened by hand from the plant floor or a review meeting).

**Lifecycle** — nine persisted statuses collapse onto six the manager works
from. The mapping lives in `src/domain/case-status.ts` and nowhere else:

```
detected → assigned → in progress → waiting verification → verified → closed
```

`NEW`, `TRIAGED`, `REOPENED` → **DETECTED** · `PENDING_VERIFY` → **WAITING_VERIFICATION** ·
`CLOSED`, `DISMISSED` → **CLOSED**.

**Priority** — scored **0–100 by a deterministic rule set, never by a model**
(`src/domain/priority.ts`). Weighted factors: revenue at risk (35), KPI
deviation (26), customer tier (15), days to promised date (12), recurrence (8),
escalation level (4). Bands: critical ≥ 75, high ≥ 55, medium ≥ 32, low below.
The reason it is rule-based is stated in the source: *an unexplainable priority
is an ignored priority* — an executive has to be able to defend it in a review.

**SLA** — resolution target by band (`src/domain/sla.ts`): critical 24h, high
72h, medium 240h, low 720h. Breaching escalates the case above the owner.

**Health** — *execution* health (`src/domain/case-health.ts`), 0–100, bands
`ON_TRACK` / `AT_RISK` / `OFF_TRACK`. Distinct from priority: **priority says
how much it matters, health says whether the work is actually moving.**

**Verification** — a second pair of eyes. The owner cannot verify their own
work. A reviewer approves, rejects, or sends back.

**Revenue at risk** — the value of confirmed demand that cannot be served if
the condition is not cleared before the promised date. It is *exposure*, not a
loss already taken.

**Recovered revenue** — exposure that has moved out of the at-risk pool.
**Verification is the only route to it.** Closing a case administratively
removes it from the open queue and recovers nothing. This invariant is enforced
in `src/workflow/projections.ts::revenueMovement` and is one of the load-bearing
ideas of the whole demo.

**Measurement window** — 14 days (`KPI_MEASUREMENT_WINDOW_DAYS`). A case is not
truly closed until the measured KPI has held over the window.

**Recurrence** — the same condition detected again. A stronger signal than a new
case: it means the previous corrective action did not hold.

---

## 4a. What the browser remembers

Three things, and only three, survive a reload — all of them belonging to a
person's habits rather than to the operation:

| What | Where | Why |
|---|---|---|
| Tour completion | `localStorage` (D-60) | Onboarding that reappears on every reload is an obstacle |
| Tip dismissals | `localStorage` (D-78) | Same argument, per hint; cleared by demo reset |
| Saved reports | `localStorage` | The template plus the sections a manager kept is the artefact they send |

Everything else — every case mutation, every filter, every selection — is
session-scoped by design and discarded on refresh.

---

## 5. The frozen clock

`DEMO_NOW = new Date("2026-08-05T09:12:00Z")` — `src/lib/constants.ts`.

Every fixture, relative date, SLA calculation, trend series and session
timestamp is anchored to it. Nothing in the app calls `new Date()` for "now".

This is deliberate: the demo must be byte-identical on every rehearsal and every
run. A chart that redraws differently on refresh destroys confidence in the
numbers. Replaced with `new Date()` when live ingestion runs.

Trend series use a seeded `mulberry32` PRNG for the same reason.

---

## 6. The golden case

`GOLDEN_CASE_NO = "QO-2026-004182"` — exported from `src/data/fixtures/cases.ts`
and the centrepiece of the demo.

> **Vendor delivery delay — RM-4471 — Nordex Componentes**
> Querétaro (MX01) · `TRIAGED` · **unassigned** · $180,000 at risk ·
> tier-one customer Grupo Aeromex Manufactura · supplier Nordex Componentes S.A.
> (V-2231) · **3rd detection in 45 days** · escalation level 1 · no corrective
> actions yet.

It is built to be walked: unowned, recurring, high value, tier-one customer,
already escalated, and with an empty plan — so every workflow action has
somewhere to go.

---

## 7. What is real and what is seeded

| Real | Seeded / simulated |
|---|---|
| Anthropic Claude API integration (live, streaming) | All operational data — no database |
| Priority scoring, health scoring, SLA maths | The signal connector (no ingestion runs) |
| Filtering, sorting, virtualisation, export | Authentication (cookie-based persona switch) |
| Cross-module state propagation | Persistence — all mutations are session-scoped |

Nothing is random. There is no lorem ipsum. Every number a client sees traces to
a fixture or a computation over one.
