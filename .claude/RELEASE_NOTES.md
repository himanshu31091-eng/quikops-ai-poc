# RELEASE NOTES

**QuikOps AI — Phase 1 POC**
**Build:** 2026-08-06 · Next.js 15.5.22 · React 19.2 · TypeScript 6.0.3
**Status:** demo-ready · not production-ready (see *Known limitations*)

---

## What this release is

A manufacturing operations execution platform: supply-chain signals arrive
through connectors, become prioritised cases, get worked through a verified
execution workflow, and roll up into figures an operations director can act on.
Sixteen routes, twelve feature modules, one Anthropic-backed Copilot at two
scopes.

Every number on every screen is computed from one corpus of 29 operational
cases through `src/domain/portfolio-metrics.ts`. Nothing is a stored figure.

---

## Modules

| Module | Route | Notes |
|---|---|---|
| Executive Dashboard | `/dashboard` | KPI cards, OTIF trend, revenue impact, plant health, activity feed, AI summary |
| Work Manager | `/work` | Table and board views, saved views, bulk assign and close, 14 filters |
| Case Detail | `/work/[caseId]` | Full execution workflow: assign → act → evidence → verify → close |
| My Work | `/my-work` | Personal queue, due-today grouping, verification inbox |
| Execution Analytics | `/analytics` | SLA, throughput, resolution mix, plant and owner performance, heatmap |
| Action Center | `/actions` | Cross-case action queue, bulk operations, drawer detail |
| Connector Health | `/system/connectors` | Run history, ingestion funnel, dead-letter queue with replay |
| Audit Log | `/system/audit` | Immutable event trail with actor, entity and time filters |
| Reports | `/reports` | Six report definitions rendered from live data, CSV and print export |
| Administration | `/admin` | Users, roles, derived routing rules, connector registry |
| Playbooks | `/playbooks` | The library the corrective-action generator actually runs |
| Help Center | `/help` | Searchable articles, KPI definitions, per-screen documentation |

---

## The AI layer

- **Live Anthropic API**, model `claude-opus-5`, streaming over NDJSON.
- Two scopes: portfolio (dashboard) and case (case detail). One panel component,
  one transport, one error path — the scope changes what the *server* assembles,
  never what the client sends.
- Prompt caching after the frozen prompt layers; `output_config.effort: medium`;
  `max_tokens: 16000`.
- **The API key is server-only.** Verified against this build: zero occurrences
  of the key or of `sk-ant` in `.next/static`, and one `process.env` read, in
  `src/ai/services/copilot-service.ts`.
- Without a key the product falls back to an offline responder that answers from
  the same case record and labels itself **Demo AI**. The demo never breaks for
  want of network.

Verified on the production build in this release:

```
POST /api/copilot → 200
x-copilot-mode: live
{"type":"meta","mode":"live","model":"claude-opus-5","scope":"portfolio"}
"There are 19 open cases carrying $1.5M in total revenue at risk."
```

Those figures match the dashboard, Analytics and the case corpus exactly.

---

## Cross-platform capabilities

Guided product tour · per-screen documentation panels · searchable help ·
global command palette (⌘/Ctrl-K) · notification tray · persona switching ·
demo reset · CSV and print export from every module · skip link and focus
management · i18n architecture with five locale catalogues · print stylesheets.

---

## Shared foundation

Twenty-four shared patterns in `components/patterns`, including `DataTable`
(sorting, selection, pagination, `aria-sort`, live result announcements),
`ModuleToolbar`, `KpiTile`, `FilterMenu`, `PageHeader` and `EmptyState`.

**Zero cross-feature imports across all twelve features.** The dependency rule
— `app → features → components → src`, one way — is enforced by convention and
verified by inspection each session.

---

## Stabilization pass (this release)

- **ESLint 9 flat config added** and the project brought to zero errors and zero
  warnings. Nine internal `<a>` tags replaced with `<Link>`.
- **Fourteen dead files and exports removed**, including four whole files.
- **Demo Reset fixed** — it cleared the shared store but no module's local
  state, so a reset restored roughly half the product.
- **Forty-six table headers given `scope`**, and a visually-hidden file input
  given an accessible name.
- **All 243 source files now carry documentation**; every module, shared
  component, route and boundary explains what it is for.
- `weeklyThroughput` in Analytics renamed to `weeklyThroughputSeries` to stop it
  colliding with the domain function of the same name and different meaning.

---

## Verification

| Check | Result |
|---|---|
| `npx eslint .` | 0 errors, 0 warnings |
| `npm run typecheck` | clean (`strict`, `noUncheckedIndexedAccess`) |
| `npm run build` | 16/16 routes, no warnings |
| Route smoke test | 16/16 render; `/` redirects; unknown route 404s |
| Live Copilot | confirmed on the production build |
| API key in client bundles | 0 occurrences |
| `console.log` | 0 (12 intentional `console.error` in error boundaries) |
| `TODO` / `FIXME` / `HACK` | 0 |
| Cross-feature imports | 0 |

---

## Known limitations

These are stated because a demo that surprises its presenter is worse than one
with a short list of honest gaps.

1. **Light theme only.** No `prefers-color-scheme` rule, no `dark:` variants, no
   toggle. The token layer would carry a dark palette, but it does not have one.
   See D-66.
2. **i18n is architecture, not translation.** The provider, locale cookie,
   catalogues and formatting are in place; roughly 900–1,400 UI strings are
   still literals in components.
3. **An unknown case number returns HTTP 200** while rendering the correct
   "Case not found" page — the segment's `loading.tsx` commits the response
   status before `notFound()` throws. Visually correct; wrong for crawlers.
4. **Plant scope selector is inert.** It holds a selection and does not filter.
   Deliberate: a control that filters some screens and not others is worse than
   one that visibly does nothing yet.
5. **No authentication.** Persona switching writes an `httpOnly` cookie; there
   are no credentials, no sessions server-side, and no authorization checks
   beyond role-based navigation filtering.
6. **All data is fixtures.** There is no database, no persistence between
   reloads beyond tour completion, and no real connector.
7. **No automated tests.** Verification is typecheck, lint, build and a manual
   route pass. See QA_CHECKLIST.md.
8. **Accessibility is verified by inspection, not by axe-core.** Structural
   checks pass; contrast ratios and screen-reader flow have not been audited
   with a tool.

---

## Deployment

Vercel-ready. One environment variable:

```
ANTHROPIC_API_KEY=sk-ant-...      # server-side only, never NEXT_PUBLIC_
```

Without it the build still succeeds and the Copilot runs in offline mode.
