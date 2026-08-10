# SESSION_HANDOFF

> The state of play at the end of the last development session.
> **Every session must rewrite this file before ending.** Replace the content —
> do not append. This is a snapshot of *now*, not a history; history belongs in
> `DECISIONS.md` and `DEVELOPMENT_STATUS.md`.
>
> Keep every section heading below, even when a section is empty. "None this
> session" is a useful answer; a missing heading is not.

---

## Session Date

**2026-08-10** — Branding cleanup: the upstream analytics vendor is no longer
named anywhere a user can see it.

**2026-08-08** — Demo-freeze sprint: saved reports, responsive pass, final QA.

**2026-08-07** — Wave 1 (Executive insights), after Product Audit Mode and the
partner-reference gap analysis, all on the 2026-08-06 stabilization pass.

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## Completed Work

### Vendor-neutrality pass (2026-08-10)

Client feedback after the POC review: remove all visible references to the
upstream analytics vendor, keep QuikOps AI vendor-neutral, change nothing else.
No functionality, layout, workflow or business logic was touched.

**The agreed vocabulary**, applied consistently so the product reads as one
voice rather than a find-and-replace:

| Context | Wording |
|---|---|
| The upstream system, named as an actor | **Enterprise Data Platform** |
| The same in running prose | *enterprise data platform* |
| A figure's provenance | *Source: Connected Enterprise Data* |
| Reading measured values | *read from connected enterprise data* |
| Where naming it adds nothing | *detected* — the sentence is shorter without it |

**45 customer-visible strings changed** across the login screen, dashboard,
Work Manager, Case Detail, Analytics, Connector Health, the side nav, the Help
Center, the guided tour, notifications, the activity feed, both export paths and
the Copilot's business-context prompt layer.

**The part that was not a string.** Four screens rendered the internal enum key
as display text through `source.replace(/_/g, " ").toLowerCase()` — the Audit
Log badge, its filter options, its filter chips, its CSV export, the Action
Center drawer and the case export. Those printed "every angle" to the user
**without the brand ever appearing in the source**, so no text search would have
found them. Display text now comes from `AUDIT_SOURCE_LABEL` in
`src/config/app-config.ts` — one definition, consumed by both features. See D-89.

**Signal and rule ID prefixes** were re-prefixed: `EA-` → `SIG-` on signal refs,
`EA-R-` → `RULE-` on detection rule IDs. Both are shown on Case Detail and
Connector Health, and an orphan "EA" beside a renamed connector is the one tell
a reader would still spot.

**`EVERY_ANGLE` was deliberately kept as an internal enum key** — it is an
identifier, not copy. It still appears in the serialised RSC payload in page
source, which is why the verification below distinguishes page source from
rendered text.

---

## Files Modified

**Created**
None.

**Deleted**
None.

**Code changed — customer-visible copy**
- `app/(auth)/login/page.tsx` — positioning statement and a value point
- `app/(app)/dashboard/page.tsx` — provenance chip, KPI footnote
- `app/(app)/system/connectors/page.tsx` — route metadata description
- `components/shell/side-nav.tsx` — connection banner
- `features/dashboard/components/otif-trend-chart.tsx` — chart footnote
- `features/analytics/components/analytics-view.tsx` — card footer, chart footnote
- `features/work-manager/components/work-manager-view.tsx` — page description
- `features/work-manager/components/work-states.tsx` — empty state
- `features/work-manager/components/create-case-dialog.tsx` — dialog description
- `features/case-detail/components/executive-summary-card.tsx` — "Why this was raised"
- `features/connector-health/components/connector-health-view.tsx` — page description
- `src/help/content.ts` — 10 strings incl. two search keyword lists
- `src/help/tips.ts` — detection-source tooltip
- `src/tour/tours.ts` — connectors step
- `src/ai/prompts/business-context.ts` — Layer 2 opening sentence
- `src/config/app-config.ts` — `DETECTION_SOURCE_META.EVERY_ANGLE` labels

**Code changed — enum key was being rendered as text**
- `src/config/app-config.ts` — **new** `AUDIT_SOURCE_LABEL`, the single definition
- `features/audit-log/components/audit-log-view.tsx` — source badge
- `features/audit-log/hooks/use-audit-log.ts` — filter options, filter chips, CSV export
- `features/action-center/components/action-drawer.tsx` — audit tab
- `features/case-detail/utils/case-export.ts` — "Detected by" line, audit trail lines
- `features/case-detail/components/audit-log-card.tsx` — `SOURCE_META` split; it
  now keeps only tone classes and reads labels from the shared map

**Fixtures**
- `src/data/fixtures/connectors.ts` — two connector names and `system` values, signal refs
- `src/data/fixtures/case-detail.ts` — `whyRaised`, timeline actor and title,
  evidence filename and uploader, rule IDs, signal-ref template
- `src/data/fixtures/intelligence.ts` — two activity entries, one notification
- `src/data/fixtures/metrics.ts` — comment

**Comments only (not customer-visible, changed for a clean handover)**
`src/domain/types.ts` · `src/domain/portfolio-metrics.ts` ·
`src/workflow/projections.ts` · `src/data/fixtures/connectors.ts`

**Docs changed**
`CLAUDE.md` · `.claude/DECISIONS.md` (D-89 added; D-48 and D-51 reworded) ·
`.claude/PROJECT_CONTEXT.md` · `.claude/DEMO_SCRIPT.md` ·
`.claude/PRESENTATION_CONTEXT.md` · `.claude/ROADMAP.md` ·
`.claude/DEVELOPMENT_STATUS.md` · `presentation-assets/SCREENSHOT_INDEX.md` ·
this file

---

## Decisions Made

| # | Decision |
|---|---|
| D-89 | The upstream analytics vendor is never named in the product; the enum key stays, and display text comes from `AUDIT_SOURCE_LABEL` rather than from de-underscoring an identifier |

---

## Bugs Fixed

**Display text was being derived from an identifier.** Six render sites turned
`EVERY_ANGLE` into visible text with `.replace(/_/g, " ").toLowerCase()`. That
is a latent defect independent of branding: any enum key renamed for internal
reasons would silently change what the user reads, and any grep for the visible
string would miss it. Fixed at the source by giving the enum a real label map.

---

## Known Issues

Stated in full in `RELEASE_NOTES.md` under *Known limitations*. The ones that
matter to the next session:

1. **Light theme only.** No `prefers-color-scheme`, no `dark:` variants, no
   toggle. Do not report dark mode as working (D-66).
2. **i18n is architecture, not translation.** ~900–1,400 literals remain in
   components — and this session added no new mechanism for them.
3. **An unknown case number returns HTTP 200** while rendering the correct
   "Case not found" page — the segment's `loading.tsx` commits the status before
   `notFound()` throws. Visually correct, wrong for crawlers.
4. **Plant scope selector is inert** by decision.
5. **No automated tests.** `QA_CHECKLIST.md` is the test suite, and it marks
   what was verified on this build (✅) against what was carried from an earlier
   one (◻). Do not promote a ◻ without running it.
6. **No axe-core audit, no measured contrast.**
7. **Charts are statically imported** — ~110–130 kB of first-load JS on
   `/dashboard` and `/analytics`. A deliberate trade against a loading state on
   a frozen screen.
8. **`EVERY_ANGLE` remains in page source**, in the serialised RSC payload for
   any route carrying case data. It is not rendered text. If a client objects to
   view-source, renaming the enum is a separate, larger change touching the
   fixture corpus, D-51's connector reconciliation and the `/work?detected=`
   deep-link contract.

---

## Current Build Status

| Gate | Result |
|---|---|
| `npx eslint .` | **0 errors, 0 warnings** |
| `npm run typecheck` | **clean** |
| `npm run build` | **19/19 entries, no warnings** |
| Route smoke test (`npm start` + HTTP) | **13/13 render 200**; `/` → 307; `/nope` → 404 |
| Brand in **rendered text**, all 13 routes | **0 occurrences** |
| Brand in **page source** | `EVERY_ANGLE` enum key only, in the RSC payload |
| `EA-` prefixes in rendered output | **0** — now `SIG-` and `RULE-` |

Verification method, stated plainly: each route was fetched over HTTP from the
production build with a persona cookie set, script blocks and tags were stripped,
and the remaining visible text was searched for the brand in every spelling.
**No browser click-through was performed** — that has never been verifiable from
this environment. Visual confirmation of the new copy on each screen is still
worth one manual pass before the client sees it.

---

## Next Recommended Prompt

> Run the manual verification passes in `.claude/QA_CHECKLIST.md` that are
> marked ◻ rather than ✅ — the responsive pass at 1440 / 1024 / 768 / 375, the
> keyboard-only pass, the Escape-closes-every-overlay check, and the end-to-end
> execution workflow including Demo Reset. While you are in each screen, eyeball
> the new vendor-neutral copy: the two longest replacements are the Work Manager
> empty state and the Analytics card footer, and long strings are where a layout
> surprise would show up. Fix what fails. Promote each ◻ to ✅ only after
> running it. Do not add features.

After that, in order: axe-core audit → i18n string migration → dynamic chart
imports.

---

## Resume From Here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale dev servers before verifying anything.** A previous process
   serving a wiped `.next` produces 500s that look like code failures and are
   not: `netstat -ano | grep :3000`, then `taskkill //PID <pid> //F`.
3. **Never build a large TypeScript block through a shell heredoc or a
   shell-quoted regex.** Backslashes and backticks are consumed before Node sees
   them; this broke a dead-code script and has broken doc edits before. Use the
   Write/Edit tools, or write the script to a file first.
4. Frozen and not to be redesigned: Executive Dashboard, Work Manager, Case
   Detail, My Work, Execution Workflow. Bug fixes only.
5. **Copy is vendor-neutral now (D-89).** Do not reintroduce a vendor name in
   new UI text, fixtures, help content or prompts, and do not render an enum key
   as display text — add a label to `src/config/app-config.ts` instead.
6. Every change ends with `npx eslint .`, `npm run typecheck`, `npm run build`,
   a route pass, then updates to `DEVELOPMENT_STATUS.md`, `NEXT_STEPS.md`,
   `DECISIONS.md` and this file.
