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
  verifyRelease,
} from "./verify-release.mjs";

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

test("servedByBuild recognises both places Next prints the build id", () => {
  assert.ok(servedByBuild("<!DOCTYPE html><!--abc123--><html>", "abc123"));
  assert.ok(servedByBuild('<script src="/_next/static/abc123/_buildManifest.js">', "abc123"));
  assert.ok(!servedByBuild("<!DOCTYPE html><!--old999--><html>", "abc123"));
  assert.ok(servedByBuild("anything", undefined), "no build id given ⇒ not checked");
});

// ── end-to-end against a fake release ─────────────────────────────────────────────────────
/** A release dir + a server that behaves like `next start` of it, with switchable faults. */
async function fakeRelease({ slugs = ["c1", "c2"], buildId = "BUILD1", extraSitemap = ["/products/p1"], faults = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "verify-release-"));
  mkdirSync(join(dir, "src/data"), { recursive: true });
  mkdirSync(join(dir, ".next"), { recursive: true });
  writeFileSync(join(dir, "src/data/cityPages.ts"), slugs.map((s) => `  {\n    slug: "${s}",\n  },`).join("\n"));
  writeFileSync(join(dir, ".next/BUILD_ID"), buildId);
  const routes = Object.fromEntries(slugs.filter((s) => s !== faults.notPrerendered).map((s) => [`/cities-we-serve/${s}`, {}]));
  writeFileSync(join(dir, ".next/prerender-manifest.json"), JSON.stringify({ version: 4, routes }));

  const html = (id) => `<!DOCTYPE html><!--${id}--><html><body><script src="/_next/static/${id}/_buildManifest.js"></script></body></html>`;
  const sitemapPaths = ["/", "/cities-we-serve", ...slugs.map((s) => `/cities-we-serve/${s}`), ...extraSitemap];
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
    if (p === "/" || p === "/cities-we-serve" || p === "/products") return send(200, html(faults.wrongBuildOnRoot ? "OTHER" : buildId));
    const m = p.match(/^\/cities-we-serve\/([a-z0-9-]+)$/);
    if (m && slugs.includes(m[1])) {
      if (faults.cached404 === m[1]) return send(404, html("OLDBUILD"));
      if (faults.stale === m[1]) return send(200, html("OLDBUILD"));
      return send(200, html(buildId));
    }
    if (extraSitemap.includes(p)) return send(faults.brokenSitemapUrl === p ? 500 : 200, html(buildId));
    return send(404, html(buildId));
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
    assert.deepEqual(r.counts, { build: 2, health: 5, city: 2, new: 0, sitemap: 1 });
    assert.deepEqual([...f.seenHosts], [HOST]);
  } finally {
    await f.close();
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

test("an unreachable release FAILS instead of throwing", async () => {
  const f = await fakeRelease();
  const base = f.base;
  await f.close();
  const r = await verifyRelease({ base, host: HOST, sourceDir: REPO_ROOT, buildId: "X", quick: true, timeoutMs: 2000 });
  assert.equal(r.ok, false);
  assert.ok(r.failures.length > 0);
});
