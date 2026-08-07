# DECISIONS

> The architectural and product decisions behind this codebase, with the
> reasoning that produced them. Append to this file; do not rewrite history.
>
> Format: **what was decided · why · where it lives · what it costs.**

---

## Product & domain

### D-01 — Priority is scored by a deterministic rule set, never by a model
`src/domain/priority.ts`

Six weighted factors (revenue 35, KPI deviation 26, customer tier 15, urgency
12, recurrence 8, escalation 4) saturating on fixed constants, producing a
0–100 score and a band.

**Why:** executives have to be able to defend prioritisation in a review. An
unexplainable priority is an ignored priority. AI may *suggest* an adjustment;
it never sets the number. This is also a sales point — the Copilot explaining
the score is explaining arithmetic, not rationalising a guess.

**Cost:** weights are hand-tuned, not learned. They are declared configurable
per deployment and versioned.

### D-02 — Verification is the only path to recovered revenue
`src/workflow/projections.ts::revenueMovement` · enforced in `use-case-detail.ts`

Approving verification moves exposure from at-risk to recovered. Closing a case
administratively removes it from the open pool and recovers **nothing**.

**Why:** it is the entire argument for having a verification step. If closing a
case recovered revenue, the platform would be a to-do list. This single rule is
what makes the dashboard's recovered figure mean something.

### D-03 — Status is derived from work, never typed in
`features/case-detail/hooks/use-case-detail.ts`

Assigning an owner to a detected case moves it to `ASSIGNED`. Completing every
action does *not* verify anything — a reviewer still decides. Action status is
derived from `completionPct` via `statusFromCompletion()`.

**Why:** a status a user can set arbitrarily is a status nobody trusts.

### D-04 — No state change without a timeline event and an audit entry
`use-case-detail.ts::record()`

One function writes both, together, for every mutation.

**Why:** *"a status that moved with no record of who moved it is exactly the
failure mode an execution platform exists to prevent."* Writing them in one
place means they cannot diverge.

### D-05 — Nine persisted statuses, six the manager sees
`src/domain/case-status.ts`

`NEW`/`TRIAGED`/`REOPENED` → `DETECTED`; `CLOSED`/`DISMISSED` → `CLOSED`.
Moving a case *back* to Detected writes `TRIAGED`, not `NEW` — it has been
looked at once.

**Why:** the persisted enum needs the granularity; the board a manager works
from does not. One mapping module means the board, the filter and every future
module agree on the collapse.

### D-06 — Health is separate from priority
`src/domain/case-health.ts`

**Why:** priority says how much a case matters; health says whether the work is
moving. A critical case being executed well and a low case that nobody has
touched are different problems.

**Refinement (engineering review):** health scoring was moved *out of the
fixture builder* into `src/domain/` so the client can re-score it live. This
fixed a real bug — health was frozen at page load and did not move as the
manager worked.

---

## Data & time

### D-07 — Frozen demo clock
`DEMO_NOW = 2026-08-05T09:12:00Z` · `src/lib/constants.ts`

**Why:** the demo must be identical on every rehearsal. Relative dates, SLA
breaches and trend series all anchor to it. Nothing calls `new Date()` for now.

**Cost:** replacing it with a live clock is a one-line change but will shift
every seeded case's SLA state — the fixtures were tuned against this instant.

### D-08 — Deterministic pseudo-randomness for trend series
`mulberry32` in `src/data/fixtures/metrics.ts`

**Why:** trend lines need to look organic but be byte-identical on every render.
*"A chart that redraws differently on refresh destroys confidence in the numbers."*

### D-09 — Fixtures behind an async query layer
`src/data/queries/*`

Every function is `async` and returns a finished view model even though nothing
awaits I/O today.

**Why:** it is the seam. Connecting Neon replaces function bodies and touches no
component. Making them async *now* means no call site changes later.

### D-10 — Queries return raw sets, modules aggregate
`getWorkManagerData` returns all cases; `getMyWorkData` returns all cases too.

**Why:** two reasons. (1) A filter change costs one memoised pass instead of a
server round trip. (2) The KPI header, table, board and side panel read the same
array, so they cannot disagree. For My Work specifically, server-side filtering
would make it impossible for a case reassigned mid-session to leave the list.

---

## State architecture

### D-11 — Three-tier state, deliberately split
Server props (immutable) · per-module hook (rich, local) · `src/workflow/` (thin, shared)

**Why:** a single global store holding everything would make every keystroke on
a case a global update. A per-page store would make closing a case invisible to
the dashboard. Tier 3 carries only the part of an outcome another screen needs.

**Alternative rejected:** lifting the full case session state to the layout.
Correct-looking, and it would have made the dashboard re-render on every
character typed into a comment box.

### D-12 — Every projection is a no-op on an empty store
`src/workflow/projections.ts` — verified: `projectCaseFacts(cases, EMPTY) === cases`

**Why:** it is what lets the dashboard stay a server component with a thin
reactive shell over it. First client paint is byte-identical to the server
response — no hydration mismatch, no flash of different numbers.

**This is load-bearing.** Any new projection must preserve it.

### D-13 — Frozen screens are made reactive by wrapping, not editing
`features/dashboard/components/live-dashboard.tsx`

Five thin client components read the store and pass projected props to
completely untouched presentational components.

**Why:** it satisfies "do not modify existing components" literally while still
delivering live cross-module updates. It is the pattern to reuse whenever a
frozen screen needs new behaviour.

### D-14 — `caseNo` is the cross-module key, not `id`
**Why:** it is the identifier every module already carries, it appears in the
URL, and it is what a user reads aloud in a meeting. Keying the store on it
means no id lookups when reconciling a case across screens.

---

## UI & design system

### D-15 — One file owns every design token
`app/globals.css`

**Why:** a single grep proves no component invented a colour. It is also what
makes the "do not change typography/colours/spacing" freeze enforceable.

### D-16 — Exactly five animations
`.anim-fade` · `.anim-settle` · `.anim-panel` · `.anim-reveal` · `.anim-status`

**Why:** enterprise software reads as serious when motion is scarce and
consistent. A closed set also means the whole app respects
`prefers-reduced-motion` in one media query.

### D-17 — Structure from a 1px border, not a shadow. Two elevation levels only.
**Why:** stated in `section-card.tsx` — *one of the strongest signals separating
enterprise UI from consumer UI.*

### D-18 — Tabular numerals globally
**Why:** *"the single most reliable tell of amateur enterprise UI is misaligned
digits in a column."*

### D-19 — Unbuilt modules are navigable pages that state their scope
~~`components/patterns/module-placeholder.tsx` · copy in `MODULE_PLACEHOLDER_COPY`~~

**Why:** *"a navigable page that states its own scope reads as a roadmap; a
disabled nav item or a grey box reads as broken."* Each cites its spec section,
which turns a gap into a plan during a client walkthrough.

*Superseded 2026-08-06:* every module is built, so there is nothing left to
place-hold. Both the component and the copy table were removed (D-63). The
decision is kept because the reasoning still applies to the next gap.

### D-20 — Format descriptors, not formatter functions, cross the RSC boundary
`components/patterns/animated-number.tsx`

**Why:** functions cannot be serialised across the Server/Client boundary, so
intent is passed as data and resolved on the client.

---

## Performance

### D-21 — Row virtualisation with no dependency
`features/work-manager/hooks/use-virtual-rows.ts`

Spacer rows top and bottom, fixed row height, overscan 8.

**Why:** uniform row heights are the one case where windowing is twenty lines
rather than a library. `ASSUMED_VIEWPORT = 640` matches the container's CSS
`min-height` so the server and first client render produce the same window and
hydration stays clean.

### D-22 — Precompute per-row derived fields once
`WorkCaseRow` carries status group, revenue band, age, days-to-due, overdue
flags, resolution hours and a lower-cased `haystack`.

**Why:** search and filter run on every keystroke; deriving these per pass would
make the queue feel heavy.

### D-23 — Lazy-load the Copilot panel
`next/dynamic`, `ssr: false`, in `case-detail-view.tsx`

**Why:** it is the only part of the page pulling a streaming client and markdown
rendering, and most sessions never open it.

### D-24 — Destructure hook callbacks before depending on them
**Why (found in review):** `useCallback(..., [api])` where `api` is the object a
hook returns rebuilds every render and defeats every `React.memo` beneath it.
This was a real, measurable bug.

### D-25 — `inert`, not `aria-hidden`, for closed overlay panels
**Why (found in review):** the Copilot panel kept ~12 focusable controls in the
tab order while `aria-hidden`. `inert` removes both.

---

## AI / Copilot

### D-26 — Four prompt layers with the cache breakpoint after layer 2
`src/ai/prompts/prompt-builder.ts`

1. System prompt — persona, grounding rules *(frozen)*
2. Business context — lifecycle, weights, SLA bands, verification semantics *(frozen, cached)*
3. Case context — the record
4. User question

**Why:** layers 1–2 contain no interpolation, so they are a byte-identical
prefix across every request in the deployment and are served from cache.
Layers 3–4 vary and sit in the user turn.

**Why business context is its own layer:** the system prompt answers *"who are
you and how do you write"*; the business context answers *"what do these words
mean here"*. Different question, different lifetime, separate file.

### D-27 — Nothing outside the prompt builder assembles a prompt
**Why:** explicit client instruction — *"Do NOT concatenate strings inside
components."* Also the only way to keep the cache prefix stable.

### D-28 — The client sends scalars; the server owns the record
`SessionOverlay` in `src/ai/types.ts`, validated by `parseOverlay` in the route.

The browser may say *"this case is now verified, by this owner, with 4 of 6
actions done"*. It may not say what the case is about. Every field is checked
against the domain enums and the known user set; unknown values are dropped.

**Why:** it closes the real gap (the Copilot could not see unsaved work) without
opening the obvious hole (a tampered request putting words in the model's
context).

### D-29 — NDJSON, not SSE
`app/api/copilot/route.ts` + `copilot-client.ts`

**Why:** the client is a `fetch` reader, not an `EventSource`, and NDJSON keeps
the transport byte-identical between the live and offline paths.

### D-30 — A facade hides which backend answered
`src/ai/services/copilot-service.ts`

**Why:** callers get an async iterable of text chunks and cannot tell whether
Claude or the offline responder produced them. That is exactly what makes the
fallback safe — route, transport contract and panel are identical either way,
so the offline path cannot silently rot.

### D-31 — Errors are a taxonomy with a retryable flag
`classifyError()` in `claude-service.ts`

Seven kinds, each with an HTTP status, a retryable boolean, and a message
written for an operations manager rather than a developer.

**Why:** the distinction that matters to the user is *"try again"* versus *"tell
someone"*. The panel shows "Try again" only when retrying can help.

### D-32 — Sanitisation is honest about its scope
`src/ai/utils/sanitise.ts`

Strips control characters, zero-width codepoints and forged section markers.
Bounds question, history and context length. `boundContext` trims from the
middle and **says so** rather than truncating silently.

**Why:** no string transform defeats prompt injection, and claiming otherwise is
worse than not claiming it. The real defence is structural: server-assembled
context, delimited question, and an explicit system-prompt rule that delimited
content is data.

### D-33 — The offline responder composes from the real case record
`src/ai/services/offline-service.ts` — keyword-routed to nine intents.

**Why:** *"it is the reasoning that is scripted, not the facts."* A demo that
falls back to invented content is worse than no fallback. Streamed at 4 words /
18 ms so it reads as generation rather than a dump.

### D-34 — Prompt catalogue is canonical and shared
`src/ai/prompts/catalogue.ts`, re-exported by
`features/case-detail/services/copilot-prompts.ts`.

**Why:** the panel renders the catalogue, so adding an entry adds it to the UI
and nothing re-types the wording elsewhere.

---

## Process

### D-35 — Modules are frozen on approval
**Why:** the client demo is rehearsed. A screen that changes after sign-off
invalidates the rehearsal. The freeze is what makes it safe to keep building.

### D-36 — Inconsistent seed data is re-expressed, never faked
**Precedent:** "average resolution time" showed 18d against the dashboard's
38.4h MTTR — a genuine inconsistency in the seeds. Rather than fabricate a
delta, the metric became `averageSlaUsagePct`: *"averaging 80% of each case's
own SLA target."* Honest, and a better number anyway.

### D-38 — The Copilot is scoped, not duplicated
`src/ai/types.ts::CopilotScope` · `prompt-builder.ts`

`case` and `portfolio` share the system prompt, the business context, the route,
the NDJSON transport, the panel, the error taxonomy and the offline fallback.
**Only layer 3 differs.**

**Why:** a second Copilot would have been a second set of bugs. Scoping it means
the dashboard Copilot inherited streaming, cancellation, retry, sanitisation and
seven error kinds on the day it was built. It also keeps the cached prefix
shared — asking on the dashboard and then on a case costs one cache write.

**Cost:** the system prompt had to learn a second record tag, which invalidated
the prompt cache once. Worth it; the alternative was ungrounded portfolio answers.

### D-39 — The Copilot UI lives in `components/`, not in a feature
`components/copilot/`

Moved out of `features/case-detail/` when the Dashboard needed it.

**Why:** the Dashboard importing `features/case-detail/components/copilot-panel`
would have been the first feature→feature edge in the codebase — the exact thing
`ARCHITECTURE.md` §1 forbids. Shared UI moves **down**, so the panel, hook,
transport and types went to `components/copilot/` and both features import from
there. No third party owns Copilot state; each screen supplies a `CopilotSubject`.

### D-40 — One `caseHref`, because five places got it wrong
`src/lib/routes.ts`

**Why:** `caseHref` existed in `features/work-manager/utils/routes.ts` and only
Work Manager used it. The Dashboard's activity feed, bottlenecks table, today's
work list and AI summary — plus the global search in the app shell — each built
`/cases/${caseNo}` by hand. **That route does not exist.** Twenty-one links on
the Dashboard 404'd, and global search 404'd from every screen.

The fix was the rule already written down: shared logic moves down. Every case
link in the app now goes through one function that also URL-encodes.

**The lesson worth keeping:** a helper that lives inside one feature is a helper
the other four features will re-implement, badly. Placement is not cosmetic.

### D-41 — A control that names an outcome must produce it
`components/copilot/copilot-panel.tsx::autoAsk`

"Regenerate" on the AI summary opens the Copilot **and asks the board-brief
question immediately**, rather than opening an empty panel.

**Why:** the label had always implied a regenerated summary, and the fixture
comment claimed it "issues a live call" when it had no handler at all. Opening a
blank panel would have been a second, quieter lie.

### D-42 — Analytics KPI deltas compare like with like
`features/analytics/utils/analytics-derive.ts::buildKpis`

Each headline card compares the filtered slice against **the same derivation
over the unfiltered set** — not against `EXECUTION_METRICS`.

**Why:** the first cut compared computed figures against the stored portfolio
metrics and produced nonsense. `EXECUTION_METRICS` reports 38.4h MTTR and 86.4%
adherence for the quarter; the seeded case corpus computes 18d and 100%. Both
are correct — they measure different populations. Subtracting one from the other
yields a confident number that means nothing.

The root cause is worth knowing: `cases.ts` sets
`verifiedAt = openedAt + slaHours * 0.8` for every terminal case, so **every
resolved case meets its SLA by construction** and MTTR is just the mean of
0.8 × target across whichever bands happen to be terminal.

Comparing like with like also reads as zero when nothing is filtered, which is
the correct answer, and removes the dependency on fixture figures that have
already drifted twice.

### D-43 — `FilterMenu` and the CSV primitive moved down
`components/patterns/filter-menu.tsx` · `src/lib/csv.ts`

Analytics needed both, and a feature may not import from another feature.

`FilterMenu` is generic over the field key — `React.memo(Fn) as typeof Fn`
preserves inference, which plain `React.memo` widens. Each module keeps its own
narrow union (`MultiFilterField`, `AnalyticsFilterField`) instead of falling
back to `string`.

`src/lib/csv.ts` owns escaping, section joining and the browser download; column
definitions stay with each feature, because what belongs in a Work Manager
export is not what belongs in an Analytics export.

**Third instance of the same lesson** (after `caseHref` and the Copilot panel):
a helper inside one feature is a helper the next feature re-implements badly.

### D-44 — PDF export via the browser's print pipeline
`features/analytics/utils/export-analytics.ts::exportAnalyticsPdf`

`window.print()` plus `print:` variants, not a PDF library.

**Why:** every renderer worth using is 300kB+ and would have to re-draw the
Recharts output to put it in a document. Every browser's print dialog offers
"Save as PDF", which is what a manager does with a report anyway. No new
dependency, and the charts print as rendered.

**Cost:** page breaks are the browser's choice, not ours.

### D-45 — Actions have their own SLA, separate from the case
`src/domain/action-sla.ts`

An action carries a due date inside the case's resolution window. A case can sit
comfortably within its 240-hour target while the action blocking it is three days
late — surfacing exactly that gap is why the Action Center exists.

"Due soon" is banded by the parent case's priority (critical 8h, high 24h,
medium 48h, low 72h): a critical action three days out is not urgent, one eight
hours out is, because its case only has 24 hours in total. "Due today" is the
calendar day rather than a rolling 24 hours — 23:00 tonight and 09:00 tomorrow
are different conversations even though they are nine hours apart.

### D-46 — Recommendation confidence is scored, not asserted
`src/domain/action-recommendation.ts` + `src/data/fixtures/recommendations.ts`

Same split as priority: the **wording** of a recommendation is reference data
(one template per exception type, with `{supplier}` / `{material}`
substitution), the **confidence** is a deterministic rule over case facts —
recurrence,
escalation, customer tier, supplier corroboration, SLA breach.

**Why:** a recommendation an executive cannot interrogate is one they will
ignore. The panel exposes the drivers on hover, so 94% is defensible line by
line. A model may draft the prose; it never sets the number.

### D-47 — Pending approvals is keyed on the case, not action progress
`features/action-center/utils/action-derive.ts`

First cut defined it as `open && completionPct >= 100`. That is **unsatisfiable
by construction** — action status is derived from completion (D-03), so 100%
makes an action `DONE`. The KPI tile read 0 and its filter scope was permanently
empty.

Now keyed on `caseStatus === "PENDING_VERIFY"`, which is what approval actually
means here: the case is with a reviewer who is never the owner. Reads 11.

**The lesson:** a derived field cannot be used as an independent predicate
against the thing it was derived from.

### D-48 — One module owns every portfolio figure
`src/domain/portfolio-metrics.ts`

Open counts, exposure, breach counts, MTTR, SLA adherence, verification pass
rate, recurrence rate, weekly throughput and per-plant rollups are computed
here and nowhere else. The dashboard, plant health, the AI executive summary,
Execution Analytics and the Copilot all read the same functions.

**Why:** each of them previously computed — or asserted — its own version, and
they disagreed. The summary claimed two unassigned criticals at a plant with
none, plant health put both criticals at the wrong site, the exception-type
block totalled $1,728,000 across 25 cases against a portfolio of $1,531,700
across 19, and a stored 86.4% adherence sat beside a tile counting nine live
breaches.

**Deliberately not derived:** OTIF, inventory days and schedule adherence are
Every Angle measurements over its own window — reading them is correct,
recomputing them would be inventing numbers. Period-over-period deltas need a
prior period the snapshot does not contain, so they stay stored and are
labelled as stored at their definition.

### D-49 — One definition of an SLA breach
`portfolio-metrics.ts::hasBreachedSla`

A resolved case breached if it took longer than its band's target; an open case
has breached once the target passed without resolution.

**Why:** Analytics measured resolved cases only while the dashboard counted live
breaches, so the two reported different adherence for the same plant.
`analytics-derive.ts` now delegates to this function rather than restating it.

`slaBreachedAt` on the stored case remains — it is a *materialised projection*
of this rule, computed in `cases.ts` from the same `SLA_TARGET_HOURS`, so the
twelve call sites reading the field cannot drift from the definition.

### D-50 — A metric drawn from a biased sample is its own wrong number
`src/data/fixtures/cases.ts`

Two seed problems surfaced once the figures were derived rather than asserted.

**Flat resolution factor.** Every terminal case resolved at exactly `0.8 ×
target`, so **every resolved case met its SLA by construction** — adherence
computed to 100% under any definition, because there was nothing to disagree
about. Now derived per case from the case number, spread either side of 1.0.

**Unrepresentative sample.** Every resolved case sat in the LOW or MEDIUM band,
so MTTR was computed entirely from 240- and 720-hour targets and reported ~21
days. Arithmetically correct, and meaningless: no critical or high case had ever
been resolved. Five fast-band resolved cases were added so the average describes
the portfolio rather than its slowest tail.

**A hashing note worth keeping:** the first factor used a rolling `hash * 31 +
char`, which does not avalanche. Case numbers are sequential, so five
consecutive cases produced near-identical hashes, landed on the same factor and
*all five missed their target* — a pattern presented as a spread. Fixed with
FNV-1a plus the murmur3 finalizer.

### D-51 — Connector throughput is derived from the case corpus
`src/data/fixtures/connectors.ts` · `src/data/queries/connectors.ts`

The Every Angle signal connector reports exactly as many raised cases as there
are cases with `detectedBy: "EVERY_ANGLE"` (17); the playbook monitor reports
the `PLAYBOOK_MONITOR` ones (6). Manual cases belong to no connector.

**Why:** this is D-48 applied before the drift could happen rather than after.
A connector screen claiming it raised 34 cases beside a queue holding 29 would
be the same defect in a new place — and the live Copilot would find it, as it
found `REVENUE_IMPACT`. The run generator distributes cases across recent runs
and reconciles any remainder onto the newest successful run, so the total always
equals the corpus.

The ingestion funnel is arithmetically closed for the same reason:
received − deduplicated − rejected = applied, and raised + manual = 29.

### D-52 — Three failure modes, scored separately
`src/domain/connector-health.ts`

Reliability (are runs succeeding), freshness (has it run when it said it would)
and backlog (how much has it failed to deliver) are scored on their own axes,
and **staleness overrides the numeric band**.

**Why:** a feed that has not run for six hours is not "80% healthy" because its
last five runs passed. It has stopped, which is a different problem needing a
different person — so it bands as `STALE` regardless of score. A disabled
connector reports as paused rather than failing, because scoring it against a
cadence it is not trying to meet would bury the real failures.

### D-53 — A replay button that cannot work is worse than none
`features/connector-health/utils/connector-derive.ts`

`DUPLICATE_KEY` and `SCHEMA_MISMATCH` rows render "Not replayable" with the
reason on hover, instead of a Replay button.

**Why:** retrying a duplicate produces the same duplicate; a schema mismatch
needs an upstream contract change. Offering the action and letting it fail
teaches an operator to distrust the queue. Bulk replay skips them for the same
reason and says how many it skipped.

### D-54 — Three shared shells replace nine module copies
`components/patterns/{kpi-tile,data-table,module-toolbar}.tsx`

Analytics, the Action Center and Connector Health had each grown their own KPI
tile, table chrome and filter row — nine implementations of three things,
already drifting on padding and delta handling.

**Why it matters beyond DRY:** accessibility is now correct once rather than
nine times. `DataTable` owns `scope="col"`, `aria-sort`, `aria-rowcount` and a
live result announcement, so every module inherits them. That was the main
argument for extracting rather than tolerating the duplication.

A tile renders as a button when given `onSelect` and as a panel otherwise —
the only branch in it, because a KPI is a filter preset as often as a statistic.

### D-55 — Routing rules are derived, not declared
`src/data/queries/administration.ts`

For each plant and exception type, the default owner is whoever holds most of
that work today.

**Why:** a declared routing table drifts from reality the first time someone
reassigns a case, and D-48 exists because this codebase has been bitten by
exactly that. Deriving it means the table is always true, and it doubles as a
description of how work actually flows.

### D-56 — Configuration preview beats configuration
`src/domain/config-preview.ts`

Changing a priority weight re-scores all 29 cases live and lists which change
band; changing an SLA target lists which cases newly breach.

**Why:** the entire argument for an admin screen here is that the rules are
already isolated and documented as deployment-configurable. A settings page
showing "revenue weight: 35" and nothing else asks an executive to guess.
Rescaling stored factor contributions reproduces `computePriority` without
mutating the module-level constant — a preview must never leave a global changed.

### D-57 — Demo reset is a broadcast, not a button per module
`src/demo/use-demo-reset.ts`

`ExecutionProvider.reset()` already existed, but each module keeps its own
session state, so clearing the shared store left overrides, created rows and
replays behind — a half-restored app presented as a reset.

One signal; each hook opts in with `useResetSignal(clearMine)`.

### D-58 — i18n architecture lands before the strings
`src/i18n/`

Provider, key structure, five catalogues and `useTranslation` are in place while
components still carry English literals.

**Why:** the surface is ~900–1,400 strings today and every module adds 150–250.
Landing the foundation first means migration is incremental and mechanical;
landing it after four more modules would have doubled the retrofit against
screens that are by then frozen. **The scope decision is stated openly in the
config:** the shell is translated, the seeded operational corpus is not —
case titles and root causes are content needing a domain translator, not a
string table.

### D-59 — Tour steps anchor to data attributes, not selectors
`src/tour/tours.ts` · `components/tour/tour-overlay.tsx`

Steps reference `data-tour="dashboard-kpi-band"` rather than a CSS selector.

**Why:** this codebase composes classes from tokens that get refactored, so a
selector-based tour breaks silently on a styling change. A data attribute is a
contract the component opts into, and adding one to a frozen screen is additive.

Steps carry a `route`, and the store navigates before showing them — the
executive tour walks Dashboard → nav, the manager tour crosses into the Action
Center. The spotlight is drawn as four scrim panels around the anchor rather
than a mask, so the highlighted control stays fully interactive underneath.

### D-60 — Completion persists; nothing else does
`src/tour/tour-store.tsx`

Tour completion is the only state written to `localStorage`. Everything else in
the demo is session-scoped by design.

**Why:** onboarding that reappears on every reload is an obstacle, not
onboarding. It reads after hydration so the server and first client render
agree, and it degrades silently in private browsing rather than throwing.

*Amended 2026-08-06:* this decision originally also covered
`src/a11y/use-first-use.ts`, which backed the first-use hints. Neither the hook
nor `FirstUseHint` was ever rendered — the guided tour and the per-screen
documentation panels took that job — so both were removed in the stabilization
pass (D-63).

### D-61 — One PageHeader prop carries the documentation panel
`components/patterns/screen-doc-button.tsx`

`<PageHeader docKey="analytics" />` renders the ⓘ control. Content lives in
`src/help/content.ts` beside the Help Center articles.

**Why:** every module already uses `PageHeader`, so this reached seven screens
as a one-line change each. Sharing the content source with the Help Center is
what lets the documentation search index screen purpose and KPI definitions
without maintaining a second index.

### D-62 — Lint is a gate, not a report
`eslint.config.mjs`

Four rules are raised to `error` above what `eslint-config-next` sets:
`@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`,
`@typescript-eslint/no-explicit-any`, and `no-console` (allowing `error` and
`warn`).

One non-obvious constraint: **`eslint.config.mjs` must not ignore itself.**
`next build` detects the Next ESLint plugin by resolving the config that applies
to the config file, and an ignored file resolves to no config at all — so a
`"*.config.mjs"` ignore pattern makes every build print "the Next.js plugin was
not detected" while the plugin is in fact loaded and running.

**Why:** a warning is a thing everyone agrees to fix later. `exhaustive-deps` in
particular is a warning upstream, and stale-closure bugs are the class this
codebase has already hit twice (D-24). Stylistic rules are left off — a lint run
that argues about formatting stops being read.

### D-63 — Dead code is deleted, not commented out
`components/patterns/module-placeholder.tsx` · `components/patterns/first-use-hint.tsx`
· `src/a11y/use-announcer.ts` · `src/a11y/use-first-use.ts` · `projectCases`
· `projectNavBadges` · `PLAYBOOK_STEPS_BY_TYPE` · `LOCALES_NEEDING_CJK_FONT`
· `TourLauncher` · `MODULE_PLACEHOLDER_COPY`

Ten unreferenced exports and four whole files were removed during stabilization.

**Why:** each of these was written for a shape the product moved past — the
placeholder page before every module existed, the announcer before `DataTable`
owned its own live region, `projectCases` before the projection tier settled on
per-figure functions. Keeping them costs nothing to run and everything to read:
the next session cannot tell a helper that is unused from one that is not used
*yet*, so it either re-implements it badly or maintains it forever.

The removal itself found a defect worth recording: deleting `projectCases` with
a positional script also removed `projectActivity`, which typecheck caught
immediately. Deletion needs the compiler as its safety net, not care.

### D-64 — The demo reset is only real if modules listen to it
`features/action-center/hooks/use-action-center.ts` ·
`features/connector-health/hooks/use-connector-health.ts`

`useResetSignal` existed (D-57) but no module subscribed to it, so Demo Reset
cleared the shared execution store and left every module's local filters,
selections and overrides in place.

**Why:** this is the failure D-57 was written to prevent, and it survived because
a broadcast with no subscribers looks exactly like a working one from the button
end. A reset that restores half the product is worse than no reset button, since
the presenter finds out mid-demo. Every module hook that holds session state now
subscribes; the check for a new module is whether its `useState` calls appear in
its reset callback.

### D-65 — Same role, same name; different shape, different name
`features/analytics/utils/analytics-derive.ts`

`isFiltered`, `buildFacets`, `computeKpis` and `buildFilterChips` each exist in
two or three feature folders and keep their shared names. `weeklyThroughput` in
Analytics was renamed to `weeklyThroughputSeries`.

**Why:** the first four are the same *role* over a module's own filter type —
the repeated name is what makes a new module's utils file predictable, and
merging them would mean one generic signature per filter shape, which is worse
than four short ones. `weeklyThroughput` was different: the domain function
returns one `{opened, closed}` pair for the trailing week, the Analytics one
returns a per-week series over an arbitrary window. Two functions with one name
and different meanings is how the fixture drift of D-48 starts.

### D-66 — The product is light-theme only, and says so
`app/globals.css`

There is no `prefers-color-scheme` rule, no `dark:` variant anywhere, and no
theme toggle. `prefers-reduced-motion` is honoured.

**Why:** the semantic token layer would carry a dark palette without touching a
component, so this is a deliberate scope decision rather than an oversight — but
it is recorded here because "verify dark/light theme" has an honest answer, and
that answer is that only one theme exists. Adding a second palette is a Phase-2
item with a real cost: every chart colour, every status tone and every
`bg-surface-inverse` overlay needs a second value chosen and checked for
contrast, and half-doing it is how a screen ends up unreadable in one mode.

### D-67 — Three icon files, one geometry
`app/icon.svg` · `app/favicon.ico` · `app/apple-icon.png`

The portal had no icon at all, so every tab showed the browser's blank-page
glyph. All three are the `BrandMark` geometry from
`components/shell/brand-mark.tsx`, unchanged.

**Why three:** `icon.svg` is the real answer — one file, sharp at every size,
and what modern browsers use. `favicon.ico` exists because browsers request
`/favicon.ico` unprompted and a 404 on every page load is noise in the server
log during a demo; it carries 16, 32 and 48 px frames as PNG payloads, which is
what every browser since IE11 reads. `apple-icon.png` is 180 px and **full
bleed** — iOS applies its own squircle mask, and a transparent corner under that
mask renders black, so the rounded frame the other two use would show as four
dark notches on a home screen.

**Why the accent is a literal `#1d4ed8`:** a file-convention icon is served as a
static asset and never sees `globals.css`, so it cannot read `--color-accent`.
This is the one sanctioned exception to the no-raw-hex rule, and it is a
single-definition hazard: if the accent token changes, these change with it.

The two rasters were generated once from the same SVG with `sharp` (already
present as a Next transitive dependency). Nothing at runtime depends on it, and
nothing regenerates them on build — they are committed artefacts. To reproduce:
render `icon.svg` at 16/32/48 for the `.ico`, and the full-bleed variant at 180
for the touch icon.

### D-68 — Every route gets a loading boundary, and it mirrors its own module
`app/(app)/{admin,help,playbooks,reports,system/audit}/loading.tsx`

Five routes had an error boundary but no loading boundary, so navigating to them
held the previous screen until the server render finished. Each new skeleton is
shaped to its own module's layout — header, toolbar, KPI row, table or cards.

**Why shaped rather than generic:** a spinner tells you to wait; a skeleton tells
you what is coming and does not move the page when it arrives. A generic one
would reintroduce the layout shift a skeleton exists to prevent. The rule is now
symmetric: `loading.tsx` and `error.tsx` for every route that fetches.

### D-69 — A tour anchor with no element is a broken tour step
`src/tour/tours.ts` · `data-tour` attributes

Four of the fourteen guided-tour steps pointed at anchors that did not exist —
`dashboard-ai-summary`, `work-toolbar`, `action-queue`, `admin-weights`. The
overlay degrades quietly when an anchor is missing (`setRect(null)`), so the
card floated in the corner highlighting nothing and no error was raised.

**Why it survived:** graceful degradation hid it. Both the tour definition and
the elements changed over the final sprint, and nothing connects them at compile
time — `data-tour` is a string on one side and a string on the other. The check
is now part of the audit script rather than a type: making it a type would mean
every screen importing the tour module, which is worse.

### D-70 — A control that does nothing is worse than no control
`features/dashboard/components/live-dashboard.tsx` → `DashboardExportButton` ·
`features/connector-health/utils/export-connectors.ts`

The Executive Dashboard shipped an **Export** button with no handler, on the
demo's opening screen. Connector Health had no export at all, against a module
contract every other module meets.

**Why a wrapper for the dashboard:** the page is a server component, and the
export must reflect what is on screen — which means reading the execution store,
because the figures shown are session-projected. Exporting the server's numbers
while the screen shows adjusted ones is how an export stops being trusted. So it
is a thin client wrapper beside the other five, per the frozen-module pattern —
not an edit to the page's structure.

This is the second dead primary button found on the dashboard (the first was
"Ask Copilot", Phase 5). Both looked complete in review because a button with no
`onClick` renders identically to one with.

### D-71 — The 404-on-unknown-case is the price of streaming, and it is measured
`app/(app)/work/loading.tsx` · `app/(app)/work/[caseId]/loading.tsx`

An unknown case number renders the correct "Case not found" screen but returns
**HTTP 200**. A layout-level existence check was written to fix it and **did not
work**; removing both `loading.tsx` files does — verified by building without
them, at which point `/work/does-not-exist` returns 404 correctly.

**Why it stays:** the boundary that commits the status is the *parent*
`/work/loading.tsx`, not the case segment's own, so the fix costs Work Manager
and Case Detail their skeletons — the two heaviest screens in the product, on
the main demo path. Wrong status for crawlers and uptime monitors; invisible to
a user. The trade is recorded rather than taken, and the speculative fix was
deleted rather than left in as reassurance.

It has a real cost worth knowing: because the case route answers 200 for
anything, a smoke test that curls a *made-up* case number passes. One did — the
QA checklist named `QO-2026-004112`, which does not exist. The checklist now
names a real case, and route checks on that segment must assert on content, not
status.

### D-72 — Flow is derived from the case corpus, never stored
`src/domain/flow-balance.ts`

Detected, resolved, the balance between them, the burn-down and the forecast are
all computed from `CASES` on demand. There is no seeded flow series.

**Why:** a stored series would be a second description of the same events, and
the moment a case is verified in-session the two would disagree — the exact
defect D-48 was written after. Deriving costs a pass over 29 cases; storing
costs a reconciliation problem forever.

The module takes `now` as a parameter and imports nothing from `src/lib`, which
keeps it inside the framework-free rule. Money formatting is passed in as a
`MoneyFormatter` rather than imported, so `src/lib/format` stays the single
definition and the narrative quotes `$1.0M` like every other figure on screen
instead of inventing its own notation.

### D-73 — Status decides whether a case is resolved; the timestamp decides when
`src/domain/flow-balance.ts` → `resolutionMoment`

A first implementation read `verifiedAt ?? closedAt` as the authority on whether
a case was still open. It reported **21 open against the 19** the dashboard,
Analytics and the Copilot all quote.

**Why it was wrong:** `buildCase` generates `verifiedAt = openedAt + slaHours ×
resolutionFactor`, and a LOW-band case carries a 720-hour target — so a case
verified today can hold a timestamp thirty days in the future. Two cases in the
corpus do. A timestamp-only rule reads those as unresolved.

`isOpenStatus` is now the authority on membership — the same predicate
`portfolio-metrics` uses — and the timestamp is clamped to `now` purely to place
the resolution in a bucket. That buys an exact invariant: **`ledger.closing ===
portfolioCounts.openCases`**, verified on the build at 2 + 27 − 10 = 19.

The general rule this is an instance of: when two fields can answer the same
question and the corpus lets them disagree, name which one is authoritative
rather than picking the convenient one.

### D-74 — A forecast states its basis or it is a guess
`src/domain/flow-balance.ts` → `forecastFlow`

The projection extrapolates the mean net rate per bucket and carries
`basisBuckets` and `volatilityPct` with it. The chart draws measurement solid
and extrapolation dashed, with a marker at the boundary, and the caption names
the number of periods behind the rate.

**Why:** an executive asked to act on a clear date will ask where it came from,
and a dashboard that cannot answer loses the next three claims as well.
`direction` is also banded rather than taken from the sign: net movement inside
±2% of the open balance is noise, and calling noise a trend is how a forecast
stops being read.

Deliberately the simplest defensible extrapolation. A regression or a seasonal
model would be more impressive and no more honest on 29 cases.

### D-75 — The executive narrative is composed, and says so
`src/domain/flow-balance.ts` → `buildExecutiveNarrative`

The briefing card is written from the ledger by rule, not by a model, and its
footer states that plainly beside a Copilot entry point.

**Why:** every number in the sentence is one of the figures on the screen
beside it, so a director can quote the sentence in a review without checking it
first — which is the entire value of putting it there. The live Copilot handles
what a rule cannot anticipate; this is the standing answer to the one question
every executive opens with. Labelling it "AI" while a rule wrote it would be the
kind of small dishonesty that costs the whole demo its credibility when someone
asks how it works.

### D-76 — The flow region reads the whole corpus, not the page filters
`features/analytics/hooks/use-flow.ts`

Execution Analytics filters by plant, priority, category and date range. The flow
region ignores all four and carries its own horizon.

**Why:** the opening balance is the set of cases detected before the window and
not yet resolved. Applying the page's date range on top would drop exactly those
cases, and the ledger identity would silently stop holding. Two controls that
look like they compose but do not are worse than two that obviously do not.

Both screens default to the four-week horizon. The seeded corpus spans 38 days,
so a 13-week window opens before the earliest case and the opening balance is
zero — arithmetically right and analytically vacuous, since "growing" is then
true by construction. The ledger carries `precedesCorpus` and the strip says so
rather than letting the reader draw a conclusion from an artefact.

### D-77 — The frozen dashboard gains a band, not a redesign
`features/dashboard/components/live-dashboard.tsx` → `LiveFlowVerdict`

The Executive Dashboard gets one row: the flow verdict, the balance movement and
a link into the full region. Everything else — charts, drill-down, band mixture,
horizon and unit controls — lives in Execution Analytics.

**Why:** the freeze permits adding where state comes from, not restructuring the
screen (D-13). A thin client wrapper beside the existing five satisfies both. It
is pinned to the same horizon Analytics opens at, because a director who reads
one rate here and a different one after clicking through has been given two
figures for one question — and both screens now quote 4.3 cases per week.

### D-78 — A hint system is only real when a screen subscribes to it
`src/help/tips.ts` · `components/patterns/in-app-tip.tsx`

Three surfaces — `TermHint` (hover help on a load-bearing word), `FirstUseTip`
(one callout per screen, dismissed permanently), `ReleaseAnnouncement`
(versioned). Wired into six screens and the dashboard metrics strip in the same
change that created them.

**Why the wiring is part of the decision:** the previous attempt at this
(`FirstUseHint`) was written, never mounted, and deleted as dead code in D-63.
Building the component was never the hard part. `resetAllTips` is called from
the demo reset for the same reason D-64 exists — a presenter running the
walkthrough twice needs the first-use tips back, and the alternative is asking
them to clear site data mid-demo.

`TermHint` is a popover, not a tooltip: the content is a paragraph, and tooltips
are unreachable by touch and easy to miss by keyboard.

### D-79 — High contrast is a token override, not a component concern
`app/globals.css`

`prefers-contrast: more` restates a dozen custom properties. No component knows
the mode exists.

**Why this works here:** every colour in the product is read through a semantic
token (ARCHITECTURE §7), so there is exactly one place to change and nothing can
be missed. Three things move and only three — borders darken, because structure
in this design is carried by a 1px line rather than a shadow; tertiary text
stops being tertiary, because #8794a5 on white is 3.5:1 and the product uses it
on 11px metadata; the focus ring thickens without changing hue, so the
one-ring-one-colour rule still holds.

Subtle fills are left alone deliberately: pushing them toward the palette ends
would recolour every status badge, and a status colour that means something
different in one mode is worse than a slightly soft fill.

### D-80 — A language selector that changes nothing is a dead control
`src/i18n/messages/*.json` · `src/i18n/load.ts` · `components/shell/side-nav.tsx`

The i18n architecture shipped complete and inert: provider mounted, selector
wired, five catalogues — four of which were **verbatim copies of English**. The
control moved a check mark and nothing else.

Three defects, each of which alone would have been enough to break it:

1. The four translations did not exist. All 35 keys are now genuinely
   translated into Spanish, German, French and Japanese.
2. The catalogue key `nav.myWork` never matched the nav key `my-work`, so that
   item could not have resolved even once translated.
3. The layout passed `initialLocale` but not `initialMessages`, so a reload
   with a Japanese cookie rendered English until something called `setLocale`.
   Catalogues now load on the server.

**Why the navigation first:** it is the most visible surface in the product and
its keys already existed. `t()` falls back to the config label, so the catalogue
can be filled a module at a time rather than in one sweep — which is what makes
the remaining ~900–1,400 strings a schedule rather than a blocker.

### D-81 — Age is not breach, and the product now says both
`src/domain/segment-performance.ts`

*Days in trouble* is banded separately from SLA state.

**Why they are not the same measure:** a low-band case can sit for three weeks
inside its 720-hour target while a critical one is late in a day. A portfolio
can be clean on breach and rotten on age, and reporting only the first is how
avoided work stays invisible.

Customer performance and escalation depth land in the same module because both
are derivable from fields the case already carries — `customerCode`,
`customerTier`, `escalationLevel` — so neither needed a schema change. Customer
concentration is the finding rather than the customer list: the same exposure
across forty accounts is a different position from the same exposure across
three.

**One honest limit, stated in the UI rather than hidden:** the corpus records
that a case *is* escalated but not *when*, so time-in-escalation is measured
from the SLA breach where there is one and from detection otherwise. Breaching
is what escalates a case (`src/domain/sla.ts`), so it is the best available
proxy — and it is a floor, not a measurement. A case raised by hand before it
breached has been escalated for longer than the panel shows.

### D-82 — Permissions are derived from the rules, not declared beside them
`src/domain/platform-settings.ts`

The permission matrix is built from the capabilities the code already enforces —
`ASSIGNABLE_ROLES`, `NAVIGATION[].roles`, `reviewerFor` — and every row names the
file that enforces it.

**Why:** a hand-written permission table is a second description of rules that
already exist, and the moment the two disagree the table is the one people
believe. An administrator's real question is *why can this role not verify*,
which a grid of ticks cannot answer and a rationale can. Same argument as D-55,
one layer up.

### D-83 — Departments hang off the person, not the case
`src/domain/platform-settings.ts` → `DEPARTMENTS`, `departmentForJobTitle`

A case belongs to a person; that person belongs to a team. Department load is
derived by joining through the owner, and the team is inferred from the job
title the seeded organisation already states.

**Why not a field on the case:** it would need authoring across 29 cases under
the no-invented-numbers rule, and it would go stale the moment a case was
reassigned. The join means a reassignment moves work between teams with nothing
re-tagged.

**The honest limit, stated in the UI:** an unowned case has no department. It is
counted in the portfolio and absent from the split — which is the finding, not a
gap in the data, and the panel says so rather than bucketing it as "unknown".

### D-84 — A settings screen must not describe a system the code is not running
`src/domain/platform-settings.ts` → `buildSettingsGroups`

The AI, workflow and notification groups read their values from the modules that
own them — `src/ai/config.ts`, the domain rules, the live `resolveMode()` — and
each row marked *Phase 2* is one the product displays but does not yet enforce.

**Why the enforced / not-enforced distinction sits on the row:** the failure mode
of every settings page is describing intent as though it were behaviour. Marking
the five notification rules that have no transport yet is the difference between
a configuration preview (D-56) and a lie with a toggle on it.

### D-85 — A hidden anchor is not a found anchor
`components/tour/tour-overlay.tsx`

Six of the tour's steps point at navigation items, and the sidebar is
`hidden lg:block`. Below 1024px those elements are in the DOM with a zero-size
rect, and the old code took that at face value — drawing a spotlight of size
zero at the top-left corner, which reads as a full-screen scrim with a dot in
it. **Any laptop under 1024px broke on 40% of the steps.**

`isMeasurable` now checks `offsetParent` (which catches `display: none` on the
element or any ancestor) and a non-trivial size. An unresolvable anchor centres
the card and says why, because the step still has something to say — the card is
the content and the spotlight is the garnish.

**Why it survived so long:** it is invisible at desktop width, which is where
the tour was built and demoed. The class of bug worth remembering is a
measurement that returns a *plausible* value rather than failing.

### D-86 — Wait for an anchor; do not guess at it
`components/tour/tour-overlay.tsx`

Anchor lookup polls on animation frames until a 1.8-second deadline, replacing
three fixed retries at 120/320/640ms.

**Why:** a step can live on another route, and the old schedule lost the race
whenever the destination was heavy — Analytics is the largest route in the
product. A deadline plus frame polling resolves as soon as the element exists
rather than on a cadence nobody can predict, and it reports a `waiting` state in
the meantime so the card names the route it is opening instead of sitting blank.

The tour also gained the focus trap and body-scroll lock every other overlay in
the product already had. It was declared `role="dialog" aria-modal="true"` while
letting Tab walk into the page behind the scrim.

### D-87 — A tour step earns its place by saying what a label cannot
`src/tour/tours.ts`

Expanded from 15 steps to **33** across four role-based tours — executive 8,
manager 9, operator 8, administrator 8 — covering the modules built after the
tour was first written: the flow region, the knowledge layer, permissions,
departments, platform settings and the ingestion funnel.

**The writing rule:** a step that describes what a control is *called* teaches
nothing, because the label already says that. Each body says what the thing is
*for*, and where there is one, the trap it exists to avoid. `tip` carries the
line worth quoting in a demo; `whenHidden` explains a step whose anchor is
off-screen at the current width.

Progress is a bar with a count rather than dots alone — twelve dots read as
decoration, a bar reads as progress.

### D-37 — `.claude/` is the project memory
Established 2026-08-06. `DEVELOPMENT_STATUS.md`, `NEXT_STEPS.md` and this file
are updated after every completed module, before the session ends.
