"use client";

import * as React from "react";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { EXCEPTION_META } from "@/src/config/app-config";
import {
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORIES,
  PREVENTIVE_ACTIONS,
  SOP_LIBRARY,
  type KnowledgeArticle,
  type KnowledgeCategory,
  type PreventiveAction,
  type Sop,
} from "@/src/data/fixtures/knowledge";
import { ROLE_META } from "@/src/config/app-config";
import { formatWhen } from "@/src/lib/format";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";

/**
 * The knowledge layer: procedure, prevention and reasoning.
 *
 * Three tabs rather than three screens, because a reader arriving with a
 * question does not yet know which of the three answers it — *how do I do this*,
 * *how do I stop it happening*, and *why is it done this way* are the same
 * enquiry at different depths.
 *
 * One search box spans all three. Searching separately per kind would mean
 * knowing the answer's shape before finding it, which is precisely what someone
 * looking something up does not have.
 */

export type KnowledgeTab = "sops" | "preventive" | "articles";

const TABS: { key: KnowledgeTab; label: string; icon: string; hint: string }[] = [
  { key: "sops", label: "SOP library", icon: "ScrollText", hint: "How it is done" },
  {
    key: "preventive",
    label: "Preventive actions",
    icon: "ShieldCheck",
    hint: "How it is stopped",
  },
  { key: "articles", label: "Knowledge base", icon: "BookMarked", hint: "Why it is done" },
];

const EFFORT_TONE: Record<PreventiveAction["effort"], string> = {
  Low: "bg-success-subtle text-success-content border-success-line",
  Medium: "bg-high-subtle text-high-content border-high-line",
  High: "bg-critical-subtle text-critical-content border-critical-line",
};

/* ---------------------------------------------------------------- SOP ---- */

function SopCard({ sop }: { sop: Sop }) {
  const [open, setOpen] = React.useState(false);
  const panelId = `sop-${sop.id}`;

  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-surface-hover"
      >
        <span
          className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-hover text-content-secondary"
          aria-hidden
        >
          <Icon name={EXCEPTION_META[sop.exceptionType]?.icon ?? "ScrollText"} size="sm" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-2xs text-content-tertiary">{sop.code}</span>
            <span className="text-xs font-semibold text-content">{sop.title}</span>
            <span className="rounded-sm border border-line bg-surface-hover px-1 py-px text-2xs text-content-tertiary">
              {sop.version}
            </span>
          </span>
          <span className="mt-1 block text-2xs leading-relaxed text-content-secondary">
            {sop.purpose}
          </span>
          <span className="mt-1 block text-2xs text-content-tertiary">
            {sop.steps.length} steps · approved by {sop.approver} ·{" "}
            {formatWhen(sop.updatedAt, DEMO_NOW)}
          </span>
        </span>

        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          size="xs"
          className="mt-1 shrink-0 text-content-tertiary"
        />
      </button>

      {open ? (
        <ol id={panelId} className="anim-fade divide-y divide-line border-t border-line">
          {sop.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 bg-surface-subtle px-3.5 py-3">
              <span
                className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-2xs font-semibold text-content-secondary ring-1 ring-line"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-content">{step.title}</span>
                <span className="mt-0.5 block text-2xs leading-relaxed text-content-secondary">
                  {step.detail}
                </span>
                <span className="mt-1.5 flex items-start gap-1.5 rounded-md border border-high-line bg-high-subtle px-2 py-1.5 text-2xs leading-relaxed text-high-content">
                  <Icon name="TriangleAlert" size="xs" className="mt-px shrink-0" />
                  {step.guardrail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}

/* --------------------------------------------------------- Preventive ---- */

function PreventiveCard({ action }: { action: PreventiveAction }) {
  return (
    <li className="rounded-lg border border-line bg-surface px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold text-content">{action.title}</p>
        <span
          className={cn(
            "shrink-0 rounded-sm border px-1.5 py-px text-2xs font-medium",
            EFFORT_TONE[action.effort],
          )}
        >
          {action.effort} effort
        </span>
      </div>

      <dl className="mt-2 space-y-2">
        {[
          { term: "Addresses", detail: action.addresses, icon: "Target" },
          { term: "Intervention", detail: action.intervention, icon: "ListChecks" },
          { term: "Success signal", detail: action.successSignal, icon: "TrendingDown" },
        ].map((row) => (
          <div key={row.term} className="flex gap-2">
            <Icon
              name={row.icon}
              size="xs"
              className="mt-0.5 shrink-0 text-content-tertiary"
            />
            <div className="min-w-0">
              <dt className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
                {row.term}
              </dt>
              <dd className="text-2xs leading-relaxed text-content-secondary">
                {row.detail}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-2 flex items-center gap-1.5 border-t border-line pt-2 text-2xs text-content-tertiary">
        <Icon name="UserCog" size="xs" />
        Owned by {ROLE_META[action.owningRole].label}
      </p>
    </li>
  );
}

/* ---------------------------------------------------------- Articles ----- */

function ArticleCard({ article }: { article: KnowledgeArticle }) {
  const [open, setOpen] = React.useState(false);
  const panelId = `kb-${article.id}`;

  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-surface-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-content">{article.title}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-content-secondary">
            {article.summary}
          </span>
          <span className="mt-1 flex items-center gap-2 text-2xs text-content-tertiary">
            <span className="flex items-center gap-1">
              <Icon name="Clock" size="xs" />
              {article.readMinutes} min read
            </span>
            {article.relatedSopCodes.length > 0 ? (
              <span className="font-mono">{article.relatedSopCodes.join(" · ")}</span>
            ) : null}
          </span>
        </span>
        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          size="xs"
          className="mt-1 shrink-0 text-content-tertiary"
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="anim-fade space-y-2 border-t border-line bg-surface-subtle px-3.5 py-3"
        >
          {article.body.map((paragraph, index) => (
            <p key={index} className="text-2xs leading-relaxed text-content-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------- Section --- */

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

export function KnowledgePanels() {
  const [tab, setTab] = React.useState<KnowledgeTab>("sops");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<KnowledgeCategory | null>(null);

  const needle = query.trim().toLowerCase();

  const sops = React.useMemo(
    () =>
      SOP_LIBRARY.filter(
        (sop) =>
          (category === null || sop.category === category) &&
          (needle === "" ||
            matches(
              `${sop.code} ${sop.title} ${sop.purpose} ${sop.steps.map((s) => s.title).join(" ")}`,
              needle,
            )),
      ),
    [needle, category],
  );

  const preventive = React.useMemo(
    () =>
      PREVENTIVE_ACTIONS.filter(
        (action) =>
          (category === null || action.category === category) &&
          (needle === "" ||
            matches(
              `${action.title} ${action.addresses} ${action.intervention} ${action.successSignal}`,
              needle,
            )),
      ),
    [needle, category],
  );

  const articles = React.useMemo(
    () =>
      KNOWLEDGE_ARTICLES.filter(
        (article) =>
          (category === null || article.category === category) &&
          (needle === "" ||
            matches(
              `${article.title} ${article.summary} ${article.keywords.join(" ")} ${article.body.join(" ")}`,
              needle,
            )),
      ),
    [needle, category],
  );

  const counts: Record<KnowledgeTab, number> = {
    sops: sops.length,
    preventive: preventive.length,
    articles: articles.length,
  };

  return (
    <div className="space-y-3">
      {/* Search spans all three kinds: a reader looking something up does not
          yet know whether the answer is a procedure, a prevention or a reason. */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 sm:max-w-sm">
          <Icon name="Search" size="sm" className="shrink-0 text-content-tertiary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search procedures, preventions and articles"
            aria-label="Search the knowledge layer"
            className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-content-tertiary"
          />
          {query !== "" ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 text-content-tertiary hover:text-content"
            >
              <Icon name="X" size="xs" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={category === null ? "subtle" : "ghost"}
            size="xs"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
          >
            All
          </Button>
          {KNOWLEDGE_CATEGORIES.map((entry) => (
            <Button
              key={entry}
              variant={category === entry ? "subtle" : "ghost"}
              size="xs"
              onClick={() => setCategory(entry)}
              aria-pressed={category === entry}
            >
              {entry}
            </Button>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Knowledge type"
        className="flex flex-wrap items-center gap-1 border-b border-line print:hidden"
      >
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-xs transition-colors duration-150",
              tab === entry.key
                ? "border-accent font-medium text-content"
                : "border-transparent text-content-tertiary hover:text-content-secondary",
            )}
          >
            <Icon name={entry.icon} size="xs" />
            {entry.label}
            <span className="text-2xs text-content-tertiary">{counts[entry.key]}</span>
          </button>
        ))}
        <span className="ml-auto hidden pb-1.5 text-2xs text-content-tertiary sm:block">
          {TABS.find((entry) => entry.key === tab)?.hint}
        </span>
      </div>

      {counts[tab] === 0 ? (
        <EmptyState
          icon="SearchX"
          size="sm"
          title="Nothing matches"
          description={
            needle === ""
              ? "No content in this category yet."
              : `No procedure, prevention or article mentions "${query.trim()}".`
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
            >
              Clear search and filters
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {tab === "sops"
            ? sops.map((sop) => <SopCard key={sop.id} sop={sop} />)
            : tab === "preventive"
              ? preventive.map((action) => (
                  <PreventiveCard key={action.id} action={action} />
                ))
              : articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
        </ul>
      )}
    </div>
  );
}
