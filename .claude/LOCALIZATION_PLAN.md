# LOCALIZATION_PLAN

> What it would take to ship Spanish and Portuguese, measured rather than
> estimated. Written during Phase A (2026-08-15) because the client has said
> their own translation work starts shortly and needs somewhere to land.
>
> **Nothing here is implemented.** Phase A prepared the ground and measured the
> work; the extraction itself is not done and must not be reported as done.

---

## 1. Verdict in one line

**The mechanism is ready. The strings are not.** Spanish and Portuguese can be
added without changing a line of application logic — but today only the
navigation is translatable, because only two files in the codebase ask for a
translation.

---

## 2. What exists and works

| Piece | State |
|---|---|
| Locale registry — `src/i18n/config.ts` | ✅ six locales: `en`, `es`, `pt-BR`, `de`, `fr`, `ja` |
| Catalogues — `src/i18n/messages/*.json` | ✅ one per locale, 35 keys each, same shape |
| Provider — `src/i18n/provider.tsx` | ✅ context, `t()`, `{param}` interpolation, cookie persistence, dynamic catalogue import |
| Fallback chain | ✅ active catalogue → English → the key itself |
| Locale switcher — `components/shell/platform-controls.tsx` | ✅ works, persists to `qo_locale` |
| Per-tenant language list — `src/config/tenant.ts` | ✅ Sika offers `en`, `es`, `pt-BR` |
| Locale-aware formatting — `src/lib/format.ts` | ✅ reads the BCP-47 tag from the provider |

Two properties matter more than the rest, and both hold:

- **A missing translation cannot break a screen.** `t()` falls through to
  English and then to the key, so a half-finished catalogue degrades to English
  instead of rendering blanks or crashing.
- **Adding a language is data, not code.** Dropping `es.json` in with more keys
  changes no logic, no component and no route. The client's translators can
  work against a JSON file.

Verified on the live production build: navigation renders *Executive Dashboard*
/ *Panel ejecutivo* / *Painel executivo* under the three locales.

---

## 3. What is missing

**Exactly two files consume the translator**, repo-wide:

```
components/shell/side-nav.tsx          → t() for navigation labels
components/shell/platform-controls.tsx → the locale switcher itself
```

Everything else is a hard-coded English literal. That is why page bodies stay
English when the language changes.

### Measured scope

Counted by scanning JSX text nodes and text-bearing props across `.tsx`, and
user-visible object-literal strings across the configuration and domain layers.
Method is heuristic and errs toward over-counting; treat these as the right
order of magnitude, not a contract.

| Area | Files | Using `t()` | Candidate strings |
|---|---:|---:|---:|
| `features/` | 107 | 0 | **559** |
| `app/` | 44 | 0 | 66 |
| `components/` | 48 | 2 | 64 |
| `src/config/` (nav, KPI, status labels) | 2 | 0 | 52 |
| `src/domain/` (band, status, health labels) | 14 | 0 | 85 |
| `src/lib/` | 7 | 0 | 1 |
| **UI chrome total** | | | **≈ 827** |
| `src/data/fixtures/` (business content) | 10 | 0 | 255 |

Worst-affected features, by candidate count: `analytics`, `case-detail`,
`work-manager`, `action-center`, `reports` — the screens with the most
labels, tooltips and empty states.

### The line the client drew, and where it falls

The client asked that business data values not be translated. That line is
already visible in the numbers above:

- **≈ 827 UI-chrome strings** — buttons, filters, column headers, empty states,
  validation messages, KPI and status labels. **These are the translation
  work.**
- **255 fixture strings** — case titles, descriptions, root causes, playbook
  steps. **These are content, not chrome.** They need a translator with domain
  context, and in production they belong in the database with a locale column
  rather than in a string table. Case numbers, plant codes, material codes,
  customer and supplier identifiers are **never** translated.

---

## 4. Recommended plan

Ordered so that value lands early and nothing is thrown away.

| # | Step | Size | Notes |
|---|---|---|---|
| 1 | **Freeze the key convention** — `area.component.thing`, flat map, `{param}` interpolation | S | The catalogue is already flat; write the convention down before 800 keys exist under two conventions |
| 2 | **Extract the shared layer first** — `src/config` + `src/domain` labels (137 strings) | M | Highest leverage in the codebase: status, priority band and KPI labels appear on nearly every screen, so this alone visibly moves several pages |
| 3 | **Extract `components/`** (64) | S | Shared UI — tables, empty states, toolbars |
| 4 | **Extract features screen by screen** (559), in demo order: Dashboard → Work Manager → Case Detail → My Work → the rest | L | One screen per pass, each independently verifiable; a partial pass is safe because untranslated keys fall back to English |
| 5 | **Hand the client `en.json`** as the source of truth to translate | — | They return `es.json` and `pt-BR.json` with the same keys; no code change to accept them |
| 6 | **Business content** — locale column on the case corpus | M | Only if the client wants seeded case narratives in Spanish and Portuguese. Not required for a language demo |
| 7 | **Pseudo-locale check** | S | Render with every value replaced by `[[…]]` to find literals that escaped extraction — the only reliable way to prove coverage |

**Do not** machine-translate operational terminology. "Corrective action",
"verification", "on-time in full" and "days of cover" carry specific meaning in
this domain, and a wrong word in a KPI label is worse than an English one. Send
the terminology list to the client for approval before the catalogue is filled.

---

## 5. Honest status

| Question | Answer |
|---|---|
| Is English fully functional? | **Yes** — verified in production |
| Can Spanish be added without changing application logic? | **Yes** — the mechanism takes it as data |
| Can Portuguese be added without changing application logic? | **Yes** — `pt-BR` is registered, catalogued and switchable |
| Is Spanish complete? | **No** — 35 keys, navigation only |
| Is Portuguese complete? | **No** — 35 keys, navigation only |
| Would English break while ES/PT are prepared? | **No** — English is the fallback at every level |
| How much remains? | **≈ 827 UI strings** to extract, plus 255 business-content strings that should not go through the string table at all |
