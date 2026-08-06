"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { ModuleToolbar } from "@/components/patterns/module-toolbar";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { HELP_ARTICLES, type HelpArticle } from "@/src/help/content";
import { PDF_GUIDES, WALKTHROUGH_VIDEOS } from "@/src/help/guides";
import {
  buildSearchIndex,
  searchDocumentation,
  SEARCH_KIND_META,
} from "@/src/help/search";
import { exportPdf } from "@/src/lib/export";
import { cn } from "@/src/lib/cn";

/**
 * The Help Center.
 *
 * Search runs over one flat index covering screens, articles, individual FAQ
 * answers and KPI definitions — so "why can I not verify my own case" lands on
 * the answer rather than on the article containing it.
 *
 * PDF guides print through the same pipeline the reports use: the article body
 * *is* the document, with `print:` variants hiding the chrome.
 */

const CATEGORIES = ["Overview", "Using QuikOps", "Reference", "Support"] as const;

function ArticleBody({ article }: { article: HelpArticle }) {
  return (
    <div className="space-y-2.5">
      {article.blocks.map((block, index) => {
        if (block.kind === "paragraph") {
          return (
            <p key={index} className="text-xs leading-relaxed text-content-secondary">
              {block.text}
            </p>
          );
        }
        if (block.kind === "steps") {
          return (
            <ol key={index} className="space-y-1.5">
              {(block.items ?? []).map((item, stepIndex) => (
                <li key={item} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-2xs font-semibold text-content-secondary">
                    {stepIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-content-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={index} className="space-y-1.5">
            {(block.items ?? []).map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-content-tertiary" />
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-content-secondary">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

export function HelpCenterView() {
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(HELP_ARTICLES[0]?.id ?? null);

  const index = React.useMemo(() => buildSearchIndex(), []);
  const results = React.useMemo(
    () => (query.trim() === "" ? [] : searchDocumentation(index, query)),
    [index, query],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Help Center"
        description="How QuikOps AI works, what each screen is for, and the answers to the questions that come up most."
        meta={
          <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="BookMarked" size="xs" />
            {HELP_ARTICLES.length} articles · {PDF_GUIDES.length} downloadable guides
          </span>
        }
      />

      <ModuleToolbar
        search={{
          value: query,
          placeholder: "Search screens, documentation, questions and settings",
          ariaLabel: "Search documentation",
          onChange: setQuery,
        }}
        isFiltered={query.trim() !== ""}
        onClearAll={() => setQuery("")}
        resultLabel={query.trim() === "" ? undefined : `${results.length} results`}
      />

      {query.trim() !== "" ? (
        <SectionCard title="Search results" subtitle={`for “${query.trim()}”`} icon="Search">
          {results.length === 0 ? (
            <EmptyState
              icon="SearchX"
              title="Nothing found"
              description="Try a screen name, a metric, or a question in your own words."
              size="sm"
            />
          ) : (
            <ul className="space-y-1.5">
              {results.map((entry) => {
                const meta = SEARCH_KIND_META[entry.kind];
                return (
                  <li key={entry.id}>
                    <Link
                      href={entry.href}
                      className="flex min-w-0 items-start gap-2.5 rounded-md border border-line bg-surface px-3 py-2 transition-colors duration-150 hover:border-accent-line hover:bg-accent-subtle"
                    >
                      <Icon
                        name={meta.icon}
                        size="sm"
                        className="mt-0.5 shrink-0 text-content-tertiary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-content">
                          {entry.title}
                        </span>
                        <span className="block text-2xs leading-relaxed text-content-tertiary">
                          {entry.subtitle}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-sm border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs text-content-tertiary">
                        {meta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          {CATEGORIES.map((category) => {
            const articles = HELP_ARTICLES.filter((a) => a.category === category);
            if (articles.length === 0) return null;

            return (
              <SectionCard
                key={category}
                title={category}
                subtitle={`${articles.length} articles`}
                icon="BookMarked"
                className="mb-4"
              >
                <ul className="space-y-2">
                  {articles.map((article) => {
                    const open = openId === article.id;
                    return (
                      <li
                        key={article.id}
                        id={article.id}
                        className="scroll-mt-20 rounded-md border border-line"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : article.id)}
                          aria-expanded={open}
                          className="flex w-full min-w-0 items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-hover"
                        >
                          <Icon
                            name={article.icon}
                            size="sm"
                            className="mt-0.5 shrink-0 text-content-tertiary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-content">
                              {article.title}
                            </span>
                            <span className="block text-2xs text-content-tertiary">
                              {article.summary}
                            </span>
                          </span>
                          <Icon
                            name={open ? "ChevronUp" : "ChevronDown"}
                            size="xs"
                            className="mt-0.5 shrink-0 text-content-tertiary"
                          />
                        </button>
                        {open ? (
                          <div className="anim-settle border-t border-line px-3 py-3">
                            <ArticleBody article={article} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            );
          })}
        </div>

        <div className="min-w-0 space-y-4 xl:col-span-4">
          <SectionCard
            title="Downloadable guides"
            subtitle="Printed through the browser — choose Save as PDF"
            icon="FileText"
          >
            <ul className="space-y-1.5">
              {PDF_GUIDES.map((guide) => (
                <li
                  key={guide.id}
                  className="flex min-w-0 items-start gap-2.5 rounded-md border border-line px-3 py-2"
                >
                  <Icon
                    name={guide.icon}
                    size="sm"
                    className="mt-0.5 shrink-0 text-content-tertiary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-content">
                      {guide.title}
                    </span>
                    <span className="block text-2xs text-content-tertiary">
                      {guide.audience}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={exportPdf}
                    aria-label={`Download ${guide.title}`}
                  >
                    <Icon name="Download" size="xs" />
                    PDF
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Walkthrough videos"
            subtitle="Chapters and transcripts, once recorded"
            icon="Play"
          >
            <ul className="space-y-2">
              {WALKTHROUGH_VIDEOS.map((video) => (
                <li key={video.id} className="rounded-md border border-line p-2.5">
                  <div
                    className={cn(
                      "flex h-20 items-center justify-center rounded-sm border border-dashed border-line-strong bg-surface-subtle",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
                      <Icon name="Play" size="sm" />
                      {video.isPlaceholder ? "Not yet recorded" : "Ready"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-content">{video.title}</p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-content-tertiary">
                    {video.description}
                  </p>
                  <ol className="mt-1.5 space-y-0.5">
                    {video.chapters.map((chapter) => (
                      <li
                        key={chapter.label}
                        className="flex items-baseline gap-2 text-2xs text-content-tertiary"
                      >
                        <span className="font-mono tabular-nums">
                          {String(Math.floor(chapter.at / 60)).padStart(2, "0")}:
                          {String(chapter.at % 60).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{chapter.label}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
