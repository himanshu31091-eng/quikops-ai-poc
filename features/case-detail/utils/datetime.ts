/**
 * Datetime-local inputs, in UTC.
 *
 * Two reasons this is not the browser's locale: the field must render the same
 * markup on the server and the client or hydration breaks, and the whole
 * platform states operational times in UTC — a due date that means something
 * different depending on who opens the case is not a due date.
 */

/** ISO instant → the `yyyy-MM-ddTHH:mm` shape a datetime-local input expects. */
export function toDateTimeInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

/** Input value → ISO instant, reading the entered time as UTC. Null if unparseable. */
export function fromDateTimeInputValue(value: string): string | null {
  if (value === "") return null;
  const parsed = new Date(`${value}:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
