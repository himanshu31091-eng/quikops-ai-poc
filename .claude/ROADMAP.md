# ROADMAP

> The implementation backlog for everything not yet built. Written so a future
> session can pick up any item and start immediately without re-planning.
>
> Lives in `.claude/` because that is the established project memory and
> `CLAUDE.md` already routes here. Update the status table when a module lands;
> append decisions to `DECISIONS.md`, not to this file.

**Last updated:** 2026-08-07 (product audit) — **all Phase-1 modules and all eleven cross-platform capabilities are implemented, and the codebase has been through a full stabilization pass.** Remaining work is migration and hardening, not construction. See *Technical debt* below, RELEASE_NOTES.md for what shipped, and QA_CHECKLIST.md for what has and has not been verified.

---

## How to use this document

Each Priority 2 module carries eight sections — Purpose, Key Features,
Architecture, Components, Business Logic, Data Sources, Dependencies,
Estimated Complexity. Paths named are real: where a seed or a builder already
exists, it is called out so nothing is invented twice.

**Complexity scale** (one session ≈ one focused build-and-verify pass):

| Size | Meaning |
|---|---|
| **S** | ½ session · one screen, existing data, no new domain logic |
| **M** | 1 session · new fixtures or one new domain module |
| **L** | 1–2 sessions · new domain logic + cross-module wiring |
| **XL** | 2–3 sessions · touches every existing screen |

---

## Status — Priority 1 (current sprint)

| Module | Route | State |
|---|---|---|
| Executive Dashboard | `/dashboard` | ✅ **complete · frozen** |
| Work Manager | `/work` | ✅ **complete · frozen** |
| Case Detail | `/work/[caseId]` | ✅ **complete · frozen** |
| My Work | `/my-work` | ✅ **complete · frozen** |
| Execution Analytics | `/analytics` | ✅ **complete** |
| **Action Center** | `/actions` | ✅ **complete** — built and verified 2026-08-06 |

Plus: Execution Workflow (cross-module store) and the live Anthropic Copilot at
case and portfolio scope. **Priority 1 is closed.**

---

## ✅ Blocking debt — RESOLVED 2026-08-06

The hand-authored figures that contradicted the computed data have been
reconciled. Every portfolio number is now derived by
`src/domain/portfolio-metrics.ts` and read by the dashboard, plant health, the
AI summary, Execution Analytics and the Copilot alike. See D-48, D-49, D-50.

A fourth defect surfaced during verification and was fixed in the same pass:
`REVENUE_IMPACT` totalled $1,728,000 across 25 cases against a portfolio of
$1,531,700 across 19. The live Copilot found it by summing the block and
comparing it with the headline.

The corpus grew from 24 to **29 cases** — five resolved fast-band cases were
added because every previously-resolved case sat in the LOW or MEDIUM band, so
MTTR was computed from an unrepresentative sample (D-50).

Verified: dashboard and Analytics report identical figures (11d / 62.1% / 76.9%
/ 41.4%), and the live Copilot independently confirms 19 open, $1,531,700 at
risk, 9 past SLA, with the exception-type block summing to the same total.

Both cosmetic defects fixed.

---

## ✅ Stabilization pass — 2026-08-06

No features added. The pass found two functional defects and a set of code-health
gaps; all are fixed. Full detail in RELEASE_NOTES.md, decisions in D-62 to D-66.

| Audit item | Result |
|---|---|
| ESLint across the project | Configured (none existed); **0 errors, 0 warnings** |
| Warnings and errors fixed | 2 real (`<a>` for internal navigation, 9 sites); Next-plugin build warning silenced |
| Dead code removed | 4 files, 10 exports |
| Unused imports | 0 remaining (enforced at `error`) |
| Unused components | `ModulePlaceholder`, `FirstUseHint`, `TourLauncher` removed |
| Duplicate helpers | 1 real collision renamed (`weeklyThroughputSeries`); 4 same-role names deliberately kept (D-65) |
| Component comments | **243 of 243 files documented** (was 190) |
| Exported function docs | Every non-obvious export carries a `/**` block |
| Naming conventions | 0 non-kebab filenames; PascalCase components; camelCase functions |
| Responsive behaviour | 9/9 tables in scroll containers; 0 fixed-width containers |
| Dark / light theme | **Light only** — no dark palette exists (D-66) |
| Keyboard accessibility | 0 `<div onClick>`, 0 positive `tabIndex`, global `:focus-visible`, skip link |
| ARIA labels | 46 `<th>` given `scope`; 1 unnamed input fixed; 0 unnamed icon buttons |
| Unnecessary renders | 34 `React.memo`, 83 `useMemo`, 150 `useCallback`; all 3 context values memoised |
| Bundle size | 102 kB shared; charts add ~110–130 kB to 2 of 16 routes (see below) |
| `console.log` | 0 (12 intentional `console.error` in error boundaries) |
| `TODO` / `FIXME` | 0 |

**Two functional defects found and fixed:**

1. **Demo Reset restored only half the product** — `useResetSignal` existed but
   no module subscribed to it (D-64). This would have failed live, between
   demos, in front of the client.
2. **`projectActivity` was deleted by the dead-code sweep** and caught by
   typecheck within the same command. Recorded because it is the argument for
   running the compiler as part of deletion, not after it (D-63).

---

## ✅ Product audit — 2026-08-07

Twenty review dimensions across the whole application. **No Critical issues.**
Seven High issues found and fixed; decisions in D-68 to D-71.

| Dimension | Result |
|---|---|
| Navigation | 11/11 nav hrefs resolve; 0 orphan routes |
| Loading states | **5 routes had none** — added, each shaped to its own module (D-68) |
| Error states | 13/13 routes covered; a `/login` boundary added |
| Empty states | Every module reaches `EmptyState`, or `DataTable`'s own |
| Demo flow | **4 of 14 tour steps pointed at anchors that did not exist** — fixed (D-69) |
| UI consistency | 9/11 module views use `PageHeader`; Case Detail owns its own by design |
| UX consistency | **Dashboard and Work Manager had no ⓘ doc panel** while their content already existed — wired |
| Enterprise polish | **Dashboard Export was a dead button**; Connector Health had no export — both fixed (D-70) |
| Accessibility | **Mobile nav drawer had no Escape and no focus trap** — added |
| Mobile usability | Drawer now behaves like every other overlay; global search is still `md:` and above |
| Design tokens | 0 raw hex and 0 palette classes outside `globals.css` (the Microsoft logo and `themeColor` excepted) |
| Type safety | 0 `any`, 0 `@ts-ignore`, 2 documented `eslint-disable` |
| Build warnings | 0 |
| Dead code | 1 dead button; 1 speculative fix written and deleted when measured as no help (D-71) |
| Duplicate code | None — the three feature export files are column definitions over `src/lib/csv` |
| Component reuse | 3 modules on `DataTable`, 6 hand-rolled (3 of them frozen) — see debt |
| Workflow consistency | 4 modules write through `recordOutcome`; readers use projections |
| AI integration | Live `claude-opus-5` re-confirmed at both scopes on this build |
| Performance | 0 stale-closure dep regressions; all 3 context values memoised |
| Responsive | 9/9 tables scroll; 0 fixed-width containers |

---

## Technical debt

Ordered by what would hurt first. None of it blocks the demo.

| # | Debt | Size | Cost of leaving it |
|---|---|---|---|
| 1 | **No automated tests.** Verification is typecheck + lint + build + a manual route pass. | L | Every future change is verified by re-reading QA_CHECKLIST.md by hand. This is the debt that compounds. |
| 2 | **i18n is architecture, not translation.** ~900–1,400 literals still sit in components. | XL | Grows with every string written. The provider and catalogues are in place, so the work is mechanical — but it is mechanical work over 243 files. |
| 3 | **No axe-core audit, no measured contrast.** Structural a11y is verified; tooling is not run. | M | Structural checks miss contrast and screen-reader flow, which is where AA is usually lost. |
| 4 | **Charts are statically imported** on `/dashboard` (304 kB) and `/analytics` (311 kB) against a 172–204 kB baseline elsewhere. | S | ~110–130 kB of first-load JS on the two routes that open the demo. `next/dynamic` would move it, at the cost of a chart loading state on a frozen screen — a deliberate trade, not an oversight. |
| 5 | **Unknown case numbers return HTTP 200** with the correct not-found page. Measured: the *parent* `/work/loading.tsx` commits the status, so the only fix is losing the skeletons on the two heaviest screens (D-71). | S | Wrong for crawlers and uptime monitoring, and it makes a smoke test on a made-up case number pass. Invisible to a user. |
| 6 | **Plant scope selector is inert.** | M | It looks like a filter. Either wire it through every module or label it. |
| 6b | **Global search is hidden below `md`.** The ⌘K palette is keyboard-only, so a phone has no way to search. | S | Mobile is not the demo surface, but the top bar advertises a capability that is absent at that width. |
| 6c | **Six modules hand-roll `<table>` markup** instead of using `DataTable`; three of them are frozen. | M | Sorting, pagination and `aria-sort` are re-implemented per module, so an improvement to the shared table does not reach them. |
| 7 | **No persistence.** Only tour completion survives a reload. | L | Correct for a demo; the first thing a pilot would need. |
| 8 | **No authentication or authorization.** Persona switching is a cookie write; role only filters navigation. | L | Blocks any deployment where the data is real. |

## Priority 2 — remaining enterprise modules

Order below is the one given. See *Recommended sequencing* for where I would
deviate and why.

---

### 1. Reports · `/reports` — ✅ COMPLETE 2026-08-06

**Purpose**
Scheduled and on-demand executive and audit reporting, with distribution to
stakeholder lists. The artefact a manager sends upward when they are not in the
room — the counterpart to Analytics, which is the screen they read themselves.

**Key features**
- Report library: pre-defined templates (Executive Summary, SLA Compliance,
  Supplier Performance, Plant Scorecard, Audit Extract)
- Report builder: pick scope (plants, date range, priority), pick sections
- Schedule: daily / weekly / monthly, with recipient lists and next-run
- Run history with status, row counts and re-download
- Preview before generating
- Export CSV (existing) and PDF (print pipeline, per D-44)

**Architecture**
```
src/data/fixtures/reports.ts     REPORT_TEMPLATES, REPORT_SCHEDULES, REPORT_RUNS
src/data/queries/reports.ts      getReportsData()
src/domain/report-schedule.ts    nextRunAt(), cadence rules      ← new domain logic
features/reports/
  types/ hooks/use-reports.ts utils/report-compose.ts components/
```

**Components**
`reports-view` (root) · `report-library` (template cards) · `report-builder`
(scope + section picker, reuses `FilterMenu`, `FormField`) · `report-preview`
(renders the composed report using existing SectionCard/table primitives) ·
`schedule-dialog` · `run-history-table`

**Business logic**
Cadence → next run date is the only genuinely new rule (`src/domain/`).
Everything a report *contains* must reuse the Analytics derivations —
`analytics-derive.ts` already computes plant performance, owner performance,
SLA adherence and throughput. **Do not recompute any of it.** If a derivation
is needed by both, move it down to `src/domain/` or a shared `src/data/queries`
function rather than importing across features.

**Data sources**
`CASES`, `EXECUTION_METRICS`, `PLANT_HEALTH` (existing) + new `reports.ts`
fixture for templates, schedules and run history.

**Dependencies**
Analytics derivations (share via `src/`), `src/lib/csv.ts`, print CSS pattern
from `export-analytics.ts`. Blocked by nothing.

**Estimated complexity: L** — the builder and preview are real UI surface, and
report composition needs care to avoid duplicating Analytics.

---

### 2. Connector Health · `/system/connectors` — ✅ COMPLETE 2026-08-06

**Purpose**
The Every Angle integration story, made inspectable. The whole product
positioning rests on "Every Angle detects, QuikOps executes" — this is the
screen that proves the first half is real and monitored.

**Key features**
- Connector list with status (`SUCCESS` / `PARTIAL` / `FAILED` / `RUNNING`),
  last run, next run, records processed
- Run history timeline per connector with duration and row counts
- Signal ingestion funnel: received → deduplicated → cases raised → rejected
- Dead-letter queue with failure reason and **replay** action
- Field-mapping view (Every Angle field → QuikOps field)
- Health trend sparkline per connector

**Architecture**
```
src/data/fixtures/connectors.ts   CONNECTORS, CONNECTOR_RUNS, DEAD_LETTER
src/data/queries/connectors.ts    getConnectorHealthData()
src/domain/connector-health.ts    scoreConnectorHealth()          ← new domain logic
features/connector-health/
```

**Components**
`connector-health-view` · `connector-card` (status + sparkline) ·
`run-history-table` · `ingestion-funnel` (reuse `chart-primitives`) ·
`dead-letter-table` with replay · `field-mapping-table`

**Business logic**
Health scoring per connector (success rate over last N runs, staleness against
expected cadence, dead-letter depth) — a rule set, so `src/domain/`. Replay is a
session-scoped action that moves a dead-letter row to processed and emits a
workflow event.

**Data sources**
`ConnectorStatus` **already exists** in `src/domain/types.ts:66`. Everything
else is new fixture. Signal refs already appear on cases
(`information.signalRef`, e.g. `EA-2026-08-02-MX-004182`) and detection rule IDs
(`EA-R-VD-002`) — **seed the connector data so those existing references
resolve**, or the two screens will contradict each other.

**Dependencies**
None blocking. Should reuse `caseHref` so a raised signal links to its case.

**Estimated complexity: M** — mostly new fixtures over familiar table/chart
patterns.

---

### 3. Audit Log · `/system/audit` — ✅ COMPLETE 2026-08-06

**Purpose**
Append-only record of every state change, assignment, verification decision and
configuration edit across every case, with actor, timestamp and source. The
compliance answer to "who changed this, and when".

> **Correction to an earlier note.** `NEXT_STEPS.md` previously listed this as
> blocked on persistence. It is **not blocked.** `buildAuditLog(item, timeline,
> verification)` already produces a full audit trail per case; mapping it across
> all 29 cases and concatenating gives a real global log — exactly the pattern
> Action Center used for `buildCorrectiveActions`. Session-scoped entries from
> the execution store layer on top. Only *durability* needs a database, and the
> demo does not need durability.

**Key features**
- Global chronological log, newest first, virtualised
- Filters: actor, source (`EVERY_ANGLE` / `WORK_MANAGER` / `CASE_DETAIL` /
  `RULE_ENGINE` / `API`), action type, case, date range
- Field-level diff (`field`, `fromValue` → `toValue`) already on the type
- Export to CSV for an auditor
- Jump to the case each entry belongs to
- Session entries visibly distinguished from stored ones

**Architecture**
```
src/data/queries/audit.ts        getAuditLogData()  — maps buildAuditLog over CASES
features/audit-log/
  types/ hooks/use-audit-log.ts utils/audit-filters.ts components/
```
No new domain module needed — `CaseAuditEntry` already carries everything.

**Components**
`audit-log-view` · `audit-toolbar` (reuse `FilterMenu`) · `audit-table`
(reuse the virtualisation approach from `use-virtual-rows`) · `audit-entry-row`
with diff rendering

**Business logic**
Ordering and filtering only. The one rule worth stating: session entries from
the execution store must interleave chronologically with stored ones, not sit in
a separate section — an audit log with two timelines is not an audit log.

**Data sources**
`buildAuditLog` per case (existing), `ExecutionState.events` for the session.

**Dependencies**
`use-virtual-rows` is inside `features/work-manager/hooks/` — **it must move
down to `components/` or `src/` first**, same treatment as `FilterMenu` and
`caseHref`. That is the fourth instance of this pattern; consider doing a
deliberate sweep (see cross-cutting item below).

**Estimated complexity: M**

---

### 4. Administration · `/admin` — ✅ COMPLETE 2026-08-06

**Purpose**
Users, roles, plant scoping, assignment routing, SLA thresholds and priority
weights. The screen that turns hard-coded rules into deployment configuration —
and the one a technical evaluator asks for when they ask "can we tune this?"

**Key features**
- User table: role, job title, plant scope, active toggle
- Role matrix: which roles can own, review, configure
- Plant management
- **Priority weight editor** — live preview of how re-weighting re-ranks the
  current case list
- **SLA threshold editor** per band, with a count of which open cases would
  breach under the new targets
- Assignment routing rules (plant + exception type → default owner)
- Configuration audit (every change writes to the audit log)

**Business logic**
Mostly a form over two constants that are **already isolated for exactly this**:
`PRIORITY_WEIGHTS` in `src/domain/priority.ts` and `SLA_TARGET_HOURS` in
`src/domain/sla.ts`. Both are already documented as deployment-configurable.

The valuable part is the **live preview**: `computePriority` is pure, so
re-scoring all 29 cases under draft weights is instant, and showing the
re-ranking before saving is what makes the screen credible rather than a settings
page.

**Architecture**
```
src/domain/config-preview.ts     rescoreUnder(weights), breachesUnder(targets)
src/data/queries/admin.ts        getAdminData()
features/administration/
```

**Data sources**
`USERS`, `PLANTS` (existing), `PRIORITY_WEIGHTS`, `SLA_TARGET_HOURS`.

**Dependencies**
Nothing blocking. Changes are session-scoped like everything else; persisting
them needs the database.

**Estimated complexity: M** — simple data, but the preview deserves care.

---

### 5. Playbooks · `/playbooks` — ✅ COMPLETE 2026-08-06

**Purpose**
Reusable corrective-action templates per exception type, with usage counts,
average resolution time and measured effectiveness. Turns "what did we do last
time" into a library rather than tribal knowledge.

**Key features**
- Playbook library by exception type
- Step editor (title, description, default owner role, default due offset)
- **Effectiveness metrics**: cases where this playbook was applied, average
  resolution vs portfolio, recurrence rate after application
- "Apply playbook" from a case
- Version history
- Which cases are currently running each playbook

**Data sources — the seed already exists**
`PLAYBOOK_STEPS` in `src/data/fixtures/case-detail.ts:322` is a complete
`Record<ExceptionType, {title, description}[]>` and is already what
`buildCorrectiveActions` uses to generate plans. **Promote it to
`src/data/fixtures/playbooks.ts`** with added metadata (id, name, version,
owner role, due offset) and re-point `case-detail.ts` at it. Cases already carry
`playbookId`, so the linkage exists.

**Business logic**
Effectiveness scoring — cases grouped by `playbookId`, compared on resolution
time and post-closure recurrence against the portfolio baseline. A rule set →
`src/domain/playbook-effectiveness.ts`.

⚠️ **Honesty check:** with 29 seeded cases, per-playbook sample sizes will be 1–5.
Label sample size on every metric, exactly as the Analytics KPI cards now do, or
the screen will assert precision it does not have.

**Architecture**
```
src/data/fixtures/playbooks.ts       promoted from PLAYBOOK_STEPS
src/domain/playbook-effectiveness.ts
src/data/queries/playbooks.ts
features/playbooks/
```

**Dependencies**
Touches `case-detail.ts` fixtures (promotion) — a frozen-adjacent file, but the
change is a move with no behaviour change.

**Estimated complexity: M**

---

## Cross-platform enterprise features

Not pages. These work throughout the application, and several get
**exponentially more expensive the longer they wait**.

---

### 1. Guided Product Tour · **M**

**Plan**
```
src/tour/types.ts          TourStep { anchorId, title, body, placement, route }
src/tour/tours.ts          EXECUTIVE_TOUR, MANAGER_TOUR, OPERATOR_TOUR, ADMIN_TOUR
src/tour/tour-store.tsx    provider on (app) layout — current step, completion
components/tour/tour-overlay.tsx   spotlight + popover
components/tour/tour-launcher.tsx  restart control in the user menu
```

- **Anchoring:** steps reference `data-tour="kpi-band"` attributes rather than
  CSS selectors. Selectors break the moment a class changes; a data attribute is
  an explicit contract. Adding them to frozen screens is additive and safe.
- **Role-based:** four tours keyed on `UserRole`, resolved from the session user.
  The COO tour skips the case-execution steps; the operator tour skips the
  dashboard.
- **Cross-route:** a step carries a `route`, and the store navigates before
  showing it — the tour must be able to walk Dashboard → Work Manager → Case.
- **Persistence:** completion in `localStorage` keyed by role. There is no user
  table to write to, and this is the one piece of state that should survive a
  refresh even though nothing else does.
- **Reduced motion:** spotlight uses the existing `.anim-fade` only.

---

### 2. Multi-language (i18n) · **XL — and the sequencing matters**

**Measured surface today:** ~257 translatable component props (`title=` 80,
`label=` 94, `subtitle=` 31, `description=` 26, `placeholder=` 20) + ~70 JSX
text nodes + **399 prose strings in `src/config` and `src/data/fixtures`**.
Realistically **900–1,400 user-visible strings** across 16,192 lines of TSX.

> **Do this before Priority 2, not after.** Every module in Priority 2 adds
> roughly 150–250 strings. Retrofitting i18n after five more modules means
> touching ~2,000 strings instead of ~1,100, across screens that will by then be
> frozen. This is the single most order-sensitive item in this document.

**Plan**
```
src/i18n/config.ts        LOCALES = en, es, de, fr, ja · DEFAULT_LOCALE
src/i18n/messages/en.json  …es.json, de.json, fr.json, ja.json
src/i18n/provider.tsx     locale context, mounted on (app) layout
src/i18n/use-translation.ts   t(key, params)
src/i18n/format.ts        wraps src/lib/format.ts with locale-aware Intl
```

- **Key structure:** `module.section.element` (`analytics.kpi.mttr.label`).
  Flat enough to grep, structured enough to split files later.
- **Fixture prose is the hard part.** Case titles, descriptions, root causes and
  playbook steps are *content*, not chrome. Decide explicitly: either translate
  the seeded corpus (large, and a translator needs domain context) or declare
  operational data locale-independent and translate only the shell. **Recommend
  the latter for the demo**, stated openly rather than silently.
- **`src/lib/format.ts` already centralises every number, currency and date** —
  which is why date/number localisation is cheap. Swap the hard-coded `"en-US"`
  and `"USD"` for locale-derived values in one file.
- **Japanese** needs a font check: Inter Variable has no CJK coverage. Add a
  CJK fallback in `--font-sans` or Japanese renders in a system fallback.
- **Persistence:** locale in the same cookie mechanism as `qo_persona`.

---

### 3. Accessibility — WCAG 2.2 AA · **L**

**Baseline today is better than nothing:** 75 `aria-*` attributes, 12 explicit
roles, `inert` used correctly on both overlay panels, one focus ring defined
globally, `prefers-reduced-motion` already collapses all five animations, and
the chart palette is already documented as colour-blind safe.

**Plan — reusable helpers**
```
src/a11y/use-focus-trap.ts       for Dialog and both drawers
src/a11y/use-roving-focus.ts     for tables, board columns, menus
src/a11y/use-announcer.ts        aria-live region for async results
src/a11y/use-keyboard-shortcut.ts
components/a11y/visually-hidden.tsx
components/a11y/skip-link.tsx    "Skip to main content"
```

**Known gaps to close**
- **Tables:** `action-queue` and `case-table` rows are clickable `<tr>`s with
  `tabIndex`. Needs `aria-rowindex`, proper `scope` on headers, and roving focus
  so arrow keys move between rows.
- **Charts:** Recharts output is invisible to a screen reader. Add a
  `<VisuallyHidden>` data table beside each chart — the accessible equivalent,
  and cheap because the data is already an array.
- **Heatmaps:** colour currently carries meaning; the value is in the cell and
  the detail in a tooltip, but tooltips are hover-only. Needs focusable cells.
- **Live regions:** every toast should announce. `ActionToast` is the single
  chokepoint — one change covers the whole app.
- **High contrast:** add a `@media (prefers-contrast: more)` block in
  `globals.css` overriding token values only. No component changes.
- **Forms:** `FormField` already wires `htmlFor`; add `aria-describedby` for the
  error and hint it already renders.

**Verification:** axe-core in CI is the honest way to claim AA. Manual keyboard
walkthrough of each module is the minimum before claiming it.

---

### 4. Help Center · **M**

Global, reachable from every screen (`?` shortcut + top-bar control).

```
src/help/content/*.mdx | *.ts     the 12 required articles
src/data/queries/help.ts          getHelpArticles()
features/help/                    help-panel (slide-over, not a route)
```

Articles required: Overview · How QuikOps AI Works · Modules Overview ·
Navigation Guide · Keyboard Shortcuts · FAQ · User Roles · AI Copilot Guide ·
Workflow Guide · Data Sources · Troubleshooting · Release Notes.

**Decision to make:** MDX needs a dependency and build config; a typed
`HelpArticle[]` with structured blocks needs none and stays greppable for the
search feature below. **Recommend structured TS** for consistency with how every
other piece of content in this codebase is stored.

Much of the content already exists in `.claude/` — `PROJECT_CONTEXT.md` is the
Overview, `ARCHITECTURE.md` is Data Sources, `DEMO_SCRIPT.md` §9 is the FAQ.
Adapt, do not rewrite.

---

### 5. Interactive Documentation ("What does this screen do?") · **S**

A per-module panel with Purpose · Business Value · KPIs Explained · Workflow ·
Best Practices · Related Screens.

```
src/help/screen-docs.ts       Record<ModuleKey, ScreenDoc>
components/patterns/screen-doc-button.tsx   ⓘ in every PageHeader
```

Cheap and high-value: `PageHeader` is used by every module, so one prop addition
reaches all of them. The content for six modules already exists in this
document and in `PROJECT_CONTEXT.md`.

---

### 6. PDF Documentation · **S**

Eight guides: Executive · Manager · Operator · Administrator · Architecture
Overview · Feature Guide · Workflow Guide · Quick Start.

Reuse the print pipeline established in D-44 — a `/help/print/[guide]` route
rendering the article with `print:` styles, and a "Download PDF" button calling
`window.print()`. **No PDF library.** Consistent with the Analytics export and
adds no dependency.

---

### 7. Product Walkthrough Videos · **S** (architecture only)

```
src/help/videos.ts     VideoResource { id, provider, src, poster, chapters[], transcript }
components/media/video-player.tsx
```

- Providers: `youtube` | `vimeo` | `local`
- Chapters as timestamp + label, rendered as a clickable list
- Transcript rendered beside the player — also feeds the documentation search
- ⚠️ **CSP:** embedding YouTube/Vimeo requires allowing those frame sources.
  Note it before someone spends an hour on a blank iframe.

Placeholders only until real recordings exist; the poster frames should say so
rather than implying missing content.

---

### 8. In-App Tips · **S**

- Hover tooltips — `components/ui/tooltip.tsx` already exists and is used
- Empty-state guidance — `EmptyState` already supports an `action` slot; most
  empty states already carry real copy
- First-use guidance — one `useFirstUse(key)` hook over `localStorage`
- Feature announcements — a dismissible strip driven by a version constant

Mostly assembly of things already present. The discipline is not adding a sixth
animation.

---

### 9. Searchable Documentation · **M**

Extends the existing `components/shell/global-search.tsx` (which already
searches cases) with a second index over modules, features, FAQs, help articles,
playbooks, commands and settings.

```
src/search/index.ts      buildSearchIndex() — one flat SearchEntry[]
src/search/matcher.ts    scoring: exact > prefix > substring > fuzzy
```

Keep it dependency-free: a scored substring match over a few hundred entries is
instant and avoids adding a search library for a demo. Group results by type in
the existing dialog rather than redesigning it.

---

### 10. Demo Mode / Reset · **S — nearly free today**

`ExecutionProvider` **already exposes `reset()`**
(`src/workflow/execution-store.tsx:135`). What is missing is reach: each module
holds its own session state (`overrides`, `created`, filters) in its own hook.

**Plan**
- Add a `resetSignal` counter to the execution store
- Each module hook subscribes and clears its local state when it changes
- One "Reset Demo" control in the user menu, confirming first
- Restores: cases, analytics, workflow outcomes, notifications, applied
  recommendations, created actions

The mechanism is a broadcast, not a per-module button — one signal, every hook
listens. **Complexity S**, and it makes every rehearsal repeatable.

---

## Recommended sequencing

The order requested is Reports → Connector Health → Audit Log → Administration →
Playbooks, with cross-cutting features after. I would change two things, both
for cost reasons rather than preference:

| # | Do this | Why |
|---|---|---|
| 1 | **Fixture reconciliation** (S) | The live Copilot contradicts the dashboard in front of the client. Highest value per hour in this document. |
| 2 | **i18n foundation** (XL) | Every subsequent module doubles the retrofit cost. Land the provider, the key structure and the `format.ts` swap *before* writing 1,000 more strings. Translation files can follow. |
| 3 | **Demo Mode** (S) | Nearly free, makes every following demo repeatable. |
| 4 | **Shared-helper sweep** (S) | `use-virtual-rows` still lives in `features/work-manager/`. This is the 4th time a helper needed moving down — do it deliberately once rather than four more times reactively. |
| 5 | Connector Health (M) | Ahead of Reports: it is the integration story, existing signal refs already point at it, and it is the cheaper build. |
| 6 | Audit Log (M) | Not blocked — see the correction above. |
| 7 | Reports (L) | After Analytics derivations have been shared down, which Reports depends on. |
| 8 | Playbooks (M) · Administration (M) | Both low-risk, both mostly over existing constants. |
| 9 | Accessibility (L) | Best done once the screen inventory is complete, but do not defer past this point. |
| 10 | Help Center (M) · Interactive Docs (S) · PDF (S) · Videos (S) · Tips (S) · Search (M) | The documentation cluster shares content; build them together. |
| 11 | Guided Tour (M) | Last: it anchors to controls, so it wants a stable UI. |

**Rough total: 14–18 focused sessions.**

---

## Complexity summary

| Item | Size | Blocked by |
|---|---|---|
| Fixture reconciliation | S | — |
| Demo Mode / Reset | S | — |
| Shared-helper sweep | S | — |
| Interactive Documentation | S | — |
| PDF Documentation | S | Help Center content |
| Walkthrough Videos | S | CSP decision |
| In-App Tips | S | — |
| Connector Health | M | — |
| Audit Log | M | helper sweep (`use-virtual-rows`) |
| Administration | M | — |
| Playbooks | M | — |
| Help Center | M | content format decision |
| Searchable Documentation | M | Help Center |
| Guided Product Tour | M | stable UI |
| Reports | L | Analytics derivations shared down |
| Accessibility (AA) | L | — |
| Multi-language | XL | **do early** |

---

## Standing constraints that apply to every item above

- **Frozen:** Executive Dashboard, Work Manager, Case Detail, My Work,
  Execution Workflow. Bug fixes only; extend by wrapping, never by editing
  (D-13).
- **No feature may import another feature.** Shared logic moves *down* into
  `src/` or `components/`. Four precedents: `caseHref`, the Copilot panel,
  `FilterMenu`, `src/lib/csv.ts`.
- **No business logic in components.** New rules go in `src/domain/`.
- **No new design tokens. Exactly five animations.**
- **Every module ends with** `npm run typecheck`, `npm run build`, runtime
  verification of the other modules, then updates to `DEVELOPMENT_STATUS.md`,
  `NEXT_STEPS.md`, `DECISIONS.md` and `SESSION_HANDOFF.md`.
