# PRESENTATION_CONTEXT

> **Purpose.** This is the single source of truth for producing executive
> presentations, demo scripts, brochures, sales decks, one-pagers, technical
> architecture decks, ROI material, client FAQs and speaker notes for
> **QuikOps AI** — without access to the source code.
>
> **Audience.** Another Claude instance that has never seen this project.
>
> **Provenance.** Every figure below was measured against the codebase on
> **2026-08-08**, not recalled from documentation. Where something is planned
> rather than built, it is marked so explicitly. **Do not upgrade a "planned" to
> a "built" in any material you generate from this file.** The single fastest
> way to lose an enterprise deal is to demo a capability the product does not
> have, and the second fastest is to be caught claiming one.

---

## 1. Executive Summary

### Product name

**QuikOps AI** — an operational execution platform for manufacturing.

### Vision

Detection is a solved problem in manufacturing. Every mid-sized manufacturer
already owns systems that can tell them something is wrong. What almost none of
them own is a system that makes sure somebody *did something about it* and that
the thing they did *worked*.

QuikOps AI is that system. It takes a detected operational exception and drives
it to a verified outcome — owned, worked, evidenced, and independently checked
by a second person before any value is claimed.

### Elevator pitch

> Your enterprise data identifies operational bottlenecks.
> **QuikOps AI turns them into executed, verified outcomes.**

A detected signal becomes a case. The case is scored, owned, worked, evidenced
and **independently verified** — and only then does its revenue exposure count
as recovered.

### The problem it solves

Manufacturers lose revenue not because problems are invisible, but because the
gap between *knowing* and *fixing* has no system in it. A supplier moves a
confirmed date; a planner sees it in a report on Tuesday; the customer is told
on Friday; nobody records why; the same supplier does it again next quarter and
the organisation has no evidence that it is a pattern.

QuikOps AI closes that gap with an execution layer that sits above the ERP.

### Target industries

Discrete and process manufacturing where a missed date carries contractual
consequence:

- Automotive and aerospace components (the seeded demo profile)
- Industrial equipment and machinery
- Electronics and electro-mechanical assembly
- Chemicals, coatings and building materials
- Any multi-plant manufacturer running more than one ERP

### Target users

Five roles, all implemented and switchable live in the demo:

| Role | Who they are | What they do |
|---|---|---|
| **Executive** | COO, VP Operations | Reads the position. Sponsors work, never owns a case. |
| **Operations Manager** | Plant and global ops managers | Triages, assigns, verifies. |
| **Task Owner** | Procurement, planning, logistics leads | Owns cases, executes corrective actions. |
| **Analyst** | Supply chain analysts | Investigates; can own cases. |
| **Administrator** | Platform admin | Configuration, users, routing rules. |

**A rule worth quoting in a deck:** executives sponsor work, they do not own it.
Only Operations Manager, Task Owner and Analyst can be assigned a case, and this
is enforced in code, not by convention.

### Business outcomes

- **Exposure that is recovered, not just closed.** Revenue leaves the at-risk
  pool only on independent verification.
- **A defensible priority order.** Every case scores 0–100 on a deterministic
  rule set an executive can defend in a review.
- **Detection-to-resolution measured end to end**, with the flow balance
  showing whether the operation is gaining on its backlog or losing to it.
- **An audit trail by construction** — no state change without a timeline event
  and an audit entry.

---

## 2. Manufacturing Problem Statement

### Why ERP systems are insufficient

An ERP is a system of record. It answers *what is true* — this order exists,
this material is short, this date has moved. It is excellent at that and
QuikOps AI does not compete with it.

What an ERP does not answer:

- **Who owns this?** ERPs record transactions, not accountability.
- **Is anyone working it?** A flag in a table is not a state of work.
- **Did the fix hold?** ERPs have no concept of verifying an outcome.
- **Is this the third time?** Recurrence is invisible without a case history.
- **What is it worth to fix this one before that one?** No ERP scores
  operational exceptions against revenue exposure and customer tier.

The practical result is that exception management happens in email, spreadsheets
and standing meetings — none of which produce a record, a measurement or an
escalation path.

### The operational execution gap

There are three layers in a manufacturing operations stack, and most
organisations own two of them:

1. **Systems of record** — SAP, Oracle, Dynamics. What is true.
2. **Analytics and detection** — the enterprise data platform, Power BI, custom
   reporting. What is wrong.
3. **Execution** — *usually absent.* Who owns it, what was done, did it work.

QuikOps AI is layer three. It consumes layer two and never replaces layer one.

### Exception management

An exception is any operational condition that threatens a commitment: a vendor
delay, a material shortage, a capacity constraint, a quality hold, an inventory
stockout or excess, a planning deviation, a delivery at risk.

Handled ad hoc, each is a conversation. Handled as a case, each is:
detected → scored → owned → worked → evidenced → verified → closed, with every
transition recorded.

### Root cause tracking

Closing a case without changing what produced it buys one cycle. QuikOps AI
treats a **recurrence** — the same condition detected again — as a stronger
signal than a new case, because it means the previous corrective action did not
hold. Recurrence rate is a headline metric, not a footnote.

### AI-assisted operations

The AI in QuikOps AI is deliberately scoped. It explains, summarises and
recommends against a record it did not invent. It never sets a priority score,
never decides a status and never verifies an outcome. That boundary is a selling
point, not a limitation — see §6 and §12.

### Supply chain challenges the product addresses

- Suppliers who move confirmed dates repeatedly without commercial consequence
- Safety stock thresholds set against a demand profile that has since changed
- Constrained lines where capacity cannot be added inside the window
- Quality holds whose quantity at risk grows for every hour undispositioned
- Multi-ERP estates where the same condition looks different in each system

---

## 3. Product Vision

QuikOps AI is an **execution layer**, not a replacement system. The positioning
is deliberately non-threatening to the incumbent stack, which matters
commercially: nobody has to rip anything out to buy it.

### How it complements the existing stack

| System | What it does | What QuikOps AI adds |
|---|---|---|
| **SAP S/4HANA** | Orders, demand, master data, the transactional truth | Ownership, execution state, verification and a case history the ERP has no place for |
| **Oracle Fusion Cloud SCM** | Work orders, on-hand balances, goods movements | The same execution layer over a second ERP, normalised into one case shape |
| **Microsoft Dynamics** | Same category as above | Same — the ingestion layer normalises rather than assuming a single source |
| **Enterprise data platform** | Evaluates the operational rule set and raises signals | Turns a signal into an owned, worked, verified outcome instead of a report line |

**The multi-ERP point is worth making in any technical conversation.** The
demo estate runs SAP at the European and US sites and Oracle at the Mexican and
Indian sites following an acquisition — which is the ordinary situation, not an
edge case. QuikOps AI normalises both into one case model, so the operating
process is identical regardless of which ERP raised the condition.

### The load-bearing product idea

**Verification is the only route to recovered revenue.** Closing a case
administratively removes it from the queue and recovers nothing. If closing
recovered revenue, the fastest route to a clean dashboard would be to close
everything — and that is exactly the behaviour the split exists to prevent.

This one rule is what makes the recovered figure mean something, and it is the
single strongest idea to lead with in an executive conversation.

---

## 4. Current Product Architecture

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15.5.22, App Router |
| UI | React 19.2, Server Components by default |
| Language | TypeScript 6.0.3, strict |
| Styling | Tailwind CSS v4 (`@theme`, no config file) |
| Primitives | Radix UI (avatar, dialog, dropdown, popover, separator, tooltip) |
| Charts | Recharts 3 |
| Icons | lucide-react, behind one `<Icon>` wrapper |
| Fonts | Inter Variable, JetBrains Mono Variable (self-hosted) |
| AI | `@anthropic-ai/sdk`, model `claude-opus-5` |
| Persistence | **None.** Typed fixtures behind an async query layer. |

TypeScript strictness in force: `strict`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`.

### The dependency rule

```
app  →  features  →  components  →  src
```

One direction only. **Features never import from other features** — verified
at zero cross-feature imports across all twelve. Shared logic moves *down* into
`src/`, never sideways. `src/domain` imports no framework at all: no React, no
Next, no Prisma.

This is worth a slide in a technical deck. It is the property that makes the
fixture-to-database swap a body-only change.

### Frontend

Pages are **server components**. They read data, read the URL, and hand both to
a client module root. The case detail page assembles the entire record in one
pass — opening a case costs one round trip, not a waterfall of section fetches.

### Backend

One route handler: `app/api/copilot` (Node runtime). Everything else is server
components reading the data layer directly. There is no separate API tier,
because a POC does not need one and the seam that matters is the data layer.

### AI layer (`src/ai/`, 13 modules)

```
config.ts               model, effort, token and timeout budgets
types.ts                CopilotMode, SessionOverlay, CopilotFailure
utils/sanitise.ts       sanitiseQuestion, sanitiseHistory, boundContext
prompts/
  system-prompt.ts      Layer 1 — persona + grounding rules   [FROZEN]
  business-context.ts   Layer 2 — domain rules                [FROZEN]
  case-context.ts       Layer 3 — this case
  portfolio-context.ts  Layer 3 — the portfolio
  catalogue.ts          the nine supported prompts
  prompt-builder.ts     the ONLY prompt assembler
services/
  claude-service.ts     streaming + error classification
  offline-service.ts    keyword-routed responder, ten intents
  offline-portfolio.ts  portfolio-scope offline answers
  copilot-service.ts    the facade — resolveMode, streamCopilotAnswer
```

### Workflow layer (`src/workflow/`)

A thin cross-module store mounted on the authenticated layout, so it survives
navigation between the queue, a case and the dashboard. It holds only what
another screen needs to know — *a case moved, an owner changed, revenue was
recovered* — never the full editing state of a screen.

Writers call `recordOutcome`. **Readers never touch raw state**; they go through
pure projections, so every screen derives its figures the same way.

### Data layer (`src/data/`)

- **10 fixture modules** — the seeded business data
- **13 query modules** — the data-access seam. Every function is `async` and
  returns a *finished view model*.

Connecting a real database replaces each function body and touches no component.
That property is why the seam exists and why every query is already async even
though nothing awaits I/O today.

### Domain layer (`src/domain/`, 14 modules)

Framework-free business rules: `priority`, `sla`, `case-status`, `case-health`,
`portfolio-metrics`, `flow-balance`, `segment-performance`, `connector-health`,
`playbook-effectiveness`, `action-recommendation`, `action-sla`,
`config-preview`, `platform-settings`, `types`.

### Design system

`app/globals.css` is the single source of truth for every token. **No colour,
size, radius or shadow value appears anywhere else in the repository** —
verified at zero raw hex and zero Tailwind palette classes outside that file.

- Semantic tokens only: `bg-surface`, `text-content-secondary`, `border-line`
- Body text 13px; page titles 20px; KPI values 24px
- **Two elevation levels only.** Structure is carried by a 1px border, not a
  shadow — one of the strongest signals separating enterprise UI from consumer UI
- Tabular numerals globally: *the single most reliable tell of amateur
  enterprise UI is misaligned digits in a column*
- **Exactly five animations.** Everything else is a 150ms opacity fade.
  `prefers-reduced-motion` collapses all of it in one media query.

### State management — three tiers, deliberately split

1. **Server props** (immutable) — the finished view model handed down
2. **Per-module hook** (rich, local) — one hook owns everything mutable in a
   module; everything derived is memoised from the same inputs, so no two panels
   on a screen can disagree
3. **Execution store** (thin, shared) — cross-module outcomes only

A single global store would make every keystroke on a case a global update. A
per-page store would make closing a case invisible to the dashboard.

**The empty-store invariant:** every projection returns its input unchanged when
nothing has been done. This is what lets the dashboard stay a server component
with a thin reactive shell over it — first client paint is byte-identical to the
server response, so there is no hydration flash.

---

## 5. Module Inventory

**Twelve feature modules, sixteen routes, all building clean.** Percentages
below describe completeness against the Phase-1 specification, not against an
imagined ideal product.

### 5.1 Executive Dashboard — `/dashboard`

**Purpose.** The operational position in one screen, with every number
traceable to the cases behind it.

**Business value.** Turns a monthly reporting cycle into a live position. Every
figure is a link, so the gap between noticing a number and acting on it is one
click.

**Key features.** Four headline KPI cards with targets and sparklines · a
five-metric execution performance strip · AI executive summary with tone-tagged
callouts · OTIF trend against target · priority distribution · critical
bottlenecks table · today's work list · revenue impact by exception type ·
plant health (worst first) · inventory health · activity feed · **flow verdict
band** · Ask Copilot · Export.

**Main components.** `LiveKpiBand`, `LiveExecutionMetrics`, `LiveActivityFeed`,
`LiveRevenueImpact`, `LiveSessionChip`, `LiveFlowVerdict`,
`DashboardExportButton` — thin client wrappers over untouched presentational
components.

**AI features.** Executive summary panel; portfolio-scope Copilot; the flow
verdict sentence.

**Status.** Complete and frozen. **100%**

### 5.2 Work Manager — `/work`

**Purpose.** Every operational case in one queue — triage it, own it, execute
it, verify it.

**Business value.** One queue means nothing is lost. Priority is scored, not
argued.

**Key features.** Table and board views · 14 filters with live counts · saved
views · bulk assign and bulk close · full-text search across case number,
material, supplier, plant, owner and customer · sort · create case · CSV export
· row virtualisation · **view state round-trips through the URL**, so any view
is shareable as a link.

**Main components.** `WorkToolbar`, `FilterBar`, `CaseTable`, `CaseBoard`,
`CaseCardList` (mobile), `WorkKpiHeader`, `InsightsPanel`, `SelectionSummary`,
`CreateCaseDialog`.

**AI features.** None directly — this is the deterministic queue by design.

**Status.** Complete and frozen. **100%**

### 5.3 Case Detail — `/work/[caseId]`

**Purpose.** The execution surface for a single case. The heart of the product.

**Business value.** This is where the execution model actually lives: assign →
act → evidence → verify → close, with every transition recorded.

**Key features.** Case header with priority chip and health score · executive
summary · corrective actions with completion percentage driving status ·
evidence locker with drag-and-drop, type validation and 25 MB limit · threaded
comments with @mentions · verification panel (owner cannot verify own work) ·
timeline · audit log with field-level from/to and source · related cases ·
supplier issues · AI insights · case-scope Copilot.

**Main components.** `CaseHeader`, `CorrectiveActionsCard`, `EvidenceCard`,
`CommentsCard`, `VerificationCard`, `TimelineCard`, `AuditLogCard`,
`CaseSidePanel`, `CopilotPanel`.

**AI features.** Pre-generated case insights (recurrence pattern, supplier
exposure, blocked work); case-scope Copilot answering against the full record.

**Status.** Complete and frozen. **100%**

### 5.4 My Work — `/my-work`

**Purpose.** The personal queue: what this person owns, what they must review,
what is due today.

**Business value.** A manager's queue and an operator's queue are different
questions. This answers the second.

**Key features.** Cases you own, in priority order · submitted for verification
· closed this session · awaiting your review (verification inbox) · today's
actions · due-today grouping.

**Status.** Complete and frozen. **100%**

### 5.5 Execution Analytics — `/analytics`

**Purpose.** How the operation is performing at closing the exceptions it
detects — and, since the flow region landed, whether it is *gaining*.

**Business value.** The counterpart to the dashboard: the dashboard says where
we are, Analytics says how we got here and where we are going.

**Key features — performance.** Four KPI trend cards · OTIF trend · revenue at
risk over time · resolution time by week · weekly throughput · cases by
priority, plant and exception type · top and bottom performing plants · owner
performance · reviewer performance · SLA heatmap · ageing heatmap · date range
and multi-select filters · CSV and PDF export.

**Key features — flow and forecast.** Flow balance ledger (opening + detected −
resolved = closing, reconciling exactly) · horizon control (this week / 4 weeks
/ 13 weeks) · **count ⇄ exposure toggle** · net-flow ribbon (detection above the
axis, resolution below) · backlog trajectory with a run-rate projection ·
forecast verdict · executive narrative with drivers · **recommendation cards
with impact figures and deep links** · drill-down by plant, exception, priority
and owner · band mixture · customer exposure with concentration · days in
trouble · escalation depth.

**AI features.** Composed executive narrative; ranked recommendations.

**Status.** Complete. **100%**

### 5.6 Action Center — `/actions`

**Purpose.** Everything that needs a decision today, across every case.

**Business value.** A case-level queue hides the fact that one person owns
fourteen actions across nine cases. This is the cross-case view.

**Key features.** Action queue sorted worst-SLA-first · four KPI tiles that
double as filters · bulk complete, assign and escalate · drawer detail ·
deadline groups · AI recommendations panel · quick actions · create action ·
search and filters · CSV export · pagination.

**AI features.** Recommendation panel with an applied state; per-action AI
recommendation in the drawer.

**Status.** Complete. **100%**

### 5.7 Reports — `/reports`

**Purpose.** The artefact a manager sends upward when they are not in the room.

**Key features.** Six report templates · section picker · live preview from the
real corpus · **CSV export** · **Excel export** (each section becomes its own
sheet) · **PDF via the browser print pipeline** · **saved reports** (template
plus section selection, persisted) · schedule definitions with cadence and
recipients · run history · case-level drill-down from the case list section.

**Status.** Complete. **100%** *(schedule delivery is a Phase-2 integration —
the definitions and the UI exist, the mail transport does not.)*

### 5.8 Connector Health — `/system/connectors`

**Purpose.** The integration story. Whether ingestion is healthy, and what
failed.

**Business value.** The screen a technical evaluator asks for. It is also the
evidence that the case corpus is real: the signal connector reports exactly
as many raised cases as there are cases marked as detected by it.

**Key features.** Seven connectors — data platform signals, data platform KPI
snapshots, playbook recurrence monitor, **SAP master data**, **SAP orders and
demand**, **Oracle SCM plant operations**, notification gateway · health score
and band per connector with drivers · run history (18 runs each, deterministic)
· ingestion funnel (received → deduplicated → processed → rejected → cases
raised) · **dead-letter queue with replay** · field mapping tables · trend
strips · four KPI tiles · filters and search · CSV export.

**A detail worth demoing.** Some dead-letter messages **cannot** be replayed —
a schema mismatch will fail identically. Those are marked, and the replay is
refused with an explanation rather than pretending. This is the kind of honesty
technical buyers notice.

**Status.** Complete. **100%**

### 5.9 Audit Log — `/system/audit`

**Purpose.** An append-only record of every state change across every case.

**Key features.** Timeline of entries with actor, entity, action, field-level
from/to · **source attribution** (data platform, rule engine, case detail, work
manager, API) · user activity and AI activity · search · filters · four KPI
tiles · CSV export · deep links to the case.

**Status.** Complete. **100%** *(session-scoped, like every mutation.)*

### 5.10 Administration — `/admin`

**Purpose.** Users, roles, permissions, departments, routing and configuration —
with a live preview of what each change would do.

**Key features.** User table with role, job title, plant scope and status ·
**derived routing rules** (plant + exception type → default owner, inferred
from who actually owns that combination) · **priority weight editor with live
re-scoring and a preview of which cases would change band** · **SLA threshold
editor with the same preview** · **permission matrix derived from the rules the
code enforces**, each row naming the enforcing file · **departments** with load
joined through the case owner · **AI settings** · **workflow settings** ·
**notification settings** · CSV export.

**The differentiating detail.** Change a priority weight and every open case
re-scores live, listing which ones would change band *before* anything is saved.
A settings page nobody trusts is a settings page nobody uses.

**Status.** Complete. **100%**

### 5.11 Playbooks — `/playbooks`

**Purpose.** Reusable corrective-action templates, and the knowledge layer
beneath them.

**Business value.** Turns "what did we do last time" into a library rather than
tribal knowledge — and measures whether each play actually works.

**Key features.** Five playbooks, one per major exception type, each with
ordered steps carrying an owner role and a due offset · **measured
effectiveness** (sample size, mean resolution, SLA adherence, recurrence rate,
open exposure, a composite score) · coverage gap panel naming exception types
with cases but no playbook · active and applied cases per playbook · search and
filters · **SOP library** (5 SOPs, each step carrying the guardrail it exists
for) · **preventive actions** (6, each naming the measurable signal that would
show it worked) · **knowledge base** (5 articles) · one search and one category
filter spanning all three.

**The integrity point.** The playbook library holds the *same* step data the
corrective-action generator runs. A library describing plays the engine does not
run is documentation, not configuration.

**Status.** Complete. **100%**

### 5.12 Help Center — `/help`

**Purpose.** Searchable product documentation inside the product.

**Key features.** 11 help articles across four categories · searchable index
spanning articles, modules, workflows, FAQ and settings · **13 PDF guide
definitions** (Executive, Manager, Operator, Admin, Architecture, Quick Start,
Workflow) · walkthrough video architecture (YouTube, Vimeo, MP4, transcript,
chapters) · KPI definitions.

**Status.** Complete as an architecture. **90%** — the PDF guides and videos are
defined and rendered; the generated PDF binaries and recorded videos do not
exist. Say "the documentation framework is complete and the content is
authored", not "we ship seven PDF guides".

---

## 6. AI Capabilities

### What is implemented

| Capability | Where | How it works |
|---|---|---|
| **Portfolio Copilot** | Dashboard | Live streaming answers against a server-assembled portfolio snapshot |
| **Case Copilot** | Case Detail | Same panel, same transport; the server assembles the full case record |
| **Executive summary** | Dashboard | Pre-generated narrative with tone-tagged callouts |
| **Case insights** | Case Detail | Recurrence pattern, supplier exposure, blocked work |
| **Action recommendations** | Action Center | Scored and ranked, with drivers |
| **Executive narrative** | Analytics | Composed from the flow ledger |
| **Flow recommendations** | Analytics | Ranked by the exposure behind them, with deep links |
| **Offline responder** | Everywhere | Ten keyword-routed intents plus a grounded fallback |

### Claude integration

- **Model:** `claude-opus-5`
- **Reasoning effort:** medium
- **Max tokens:** 16,000
- **Streaming:** yes, over NDJSON (not SSE)
- **Prompt caching:** an ephemeral cache breakpoint after the frozen prompt
  layers

### Prompt architecture — four layers

1. **System prompt** — persona and grounding rules. *Frozen: never interpolated.*
2. **Business context** — domain rules. *Frozen: never interpolated.*
3. **Subject context** — this case, or this portfolio.
4. **The question** — delimited, and the system prompt states that delimited
   content is data rather than instruction.

Layers 1–2 never interpolate anything, so they form a byte-identical prefix and
the cache breakpoint sits after them. **No component builds a prompt string.**
`buildPrompt()` is the only assembler in the codebase.

### Security posture — worth a slide in any technical deck

- `ANTHROPIC_API_KEY` is read **only inside the route handler process**. It is
  not `NEXT_PUBLIC_`-prefixed and never reaches the browser. Verified at zero
  occurrences in the client bundle.
- The browser sends **a case number, a question, and a closed set of validated
  scalars**. It never sends case content. The record is loaded server-side, so a
  tampered request cannot put words in the model's context.
- Sanitisation strips control characters, zero-width codepoints and forged
  section markers. It does **not** claim to defeat prompt injection — the real
  defence is structural.
- Bounds: question 2,000 characters; history 12 turns; rendered context 60,000
  characters, trimmed from the middle *and it says so in the prompt*.

### Failure taxonomy

Every SDK error maps to a typed failure with a retryable flag and an HTTP
status, written for an operations manager rather than an engineer: timeout
(504, retryable), rate limit (429, retryable), invalid key (502, **not**
retryable), network (503, retryable), empty response (502, retryable), refusal
(200, not retryable), unknown (502, retryable).

**The panel offers "Try again" only when retrying can actually help.**

### Offline mode and fallback

Without an API key the product falls back to an offline responder that answers
from the same case record and labels itself **Demo AI**. The route, transport
contract and panel are identical either way — callers cannot tell which produced
the text.

**This is a demo-safety feature worth mentioning explicitly:** if the network
drops mid-presentation, the Copilot still answers.

### The AI boundary — say this out loud in every technical conversation

The AI **explains, summarises and recommends**. It does **not**:

- set a priority score (a deterministic rule set does)
- decide a case status (completion percentage does)
- verify an outcome (a second human does)
- invent a number (every figure it quotes is computed from the corpus)

The executive narrative and the recommendation cards are **rule-composed from
the ledger, not model-written**, and the UI says so beside a Copilot entry
point. That is deliberate: every figure in the sentence is already on the screen
beside it, so a director can quote it in a review without checking it first.

**Never describe the narrative as "AI-generated" in sales material.** It is
computed. The live Copilot is the AI. Conflating them is the claim that unravels
under the first technical question.

---

## 7. Complete User Journey

### Sign-in

There is no authentication in this build. The login screen presents four
personas; choosing one writes an `httpOnly` session cookie. The SSO button is
present and deliberately disabled.

### Executive journey

1. Lands on the **Executive Dashboard** — greeting, four KPI cards, execution
   strip, flow verdict.
2. Reads the **AI summary** for what is driving the position.
3. Clicks a KPI — every card deep-links into Work Manager already filtered.
4. Opens **Analytics → Flow & forecast** for whether the backlog is clearing and
   when it clears at the current rate.
5. Asks the **Copilot** a portfolio question.
6. Exports the position, or sends a **saved report**.

### Operations Manager journey

1. **Work Manager** — triages the queue, filters to critical or overdue.
2. Bulk-assigns unowned cases; routing rules already name a default owner.
3. Opens a case, reviews the corrective actions and the AI insights.
4. Moves to **My Work → Awaiting your review** and verifies another person's
   work.
5. Watches the dashboard move: verification recovers exposure; closure does not.

### Task Owner / Operator journey

1. **My Work** — cases they own, in priority order, and today's actions.
2. Opens a case, reports progress on an action; **status follows the
   percentage** — they never type a status.
3. Attaches evidence with a description of what it proves.
4. Submits for verification. The case moves to Pending Verify and leaves their
   queue.
5. **Action Center** for the cross-case view of everything they owe today.

### Administrator journey

1. **Administration** — users, roles, plant scope.
2. Reviews the **permission matrix**, expanding a row to see the rule and the
   file that enforces it.
3. Adjusts a **priority weight** and watches every open case re-score live, with
   a list of which cases would change band before anything is applied.
4. Reviews **departments**, **AI settings**, **workflow settings** and
   **notification settings**.
5. **Connector Health** for ingestion, and **Audit Log** for who changed what.

---

## 8. Dashboard KPIs

### The four headline cards

| KPI | Definition | Calculation | Why it matters |
|---|---|---|---|
| **On-time in full (OTIF)** | Share of orders delivered complete and on time | **Read from connected enterprise data, never recomputed** | The number the customer experiences. Measured against a 95% target. |
| **Revenue at risk** | Value of confirmed demand that cannot be served if open conditions are not cleared | Sum of exposure across open cases | Exposure, **not a loss already taken**. This distinction matters in an executive conversation. |
| **Open critical cases** | Cases scoring 75 or above on the priority rule set | Count of open cases in the critical band | The agreed order of work, not an opinion about it. |
| **SLA breaches** | Open cases past their band's resolution target | Compared against band targets | Where execution is failing, as distinct from where risk is high. |

### The execution performance strip

| Metric | Definition | Business meaning |
|---|---|---|
| **Mean time to resolve** | Case detection to verification, in hours | How long the operation takes to actually finish something |
| **SLA adherence** | Share resolved within the band target | Whether commitments are met, not just made |
| **Verification pass rate** | Approved on first submission | Quality of execution. A low rate means work is being submitted before it is done. |
| **Recurrence rate** | Share of cases that are a repeat detection | **The most important number on the strip.** High recurrence means corrective actions are not holding. |
| **Throughput this week** | Closed against opened | Whether the queue is clearing |

### Flow metrics (Analytics)

| Metric | Definition |
|---|---|
| **Opening balance** | Open at the start of the window |
| **Detected** | Arrived during the window |
| **Resolved** | Verified or closed during the window |
| **Closing balance** | Open now — and `opening + detected − resolved` reconciles **exactly** |
| **Net movement** | Detected minus resolved. Negative means the backlog fell. |
| **Backlog forecast** | Weeks to clear at the trailing net rate, carrying its own basis and volatility |

### The priority score

0–100, from six weighted factors, **deterministic and never model-set**:

| Factor | Weight |
|---|---|
| Revenue at risk | 35 |
| KPI deviation | 26 |
| Customer tier | 15 |
| Days to promised date | 12 |
| Recurrence | 8 |
| Escalation level | 4 |

Bands: **critical ≥ 75 · high ≥ 55 · medium ≥ 32 · low below.**

The reason it is rule-based is worth quoting: *an unexplainable priority is an
ignored priority.* An executive must be able to defend it in a review.

### SLA targets by band

Critical **24h** · High **72h** · Medium **240h** · Low **720h**. Breaching
escalates the case above its owner.

### Health, and why it is not priority

**Priority says how much a case matters. Health says whether the work is
actually moving.** A critical case can be perfectly healthy — that is a good
state, meaning the most important thing is also the thing being worked. The
combination to act on is high priority with poor health.

---

## 9. Business Workflows

### Exception and case lifecycle

```
detected → assigned → in progress → waiting verification → verified → closed
```

Nine persisted statuses collapse onto six the manager works from. Moving a case
*back* to detected writes `TRIAGED`, not `NEW` — it has been looked at once.

### Assignment

Routing rules derive a default owner from plant plus exception type — inferred
from who has actually owned that combination, not declared in a config file.
Only Operations Manager, Task Owner and Analyst are assignable.

### Execution

Owners report a **completion percentage**; status is derived from it. Nobody
types a status, which is what lets the queue be read as a measure of where work
actually is.

### Evidence

Files are attached against the case or against a specific action, with a
description of what they prove. Type-validated, 25 MB limit.

### Verification

The owner **cannot** verify their own work. A reviewer approves, rejects, or
sends it back. A reviewer checks three things: did the measured KPI move, is the
evidence specific enough that someone who was not there could confirm the claim,
and would this condition be detected again next week.

### Escalation

Breaching an SLA target escalates a case above its owner. Levels 1–3 map to
manager, plant lead and executive sponsor. Escalation depth, exposure and age
are analysed in Analytics.

### Recovery

**Verification is the only route to recovered revenue.** Closing recovers
nothing.

### Measurement window

14 days. A case is not durably closed until the measured KPI has held over the
window.

---

## 10. Technical Highlights

### Architecture decisions

The project keeps a decision log with **84 recorded decisions**, each with its
reasoning. The ones worth a technical deck:

- **Priority is scored by a deterministic rule set, never by a model.**
- **Verification is the only path to recovered revenue.**
- **Status is derived from work, never typed in.**
- **No state change without a timeline event and an audit entry** — one function
  writes both, so they cannot diverge.
- **Every projection is a no-op on an empty store** — the hydration-safety
  guarantee.
- **Frozen screens are made reactive by wrapping, not editing.**
- **Fixtures sit behind an async query layer** — the database swap is a
  body-only change.
- **Figures are derived, never stored twice.** One module owns every portfolio
  number, so no two screens can disagree.
- **Permissions are derived from the rules the code enforces**, each row naming
  the enforcing file.
- **Lint is a gate, not a report** — zero errors and zero warnings, enforced.

### Reusable component library

- **23 patterns** — `DataTable` (sorting, selection, pagination, `aria-sort`,
  live result announcements), `ModuleToolbar`, `KpiTile`, `FilterMenu`,
  `PageHeader`, `EmptyState`, `SectionCard`, `AssignMenu`, `ActionToast`,
  `Sparkline`, `ProgressBar`, `MoneyCell`, `AnimatedNumber`, `DeltaBadge`,
  `PriorityChip`, `StatusBadge`, `OwnerAvatar`, `Icon`, `InAppTip`,
  `ScreenDocButton`, `SkipLink`, `FormField`, `RouteError`
- **8 UI primitives** — Radix wrappers
- **9 shell components** — app frame, side nav, breadcrumbs, global search,
  notification tray, plant scope selector, platform controls, user menu, brand
- **13 hooks**, **4 AI services**, **14 domain modules**, **13 query modules**

### Performance

- **Row virtualisation without a dependency** — uniform row heights are the one
  case where windowing is twenty lines rather than a library. A 10,000-case
  plant scrolls at the cost of a 25-case one.
- **Precomputed row facts** — status group, revenue band, age, overdue,
  resolution hours and a lower-cased search haystack, computed once so filtering
  never re-derives per keystroke.
- `useDeferredValue` for search, `useTransition` for view switches, `React.memo`
  on row and card components (34 memo boundaries, 83 memos, 150 callbacks).
- **Stable-callback discipline** — consumers destructure the callbacks they need
  before putting them in a dependency array. Depending on the whole hook object
  defeats every memo below it.
- Bundle: ~102 kB shared; most routes 170–205 kB first-load JS. The two
  chart-heavy routes (dashboard, analytics) are ~305–330 kB.

### Accessibility

- Skip link is the first focusable element
- One focus ring, styled globally through `:focus-visible`
- Every table header carries `scope`; sorted tables expose `aria-sort`; result
  counts announce live
- Zero `<div onClick>` — every click target is a button or a link
- Zero positive `tabIndex`
- Focus trap and Escape on every overlay, including the mobile navigation drawer
- `prefers-reduced-motion` collapses all five animations
- **`prefers-contrast: more`** raises border and text contrast through token
  overrides, so no component can be missed
- `forced-colors: active` for Windows high-contrast themes

**Honest caveat:** this is verified structurally, not with axe-core. Contrast
ratios have not been measured with a tool.

### Responsive design

Every table sits in a horizontal scroll container. No fixed-width page
containers. Mobile navigation is a focus-trapped drawer; Work Manager switches
from a table to a card list below `lg`.

**Honest caveat:** a static responsive audit runs over the layout classes and is
clean. A visual pass at 375px has not been completed.

### Internationalisation

Five languages — English, Spanish, German, French, Japanese. Locale is persisted
in a cookie, catalogues load on the server so the first HTML is already in the
right language, and the language selector switches live.

**Honest caveat:** the catalogue covers **35 keys** — navigation, common
actions, KPI labels, case fields. The remaining UI copy (roughly 900–1,400
strings) is not yet translated. Switching to Japanese translates the navigation
and not the page bodies. **Do not demo the language switch without saying this.**

---

## 11. Demo Data

### The seeded organisation

A fictional tier-one **automotive and aerospace components manufacturer**, four
production sites:

| Code | Plant | Country |
|---|---|---|
| `MX01` | Querétaro | Mexico |
| `US01` | Greenville | United States |
| `DE01` | Ingolstadt | Germany |
| `IN01` | Pune | India |

**8 users** across the five roles, with realistic job titles.

### The case corpus

**29 operational cases** spanning the nine exception types, with:

- Priority scores computed by the rule set, distributed across all four bands
- Statuses across the full lifecycle: 19 open, 10 resolved
- Revenue exposure summing to a portfolio figure every screen agrees on
- Recurrence counts, escalation levels, customer tiers and supplier links
- SLA states: 9 open cases past target

**The golden case** is a fully-populated vendor delay with corrective actions,
evidence, comments, a timeline, an audit trail, related cases and supplier
issues. **Use this case in every demo.**

### Integration estate

**7 connectors** — data platform signals and KPI snapshots, playbook recurrence
monitor, SAP master data, SAP orders and demand, Oracle SCM plant operations,
notification gateway. Each with 18 runs of deterministic history, a dead-letter
queue and field mappings.

### Knowledge content

5 playbooks · 5 SOPs · 6 preventive actions · 5 knowledge articles · 11 help
articles · 13 PDF guide definitions · 15 guided-tour steps across four
role-specific tours.

### The frozen clock

**Every date in the product is relative to a fixed instant.** The demo is
byte-identical on every rehearsal — no chart redraws differently on refresh, no
SLA state shifts overnight. This is worth mentioning if anyone asks why the
dates look consistent.

### Data integrity — the strongest technical claim in the product

**Every number on every screen is computed from the same corpus.** There are no
stored metrics that could drift from the data they describe. The dashboard,
Analytics, the Copilot and the exports all derive from one module, and they
agree by construction rather than by review.

Say it plainly: *if two screens ever disagreed, that would be a bug, not a
rounding difference.*

---

## 12. Product Differentiators

### Against an ERP

An ERP records what is true. QuikOps AI records **who owns it, what was done,
and whether it worked.** It does not replace the ERP and consumes from it.

### Against Power BI and traditional dashboards

A dashboard tells you a number is bad. It cannot assign the problem, track the
work, hold the evidence, enforce a second pair of eyes, or tell you whether the
fix held.

**The sharpest version of this line:** a BI tool reports what is open.
QuikOps AI says what it means, what to do, what happens if you do not — and then
verifies the outcome. *Nothing in a BI tool verifies anything.*

### Against Excel

A spreadsheet has no ownership model, no audit trail, no SLA, no verification
step and no recurrence memory. It also has as many versions as there are people
who opened it.

### Against manual operations

Standing meetings and email threads produce no record, no measurement and no
escalation path. The work happens; the evidence that it happened does not.

### Against other AI-in-operations products

Three specifics that hold up under technical scrutiny:

1. **The AI does not set the priority.** A deterministic rule set does, and it
   can be defended in a review. Most competitors cannot explain their ranking.
2. **The AI cannot invent a number.** Every figure it quotes is computed from
   the record, and the record is assembled server-side, so a tampered request
   cannot put words in the model's context.
3. **The offline fallback is invisible.** Same route, same transport, same panel
   — so an API outage degrades the answer quality, not the product.

### The idea that closes the argument

**Verification is the only route to recovered revenue.** Every competitor's
dashboard can be made to look good by closing things. This one cannot.

---

## 13. Business Benefits

### CEO

Revenue exposure quantified and tracked to a verified recovery, rather than to a
closed ticket. A defensible answer to "are we getting better?" — the flow
balance and forecast, not an anecdote.

### COO

One queue, one priority order, one execution model across every plant and both
ERPs. Recurrence rate as the measure of whether corrective actions actually
hold.

### CIO

Sits above the existing stack rather than replacing any of it. Clean layer
separation with a documented database seam. Server-side-only API key handling,
typed failure taxonomy, no secrets in the browser. Multi-ERP by design.

### Plant Manager

Their plant's position, worst-first, with every figure clicking through to the
cases behind it. OTIF against target, exposure, breaches and ageing in one
place.

### Operations Manager

Triage, assign, verify. Bulk operations for the ordinary work; the verification
inbox for the consequential work. A cross-case action view so an overloaded
owner is visible before they miss.

### Supply Chain

Supplier promise reliability as a counted pattern rather than a recollection.
Coverage gaps, alternate supply confirmation and threshold resets captured as
procedure rather than tribal knowledge.

### Quality

Containment before disposition, with the authoriser recorded. Supplier
corrective action raised formally, and recurrence measured so an ineffective
one is visible.

### Procurement

Promise-drift counted per supplier per quarter, ready for the review agenda
alongside price and quality. Escalation from repeated date changes to a capacity
negotiation, with the evidence attached.

---

## 14. Current Project Statistics

**Measured on 2026-08-08. Do not round these upward.**

| Metric | Value |
|---|---|
| Source files (TypeScript / TSX) | **271** |
| Lines of source | **47,231** |
| — feature modules | 25,340 |
| — shared platform (`src/`) | 14,387 |
| — component library | 5,043 |
| — routes and app shell | 2,461 |
| Feature modules | **12** |
| Routes | **16** (14 pages + API route + not-found) |
| Shared pattern components | **23** |
| UI primitives | **8** |
| Shell components | **9** |
| Custom hooks | **13** |
| Domain modules | **14** |
| Data-access query modules | **13** |
| Fixture modules | **10** |
| AI modules | **13** (4 services, 6 prompt modules, config, types, sanitiser) |
| Recorded architecture decisions | **84** |
| Seeded cases | **29** |
| Plants | **4** |
| Users | **8** |
| Connectors | **7** |
| Playbooks | **5** |
| SOPs | **5** |
| Preventive actions | **6** |
| Knowledge articles | **5** |
| Help articles | **11** |
| PDF guide definitions | **13** |
| Guided tour steps | **15** across 4 role-specific tours |
| Languages | **5** (35 keys translated) |
| Documentation files | **12** in `.claude/` (including this one) |
| Cross-feature imports | **0** |
| Lint errors and warnings | **0** |

---

## 15. Current Completion Status

### Completed and demo-ready

Executive Dashboard · Work Manager · Case Detail · My Work · Execution Analytics
(including flow, forecast, customer exposure, escalation depth and ageing) ·
Action Center · Reports · Connector Health · Audit Log · Administration ·
Playbooks with the knowledge layer · AI Copilot at both scopes · guided tour ·
in-app tips · demo reset · global search · export (CSV, Excel, print-to-PDF).

**Build state:** lint clean, typecheck clean, production build with no warnings,
all routes rendering, live Claude confirmed.

### Partially complete

| Item | State |
|---|---|
| **Internationalisation** | Architecture complete, 5 languages, **35 of ~1,000 strings translated** |
| **Help Center guides** | 13 guide definitions and the download UI exist; the PDF binaries do not |
| **Walkthrough videos** | Player architecture complete; no recordings exist |
| **Notification settings** | Rules defined and displayed; 3 of 5 have no delivery transport |
| **Report scheduling** | Definitions, cadence and recipients exist; no mail transport |
| **Responsive verification** | Static audit clean; visual pass at 375px not completed |
| **Accessibility verification** | Structural checks pass; axe-core not run, contrast not measured |

### Future phase

Persistence · authentication and authorisation · server-side mutations · real
evidence storage · durable audit log · rate limiting on the AI route · live
clock · observability · automated tests.

### Blocked

Nothing is blocked. Two capabilities from the gap analysis — **root-cause
analytics** and **process-stage (bottleneck type) intelligence** — need new
domain fields plus deliberately authored fixture data across the corpus, and
were deferred rather than filled with plausible-looking invented data.

---

## 16. Phase 2 Roadmap

Ordered by what would hurt first in a production deployment.

1. **Automated tests.** None exist. Verification is currently typecheck, lint,
   build and a manual route pass. This is the debt that compounds.
2. **Persistence.** A schema matching the domain types, a managed Postgres, and
   the query bodies replaced. The seam is already built.
3. **Authentication.** Entra ID OIDC replacing the persona cookie. Contained to
   two files.
4. **Server-side mutations.** Every mutation is session-scoped today.
5. **i18n string migration.** ~900–1,400 literals. Mechanical, but across 271
   files.
6. **Accessibility audit** with axe-core and measured contrast.
7. **Root-cause and process-stage analytics.** Needs new domain fields and
   authored data.
8. **Departments as a first-class dimension** (currently inferred from job
   title through the case owner).
9. **Real evidence storage** — blob storage, scanning, signed URLs.
10. **Rate limiting** on the Copilot route.
11. **Live clock** replacing the frozen demo instant.
12. **Observability** — structured logging and token-usage metrics.

---

## 17. Known Limitations

**State these proactively in technical conversations. Every one of them is
normal for a POC, and volunteering them buys credibility that carries the
claims that matter.**

1. **All data is seeded.** 29 cases, 4 plants, 8 users. No live ERP connection.
2. **No persistence.** Every change is session-scoped and discarded on refresh.
   Only three things survive a reload — guided-tour completion, tip dismissals
   and saved reports — all in browser storage.
3. **No authentication.** Persona switching writes a cookie. No credentials, no
   server-side sessions, no authorisation checks beyond role-based navigation.
4. **No automated tests** and no test tooling installed.
5. **Light theme only.** No dark mode exists. **Do not offer to show it.**
6. **i18n is 35 keys.** Switching language translates the navigation, not the
   page bodies.
7. **PDF guides and videos are architecture**, not artefacts.
8. **The audit log is session-scoped**, so it is honest about what it is but not
   yet an audit log.
9. **An unknown case number returns HTTP 200** while rendering the correct
   "case not found" page — a streaming trade-off, invisible to a user, wrong for
   crawlers.
10. **The plant scope selector is inert** by decision, rather than filtering some
    screens and not others.
11. **Accessibility is verified structurally**, not with tooling.
12. **A visual responsive pass at 375px has not been completed.**

---

## 18. Executive Talking Points

### For a CEO meeting

- "Your systems already tell you what is wrong. Nothing tells you whether anyone
  fixed it."
- "Revenue at risk is exposure, not a loss. It leaves the at-risk pool one way
  only — when a second person verifies the work actually held."
- "Closing a case recovers nothing. That is deliberate, and it is why the
  recovered number means something."
- "Recurrence rate is the number to watch. It tells you whether your corrective
  actions are holding or whether you are paying for the same problem twice."

### For a client demo

- "Every number on this screen is a link. Nothing here is a dead end."
- "This priority score is arithmetic, not a model. You can open it and defend it
  in a review."
- "Nobody types a status in this product. Progress drives it."
- "The person who did the work cannot approve it."
- "Watch the dashboard while I verify this case."

### For enterprise sales

- "It sits above SAP and Oracle. You replace nothing."
- "The estate in this demo runs both ERPs, because that is the ordinary
  situation after an acquisition."
- "The API key never reaches the browser. The case record is assembled
  server-side, so a tampered request cannot put words in the model's context."
- "The AI explains and recommends. It does not set priority, decide status or
  verify outcomes."

### For an investor presentation

- "Detection is commoditised. Execution is not, and it is where the value
  leaks."
- "Twelve modules, 47,000 lines, one architecture rule enforced throughout: zero
  cross-module coupling."
- "The database swap is a body-only change. The seam was built first,
  deliberately."
- "84 recorded architecture decisions, each with its reasoning. This was built
  to be handed over."

---

## 19. Frequently Asked Questions

**Does this replace our ERP?**
No. It sits above it. The ERP remains the system of record; QuikOps AI adds the
execution layer — ownership, work state, evidence and verification — that an ERP
has no place for.

**We run SAP at some sites and Oracle at others. Does that matter?**
No, and the demo estate is deliberately built that way. Both are normalised into
one case model, so the operating process is identical regardless of which system
raised the condition.

**Who decides what is most important?**
A deterministic rule set, not a model. Six weighted factors — revenue at risk,
KPI deviation, customer tier, days to promised date, recurrence, escalation.
Every score can be opened and defended.

**What does the AI actually do?**
It explains, summarises and recommends against a record it did not invent. It
does not set priority, decide status, verify outcomes or produce numbers. The
executive narrative you see is computed from the ledger; the Copilot is the live
model.

**Where does our data go?**
For the Copilot, the browser sends a case number and a question. The case record
is assembled server-side and sent to Anthropic's API. The API key is read only
inside the server process and never reaches the browser.

**What happens if the AI is unavailable?**
The product falls back to an offline responder that answers from the same case
record and labels itself Demo AI. Same route, same panel — the demo does not
break.

**Can we configure the priority weights?**
Yes, and the screen shows you the consequence before you save: change a weight
and every open case re-scores live, listing which ones would change band.

**Is there an audit trail?**
Yes, by construction. No state change occurs without a timeline event and an
audit entry — one function writes both, so they cannot diverge. Entries carry
actor, field-level from/to and the source of the change.

**Can someone approve their own work?**
No. It is enforced in code, and it is the load-bearing rule of the whole
execution model.

**How long to a pilot?**
The database seam, the auth boundary and the mutation layer are already isolated
to specific files. The Phase-2 list in §16 is the honest answer, and the first
four items are what a pilot needs.

**Is this production-ready?**
No, and we would not claim it. It is a production-quality POC: the architecture,
the domain model and the design system are production standard. Persistence,
authentication and automated testing are not built. That list is §17 and we
volunteer it.

**How many users can it handle?**
Untested at scale. The queue virtualises rows, so a 10,000-case plant scrolls at
the cost of a 25-case one, but no load testing has been performed.

**Does it work on mobile?**
The layout is responsive and the navigation adapts. A full visual pass at phone
width has not been completed, so we would not lead with mobile.

**What languages does it support?**
The architecture supports five. The navigation is translated into all five; the
remaining UI copy is not yet migrated.

---

## 20. Presentation Recommendations

### Recommended demo order

1. **Login** — pick the Operations Manager persona. Mention the four personas
   and that role changes what you can do, not just what you see. *(30 seconds)*
2. **Executive Dashboard** — the position. Lead with revenue at risk and say
   "exposure, not loss". Point at the flow verdict band. *(3 minutes)*
3. **Click a KPI card** — land in Work Manager already filtered. Say "every
   number here is a link". *(30 seconds)*
4. **Work Manager** — filters with live counts, the board view, bulk assign.
   *(2 minutes)*
5. **Open the golden case** — the strongest screen in the product. Walk the
   corrective actions, the evidence locker, the audit trail. *(4 minutes)*
6. **Ask the Copilot** a case question. *(2 minutes)*
7. **Verify the case** — switch persona to the reviewer, approve, and **go back
   to the dashboard to show the numbers move.** *(3 minutes)*
8. **Analytics → Flow & forecast** — the balance as a sentence, the net-flow
   ribbon, the backlog forecast, the recommendation cards. *(4 minutes)*
9. **Administration** — change a priority weight and show the live re-scoring
   preview. *(2 minutes)*
10. **Connector Health** — for a technical audience only. *(2 minutes)*

### The strongest screens, in order

1. **Case Detail** — the depth is the argument
2. **Analytics flow region** — the forecast and the recommendation cards
3. **Executive Dashboard** — the opening position
4. **Administration configuration preview** — for technical buyers
5. **Connector Health** — for technical evaluators

### The strongest AI moments

1. Ask the case Copilot *"what is blocking this case?"* — it answers from the
   actual record, naming the actions and the dates.
2. Ask the portfolio Copilot *"how many open cases and how much is at risk?"* —
   and point out that the answer matches the dashboard exactly, because both
   read the same corpus.
3. The Analytics recommendation cards, with their impact figures and deep links.

### The best business story

Follow one case end to end: a supplier moves a confirmed date → the signal is
detected and scored critical → it is assigned by routing rule → the owner works
the playbook and attaches evidence → a second person verifies → **the exposure
moves from at-risk to recovered on the dashboard while the audience watches.**

That single arc contains every differentiator the product has.

### Suggested duration

- **Executive briefing:** 15 minutes — steps 1, 2, 5, 7, 8
- **Standard client demo:** 25 minutes — steps 1–9
- **Technical evaluation:** 40 minutes — all ten, plus architecture

### Demo tips

- **Run the demo reset before you start.** It restores every module, including
  the first-use tips.
- **Kill any stale dev server first.** A previous process serving a wiped build
  produces errors that look like code failures.
- Use the golden case. It is the only fully-populated record.
- If asked about a limitation, answer it directly. The list in §17 is short and
  every item is normal for a POC.

### Things to avoid

- **Do not offer dark mode.** It does not exist.
- **Do not demo the language switch** without saying that only the navigation is
  translated.
- **Do not call the executive narrative "AI-generated".** It is computed from
  the ledger, and the distinction is a strength — claiming otherwise invites a
  question that unravels it.
- **Do not promise scheduled report delivery or notification emails.** The rules
  are defined; the transport is Phase 2.
- **Do not refresh the browser mid-demo.** Every mutation is session-scoped.
- **Do not claim production readiness.** Say "production-quality POC" and point
  at the Phase-2 list.
- **Do not lead with mobile.**

---

## Document integrity note

Every statistic in §14 was measured against the codebase on 2026-08-08. Every
capability described in §5 and §6 was verified as rendering from real data.
Everything not built is marked as such in §15 and §17.

**If you are generating material from this document and find yourself wanting to
state something not written here, do not infer it.** The gap between what this
product does and what an enterprise buyer might assume it does is exactly where
a demo goes wrong.
