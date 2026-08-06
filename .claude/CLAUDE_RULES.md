# CLAUDE_RULES

> Standing rules for anyone — human or Claude — working in this repository.
> These are not suggestions. Several were established by explicit client
> instruction and are still in force.

---

## 0. Standing session protocol

### 0a. Before writing any code — every session

Read `CLAUDE.md` at the repo root, then all eight `.claude/*.md` files, then
`.claude/SESSION_HANDOFF.md` to find where the last session stopped. Check
whether the module you are about to touch is frozen, and whether `DECISIONS.md`
already settles the question you are about to answer.

**Precedence:** code > `.claude/` > `CLAUDE.md`. If a document disagrees with
the code, the document is stale — fix it in the same session.

### 0b. Before ending — EVERY session, without exception

**Rewrite `.claude/SESSION_HANDOFF.md`.** Replace its content; do not append.
It is a snapshot of the current state, not a log. Keep every section heading
even when the answer is "none this session":

> Session Date · Claude Version · Completed Work · Files Modified ·
> Decisions Made · Bugs Fixed · Known Issues · Current Build Status ·
> Next Recommended Prompt · Resume From Here

This applies to *every* session — documentation-only sessions, abandoned
experiments, and sessions that fixed a single typo. A session that ends without
updating it has failed its last step. **Resume From Here** matters most: it is
what the next session reads first, so it must be honest about anything left
half-finished.

### 0c. After a completed module — additionally update

1. `.claude/DEVELOPMENT_STATUS.md` — module state, verification record, gaps
2. `.claude/NEXT_STEPS.md` — remove what is done, re-rank what remains
3. `.claude/DECISIONS.md` — append any decision made, with its rationale

Treat `.claude/*.md` as the **authoritative project memory**.

### 0d. Then close out

Run `npm run dev` and `npm run build`, fix every issue before stopping, then
report:

> Files Created · Files Modified · Architecture Decisions · Build Status ·
> Known Limitations / Remaining Work

Then **stop and wait for approval.** Do not begin the next module unprompted.

---

## 1. Frozen modules

**FROZEN: Executive Dashboard · Work Manager · Case Detail · Execution Workflow**

For anything frozen:

- ❌ Do NOT redesign the screen
- ❌ Do NOT change typography, spacing, colours, or navigation
- ❌ Do NOT modify existing or reusable components
- ✅ **Except** to fix a genuine bug

When a new module needs different behaviour from a frozen screen, the pattern
that has worked four times now is: **change only where state comes from, never
the component API or its visuals.** Phase 4 made the entire dashboard reactive
by adding five thin client wrappers around untouched components. Do that.

---

## 2. Security — non-negotiable

- `ANTHROPIC_API_KEY` is **read only on the server**, only inside the route
  handler. Never expose it to the browser. Never prefix it `NEXT_PUBLIC_`.
- Never commit a real key. `.env` and `.env.local` are gitignored;
  `.env.example` documents the variable and stays empty.
- Sanitise everything that reaches a prompt.
- Bound token usage. Every limit lives in `src/ai/config.ts`.
- The browser may send a case number, a question, and validated scalars.
  **It may never send case content.** The record is assembled server-side.

---

## 3. Data and honesty rules

- **Use the existing mock data.** No lorem ipsum. No fake random values. No
  invented numbers.
- **Nothing is random at runtime.** All fixtures are deterministic and anchored
  to `DEMO_NOW`. Trend series use a seeded PRNG. A chart that redraws
  differently on refresh destroys confidence in the numbers.
- If seeded data is internally inconsistent, **do not paper over it** —
  re-express the metric honestly. (Precedent: "average resolution time" read 18d
  against a 38.4h portfolio MTTR; it was re-expressed as
  `averageSlaUsagePct` — *"averaging 80% of each case's own SLA target"* —
  rather than faking a delta.)
- Report outcomes faithfully. If something could not be verified, say so.
  Browser click-through has never been verifiable from this environment; that
  limitation is stated in every report and should stay stated.

---

## 4. Code quality bar

Set by explicit instruction: **"No shortcuts. No TODOs. No placeholder UI."**

- No `TODO`, `FIXME`, or stub implementations in delivered code.
- No dead code, no unused exports — `noUnusedLocals` and `noUnusedParameters`
  are on and will fail the build.
- No `any`. No non-null assertion unless the invariant is obvious one line
  above. `noUncheckedIndexedAccess` is on: index access yields `T | undefined`
  and you must handle it.
- Every non-trivial module opens with a block comment explaining **why it
  exists**, not what it does. Match that. Comments in this codebase carry
  reasoning and trade-offs; they are not narration.
- Prefer deleting to adding. During the engineering review the instruction was:
  *if components can be extracted, extract them; if code can be simplified,
  simplify it; if duplicated code exists, remove it.* That standard holds.

---

## 5. Architectural rules

**Layer discipline**

- `src/domain/` imports **nothing** from React, Next or Prisma. Pure functions
  and types only.
- Only `src/data/queries/` reads `src/data/fixtures/`. No component, hook or
  route touches a fixture directly. (Exception, deliberate: the `(app)` layout
  and `/login` read `organisation.ts` for personas and nav data.)
- Every query function is `async` and returns a **finished view model**, so the
  fixture→Prisma swap changes bodies only.
- **No business logic inside React components.** Logic goes in a hook, a
  `src/domain` function, or a feature `utils/` module.

**Single-definition rules** — each of these has exactly one home. Adding a
second copy is a bug:

| Thing | Home |
|---|---|
| Design tokens | `app/globals.css` |
| Status → group mapping | `src/domain/case-status.ts` |
| SLA hours | `src/domain/sla.ts` |
| Priority weights | `src/domain/priority.ts` |
| Health scoring | `src/domain/case-health.ts` |
| Case → owner/plant join | `src/data/queries/case-mapper.ts` |
| Enum labels/colours/icons | `src/config/app-config.ts` |
| Prompt assembly | `src/ai/prompts/prompt-builder.ts` |
| Copilot prompt catalogue | `src/ai/prompts/catalogue.ts` |
| Copilot tunables | `src/ai/config.ts` |
| "Now" | `DEMO_NOW` in `src/lib/constants.ts` |

**State rules**

- One hook owns each module's mutable state. Components below it are
  presentational.
- Cross-module state goes to `src/workflow/` and **only** carries outcomes
  another screen needs.
- Readers use `src/workflow/projections.ts`, never raw store state.
- **Every projection must return its input unchanged when the store is empty.**
  This is the hydration-safety guarantee. Do not break it.

---

## 6. Styling rules

- Semantic tokens only: `bg-surface`, `text-content-secondary`,
  `border-line-strong`, `bg-critical-subtle`. **Never** a raw hex, `bg-slate-200`,
  or an arbitrary value outside `globals.css`.
- **Exactly five animations** exist: `.anim-fade`, `.anim-settle`, `.anim-panel`,
  `.anim-reveal`, `.anim-status` (plus `.skeleton` and four stagger delays).
  Do not add a sixth. Everything else is a 150ms opacity fade.
- Two elevation levels. Structure comes from a 1px border, not a shadow.
- Compose classes with `cn()` from `src/lib/cn.ts`.
- Wide content must scroll in its own container. The page body never scrolls
  horizontally. Use `min-w-0` on grid/flex children — it is used consistently
  throughout and omitting it breaks the layout.

---

## 7. React and performance rules

- **Destructure the callbacks you need before putting them in a dependency
  array.** `useCallback(..., [api])` where `api` is a hook's returned object
  rebuilds every render and defeats every `React.memo` below it. This bug has
  already been found and fixed once — do not reintroduce it.
- Use a latest-value ref when a value must be readable at event time without
  re-subscribing on every change (see `overlayRef` in `case-detail-view.tsx`,
  `sessionRef` in `use-case-detail.ts`).
- `React.memo` row and card components; keep their props primitive or stable.
- Hide inactive overlay panels with **`inert`**, not `aria-hidden` —
  `aria-hidden` leaves focusable controls in the tab order. (Also already fixed
  once, in the Copilot panel.)
- Every interactive surface needs hover, focus-visible, loading, empty and error
  states. All five, every time.

---

## 8. AI rules

- **Do not concatenate prompt strings inside components.** Ever. Use
  `buildPrompt()`.
- Keep the frozen prompt layers frozen — no interpolation, no timestamps, no
  case data in `system-prompt.ts` or `business-context.ts`. Interpolating
  anything into them silently kills prompt caching.
- Adding a Copilot capability means adding an entry to
  `src/ai/prompts/catalogue.ts` — the panel renders the catalogue, so the UI
  follows automatically. Add a matching intent to `offline-service.ts` in the
  same change, or the offline path silently degrades to the generic answer.
- The offline path must stay byte-compatible with the live one: same route,
  same NDJSON events, same panel.
- Model: `claude-opus-5`. Streaming is mandatory at this `max_tokens`.
  Do not pass `budget_tokens` — this model rejects it.

---

## 9. Naming and file conventions

- Files: **kebab-case** (`case-detail-view.tsx`, `use-work-manager.ts`).
- Components: PascalCase. Hooks: `use-` prefix. Types: PascalCase interfaces.
- Enum-like constants: `SCREAMING_SNAKE` arrays declared `as const`, with the
  type derived — `export type CaseStatus = (typeof CASE_STATUSES)[number]`.
  Follow this pattern for any new enum.
- Feature folders always use the same five subfolders:
  `components/ hooks/ services/ utils/ types/`.
- Imports use the `@/` alias from the repo root. No deep relative chains
  (`../../../`); within a feature, relative is fine.
- **`caseNo` is the cross-module identifier**, not `id`. URLs, store keys and
  API payloads all use it.
- British spelling in prose and identifiers where it already appears
  (`sanitise`, `organisation`, `serialize`→ note: `serializeWorkParams` is US —
  match the file you are in rather than "correcting" it).

---

## 10. Commands

```bash
npm run dev         # next dev
npx eslint .        # 0 errors, 0 warnings (D-62)
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm start           # next start
```

**Operational note:** `npm run build` wipes `.next`, which breaks any dev server
running on port 3000 (it starts 500-ing with `ENOENT … vendor-chunks/*`). Always
kill the dev server before building, and restart it after. This has bitten this
project repeatedly.

**Writing large TypeScript blocks via shell heredocs fails** in this environment
(unexpected EOF). Use the Write/Edit tools, or stage content in the scratchpad
and concatenate with node.
