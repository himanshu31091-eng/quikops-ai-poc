# SCREENSHOT INDEX

**41 screenshots**, captured from the running application on **2026-08-08**.

| Property | Value |
|---|---|
| Capture width | 1920 CSS pixels |
| Device scale | 2× — files are **3840 × 2160**, so a full-bleed 1080p slide is pixel-sharp |
| Format | PNG |
| Browser | Chrome, headless, no bookmarks bar, no devtools, no extensions |
| Zoom | 100% throughout |
| Data | The seeded demo corpus — 29 cases, 4 plants, 8 users |

**Every frame is real.** These were driven through the live application with
browser automation, not composed or edited. Panels were opened, drawers
extended, tabs selected and toggles switched by actually clicking them, so each
screenshot is a state the product genuinely produces.

---

## How to choose a shot

Two shapes, and the distinction matters when you drop one into a deck:

- **`*-full.png`** is a **full-page capture** — the entire scrollable screen in
  one tall image. Excellent for showing depth ("look how much is here") and for
  appendix slides. It will letterbox badly on a 16:9 slide if used full-bleed.
- **Everything else is a viewport capture at 1920 × 1080** — a true 16:9 frame.
  Use these for full-bleed slides.

For a cover or hero slide, use `11-dashboard-above-fold.png`.

---

## Persona used

The **Executive** (Elena Vásquez) unless another role demonstrates the feature
better. Where a different persona was used, it is because that role is the one
who actually performs the workflow:

| Persona | Used for | Why |
|---|---|---|
| Executive | Dashboard, Analytics, Help | The reader of the position |
| Ops Manager | Work Manager, Case Detail, Action Center, Playbooks, Reports | Triage, verification and the cross-case queue |
| Task Owner | My Work | The personal queue is only meaningful for someone who owns cases |
| Administrator | Connector Health, Audit Log, Administration | Configuration and integration surfaces |

---

## The five frames to use if you only have five slides

1. **`11-dashboard-above-fold.png`** — the product in one image
2. **`15-dashboard-copilot-answer.png`** — a live Claude answer whose figures
   match the KPI cards exactly. The strongest AI proof frame in the set.
3. **`30-case-detail-full.png`** — the depth argument. Nothing else in the set
   shows this much substance in one image.
4. **`53-analytics-executive-briefing.png`** — recommendations with impact
   figures. This is the "so what do I do about it" slide.
5. **`b1-admin-priority-weights.png`** — configuration showing its consequences
   before saving. The frame technical buyers remember.

---

## Full index

### Sign-in

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `c5-login.png` | Persona chooser with the product positioning statement. | Cover slide / opening | Every Angle identifies operational bottlenecks. QuikOps AI turns them into executed, verified outcomes. |

### Guided Tour

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `00-tour-invitation.png` | First-visit tour invitation on the Executive Dashboard, before onboarding is dismissed. | Onboarding / adoption | The product introduces itself on first visit, with a tour written for the signed-in role. Four role-based tours, thirty-three steps. |
| `01-tour-step.png` | A live tour step spotlighting the dashboard KPI band, with progress and the demo tip callout. | Onboarding / adoption | Each step says what a control is for and the trap it exists to avoid — not what it is called. |

### Executive Dashboard

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `10-dashboard-full.png` | Full Executive Dashboard — KPI band, execution performance strip, flow verdict, AI summary and plant health. | Opening slide / product overview | The operational position in one screen. Every number is a link — the gap between noticing and acting is one click. |
| `11-dashboard-above-fold.png` | Dashboard above the fold at 1920×1080 — exactly what a client sees on first load. | Hero image / cover slide | Revenue at risk is exposure, not a loss already taken. It leaves this number one way only: verification. |
| `12-dashboard-flow-verdict.png` | The flow verdict band — detection against resolution over four weeks, with the backlog trajectory. | Differentiator: are we winning? | The open count tells you where you are. This is the only figure that tells you which direction you are moving. |
| `13-dashboard-ai-summary.png` | AI executive summary with tone-tagged callouts and plant health beside it. | AI capability | Composed from the same case data the tables show — quotable in a review without checking it first. |
| `14-dashboard-copilot-open.png` | Portfolio-scope Copilot panel open, showing the suggested prompt catalogue. | AI capability | Two scopes, one panel, one transport. The scope changes what the server assembles, never what the client sends. |
| `15-dashboard-copilot-answer.png` | Live Claude answer in the portfolio Copilot, quoting figures that match the KPI cards exactly. | AI capability — the proof frame | Ask it how many cases are open and the answer matches the card above, because both read the same corpus. |

### Work Manager

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `20-work-manager-full.png` | Full Work Manager — KPI band, toolbar, filter bar and the case table. | Core workflow: the queue | One queue, nothing lost. Fourteen filters carrying live counts, and the whole view round-trips through the URL. |
| `21-work-manager-table.png` | Work Manager table view above the fold, with priority chips and owner avatars. | Core workflow: the queue | Priority is scored 0–100 by a deterministic rule set. Open the chip and every factor is listed. |
| `22-work-manager-board.png` | Work Manager board view — cases grouped by lifecycle stage. | Core workflow: the queue | The same data, two shapes. The board and the table read the same row, so switching view cannot change what a case says about itself. |

### Case Detail

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `30-case-detail-full.png` | The complete case record — header, summary, corrective actions, evidence, comments, verification, timeline and audit. | The strongest screen in the product | Everything about this condition in one record. This is where the execution model actually lives. |
| `31-case-detail-header.png` | Case header with priority chip, health score and SLA state. | Core workflow: a case | Priority says how much it matters. Health says whether anyone is moving it. They are different questions. |
| `32-case-corrective-actions.png` | Corrective actions with completion percentages driving status. | Core workflow: execution | Owners report a percentage and the status follows it. Nobody types a status in this product. |
| `33-case-evidence.png` | Evidence locker with attached files, types and what each one proves. | Core workflow: evidence | Evidence is what turns a claim into a verifiable outcome. A reviewer checks it supports the claim, not that a file exists. |
| `34-case-verification.png` | The verification panel — a second pair of eyes before anything counts as recovered. | The load-bearing rule | The owner cannot verify their own work, and verification is the only route to recovered revenue. |
| `35-case-audit-trail.png` | Field-level audit trail with actor, before/after values and the source of each change. | Governance and compliance | No state change without a timeline event and an audit entry — one function writes both, so they cannot diverge. |

### My Work

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `40-my-work-full.png` | The personal queue — owned cases, submitted work, verification inbox and today's actions. | Role-based experience | A manager's queue and an operator's queue are different questions. This answers the second. |

### Execution Analytics

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `50-analytics-full.png` | Full Execution Analytics — KPI cards, trends, flow and forecast, performance tables and heatmaps. | Analytics depth | The dashboard says where we are. Analytics says how we got here and where we are going. |
| `51-analytics-above-fold.png` | Analytics KPI cards and trend charts above the fold. | Analytics depth | Four trend cards, each compared against the same derivation over the full corpus. |
| `52-analytics-flow-balance.png` | The flow balance strip — opening plus detected minus resolved equals closing, reconciling exactly. | Differentiator: flow and forecast | The balance reads as a sentence, not a table. Switch the whole region between case counts and revenue exposure. |
| `53-analytics-executive-briefing.png` | Executive briefing with drivers, period comparison and ranked recommendation cards carrying impact figures. | AI recommendations | A narrative that ends without a next action is a report. Every card here deep-links into the queue already filtered. |
| `54-analytics-value-lens.png` | The same flow region measured in revenue exposure rather than case counts. | Differentiator: value-based reporting | One toggle moves every chart in the region from counts to money. Value is the lens a board actually reads. |

### Action Center

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `60-action-center-full.png` | Full Action Center — KPI tiles, the cross-case action queue and the recommendations sidebar. | Cross-case execution | A case-level queue hides that one person owns fourteen actions across nine cases. This is that view. |
| `61-action-recommendations.png` | AI recommendations panel, ranked by the exposure behind each one. | AI recommendations | Apply one and it becomes a real action on a real case. Nothing here is a suggestion you cannot act on in place. |
| `62-action-drawer.png` | Action detail drawer with case context, SLA state and the AI recommendation. | Progressive disclosure | Detail opens beside the queue rather than replacing it, so the comparison that gives one row meaning stays on screen. |

### Playbooks

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `70-playbooks-full.png` | Playbook library with measured effectiveness per play, coverage gaps and the knowledge layer. | Institutional knowledge | Turns "what did we do last time" into a library — and measures whether each play actually works. |
| `71-playbooks-knowledge.png` | The knowledge layer — SOP library, preventive actions and knowledge base under one search. | Institutional knowledge | Procedure, prevention and reasoning. One search spans all three, because you do not know which has the answer. |
| `72-playbooks-sop-expanded.png` | An SOP expanded, each step carrying the guardrail it exists to prevent. | Depth of content | Every step carries the mistake it was written to prevent. That is what makes a procedure worth reading twice. |

### Reports

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `80-reports-full.png` | Report library, saved reports, schedules and the live preview composed from the real corpus. | Reporting and distribution | Six templates rendered from live data, exported as CSV, Excel or PDF. The report and the screen cannot disagree. |
| `81-reports-above-fold.png` | Reports above the fold — template picker, saved reports and export controls. | Reporting and distribution | A saved report captures the template and the sections you kept — the artefact you actually send. |

### Connector Health

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `90-connector-health-full.png` | Seven connectors including SAP and Oracle, with health scores, the ingestion funnel and the dead-letter queue. | Integration story | SAP at the European and US sites, Oracle at Querétaro and Pune. Both normalised into one case model. |
| `91-connector-funnel.png` | Ingestion funnel — received, deduplicated, processed, rejected, cases raised. | Integration story | The funnel reconciles with the case corpus by construction. A connector claiming 34 cases beside a queue of 29 is the defect this prevents. |
| `92-connector-dead-letter.png` | Dead-letter queue with replay, including messages that cannot be replayed. | Operational honesty | A schema mismatch will fail again identically. Those are marked and the replay is refused, rather than pretending. |

### Audit Log

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `a0-audit-log-full.png` | Append-only audit trail with actor, entity, field-level change and source attribution. | Governance and compliance | Every state change across every case, attributed to a person, a connector or the rule engine. |

### Administration

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `b0-administration-full.png` | Users, derived routing rules, priority weights, SLA thresholds, permissions, departments and platform settings. | Configuration and governance | Configuration that shows its consequences before anything is saved. |
| `b1-admin-priority-weights.png` | Priority weight editor with the live re-scoring preview beside it. | Differentiator: configuration with consequences | Change a weight and every open case re-scores live, listing which would change band before you save. |
| `b2-admin-permissions.png` | Permission matrix derived from the rules the code enforces. | Security and governance | Not a checkbox grid. Each row is a rule the product enforces, and expanding it names the file that enforces it. |
| `b3-admin-settings.png` | AI, workflow and notification settings read from the modules that own them. | AI governance | The model, the bounds and the mode, read from the running configuration. Anything not yet enforced is marked Phase 2. |

### Help Center

| File | Description | Best slide | Talking point |
|---|---|---|---|
| `c0-help-center-full.png` | Searchable help articles, guides and per-screen documentation. | Adoption and enablement | Documentation inside the product, sharing its content source with the per-screen info panels. |

---

## Notes for whoever builds the deck

**The figures in these screenshots agree with each other.** 19 open cases,
$1.5M at risk, 9 past SLA, 11d mean time to resolve, 62.1% SLA adherence — the
same numbers appear on the dashboard, in Analytics, in the Copilot answer and in
the reports. That consistency is a selling point in itself; do not crop it out.

**Two frames carry the same claim, deliberately.** `11-dashboard-above-fold.png`
shows "$1.5M across 19 open cases" on the KPI card, and
`15-dashboard-copilot-answer.png` shows the Copilot independently stating the
same thing. Used together on one slide they make the "every number comes from
one source" argument without a word of explanation.

**What is *not* in this set, and why:**

- **No dark mode.** The product is light-theme only.
- **No mobile or tablet frames.** The layout is responsive, but a visual pass at
  phone width has not been completed, so there are no verified frames to offer.
- **No non-English frames.** The navigation translates into five languages; the
  page bodies do not yet. A Japanese screenshot would show a translated sidebar
  beside English content and raise a question rather than answer one.
- **No empty states.** Captured deliberately in the most populated state, per
  the brief. If a slide needs an empty state, ask and it can be captured.

**Regenerating.** The capture script lives in the session scratchpad rather than
the repository, because it depends on `puppeteer-core` and a local Chrome path
and does not belong in the application's dependency tree. If these need
recapturing after a UI change, say so and it can be rerun in minutes.
