# NEXT_STEPS

> The roadmap, ranked. **Update after every completed module, before ending the
> session** — remove what is done, re-rank what remains.

**Last updated:** 2026-08-06 · after Phase 5 (Real AI Copilot)

---

## 0. Immediate — blocking

### ⏳ Await client approval of Phase 5
The Real AI Copilot is complete and reported. **Do not start another module
until approval is given.** This is a standing instruction repeated at the end of
every phase.

### 🐞 Fix three data defects before the client session
Found 2026-08-06. All three are visible in the demo path; all qualify as bug
fixes under the module freeze. Detail in `DEVELOPMENT_STATUS.md` §4a.

1. **`EXECUTIVE_SUMMARY` contradicts the computed data** —
   `src/data/fixtures/intelligence.ts`. It claims two unassigned critical cases
   at Querétaro (there are none — both criticals are at DE01 and both are
   assigned), "24 open cases" (there are 19), 89.2% OTIF (computes to 88.5%),
   and names the wrong largest exposure. **Highest priority of the three** — it
   sits on the first screen the client sees. Fix by rewriting the copy against
   the real figures, or by deriving the callouts from `CASES`.
2. **"the 3th detection"** — ordinal bug in `buildComments`,
   `src/data/fixtures/case-detail.ts`. On the golden case.
3. **"Past SLA: 0 days beyond the resolution target"** — `scoreCaseHealth`
   rounds sub-24h breaches to zero days. Say hours when it is under a day.

### 🔑 Verify the live Claude path with a real key
The single highest-value action available, and it takes one minute.

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
# open /work/QO-2026-004182 → Ask Copilot → "Summarise this case."
```

Confirms the one thing that has never been observed in this environment: a
successful 200 with streamed content. Everything up to and including Anthropic's
response is already proven via the forced-401 path.

While the key is in place, also capture:
- `cache_read_input_tokens` across two consecutive requests → confirms the
  prompt-cache breakpoint is actually earning its keep
- End-to-end latency at effort `medium` → decide whether to sweep it

---

## 1. Next module — the client's call

Three defensible candidates. Recommendation first.

### ★ Recommended: Action Center (`/actions`, spec M3)
Cross-case approval queue for corrective actions needing manager sign-off, plus
overdue and escalation views.

**Why this one:** it is the only remaining module that *completes an existing
loop*. Corrective actions already exist as first-class objects with owners,
statuses, due dates and origins; `TODAYS_ACTIONS` already seeds them; My Work
already renders a slice. The Action Center is the manager's cross-case view of
the same data — high demo value, and most of the data layer already exists.
It also gives the execution store a second writer, which proves the Phase 4
architecture generalises rather than being fitted to one screen.

### Execution Analytics (`/analytics`, spec M8)
MTTR, SLA adherence, verification pass rate and recurrence by plant, owner and
exception type.

**Why:** closes the narrative arc — detect, execute, verify, **and prove it
worked**. `EXECUTION_METRICS` and the 90-day series already exist; the chart
primitives are built. Strong executive appeal, moderate build.

### Connector Health (`/system/connectors`, spec M1)
Every Angle ingestion status, run history, dedup counts, dead-letter replay.

**Why:** it is the integration story, and the whole product positioning rests on
Every Angle. Weakest of the three as a *demo* screen (it is infrastructure), but
the one a technical evaluator will ask about.

---

## 2. Production readiness

Not demo-blocking. Every one of these is blocking for a real deployment.

| # | Item | Notes |
|---|---|---|
| 1 | **Persistence** | Write `prisma/schema.prisma` to match `src/domain/types.ts`, connect Neon, replace `src/data/queries/*` bodies. The seam is already built — this is the payoff. Note the `prisma/` directory is currently **empty**; the schema does not exist yet. |
| 2 | **Real auth** | Entra ID OIDC replacing the `qo_persona` cookie. Contained to `src/auth/session.ts` + `session-actions.ts`. |
| 3 | **Server-side mutations** | Every mutation is currently session-scoped. Needs server actions + optimistic UI. The reducer shape in `use-case-detail.ts` maps cleanly onto a command API. |
| 4 | **Rate limiting on `/api/copilot`** | Input size, history and context are bounded; frequency is not. Key a limiter on the session. |
| 5 | **Tests** | None exist, no tooling installed. Highest-value first: `src/domain/*` (pure, trivially testable), then `src/workflow/projections.ts` (especially the empty-store identity invariant), then the route handler's validation and sanitisation. |
| 6 | **Real evidence storage** | Uploads are in-memory `objectUrl`s. Needs blob storage + virus scanning + signed URLs. |
| 7 | **Audit log persistence** | The append-only record is per-session. `/system/audit` cannot be built meaningfully until it is real. |
| 8 | **Live clock** | Replace `DEMO_NOW`. One line, but it shifts every seeded case's SLA state — the fixtures were tuned against that instant. |
| 9 | **Observability** | The route logs `console.error("[copilot]", kind, cause)` and nothing else. Needs structured logging and token-usage metrics. |

---

## 3. Copilot refinements

Ranked by value, all small.

1. **Summarise, don't truncate.** `boundContext` currently trims the middle of
   an oversized record. A busy case would be better served by summarising older
   timeline and audit entries.
2. **Sweep effort.** Fixed at `medium`. Compare `low`/`high` on real latency
   once a key is available.
3. **Surface token usage.** The stream already carries a `meta` event; adding
   input/output/cache-read counts would make cost visible during a demo.
4. **Persist conversations** per case, so a manager returning to a case sees
   what was already asked.
5. **Widen the offline responder** or accept its ceiling. Nine intents plus a
   grounded fallback; anything outside them degrades to a generic overview.

---

## 4. Remaining placeholder modules

Beyond the three candidates in §1:

| Route | Module | Spec |
|---|---|---|
| `/playbooks` | Playbook Library | M6 — reusable corrective-action templates per exception type, with usage counts and effectiveness |
| `/reports` | Reports | M13 — scheduled executive/audit reporting, PDF + Excel distribution |
| `/system/audit` | Audit Log | M11 — append-only global record *(blocked on item 7 above)* |
| `/admin` | Administration | M12 — users, roles, plant scoping, routing rules, SLA thresholds, priority weights |

`/admin` is worth noting: the priority weights and SLA thresholds it would edit
are already isolated in `src/domain/priority.ts` and `src/domain/sla.ts` and are
already described in the code as deployment-configurable. The module is mostly
a form over two constants.

---

## 5. Housekeeping

- **`README.md` is stale.** It says "Phases 1–3", "Executive Dashboard slice",
  "15 routes" (coincidentally still right) and "No environment variables are
  required" — which is no longer true now that the Copilot exists. It also
  references `prisma/schema.prisma`, which does not exist.
- **`.gitignore` is minimal** — only `.env` / `.env.local`. It does not ignore
  `node_modules/`, `.next/`, or build output. This is not currently a git
  repository, so nothing is broken, but it will bite on first `git init`.
- **`src/domain/types.ts` header claim** — says the types "mirror
  prisma/schema.prisma exactly". Aspirational; reword or make it true.
