#!/usr/bin/env node
/**
 * verify-release — proves that a Portable Office Cabin build serves every page it should, from
 * the build it claims to be, BEFORE (and after) live traffic is pointed at it.
 *
 * Used in two places:
 *   1. deploy/deploy-portable-office.sh runs it against the NEW release on its idle port, from the
 *      release directory, before nginx is switched. Any failure keeps the old release live.
 *   2. .github/workflows/deploy-hostinger.yml runs it against https://portableofficecabin.com
 *      after the deploy, from the deployed commit's checkout.
 *
 * What it checks (all GETs, no redirects followed):
 *   • identity  — with --expect-commit: GET /api/build-info must name that commit, the build it
 *                 reports becomes the build every page below must come from, and the serving
 *                 process must have started after that build (i.e. it was restarted)
 *   • build     — every city slug in src/data/cityPages.ts is a prerendered route in
 *                 .next/prerender-manifest.json (only when --release-dir points at a built release)
 *   • health    — /, /cities-we-serve, /products, /sitemap.xml, /robots.txt answer 200
 *   • city      — every /cities-we-serve/<slug> answers 200 AND was rendered by the expected build
 *                 (the HTML carries the build id) — a cached 404 or a stale page from an older build
 *                 is exactly what this catches
 *   • new       — routes passed with --new-routes (the ones this deploy introduces), reported first
 *   • sitemap   — every URL of the served /sitemap.xml on this host answers 200 (skipped by --quick)
 *   • not-found — every HTML page above (and below) that answers 200 must not be the site's
 *                 not-found page: a branded 404 served with status 200 is a failure, not a success
 *   • critical  — the routes in scripts/deploy/critical-routes.json of the release / source (the
 *                 shipping- and cargo-container pages, the Mysore and Mettur city pages, products,
 *                 categories, the enquiry page) answer 200 from the expected build, render an <h1>
 *                 and any markup the file requires (enquiry inputs, Add to Cart). Skipped with
 *                 --no-critical or when the file is absent (releases built before it existed).
 *   • redirect  — the redirects in the same file answer their status in ONE hop with exactly the
 *                 declared Location, and the target is a real page (no chain, no loop, no 404)
 *   • assets    — every /_next/static JS/CSS file, every next/image URL and every /images file that
 *                 /, /products, the first city page and the critical pages load answers 200 with a
 *                 file, not an HTML page (skipped with --no-assets)
 *   • continuity— with --compare-base (the live release, before the switch): every /_next/static file
 *                 the LIVE build's home page references must also be served by the NEW release, so a
 *                 page opened before the switch can still load its chunks after it
 *   • compare   — paths in the sitemap at --compare-base (the old release) that are missing from the
 *                 new sitemap are reported as WARNINGS: removing a page can be intentional
 *
 * Usage:
 *   node scripts/deploy/verify-release.mjs --base http://127.0.0.1:3010 --host portableofficecabin.com \
 *        --release-dir /srv/apps/portableofficecabin.com/releases/<id> [--compare-base http://127.0.0.1:3000]
 *   node scripts/deploy/verify-release.mjs --base https://portableofficecabin.com --source-dir . \
 *        --expect-commit <sha> [--build-id <id>] --new-routes /cities-we-serve/x,/cities-we-serve/y --quick --github
 *   (--resolve 127.0.0.1 connects an https base to that address with the real SNI / certificate)
 *
 * Exit code: 0 = all checks passed, 1 = at least one failure, 2 = usage error or crash.
 * Node built-ins only — it runs on the VPS from a release directory before anything is installed.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import http from "node:http";
import https from "node:https";
import { pathToFileURL } from "node:url";

export const HEALTH_PATHS = ["/", "/cities-we-serve", "/products", "/sitemap.xml", "/robots.txt"];

/** Where a release (or a source checkout) lists its critical routes. */
export const CRITICAL_ROUTES_FILE = "scripts/deploy/critical-routes.json";

/**
 * Text that only the not-found page renders. "Oops! Page not found" is the site's own page
 * (src/views/NotFound.tsx, kept in step by verify-release.test.mjs); the second is Next's default.
 */
export const NOT_FOUND_MARKERS = ["Oops! Page not found", "This page could not be found"];

/** True when an HTML body is the not-found page (whatever status it was served with). */
export function isNotFoundPage(body) {
  return NOT_FOUND_MARKERS.some((m) => body.includes(m));
}

/** /_next/static JS/CSS files an HTML page references (src= / href=), de-duplicated, in order. */
export function staticRefs(body) {
  return [...new Set([...body.matchAll(/(?:src|href)="(\/_next\/static\/[^"?#]+)/g)].map((m) => m[1]))];
}

/**
 * The same-site assets an HTML page needs: its /_next/static JS/CSS, every next/image URL exactly
 * as the page requests it (src="/_next/image?url=…&w=…&q=…": a 200 proves the optimiser works AND
 * the source image exists), and plain <img src="/images/…"> files. De-duplicated, in order.
 */
export function assetRefs(body) {
  const out = new Set(staticRefs(body));
  for (const m of body.matchAll(/src="(\/_next\/image\?url=[^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, "&");
    let source = "";
    try {
      source = decodeURIComponent((u.match(/[?&]url=([^&]+)/) || [])[1] || "");
    } catch {
      continue;
    }
    if (source.startsWith("/") && !source.startsWith("//")) out.add(u); // remote images are not ours to check
  }
  for (const m of body.matchAll(/src="(\/images\/[^"?#]+)/g)) out.add(m[1]);
  return [...out];
}

/**
 * The critical routes a release or checkout declares (scripts/deploy/critical-routes.json), or null
 * when it has none. Each route is a path, or { "path": "/x", "contains": ["text", …] } when the page
 * must also render specific markup (an enquiry form's inputs, an Add to Cart button).
 * Returns [{ path, contains: [] }].
 */
export function loadCriticalPaths(dir) {
  const c = loadCritical(dir);
  return c ? c.routes : null;
}

/**
 * Both lists of scripts/deploy/critical-routes.json, or null when the file is absent:
 *   routes    — see loadCriticalPaths
 *   redirects — [{ from, to, status }]: `from` must answer `status` (default 301) with a Location of
 *               exactly `to` (one hop), and `to` must answer 200 with a real page
 */
export function loadCritical(dir) {
  if (!dir) return null;
  const file = join(dir, CRITICAL_ROUTES_FILE);
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, "utf8"));
  const routes = Array.isArray(data) ? data : data && data.routes;
  if (!Array.isArray(routes)) throw new Error(`${file}: expected { "routes": [ … ] }`);
  const rawRedirects = (data && !Array.isArray(data) && data.redirects) || [];
  if (!Array.isArray(rawRedirects)) throw new Error(`${file}: "redirects" must be a list`);
  const isPath = (p) => typeof p === "string" && p.startsWith("/") && !p.startsWith("//");
  const redirects = rawRedirects.map((r) => {
    const status = r && r.status !== undefined ? r.status : 301;
    if (!r || !isPath(r.from) || !isPath(r.to) || ![301, 302, 307, 308].includes(status) || r.from === r.to) {
      throw new Error(`${file}: every redirect needs "from" and "to" paths and a 301/302/307/308 status (got ${JSON.stringify(r)})`);
    }
    return { from: r.from, to: r.to, status };
  });
  return { routes: parseCriticalRoutes(file, routes), redirects };
}

function parseCriticalRoutes(file, routes) {
  return routes.map((r) => {
    const route = typeof r === "string" ? { path: r, contains: [] } : { path: r && r.path, contains: (r && r.contains) || [] };
    if (typeof route.path !== "string" || !route.path.startsWith("/") || route.path.startsWith("//")) {
      throw new Error(`${file}: every route needs a path starting with "/" (got ${JSON.stringify(r)})`);
    }
    if (!Array.isArray(route.contains) || route.contains.some((c) => typeof c !== "string" || !c)) {
      throw new Error(`${file}: "contains" of ${route.path} must be a list of non-empty strings`);
    }
    return route;
  });
}

/** City slugs exactly as the workflow has always read them: `  slug: "<slug>",` lines. */
export function extractCitySlugs(source) {
  const slugs = [];
  for (const m of source.matchAll(/^[ \t]+slug: "([a-z0-9-]+)"/gm)) slugs.push(m[1]);
  return [...new Set(slugs)];
}

/** All <loc> values of a sitemap (or sitemap index). */
export function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

/** Path + query of a sitemap URL when it belongs to this site (apex or www), else null. */
export function sitePath(url, host) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const bare = host.replace(/^www\./, "");
  if (u.hostname !== bare && u.hostname !== `www.${bare}`) return null;
  return (u.pathname || "/") + u.search;
}

/** City routes (from the source) that the build did not prerender. */
export function missingFromManifest(manifest, slugs) {
  const routes = manifest && manifest.routes ? manifest.routes : {};
  return slugs.map((s) => `/cities-we-serve/${s}`).filter((r) => !(r in routes));
}

/**
 * True when an HTML body was rendered by the build with this id.
 *
 * Next 15 (App Router, what this site runs) prints the build id reliably in ONE place: the RSC
 * payload, as `"b":"<id>"`. Inside the page's inline <script> the quotes are backslash-escaped,
 * `\"b\":\"<id>\"`. That is the marker this function relies on.
 * Measured on production on 2026-10-17, the other two markers are not reliable:
 *   • `<!--<id>-->` — only in pages prerendered at build time ("-" rewritten to "_", id cut to
 *     24 characters). It disappears once ISR regenerates a page: 0 of 20 live city pages had it,
 *     hours after a deploy.
 *   • `/_next/static/<id>/` — a Pages Router path that this site's HTML never contains.
 * Both are still accepted as extra evidence, never required.
 */
export function servedByBuild(body, buildId) {
  if (!buildId) return true;
  return (
    body.includes(`\\"b\\":\\"${buildId}\\"`) ||
    body.includes(`"b":"${buildId}"`) ||
    body.includes(`<!--${buildId}-->`) ||
    body.includes(`/_next/static/${buildId}/`)
  );
}

/** The build id an HTML page was rendered by (its RSC "b" value), or null. For messages. */
export function buildIdOfPage(body) {
  const m = body.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]+)\\?"/);
  return m ? m[1] : null;
}

/**
 * Checks a parsed GET /api/build-info answer (app/api/build-info/route.ts) against the deploy.
 * Returns a list of failure messages; empty means the live process is the expected build.
 *   expectCommit — the commit the deploy built (required: a full or abbreviated hex SHA)
 *   buildId      — when known (release dir / DEPLOYED_BUILD_ID), the live build id must equal it
 */
export function checkBuildInfo(info, { expectCommit, buildId } = {}) {
  const failures = [];
  if (!info || typeof info !== "object") return ["identity: /api/build-info did not return a JSON object"];
  const commit = String(info.commit || "").toLowerCase();
  const expected = String(expectCommit || "").toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(expected)) failures.push(`identity: --expect-commit "${expectCommit}" is not a hex commit SHA`);
  else if (!/^[0-9a-f]{40}$/.test(commit)) {
    failures.push(`identity: the live build does not know its commit ("${info.commit}") — next.config.ts found no DEPLOY_COMMIT_SHA, REVISION, git checkout or GITHUB_SHA when it was built`);
  } else if (!commit.startsWith(expected)) {
    failures.push(`identity: production serves commit ${commit.slice(0, 12)}, expected ${expected.slice(0, 12)} — the deployed build is not the live one`);
  }
  if (!info.buildId || info.buildId === "unknown") failures.push("identity: /api/build-info reports no buildId");
  else if (buildId && info.buildId !== buildId) failures.push(`identity: live build ${info.buildId} is not the deployed build ${buildId}`);
  const built = Date.parse(info.builtAt);
  const started = Date.parse(info.startedAt);
  if (Number.isNaN(built) || Number.isNaN(started)) {
    failures.push(`identity: unreadable timestamps (builtAt "${info.builtAt}", startedAt "${info.startedAt}")`);
  } else if (started < built) {
    failures.push(
      `identity: the serving process started at ${info.startedAt}, BEFORE this build (${info.builtAt}) — it was not restarted after the build, so it may still run the previous code`,
    );
  }
  return failures;
}

/** One GET without following redirects. Resolves { status, body, contentType } — never rejects. */
export function get(base, path, { host, resolveTo, timeoutMs = 30000 } = {}) {
  const url = new URL(path, base);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;
  const headers = { "user-agent": "portable-office-verify-release/1", accept: "text/html,application/xml;q=0.9,*/*;q=0.8" };
  if (host) headers.host = host;
  const options = {
    method: "GET",
    hostname: resolveTo || url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    headers,
    timeout: timeoutMs,
  };
  if (isHttps) options.servername = host || url.hostname;
  return new Promise((done) => {
    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        done({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
          contentType: String(res.headers["content-type"] || ""),
          location: res.headers.location ? String(res.headers.location) : null,
        }),
      );
      res.on("error", (e) => done({ status: 0, body: "", contentType: "", error: e.message }));
    });
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs} ms`)));
    req.on("error", (e) => done({ status: 0, body: "", contentType: "", error: e.message }));
    req.end();
  });
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

/**
 * Runs every check and returns { ok, failures[], warnings[], counts{} }. Pure apart from the
 * GETs and the files under releaseDir / sourceDir, so it is unit-testable against a local server.
 */
export async function verifyRelease(opts) {
  const {
    base,
    host,
    resolveTo,
    releaseDir,
    sourceDir,
    compareBase,
    newRoutes = [],
    quick = false,
    critical = true,
    assets = true,
    concurrency = 4,
    timeoutMs = 30000,
    expectCommit,
    log = () => {},
  } = opts;
  let { buildId } = opts;
  const failures = [];
  const warnings = [];
  const counts = { build: 0, health: 0, city: 0, new: 0, sitemap: 0, identity: 0, critical: 0, redirects: 0, assets: 0, continuity: 0 };
  let identity = null;
  const req = (path, b = base) => get(b, path, { host, resolveTo: b === base ? resolveTo : undefined, timeoutMs });
  const isHtml = (r) => /text\/html/i.test(r.contentType || "");
  // A 200 that renders the not-found page is a failure (a "soft 404"), never a success.
  const softNotFound = (kind, p, r) =>
    r.status === 200 && isHtml(r) && isNotFoundPage(r.body) ? `${kind}: ${p} answered 200 but rendered the not-found page (soft 404)` : null;
  // HTML of pages whose assets are checked below: /, /products, the first city page, every critical route.
  const assetPages = new Map();

  // ── build: the release's own source + manifest + BUILD_ID ─────────────────────────────────
  const srcDir = releaseDir || sourceDir;
  let slugs = [];
  if (srcDir) {
    const cityFile = join(srcDir, "src/data/cityPages.ts");
    if (!existsSync(cityFile)) failures.push(`build: ${cityFile} not found`);
    else slugs = extractCitySlugs(readFileSync(cityFile, "utf8"));
    if (existsSync(cityFile) && slugs.length === 0) failures.push("build: no city slugs found in src/data/cityPages.ts");
  }
  if (releaseDir) {
    const idFile = join(releaseDir, ".next/BUILD_ID");
    const manifestFile = join(releaseDir, ".next/prerender-manifest.json");
    if (!buildId && existsSync(idFile)) buildId = readFileSync(idFile, "utf8").trim();
    if (!buildId) failures.push("build: .next/BUILD_ID is missing — the release was not built");
    if (!existsSync(manifestFile)) failures.push("build: .next/prerender-manifest.json is missing");
    else {
      let manifest = null;
      try {
        manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
      } catch (e) {
        failures.push(`build: prerender-manifest.json is not valid JSON (${e.message})`);
      }
      if (manifest) {
        const missing = missingFromManifest(manifest, slugs);
        counts.build = slugs.length - missing.length;
        for (const r of missing) failures.push(`build: ${r} is in cityPages.ts but was not prerendered`);
      }
    }
  }
  // ── identity: the live process names the commit it was built from (--expect-commit) ───────
  // Its build id then becomes the build every page below must come from: a page rendered by any
  // other process or build (a stale or cached page) fails, even when no --build-id was given.
  if (expectCommit) {
    const r = await req("/api/build-info");
    let info = null;
    if (r.status === 200) {
      try {
        info = JSON.parse(r.body);
      } catch {
        /* reported below */
      }
    }
    if (r.status !== 200) {
      failures.push(`identity: /api/build-info answered ${r.status || r.error} — the deployed build (which has this endpoint) is not the one serving`);
    } else if (!info) {
      failures.push("identity: /api/build-info did not return JSON");
    } else {
      const f = checkBuildInfo(info, { expectCommit, buildId });
      failures.push(...f);
      identity = info;
      if (!buildId && info.buildId && info.buildId !== "unknown") buildId = info.buildId;
      if (f.length === 0) counts.identity = 1;
      log(`identity: commit ${String(info.commit).slice(0, 12)} · build ${info.buildId} · built ${info.builtAt} · process started ${info.startedAt}`);
    }
  }

  log(`build id ${buildId || "(not checked)"} · ${slugs.length} city pages in the source`);

  // ── health paths + the build marker on / ──────────────────────────────────────────────────
  for (const p of HEALTH_PATHS) {
    const r = await req(p);
    const soft = softNotFound("health", p, r);
    if (r.status !== 200) failures.push(`health: ${p} answered ${r.status || r.error}`);
    else if (soft) failures.push(soft);
    else counts.health++;
    if (p === "/" && r.status === 200 && !servedByBuild(r.body, buildId)) {
      failures.push(`health: / is not served by build ${buildId} (another build answered)`);
    }
    if ((p === "/" || p === "/products") && r.status === 200) assetPages.set(p, r.body);
  }

  // ── new routes first, then every city page — 200 AND rendered by this build ───────────────
  const cityPaths = slugs.map((s) => `/cities-we-serve/${s}`);
  const newPaths = [...new Set(newRoutes.filter(Boolean))];
  const checkPage = async (p, kind) => {
    const r = await req(p);
    if (r.status !== 200) return `${kind}: ${p} answered ${r.status || r.error}`;
    const soft = softNotFound(kind, p, r);
    if (soft) return soft;
    if (!servedByBuild(r.body, buildId)) {
      return `${kind}: ${p} answered 200 but from another build (stale page: ${buildIdOfPage(r.body) || "no build id"}, expected ${buildId})`;
    }
    if (kind === "city" && p === cityPaths[0]) assetPages.set(p, r.body);
    counts[kind]++;
    return null;
  };
  for (const f of await pool(newPaths, concurrency, (p) => checkPage(p, "new"))) if (f) failures.push(f);
  for (const f of await pool(cityPaths, concurrency, (p) => checkPage(p, "city"))) if (f) failures.push(f);

  // ── critical routes: 200, this build, real content (an <h1>, any required markup) ─────────
  let criticalRoutes = [];
  let criticalRedirects = [];
  if (critical) {
    try {
      const c = loadCritical(releaseDir) || loadCritical(sourceDir);
      if (c) ({ routes: criticalRoutes, redirects: criticalRedirects } = c);
      else if (srcDir) log(`critical: no ${CRITICAL_ROUTES_FILE} in ${srcDir} — skipped`);
    } catch (e) {
      failures.push(`critical: ${e.message}`);
    }
  }
  const criticalResults = await pool(criticalRoutes, concurrency, async ({ path: p, contains }) => {
    const r = await req(p);
    if (r.status !== 200) return [`critical: ${p} answered ${r.status || r.error}`];
    const soft = softNotFound("critical", p, r);
    if (soft) return [soft];
    const out = [];
    if (!isHtml(r)) out.push(`critical: ${p} answered 200 with ${r.contentType || "no content type"}, not an HTML page`);
    if (!servedByBuild(r.body, buildId)) {
      out.push(`critical: ${p} answered 200 but from another build (stale page: ${buildIdOfPage(r.body) || "no build id"}, expected ${buildId})`);
    }
    if (!/<h1[\s>]/i.test(r.body)) out.push(`critical: ${p} answered 200 but rendered no <h1> (an empty or error page)`);
    for (const c of contains) if (!r.body.includes(c)) out.push(`critical: ${p} does not contain ${JSON.stringify(c)}`);
    if (out.length === 0) {
      counts.critical++;
      assetPages.set(p, r.body);
    }
    return out;
  });
  for (const list of criticalResults) failures.push(...list);

  // ── redirects: one hop, the declared status, exactly the declared target, which is a page ──
  const redirectResults = await pool(criticalRedirects, concurrency, async ({ from, to, status }) => {
    const r = await req(from);
    let target = null;
    try {
      const u = new URL(r.location || "", new URL(from, base));
      const siteHost = (host || new URL(base).hostname).replace(/^www\./, "");
      // Relative, same-origin, or absolute to this site (apex or www): compare the path + query.
      if (!r.location) target = null;
      else if (r.location.startsWith("/") || u.hostname.replace(/^www\./, "") === siteHost || u.origin === new URL(base).origin) target = u.pathname + u.search;
      else target = u.href;
    } catch {
      target = r.location;
    }
    if (r.status !== status || target !== to) {
      return `redirect: ${from} answered ${r.status || r.error}${r.location ? ` → ${r.location}` : ""}, expected ${status} → ${to}`;
    }
    const d = await req(to);
    if (d.status !== 200) return `redirect: ${from} → ${to}, which answered ${d.status || d.error} (a redirect to a broken page)`;
    const soft = softNotFound("redirect", to, d);
    if (soft) return soft;
    counts.redirects++;
    return null;
  });
  for (const f of redirectResults) if (f) failures.push(f);

  // ── assets: every JS/CSS file and image those pages load answers 200 ──────────────────────
  if (assets && assetPages.size) {
    const refs = [...new Set([...assetPages.values()].flatMap(assetRefs))];
    const results = await pool(refs, concurrency, async (p) => {
      const r = await req(p);
      if (r.status !== 200) return `assets: ${p} answered ${r.status || r.error}`;
      if (isHtml(r)) return `assets: ${p} answered 200 with an HTML page instead of the file`;
      counts.assets++;
      return null;
    });
    for (const f of results) if (f) failures.push(f);
    log(`assets: ${counts.assets}/${refs.length} files referenced by ${assetPages.size} pages answered 200`);
  }

  // ── continuity: the LIVE build's chunks are still served by the NEW release ───────────────
  // A tab opened before the switch keeps requesting the old build's /_next/static files; the
  // deploy script copies them into the new release (carry_static_assets). Checked on the live
  // home page's own references, which is what every open tab of the old build has loaded.
  if (assets && compareBase) {
    const live = await get(compareBase, "/", { host, timeoutMs });
    if (live.status !== 200) {
      warnings.push(`continuity: could not read / at ${compareBase} (${live.status || live.error}) — not checked`);
    } else {
      const refs = staticRefs(live.body);
      const results = await pool(refs, concurrency, async (p) => {
        const r = await req(p);
        if (r.status !== 200) return `continuity: ${p} (live build) answered ${r.status || r.error} from the new release — open tabs would break after the switch`;
        counts.continuity++;
        return null;
      });
      for (const f of results) if (f) failures.push(f);
      log(`continuity: ${counts.continuity}/${refs.length} static files of the live build are served by the new release`);
    }
  }

  // ── every sitemap URL on this host ────────────────────────────────────────────────────────
  let newSitemapPaths = null;
  const sm = await req("/sitemap.xml");
  if (sm.status === 200) {
    newSitemapPaths = parseSitemapLocs(sm.body).map((u) => sitePath(u, host || new URL(base).hostname)).filter(Boolean);
    if (!quick) {
      const already = new Set([...cityPaths, ...newPaths, ...HEALTH_PATHS, ...criticalRoutes.map((c) => c.path)]);
      const rest = [...new Set(newSitemapPaths)].filter((p) => !already.has(p));
      const results = await pool(rest, concurrency, async (p) => {
        const r = await req(p);
        if (r.status !== 200) return `sitemap: ${p} answered ${r.status || r.error}`;
        const soft = softNotFound("sitemap", p, r);
        if (soft) return soft;
        counts.sitemap++;
        return null;
      });
      for (const f of results) if (f) failures.push(f);
    }
  }

  // ── pages that would disappear (warning only) ─────────────────────────────────────────────
  if (compareBase && newSitemapPaths) {
    const old = await get(compareBase, "/sitemap.xml", { host, timeoutMs });
    if (old.status === 200) {
      const now = new Set(newSitemapPaths);
      const gone = parseSitemapLocs(old.body)
        .map((u) => sitePath(u, host || new URL(base).hostname))
        .filter((p) => p && !now.has(p));
      for (const p of [...new Set(gone)]) warnings.push(`compare: ${p} is in the live sitemap but not in the new release's sitemap`);
    } else {
      warnings.push(`compare: could not read the live sitemap at ${compareBase} (${old.status || old.error})`);
    }
  }

  return { ok: failures.length === 0, failures, warnings, counts, buildId, identity };
}

function parseArgs(argv) {
  const a = { newRoutes: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--base") a.base = v();
    else if (k === "--host") a.host = v();
    else if (k === "--resolve") a.resolveTo = v();
    else if (k === "--release-dir") a.releaseDir = resolve(v());
    else if (k === "--source-dir") a.sourceDir = resolve(v());
    else if (k === "--build-id") a.buildId = v();
    else if (k === "--expect-commit") a.expectCommit = v();
    else if (k === "--compare-base") a.compareBase = v();
    else if (k === "--new-routes") a.newRoutes.push(...v().split(",").map((s) => s.trim()).filter(Boolean));
    else if (k === "--concurrency") a.concurrency = Number(v());
    else if (k === "--timeout-ms") a.timeoutMs = Number(v());
    else if (k === "--quick") a.quick = true;
    else if (k === "--no-critical") a.critical = false;
    else if (k === "--no-assets") a.assets = false;
    else if (k === "--github") a.github = true;
    else throw new Error(`unknown argument ${k}`);
  }
  if (!a.base) throw new Error("--base is required");
  return a;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`verify-release: ${e.message}`);
    process.exitCode = 2;
    return;
  }
  const started = Date.now();
  const res = await verifyRelease({ ...args, log: (m) => console.log(`verify: ${m}`) });
  const c = res.counts;
  console.log(
    `verify: ${args.base} — ${args.expectCommit ? `identity ${c.identity}/1, ` : ""}build ${c.build}, health ${c.health}/${HEALTH_PATHS.length}, new ${c.new}, city ${c.city}, critical ${c.critical}, redirects ${c.redirects}, assets ${c.assets}${args.compareBase ? `, continuity ${c.continuity}` : ""}, sitemap ${c.sitemap} OK` +
      ` · ${res.failures.length} failure(s), ${res.warnings.length} warning(s) · ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  for (const w of res.warnings) console.log(args.github ? `::warning::${w}` : `verify: WARNING ${w}`);
  for (const f of res.failures) console.log(args.github ? `::error::${f}` : `verify: FAIL ${f}`);
  console.log(res.ok ? "verify: PASSED" : "verify: FAILED");
  process.exitCode = res.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    console.error(`verify-release crashed: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 2;
  });
}
