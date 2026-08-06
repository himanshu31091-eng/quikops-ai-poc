# NEXT_STEPS

> **Immediate** actions only. The full backlog — Phase-2 modules, cross-platform
> features, and the technical-debt register — lives in **`.claude/ROADMAP.md`**.
> Read that before planning anything new.
>
> **Update after every completed module, before ending the session** — remove
> what is done, re-rank what remains.

**Last updated:** 2026-08-06 · after the stabilization pass

---

## 0. Immediate — before the client session

### ▶ Run the checks nobody has run against this build
`.claude/QA_CHECKLIST.md` distinguishes ✅ (verified on this build) from ◻
(passed earlier, not re-run). Everything ◻ is an assumption. In value order:

1. **§6 — the execution workflow end to end, including Demo Reset.** This
   exercises the defect fixed this session (D-64). If any check is worth an
   hour, it is this one.
2. **§8.3–8.7 — responsive at 1440 / 1024 / 768 / 375, and print.** Structural
   checks pass; nobody has looked at it in a browser since the modules landed.
3. **§7.8 and the manual keyboard pass** — Tab from the top of `/dashboard`
   with no mouse, then ⌘K, arrows, Enter, Escape.
4. **§3 — read the four portfolio figures off the Dashboard and Analytics.**
   The Copilot re-confirmed 19 open / $1,531,700 / 9 past SLA on this build;
   MTTR, SLA adherence, pass rate and recurrence were not re-read off screen.

Promote a ◻ to a ✅ only after running it.

### ▶ Kill stale dev servers first
A previous process serving a wiped `.next` produces 500s that look exactly like
code failures. This has cost time three times.

```bash
netstat -ano | grep :3000     # then taskkill //PID <pid> //F
```

---

## 1. Hardening — in order

| # | Item | Size | Why here |
|---|---|---|---|
| 1 | **axe-core audit and contrast measurement** | M | Structural a11y is done and verified. What remains is exactly what structural checks cannot see, and it is where AA is normally lost. |
| 2 | **i18n string migration** (~900–1,400 literals) | XL | The provider, cookie, catalogues and formatting are in place. Purely mechanical now, and it grows with every string written. |
| 3 | **Dynamic chart imports** on `/dashboard` and `/analytics` | S | ~110–130 kB of first-load JS on the two routes that open the demo. Costs a chart loading state on a frozen screen — get the decision explicitly. |
| 4 | **Tests over `src/domain/`** | M | Pure functions, no tooling installed. Start with `portfolio-metrics.ts` and the empty-store identity invariant in `projections.ts` — the two places where a silent regression would put wrong numbers on every screen. |
| 5 | **`notFound()` returns 200** for unknown case numbers | S | The segment's `loading.tsx` commits the status first. Visually correct; wrong for crawlers and monitoring. |

---

## 2. Production readiness

None of this is demo-blocking. All of it blocks a real deployment.

| # | Item | Notes |
|---|---|---|
| 1 | **Persistence** | Write `prisma/schema.prisma` against `src/domain/types.ts`, connect Neon, replace the bodies of `src/data/queries/*`. The seam is already built. `prisma/` is currently empty. |
| 2 | **Real auth** | Entra ID OIDC replacing the persona cookie. Contained to `src/auth/session.ts` and `session-actions.ts`. |
| 3 | **Server-side mutations** | Every mutation is session-scoped. The reducer shape in `use-case-detail.ts` maps cleanly onto a command API. |
| 4 | **Rate limiting on `/api/copilot`** | Input size, history and context are bounded; frequency is not. Key a limiter on the session. |
| 5 | **Real evidence storage** | Uploads are in-memory `objectUrl`s. Needs blob storage, scanning and signed URLs. |
| 6 | **Audit log persistence** | `/system/audit` renders a session-scoped record. It is honest about that, but it is not an audit log until it is durable. |
| 7 | **Live clock** | Replace `DEMO_NOW`. One line, but every seeded case's SLA state was tuned against that instant. |
| 8 | **Observability** | The Copilot route logs `console.error` and nothing else. Needs structured logging and token-usage metrics. |

---

## 3. Copilot refinements

Ranked by value, all small.

1. **Summarise, don't truncate.** `boundContext` trims the middle of an
   oversized record; a busy case would be better served by summarising older
   timeline and audit entries.
2. **Surface token usage.** The stream already carries a `meta` event; adding
   input/output/cache-read counts makes cost visible during a demo.
3. **Sweep effort.** Fixed at `medium`. Compare `low` and `high` on real latency.
4. **Persist conversations per case**, so returning to a case shows what was
   already asked.
5. **Widen the offline responder** or accept its ceiling — nine intents plus a
   grounded fallback.

---

## 4. Housekeeping

- **`README.md` is stale.** It describes "Phases 1–3" and an "Executive
  Dashboard slice", says no environment variables are required (the Copilot
  needs `ANTHROPIC_API_KEY`), and references `prisma/schema.prisma`, which does
  not exist.
- **`.gitignore` is minimal** — only `.env` / `.env.local`. It does not ignore
  `node_modules/`, `.next/` or build output. Not a git repository yet, so
  nothing is broken; it will bite on first `git init`.
- **`src/domain/types.ts` header** claims the types "mirror
  prisma/schema.prisma exactly". Aspirational — reword it or make it true.
