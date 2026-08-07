"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { ROLE_META } from "@/src/config/app-config";
import {
  CAPABILITIES,
  CAPABILITY_AREAS,
  DEPARTMENTS,
  type Capability,
  type SettingsGroup,
} from "@/src/domain/platform-settings";
import { EXCEPTION_META } from "@/src/config/app-config";
import type { ExceptionType, User, UserRole } from "@/src/domain/types";
import { USER_ROLES } from "@/src/domain/types";
import { formatMoney } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * Governance: who can do what, which team does it, and what the platform is
 * currently configured to do.
 *
 * The permission view is the one worth explaining. It is not a checkbox grid a
 * reader can edit — it is a statement of the rules the code already enforces,
 * each row naming the file that enforces it. An administrator's real question
 * is *why can this role not verify*, and a grid of ticks cannot answer that; a
 * rationale can, and it is the same rationale the rest of the product uses.
 */

/* --------------------------------------------------------- Permissions --- */

const AREA_TONE: Record<string, string> = {
  Read: "bg-medium-subtle text-medium-content border-medium-line",
  Execute: "bg-accent-subtle text-accent-content border-accent-line",
  Approve: "bg-high-subtle text-high-content border-high-line",
  Configure: "bg-critical-subtle text-critical-content border-critical-line",
};

function CapabilityRow({
  capability,
  expanded,
  onToggle,
}: {
  capability: Capability;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `cap-${capability.id}`;

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-content">
            {capability.label}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            {USER_ROLES.map((role) => {
              const holds = capability.roles.includes(role);
              return (
                <span
                  key={role}
                  className={cn(
                    "rounded-sm border px-1 py-px text-2xs font-medium",
                    holds
                      ? "border-success-line bg-success-subtle text-success-content"
                      : "border-line bg-surface-hover text-content-tertiary line-through opacity-60",
                  )}
                >
                  {ROLE_META[role].short}
                </span>
              );
            })}
          </span>
        </span>

        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          size="xs"
          className="shrink-0 text-content-tertiary"
        />
      </button>

      {expanded ? (
        <div id={panelId} className="anim-fade bg-surface-subtle px-3 pb-3 pt-1">
          <p className="text-2xs leading-relaxed text-content-secondary">
            {capability.rationale}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-2xs text-content-tertiary">
            <Icon name="Lock" size="xs" />
            Enforced in {capability.enforcedIn}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function PermissionMatrix() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [area, setArea] = React.useState<string | null>(null);

  const visible = area
    ? CAPABILITIES.filter((capability) => capability.area === area)
    : CAPABILITIES;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => setArea(null)}
          aria-pressed={area === null}
          className={cn(
            "rounded-sm border px-2 py-0.5 text-2xs font-medium transition-colors duration-150",
            area === null
              ? "border-accent-line bg-accent-subtle text-accent-content"
              : "border-line text-content-tertiary hover:bg-surface-hover",
          )}
        >
          All
        </button>
        {CAPABILITY_AREAS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setArea(entry)}
            aria-pressed={area === entry}
            className={cn(
              "rounded-sm border px-2 py-0.5 text-2xs font-medium transition-colors duration-150",
              area === entry
                ? AREA_TONE[entry]
                : "border-line text-content-tertiary hover:bg-surface-hover",
            )}
          >
            {entry}
          </button>
        ))}
      </div>

      <ul className="overflow-hidden rounded-md border border-line bg-surface">
        {visible.map((capability) => (
          <CapabilityRow
            key={capability.id}
            capability={capability}
            expanded={openId === capability.id}
            onToggle={() =>
              setOpenId((current) => (current === capability.id ? null : capability.id))
            }
          />
        ))}
      </ul>

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        <span>
          Derived from the rules the code enforces rather than declared here, so this
          cannot describe permissions the product does not have. Each row names the file
          that enforces it.
        </span>
      </p>
    </div>
  );
}

/* --------------------------------------------------------- Departments --- */

export interface DepartmentLoad {
  departmentId: string;
  people: User[];
  openCases: number;
  openExposure: number;
  breachedOpen: number;
}

export function DepartmentPanel({
  loads,
  unownedCases,
  unownedExposure,
  currency,
}: {
  loads: DepartmentLoad[];
  unownedCases: number;
  unownedExposure: number;
  currency: string;
}) {
  const maxExposure = Math.max(...loads.map((load) => load.openExposure), 1);

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {DEPARTMENTS.map((department) => {
          const load = loads.find((entry) => entry.departmentId === department.id);
          const openCases = load?.openCases ?? 0;
          const exposure = load?.openExposure ?? 0;
          const breached = load?.breachedOpen ?? 0;

          return (
            <li
              key={department.id}
              className="rounded-md border border-line bg-surface px-3 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-hover text-content-secondary"
                  aria-hidden
                >
                  <Icon name={department.icon} size="sm" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold text-content">
                      {department.name}
                    </span>
                    <span className="text-2xs text-content-tertiary">
                      {load?.people.length ?? 0} owner
                      {(load?.people.length ?? 0) === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-content-secondary">
                    {department.remit}
                  </p>

                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        breached > 0 ? "bg-critical" : "bg-accent",
                      )}
                      style={{ width: `${(exposure / maxExposure) * 100}%` }}
                      aria-hidden
                    />
                  </span>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs">
                    <span className="font-semibold tabular-nums text-content">
                      {formatMoney(exposure, currency, { forceCompact: true })}
                    </span>
                    <span className="text-content-tertiary">{openCases} open</span>
                    {breached > 0 ? (
                      <span className="text-critical-content">{breached} past target</span>
                    ) : null}
                  </p>

                  <p className="mt-1.5 flex flex-wrap items-center gap-1">
                    {department.handles.map((type) => (
                      <span
                        key={type}
                        className="rounded-sm border border-line bg-surface-hover px-1 py-px text-2xs text-content-tertiary"
                      >
                        {EXCEPTION_META[type as ExceptionType]?.label ?? type}
                      </span>
                    ))}
                  </p>

                  {load && load.people.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {load.people.map((person) => (
                        <OwnerAvatar key={person.id} user={person} size="sm" />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {unownedCases > 0 ? (
        <p className="flex items-start gap-1.5 rounded-md border border-high-line bg-high-subtle px-2.5 py-2 text-2xs leading-relaxed text-high-content">
          <Icon name="TriangleAlert" size="xs" className="mt-px shrink-0" />
          <span>
            {unownedCases} open case{unownedCases === 1 ? "" : "s"} carrying{" "}
            {formatMoney(unownedExposure, currency, { forceCompact: true })} sit in no
            department, because nobody owns them yet. They are counted in the portfolio
            and absent from the split above — which is the finding, not a gap in the data.
          </span>
        </p>
      ) : null}

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        <span>
          Departments are joined through the case owner rather than stored on the case,
          so a reassignment moves the work between teams without anything being
          re-tagged.
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Settings --- */

export function SettingsGroupPanel({ group }: { group: SettingsGroup }) {
  return (
    <div className="space-y-2.5">
      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
        {group.rows.map((row) => (
          <li key={row.key} className="px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-content">
                {row.label}
                {row.isEnforced ? null : (
                  <span className="rounded-sm border border-line bg-surface-hover px-1 py-px text-2xs font-normal text-content-tertiary">
                    Phase 2
                  </span>
                )}
              </span>
              <span className="font-mono text-2xs text-accent-content">{row.value}</span>
            </div>
            <p className="mt-1 text-2xs leading-relaxed text-content-secondary">
              {row.detail}
            </p>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        {group.note}
      </p>
    </div>
  );
}

/** Roles legend, so the short codes in the permission rows are readable. */
export function RoleLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {USER_ROLES.map((role: UserRole) => (
        <li key={role} className="flex items-center gap-1.5 text-2xs">
          <span className="rounded-sm border border-line bg-surface-hover px-1 py-px font-medium text-content-secondary">
            {ROLE_META[role].short}
          </span>
          <span className="text-content-tertiary">{ROLE_META[role].label}</span>
        </li>
      ))}
    </ul>
  );
}
