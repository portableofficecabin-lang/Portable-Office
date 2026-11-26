import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * isr-cache-handler.cjs (next.config.ts → cacheHandler): Next's own FileSystemCache, plus a guard that
 * stops a server process from writing ISR entries once a newer `next build` owns its directory.
 *
 * Regression for 2026-11-25 (#323): during the legacy in-place deploy the OLD process regenerated the
 * just-built Channasandra page with its old code, stored the 404 in .next/server/route-cache/, and the new
 * process served that cached 404 and then a 200 with the not-found head (noindex) for about two hours.
 * Reproduced locally (deploy/README.md "Defect 1"); with this handler the old process stores nothing.
 */
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const Handler = require(join(ROOT, "isr-cache-handler.cjs"));
const { staleBuildReason, PROCESS_STARTED_AT_MS } = Handler;
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache.js").default;
const { nodeFs } = require("next/dist/server/lib/node-fs-methods.js");

const BUILD = "phase-production-build";
const statAt = (mtimeMs: number) => () => ({ mtimeMs });
const missing = () => {
  throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
};

/** A throwaway .next with a BUILD_ID whose mtime is `mtimeMs` (or none), and a handler serving it. */
function release(mtimeMs: number | null) {
  const dir = mkdtempSync(join(tmpdir(), "isr-guard-"));
  const serverDistDir = join(dir, ".next", "server");
  mkdirSync(serverDistDir, { recursive: true });
  if (mtimeMs !== null) {
    writeFileSync(join(dir, ".next", "BUILD_ID"), "test_build");
    utimesSync(join(dir, ".next", "BUILD_ID"), mtimeMs / 1000, mtimeMs / 1000);
  }
  const cache = new Handler({ fs: nodeFs, serverDistDir, flushToDisk: true, revalidatedTags: [] });
  const files = (): string[] => {
    const out: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else out.push(p.slice(serverDistDir.length).replace(/\\/g, "/"));
      }
    };
    walk(serverDistDir);
    return out.sort();
  };
  return { dir, serverDistDir, cache, files, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** An App Router page entry as Next stores it (status 404 = the cached not-found page of 2026-11-25). */
const appPage = (status: number) => ({
  kind: "APP_PAGE",
  html: `<html><head><title>t</title></head><body>${status}</body></html>`,
  rscData: Buffer.from("0:{}"),
  headers: {},
  status,
  postponed: undefined,
  segmentData: undefined,
});
const KEY = "/route-cache/APP_PAGE/abc/$/cities-we-serve/shipping-container-channasandra";
const CTX = { fetchCache: false, isRoutePPREnabled: false, isFallback: false };
const ENTRY = ["/route-cache/APP_PAGE/abc/$/cities-we-serve/shipping-container-channasandra.html", "/route-cache/APP_PAGE/abc/$/cities-we-serve/shipping-container-channasandra.meta", "/route-cache/APP_PAGE/abc/$/cities-we-serve/shipping-container-channasandra.rsc"];

describe("staleBuildReason", () => {
  const dist = join("srv", "app", ".next", "server");
  it("lets a server write when its BUILD_ID was written before it started", () => {
    expect(staleBuildReason(dist, { env: {}, startedAtMs: 2_000, statSync: statAt(1_000) })).toBeNull();
  });
  it("stops a server whose directory got a newer BUILD_ID (the in-place build finished)", () => {
    expect(staleBuildReason(dist, { env: {}, startedAtMs: 2_000, statSync: statAt(3_000) })).toMatch(/after this server started/);
  });
  it("stops a server whose BUILD_ID is gone (next build cleaned .next and is compiling)", () => {
    expect(staleBuildReason(dist, { env: {}, startedAtMs: 2_000, statSync: missing })).toMatch(/is missing/);
  });
  it("never stops next build itself (its prerender must be written)", () => {
    expect(staleBuildReason(dist, { env: { NEXT_PHASE: BUILD }, startedAtMs: 2_000, statSync: missing })).toBeNull();
    expect(staleBuildReason(dist, { env: { NEXT_PHASE: BUILD }, startedAtMs: 2_000, statSync: statAt(3_000) })).toBeNull();
  });
  it("is a no-op without a server directory", () => {
    expect(staleBuildReason(undefined, { env: {}, statSync: missing })).toBeNull();
  });
  it("reads .next/BUILD_ID next to the server directory", () => {
    let asked = "";
    staleBuildReason(dist, { env: {}, startedAtMs: 0, statSync: (f: string) => ((asked = f), { mtimeMs: 0 }) });
    expect(asked.replace(/\\/g, "/")).toBe("srv/app/.next/BUILD_ID");
  });
});

describe("isr-cache-handler.cjs (with Next's real FileSystemCache)", () => {
  it("is Next's FileSystemCache (fails loudly if a Next upgrade moves or renames it)", () => {
    expect(typeof FileSystemCache).toBe("function");
    expect(Object.getPrototypeOf(Handler)).toBe(FileSystemCache);
    expect(typeof Handler.prototype.set).toBe("function");
    expect(typeof Handler.prototype.get).toBe("function");
    expect(PROCESS_STARTED_AT_MS).toBeLessThanOrEqual(Date.now());
  });

  it("a server started after its build writes ISR entries as before (also legitimate 404s)", async () => {
    const r = release(PROCESS_STARTED_AT_MS - 60_000);
    const prev = process.env.NEXT_PHASE;
    delete process.env.NEXT_PHASE;
    try {
      await r.cache.set(KEY, appPage(404), CTX);
      expect(r.files()).toEqual(ENTRY);
    } finally {
      if (prev !== undefined) process.env.NEXT_PHASE = prev;
      r.cleanup();
    }
  });

  it("the OLD process writes nothing once the new build is on disk — the 2026-11-25 cached 404", async () => {
    const r = release(Date.now() + 60_000);
    const prev = process.env.NEXT_PHASE;
    delete process.env.NEXT_PHASE;
    try {
      await r.cache.set(KEY, appPage(404), CTX);
      expect(r.files()).toEqual([]);
    } finally {
      if (prev !== undefined) process.env.NEXT_PHASE = prev;
      r.cleanup();
    }
  });

  it("the OLD process writes nothing while next build is rewriting .next (no BUILD_ID yet)", async () => {
    const r = release(null);
    const prev = process.env.NEXT_PHASE;
    delete process.env.NEXT_PHASE;
    try {
      await r.cache.set(KEY, appPage(404), CTX);
      expect(r.files()).toEqual([]);
    } finally {
      if (prev !== undefined) process.env.NEXT_PHASE = prev;
      r.cleanup();
    }
  });

  it("next build (NEXT_PHASE) always writes, whatever the BUILD_ID says", async () => {
    const r = release(Date.now() + 60_000);
    const prev = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = BUILD;
    try {
      await r.cache.set(KEY, appPage(200), CTX);
      expect(r.files()).toEqual(ENTRY);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = prev;
      r.cleanup();
    }
  });
});
