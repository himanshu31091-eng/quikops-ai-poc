# DEMO_SCRIPT

> The client walkthrough. Every number below was read out of the running
> application on 2026-08-06, not estimated.
>
> Total runtime: **12–15 minutes**. The arc is one sentence:
> *detection becomes an owned, evidenced, independently verified outcome — and
> the executive number moves as it happens.*

---

## 0. Before you start

```bash
# 1. Kill anything on port 3000 first — a stale dev server after a build 500s.
# 2. Optional but recommended: put a real key in .env.local for the live Copilot.
#    Without it the Copilot still works and shows a "Demo AI" badge.
npm run dev          # http://localhost:3000
```

- Sign in as **Elena Vásquez (COO)** — the default persona.
- The clock is frozen at **2026-08-05 09:12 UTC**. Every number is stable across
  rehearsals; nothing drifts between runs.
- Have `/work/QO-2026-004182` ready in a second tab as a fallback.

---

## 1. Login — 30 seconds

`/login`

The left panel carries the positioning before any credential UI:

> **Every Angle identifies operational bottlenecks.
> QuikOps AI turns them into executed, verified outcomes.**

Three value points sit under it: *detection becomes execution*, *verification
with segregation of duties*, *measured against a captured baseline*.

**Say:** "Four personas, because the product looks different depending on
whether you sponsor the work or do it. I'll start as the COO."

Click **Elena Vásquez — Chief Operating Officer**.

---

## 2. Executive Dashboard — 3 minutes

`/dashboard`

Opens on *"Good morning, Elena"* with provenance chips: data as at 09:12 UTC,
**Every Angle · last sync 2h ago · 34 signals**, 4 plants in scope.

### The KPI band — the numbers to say out loud

| KPI | Value | Footnote |
|---|---|---|
| On-time in full | **88.5%** | 6.5 pts below target |
| Revenue at risk | **$1,531,700** | Across 19 open cases |
| Open critical cases | **2** | 5 unassigned overall |
| SLA breaches | **9** | 62.1% adherence this quarter |

**Say:** "Every one of these is a link, not a tile. The number and the work
behind it are never more than one click apart."

Hover a sparkline. Then **click "Open critical cases"** → lands on
`/work?band=CRITICAL`. Come straight back. That single click is the whole
argument: *no dashboard-to-spreadsheet gap.*

### The AI executive summary

Headline:

> *"Greenville is the weakest site in the network, driven by material shortage —
> and 3 of its 5 open cases are repeat detections rather than new disruptions."*

**Say:** "Every figure in this briefing is computed from the same case data the
board below is showing — the weakest plant, the largest exposure, the counts,
the citations. It isn't a chatbot, and it isn't a stored paragraph that drifted
away from the numbers. Read the callouts; they reconcile."

✅ **Safe to read verbatim.** The callouts are derived and were reconciled on
2026-08-06 — the earlier warning no longer applies.

### Execution performance strip

MTTR **11d**, down **21.6%** · SLA adherence **62.1%**, up **4.2 pts** ·
verification pass rate **76.9%** · recurrence **41.4%**.

**Worth knowing:** these are derived, so they will match Execution Analytics
exactly. If a client compares the two screens, that is the answer you want.

**Say:** "Note what's happening here — the operational numbers are deteriorating
while the *execution* numbers improve. That's the distinction this product
exists to make. You can be getting better at fixing things and still be losing."

Scroll past operational health by plant, the 90-day OTIF trend against the 95%
target, priority distribution, critical bottlenecks, revenue impact by exception
type, the activity feed and inventory health. Don't linger — signal the depth,
don't narrate it.

---

## 3. Work Manager — 2.5 minutes

Click **Work Manager** in the nav (badge: **5 unassigned**).

19 open cases, sorted by priority score.

Show, in this order, quickly:

1. **Search** — type `Nordex`. The queue narrows across case number, material,
   supplier, plant, owner and customer at once.
2. **Filters** — open the Plant menu. Every option carries a live count from the
   current data, not a static list.
3. **Board view** — toggle. Same working set, six lifecycle columns:
   Detected → Assigned → In progress → Waiting verification → Verified → Closed.
4. **Selection** — tick two rows, show Bulk Assign / Bulk Close appear.
5. **The URL** — point at the address bar. Filter state round-trips through it,
   so any view is shareable as a link.

**Say:** "The scroll is virtualised — this behaves the same at 29 cases or
24,000. And the KPI header, the table, the board and the side panel are all
reading one array, so they can't disagree with each other."

Clear filters. Sort by priority. **Find and click `QO-2026-004182`.**

---

## 4. Case Detail — the centrepiece — 5 minutes

`/work/QO-2026-004182`

### 4a. Set the scene — 45 seconds

> **Vendor delivery delay — RM-4471 — Nordex Componentes**
> Querétaro (MX01) · **TRIAGED** · **unassigned** · **$180,000 at risk**
> Priority **70.6 / 100 — HIGH** · escalation level 1 · **past SLA**
> Execution health **0 / 100 — OFF TRACK**

**Say:** "This is the worst kind of case. It's high value, it's against a
tier-one customer, it's the *third* detection in 45 days, it's already breached
SLA, and nobody owns it. Health is zero — not because it's unimportant, but
because nothing is moving."

Point at the distinction: **priority 70.6 is high. Health is 0.** Priority says
how much it matters; health says whether anyone is doing anything.

### 4b. Executive summary section

Root cause, marked **PROBABLE**:

> *"Supplier capacity, not transport. Delay duration has grown on each detection
> while shipment transit times have held, which points at the vendor's own
> production schedule rather than the lane."*

**Say:** "Note it's labelled *probable*, not stated as fact. The platform
distinguishes what's recorded from what's inferred."

### 4c. Provenance — the credibility moment

Scroll to **Case Information**:

- Detection rule **EA-R-VD-002 — Vendor confirmed date slip**
- *"Fires when a confirmed purchase order date moves out by more than 3 days, or
  the goods receipt is more than 2 days past the confirmed date, on a material
  with open demand inside the horizon."*
- Signal ref **EA-2026-08-02-MX-004182** · **PO-77455** · Extrusion line 1

**Say:** "Every case can answer 'why was I raised' with the rule, the threshold,
and the signal reference. Nothing here is a black box."

The timeline currently shows four events, all machine-generated:
`Every Angle detected the exception` → `Case created and scored` →
`Playbook applied` → `Escalated to level 1`.

**Say:** "Four events, no humans yet. Watch what happens."

### 4d. Run the workflow — the money shot — 3 minutes

Do these in order, and **pause after each one** to let the page answer.

| # | Action | What to point at |
|---|---|---|
| 1 | **Assign Owner** → Carlos Mendoza | Status flips `TRIAGED` → `ASSIGNED` on its own. A timeline event and an audit row appear. Health lifts off zero. |
| 2 | **Start Work** | → `IN_PROGRESS`. Toast offers a jump link to the section that changed. |
| 3 | **Add a corrective action** | e.g. *"Escalate to Nordex account management and request a written capacity commitment."* Drag the progress slider — status derives itself: TODO → IN_PROGRESS → DONE. |
| 4 | **Upload Evidence** | Drop any file. It attaches against the action. |
| 5 | **Request Verification** | → `PENDING_VERIFICATION`, routed to **Priya Sharma**. |

**Say while doing #1:** "I never typed a status. Assigning an owner to a
detected case *makes* it assigned — status is derived from work, never set by
hand. And no state change happens without both a timeline event and an audit
entry. They're written by the same function, so they can't drift apart."

Scroll to the **Audit Log** at the bottom. Every action you just took is there
with actor, field, from-value, to-value and source.

### 4e. Verification — segregation of duties

**Say:** "The owner cannot verify their own work. That's the point of the step."

Switch persona to **Priya Sharma** if you want it literal, or just narrate it.

**Approve.** Watch: status → `VERIFIED`, the SLA clock stops, the outcome is
recorded against the 14-day measurement window.

**Say:** "And here's the rule that makes the whole thing honest — **revenue only
counts as recovered when a case is verified.** Closing a case administratively
takes it off the queue and recovers nothing. Otherwise the platform is just a
to-do list that flatters you."

---

## 5. The AI Copilot — 2 minutes

Click **Ask Copilot** in the case header. The panel slides in from the right.

Nine suggested prompts. Use these three, in this order:

1. **"Explain the priority score."**
   The answer walks the deterministic factors:
   revenue at risk $180,000 → **25.2** · KPI deviation −7.6% → **16.5** ·
   customer tier 1 → **15.0** · 6 days to promised → **6.9** ·
   3 detections → **5.7** · escalation level 1 → **1.3** = **70.6**.

   **Say:** "It's explaining arithmetic, not rationalising a guess. The score is
   produced by a rule set, never by a model — because an executive has to be
   able to defend prioritisation in a review."

2. **"Recommend corrective actions."**
   It builds on the plan already on the case rather than inventing a new one,
   and names the supplier, the material and the order.

3. **"Generate a client-ready summary."**
   Factual, no internal blame, safe to send to Grupo Aeromex.

**Say:** "The Copilot only sees this case's record — the case, its actions,
evidence, comments, timeline, audit history and verification state. The API key
never leaves the server, and the browser can't inject content into the model's
context; it sends a case number and a question, and the record is assembled
server-side."

Cancel a response mid-stream to show it stops cleanly.

**If running without an API key:** the panel shows a subtle **"Demo AI"** badge
and answers from the case record over the identical transport. Nothing breaks.
Only mention it if asked — it is a fallback, not a feature.

---

## 6. The payoff — cross-module propagation — 1.5 minutes

**Do not refresh anything.** Navigate back to **Executive Dashboard**.

| Watch | What moved |
|---|---|
| Revenue at risk | **$1,531,700 → $1,351,700** — the $180,000 recovered |
| Open critical / breaches | recount against the new state |
| Revenue impact chart | Vendor delay shifts from *at risk* to *recovered* |
| Activity feed | your session's events sit at the top |
| Execution metrics | MTTR re-blended, cases closed this week +1 |
| Nav badges | unassigned and approvals recount |
| Session chip | shows the session is dirty |

**Say:** "No refresh. One case, worked end to end on one screen, and the
executive number moved. That's the loop: Every Angle detects it, QuikOps owns
it, someone independent verifies it, and the number that a board asks about
changes as a direct consequence."

Detour to **Work Manager** and **My Work** to show the same case reflected there
too — same store, same projections.

---

## 7. Closing

**Say:** "Everything you saw is one build. Four modules — Executive Dashboard,
Work Manager, Case Detail, and the execution workflow tying them together — plus
a live Claude integration. The screens you didn't visit are on the roadmap and
each one states its own scope."

Click one placeholder — **Execution Analytics** — to show a navigable page
declaring its scope and spec reference rather than a dead nav item.

---


---

## 10. The platform layer — 2 minutes, optional

Four controls sit in the top bar on **every** screen. Worth showing if the
client asks about onboarding, rollout or accessibility.

| Control | What to say |
|---|---|
| ✨ **Product tour** | "Role-based onboarding. An executive gets four steps about reading the position; an operator gets three about executing a case. It walks across screens, and it remembers you have done it." |
| 🌐 **Language** | "Five locales wired — English, Spanish, German, French, Japanese. The interface translates; operational case content stays in the language it was recorded in." |
| ↻ **Reset demo** | "One click restores every seeded case, analytic and workflow outcome. Rehearsals are repeatable." |
| ? **Help Center** | "Eleven articles, downloadable guides, and a search that indexes screens, FAQs and KPI definitions together." |

Also worth a sentence: **the ⓘ beside any page title** opens "What does this
screen do?" — purpose, business value, every KPI explained, the workflow and
the related screens. That is the answer to "how will our people learn this?"

**Accessibility, if asked:** skip-link on every page, focus trapped in the
Copilot and drawers, `aria-sort` and live result counts on every table, one
visible focus ring, and `prefers-reduced-motion` honoured across all five
animations. An axe-core audit has not been run — say so rather than claiming AA.

## 8. Known rough edges — read before presenting

These are real and a sharp client could catch them. None are fixed; all are
recorded in `NEXT_STEPS.md`.

### ✅ Fixture drift — RESOLVED 2026-08-06

The dashboard AI summary, plant health, the exception-type revenue block and
the two cosmetic defects were all reconciled. Every portfolio figure is now
derived from the case corpus by `src/domain/portfolio-metrics.ts`, so the
dashboard, Execution Analytics, the plant table, the AI summary and the Copilot
all report the same numbers.

The live Copilot was asked to audit the dashboard against the case data and
confirmed it reconciles three ways — by lifecycle, by priority band and by
plant. Inviting a client to make that comparison is now a strength, not a risk.

### Things that will not work if tried

- **Refresh discards session work.** All mutations are session-scoped. If you
  refresh mid-demo you lose the workflow you just ran — restart from §4d.
- **Seven modules are placeholders**: Action Center, Execution Analytics,
  Playbooks, Reports, Connector Health, Audit Log, Administration.
- **Login is a persona switch, not authentication.** Don't invite scrutiny of it.
- **No data persists between runs**, which is also why the demo is repeatable.

---

## 9. Answers to the questions you will be asked

**"Is the AI making up the priority score?"**
No. It's a deterministic weighted rule set in `src/domain/priority.ts` — six
factors, fixed weights, configurable per deployment and versioned. AI may
suggest an adjustment; it never sets the number. That's a deliberate design
decision: an unexplainable priority is an ignored priority.

**"Where is the data coming from?"**
Typed fixtures behind an async data-access layer. Every query function already
returns the exact shape a real query would, so connecting a database replaces
function bodies and touches no UI code. That seam is built, not planned.

**"Is our data being sent to Anthropic?"**
Only the record for the case on screen, and only when a user asks a question.
The API key is read server-side and never reaches the browser. Nothing is
trained on. The request can be pointed at a private deployment.

**"What happens when the AI is wrong or unavailable?"**
The system prompt forbids filling gaps — it must name the missing fact rather
than invent one. Every failure mode is classified and surfaced in plain language
with an accurate retry affordance. If the service is unreachable, the case is
untouched and the rest of the platform is unaffected.

**"How long to production?"**
The honest answer is in `NEXT_STEPS.md` §2: persistence, real auth, server-side
mutations, rate limiting, tests, evidence storage. The architecture is built for
each of those — none requires rework of what you've seen.

**"Can we change the SLA targets / priority weights?"**
Yes, and they're already isolated for it — `src/domain/sla.ts` and
`src/domain/priority.ts`. The Administration module is the UI over those two
constants.
