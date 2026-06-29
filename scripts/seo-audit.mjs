#!/usr/bin/env node
/**
 * SEO audit — `npm run seo:audit`
 *
 * STATIC checks (always run, no server needed) over the source tree:
 *   • internal links using `.html`
 *   • internal links using `?category=`
 *   • duplicate product <title> values (productSEO)
 *   • duplicate product H1 overrides
 *   • product titles / redirect destinations containing `.html` or `?category=`
 *   • redirect sources/destinations sanity (canonical targets must be clean)
 *
 * LIVE checks (only when SEO_AUDIT_BASE_URL is set, e.g. http://localhost:3000):
 *   • every sitemap URL returns 200 (not a redirect, not noindex)
 *   • each public page has exactly ONE canonical, with no `.html` / `?category=`
 *   • no public page emits `noindex`
 *   • duplicate <title> across pages
 *   • key redirect rules (?category= → path, legacy slug → short slug)
 *
 * Exits non-zero if any ERROR is found, so it can gate CI / a pre-deploy step.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const BASE = process.env.SEO_AUDIT_BASE_URL?.replace(/\/$/, "");

let errors = 0;
let warnings = 0;
const err = (msg) => { errors++; console.error(`  ✖ ${msg}`); };
const warn = (msg) => { warnings++; console.warn(`  ⚠ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const header = (msg) => console.log(`\n=== ${msg} ===`);

// ── helpers ────────────────────────────────────────────────────────────────
const SRC_DIRS = ["app", "src"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CODE_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

function read(path) {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

const codeFiles = SRC_DIRS.flatMap((d) => walk(join(ROOT, d)));
const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(/\\/g, "/");

// ── STATIC 1: internal .html links ───────────────────────────────────────────
header("Internal links ending in .html");
{
  let found = 0;
  for (const f of codeFiles) {
    const lines = read(f).split(/\r?\n/);
    lines.forEach((line, i) => {
      // A link/href whose value carries a `.html` path (ignore slug-normalisation
      // like `.replace(/\.html$/i, "")` which never appears in an href context).
      if (/\b(href|to)\b/.test(line) && /["'`][^"'`]*\.html\b/.test(line)) {
        err(`${rel(f)}:${i + 1}  ${line.trim()}`);
        found++;
      }
    });
  }
  if (!found) ok("no internal .html links");
}

// ── STATIC 2: internal ?category= links ──────────────────────────────────────
header("Internal links using ?category=");
{
  let found = 0;
  for (const f of codeFiles) {
    const lines = read(f).split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/\b(href|to)\b/.test(line) && /[?&]category=/.test(line)) {
        err(`${rel(f)}:${i + 1}  ${line.trim()}`);
        found++;
      }
    });
  }
  if (!found) ok("no internal ?category= links");
}

// ── STATIC 3: duplicate product titles / H1 ──────────────────────────────────
header("Product SEO titles & H1 uniqueness");
{
  const seo = read(join(ROOT, "src/data/productSEO.ts"));
  const collect = (key) => {
    const re = new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
    const vals = [];
    let m;
    while ((m = re.exec(seo))) vals.push(m[1]);
    return vals;
  };
  const titles = collect("title");
  const h1s = collect("h1");

  const dupes = (arr) => {
    const seen = new Map();
    arr.forEach((v) => seen.set(v, (seen.get(v) || 0) + 1));
    return [...seen.entries()].filter(([, n]) => n > 1);
  };

  if (titles.length === 0) warn("could not parse any product titles");
  const dupTitles = dupes(titles);
  if (dupTitles.length) dupTitles.forEach(([t, n]) => err(`duplicate title ×${n}: "${t}"`));
  else ok(`${titles.length} product titles, all unique`);

  const dupH1 = dupes(h1s);
  if (dupH1.length) dupH1.forEach(([t, n]) => err(`duplicate H1 ×${n}: "${t}"`));
  else ok(`${h1s.length} H1 overrides, all unique`);

  // No title may carry a dirty fragment.
  titles.filter((t) => /\.html\b|[?&]category=/.test(t))
    .forEach((t) => err(`title contains .html/?category=: "${t}"`));
}

// ── STATIC 4: redirect destinations must be clean canonical targets ──────────
header("next.config redirects (clean destinations)");
{
  const cfg = read(join(ROOT, "next.config.ts"));
  const re = /destination:\s*"([^"]+)"/g;
  let m, count = 0, dirty = 0;
  while ((m = re.exec(cfg))) {
    count++;
    const dest = m[1];
    if (/\.html\b/.test(dest) || /[?&]category=/.test(dest)) {
      err(`redirect destination not clean: ${dest}`);
      dirty++;
    }
  }
  if (!dirty) ok(`${count} redirect destinations, none contain .html/?category=`);
}

// ── LIVE checks ──────────────────────────────────────────────────────────────
async function live() {
  header(`LIVE crawl against ${BASE}`);

  // 1) Pull sitemap URLs.
  let urls = [];
  try {
    const res = await fetch(`${BASE}/sitemap.xml`);
    const xml = await res.text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    ok(`sitemap.xml: ${urls.length} URLs`);
  } catch (e) {
    err(`could not fetch sitemap.xml: ${e.message}`);
    return;
  }

  // 2) Each sitemap URL must be 200 + single clean canonical + not noindex.
  const titles = new Map();
  for (const url of urls) {
    // Sitemap <loc> values are absolute production URLs; rewrite onto BASE so we
    // crawl the server under test (e.g. localhost), not the live site.
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        err(`sitemap URL redirects (${res.status}): ${path} → ${res.headers.get("location")}`);
        continue;
      }
      if (res.status !== 200) { err(`sitemap URL ${res.status}: ${path}`); continue; }

      const xrobots = res.headers.get("x-robots-tag") || "";
      if (/noindex/i.test(xrobots)) err(`sitemap URL sends X-Robots-Tag noindex: ${path}`);

      const html = await res.text();
      const robotsMetas = [...html.matchAll(/<meta[^>]+name=["']robots["'][^>]*>/gi)];
      if (robotsMetas.some((m) => /noindex/i.test(m[0]))) err(`noindex meta on public page: ${path}`);

      const canonicals = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)];
      if (canonicals.length === 0) err(`missing canonical: ${path}`);
      else if (canonicals.length > 1) err(`${canonicals.length} canonical tags: ${path}`);
      else {
        const href = (canonicals[0][0].match(/href=["']([^"']+)["']/) || [])[1] || "";
        if (/\.html\b/.test(href) || /[?&]category=/.test(href)) err(`dirty canonical on ${path}: ${href}`);
      }

      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim();
      if (title) titles.set(title, [...(titles.get(title) || []), path]);
    } catch (e) {
      err(`fetch failed ${path}: ${e.message}`);
    }
  }
  const dupTitles = [...titles.entries()].filter(([, ps]) => ps.length > 1);
  if (dupTitles.length) dupTitles.forEach(([t, ps]) => err(`duplicate <title> "${t}" on: ${ps.join(", ")}`));
  else ok("no duplicate <title> across sitemap pages");

  // 3) Key redirect rules.
  header("LIVE redirect rules");
  const expectRedirect = async (from, to) => {
    try {
      const res = await fetch(`${BASE}${from}`, { redirect: "manual" });
      const loc = (res.headers.get("location") || "").replace(BASE, "");
      if (res.status === 301 && loc === to) ok(`301 ${from} → ${to}`);
      else err(`expected 301 ${from} → ${to}, got ${res.status} → ${loc || "(none)"}`);
    } catch (e) {
      err(`redirect check failed ${from}: ${e.message}`);
    }
  };
  await expectRedirect("/products?category=site-office-containers", "/products/category/site-office-containers");
  await expectRedirect("/products/ms-portable-cabins", "/products/ms-portable-cabin");
  await expectRedirect("/products/new-used-shipping-container-for-sale-in-india", "/products/shipping-container-for-sale");
  await expectRedirect("/products/cargo-container-buy-rent-or-convert", "/products/cargo-container-for-sale");
}

// ── run ──────────────────────────────────────────────────────────────────────
console.log("SEO audit — static source checks" + (BASE ? ` + live crawl (${BASE})` : " (set SEO_AUDIT_BASE_URL for live crawl)"));
if (BASE) await live();

header("Summary");
console.log(`  ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
