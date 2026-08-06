import { MODULE_PLACEHOLDER_COPY } from "@/src/config/app-config";
import { Icon } from "./icon";

interface ModulePlaceholderProps {
  moduleKey: keyof typeof MODULE_PLACEHOLDER_COPY;
}

/**
 * Every unbuilt module renders identically. A navigable page that states its own
 * scope reads as a roadmap; a disabled nav item or a grey box reads as broken.
 */
export function ModulePlaceholder({ moduleKey }: ModulePlaceholderProps) {
  const copy = MODULE_PLACEHOLDER_COPY[moduleKey];
  if (!copy) return null;

  return (
    <div className="flex min-h-[52vh] items-center justify-center">
      <div className="w-full max-w-[480px] rounded-lg border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg border border-line bg-surface-subtle text-content-tertiary">
          <Icon name={copy.icon} size="lg" />
        </span>

        <h2 className="mt-4 text-lg font-semibold text-content">{copy.title}</h2>

        <span className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface-hover px-2 py-0.5 text-2xs font-medium uppercase tracking-wide text-content-secondary">
          <Icon name="Lock" size="xs" />
          Phase 2
        </span>

        <p className="mt-4 text-sm leading-relaxed text-content-secondary">
          {copy.scope}
        </p>

        <p className="mt-4 border-t border-line pt-3 text-2xs text-content-tertiary">
          {copy.specRef}
        </p>
      </div>
    </div>
  );
}
