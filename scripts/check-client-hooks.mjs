// Gate: a client hook called from a server component.
//
// `tsc` cannot see this and `next build` does not fail on it — the page compiles,
// renders, throws at request time, and the error boundary shows a fallback. From
// the outside that looks like a screen with less content on it, which is exactly
// how it slipped through twice: the audit counted fewer strings and read as
// progress.
//
// Pass `--fix` to add the directive. These are leaf presentational components,
// and a client component still renders perfectly well from a server parent.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";

const HOOKS = /\b(useT|useFormat|useLabels|useTranslation|useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer)\s*\(/;

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
};

const offenders = [];
for (const file of ["features", "components", "app"].flatMap((root) => walk(root))) {
  const source = readFileSync(file, "utf8");
  if (!HOOKS.test(source)) continue;
  if (/^["']use client["'];/m.test(source)) continue;
  // React.useMemo etc. inside a file that only re-exports is still a call, so
  // the directive is required either way — no exemption here.
  offenders.push(file);
}

if (process.argv.includes("--fix")) {
  for (const file of offenders) {
    writeFileSync(file, `"use client";\n\n${readFileSync(file, "utf8")}`);
  }
  console.warn(`"use client" added to ${offenders.length} files`);
} else {
  console.warn(`server components calling a client hook: ${offenders.length}`);
  for (const file of offenders) console.warn(`  ${file}`);
}

process.exit(offenders.length && !process.argv.includes("--fix") ? 1 : 0);
