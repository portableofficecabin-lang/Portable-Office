import { format } from "date-fns";

/** Format a date string/Date, returning `fallback` when value is missing or invalid.
 *  Prevents date-fns RangeError ("Invalid time value") from crashing render. */
export function formatDateSafe(
  value: string | number | Date | null | undefined,
  fmt: string,
  fallback = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}
