# QuikOps AI — Claude Code Entry Point

**Read this file first, then read `.claude/` before writing any code.**

This file is a signpost, not a manual. Every detail lives in `.claude/`, which is
the **authoritative project memory**. Do not restate its content here; keep this
file short enough that it always gets read.

---

## What this project is

**QuikOps AI** — an operational execution platform for manufacturing, built as a
client-facing POC to production standards. Next.js 15 App Router, React 19,
TypeScript strict, Tailwind v4, Anthropic Claude for the in-app Copilot. No
database: typed fixtures behind an async data-access layer.

The one-line pitch, from the login screen:

> Every Angle identifies operational bottlenecks.
> QuikOps AI turns them into executed, verified outcomes.

A detected signal becomes a case, which is scored, owned, worked, evidenced and
**independently verified** — and only then does its revenue exposure count as
recovered.

---

## Mandatory reading order

Read all seven, in this order, before touching anything:

| # | File | Why |
|---|---|---|
| 1 | `.claude/PROJECT_CONTEXT.md` | Product, domain vocabulary, seeded org, the frozen clock |
| 2 | `.claude/ARCHITECTURE.md` | Layers, data seam, state model, Copilot, design system |
| 3 | `.claude/DEVELOPMENT_STATUS.md` | What is built, what is frozen, verification record, known gaps |
| 4 | `.claude/DECISIONS.md` | 37 decisions with rationale — **read before proposing a change** |
| 5 | `.claude/CLAUDE_RULES.md` | The full rulebook. This file is its summary. |
| 6 | `.claude/NEXT_STEPS.md` | Ranked roadmap |
| 7 | `.claude/DEMO_SCRIPT.md` | The client walkthrough — what must never break |

Then `.claude/SESSION_HANDOFF.md` for where the last session stopped.

**If this file and `.claude/` disagree, `.claude/` wins.**
**If `.claude/` and the code disagree, the code wins — and fix the doc that session.**

---

## Repository map

**Vertical modules** — one screen each, all sharing the same five subfolders
(`components/ hooks/ services/ utils/ types/`):

| Dashboard | Work Manager | Case Detail | My Work |
|---|---|---|---|
| `features/dashboard` | `features/work-manager` | `features/case-detail` | `features/my-work` |

**Horizontal layers** — serve every module:

| Layer | Folder(s) |
|---|---|
| Business Rules | `src/domain` |
| Workflow Engine | `src/workflow` |
| AI | `src/ai` |
| Data | `src/data` |
| Configuration | `src/config` |
| Auth & Utilities | `src/auth` · `src/lib` |
| Routes | `app` · `app/api` |
| Design System | `app/globals.css` · `components/{ui,patterns,shell,charts}` |

**Dependency rule — one direction only:**

```
app  →  features  →  components  →  src
```

- **Features must never import from other features.**
- **Shared logic always moves downward into `src`** — never sideways.
- `src/domain` imports no framework at all.

→ **Full version with rationale and folder tree: `.claude/ARCHITECTURE.md` §1.**

---

## Frozen modules — do not redesign

**FROZEN: Executive Dashboard · Work Manager · Case Detail · Execution Workflow**

- ❌ Do NOT redesign any frozen screen
- ❌ Do NOT change typography, spacing, colours, or navigation
- ❌ Do NOT modify existing or reusable components
- ✅ **Except** to fix a genuine bug

When a new module needs different behaviour from a frozen screen, **change only
where state comes from — never the component API or its visuals.** Phase 4 made
the entire dashboard reactive by adding five thin client wrappers around
completely untouched components (`features/dashboard/components/live-dashboard.tsx`).
That is the pattern. Reuse it.

---

## Non-negotiable rules

### Security
- `ANTHROPIC_API_KEY` is **server-side only**, read inside the route handler.
  Never expose it to the browser. Never prefix it `NEXT_PUBLIC_`.
- Never commit a real key.
- The browser may send a case number, a question, and validated scalars.
  **Never case content** — the record is assembled server-side.

### Data honesty
- Use the existing fixtures. **No lorem ipsum. No invented numbers. No random values.**
- Nothing is random at runtime. `DEMO_NOW` (2026-08-05T09:12:00Z) is "now"
  everywhere; nothing calls `new Date()`.
- If seeded data is inconsistent, **re-express the metric honestly — never fake it.**
- Report outcomes faithfully. Browser click-through has never been verifiable
  from this environment; say so rather than implying it was checked.

### Code quality
- **No shortcuts. No TODOs. No placeholder UI.**
- No `any`. No dead code — `noUnusedLocals` / `noUnusedParameters` fail the build.
- `noUncheckedIndexedAccess` is on: indexed access is `T | undefined`. Handle it.
- Comments explain **why**, not what. Match the surrounding density.
- Prefer deleting to adding.

---

## Architecture rules

**Layer direction is one-way:** `app → features → components → src`

- `src/domain/` imports **nothing** from React, Next or Prisma.
- Only `src/data/queries/` reads `src/data/fixtures/`.
- Every query function is `async` and returns a **finished view model**, so the
  fixture→database swap changes bodies only.
- **No business logic inside React components.** It goes in a hook, a
  `src/domain` function, or a feature `utils/` module.
- Feature folders always use the same five subfolders:
  `components/ hooks/ services/ utils/ types/`.

**Three-tier state:** server props (immutable) → per-module hook (rich, local) →
`src/workflow/` Execution Store (thin, shared, outcomes only).

- Writers call `recordOutcome`. **Readers use `src/workflow/projections.ts`,
  never raw store state.**
- **Every projection must return its input unchanged when the store is empty.**
  This is the hydration-safety guarantee. Do not break it.

**Single-definition rule.** Design tokens live only in `app/globals.css`; status
mapping only in `src/domain/case-status.ts`; prompt assembly only in
`src/ai/prompts/prompt-builder.ts`. The full table is in `CLAUDE_RULES.md` §5.
Adding a second copy of any of them is a bug.

**Styling:** semantic tokens only — never a raw hex or `bg-slate-*` outside
`globals.css`. **Exactly five animations exist. Do not add a sixth.**

**React:** destructure hook callbacks before putting them in a dependency array
— `useCallback(..., [api])` defeats every `React.memo` below it. Use `inert`,
not `aria-hidden`, for closed overlay panels. Both bugs have been found and
fixed once already; do not reintroduce them.

**AI:** never concatenate prompt strings in a component. Keep the frozen prompt
layers frozen — interpolating anything into them silently kills prompt caching.

---

## Mandatory workflow before writing code

1. **Read all seven `.claude/` files** plus `SESSION_HANDOFF.md`.
2. **Check `DEVELOPMENT_STATUS.md`** — is the module you are about to touch frozen?
3. **Check `DECISIONS.md`** — has this already been decided, and why?
4. **Confirm scope with the user.** Do not begin a module without approval.
5. Only then write code.

If a request conflicts with a freeze or a recorded decision, **say so in one or
two sentences, then proceed as instructed** if the user reaffirms. Their call.

---

## Mandatory workflow at the end of every session

Run both, and fix every issue before stopping:

```bash
npm run typecheck    # tsc --noEmit
npm run build        # next build
```

⚠️ `npm run build` wipes `.next` and breaks any dev server on port 3000.
**Kill the dev server before building.** This has bitten this project repeatedly.

Then **update the documentation. This is not optional.**

| When | Update |
|---|---|
| Every session, without exception | `.claude/SESSION_HANDOFF.md` |
| After a completed module | `.claude/DEVELOPMENT_STATUS.md` |
| After a completed module | `.claude/NEXT_STEPS.md` |
| Whenever a decision was made | `.claude/DECISIONS.md` |

Then report to the user:

> **Files Created · Files Modified · Architecture Decisions · Build Status ·
> Known Limitations / Remaining Work**

Then **stop and wait for approval.** Never start the next module unprompted.

---

## Commands

```bash
npm run dev         # next dev — http://localhost:3000
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm start           # next start
```

Optional: put `ANTHROPIC_API_KEY` in `.env.local` for the live Copilot. Without
it the Copilot falls back to Demo AI mode and nothing breaks.

---

## Current state at a glance

Phases 1–4 complete and **frozen**. Phase 5 (Real AI Copilot) complete, awaiting
client approval. Build clean: `tsc` passes, `next build` ✓ 15/15 pages.

Seven modules remain as navigable placeholders. Three known data defects are
recorded in `DEVELOPMENT_STATUS.md` §4a and ranked in `NEXT_STEPS.md`.

**`.claude/DEVELOPMENT_STATUS.md` is the authority. This paragraph will go stale
— that file will not.**
