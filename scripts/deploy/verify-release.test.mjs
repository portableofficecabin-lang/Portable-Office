// Tests for scripts/deploy/verify-release.mjs — run with: node --test scripts/deploy/
// Node built-ins only (node:test + a throwaway HTTP server); no network, no dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractCitySlugs,
  parseSitemapLocs,
  sitePath,
  missingFromManifest,
  servedByBuild,
  buildIdOfPage,
  checkBuildInfo,
  verifyRelease,
  isNotFoundPage,
  NOT_FOUND_MARKERS,
  staticRefs,
  assetRefs,
  loadCriticalPaths,
  loadCritical,
  CRITICAL_ROUTES_FILE,
} from "./verify-release.mjs";

/** HTML as Next 15 (App Router) serves an ISR-regenerated page: the build id ONLY in the escaped
 *  RSC "b" (a page prerendered at build time also has <!--id-->; regenerated pages lose it). */
const appRouterHtml = (id) =>
  `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body><main>page</main>` +
  `<script>self.__next_f.push([1,"0:{\\"P\\":null,\\"b\\":\\"${id}\\",\\"p\\":\\"\\",\\"c\\":[\\"\\",\\"\\"]}\\n"])</script></body></html>`;
const SHA = "a835e86a552f92ac59be861bf116dd3e452083a9";
const OTHER_SHA = "64dfddaf70ee64f02e805aa2970ad10b0a84019c";

const HOST = "portableofficecabin.com";
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── pure helpers ──────────────────────────────────────────────────────────────────────────
test("extractCitySlugs reads the same `slug:` lines the deploy workflow reads", () => {
  const src = `export const CITY_PAGES = [\n  {\n    slug: "container-office-in-a",\n  },\n  {\n    slug: "shipping-container-in-b",\n  },\n];\n// slug: "not-indented"\n`;
  assert.deepEqual(extractCitySlugs(src), ["container-office-in-a", "shipping-container-in-b"]);
});

test("extractCitySlugs finds every city page in the real src/data/cityPages.ts", () => {
  const src = readFileSync(join(REPO_ROOT, "src/data/cityPages.ts"), "utf8");
  const slugs = extractCitySlugs(src);
  const lines = src.match(/^[ \t]+slug: "[a-z0-9-]+"/gm) || [];
  assert.ok(slugs.length >= 20, `expected the live city pages, got ${slugs.length}`);
  assert.equal(slugs.length, new Set(lines).size);
  assert.ok(slugs.includes("shipping-container-in-mettur-salem"));
});

test("parseSitemapLocs + sitePath keep only this site's paths (apex and www)", () => {
  const xml = `<urlset><url><loc>https://portableofficecabin.com/</loc></url><url><loc> https://www.portableofficecabin.com/a?x=1&amp;y=2 </loc></url><url><loc>https://example.com/b</loc></url></urlset>`;
  const paths = parseSitemapLocs(xml).map((u) => sitePath(u, HOST));
  assert.deepEqual(paths, ["/", "/a?x=1&y=2", null]);
});

test("missingFromManifest lists city routes the build did not prerender", () => {
  const manifest = { routes: { "/cities-we-serve/a": {}, "/": {} } };
  assert.deepEqual(missingFromManifest(manifest, ["a", "b"]), ["/cities-we-serve/b"]);
  assert.deepEqual(missingFromManifest({}, ["a"]), ["/cities-we-serve/a"]);
});

test("servedByBuild recognises the App Router RSC marker — the one Next 15 always prints", () => {
  assert.ok(servedByBuild(appRouterHtml("a835e86a552f_mvcbu719"), "a835e86a552f_mvcbu719"));
  assert.ok(servedByBuild('0:{"P":null,"b":"abc123","p":""}', "abc123"), "raw RSC payload");
  assert.ok(!servedByBuild(appRouterHtml("old999"), "abc123"));
  assert.ok(!servedByBuild(appRouterHtml("abc1234"), "abc123"), "a longer id is a different build");
  assert.ok(servedByBuild("anything", undefined), "no build id given ⇒ not checked");
});

test("servedByBuild still accepts the two Pages Router markers", () => {
  assert.ok(servedByBuild("<!DOCTYPE html><!--abc123--><html>", "abc123"));
  assert.ok(servedByBuild('<script src="/_next/static/abc123/_buildManifest.js">', "abc123"));
  assert.ok(!servedByBuild("<!DOCTYPE html><!--old999--><html>", "abc123"));
});

test("buildIdOfPage reads the RSC build id (for failure messages)", () => {
  assert.equal(buildIdOfPage(appRouterHtml("a835e86a552f_mvcbu719")), "a835e86a552f_mvcbu719");
  assert.equal(buildIdOfPage("<html>no payload</html>"), null);
});

test("checkBuildInfo passes only the expected commit, on a process restarted after its build", () => {
  const info = { commit: SHA, buildId: "a835e86a552f-x", builtAt: "2026-10-17T11:42:21.213Z", startedAt: "2026-10-17T11:53:34.642Z" };
  assert.deepEqual(checkBuildInfo(info, { expectCommit: SHA }), []);
  assert.deepEqual(checkBuildInfo(info, { expectCommit: SHA.slice(0, 7) }), [], "abbreviated SHA");
  assert.deepEqual(checkBuildInfo(info, { expectCommit: SHA.toUpperCase() }), [], "case-insensitive");
  assert.deepEqual(checkBuildInfo(info, { expectCommit: SHA, buildId: "a835e86a552f-x" }), []);

  const wrong = checkBuildInfo(info, { expectCommit: OTHER_SHA });
  assert.equal(wrong.length, 1);
  assert.match(wrong[0], /serves commit a835e86a552f, expected 64dfddaf70ee/);

  assert.match(checkBuildInfo({ ...info, commit: "unknown" }, { expectCommit: SHA })[0], /does not know its commit/);
  assert.match(checkBuildInfo(info, { expectCommit: SHA, buildId: "other-build" })[0], /is not the deployed build other-build/);
  assert.match(
    checkBuildInfo({ ...info, startedAt: "2026-10-17T11:00:00.000Z" }, { expectCommit: SHA })[0],
    /BEFORE this build/,
    "a process that was not restarted after the build",
  );
  assert.match(checkBuildInfo({ ...info, builtAt: "unknown" }, { expectCommit: SHA })[0], /unreadable timestamps/);
  assert.match(checkBuildInfo(info, { expectCommit: "main" })[0], /not a hex commit SHA/);
  assert.match(checkBuildInfo(null, { expectCommit: SHA })[0], /did not return a JSON object/);
});

// ── not-found page, asset references, critical routes ─────────────────────────────────────
test("isNotFoundPage recognises the site's not-found page and Next's default one", () => {
  assert.ok(isNotFoundPage("<main><h1>404</h1><p>Oops! Page not found</p></main>"));
  assert.ok(isNotFoundPage("<h2>This page could not be found.</h2>"));
  assert.ok(!isNotFoundPage(appRouterHtml("x")));
});

test("the marker matches the site's own not-found page (src/views/NotFound.tsx)", () => {
  const view = readFileSync(join(REPO_ROOT, "src/views/NotFound.tsx"), "utf8");
  assert.ok(view.includes(NOT_FOUND_MARKERS[0]), `src/views/NotFound.tsx no longer renders "${NOT_FOUND_MARKERS[0]}" — update NOT_FOUND_MARKERS`);
});

test("assetRefs lists JS/CSS, next/image URLs as requested and /images files; not remote images", () => {
  const html =
    `<link rel="stylesheet" href="/_next/static/css/a1.css" data-precedence="next"/>` +
    `<script src="/_next/static/chunks/main-1.js?dpl=x" async=""></script><script src="/_next/static/chunks/main-1.js"></script>` +
    `<img src="/_next/image?url=%2Fimages%2Fcab%20in.webp&amp;w=640&amp;q=75" srcset="/_next/image?url=%2Fimages%2Fcab%20in.webp&amp;w=320&amp;q=75 1x"/>` +
    `<img src="/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fx.png&amp;w=64&amp;q=75"/>` +
    `<img src="/images/logo.png" alt=""/><a href="/products">x</a>`;
  assert.deepEqual(staticRefs(html), ["/_next/static/css/a1.css", "/_next/static/chunks/main-1.js"]);
  assert.deepEqual(assetRefs(html), [
    "/_next/static/css/a1.css",
    "/_next/static/chunks/main-1.js",
    "/_next/image?url=%2Fimages%2Fcab%20in.webp&w=640&q=75",
    "/images/logo.png",
  ]);
});

test("loadCriticalPaths reads paths and { path, contains } entries and rejects bad ones", () => {
  const dir = mkdtempSync(join(tmpdir(), "critical-"));
  try {
    assert.equal(loadCriticalPaths(dir), null, "no file ⇒ null (older releases)");
    assert.equal(loadCriticalPaths(undefined), null);
    mkdirSync(join(dir, "scripts/deploy"), { recursive: true });
    const write = (v) => writeFileSync(join(dir, CRITICAL_ROUTES_FILE), JSON.stringify(v));
    write({ routes: ["/a", { path: "/b", contains: ["<input"] }] });
    assert.deepEqual(loadCriticalPaths(dir), [
      { path: "/a", contains: [] },
      { path: "/b", contains: ["<input"] },
    ]);
    for (const bad of [{ routes: ["a"] }, { routes: ["//evil.example"] }, { routes: [{ path: "/b", contains: [""] }] }, { routes: [{}] }, { nope: 1 }]) {
      write(bad);
      assert.throws(() => loadCriticalPaths(dir), /critical-routes\.json/, JSON.stringify(bad));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the repository's critical-routes.json is valid and covers the pages the owner named", () => {
  const routes = loadCriticalPaths(REPO_ROOT).map((r) => r.path);
  for (const p of [
    "/cities-we-serve/shipping-container-in-mysore",
    "/cities-we-serve/shipping-container-in-mettur-salem",
    "/products/shipping-container-for-sale",
    "/products/cargo-container-for-sale",
    "/contact",
  ]) {
    assert.ok(routes.includes(p), `${p} is missing from ${CRITICAL_ROUTES_FILE}`);
  }
  // Every critical city page must still exist in the source, or every deploy would be refused.
  const slugs = extractCitySlugs(readFileSync(join(REPO_ROOT, "src/data/cityPages.ts"), "utf8"));
  for (const p of routes.filter((r) => r.startsWith("/cities-we-serve/"))) {
    assert.ok(slugs.includes(p.slice("/cities-we-serve/".length)), `${p} is not in src/data/cityPages.ts`);
  }
});

// ── end-to-end against a fake release ─────────────────────────────────────────────────────
/**
 * A release dir + a server that behaves like `next start` of it, with switchable faults. Every
 * page loads /_next/static/chunks/main-<buildId>.js and one next/image URL, and has an <h1>.
 * `carried` lists older build ids whose chunk the release also serves (carry_static_assets).
 */
async function fakeRelease({
  slugs = ["c1", "c2"],
  buildId = "BUILD1",
  extraSitemap = ["/products/p1"],
  critical = null,
  criticalRedirects = null,
  redirects = {},
  carried = [],
  faults = {},
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "verify-release-"));
  mkdirSync(join(dir, "src/data"), { recursive: true });
  mkdirSync(join(dir, ".next"), { recursive: true });
  writeFileSync(join(dir, "src/data/cityPages.ts"), slugs.map((s) => `  {\n    slug: "${s}",\n  },`).join("\n"));
  writeFileSync(join(dir, ".next/BUILD_ID"), buildId);
  const routes = Object.fromEntries(slugs.filter((s) => s !== faults.notPrerendered).map((s) => [`/cities-we-serve/${s}`, {}]));
  writeFileSync(join(dir, ".next/prerender-manifest.json"), JSON.stringify({ version: 4, routes }));
  if (critical || criticalRedirects) {
    mkdirSync(join(dir, "scripts/deploy"), { recursive: true });
    writeFileSync(join(dir, CRITICAL_ROUTES_FILE), JSON.stringify({ routes: critical || [], ...(criticalRedirects ? { redirects: criticalRedirects } : {}) }));
  }

  const notFoundHtml = (id) => appRouterHtml(id).replace("<main>page</main>", "<main><h1>404</h1><p>Oops! Page not found</p></main>");
  // A rendered page: its build's chunk, one optimised image, an <h1> (unless the fault removes it).
  const html = (id, p = "") =>
    appRouterHtml(id).replace(
      "<main>page</main>",
      `<script src="/_next/static/chunks/main-${id}.js" async=""></script>` +
        `<main>${faults.noH1 === p ? "" : "<h1>Page</h1>"}<button>Add to Cart</button>` +
        `<img src="/_next/image?url=%2Fimages%2Fa.webp&amp;w=640&amp;q=75"/></main>`,
    );
  const chunks = new Set([buildId, ...carried].map((id) => `/_next/static/chunks/main-${id}.js`));
  const sitemapPaths = ["/", "/cities-we-serve", ...slugs.map((s) => `/cities-we-serve/${s}`), ...extraSitemap];
  const buildInfo = {
    commit: SHA,
    buildId,
    builtAt: "2026-10-17T11:42:21.213Z",
    startedAt: "2026-10-17T11:53:34.642Z",
    ...(faults.buildInfo || {}),
  };
  const seenHosts = new Set();
  const server = http.createServer((req, res) => {
    seenHosts.add(req.headers.host);
    const p = req.url;
    const send = (code, body, type = "text/html") => {
      res.writeHead(code, { "content-type": type });
      res.end(body);
    };
    if (p === "/sitemap.xml") {
      return send(200, `<urlset>${sitemapPaths.map((x) => `<url><loc>https://${HOST}${x}</loc></url>`).join("")}</urlset>`, "application/xml");
    }
    if (p === "/robots.txt") return send(200, "User-agent: *", "text/plain");
    if (p === "/api/build-info") {
      if (faults.noBuildInfo) return send(404, html(buildId));
      if (faults.buildInfoStatus) return send(faults.buildInfoStatus, "upstream error");
      if (faults.buildInfoRaw !== undefined) return send(200, faults.buildInfoRaw, faults.buildInfoType || "application/json");
      return send(200, JSON.stringify(buildInfo), "application/json");
    }
    if (redirects[p]) {
      // [status, Location] as the app sends it (relative or absolute)
      res.writeHead(redirects[p][0], { location: redirects[p][1] });
      return res.end();
    }
    if (faults.softNotFound === p) return send(200, notFoundHtml(buildId)); // a branded 404 with status 200
    if (p.startsWith("/_next/static/")) {
      if (faults.assetAsHtml === p) return send(200, notFoundHtml(buildId));
      return chunks.has(p) && faults.missingAsset !== p ? send(200, "/* chunk */", "application/javascript") : send(404, "", "text/plain");
    }
    if (p.startsWith("/_next/image?")) return faults.brokenImage ? send(500, "image optimiser error", "text/plain") : send(200, "RIFF", "image/webp");
    if (p === "/" || p === "/cities-we-serve" || p === "/products") return send(200, html(faults.wrongBuildOnRoot ? "OTHER" : buildId, p));
    const m = p.match(/^\/cities-we-serve\/([a-z0-9-]+)$/);
    if (m && slugs.includes(m[1])) {
      if (faults.cached404 === m[1]) return send(404, html("OLDBUILD"));
      if (faults.stale === m[1]) return send(200, html("OLDBUILD"));
      return send(200, html(buildId, p));
    }
    if ((critical || []).some((r) => (typeof r === "string" ? r : r.path) === p)) return send(200, html(buildId, p));
    if (extraSitemap.includes(p)) return send(faults.brokenSitemapUrl === p ? 500 : 200, html(buildId, p));
    return send(404, notFoundHtml(buildId));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((r) => server.close(() => (rmSync(dir, { recursive: true, force: true }), r())));
  return { dir, base, close, seenHosts };
}

test("a healthy release passes every check, with the Host header of the real site", async () => {
  const f = await fakeRelease();
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.deepEqual(r.failures, []);
    assert.equal(r.ok, true);
    assert.equal(r.buildId, "BUILD1");
    // assets: the build's one chunk + the one next/image URL every page loads (de-duplicated).
    assert.deepEqual(r.counts, { build: 2, health: 5, city: 2, new: 0, sitemap: 1, identity: 0, critical: 0, redirects: 0, assets: 2, continuity: 0 });
    assert.deepEqual([...f.seenHosts], [HOST]);
  } finally {
    await f.close();
  }
});

// ── soft 404s, critical routes, assets, continuity ────────────────────────────────────────
const CRITICAL = ["/products/x", { path: "/contact", contains: ["<h1>Page</h1>", "Add to Cart"] }];

test("critical routes from the release pass and are counted", async () => {
  const f = await fakeRelease({ critical: CRITICAL });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.deepEqual(r.failures, []);
    assert.equal(r.counts.critical, 2);
  } finally {
    await f.close();
  }
});

test("critical routes are read from --source-dir when there is no release dir (the workflow's mode)", async () => {
  const f = await fakeRelease({ critical: CRITICAL });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, quick: true });
    assert.deepEqual(r.failures, []);
    assert.equal(r.counts.critical, 2);
  } finally {
    await f.close();
  }
});

test("a 200 that renders the not-found page FAILS everywhere it is checked (soft 404)", async () => {
  const cases = [
    ["/cities-we-serve/c2", {}, "city: /cities-we-serve/c2 answered 200 but rendered the not-found page (soft 404)"],
    ["/products/x", { critical: CRITICAL }, "critical: /products/x answered 200 but rendered the not-found page (soft 404)"],
    ["/products/p1", {}, "sitemap: /products/p1 answered 200 but rendered the not-found page (soft 404)"],
    ["/products", {}, "health: /products answered 200 but rendered the not-found page (soft 404)"],
  ];
  for (const [path, opts, expected] of cases) {
    const f = await fakeRelease({ ...opts, faults: { softNotFound: path } });
    try {
      const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
      assert.equal(r.ok, false, path);
      assert.ok(r.failures.includes(expected), `${path} → ${r.failures.join(" | ")}`);
    } finally {
      await f.close();
    }
  }
});

test("a critical route without an <h1>, or without its required markup, FAILS", async () => {
  const f = await fakeRelease({ critical: ["/products/x", { path: "/contact", contains: ["<input"] }], faults: { noH1: "/products/x" } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true });
    assert.ok(r.failures.includes("critical: /products/x answered 200 but rendered no <h1> (an empty or error page)"), r.failures.join("\n"));
    assert.ok(r.failures.includes('critical: /contact does not contain "<input"'), r.failures.join("\n"));
    assert.equal(r.counts.critical, 0);
  } finally {
    await f.close();
  }
});

test("a critical route that 404s FAILS; --no-critical skips the list", async () => {
  const f = await fakeRelease({ critical: CRITICAL });
  try {
    writeFileSync(join(f.dir, CRITICAL_ROUTES_FILE), JSON.stringify({ routes: ["/products/missing"] }));
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true });
    assert.ok(r.failures.includes("critical: /products/missing answered 404"), r.failures.join("\n"));
    const off = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true, critical: false });
    assert.deepEqual(off.failures, []);
  } finally {
    await f.close();
  }
});

test("declared redirects: one hop to exactly the target, which is a page; anything else FAILS", async () => {
  const declared = [{ from: "/old", to: "/products/p1", status: 301 }];
  const run = async (redirects, extra = {}) => {
    const f = await fakeRelease({ criticalRedirects: declared, redirects, ...extra });
    try {
      return await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true });
    } finally {
      await f.close();
    }
  };
  const ok = await run({ "/old": [301, "/products/p1"] });
  assert.deepEqual(ok.failures, []);
  assert.equal(ok.counts.redirects, 1);
  assert.deepEqual((await run({ "/old": [301, `https://www.${HOST}/products/p1`] })).failures, [], "absolute Location to this site");

  const cases = [
    [{}, "redirect: /old answered 404, expected 301 → /products/p1"],
    [{ "/old": [308, "/products/p1"] }, "redirect: /old answered 308 → /products/p1, expected 301 → /products/p1"],
    [{ "/old": [301, "/mid"], "/mid": [301, "/products/p1"] }, "redirect: /old answered 301 → /mid, expected 301 → /products/p1"],
    [{ "/old": [301, "https://example.com/products/p1"] }, "redirect: /old answered 301 → https://example.com/products/p1, expected 301 → /products/p1"],
  ];
  for (const [redirects, expected] of cases) {
    const r = await run(redirects);
    assert.ok(r.failures.includes(expected), `${JSON.stringify(redirects)} → ${r.failures.join(" | ")}`);
  }
  const broken = await run({ "/old": [301, "/products/p1"] }, { faults: { softNotFound: "/products/p1" } });
  assert.ok(broken.failures.includes("redirect: /products/p1 answered 200 but rendered the not-found page (soft 404)"), broken.failures.join("\n"));
});

test("the repository's declared redirects exist in next.config.ts", () => {
  const config = readFileSync(join(REPO_ROOT, "next.config.ts"), "utf8");
  for (const { from, to, status } of loadCritical(REPO_ROOT).redirects) {
    const m = config.match(new RegExp(`source:\\s*"${from.replace(/[/-]/g, "\\$&")}",\\s*destination:\\s*"([^"]+)",\\s*statusCode:\\s*(\\d+)`));
    assert.ok(m, `${from} has no redirect in next.config.ts`);
    assert.equal(m[1], to, from);
    assert.equal(Number(m[2]), status, from);
  }
});

test("a missing JS chunk, a broken image or an HTML page served as a chunk FAILS; --no-assets skips", async () => {
  const chunk = "/_next/static/chunks/main-BUILD1.js";
  const cases = [
    [{ missingAsset: chunk }, `assets: ${chunk} answered 404`],
    [{ brokenImage: true }, "assets: /_next/image?url=%2Fimages%2Fa.webp&w=640&q=75 answered 500"],
    [{ assetAsHtml: chunk }, `assets: ${chunk} answered 200 with an HTML page instead of the file`],
  ];
  for (const [faults, expected] of cases) {
    const f = await fakeRelease({ faults });
    try {
      const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true });
      assert.ok(r.failures.includes(expected), `${JSON.stringify(faults)} → ${r.failures.join(" | ")}`);
      const off = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true, assets: false });
      assert.deepEqual(off.failures, [], JSON.stringify(faults));
    } finally {
      await f.close();
    }
  }
});

test("continuity: the new release must serve the live build's chunks (open tabs keep working)", async () => {
  const live = await fakeRelease({ buildId: "OLD1" });
  const carriedRel = await fakeRelease({ buildId: "NEW2", carried: ["OLD1"] });
  const bareRel = await fakeRelease({ buildId: "NEW3" });
  try {
    const ok = await verifyRelease({ base: carriedRel.base, host: HOST, releaseDir: carriedRel.dir, compareBase: live.base, quick: true });
    assert.deepEqual(ok.failures, []);
    assert.equal(ok.counts.continuity, 1);
    const bad = await verifyRelease({ base: bareRel.base, host: HOST, releaseDir: bareRel.dir, compareBase: live.base, quick: true });
    assert.ok(
      bad.failures.includes(
        "continuity: /_next/static/chunks/main-OLD1.js (live build) answered 404 from the new release — open tabs would break after the switch",
      ),
      bad.failures.join("\n"),
    );
  } finally {
    await live.close();
    await carriedRel.close();
    await bareRel.close();
  }
});

test("a city page answering a cached 404 FAILS the release (the stale-404 incident)", async () => {
  const f = await fakeRelease({ faults: { cached404: "c2" } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((x) => x.includes("/cities-we-serve/c2 answered 404")), r.failures.join("\n"));
  } finally {
    await f.close();
  }
});

test("a 200 rendered by an older build FAILS (stale page after a deploy)", async () => {
  const f = await fakeRelease({ faults: { stale: "c1" } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((x) => x.includes("/cities-we-serve/c1") && x.includes("another build")));
  } finally {
    await f.close();
  }
});

test("a city page missing from the prerender manifest FAILS before any request matters", async () => {
  const f = await fakeRelease({ faults: { notPrerendered: "c2" } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.ok(r.failures.includes("build: /cities-we-serve/c2 is in cityPages.ts but was not prerendered"));
  } finally {
    await f.close();
  }
});

test("/ served by a different build FAILS (traffic still on the old process)", async () => {
  const f = await fakeRelease({ faults: { wrongBuildOnRoot: true } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.ok(r.failures.some((x) => x.startsWith("health: / is not served by build BUILD1")));
  } finally {
    await f.close();
  }
});

test("a broken sitemap URL FAILS the full check but is skipped by --quick", async () => {
  const f = await fakeRelease({ faults: { brokenSitemapUrl: "/products/p1" } });
  try {
    const full = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir });
    assert.ok(full.failures.includes("sitemap: /products/p1 answered 500"));
    const quick = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, quick: true });
    assert.deepEqual(quick.failures, []);
  } finally {
    await f.close();
  }
});

test("new routes are checked and counted; an unknown new route FAILS", async () => {
  const f = await fakeRelease();
  try {
    const ok = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, newRoutes: ["/cities-we-serve/c2"] });
    assert.equal(ok.counts.new, 1);
    assert.equal(ok.ok, true);
    const bad = await verifyRelease({ base: f.base, host: HOST, releaseDir: f.dir, newRoutes: ["/cities-we-serve/not-built"] });
    assert.ok(bad.failures.includes("new: /cities-we-serve/not-built answered 404"));
  } finally {
    await f.close();
  }
});

test("pages that vanish from the sitemap are WARNINGS, not failures", async () => {
  const oldRel = await fakeRelease({ slugs: ["c1", "c2", "gone"] });
  const newRel = await fakeRelease({ slugs: ["c1", "c2"] });
  try {
    const r = await verifyRelease({ base: newRel.base, host: HOST, releaseDir: newRel.dir, compareBase: oldRel.base });
    assert.equal(r.ok, true);
    assert.deepEqual(r.warnings, ["compare: /cities-we-serve/gone is in the live sitemap but not in the new release's sitemap"]);
  } finally {
    await oldRel.close();
    await newRel.close();
  }
});

// ── --expect-commit: the live process names its commit (GET /api/build-info) ─────────────────
// These run the way the deploy workflow does: --source-dir only, no release dir, no build id.
test("--expect-commit passes and adopts the live build id for every page", async () => {
  const f = await fakeRelease({ buildId: "a835e86a552f-mvcbu719" });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, quick: true });
    assert.deepEqual(r.failures, []);
    assert.equal(r.counts.identity, 1);
    assert.equal(r.buildId, "a835e86a552f-mvcbu719", "the live process's build id became the expected one");
    assert.equal(r.counts.city, 2);
    assert.equal(r.identity.commit, SHA);
  } finally {
    await f.close();
  }
});

test("--expect-commit FAILS when production serves another commit", async () => {
  const f = await fakeRelease();
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: OTHER_SHA, quick: true });
    assert.equal(r.ok, false);
    assert.equal(r.counts.identity, 0);
    assert.ok(r.failures.some((x) => x.includes("expected 64dfddaf70ee")), r.failures.join("\n"));
  } finally {
    await f.close();
  }
});

test("--expect-commit FAILS when the endpoint is missing (the new build is not the one serving)", async () => {
  const f = await fakeRelease({ faults: { noBuildInfo: true } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, quick: true });
    assert.ok(r.failures.some((x) => x.startsWith("identity: /api/build-info answered 404")), r.failures.join("\n"));
  } finally {
    await f.close();
  }
});

test("--expect-commit FAILS when the serving process predates the build (PM2 not reloaded)", async () => {
  const f = await fakeRelease({ faults: { buildInfo: { startedAt: "2026-10-17T10:00:00.000Z" } } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, quick: true });
    assert.ok(r.failures.some((x) => x.includes("BEFORE this build")), r.failures.join("\n"));
  } finally {
    await f.close();
  }
});

test("--expect-commit catches a stale page from another build even without --build-id", async () => {
  const f = await fakeRelease({ buildId: "a835e86a552f-new", faults: { stale: "c2" } });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, quick: true });
    assert.equal(r.counts.identity, 1);
    assert.ok(
      r.failures.some((x) => x.includes("/cities-we-serve/c2") && x.includes("stale page: OLDBUILD") && x.includes("expected a835e86a552f-new")),
      r.failures.join("\n"),
    );
  } finally {
    await f.close();
  }
});

test("--expect-commit FAILS on invalid endpoint answers (500, HTML at 200, JSON null)", async () => {
  const cases = [
    [{ buildInfoStatus: 500 }, /answered 500/],
    [{ buildInfoRaw: "<!DOCTYPE html><html><body>Maintenance</body></html>", buildInfoType: "text/html" }, /did not return JSON/],
    [{ buildInfoRaw: "null" }, /did not return JSON/],
    [{ buildInfoRaw: '{"commit": "a835' }, /did not return JSON/],
  ];
  for (const [faults, expected] of cases) {
    const f = await fakeRelease({ faults });
    try {
      const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, quick: true });
      assert.equal(r.ok, false, JSON.stringify(faults));
      assert.ok(r.failures.some((x) => expected.test(x)), `${JSON.stringify(faults)} → ${r.failures.join(" | ")}`);
      assert.equal(r.counts.identity, 0);
    } finally {
      await f.close();
    }
  }
});

test("checkBuildInfo accepts a process started in the same millisecond as its build", () => {
  const t = "2026-10-17T12:00:00.000Z";
  assert.deepEqual(checkBuildInfo({ commit: SHA, buildId: "x", builtAt: t, startedAt: t }, { expectCommit: SHA }), []);
});

test("--expect-commit with a known --build-id FAILS when the live build differs", async () => {
  const f = await fakeRelease({ buildId: "a835e86a552f-live" });
  try {
    const r = await verifyRelease({ base: f.base, host: HOST, sourceDir: f.dir, expectCommit: SHA, buildId: "a835e86a552f-deployed", quick: true });
    assert.ok(r.failures.some((x) => x.includes("is not the deployed build a835e86a552f-deployed")), r.failures.join("\n"));
  } finally {
    await f.close();
  }
});

test("an unreachable release FAILS instead of throwing", async () => {
  const f = await fakeRelease();
  const base = f.base;
  await f.close();
  const r = await verifyRelease({ base, host: HOST, sourceDir: REPO_ROOT, buildId: "X", quick: true, timeoutMs: 2000 });
  assert.equal(r.ok, false);
  assert.ok(r.failures.length > 0);
});
