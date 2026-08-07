"use client";

import * as React from "react";
import Link from "next/link";
import { ActionToast } from "@/components/patterns/action-toast";
import { DataTable, type DataTableColumn } from "@/components/patterns/data-table";
import { Icon } from "@/components/patterns/icon";
import { KpiTileRow, type KpiTileModel } from "@/components/patterns/kpi-tile";
import { ModuleToolbar } from "@/components/patterns/module-toolbar";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PageHeader } from "@/components/patterns/page-header";
import { FirstUseTip } from "@/components/patterns/in-app-tip";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { FormField, FIELD_CLASS } from "@/components/patterns/form-field";
import {
  DepartmentPanel,
  PermissionMatrix,
  RoleLegend,
  SettingsGroupPanel,
  type DepartmentLoad,
} from "./governance-panels";
import {
  buildSettingsGroups,
  departmentForJobTitle,
  DEPARTMENTS,
} from "@/src/domain/platform-settings";
import {
  COPILOT_EFFORT,
  COPILOT_MAX_TOKENS,
  COPILOT_MODEL,
  MAX_CONTEXT_CHARS,
  MAX_HISTORY_TURNS,
  MAX_QUESTION_CHARS,
} from "@/src/ai/config";
import { isOpenStatus } from "@/src/domain/case-status";
import { hasBreachedSla } from "@/src/domain/portfolio-metrics";
import { KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";
import { ROLE_META } from "@/src/config/app-config";
import {
  previewSlaChange,
  previewWeightChange,
  PRIORITY_WEIGHTS,
  SLA_TARGET_HOURS,
  type PriorityWeights,
  type SlaTargets,
} from "@/src/domain/config-preview";
import type { AdministrationData } from "@/src/data/queries/administration";
import type { User } from "@/src/domain/types";
import { PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { exportPdf, exportTableCsv, type CsvColumn } from "@/src/lib/export";
import { caseHref } from "@/src/lib/routes";

/**
 * Administration.
 *
 * Users and roles are a table; the valuable half is the configuration preview.
 * `computePriority` is pure, so re-scoring the whole corpus under draft weights
 * is instant — and showing which cases would change band *before* saving is
 * what separates this from a settings page nobody trusts.
 */

const USER_CSV: CsvColumn<User>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Email", value: (row) => row.email },
  { header: "Role", value: (row) => ROLE_META[row.role].label },
  { header: "Job title", value: (row) => row.jobTitle },
  { header: "Plant scope", value: (row) => row.plantScope.join(" ") },
  { header: "Active", value: (row) => (row.isActive ? "Yes" : "No") },
];

const WEIGHT_LABELS: { key: keyof PriorityWeights; label: string; hint: string }[] = [
  { key: "revenueAtRisk", label: "Revenue at risk", hint: "Saturates at $250,000" },
  { key: "kpiDeviation", label: "KPI deviation", hint: "Saturates at 12 points below target" },
  { key: "customerTier", label: "Customer tier", hint: "Tier one carries the full weight" },
  { key: "urgency", label: "Days to promised date", hint: "Full weight once the date has passed" },
  { key: "recurrence", label: "Recurrence", hint: "Logarithmic; saturates at 6 detections" },
  { key: "escalation", label: "Escalation level", hint: "Saturates at level 3" },
];

export function AdministrationView({ data }: { data: AdministrationData }) {
  const [search, setSearch] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [weights, setWeights] = React.useState<PriorityWeights>({ ...PRIORITY_WEIGHTS });
  const [targets, setTargets] = React.useState<SlaTargets>({ ...SLA_TARGET_HOURS });

  const weightsDirty = WEIGHT_LABELS.some(
    ({ key }) => weights[key] !== PRIORITY_WEIGHTS[key],
  );
  const targetsDirty = PRIORITY_BANDS.some(
    (band) => targets[band] !== SLA_TARGET_HOURS[band],
  );

  const weightPreview = React.useMemo(
    () => previewWeightChange(data.cases, weights),
    [data.cases, weights],
  );
  const slaPreview = React.useMemo(
    () => previewSlaChange(data.cases, targets, DEMO_NOW),
    [data.cases, targets],
  );

  const visibleUsers = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") return data.users;
    return data.users.filter((user) =>
      `${user.name} ${user.email} ${user.jobTitle} ${ROLE_META[user.role].label}`
        .toLowerCase()
        .includes(needle),
    );
  }, [data.users, search]);

  const kpis = React.useMemo<KpiTileModel[]>(
    () => [
      {
        key: "users",
        label: "Users",
        value: data.users.length,
        format: "count",
        footnote: `${data.users.filter((u) => u.isActive).length} active`,
        icon: "Users",
        tone: "accent",
      },
      {
        key: "assignable",
        label: "Assignable owners",
        value: data.assignableCount,
        format: "count",
        footnote: "Executives sponsor work; they do not own it",
        icon: "UserCog",
        tone: "neutral",
      },
      {
        key: "plants",
        label: "Plants",
        value: data.plants.length,
        format: "count",
        footnote: data.plants.map((p) => p.code).join(" · "),
        icon: "Factory",
        tone: "neutral",
      },
      {
        key: "rules",
        label: "Routing rules",
        value: data.routingRules.length,
        format: "count",
        footnote: "Plant and exception type to default owner",
        icon: "Settings2",
        tone: "success",
      },
    ],
    [data],
  );

  const userColumns = React.useMemo<DataTableColumn<User>[]>(
    () => [
      {
        key: "name",
        label: "User",
        render: (row) => (
          <span className="flex min-w-0 items-center gap-2">
            <OwnerAvatar user={row} size="sm" showName={false} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-content">{row.name}</span>
              <span className="block truncate text-2xs text-content-tertiary">{row.email}</span>
            </span>
          </span>
        ),
      },
      {
        key: "role",
        label: "Role",
        className: "w-44",
        render: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-2xs text-content">
              {ROLE_META[row.role].label}
            </span>
            <span className="block truncate text-2xs text-content-tertiary">{row.jobTitle}</span>
          </span>
        ),
      },
      {
        key: "scope",
        label: "Plant scope",
        className: "w-40",
        render: (row) => (
          <span className="flex flex-wrap gap-1">
            {row.plantScope.map((code) => (
              <span
                key={code}
                className="rounded-sm border border-line bg-surface-subtle px-1 py-px font-mono text-2xs text-content-secondary"
              >
                {code}
              </span>
            ))}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        className: "w-24",
        render: (row) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
              row.isActive
                ? "border-success-line bg-success-subtle text-success-content"
                : "border-line bg-surface-hover text-content-tertiary",
            )}
          >
            {row.isActive ? "Active" : "Disabled"}
          </span>
        ),
      },
    ],
    [],
  );

  const exportUsers = React.useCallback(() => {
    const filename = exportTableCsv({
      moduleSlug: "administration-users",
      rows: visibleUsers,
      columns: USER_CSV,
    });
    setNotice(`Exported ${filename}`);
  }, [visibleUsers]);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Department load, joined through the case owner.
   *
   * Nothing is stored on the case: a person's job title places them in a team,
   * and the cases they own follow. A reassignment therefore moves work between
   * teams with nothing re-tagged — and an unowned case is deliberately absent
   * from the split rather than bucketed as "unknown".
   */
  const departmentLoads = React.useMemo<DepartmentLoad[]>(() => {
    const byId = new Map(data.users.map((user) => [user.id, user]));

    return DEPARTMENTS.map((department) => {
      const people = data.users.filter(
        (user) =>
          user.isActive && departmentForJobTitle(user.jobTitle)?.id === department.id,
      );
      const owned = data.cases.filter((item) => {
        if (item.ownerId === null || !isOpenStatus(item.status)) return false;
        const owner = byId.get(item.ownerId);
        return owner ? departmentForJobTitle(owner.jobTitle)?.id === department.id : false;
      });

      return {
        departmentId: department.id,
        people,
        openCases: owned.length,
        openExposure: owned.reduce((sum, item) => sum + item.revenueAtRisk, 0),
        breachedOpen: owned.filter((item) => hasBreachedSla(item, DEMO_NOW)).length,
      };
    });
  }, [data.users, data.cases]);

  const unowned = React.useMemo(() => {
    const items = data.cases.filter(
      (item) => isOpenStatus(item.status) && item.ownerId === null,
    );
    return {
      count: items.length,
      exposure: items.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    };
  }, [data.cases]);

  // Read from the modules that own them, so this screen cannot describe a
  // configuration the product is not actually running.
  const settingsGroups = React.useMemo(
    () =>
      buildSettingsGroups({
        copilotModel: COPILOT_MODEL,
        copilotEffort: COPILOT_EFFORT,
        copilotMaxTokens: COPILOT_MAX_TOKENS,
        maxQuestionChars: MAX_QUESTION_CHARS,
        maxHistoryTurns: MAX_HISTORY_TURNS,
        maxContextChars: MAX_CONTEXT_CHARS,
        isLiveMode: data.isCopilotLive,
        measurementWindowDays: KPI_MEASUREMENT_WINDOW_DAYS,
        slaTargets: targets,
      }),
    [data.isCopilotLive, targets],
  );

  const resetWeights = () => setWeights({ ...PRIORITY_WEIGHTS });
  const resetTargets = () => setTargets({ ...SLA_TARGET_HOURS });

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="admin"
        title="Administration"
        description="Users, roles, plant scoping, assignment routing, SLA thresholds and priority weights — with a live preview of what each change would do."
        meta={
          <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="Settings2" size="xs" />
            {data.users.length} users · {data.plants.length} plants
          </span>
        }
      />

      <FirstUseTip screen="admin" />

      <KpiTileRow kpis={kpis} />

      {notice ? (
        <ActionToast
          message={notice}
          tone="success"
          placement="floating"
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {/* Users */}
      <SectionCard
        title="Users and roles"
        subtitle="Only operations managers, task owners and analysts can be assigned a case"
        icon="Users"
        flush
        action={
          <span className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportUsers}>
              <Icon name="Download" size="sm" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportPdf}>
              <Icon name="FileText" size="sm" />
              PDF
            </Button>
          </span>
        }
      >
        <div className="border-b border-line px-3 py-2">
          <ModuleToolbar
            search={{
              value: search,
              placeholder: "Search users, roles, job titles",
              ariaLabel: "Search users",
              onChange: setSearch,
            }}
            isFiltered={search.trim() !== ""}
            onClearAll={() => setSearch("")}
            resultLabel={`${visibleUsers.length} users`}
          />
        </div>
        <DataTable<User>
          rows={visibleUsers}
          columns={userColumns}
          rowKey={(row) => row.id}
          minWidthClass="min-w-160"
          resultLabel={`${visibleUsers.length} users`}
          empty={{
            icon: "SearchX",
            title: "No users match",
            description: "Try a different search term.",
          }}
        />
      </SectionCard>

      {/* Priority weights */}
      <div data-tour="admin-weights">
        <SectionCard
          title="Priority weights"
          subtitle="Re-scored across every open case as you change them. Nothing is saved until you apply."
          icon="Target"
          action={
            weightsDirty ? (
              <Button variant="ghost" size="xs" onClick={resetWeights}>
                <Icon name="RefreshCw" size="xs" />
                Reset
              </Button>
            ) : null
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {WEIGHT_LABELS.map(({ key, label, hint }) => (
                <FormField key={key} label={label} htmlFor={`weight-${key}`} hint={hint}>
                  <input
                    id={`weight-${key}`}
                    type="number"
                    min={0}
                    max={60}
                    value={weights[key]}
                    onChange={(event) =>
                      setWeights((previous) => ({
                        ...previous,
                        [key]: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                    className={FIELD_CLASS}
                  />
                </FormField>
              ))}
            </div>

            <div className="min-w-0 rounded-md border border-line bg-surface-subtle p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                Preview
              </p>

              <ul className="mt-2 space-y-1.5">
                {weightPreview.distribution.map((entry) => (
                  <li key={entry.band} className="flex items-center gap-2">
                    <PriorityChip band={entry.band} size="sm" />
                    <span className="flex-1 text-2xs tabular-nums text-content-secondary">
                      {entry.before} → {entry.after}
                    </span>
                    {entry.delta !== 0 ? (
                      <span
                        className={cn(
                          "text-2xs font-semibold tabular-nums",
                          entry.delta > 0 ? "text-critical-content" : "text-success-content",
                        )}
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta}
                      </span>
                    ) : (
                      <span className="text-2xs text-content-tertiary">no change</span>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-3 border-t border-line pt-2.5 text-2xs text-content-secondary">
                {weightPreview.movedCount === 0
                  ? "No case changes band under these weights."
                  : `${weightPreview.movedCount} case${weightPreview.movedCount === 1 ? "" : "s"} would change band.`}
              </p>

              {weightPreview.moved.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {weightPreview.moved.slice(0, 5).map((entry) => (
                    <li key={entry.caseNo} className="flex items-center gap-1.5">
                      <Link
                        href={caseHref(entry.caseNo)}
                        className="font-mono text-2xs text-accent hover:underline"
                      >
                        {entry.caseNo}
                      </Link>
                      <span className="text-2xs text-content-tertiary">
                        {entry.fromBand.toLowerCase()} → {entry.toBand.toLowerCase()} (
                        {entry.fromScore.toFixed(1)} → {entry.toScore.toFixed(1)})
                      </span>
                    </li>
                  ))}
                  {weightPreview.moved.length > 5 ? (
                    <li className="text-2xs text-content-tertiary">
                      +{weightPreview.moved.length - 5} more
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* SLA targets */}
      <SectionCard
        title="SLA thresholds"
        subtitle="Resolution target per band, in hours. Breaching escalates a case above its owner."
        icon="Clock"
        action={
          targetsDirty ? (
            <Button variant="ghost" size="xs" onClick={resetTargets}>
              <Icon name="RefreshCw" size="xs" />
              Reset
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIORITY_BANDS.map((band) => (
              <FormField
                key={band}
                label={`${band.charAt(0)}${band.slice(1).toLowerCase()} target`}
                htmlFor={`sla-${band}`}
                hint={`Currently ${SLA_TARGET_HOURS[band]}h`}
              >
                <input
                  id={`sla-${band}`}
                  type="number"
                  min={1}
                  max={2000}
                  value={targets[band]}
                  onChange={(event) =>
                    setTargets((previous) => ({
                      ...previous,
                      [band]: Number.parseInt(event.target.value, 10) || 1,
                    }))
                  }
                  className={FIELD_CLASS}
                />
              </FormField>
            ))}
          </div>

          <div className="min-w-0 rounded-md border border-line bg-surface-subtle p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
              Preview
            </p>
            <p className="mt-2 text-xs text-content">
              <span className="font-semibold tabular-nums">{slaPreview.breachedBefore}</span>{" "}
              open cases in breach today →{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  slaPreview.breachedAfter > slaPreview.breachedBefore
                    ? "text-critical-content"
                    : slaPreview.breachedAfter < slaPreview.breachedBefore
                      ? "text-success-content"
                      : "text-content",
                )}
              >
                {slaPreview.breachedAfter}
              </span>{" "}
              under these targets
            </p>

            {slaPreview.newlyBreached.length > 0 ? (
              <>
                <p className="mt-3 text-2xs font-medium text-critical-content">
                  Newly in breach
                </p>
                <ul className="mt-1 space-y-1">
                  {slaPreview.newlyBreached.slice(0, 5).map((entry) => (
                    <li key={entry.caseNo} className="flex items-center gap-1.5">
                      <Link
                        href={caseHref(entry.caseNo)}
                        className="font-mono text-2xs text-accent hover:underline"
                      >
                        {entry.caseNo}
                      </Link>
                      <span className="text-2xs text-content-tertiary">
                        {entry.band.toLowerCase()} · open {entry.hoursOpen}h
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {slaPreview.noLongerBreached.length > 0 ? (
              <p className="mt-3 text-2xs text-success-content">
                {slaPreview.noLongerBreached.length} case
                {slaPreview.noLongerBreached.length === 1 ? "" : "s"} would no longer be in
                breach.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* Routing */}
      <SectionCard
        title="Assignment routing"
        subtitle="Default owner by plant and exception type, applied when a case is raised"
        icon="Settings2"
        flush
      >
        <DataTable
          rows={data.routingRules}
          columns={[
            { key: "plant", label: "Plant", className: "w-40", render: (row) => row.plantName },
            {
              key: "type",
              label: "Exception type",
              render: (row) => (
                <span className="text-2xs text-content">{row.exceptionLabel}</span>
              ),
            },
            {
              key: "owner",
              label: "Default owner",
              className: "w-52",
              render: (row) => (
                <span className="text-2xs text-content-secondary">{row.ownerName}</span>
              ),
            },
            {
              key: "reviewer",
              label: "Default reviewer",
              className: "w-52",
              render: (row) => (
                <span className="text-2xs text-content-secondary">{row.reviewerName}</span>
              ),
            },
          ]}
          rowKey={(row) => row.id}
          minWidthClass="min-w-160"
          empty={{
            icon: "Settings2",
            title: "No routing rules",
            description: "Cases are routed by plant scope alone.",
          }}
        />
      </SectionCard>

      {/* Governance — who can do what, and which team does it */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            title="Permissions"
            subtitle="Derived from the rules the product enforces, not declared here"
            icon="Lock"
            className="h-full"
            footer={<RoleLegend />}
          >
            <PermissionMatrix />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            title="Departments"
            subtitle="Joined through the case owner — reassigning moves the work"
            icon="Users"
            className="h-full"
          >
            <DepartmentPanel
              loads={departmentLoads}
              unownedCases={unowned.count}
              unownedExposure={unowned.exposure}
              currency={data.cases[0]?.currency ?? "USD"}
            />
          </SectionCard>
        </div>
      </div>

      {/* Platform settings — three groups, read from the modules that own them */}
      <div className="grid gap-4 xl:grid-cols-12">
        {settingsGroups.map((group, index) => (
          <div
            key={group.id}
            className={cn("min-w-0", index === 0 ? "xl:col-span-5" : "xl:col-span-4")}
          >
            <SectionCard
              title={group.title}
              subtitle={group.subtitle}
              icon={group.icon}
              className="h-full"
            >
              <SettingsGroupPanel group={group} />
            </SectionCard>
          </div>
        ))}
      </div>
    </div>
  );
}
