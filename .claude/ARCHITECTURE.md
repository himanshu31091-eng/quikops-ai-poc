# ARCHITECTURE

> Inferred from the code as it stands. Every path below exists.
> Layer boundaries here are enforced by convention, not by tooling — respect them.

---

## 1. Project Navigation Index

Where everything lives. Start here when you know *what* you need to change but
not *where* it is.

### Vertical modules — one screen each

| Module | Folder | Route |
|---|---|---|
| Dashboard | `features/dashboard` | `/dashboard` |
| Work Manager | `features/work-manager` | `/work` |
| Case Detail | `features/case-detail` | `/work/[caseId]` |
| My Work | `features/my-work` | `/my-work` |

Every module folder uses the same five subfolders — `components/ hooks/
services/ utils/ types/` — so the same question is answered in the same place in
every module.

### Horizontal layers — serve all modules

| Layer | Folder(s) |
|---|---|
| Business Rules | `src/domain` |
| Workflow Engine | `src/workflow` |
| AI | `src/ai` |
| Data | `src/data` |
| Configuration | `src/config` |
| Authentication & Utilities | `src/auth` · `src/lib` |
| Application Routes | `app` · `app/api` |
| Design System | `app/globals.css` · `components/ui` · `components/patterns` · `components/shell` · `components/charts` |

**Note the Design System spans two places.** `app/globals.css` holds *every*
token — no colour, size, radius or shadow value exists anywhere else in the
repo. `components/` is the kit that consumes them. Treating `components/` alone
as "the design system" is how a stray hex gets invented in a component.

### Vertical vs horizontal

**A vertical module owns a screen.** It knows what a Work Manager row looks
like, which filters exist, and what happens when you click a case. It is
allowed to be opinionated and specific, because only one screen depends on it.

**A horizontal layer owns a concept.** `src/domain` knows how priority is
scored; it has no idea a Work Manager exists. `src/workflow` knows a case was
verified; it does not know which screen verified it. Layers must stay ignorant
of their callers — that ignorance is what lets four modules share them without
coupling to each other.

The practical test: *if two screens would need this, it belongs in a layer. If
only one ever will, it belongs in the module.*

### The dependency rule

```
app  →  features  →  components  →  src
```

One direction only. Nothing ever points back up the chain.

- **`app`** reads data and hands it to a module root. Thin by design.
- **`features`** may import from `components` and `src`.
- **`components`** may import from `src`. Never from `features`.
- **`src`** imports from nothing above it. `src/domain` imports no framework
  at all — no React, no Next, no Prisma.

**Features must never import from other features.** There is no
`features/case-detail → features/work-manager` edge in this repo and there must
never be one. The moment one appears, two screens are welded together and
neither can be changed alone.

**Shared logic always moves downward into `src`.** When two features need the
same thing, it does not get imported sideways — it moves down a layer. Both
precedents are already in the tree:

- Three modules needed the same case→owner→plant join → it became
  `src/data/queries/case-mapper.ts`
- Work Manager and Case Detail both needed an owner picker → it moved to
  `components/patterns/assign-menu.tsx`

Two further constraints that follow from the same rule: `src/data/queries` is
the **only** place that reads `src/data/fixtures`, and `src/domain` is the only
place business rules are written.

### Folder tree

```
app/                    Routing, server components, the API route. Thin.
  (app)/                Authenticated shell — every real screen
  (auth)/login/         Persona chooser, no shell
  api/copilot/          The only route handler
  globals.css           EVERY design token. Nothing else declares colour.

features/               One folder per module. The application logic.
  dashboard/            12 components
  work-manager/         14 components · 2 hooks · 8 utils · types
  case-detail/          14 components · 2 hooks · 2 services · 4 utils · types
  my-work/              1 component
  <module>/
    components/         Presentational + composition
    hooks/              State ownership
    services/           Transport
    utils/              Pure helpers
    types/              The module's own contracts

components/             Cross-module UI. No business logic.
  ui/                   Radix wrappers — button, dialog, dropdown, tooltip (8)
  patterns/             The assembly kit (17)
  shell/                App frame: side nav, top bar, search, tray, switcher (8)
  charts/               Recharts primitives (1)

src/                    Everything that is not React.
  domain/               Framework-free business rules. NO React/Next imports.
                        priority · sla · case-status · case-health · types
  data/fixtures/        Seeded business data (5)
  data/queries/         Data-access layer — the swap point for a real DB (5)
  workflow/             Cross-module execution state (3)
  ai/                   The Copilot: config, types, prompts, services, utils (11)
  auth/                 Session (cookie persona)
  config/               App config, navigation, all label/token metadata
  lib/                  cn · format · constants (incl. DEMO_NOW)
```

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js **15.5.22**, App Router |
| UI | React **19.2**, Server Components by default |
| Language | TypeScript **6.0.3**, strict |
| Styling | Tailwind CSS **v4** (`@theme`, no `tailwind.config.js`) |
| Primitives | Radix UI (avatar, dialog, dropdown-menu, popover, separator, tooltip) |
| Charts | Recharts 3 |
| Icons | lucide-react, behind one `<Icon name="…">` wrapper |
| Fonts | Inter Variable, JetBrains Mono Variable (self-hosted via `@fontsource-variable`) |
| AI | `@anthropic-ai/sdk` **0.115.0**, model `claude-opus-5` |
| Persistence | **None.** Typed fixtures behind an async query layer. |

`tsconfig.json` strictness worth knowing before you write code:
`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes:
false`. Path alias `@/*` → repo root, declared **three times** on purpose
(tsconfig `paths`, `turbopack.resolveAlias`, webpack alias) so it resolves
identically under `tsc`, Turbopack and webpack.

---

## 3. The data-access seam

This is the single most important architectural decision in the repo.

Every function in `src/data/queries/*` is `async` and returns a **finished view
model**. No component ever touches a fixture.

```
src/data/queries/
  dashboard.ts      getHeadlineKpis, getExecutiveSummary, getCriticalCases,
                    getPlantHealth, getTodaysActions, getOtifTrend,
                    getActivityFeed, getPriorityDistribution, getRevenueImpact,
                    getInventoryHealth, getExecutionMetrics, getCaseBaseline,
                    getNavBadgeCounts
  work.ts           getWorkManagerData      → WorkManagerData
  case-detail.ts    getCaseDetail(caseNo)   → CaseDetailModel | null
  my-work.ts        getMyWorkData(userId)   → MyWorkData
  case-mapper.ts    toCaseListItem, assignableUsers   (shared join helpers)
```

To connect a real database: replace each function *body* with a query returning
the same shape. **No component changes.** That property is why `case-mapper.ts`
exists — the case→owner→plant join and the assignable-roles rule each have
exactly one definition.

Two deliberate non-behaviours:

- Queries **do not** pre-filter or pre-aggregate. `getWorkManagerData` returns
  the whole case array; the module filters and aggregates client-side so a
  filter change costs one memoised pass rather than a round trip — and so the
  KPI header, table, board and side panel can never disagree, because they read
  the same array.
- `getMyWorkData` returns *every* case, not just the user's. The page filters
  on the client, because a case reassigned during the session has to be able to
  leave the list and one assigned to you has to be able to join it.

---

## 4. Server / client split

Pages are **server components**. They read data, read the URL, and hand both to
a client module root.

| Route | Server does | Client module |
|---|---|---|
| `/dashboard` | 13 parallel queries | Thin `Live*` wrappers only |
| `/work` | `getWorkManagerData` + `parseWorkParams` | `WorkManagerView` |
| `/work/[caseId]` | `getCaseDetail` (one pass, whole record) | `CaseDetailView` |
| `/my-work` | `getMyWorkData(user.id)` | `MyWorkView` |

The case page assembles the **entire** record server-side in one call — no
waterfall of per-section fetches. Opening a case costs one round trip.

Each route group has `loading.tsx`, `error.tsx`; `/work/[caseId]` adds
`not-found.tsx`. All error boundaries render the shared
`components/patterns/route-error.tsx`.

**Dynamic import:** the Copilot panel is the only part of the case page that
pulls a streaming client and markdown rendering, and most sessions never open
it — so it is `next/dynamic` with `ssr: false`, mounted on first use.

---

## 5. State architecture

Three tiers, deliberately separated.

### Tier 1 — Server data (immutable)
The `CaseDetailModel` / `WorkManagerData` handed down as props. Never mutated.

### Tier 2 — Per-module session state (rich, local)
One hook owns everything mutable in a module:

- `features/work-manager/hooks/use-work-manager.ts` — filters, sort, view,
  selection, overrides, notices. Everything derived (rows, KPIs, quick stats,
  chips, board columns) is memoised from the same two inputs.
- `features/case-detail/hooks/use-case-detail.ts` — a `useReducer` over
  `CaseSessionState`: status, owner, reviewer, due date, priority, actions,
  evidence, comments, verification, timeline, audit.

### Tier 3 — Cross-module outcomes (thin, shared)
`src/workflow/` — a React context store mounted on the **`(app)` layout**, so it
survives navigation between the queue, a case and the dashboard.

```
workflow/types.ts             CaseExecutionOverride, WorkflowEvent, ExecutionState
workflow/execution-store.tsx  ExecutionProvider, useExecutionStore
                              → recordOutcome, addCreatedCase, reset, isDirty
workflow/projections.ts       pure: applyExecutionOverride, projectCaseFacts,
                              revenueMovement, projectKpis, projectRevenueImpact,
                              projectExecutionMetrics, projectActivity
```

**Why split rather than one global store:** a single store holding everything
would make every keystroke on a case a global update; a per-page store would
make closing a case invisible to the dashboard. Tier 3 holds only the part of an
outcome another screen needs — *a case moved, an owner changed, revenue was
recovered*.

Writers call `recordOutcome`. **Readers never touch raw state** — they go
through the projections, so every screen derives its numbers the same way.

### The empty-store invariant

Every projection returns its input — by reference where possible — when nothing
has changed. `projectCaseFacts(cases, EMPTY) === cases`.

This is what lets the dashboard stay a server component with a thin reactive
shell (`features/dashboard/components/live-dashboard.tsx`) over it: first paint
is byte-identical to the server response, so there is no hydration mismatch and
no flash.

---

## 6. The Copilot (`src/ai/`)

```
src/ai/
  config.ts               model, effort, token/timeout/input budgets
  types.ts                CopilotMode, SessionOverlay, CopilotFailure,
                          CopilotServiceError
  utils/sanitise.ts       sanitiseQuestion, sanitiseHistory, boundContext
  prompts/
    system-prompt.ts      Layer 1 — persona + grounding rules   [FROZEN]
    business-context.ts   Layer 2 — domain rules                [FROZEN]
    case-context.ts       Layer 3 — buildCaseContext(detail, overlay)
    catalogue.ts          the 9 supported prompts
    prompt-builder.ts     buildPrompt() — the ONLY prompt assembler
  services/
    claude-service.ts     streamFromClaude + classifyError
    offline-service.ts    offlineAnswer, 9 keyword-routed intents
    copilot-service.ts    the facade: resolveMode, copilotModel,
                          streamCopilotAnswer
```

**Four prompt layers, cached at the boundary.** Layers 1–2 never interpolate
anything, so they form a byte-identical prefix; the `cache_control:
{type:"ephemeral"}` breakpoint sits after layer 2. Layers 3–4 (this case, this
question) go in the user turn, wrapped in `<case_record>` and `<question>`.

**No component builds a prompt string.** `buildPrompt()` is the only assembler.

**The facade hides the backend.** `streamCopilotAnswer` yields text chunks and
callers cannot tell whether Claude or the offline responder produced them. That
is what makes the fallback safe — route, transport contract and panel are
identical either way.

### Request path

```
copilot-panel.tsx
  → use-copilot.ts          (messages, streaming, abort, retry)
  → copilot-client.ts       POST /api/copilot, NDJSON reader
  → app/api/copilot/route.ts
        validate → sanitise → getCaseDetail(caseNo) → resolveMode()
      → src/ai/services/copilot-service.ts
          live    → claude-service → Anthropic SDK (streaming)
          offline → offline-service → chunked at 4 words / 18ms
```

**Transport is NDJSON, not SSE.** The client is a `fetch` reader, not an
`EventSource`, and NDJSON keeps the bytes identical between live and offline.
Event types: `meta` → `delta`* → `done` | `error`. Mode is also on the
`x-copilot-mode` response header.

### Security posture

- `ANTHROPIC_API_KEY` is read only inside the route handler process. It is not
  `NEXT_PUBLIC_`-prefixed and never reaches the browser.
- The browser sends **a case number, a question, and a closed set of validated
  scalars**. The case record is loaded server-side from the data layer, so a
  tampered request cannot put words in the model's context.
- `SessionOverlay` is the only case data a client may contribute — status,
  owner, reviewer, priority, action counts, evidence count, verification
  decision. Every field is checked against the domain enums and the known user
  set in `parseOverlay`; unknown values are dropped, not rejected.
  A client can say *"this case is now verified"*; it cannot say what the case is about.
- `sanitise.ts` strips control characters, zero-width codepoints and forged
  section markers. It does **not** claim to defeat prompt injection — the real
  defence is structural (server-assembled context, delimited question, an
  explicit system-prompt rule that delimited content is data).
- Bounds: question 2,000 chars, history 12 turns / 6,000 chars per turn,
  rendered context 60,000 chars (trimmed from the middle, and it says so).

### Failure taxonomy

`classifyError()` maps every SDK error to a `CopilotFailure` with a **retryable**
flag and an HTTP status, written for an operations manager:

| Kind | Source | Status | Retryable |
|---|---|---|---|
| `timeout` | `APIConnectionTimeoutError` | 504 | yes |
| `rate_limit` | `RateLimitError` | 429 | yes |
| `invalid_key` | `AuthenticationError`, `PermissionDeniedError` | 502 | **no** |
| `network` | `APIConnectionError` | 503 | yes |
| `empty_response` | zero chars produced | 502 | yes |
| `refused` | `stop_reason === "refusal"` | 200 | **no** |
| `unknown` | any other `APIError` | 502 | yes |

The panel offers "Try again" only when retrying can actually help.

---

## 7. Design system

`app/globals.css` is the **single source of truth**. No colour, size, radius or
shadow value appears anywhere else in the repo.

- Semantic tokens only: `bg-surface`, `text-content-secondary`, `border-line`,
  `bg-critical-subtle`, `bg-status-verify`, … Raw palette values never leave
  this file.
- Type scale is small and deliberate: body is **13px** (`--text-sm`), page
  titles 20px, KPI values 24px.
- **Two elevation levels only** (`raised`, `overlay`). Structure is carried by a
  1px border, not a shadow.
- Tabular numerals globally — *"the single most reliable tell of amateur
  enterprise UI is misaligned digits in a column."*
- One focus ring, one accent colour, used only for action and focus.
- **Exactly five animations**: `.anim-fade` (150ms), `.anim-settle` (180ms),
  `.anim-panel` (200ms), `.anim-reveal` (900ms), `.anim-status` (250ms
  transition) — plus `.skeleton` and four stagger delays. Everything else is a
  150ms opacity fade. `prefers-reduced-motion` collapses all of it.

Label, colour and icon metadata for every enum lives in
`src/config/app-config.ts` (`CASE_STATUS_META`, `PRIORITY_META`,
`EXCEPTION_META`, `DETECTION_SOURCE_META`, `ACTION_STATUS_META`, `ROLE_META`) —
composed exclusively from semantic token class names.

---

## 8. Performance decisions in the code

- **Row virtualisation without a dependency** —
  `features/work-manager/hooks/use-virtual-rows.ts`. Uniform row heights are the
  one case where windowing is twenty lines rather than a library. Rows outside
  the viewport collapse into one spacer row at each end; a 10,000-case plant
  scrolls at the cost of a 25-case one. `ASSUMED_VIEWPORT = 640` matches the
  container's CSS `min-height` so the first client render produces the same
  window and hydration stays clean.
- **`WorkCaseRow` precomputes once** — status group, revenue band, age, days to
  due, overdue, resolution hours, and a lower-cased `haystack` for search — so
  filtering never re-derives per keystroke.
- **Stable-callback discipline.** Hooks return an object that is a new
  identity every render. Consumers **destructure the callbacks they need**
  before putting them in a dependency array. Depending on `api` or `manager`
  directly defeats every `React.memo` below it. This has already been fixed once;
  do not reintroduce it.
- `useDeferredValue` for search, `useTransition` for view switches,
  `React.memo` on row/card components.
- `optimizePackageImports` for `lucide-react`, `recharts`, `date-fns`.

---

## 9. Routes

15 routes, all building clean.

| Route | Kind | Status |
|---|---|---|
| `/` | static | redirect → `/dashboard` |
| `/login` | static | persona chooser |
| `/dashboard` | dynamic | **built** |
| `/work` | dynamic | **built** |
| `/work/[caseId]` | dynamic | **built** |
| `/my-work` | dynamic | **built** |
| `/api/copilot` | dynamic | **built** (`runtime: "nodejs"`) |
| `/actions` `/analytics` `/playbooks` `/reports` `/system/connectors` `/system/audit` `/admin` `/help` | dynamic | **built** |
| `/login` | static | **built** |
| `/_not-found` | static | — |

Every route is built. The placeholder mechanism these seven once used
(`ModulePlaceholder` and `MODULE_PLACEHOLDER_COPY`) was removed in the
stabilization pass — see D-19 for why it existed and D-63 for why it went.

Deep links work: `/work?band=CRITICAL`, `/work?overdue=true`, `/work?sort=revenue`,
`/work?kpi=OTIF_PCT`. Dashboard KPI cards use them, so a number always opens the
cases behind it. Work Manager view state round-trips through the URL
(`utils/query-state.ts`), which makes any view shareable.

---

## 10. Auth

`src/auth/session.ts` reads a `qo_persona` cookie and returns a `User`.
`session-actions.ts` is a server action that sets it and revalidates the layout.

Production replaces this with an Entra ID OIDC session. Every consumer depends
only on the returned `User`, so the swap is contained to those two files.

---

## 11. Known architectural gaps

- **`prisma/` exists but is empty.** There is no `schema.prisma`. `src/domain/types.ts`
  says it "mirrors prisma/schema.prisma exactly" and the README describes a Neon
  swap — both describe the *intended* target, not a file in the repo. Do not
  assume a schema exists.
- No tests of any kind, and no test tooling installed.
- No rate limiting on `/api/copilot`.
- All mutations are session-scoped. Refresh discards them, by design.
