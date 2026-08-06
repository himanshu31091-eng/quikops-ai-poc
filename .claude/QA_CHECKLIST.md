# QA CHECKLIST

> Run before any demo and before any deploy. There is no automated test suite;
> this document is the test suite.
>
> **Legend.** A mark is a claim about a specific build, not about the product,
> so the three states are kept distinct:
>
> | | Meaning |
> |---|---|
> | ✅ | Verified against the 2026-08-06 stabilization build |
> | ◻ | Passed in an earlier session; not re-run on this build |
> | ❌ | Not done, or not implemented |
>
> Do not promote a ◻ to a ✅ without running it. The point of the distinction is
> that a demo fails on the check nobody re-ran.

---

## 1 · Build gates

Run in this order. Each one must be clean before the next is meaningful.

| # | Command | Expected | 2026-08-06 |
|---|---|---|---|
| 1.1 | `npx eslint .` | no output, exit 0 | ✅ |
| 1.2 | `npm run typecheck` | no output | ✅ |
| 1.3 | `rm -rf .next && npm run build` | 16/16 routes, no warnings | ✅ |

If `.next` is stale after deleting a route or an API handler, typecheck fails on
generated types that no longer describe the project. Delete `.next` first.

---

## 2 · Routes

Start the production server (`npx next start -p 3000`) and confirm each route
renders. A signed-in session cookie is `qo_session=usr_mgr_01`.

| Route | Expect | 2026-08-06 |
|---|---|---|
| `/` | 307 → `/dashboard` | ✅ |
| `/login` | 200, four personas | ✅ |
| `/dashboard` | 200, KPI row populated | ✅ |
| `/work` | 200, table view, 29 cases | ✅ |
| `/work/QO-2026-004112` | 200, full case | ✅ |
| `/my-work` | 200 | ✅ |
| `/actions` | 200 | ✅ |
| `/analytics` | 200, charts render | ✅ |
| `/reports` | 200 | ✅ |
| `/admin` | 200 | ✅ |
| `/playbooks` | 200 | ✅ |
| `/help` | 200 | ✅ |
| `/system/audit` | 200 | ✅ |
| `/system/connectors` | 200 | ✅ |
| `/work/does-not-exist` | "Case not found" page (returns 200 — known limitation) | ⚠️ |
| `/nope` | 404 | ✅ |

---

## 3 · Figures reconcile

The single most damaging demo failure is two screens quoting different numbers.
Check these four pairs every time fixtures or domain logic change.

| Figure | Dashboard | Analytics | Copilot | 2026-08-06 |
|---|---|---|---|---|
| Mean time to resolve | 11d | 11d | 258.7h | ✅ |
| SLA adherence | 62.1% | 62.1% | 62.1% | ✅ |
| Verification pass rate | 76.9% | 76.9% | — | ◻ |
| Recurrence rate | 41.4% | 41.4% | — | ◻ |
| Open cases | 19 | 19 | 19 | ✅ |
| Revenue at risk | $1,531,700 | $1,531,700 | $1.5M | ✅ |
| Past SLA | 9 | 9 | 9 | ◻ |

The ✅ rows were re-confirmed on this build through the live Copilot, which
reads the same corpus (258.7h is 10.8 days, which the strip rounds to 11d). The
◻ rows were verified during fixture reconciliation and no fixture or domain file
changed after it — but they were not re-read off the screens on this build.

Every one of these comes from `src/domain/portfolio-metrics.ts`. If two
disagree, the bug is a screen that stopped asking it — not a fixture.

---

## 4 · The AI Copilot

| # | Check | How | 2026-08-06 |
|---|---|---|---|
| 4.1 | `.env.local` is loaded | build log shows `Environments: .env.local` | ✅ |
| 4.2 | Live mode, not offline | response header `x-copilot-mode: live` | ✅ |
| 4.3 | Correct model | first NDJSON line: `"model":"claude-opus-5"` | ✅ |
| 4.4 | Streaming is incremental | tokens arrive before `{"type":"done"}` | ✅ |
| 4.5 | Dashboard Copilot opens from two controls | header action *and* AI summary Regenerate | ◻ |
| 4.6 | Case Copilot answers about the open case | ask "what is blocking this case?" | ◻ |
| 4.7 | Cancellation is clean | close mid-stream; no server error | ◻ |
| 4.8 | Answers reconcile with the screen | figures match §3 | ✅ |
| 4.9 | Offline fallback works | unset the key, restart; panel shows **Demo AI** | ◻ |

Request shape (the client sends a scope, never content):

```bash
curl -X POST http://localhost:3000/api/copilot \
  -H "Content-Type: application/json" \
  -b "qo_session=usr_mgr_01" \
  -d '{"scope":"portfolio","question":"How many open cases?"}'
```

---

## 5 · Security

| # | Check | Command | 2026-08-06 |
|---|---|---|---|
| 5.1 | Key absent from client bundles | `grep -rl "sk-ant" .next/static` → 0 | ✅ |
| 5.2 | Key read on the server only | one `process.env.ANTHROPIC_API_KEY` read, in `src/ai/services/copilot-service.ts` | ✅ |
| 5.3 | No `NEXT_PUBLIC_` secret | `grep -r "NEXT_PUBLIC_ANTHROPIC"` → 0 | ✅ |
| 5.4 | Session cookie is `httpOnly` | `src/auth/session-actions.ts` | ✅ |
| 5.5 | Questions are sanitised and length-capped | `src/ai/utils/sanitise.ts`; 413 above the cap | ✅ |
| 5.6 | Case content is assembled server-side | route builds the subject from the data layer | ✅ |

---

## 6 · Execution workflow

Walk one case end to end. This is the demo's spine.

- [ ] Open a `NEW` case from Work Manager
- [ ] Assign an owner — the activity feed on `/dashboard` shows it
- [ ] Complete corrective actions — progress advances, status moves to `IN_PROGRESS`
- [ ] Upload evidence — the file appears with its type and size
- [ ] Submit for verification — status becomes `PENDING_VERIFY`
- [ ] Switch persona to the reviewer — the case appears in their verification inbox
- [ ] Approve — the case closes, MTTR and closed-this-week move on the dashboard
- [ ] **Demo Reset** — every module returns to its opening state, including
      filters, selections and drawer state (this is the check that failed before
      the stabilization pass; see D-64)

---

## 7 · Accessibility

Structural checks are automated below; the rest is a manual pass.

| # | Check | 2026-08-06 |
|---|---|---|
| 7.1 | Every `<th>` carries `scope` (46 across 9 files) | ✅ |
| 7.2 | No icon-only button without an accessible name | ✅ |
| 7.3 | No `<div onClick>` — every click target is a button or a link | ✅ |
| 7.4 | No positive `tabIndex` | ✅ |
| 7.5 | Every focusable input has a name | ✅ |
| 7.6 | Skip link is the first focusable element | ✅ |
| 7.7 | `:focus-visible` is styled globally (`app/globals.css`) | ✅ |
| 7.8 | Escape closes every overlay (dialog, drawer, tour, palette) | ◻ |
| 7.9 | Sorted tables expose `aria-sort`; result counts announce live | ✅ |
| 7.10 | `prefers-reduced-motion` disables the five animations | ✅ |
| 7.11 | axe-core audit | ❌ not run — Phase 2 |
| 7.12 | Contrast ratios measured | ❌ not measured — Phase 2 |

Manual keyboard pass, no mouse: Tab from the top of `/dashboard` → skip link →
navigation → search → each KPI → each panel. Then ⌘K, arrow, Enter, Escape.

---

## 8 · Responsive and print

| # | Check | 2026-08-06 |
|---|---|---|
| 8.1 | All nine tables sit in a horizontal scroll container | ✅ |
| 8.2 | No fixed-width page container (only `max-w-*`) | ✅ |
| 8.3 | 1440px — full layout | ◻ |
| 8.4 | 1024px — sidebar collapses to icons | ◻ |
| 8.5 | 768px — grids stack, toolbars wrap | ◻ |
| 8.6 | 375px — no horizontal page scroll | ◻ |
| 8.7 | Print — toolbars hidden, tables unclipped | ◻ |

8.1 and 8.2 are structural and were re-checked by inspection on this build.
8.3–8.7 need a browser at each width; they have not been re-run since the
modules landed.

---

## 9 · Theme

| # | Check | 2026-08-06 |
|---|---|---|
| 9.1 | Light theme renders correctly throughout | ✅ |
| 9.2 | Dark theme | ❌ **not implemented** — light only, by decision (D-66) |

Do not report dark mode as working. It does not exist.

---

## 10 · Before you present

- [ ] Kill every stale dev server first — a previous process serving a wiped
      `.next` produces 500s that look like code failures and are not
      (`netstat -ano | grep :3000`)
- [ ] `.env.local` present, with a key that has quota
- [ ] Hard-reload once so no `localStorage` tour state is mid-flight
- [ ] Demo Reset, then confirm the dashboard reads 19 open / $1,531,700
- [ ] Have the offline fallback in mind: if the network drops, the Copilot
      still answers and labels itself **Demo AI** — say so rather than retrying
