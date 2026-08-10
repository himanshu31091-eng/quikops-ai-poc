"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { FIELD_CLASS } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXCEPTION_META } from "@/src/config/app-config";
import { computePriority } from "@/src/domain/priority";
import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import { EXCEPTION_TYPES, type Plant, type User } from "@/src/domain/types";
import { formatHours, formatMoney } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { NewCaseDraft } from "../types";
import { EMPTY_DRAFT, validateDraft, type DraftErrors } from "../utils/create-case";

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plants: Plant[];
  users: User[];
  onCreate: (draft: NewCaseDraft) => void;
}


function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-2xs font-medium text-critical-content">
          <Icon name="CircleAlert" size="xs" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-2xs text-content-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Manual case entry. The form collects the same inputs the ingestion path
 * supplies, then scores the case with the shared priority engine and shows the
 * result — including the SLA it will be held to — before anything is committed.
 */
export function CreateCaseDialog({
  open,
  onOpenChange,
  plants,
  users,
  onCreate,
}: CreateCaseDialogProps) {
  const [draft, setDraft] = React.useState<NewCaseDraft>(() => ({
    ...EMPTY_DRAFT,
    plantCode: plants[0]?.code ?? "",
  }));
  const [errors, setErrors] = React.useState<DraftErrors>({});

  React.useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY_DRAFT, plantCode: plants[0]?.code ?? "" });
      setErrors({});
    }
  }, [open, plants]);

  const set = React.useCallback(
    <K extends keyof NewCaseDraft>(key: K, value: NewCaseDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const revenue = Number(draft.revenueAtRisk);
  const days = Number(draft.daysToPromisedDate);
  const preview = React.useMemo(() => {
    if (!Number.isFinite(revenue) || revenue < 0) return null;
    if (!Number.isFinite(days) || days < 0) return null;
    if (draft.revenueAtRisk.trim() === "" || draft.daysToPromisedDate.trim() === "") {
      return null;
    }
    return computePriority({
      revenueAtRisk: revenue,
      kpiDeviationPts: 0,
      customerTier: draft.customerTier === "NONE" ? null : draft.customerTier,
      daysToPromisedDate: days,
      recurrenceCount: 1,
      escalationLevel: 0,
    });
  }, [revenue, days, draft.revenueAtRisk, draft.daysToPromisedDate, draft.customerTier]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onCreate(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={submit}>
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              <Icon name="Plus" size="md" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-content">
                Create case
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-content-tertiary">
                For work that no signal raised. Priority is scored by the same rule set
                detected cases run through — it is never entered by hand.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <Icon name="X" size="sm" />
              </Button>
            </DialogClose>
          </header>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Title" htmlFor="case-title" error={errors.title}>
              <input
                id="case-title"
                value={draft.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder="Vendor delivery delay — RM-0000 — supplier name"
                className={FIELD_CLASS}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plant" htmlFor="case-plant" error={errors.plantCode}>
                <select
                  id="case-plant"
                  value={draft.plantCode}
                  onChange={(event) => set("plantCode", event.target.value)}
                  className={FIELD_CLASS}
                >
                  {plants.map((plant) => (
                    <option key={plant.code} value={plant.code}>
                      {plant.code} · {plant.name}, {plant.country}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" htmlFor="case-category">
                <select
                  id="case-category"
                  value={draft.exceptionType}
                  onChange={(event) =>
                    set("exceptionType", event.target.value as NewCaseDraft["exceptionType"])
                  }
                  className={FIELD_CLASS}
                >
                  {EXCEPTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EXCEPTION_META[type].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Material code" htmlFor="case-material">
                <input
                  id="case-material"
                  value={draft.materialCode}
                  onChange={(event) => set("materialCode", event.target.value)}
                  placeholder="RM-4471"
                  className={cn(FIELD_CLASS, "font-mono")}
                />
              </Field>

              <Field label="Material description" htmlFor="case-material-desc">
                <input
                  id="case-material-desc"
                  value={draft.materialDesc}
                  onChange={(event) => set("materialDesc", event.target.value)}
                  placeholder="Aluminium extrusion profile"
                  className={FIELD_CLASS}
                />
              </Field>

              <Field label="Supplier" htmlFor="case-supplier">
                <input
                  id="case-supplier"
                  value={draft.supplierName}
                  onChange={(event) => set("supplierName", event.target.value)}
                  placeholder="Leave empty for internal causes"
                  className={FIELD_CLASS}
                />
              </Field>

              <Field label="Customer" htmlFor="case-customer">
                <input
                  id="case-customer"
                  value={draft.customerName}
                  onChange={(event) => set("customerName", event.target.value)}
                  placeholder="Affected customer"
                  className={FIELD_CLASS}
                />
              </Field>

              <Field
                label="Customer tier"
                htmlFor="case-tier"
                hint="Tier one exposure carries the heaviest priority weight."
              >
                <select
                  id="case-tier"
                  value={draft.customerTier}
                  onChange={(event) =>
                    set("customerTier", event.target.value as NewCaseDraft["customerTier"])
                  }
                  className={FIELD_CLASS}
                >
                  <option value="NONE">No customer impact</option>
                  <option value="TIER_1">Tier 1</option>
                  <option value="TIER_2">Tier 2</option>
                  <option value="TIER_3">Tier 3</option>
                </select>
              </Field>

              <Field
                label="Revenue at risk (USD)"
                htmlFor="case-revenue"
                error={errors.revenueAtRisk}
              >
                <input
                  id="case-revenue"
                  value={draft.revenueAtRisk}
                  onChange={(event) => set("revenueAtRisk", event.target.value)}
                  inputMode="numeric"
                  placeholder="180000"
                  className={cn(FIELD_CLASS, "tabular-nums")}
                />
              </Field>

              <Field
                label="Days to promised date"
                htmlFor="case-days"
                error={errors.daysToPromisedDate}
              >
                <input
                  id="case-days"
                  value={draft.daysToPromisedDate}
                  onChange={(event) => set("daysToPromisedDate", event.target.value)}
                  inputMode="numeric"
                  placeholder="6"
                  className={cn(FIELD_CLASS, "tabular-nums")}
                />
              </Field>

              <Field
                label="Owner"
                htmlFor="case-owner"
                hint="Leave unassigned to route it through triage."
              >
                <select
                  id="case-owner"
                  value={draft.ownerId}
                  onChange={(event) => set("ownerId", event.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.jobTitle}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description" htmlFor="case-description">
              <textarea
                id="case-description"
                value={draft.description}
                onChange={(event) => set("description", event.target.value)}
                rows={3}
                placeholder="What was observed, what is exposed, and what has already been tried."
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
            </Field>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-subtle px-5 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
                Scored priority
              </span>
              {preview ? (
                <>
                  <PriorityChip
                    band={preview.band}
                    score={preview.score}
                    factors={preview.factors}
                    size="sm"
                  />
                  <span className="truncate text-2xs text-content-tertiary">
                    {formatMoney(revenue, "USD")} · resolve within{" "}
                    {formatHours(SLA_TARGET_HOURS[preview.band])}
                  </span>
                </>
              ) : (
                <span className="text-2xs text-content-tertiary">
                  Enter revenue at risk and days to the promised date to score it.
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DialogClose asChild>
                <Button variant="secondary" size="md" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="primary" size="md" type="submit">
                <Icon name="Plus" size="sm" />
                Create case
              </Button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
