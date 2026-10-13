/**
 * Registers scripts/vitest-compat-loader.mjs and installs the minimal browser surface the unit
 * tests need, so `npm test` can run the vitest-style tests under src/ on node:test.
 *
 *   node --import tsx --import ./scripts/asset-stub-register.mjs \
 *        --import ./scripts/vitest-compat-register.mjs --test "src/**\/*.test.ts"
 *
 * Browser surface: `window` is an EventTarget with an in-memory `localStorage` (Storage API:
 * getItem / setItem / removeItem / clear / key / length). That is all src/lib/cart/guestCart.ts
 * touches. Nothing else is emulated — a test that needs more of the DOM fails instead of running
 * against a fake that silently differs from a browser.
 */
import { register } from "node:module";

register("./vitest-compat-loader.mjs", import.meta.url);

class MemoryStorage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(index) { return [...this.#items.keys()][index] ?? null; }
  getItem(key) { return this.#items.has(String(key)) ? this.#items.get(String(key)) : null; }
  setItem(key, value) { this.#items.set(String(key), String(value)); }
  removeItem(key) { this.#items.delete(String(key)); }
  clear() { this.#items.clear(); }
}

if (typeof globalThis.window === "undefined") {
  const win = new EventTarget();
  Object.defineProperty(win, "localStorage", { value: new MemoryStorage(), enumerable: true });
  globalThis.window = win;
}
