/**
 * Resolve hook: `import { describe, it, expect } from "vitest"` → scripts/vitest-compat.mjs.
 * Registered by scripts/vitest-compat-register.mjs. Test-only; see vitest-compat.mjs.
 */
const COMPAT_URL = new URL("./vitest-compat.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "vitest") return { url: COMPAT_URL, shortCircuit: true };
  return nextResolve(specifier, context);
}
