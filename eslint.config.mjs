import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Flat ESLint config.
 *
 * `next lint` is deprecated in Next 16, so this targets the ESLint CLI directly.
 * `FlatCompat` bridges `eslint-config-next`, which still ships an eslintrc-style
 * config.
 *
 * The rules below are the ones that would have caught real defects in this
 * codebase: unused code, missing hook dependencies, and `<img>` in place of
 * `next/image`. Stylistic rules are left off — Prettier-style disagreements are
 * not what a lint run is for.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    // This file is deliberately *not* ignored. `next build` detects the Next
    // ESLint plugin by resolving the config that applies to `eslint.config.mjs`
    // itself; an ignored file resolves to no config at all, which is what
    // printed "the Next.js plugin was not detected" on every build.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Unused code is dead code. `_`-prefixed args stay allowed for the
      // signature-shape cases (event handlers that ignore their argument).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Exhaustive deps is a warning upstream; here it is an error, because the
      // stale-closure bugs it catches are exactly the class this codebase has
      // already hit twice (D-24).
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
];

export default config;
