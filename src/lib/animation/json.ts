/**
 * TYPED READERS FOR UNVALIDATED JSON.
 *
 * Every byte a video provider or a webhook sends us is attacker-adjacent and shape-unstable: the
 * published response format changes between API revisions, and an error page arrives where a job
 * was expected. Reaching into that with `any` gives the compiler nothing to check, so a renamed
 * field becomes `undefined` at runtime rather than a red build — and `undefined` flowing into a
 * job status is exactly how a failed render gets recorded as a success.
 *
 * These helpers narrow instead. Each one answers "is this field the type I need?" and returns
 * null when it is not, so a caller cannot accidentally treat a missing field as a value. They are
 * deliberately tiny and allocation-free: this runs on every poll of every scene.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read `obj.key` without asserting anything about its type. */
export function get(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}

/** Walk a path, e.g. path(body, "response", "generateVideoResponse"). Stops at the first miss. */
export function path(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

/** A non-empty string, or null. Empty strings are treated as absent — they never mean "present". */
export function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** The first non-empty string found at any of `keys`, or null. */
export function firstStr(value: unknown, keys: string[]): string | null {
  for (const key of keys) {
    const found = str(get(value, key));
    if (found) return found;
  }
  return null;
}

/** A finite number, or null. NaN and Infinity are absent, not values. */
export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function bool(value: unknown): boolean {
  return value === true;
}

/** An array, or an empty array. Never null, so callers can spread it unconditionally. */
export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Parse a JSON body without letting a non-JSON response (an HTML error page, an empty body)
 * become a thrown exception in the middle of a poll loop.
 */
export async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * The human-readable error out of a provider payload, checking every field name these APIs use.
 *
 * Returns null rather than a placeholder when there is nothing to read, so a caller can tell
 * "the provider explained itself" from "the provider said nothing" and phrase its own message
 * accordingly.
 */
export function extractError(body: unknown): string | null {
  for (const key of ["error", "message", "detail", "error_message"]) {
    const field = get(body, key);
    const direct = str(field);
    if (direct) return direct;
    const nested = str(get(field, "message"));
    if (nested) return nested;
  }
  return null;
}
