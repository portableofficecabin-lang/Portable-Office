"use strict";
/**
 * ISR cache handler (next.config.ts → `cacheHandler`): Next's own file-system cache, unchanged, plus ONE
 * guard — a server process stops writing to the ISR cache once a newer `next build` has been written
 * into the directory it serves from.
 *
 * WHY (production, 2026-11-25, PR #323 Channasandra; reproduced locally, see deploy/README.md "Defect 1"):
 * the legacy deploy runs `next build` INSIDE the live directory while the old `next start` process keeps
 * serving it. Next 15.5 serves ISR pages from the build's output ("seed" files in .next/server/app) and
 * keeps runtime regenerations in .next/server/route-cache/. Between the new build's prerender and the PM2
 * reload, a request for a page that exists only in the NEW build reaches the OLD process, which serves the
 * new seed as STALE and regenerates it in the background with its OLD code — which does not know the page
 * (`dynamicParams = false` is not consulted for a background revalidation). The resulting 404 (not-found
 * HTML: the layout's default title, `<meta name="robots" content="noindex">`, no canonical) is written to
 * .next/server/route-cache/…, where the NEW process finds it before the seed: the new page answers a cached
 * 404 for one revalidate window; Next's first regeneration of that cached 404 then yields a 200 "hybrid"
 * whose body is right but whose head is still the not-found head (noindex), for one more window.
 *
 * THE GUARD: `next build` deletes .next/ (except .next/cache) when it starts and writes the new BUILD_ID
 * before it prerenders. So, in a running server, "BUILD_ID is missing" or "BUILD_ID was written after this
 * process started" means a newer build owns the directory, and every cache write from this process (a
 * regeneration with old code, or the copy of a seed into route-cache) would contaminate that build: it is
 * skipped. The old process still answers its in-flight requests (it renders, it just does not store), and
 * the new process — started after the build — writes normally. Nothing changes:
 *   • during `next build` itself (NEXT_PHASE = phase-production-build): every prerender is written;
 *   • for a release-based deploy (deploy/deploy-portable-office.sh): each release directory is built
 *     before its process starts and never rebuilt, so the guard never fires; rollback restarts a process
 *     after its build, so it writes normally too;
 *   • for legitimate 404s and noindex pages of the serving build: they are cached exactly as before.
 *
 * Plain CommonJS on purpose: Next loads this file at run time (it is not bundled), from the project
 * directory. It extends Next's internal FileSystemCache, so src/lib/isr-cache-handler.test.ts checks that
 * the class still exists and behaves on every Next upgrade.
 */
const fs = require("node:fs");
const path = require("node:path");
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache.js").default;

const BUILD_PHASE = "phase-production-build";
/** When this Node process started (wall clock, ms). Fixed when the module is first loaded. */
const PROCESS_STARTED_AT_MS = Date.now() - process.uptime() * 1000;

/**
 * Why this process must not write to the ISR cache under `serverDistDir` (…/.next/server), or null
 * when it may. Pure apart from one stat of .next/BUILD_ID; every input can be overridden for tests.
 */
function staleBuildReason(serverDistDir, { env = process.env, startedAtMs = PROCESS_STARTED_AT_MS, statSync = fs.statSync } = {}) {
  if (env.NEXT_PHASE === BUILD_PHASE) return null;
  if (!serverDistDir) return null;
  const buildIdFile = path.join(serverDistDir, "..", "BUILD_ID");
  let stat;
  try {
    stat = statSync(buildIdFile);
  } catch {
    return `${buildIdFile} is missing: a next build is rewriting this directory`;
  }
  if (stat.mtimeMs > startedAtMs) {
    return `${buildIdFile} was written at ${new Date(stat.mtimeMs).toISOString()}, after this server started (${new Date(startedAtMs).toISOString()}): a newer build owns this directory`;
  }
  return null;
}

let warned = false;
function skip(reason, what) {
  if (!warned) {
    warned = true;
    console.warn(`[isr-cache-handler] not writing to the ISR cache from this process (${what}): ${reason}. The process started after the build writes normally.`);
  }
}

class StaleBuildGuardedCache extends FileSystemCache {
  async set(key, data, ctx) {
    const reason = staleBuildReason(this.serverDistDir);
    if (reason) return skip(reason, `set ${key}`);
    return super.set(key, data, ctx);
  }

  // Next 15.5 copies a build "seed" into route-cache on first read; from a stale process that would
  // also write into the new build's directory.
  async promoteSeed(...args) {
    const reason = staleBuildReason(this.serverDistDir);
    if (reason) return skip(reason, `promote ${args[0]}`);
    return super.promoteSeed(...args);
  }
}

module.exports = StaleBuildGuardedCache;
module.exports.default = StaleBuildGuardedCache;
module.exports.staleBuildReason = staleBuildReason;
module.exports.PROCESS_STARTED_AT_MS = PROCESS_STARTED_AT_MS;
