# QuikOps AI — POC (Phases 1–3)

Operational execution platform. Executive Dashboard slice.

## Run locally

```bash
npm install
npm run build && npm start   # http://localhost:3000
# or
npm run dev
```

No database or environment variables are required for Phases 1–3. All data is
served from typed fixtures through `src/data/queries/`.

## Verified in this build

- `npx tsc --noEmit` — clean under strict mode (`noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`)
- `npx next build` — 15 routes compiled, 0 errors
- All routes return 200 with zero server render errors

## Structure

| Path | Contains |
|---|---|
| `app/globals.css` | Every design token. No colour, size or radius is declared anywhere else. |
| `src/domain/` | Framework-free business logic. No React, Prisma or Next imports. |
| `src/data/fixtures/` | Seeded business data — plants, users, 24 cases, metrics, AI output. |
| `src/data/queries/` | Data-access layer. **The only files that change when Neon connects.** |
| `components/patterns/` | The 12-component assembly kit. |
| `components/shell/` | Sidebar, top bar, search, notifications, role switcher. |
| `features/dashboard/` | Dashboard panels only. |

## Swapping fixtures for Neon

Each function in `src/data/queries/dashboard.ts` is async and returns a finished
view model. Replace the body with a Prisma query returning the same shape. No
component changes are required.
