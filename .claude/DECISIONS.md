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
`components/patterns/module-placeholder.tsx` · copy in `MODULE_PLACEHOLDER_COPY`

**Why:** *"a navigable page that states its own scope reads as a roadmap; a
disabled nav item or a grey box reads as broken."* Each cites its spec section,
which turns a gap into a plan during a client walkthrough.

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

### D-37 — `.claude/` is the project memory
Established 2026-08-06. `DEVELOPMENT_STATUS.md`, `NEXT_STEPS.md` and this file
are updated after every completed module, before the session ends.
