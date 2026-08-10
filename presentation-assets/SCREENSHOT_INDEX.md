# SCREENSHOT INDEX

**41 screenshots**, recaptured from the running application on **2026-08-10**,
after the vendor-neutrality pass. Every file replaces its predecessor under the
**same filename**, so an existing deck picks them up without relinking.

| Property | Value |
|---|---|
| Capture width | 1920 CSS pixels |
| Device scale | 2× — viewport files are **3840 × 2160**, so a full-bleed 1080p slide is pixel-sharp |
| Format | PNG |
| Browser | Chrome, headless — no devtools, no extensions, no bookmarks bar, scrollbars hidden |
| Zoom | 100% throughout |
| Theme | Light (the product is light-theme only) |
| Data | The seeded demo corpus — 29 cases, 4 plants, 8 users, clock frozen at 5 Aug 2026 09:12 UTC |
| Build | `next build` ✓ 19/19, served via `npm start` |

**Every frame is real.** These were driven through the live application with
browser automation — panels opened, drawers extended, tabs selected and toggles
switched by actually clicking them. Nothing is composed, mocked or edited.

Before each capture the page was allowed to settle: fonts loaded, loading
skeletons gone (asserted, not assumed), charts finished, first-use tip banners
dismissed, the tour invitation suppressed except where it is the subject, focus
rings cleared and no cursor in frame.

---

## Branding

Verified clean. The rendered text of **21 route and interaction states** was
scanned for the legacy vendor name in every spelling, for the internal
`EVERY_ANGLE` key, and for the retired `EA-` / `EA-R-` identifier prefixes.
**Zero occurrences.** Provenance now reads *Enterprise Data Platform*,
*Connected Enterprise Data* or simply *detected*; signal refs are `SIG-` and
detection rules `RULE-`.

---

## How to choose a shot

- **`*-full.png`** is a **full-page capture** — the entire scrollable screen in
  one tall image. Good for showing depth and for appendix slides. It will
  letterbox badly if used full-bleed on 16:9.
- **Everything else is a true 1920 × 1080 frame.** Use these for full-bleed slides.

For a cover or hero slide, use `11-dashboard-above-fold.png`.

---

## Persona used

The **Executive** (Elena Vásquez) unless another role performs the workflow better:

| Persona | Used for |
|---|---|
| Executive — Elena Vásquez | Dashboard, Copilot, Analytics, Help, Guided Tour |
| Ops Manager — Marcus Reinhardt | Work Manager, Case Detail, Action Center, Playbooks, Reports |
| Task Owner — Carlos Mendoza | My Work |
| Administrator — Sandra Whitfield | Connector Health, Audit Log, Administration |

---

## The five frames to use if you only have five slides

1. **`11-dashboard-above-fold.png`** — the product in one image
2. **`15-dashboard-copilot-answer.png`** — a completed live `claude-opus-5` answer
   whose figures match the KPI cards exactly. The strongest AI proof frame.
3. **`30-case-detail-full.png`** — the depth argument
4. **`53-analytics-executive-briefing.png`** — recommendations with impact figures
5. **`b1-admin-priority-weights.png`** — configuration showing its consequences before saving

---

## Full index

### Sign-in

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `c5-login.png` | Login | `/login` | Persona chooser carrying the product positioning statement. The opening/cover frame. | 1920×1080 |

### Guided Tour

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `00-tour-invitation.png` | Guided Tour — invitation | `/dashboard` | First-visit tour invitation on the Executive Dashboard. Shows the product introducing itself to a signed-in role. | 1920×1080 |
| `01-tour-step.png` | Guided Tour — step 1 of 8 | `/dashboard` | A live tour step spotlighting the KPI band, with progress and the demo-tip callout. | 1920×1080 |

### Executive Dashboard

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `10-dashboard-full.png` | Executive Dashboard — full page | `/dashboard` | The whole screen in one tall image: KPI band, execution strip, flow verdict, AI summary, plant health, trends and activity. | full page |
| `11-dashboard-above-fold.png` | Executive Dashboard | `/dashboard` | Exactly what a client sees on first load. The hero frame — use this if you only use one. | 1920×1080 |
| `12-dashboard-flow-verdict.png` | Dashboard — flow verdict | `/dashboard` | Detection against resolution over four weeks, with the backlog trajectory. The only figure that says which direction the operation is moving. | 1920×1080 |
| `13-dashboard-ai-summary.png` | Dashboard AI Summary | `/dashboard` | AI executive summary with tone-tagged callouts, grounded in named cases, beside plant health. | 1920×1080 |
| `14-dashboard-copilot-open.png` | Dashboard Copilot — prompts | `/dashboard` | Portfolio-scope Copilot open, showing the suggested prompt catalogue before anything is asked. | 1920×1080 |
| `15-dashboard-copilot-answer.png` | Dashboard Copilot — live answer | `/dashboard` | A completed live claude-opus-5 answer naming specific cases and figures that match the KPI cards. The strongest AI proof frame. | 1920×1080 |

### Work Manager

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `20-work-manager-full.png` | Work Manager — full page | `/work` | KPI band, toolbar, filter bar, the full case table and the side panel in one image. | full page |
| `21-work-manager-table.png` | Work Manager — table view | `/work` | The queue above the fold, with priority chips, owner avatars and live filter counts. | 1920×1080 |
| `22-work-manager-board.png` | Work Manager — board view | `/work` | The same cases grouped by lifecycle stage. Same data, two shapes. | 1920×1080 |

### Case Detail

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `30-case-detail-full.png` | Case Detail — full record | `/work/QO-2026-004144` | The complete case record end to end. The depth argument — nothing else in the set shows this much substance in one image. | full page |
| `31-case-detail-header.png` | Case Detail — header | `/work/QO-2026-004144` | Header, priority score, SLA state, owner and reviewer, with the executive summary and detection rule beneath. | 1920×1080 |
| `32-case-corrective-actions.png` | Corrective Actions | `/work/QO-2026-004144` | The corrective plan, where reported completion drives status rather than anyone typing one. | 1920×1080 |
| `33-case-evidence.png` | Evidence | `/work/QO-2026-004144` | The evidence locker — attached files, what each one proves, and acceptance state. | 1920×1080 |
| `34-case-verification.png` | Verification | `/work/QO-2026-004144` | The verification panel awaiting a decision: approve, send back or reject. Shows segregation of duties — the owner cannot verify their own work. | 1920×1080 |
| `35-case-audit-trail.png` | Audit Trail | `/work/QO-2026-004144` | Field-level append-only audit with actor, before/after values and source attribution per change. | 1920×1080 |

### My Work

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `40-my-work-full.png` | My Work | `/my-work` | The personal queue — owned cases, submitted work, the verification inbox and today's actions. | full page |

### Execution Analytics

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `50-analytics-full.png` | Execution Analytics — full page | `/analytics` | The entire analytics screen: KPI cards, trends, flow and forecast, performance tables and heatmaps. | full page |
| `51-analytics-above-fold.png` | Execution Analytics | `/analytics` | KPI cards and trend charts above the fold. | 1920×1080 |
| `52-analytics-flow-balance.png` | Flow Balance | `/analytics` | Opening plus detected minus resolved equals closing, reconciling exactly and reading as a sentence. | 1920×1080 |
| `53-analytics-executive-briefing.png` | Executive Briefing | `/analytics` | Drivers, period comparison and ranked recommendation cards carrying impact figures. The 'so what do I do' slide. | 1920×1080 |
| `54-analytics-value-lens.png` | Value Lens | `/analytics` | The same flow region measured in revenue exposure instead of case counts — one toggle moves every chart in the region. | 1920×1080 |

### Action Center

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `60-action-center-full.png` | Action Center — full page | `/actions` | KPI tiles, the cross-case action queue and the recommendations sidebar. | full page |
| `61-action-recommendations.png` | Recommendations | `/actions` | AI recommendations ranked by the exposure behind each one, each applicable in place. | 1920×1080 |
| `62-action-drawer.png` | Action Drawer | `/actions` | Action detail opening beside the queue rather than replacing it, with case context, SLA state and the recommendation. | 1920×1080 |

### Playbooks

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `70-playbooks-full.png` | Playbooks — full page | `/playbooks` | The playbook library with measured effectiveness per play, coverage gaps and the knowledge layer. | full page |
| `71-playbooks-knowledge.png` | Knowledge | `/playbooks` | SOP library, preventive actions and knowledge base under one search. | 1920×1080 |
| `72-playbooks-sop-expanded.png` | SOP | `/playbooks` | An SOP expanded, each step carrying the guardrail it exists to prevent. | 1920×1080 |

### Reports

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `80-reports-full.png` | Reports — full page | `/reports` | Report library, saved reports, section picker, schedules and run history. | full page |
| `81-reports-above-fold.png` | Reports | `/reports` | Template picker, saved reports and the export controls above the fold. | 1920×1080 |

### Connector Health

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `90-connector-health-full.png` | Connector Health — full page | `/system/connectors` | Seven connectors including SAP and Oracle, with health scores, ingestion funnel, dead-letter queue, sync history and field mapping. | full page |
| `91-connector-funnel.png` | Connector Funnel | `/system/connectors` | Ingestion funnel — received, deduplicated, processed, rejected, cases raised — reconciling with the case corpus by construction. | 1920×1080 |
| `92-connector-dead-letter.png` | Dead Letter Queue | `/system/connectors` | Failed messages with replay, including those that cannot be replayed and are marked rather than pretended over. | 1920×1080 |

### Audit Log

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `a0-audit-log-full.png` | Audit Log | `/system/audit` | Append-only network-wide change record with actor, field-level change and source attribution. | full page |

### Administration

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `b0-administration-full.png` | Administration — full page | `/admin` | Users, routing rules, priority weights, SLA thresholds, permissions, departments and platform settings. | full page |
| `b1-admin-priority-weights.png` | Priority Weights | `/admin` | The weight editor with a live re-scoring preview — configuration showing its consequences before saving. | 1920×1080 |
| `b2-admin-permissions.png` | Permissions | `/admin` | The permission matrix derived from the rules the code actually enforces. | 1920×1080 |
| `b3-admin-settings.png` | Settings | `/admin` | AI, workflow and notification settings read from the modules that own them. | 1920×1080 |

### Help Center

| Filename | Screen name | Route | Purpose | Frame |
|---|---|---|---|---|
| `c0-help-center-full.png` | Help Center | `/help` | Searchable in-product help articles, guides and per-screen documentation. | full page |

---

## Notes for whoever builds the deck

**The figures agree across frames.** 19 open cases, $1.5M at risk, 9 past SLA,
11d mean time to resolve, 62.1% SLA adherence — the same numbers appear on the
dashboard, in Analytics, in the Copilot answer and in the reports. That
consistency is itself a selling point; do not crop it out.

**Two frames carry the same claim, deliberately.** `11-dashboard-above-fold.png`
shows "$1.5M across 19 open cases" on the KPI card, and
`15-dashboard-copilot-answer.png` shows the Copilot independently naming the
cases behind it. Used together they make the "every number comes from one
source" argument without a word of explanation.

**Two changes from the previous set, both deliberate:**

- **The Case Detail series moved to `QO-2026-004144`** (was `QO-2026-004182`).
  The old case's record is short enough that Verification and Audit Trail both
  sit inside the last screenful, so their two scroll positions collapsed to the
  page bottom and produced *one identical image* — the previous
  `34-case-verification.png` and `35-case-audit-trail.png` were byte-for-byte
  the same file. `QO-2026-004144` is the same vendor-delay exception type, is
  tier-one, and is `PENDING_VERIFY`, so the verification panel is shown in its
  live decision state rather than as a completed record.
  **Note for the presenter:** `DEMO_SCRIPT.md` still walks `QO-2026-004182`
  live. If you want deck and walkthrough on the same case, say so and the series
  can be recaptured — but only `QO-2026-004182`'s 34/35 pair will collapse again.
- **Breadcrumbs no longer de-hyphenate case numbers.** The trail read
  `QO 2026 004144`; it now reads `QO-2026-004144`.

**What is *not* in this set, and why:**

- **No dark mode.** The product is light-theme only.
- **No mobile or tablet frames.** The layout is responsive, but a visual pass at
  phone width has not been completed, so there are no verified frames to offer.
- **No non-English frames.** Navigation translates into five languages; page
  bodies do not yet, so a translated screenshot would raise a question rather
  than answer one.
- **No empty states.** Captured deliberately in the most populated state. If a
  slide needs an empty state, ask and it can be captured.

**Regenerating.** The capture script lives in the session scratchpad rather than
the repository, because it depends on `puppeteer-core` and a local Chrome path
and does not belong in the application's dependency tree. Rerunning it against a
running `npm start` reproduces this set in about four minutes.
