import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { cn } from "@/src/lib/cn";

/**
 * The one text-input shell used by every form in the app, so a field in the
 * Work Manager create dialog and a field on a case are literally the same
 * object rather than two strings that drifted apart.
 */
export const FIELD_CLASS =
  "h-8 w-full rounded-md border border-line bg-surface px-2.5 text-xs text-content outline-none transition-colors duration-150 placeholder:text-content-tertiary focus:border-accent-line";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  /** Validation message. Replaces the hint while present. */
  error?: string;
  hint?: string;
  /** Marks the label, for forms where most fields are optional. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label, control and message, stacked. The control is passed as children rather
 * than rendered here, because a field is a select as often as it is an input and
 * a component that switches on `type` ends up owning every control in the app.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
      >
        {label}
        {required ? <span className="ml-0.5 text-critical">*</span> : null}
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
