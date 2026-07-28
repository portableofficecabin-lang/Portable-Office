/**
 * MERCHANT LANDING-URL AUDIT — the automated gate for Google Merchant Center's
 * "user cannot complete purchase" class of failure.
 *
 * For EVERY product URL in the live Merchant feed it asserts, with a Googlebot user agent:
 *   1. the CLEAN canonical URL returns HTTP 200 with COMPLETE server-rendered HTML
 *      (h1 + Product JSON-LD present, body not blank/truncated);
 *   2. the page's JSON-LD offer price and availability EXACTLY match the feed;
 *   3. Add to Cart is present in the server HTML;
 *   4. PARITY: the same URL with ?srsltid=test (Google's click tracker, which busts every
 *      shared cache) renders the SAME status, h1, price, availability and purchasability —
 *      a query parameter must never change whether a product can be bought.
 * And for every product URL in the SITEMAP that is NOT in the feed:
 *   5. the page is 200, non-blank, and INTERNALLY CONSISTENT: offer structured data and
 *      Add to Cart appear together or not at all. A page here may legitimately be purchasable
 *      (feed-excluded by FEED_IMAGE_POLICY) or quote-only (no offer, no ATC) — but a page
 *      showing an offer without a working Add to Cart (or vice versa) is a defect.
 *      The "quote-only must never be IN the feed" direction is enforced by checks 1-4:
 *      every feed URL must render price + availability + Add to Cart, which a quote-only
 *      product cannot.
 *
 * Run:   node scripts/merchant-url-audit.mjs                     (against production)
 *        node scripts/merchant-url-audit.mjs --base http://localhost:3000   (local build;
 *        the scheme is required — "localhost:3000" alone will not parse)
 * Exits non-zero on any failure — safe for CI and post-deploy verification.
 */

const args = process.argv.slice(2);
const baseIx = args.indexOf("--base");
const BASE = baseIx >= 0 ? args[baseIx + 1].replace(/\/$/, "") : "https://portableofficecabin.com";
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
/** A page smaller than this is a blank/truncated shell, not a product page. */
const MIN_HTML_BYTES = 50_000;

let pass = 0, fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; }
  else { fail++; console.log(`  FAIL ${msg}`); }
};

/** Swap the host of a feed/sitemap URL for --base runs (feed always emits production URLs). */
const rebase = (url) => {
  const u = new URL(url);
  const b = new URL(BASE);
  u.protocol = b.protocol; u.host = b.host;
  return u.toString();
};

async function get(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.text();
    return { status: res.status, bytes: body.length, body };
  } catch (err) {
    if (attempt < 1) return get(url, attempt + 1); // one retry for transient network flakes
    throw err;
  }
}

function analyze(r) {
  const jsonlds = [...r.body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean)
    .flat()
    .flatMap((n) => (n && n["@graph"] ? n["@graph"] : [n]));
  const isProduct = (t) => (Array.isArray(t) ? t.includes("Product") : t === "Product");
  const prod = jsonlds.find((s) => s && isProduct(s["@type"]));
  const offer = prod?.offers && !Array.isArray(prod.offers) ? prod.offers : prod?.offers?.[0];
  return {
    status: r.status,
    bytes: r.bytes,
    h1: (r.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").trim() ?? null,
    hasProductSchema: !!prod,
    price: offer?.price != null ? Number(offer.price) : null,
    availability: offer?.availability ?? null,
    addToCart: /Add to Cart/i.test(r.body),
  };
}

/* ---- 1-4: every feed URL, clean vs tracked ------------------------------------------------ */
const feedRes = await fetch(rebase("https://portableofficecabin.com/api/merchant-feed"), { headers: { "User-Agent": UA } });
if (feedRes.status !== 200) { console.log(`FAIL merchant feed returned ${feedRes.status}`); process.exit(1); }
const feedXml = await feedRes.text();
const items = [...feedXml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
  const f = (tag) => (m[1].match(new RegExp(`<g:${tag}>([\\s\\S]*?)</g:${tag}>`)) || [])[1]?.trim();
  // On a genuine sale the CHARGED price is <g:sale_price>; <g:price> then carries the list
  // ("was") price — while the page's JSON-LD offers.price stays the charged price. Compare
  // against the charged one, or the first on-sale SKU would fail every audit.
  return { link: f("link"), price: f("sale_price") ?? f("price"), availability: f("availability") };
}).filter((i) => i.link);
console.log(`Feed: ${items.length} items. Base: ${BASE}\n`);
ok(items.length > 0, "feed contains items");

const feedLinks = new Set(items.map((i) => new URL(i.link).pathname));
for (const item of items) {
  const cleanUrl = rebase(item.link);
  const clean = analyze(await get(cleanUrl));
  const tracked = analyze(await get(cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "srsltid=test"));
  const tag = new URL(cleanUrl).pathname;
  const feedPrice = Number((item.price || "").replace(/[^\d.]/g, ""));

  ok(clean.status === 200, `${tag}: clean URL status ${clean.status} (want 200)`);
  ok(clean.bytes >= MIN_HTML_BYTES, `${tag}: blank/truncated HTML (${clean.bytes}B)`);
  ok(!!clean.h1, `${tag}: missing h1`);
  ok(clean.hasProductSchema, `${tag}: missing Product JSON-LD`);
  ok(clean.price === feedPrice, `${tag}: JSON-LD price ${clean.price} != feed price ${feedPrice}`);
  /* STRICT availability: presence on both sides + explicit mapping. A missing value on either
   * side, or a feed value outside the map (e.g. the site's BackOrder JSON-LD vs the feed's
   * out_of_stock), must FAIL loudly — a suffix match against "" passes anything. */
  const AVAIL_MAP = { in_stock: "InStock", out_of_stock: "OutOfStock" };
  const wantAvail = AVAIL_MAP[item.availability];
  ok(!!item.availability && !!wantAvail, `${tag}: feed availability missing/unmapped (${item.availability})`);
  ok(!!clean.availability && !!wantAvail && clean.availability.endsWith(wantAvail),
    `${tag}: availability ${clean.availability} != feed ${item.availability}`);
  ok(clean.addToCart, `${tag}: Add to Cart missing from server HTML`);

  ok(tracked.status === clean.status, `${tag}: PARITY status ${clean.status} vs tracked ${tracked.status}`);
  ok(tracked.h1 === clean.h1, `${tag}: PARITY h1 differs with ?srsltid`);
  ok(tracked.price === clean.price, `${tag}: PARITY price ${clean.price} vs tracked ${tracked.price}`);
  ok(tracked.availability === clean.availability, `${tag}: PARITY availability differs with ?srsltid`);
  ok(tracked.addToCart === clean.addToCart, `${tag}: PARITY purchasability differs with ?srsltid`);
}

/* ---- 5: non-feed product pages — 200, non-blank, real content, offer⟺ATC consistent ------- */
const smRes = await get(rebase("https://portableofficecabin.com/sitemap.xml"));
/* The sitemap sweep must never silently audit nothing: a redirected/failed sitemap or a regex
 * that stops matching would leave productUrls empty and the script would exit green having
 * checked only the feed. Assert the sweep's own preconditions. */
ok(smRes.status === 200, `sitemap.xml status ${smRes.status} (want 200)`);
const productUrls = [...smRes.body.matchAll(/<loc>([^<]*\/products\/[a-z0-9-]+)<\/loc>/g)]
  .map((m) => m[1])
  .filter((u) => !u.includes("/category/"));
ok(productUrls.length > 0, "sitemap contains product URLs (regex/sitemap format drifted?)");
for (const path of feedLinks) {
  ok(productUrls.some((u) => new URL(u).pathname === path),
    `${path}: feed URL missing from the sitemap (feed links must be canonical sitemap URLs)`);
}
const nonFeed = productUrls.filter((u) => !feedLinks.has(new URL(u).pathname));
console.log(`\nSitemap: ${productUrls.length} product URLs, ${nonFeed.length} not in the feed`);
for (const url of nonFeed) {
  const a = analyze(await get(rebase(url)));
  const tag = new URL(url).pathname;
  const hasOffer = a.price !== null;
  ok(a.status === 200, `${tag}: page status ${a.status}`);
  ok(a.bytes >= MIN_HTML_BYTES, `${tag}: blank/truncated HTML (${a.bytes}B)`);
  /* Every catalog page — quote-only included — renders an h1 and a Product node (quote-only
   * pages carry the node WITHOUT offers). Their absence marks a soft-error shell, which byte
   * count alone might not catch. */
  ok(!!a.h1, `${tag}: missing h1 (soft-error shell?)`);
  ok(a.hasProductSchema, `${tag}: missing Product JSON-LD (soft-error shell?)`);
  ok(hasOffer === a.addToCart,
    `${tag}: INCONSISTENT — offer schema ${hasOffer ? "present" : "absent"} but Add to Cart ${a.addToCart ? "present" : "absent"}`);
  if (hasOffer) console.log(`  info ${tag}: purchasable but feed-excluded (price=${a.price}) — expected when FEED_IMAGE_POLICY blocks the SKU`);
}

console.log(`\n=== merchant-url-audit: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
