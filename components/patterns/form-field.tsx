/**
 * The one text-input shell used by every form in the app, so a field in the
 * Work Manager create dialog and a field on a case are literally the same
 * object rather than two strings that drifted apart.
 */
export const FIELD_CLASS =
  "h-8 w-full rounded-md border border-line bg-surface px-2.5 text-xs text-content outline-none transition-colors duration-150 placeholder:text-content-tertiary focus:border-accent-line";
