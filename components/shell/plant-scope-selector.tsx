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
import { cn } from "@/src/lib/cn";

/**
 * The plant scope control in the top bar.
 *
 * Holds its selection locally and does not filter the page. Plant scoping is a
 * Phase-2 capability (see ROADMAP.md); this is the visible anchor for it, and
 * it is deliberately inert rather than partially wired.
 */
const ALL_PLANTS = "ALL";

export function PlantScopeSelector({ plants }: { plants: Plant[] }) {
  const [selected, setSelected] = React.useState<string>(ALL_PLANTS);
  const current = plants.find((p) => p.code === selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-content transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover"
        >
          <Icon name="Factory" size="sm" className="text-content-tertiary" />
          {/* Fixed-height trigger: "MX01 · Querétaro" must not wrap out of it. */}
          <span className="whitespace-nowrap font-medium">
            {current ? `${current.code} · ${current.name}` : "All plants"}
          </span>
          <Icon name="ChevronsUpDown" size="xs" className="text-content-tertiary" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Plant scope</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setSelected(ALL_PLANTS)}>
          <Icon name="Building2" />
          <span className="flex-1">All plants</span>
          {selected === ALL_PLANTS ? (
            <Icon name="Check" className="text-accent!" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {plants.map((plant) => (
          <DropdownMenuItem key={plant.code} onSelect={() => setSelected(plant.code)}>
            <span className="font-mono text-2xs text-content-tertiary">{plant.code}</span>
            <span className="flex-1">{plant.name}</span>
            <span className="text-2xs text-content-tertiary">{plant.countryCode}</span>
            {selected === plant.code ? (
              <Icon name="Check" className="text-accent!" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className={cn("px-2 py-1.5 text-2xs leading-relaxed text-content-tertiary")}>
          Scope is enforced server-side from the session, never from the client.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
