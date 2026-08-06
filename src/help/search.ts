import { NAVIGATION } from "@/src/config/app-config";
import { HELP_ARTICLES, SCREEN_DOCS } from "./content";

/**
 * The documentation search index.
 *
 * One flat, scored array rather than a search library: a few hundred entries
 * matched by substring is instant, and adding a dependency for a demo would be
 * a poor trade. Ranking is exact > prefix > substring, so typing "cop" finds
 * the Copilot guide before it finds anything merely mentioning it.
 */

export type SearchEntryKind = "module" | "article" | "faq" | "setting" | "playbook";

export interface SearchEntry {
  id: string;
  kind: SearchEntryKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
}

export const SEARCH_KIND_META: Record<SearchEntryKind, { label: string; icon: string }> = {
  module: { label: "Screens", icon: "LayoutDashboard" },
  article: { label: "Documentation", icon: "BookMarked" },
  faq: { label: "Questions", icon: "CircleHelp" },
  setting: { label: "Settings", icon: "Settings2" },
  playbook: { label: "Playbooks", icon: "ListChecks" },
};

export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const section of NAVIGATION) {
    for (const item of section.items) {
      const doc = Object.values(SCREEN_DOCS).find((entry) => entry.title === item.label);
      entries.push({
        id: `module:${item.key}`,
        kind: "module",
        title: item.label,
        subtitle: doc?.purpose ?? "Open this screen",
        href: item.href,
        keywords: [item.key, section.label ?? ""],
      });
    }
  }

  for (const article of HELP_ARTICLES) {
    entries.push({
      id: `article:${article.id}`,
      kind: "article",
      title: article.title,
      subtitle: article.summary,
      href: `/help#${article.id}`,
      keywords: article.keywords,
    });

    // FAQ and troubleshooting items are individually findable — "why can I not
    // verify my own case" should land on the answer, not on the article.
    if (article.id === "faq" || article.id === "troubleshooting") {
      for (const block of article.blocks) {
        for (const item of block.items ?? []) {
          entries.push({
            id: `faq:${item.slice(0, 32)}`,
            kind: "faq",
            title: item.split(/[.?]/)[0] ?? item,
            subtitle: item,
            href: `/help#${article.id}`,
            keywords: article.keywords,
          });
        }
      }
    }
  }

  for (const doc of Object.values(SCREEN_DOCS)) {
    for (const kpi of doc.kpisExplained) {
      entries.push({
        id: `setting:${doc.moduleKey}:${kpi.label}`,
        kind: "setting",
        title: kpi.label,
        subtitle: `${kpi.detail} — ${doc.title}`,
        href: doc.relatedScreens[0]?.href ?? "/dashboard",
        keywords: [doc.moduleKey, doc.title],
      });
    }
  }

  return entries;
}

/** Exact title beats prefix beats substring; keywords score lowest. */
export function scoreEntry(entry: SearchEntry, needle: string): number {
  const query = needle.trim().toLowerCase();
  if (query === "") return 0;

  const title = entry.title.toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (entry.subtitle.toLowerCase().includes(query)) return 40;
  if (entry.keywords.some((keyword) => keyword.toLowerCase().includes(query))) return 20;
  return 0;
}

export function searchDocumentation(
  index: SearchEntry[],
  query: string,
  limit = 12,
): SearchEntry[] {
  return index
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map((result) => result.entry);
}
