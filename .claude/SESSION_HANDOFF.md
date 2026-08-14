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

**2026-08-15** — Phase A: the persistence foundation. The seed was made
non-destructive, the Sika evaluation corpus was expanded across five sites,
persona identity was mapped into the database, and the `Comment` model landed.

**Phase B has not started and must not be started without approval.**

---

## Claude Version

**Claude Opus 5** (`claude-opus-5`), Claude Code in the VS Code extension.

---

## Read this before anything else

**The application still has no write path to the database.** Not one
`prisma.*.create` or `.update` outside the seed; the only two server actions
write cookies. Every edit a user makes in the portal — cases, actions,
evidence, verification, comments — lives in React state and dies on refresh.

Phase A did not change that, and was not meant to. It built the floor Phase B
stands on. **Do not tell a client their data will persist yet.**

---

## How to run the demo — unchanged

**Leave `USE_DATABASE` unset.** Work Manager and Case Detail read Neon when it
is on; Dashboard, Analytics and Reports do not. Turning it on in front of a
client shows a dashboard of eight cases above a queue of three.

| Case | Shows |
|---|---|
| `QO-PA-2026-00421` | Problem, priority score, ownership, corrective actions, evidence, timeline, audit |
| `QO-PA-2026-00418` | The KPI movement and the independent verification decision |

---

## What changed this session

**The seed can no longer destroy anything (D-91).** `prisma.tenant.deleteMany({})`
cascaded to every case, action, evidence row and audit entry in the database.
It is gone, along with every other delete. Reference data upserts; transactional
data is created once and never written again. Three consecutive runs: run one
created the new corpus, runs two and three created nothing and left the totals
identical.

**`seedKey` separates demo data from client data (D-92).** Every seeded row
carries one; every row a person creates has `seedKey = null`. Rows from the old
seed were adopted — matched once on their business key, stamped, otherwise
untouched. Proven by planting a client case, a client comment and a client edit
to a *seeded* case, re-running the seed, and finding all three intact.

**Persona identity resolves in the database (D-93).** `User.personaKey` plus
`findUserByPersona(tenantId, personaKey)`. All 19 personas across both tenants
resolve 1:1, no duplicates, no key shared across tenants. `getSessionUser()` is
database-aware and does **not** fall back to a fixture identity in database
mode.

**`Comment` model added (D-94).** Tenant- and case-scoped, author relation,
`createdAt`, nullable `editedAt`. Schema only — the write path is Phase B.

**The Sika evaluation corpus grew** from 1 site / 1 case to **5 sites / 14
cases**, construction-chemicals throughout: admixtures, membranes, adhesives,
resins, sealants, mortars. Five plants, four priority bands, eight exception
types, seven statuses, both assigned and unassigned work. Sites 2 and 3 sit in
Spanish- and Portuguese-speaking countries, so the language switch has data
behind it. Every name is invented; every address is `example.com`.

**Localization was measured, not translated.** `.claude/LOCALIZATION_PLAN.md`.

---

## Database state (Neon)

| | |
|---|---|
| Tenants | 2 — `perma-demo` (3 cases), `sika-evaluation` (14 cases) |
| Users | 19, every one carrying a `personaKey` |
| Plants | 8 — 3 Perma, 5 Sika |
| Cases / actions / evidence | 17 / 27 / 17 |
| Measurements / verifications / comments / audit | 17 / 4 / 5 / 18 |
| Rows with `seedKey = null` | **0** — no client data exists yet |
| Migrations | 2, both applied; the Phase A one is additive only |

---

## Known gaps — state these plainly, do not paper over them

- **Nothing a user does in the portal persists.** The single most important
  fact about this build. Phase B.
- **Evidence upload is an in-memory `objectUrl`.** Persisting it needs blob
  storage, not just a row.
- **Sika cannot be shown their own environment.** `DEFAULT_TENANT_ID` is
  `perma-demo`, there is no selector and no environment override, and reaching
  Sika data means database mode — which breaks Dashboard coherence. Blocked
  behind the Dashboard/Analytics/Reports migration (Phase C).
- **Translation stops at the navigation.** Exactly two files call `t()`.
  ≈ 827 UI strings remain. See `LOCALIZATION_PLAN.md`.
- **Administration is read-only.**
- **Segregation of duties is enforced in the UI only.** `decideVerification`
  has no actor check. The identity mapping now makes one possible; it is not
  written yet.
- **No approved Sika logo**, so `logoPath` is null and the shell falls back to
  the QuikOps mark.
- **Analytics 90-day trends are static series.**

---

## Verification record — Phase A

| Gate | Result |
|---|---|
| `prisma validate` | pass |
| `prisma migrate deploy` | 1 migration applied, additive only — no DROP, no DELETE, no destructive ALTER |
| Seed dry run (transaction, rolled back) | reported the plan; wrote nothing |
| Seed run 1 | created 13 cases + supporting rows; adopted 4 cases and 29 child rows |
| Seed runs 2 and 3 | **created nothing**, totals identical |
| Client-data safety | planted case, comment and an edit to a seeded case → all 3 survived a reseed |
| Tenant isolation | 0 rows visible across the boundary in either direction; 0 persona keys shared |
| Persona resolution | 9/9 Perma, 10/10 Sika, no duplicates |
| `tsc --noEmit` (tsbuildinfo deleted first) | pass |
| `npx eslint .` | 0 errors, 0 warnings |
| `next build` | 19/19 entries |
| Runtime, `USE_DATABASE=true` | `/work` `/my-work` `/dashboard` `/login` → 200; the queue rendered exactly the 3 Neon cases; a fixture-only case correctly read "Case not found"; a cross-tenant case was invisible |

**Method note, again:** a case number appearing in the HTML is not proof it was
rendered — fixture strings ride along in the RSC payload. The valid
discriminators are the `<title>` and the rendered `href="/work/…"` links.

---

## Not done, deliberately

- **Not pushed, not deployed.** `origin/main` is still `011b585`. Pushing
  triggers a Vercel production build from `main`, and Phase A has not been
  approved for production. The commit sits on `main` locally.
- Phase B (server actions, rewiring the Case Detail reducer) — not started.
- Phase C (migrating the other 13 query modules) — not started.

---

## Resume from here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale dev servers before verifying anything.**
3. `USE_DATABASE` stays off by default.
4. Delete `tsconfig.tsbuildinfo` before trusting a typecheck.
5. **Ask before pushing.** A push to `main` deploys to production.
6. Phase B, in order: server actions for case → actions → evidence → comments →
   verification, each writing its audit row in the same transaction; then
   rewire `use-case-detail.ts`; then the acceptance test the client asked for
   (create through the UI, refresh, log out and in, restart, still there).
