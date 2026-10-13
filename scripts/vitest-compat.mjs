/**
 * VITEST-COMPATIBLE TEST API ON node:test — lets the unit tests under src/ (written against the
 * `vitest` API: describe / it / beforeEach / expect) run with Node's built-in test runner, so
 * CI can execute them without adding vitest (and a DOM package) as dependencies.
 *
 *   npm test
 *   (node --import tsx --import ./scripts/asset-stub-register.mjs
 *         --import ./scripts/vitest-compat-register.mjs --test "src/**\/*.test.ts")
 *
 * Only the subset the repo's tests use is implemented. Anything else THROWS with a clear message
 * instead of passing silently — a test that starts using an unsupported matcher fails loudly and
 * the matcher gets added here (or vitest gets adopted properly).
 *
 * Semantics follow vitest: toBe = Object.is; toEqual = recursive equality that ignores
 * properties whose value is undefined; toStrictEqual = node's deepStrictEqual.
 *
 * Test-only: nothing in app/ or src/ imports this file, and it never runs in a build.
 */
import { describe as nodeDescribe, it as nodeIt, beforeEach as nodeBeforeEach, afterEach as nodeAfterEach, before, after } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";

export const describe = nodeDescribe;
export const it = nodeIt;
export const test = nodeIt;
export const beforeEach = nodeBeforeEach;
export const afterEach = nodeAfterEach;
export const beforeAll = before;
export const afterAll = after;

const show = (v) => inspect(v, { depth: 6, breakLength: 120 });

/** vitest `toEqual`: structural, ignores undefined-valued keys, does not compare prototypes. */
function equals(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !equals(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (![...b].some((w) => equals(v, w))) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && a.length !== b.length) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equals(a[k], b[k]));
}

function lengthOf(v) {
  if (v == null || typeof v.length !== "number") throw new assert.AssertionError({ message: `expected ${show(v)} to have a length property` });
  return v.length;
}

const MATCHERS = {
  toBe: (actual, expected) => [Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`],
  toEqual: (actual, expected) => [equals(actual, expected), `expected ${show(actual)} to equal ${show(expected)}`],
  toStrictEqual: (actual, expected) => {
    try { assert.deepStrictEqual(actual, expected); return [true, ""]; } catch { return [false, `expected ${show(actual)} to strictly equal ${show(expected)}`]; }
  },
  toBeNull: (actual) => [actual === null, `expected ${show(actual)} to be null`],
  toBeUndefined: (actual) => [actual === undefined, `expected ${show(actual)} to be undefined`],
  toBeDefined: (actual) => [actual !== undefined, `expected ${show(actual)} to be defined`],
  toBeTruthy: (actual) => [Boolean(actual), `expected ${show(actual)} to be truthy`],
  toBeFalsy: (actual) => [!actual, `expected ${show(actual)} to be falsy`],
  toBeGreaterThan: (actual, n) => [actual > n, `expected ${show(actual)} to be greater than ${show(n)}`],
  toBeGreaterThanOrEqual: (actual, n) => [actual >= n, `expected ${show(actual)} to be greater than or equal to ${show(n)}`],
  toBeLessThan: (actual, n) => [actual < n, `expected ${show(actual)} to be less than ${show(n)}`],
  toBeLessThanOrEqual: (actual, n) => [actual <= n, `expected ${show(actual)} to be less than or equal to ${show(n)}`],
  toHaveLength: (actual, n) => [lengthOf(actual) === n, `expected length ${show(actual?.length)} to be ${show(n)}`],
  toContain: (actual, item) => [
    typeof actual === "string" ? actual.includes(item) : Array.from(actual ?? []).includes(item),
    `expected ${show(actual)} to contain ${show(item)}`,
  ],
  toMatch: (actual, re) => [
    typeof actual === "string" && (re instanceof RegExp ? re.test(actual) : actual.includes(re)),
    `expected ${show(actual)} to match ${show(re)}`,
  ],
};

function makeMatchers(actual, negated) {
  return new Proxy({}, {
    get(_, name) {
      if (name === "not" && !negated) return makeMatchers(actual, true);
      if (typeof name !== "string") return undefined;
      const matcher = MATCHERS[name];
      if (!matcher) {
        return () => { throw new Error(`vitest-compat: matcher "${negated ? "not." : ""}${name}" is not implemented — add it to scripts/vitest-compat.mjs`); };
      }
      return (...args) => {
        const [pass, message] = matcher(actual, ...args);
        if (pass === negated) {
          throw new assert.AssertionError({ message: negated ? message.replace(/^expected (.*?) to /, "expected $1 NOT to ") : message, actual, expected: args[0], operator: name });
        }
      };
    },
  });
}

export function expect(actual) {
  return makeMatchers(actual, false);
}

/** `vi` (mocks, timers, spies) is not supported; touching it fails the test with a clear message. */
export const vi = new Proxy({}, {
  get(_, name) {
    throw new Error(`vitest-compat: vi.${String(name)} is not implemented — scripts/vitest-compat.mjs supports describe/it/beforeEach/expect only`);
  },
});
