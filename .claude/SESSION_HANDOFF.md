# Session handoff

**Session of 2026-08-17 — deep localisation of the interface layer.**

Previous state: `011b585` on `origin/main`, Sika tenant live in production, sign-in
fixed, nav translated but the page bodies still English.

---

## What this session did

The complaint that started it: switching to Spanish translated the navigation and
left the screens English. That was accurate, and the cause was structural rather
than a matter of missing strings — the catalogue already held most of them.

Three seams were missing, and each was fixed at the seam rather than per string.

### 1. Dates and due phrasing (`src/lib/format.ts`) — D-95

`formatWhen` / `formatDue` / `formatTimestamp` now take a `FormatContext`
(`{ t, locale }`). Month names come from date-fns' own locale, so a Spanish
screen reads "15 ago 2026", not "15 Aug 2026". `useFormat()` is the client half;
`getTranslations()` already satisfied the same shape on the server.

`formatNumber` groups by the tenant's currency locale, so a euro tenant no longer
mixes "512.900 €" with "1,234".

### 2. Enum labels (`src/domain/labels.ts`, new) — D-96

Priority, status, exception type, role, detection source, connector health and run
status resolve through the catalogue **at the render site**, falling back to the
authored English. The meta tables keep their English labels because the query
layer, the exporters and the filter builders read them too.

### 3. Module-scope tables

Column-header and menu tables evaluated at import became builders taking the
translator — `buildHeaders(t)`, `buildMenus(t)`, `buildColumns(t)`. Work Manager's
KPI tiles and active-filter chips (`computeKpis`, `buildFilterChips`) take the
translator as an argument and stay pure.

### Also fixed

- **Icon names were being translated.** `<Icon name={t("cd.reply")}>` renders no
  glyph in Spanish. Four sites fixed; one of them (`comments-card.tsx`) was
  already committed in `011b585`, so this is a live bug repaired, not one
  introduced. Audited every identifier-shaped prop; no others.
- **A hardcoded "Perma Construction Aids"** in `data-lineage-card.tsx`. It is a
  client component, so it cannot read the server-only tenant env — on the client
  it would always have named the fallback tenant. Now a tenant-neutral catalogue
  string.

---

## Verification

Everything below was run against a local production build (`next start`) with
`USE_DATABASE=true QUIKOPS_TENANT=sika-evaluation`, i.e. production's own config.

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors (`tsconfig.tsbuildinfo` deleted first) |
| `npx eslint .` | 0 errors, 0 warnings |
| `npm run build` | ✓ 19/19 |
| Client hook in a server component | 0 (see the check below) |
| Render errors across 12 routes × 3 locales | 0 |
| Perma leakage, **full payload**, 13 routes × 3 locales | **0** |
| Fixture mode (`USE_DATABASE` unset) | 11/11 routes 200, Perma plants + ₹, Spanish chrome works |
| Untranslated interface strings, es | 609 → 527 |
| Untranslated interface strings, pt-BR | 526 — **at parity with Spanish** |

### The check worth keeping

`check-client-hooks.mjs` (in the session scratchpad) flags any `.tsx` that calls a
client hook without `"use client"`. `tsc` cannot see this class of bug and
`next build` does not fail on it — the page throws at request time and the error
boundary shows a fallback. **Twice this session that made a coverage number
improve while a screen had actually stopped rendering.** Worth moving into the
repo as a build step.

### Method note

A coverage figure is only meaningful when every screen is confirmed to be
rendering. Check the server log for `⨯` and check each screen's own string count
before believing any number. The dashboard reporting 25 visible strings instead of
168 was a crash, not progress.

---

## What is deliberately still English — D-97

Interface is translated. Content is not, and each exclusion has its own reason:
the seeded operational corpus (case titles, root causes, playbook steps,
connector fixtures, report definitions) is content needing a domain translator;
`src/ai/prompts/*` is sent to Claude rather than shown, and interpolating into the
frozen layers would kill prompt caching; Help Centre article bodies are a separate
deliverable; route metadata is the browser tab title; CSV column values are what a
client sorts a spreadsheet on.

**The remaining ~527 counted strings are overwhelmingly those categories** —
`src/data/fixtures/*`, `src/help/*`, `src/ai/prompts/*` — not unfinished chrome.

---

## Resume from here

1. Read `CLAUDE.md`, then `.claude/` in the order it gives.
2. **Kill stale servers before verifying anything.** `npm run build` wipes `.next`.
3. Delete `tsconfig.tsbuildinfo` before trusting a typecheck.
4. Run the client-hook check after any codemod that inserts hooks.
5. Highest-value remaining localisation, in order: Help Centre headings and
   summaries; the derived narrative in `src/data/queries/*` and
   `features/*/utils/*-derive.ts` (generated sentences, template-shaped, ours to
   translate); then the corpus, if and only if a domain translator is available.

---

## Addendum — sign-in verified through the action, not the cookie

Earlier sessions marked sign-in as passing while only ever setting `qo_persona`
by hand. That is not the same test, and it is why the broken click reached the
client. This session exercised the server action itself, by POSTing to `/login`
with the `Next-Action` header against a local production build under production's
config.

| Persona | Cookie written | Redirect |
|---|---|---|
| `usr_sk_exec` | ✅ HttpOnly, SameSite=lax | `/dashboard` |
| `usr_sk_ops` | ✅ | `/work` |
| `usr_sk_owner_de` | ✅ | `/my-work` |
| `usr_sk_analyst` | ✅ | `/work` |
| `usr_sk_admin` | ✅ | `/admin` |
| `usr_rmenon` (the *other* tenant's user) | ❌ none | `/login` — correctly refused |

`signOut` clears the cookie and returns to `/login`; `switchPersona` writes the
cookie without navigating. All three behave as D-90 describes.

Note for next time: **Vercel's build assigns different server-action IDs than a
local build**, so the same POST returns 404 against production. Exercise actions
against a local production build; the deployed build runs the same source.

## Deployment

`89a0989` is on `origin/main` and live in production.

**The Git integration did not trigger a build** — the push completed and no new
deployment appeared, so production was still serving the previous build. It was
deployed with `npx vercel --prod`. Worth knowing: on this project, **pushing to
`main` is not sufficient to deploy.** Verify the deployment rather than assuming
the push did it.

Verified against `https://quikops-ai-poc.vercel.app` after deploying: 13/13
routes 200, zero Perma references in the full payload across 13 routes × 3
locales, and Spanish and Portuguese both rendering (529 / 528 untranslated
interface strings, i.e. at parity).

---

## Follow-up — the plant selector did nothing (reported from the screen)

The dropdown listed Sika's five sites correctly and clicking one changed nothing.
Four faults behind one screenshot, recorded as D-99 to D-102.

| Fault | Cause |
|---|---|
| Plant switching inert | `setPlantScope` **and** `getPlantScope` both validated the code against the demo tenant's fixture map. `SK-DE1` is not in it, so the write returned early and the read discarded the cookie. |
| Badge said "Demo Scenario · Illustrative Data" | Hardcoded to the demo tenant; its tooltip named Perma Construction Aids. Now from the tenant profile, passed down from the layout. |
| Copilot briefed on the wrong company | Prompt layer 2 named Perma, four Indian plants and rupees. Now `TenantConfig.copilotOperator`. |
| "0 plants in scope" | Counting `user.plantScope.length`; an executive's scope is `[]`, which means the whole network. |

### Verified

| Check | Result |
|---|---|
| `tsc` · ESLint · client-hook gate · `next build` | 0 · 0 · 0 · ✓ 19/19 |
| Every plant scopes the corpus | ALL 11 · DE1 2 · ES1 2 · FR1 3 · IT1 2 · PT1 2 — **and 2+2+3+2+2 = 11** |
| Unknown code (`VP01`) | refused, no cookie written |
| Header coherence | unscoped "across 5 plants" / "All 5 plants in scope"; scoped "at Leimen" / "Scoped to SK-DE1" |
| Badge | renders "Sika Evaluation Environment · Representative evaluation data…" |
| Perma sweep, full payload, 13 routes × 3 locales, plus scoped views | 0 |

### What this cost me, and the lesson

**My "zero Perma references" claim was narrower than it sounded.** It was true of
what is in the payload — and Radix renders tooltip and popover content only when
opened, so the badge tooltip naming Perma was never in it. Prompt text is not in
any payload either. A payload sweep cannot see either one.

So the sweep now has a companion: **grep the source** for tenant-specific strings
outside `src/data/fixtures/` and `src/config/tenant.ts`. That is what found the
Copilot prompt and the tooltip. Run both.

The deeper pattern, now three for three (sign-in D-93, case owner, plant scope):
**a fixture import inside a validation path is the bug.** Anything validating a
tenant-owned identifier goes through the corpus seam.
