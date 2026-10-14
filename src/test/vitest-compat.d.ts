/**
 * Types for `import { … } from "vitest"` in the unit tests. vitest is not installed: `npm test`
 * maps the import to scripts/vitest-compat.mjs (node:test underneath), so these declarations
 * describe exactly the subset that shim implements. If vitest is ever adopted properly, delete
 * this file. When a test needs a matcher the shim lacks, add it to the shim AND here.
 */
declare module "vitest" {
  type Body = () => void | Promise<void>;

  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toStrictEqual(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(n: number | bigint): void;
    toBeGreaterThanOrEqual(n: number | bigint): void;
    toBeLessThan(n: number | bigint): void;
    toBeLessThanOrEqual(n: number | bigint): void;
    toHaveLength(n: number): void;
    toContain(item: unknown): void;
    toMatch(pattern: RegExp | string): void;
  }

  interface Assertion extends Matchers {
    not: Matchers;
  }

  export function describe(name: string, fn: Body): void;
  export function it(name: string, fn: Body): void;
  export function test(name: string, fn: Body): void;
  export function beforeEach(fn: Body): void;
  export function afterEach(fn: Body): void;
  export function beforeAll(fn: Body): void;
  export function afterAll(fn: Body): void;
  export function expect(actual: unknown): Assertion;
  /** Not implemented by the shim — any property access throws at runtime. */
  export const vi: Record<string, never>;
}
