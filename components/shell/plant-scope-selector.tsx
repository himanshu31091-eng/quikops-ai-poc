"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Plant } from "@/src/domain/types";
import { ALL_PLANTS } from "@/src/scope/plant-scope-shared";
import { setPlantScope } from "@/src/scope/plant-scope-actions";
import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/i18n/provider";

/**
 * The plant scope control in the top bar.
 *
 * The selection is written to a cookie by a server action and the tree is
 * revalidated, so the scope changes what the *queries* return rather than what
 * the UI chooses to show. This previously held its selection in local state and
 * filtered nothing — it looked like a filter, which is worse than not having
 * one, because a viewer trusts it.
 */
interface PlantScopeSelectorProps {
  plants: Plant[];
  /** Resolved on the server, so the trigger is never out of step with the data. */
  scope: string;
}

export function PlantScopeSelector({ plants, scope }: PlantScopeSelectorProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = React.useTransition();
  const current = plants.find((p) => p.code === scope);

  const select = (next: string) => {
    if (next === scope) return;
    startTransition(async () => {
      await setPlantScope(next);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Plant scope — ${current ? current.name : "all plants"}`}
          className={cn(
            "flex h-8 items-center gap-2 rounded-md border bg-surface px-2.5 text-sm text-content transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover",
            // A scoped view is a modal state: the control says so rather than
            // leaving the reader to notice the numbers are smaller.
            current ? "border-accent-line bg-accent-subtle" : "border-line",
            isPending && "opacity-60",
          )}
        >
          <Icon name="Factory" size="sm" className="text-content-tertiary" />
          <span className="whitespace-nowrap font-medium">
            {current ? `${current.code} · ${current.name}` : "All plants"}
          </span>
          <Icon name="ChevronsUpDown" size="xs" className="text-content-tertiary" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("shell.plantScope")}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => select(ALL_PLANTS)}>
          <Icon name="Building2" />
          <span className="flex-1">{t("shell.allPlants")}</span>
          {scope === ALL_PLANTS ? (
            <Icon name="Check" size="xs" className="ml-1.5 text-accent" />
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        {plants.map((plant) => (
          <DropdownMenuItem key={plant.code} onSelect={() => select(plant.code)}>
            <Icon name="Factory" />
            <span className="flex-1">{plant.name}</span>
            <span className="font-mono text-2xs text-content-tertiary">{plant.code}</span>
            {scope === plant.code ? (
              <Icon name="Check" size="xs" className="ml-1.5 text-accent" />
            ) : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-2xs leading-relaxed text-content-tertiary">
          Scoping to a plant recomputes every figure from that plant&rsquo;s cases.
          Portfolio and plant numbers answer different questions and are never mixed.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
