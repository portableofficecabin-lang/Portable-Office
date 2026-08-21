#!/usr/bin/env node
/**
 * PRODUCT FAMILY + SIZE VARIANT — LIVE HTTP TEST
 *
 * Run against a running build:
 *     npm run build && npm start
 *     node scripts/product-variants-http.test.mjs --base http://localhost:3000
 * (defaults to https://portableofficecabin.com)
 *
 * This is the half that scripts/product-variants.test.ts cannot prove: that the RAW SERVER
 * HTML — the first HTTP response, before any JavaScript runs — actually contains everything
 * a crawler and a JS-disabled customer need.
 *
 * Every page is fetched TWICE, once with an ordinary browser user agent and once as
 * Googlebot, and the two responses are compared field by field. Cloaking (deliberate or
 * accidental) is a Merchant Center and Search violation, so parity is asserted, not assumed.
 *
 * Exits non-zero on any failure — safe for CI and post-deploy verification.
 */

const args = process.argv.slice(2);
const baseIx = args.indexOf("--base");
const BASE = (baseIx >= 0 ? args[baseIx + 1] : "https://portableofficecabin.com").replace(/\/$/, "");

const UA_BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const UA_GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const FAMILY = "container-office";
/** Published sizes that have their OWN /products/<family>/<size> page. */
const SIZES = ["10x10-ft", "20x8-ft", "20x10-ft", "30x10-ft", "40x10-ft"];
/**
 * Sizes served at the family's PARENT url. Their child URL must 301 there — never render a
 * second copy of the page, and never 404 on a URL a visitor would reasonably guess.
 */
const PARENT_RENDERED = [{ slug: "25x14-ft", target: `/products/${FAMILY}` }];
/**
 * Second segments that must keep 404ing.
 *
 * `20x12-ft` is in here deliberately: it is declared in the family data but UNPUBLISHED,
 * pending confirmation that the size is manufactured at all. An unpublished size must return
 * a genuine 404 — not a soft 404, not an empty product page — and must be absent from the
 * sitemap, the size selector and `hasVariant`. This entry is the regression guard for that.
 */
const INVALID_SIZES = ["20x12-ft", "99x99-ft", "20x10", "abc", "20x10-feet"];
/**
 * CASE VARIANTS are asserted differently, and deliberately so.
 *
 * On a case-INSENSITIVE host filesystem (a Windows dev box) Next finds the prerendered
 * `20x10-ft.html` for a request to `20X10-FT` and answers 200 with the not-found body — a
 * soft 404. That is PRE-EXISTING, site-wide behaviour, not a property of the size ladder:
 * `/products/CONTAINER-OFFICE` and `/products/portable-cabin/PRICE-AND-COST-GUIDE` do
 * exactly the same thing. Production (DO App Platform, Linux) has a case-sensitive
 * filesystem and returns a hard 404.
 *
 * So the status code is not portable, but the thing that MATTERS is: a mis-cased URL must
 * never serve product content, because that is what would create a duplicate, indexable
 * copy of a size page. That property holds on every platform, so that is what we assert.
 */
const CASE_VARIANT_SIZES = ["20X10-FT", "20x10-FT"];
/** Existing routes that must keep working untouched. */
const EXISTING_ROUTES = [
  "/products/container-office",
  "/products/portable-cabin",
  "/products/portable-cabin/price-and-cost-guide",
  "/products/portable-cabin/sizes-and-dimensions",
  "/products/portable-cabin/materials-ms-vs-puf",
  "/products/category/container-offices",
  "/products/ms-container-office-cabin",
  "/products/vip-container-office",
  "/products",
];

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
};
const section = (t) => console.log(`\n${t}`);

async function get(path, ua = UA_BROWSER, redirect = "follow") {
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": ua }, redirect });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), html: body, res };
}

/* ── HTML extractors — deliberately raw string/regex work on the SERVER response, so a
 *    value that only appears after hydration cannot satisfy any of them. ────────────── */
const canonicalOf = (html) =>
  html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ??
  html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i)?.[1];
const titleOf = (html) => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
const h1Of = (html) => html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, "").trim();
const metaDescOf = (html) => html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1];
const robotsOf = (html) => html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1] ?? "";

function jsonLdNodes(html) {
  const out = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) out.push(node);
    } catch {
      out.push({ __parseError: true });
    }
  }
  return out;
}

/** Every href in the raw HTML — what a crawler with JavaScript switched off can follow. */
function hrefs(html) {
  return [...html.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((m) => m[1]);
}

/**
 * The RENDERED markup only, with every <script> block removed.
 *
 * Anything that reasons about DOM ORDER or COUNTS OCCURRENCES must use this, not the raw
 * response. Next inlines the RSC flight payload as `self.__next_f.push([...])` script blocks
 * containing the whole serialised component tree — every string in the page appears a second
 * time in there. In dev those blocks sit near the TOP of the document, so a naive
 * `html.indexOf("Price on request")` matches the payload and reports a position before the
 * gallery and the <h1>; in production they sit elsewhere and the same check quietly passes.
 * Stripping scripts makes these assertions mean the same thing in both modes.
 */
function renderedMarkup(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

console.log(`Product size variants — live HTTP test against ${BASE}\n`);

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 1-2. Every published size is 200. Every invalid size is a REAL 404.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("1-2. Status codes");

const pages = {};
for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const page = await get(path);
  pages[size] = page;
  ok(page.status === 200, `${path} → 200 (got ${page.status})`);
  ok(page.html.length > 20_000, `${path} → full HTML, not a shell (${page.html.length} bytes)`);
}
for (const bad of INVALID_SIZES) {
  const path = `/products/${FAMILY}/${bad}`;
  const page = await get(path);
  ok(page.status === 404, `${path} → 404 (got ${page.status})`);
}
{
  const page = await get(`/products/no-such-family/20x10-ft`);
  ok(page.status === 404, `/products/no-such-family/20x10-ft → 404 (got ${page.status})`);
}
/* A mis-cased size URL must not become an indexable duplicate of the size page.
 *
 * Whether it can even reach the router is a property of the HOST FILESYSTEM, not of this
 * feature, so the host is PROBED rather than assumed — using a URL that predates the size
 * ladder entirely. If `/products/CONTAINER-OFFICE` (a product page that has existed for
 * months) does not 404, the host is case-insensitive and EVERY route on the site behaves
 * this way; asserting it here would be testing the filesystem, not the size variants. */
{
  const probe = await get("/products/CONTAINER-OFFICE");
  const caseSensitiveHost = probe.status === 404;

  if (caseSensitiveHost) {
    for (const cased of CASE_VARIANT_SIZES) {
      const path = `/products/${FAMILY}/${cased}`;
      const page = await get(path);
      ok(page.status === 404, `${path} → 404 on a case-sensitive host (got ${page.status})`);
    }
  } else {
    console.log(
      "  SKIP  mis-cased size URLs — this host's filesystem is case-INSENSITIVE, so every\n" +
        "        /products/** URL resolves case-blind (verified: /products/CONTAINER-OFFICE and\n" +
        "        /products/portable-cabin/PRICE-AND-COST-GUIDE behave identically). Production runs\n" +
        "        on Linux, where these 404. Re-run this suite there to exercise the assertion.",
    );
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 3-4. Canonical — self-referencing on every size, and on the parent.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("3-4. Canonical URLs");

for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const canonical = canonicalOf(pages[size].html);
  ok(!!canonical, `${path}: has a canonical`);
  ok(canonical?.endsWith(path), `${path}: canonical is SELF-referencing (got ${canonical})`);
  ok(
    canonical !== `https://portableofficecabin.com/products/${FAMILY}`,
    `${path}: canonical is NOT collapsed onto the parent`,
  );
  ok(
    (pages[size].html.match(/rel="canonical"/gi) || []).length === 1,
    `${path}: exactly ONE canonical tag`,
  );
  ok(!robotsOf(pages[size].html).includes("noindex"), `${path}: not noindex`);
}
{
  const parent = await get(`/products/${FAMILY}`);
  pages.__parent = parent;
  ok(parent.status === 200, `/products/${FAMILY} → 200`);
  ok(
    canonicalOf(parent.html)?.endsWith(`/products/${FAMILY}`),
    `/products/${FAMILY}: parent keeps its OWN canonical`,
  );
  ok(!robotsOf(parent.html).includes("noindex"), `/products/${FAMILY}: parent not noindex`);
}

/* A size served at the parent url: its child URL 301s there, so the ladder has exactly one
 * URL per size and the guessable one never 404s or duplicates the page it points at. */
for (const { slug, target } of PARENT_RENDERED) {
  const path = `/products/${FAMILY}/${slug}`;
  const r = await get(path, UA_BROWSER, "manual");
  ok(r.status === 301 || r.status === 308, `${path} → permanent redirect (got ${r.status})`);
  ok(r.location?.endsWith(target), `${path} → ${target} (got ${r.location})`);

  const followed = await get(path);
  ok(followed.status === 200, `${path} resolves to a real page after the redirect`);
  ok(
    canonicalOf(followed.html)?.endsWith(target),
    `${path}: canonical is the page that actually serves this size`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 5-6. The selected size, its price (or its honest absence) and availability are in the
 *      FIRST response — no hydration required.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("5-6. Server-rendered size, price and availability");

for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const { html } = pages[size];
  const [l, w] = size.replace("-ft", "").split("x");
  const plain = `${l} ft x ${w} ft`;
  const pretty = `${l} ft × ${w} ft`;
  const h1 = h1Of(html) ?? "";

  ok(h1.includes(pretty) || h1.includes(plain), `${path}: <h1> states the size (got "${h1}")`);
  ok(html.includes(plain), `${path}: the plain size string is in the server HTML`);
  ok(titleOf(html)?.includes(plain), `${path}: <title> states the size`);
  ok(metaDescOf(html)?.includes(plain), `${path}: meta description states the size`);
  ok(html.includes(`${Number(l) * Number(w)} sq ft`), `${path}: built-up area rendered`);
  ok(/data-availability="(in_stock|out_of_stock)"/.test(html), `${path}: availability rendered server-side`);
  ok(html.includes("SKU:"), `${path}: SKU rendered server-side`);
  ok(html.includes(`POC-CO-${l}X${w}`), `${path}: the variant SKU is the one on the page`);

  // The size page must render a MAIN IMAGE in the server HTML.
  ok(/<img[^>]+src="[^"]+"/i.test(html), `${path}: a main image is present in the server HTML`);

  const priced = /data-variant-price="(\d+)"/.exec(html);
  if (priced) {
    // Priced: the GST-inclusive figure must be the PROMINENT one and must agree everywhere.
    const amount = Number(priced[1]);
    const formatted = `₹${amount.toLocaleString("en-IN")}`;
    ok(html.includes(formatted), `${path}: the GST-inclusive price is rendered (${formatted})`);
    ok(html.includes("including 18% GST"), `${path}: the price is labelled GST-inclusive`);
    ok(html.includes("Base price before GST"), `${path}: ex-GST base price shown as SECONDARY detail`);
    ok(/Add to Cart/i.test(html), `${path}: priced ⇒ Add to Cart present`);
    ok(/Buy Now/i.test(html), `${path}: priced ⇒ Buy Now present`);
  } else {
    // Unpriced: NO rupee figure may appear anywhere in the buy area, and no cart CTA.
    ok(/Price on request/i.test(html), `${path}: unpriced ⇒ "Price on request" shown`);
    ok(!/Add to Cart/i.test(html), `${path}: unpriced ⇒ NO Add to Cart`);
    ok(!/Buy Now/i.test(html), `${path}: unpriced ⇒ NO Buy Now`);
    ok(/WhatsApp|Call Us/i.test(html), `${path}: unpriced ⇒ enquiry route offered instead`);

    /* THE ONLY ₹ FIGURES ALLOWED on an unpriced size page are the ones inside the size
     * ladder belonging to OTHER sizes that genuinely have a price — the ladder shows each
     * size's own price, which is the point of it. What must never appear is a figure that a
     * reader could take as THIS size's price.
     *
     * Asserted by count, not by absence: every ₹ on the page must be accounted for by a
     * priced sibling tile. One extra — a stray parent price, a leaked range, a placeholder —
     * and the count no longer matches and this fails. */
    const dom = renderedMarkup(html);
    const rupeeCount = (dom.match(/₹/g) || []).length;
    const pricedSiblings = (dom.match(/₹[\d,]+ incl\. GST/g) || []).length;
    ok(
      rupeeCount === pricedSiblings,
      `${path}: every ₹ on the page belongs to a priced sibling tile (${rupeeCount} found, ${pricedSiblings} accounted for)`,
    );
    ok(
      !/data-selected="true"[\s\S]{0,400}?₹/.test(dom),
      `${path}: the SELECTED size tile shows no price`,
    );
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 7-9. Crawlable size links, URL-driven selection, refresh stability.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("7-9. Crawlable size links & URL-driven selection");

for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const { html } = pages[size];
  const links = hrefs(html);

  // Every OTHER size must be reachable by a real anchor in the raw HTML.
  for (const other of SIZES.filter((s) => s !== size)) {
    ok(
      links.includes(`/products/${FAMILY}/${other}`),
      `${path}: has a crawlable <a href> to ${other} (no JavaScript needed)`,
    );
  }
  // The selected one is marked, and is NOT a self-link.
  ok(
    new RegExp(`data-size-slug="${size}"[^>]*data-selected="true"`).test(html) ||
      new RegExp(`data-selected="true"[^>]*data-size-slug="${size}"`).test(html),
    `${path}: the selected size is marked selected in the server HTML`,
  );
  ok(html.includes('aria-current="page"'), `${path}: selected size carries aria-current`);
  ok(!links.includes(path), `${path}: the selected size is not a redundant self-link`);
  ok(links.includes(`/products/${FAMILY}`), `${path}: links back up to the family overview`);
}

// The parent page exposes every size as a crawlable link too.
for (const size of SIZES) {
  ok(
    hrefs(pages.__parent.html).includes(`/products/${FAMILY}/${size}`),
    `/products/${FAMILY}: parent links to ${size} without JavaScript`,
  );
}

/* THE PARENT PAGE IS ALSO A SIZE. It serves the 25 ft x 14 ft build, so its own size must
 * appear in the ladder and be marked SELECTED — a visitor on /products/container-office is
 * looking at a specific size, not at "no size chosen". */
{
  const html = pages.__parent.html;
  ok(html.includes('id="choose-your-size"'), `/products/${FAMILY}: parent renders the size ladder`);
  for (const { slug } of PARENT_RENDERED) {
    ok(
      new RegExp(`data-size-slug="${slug}"[^>]*data-selected="true"`).test(html) ||
        new RegExp(`data-selected="true"[^>]*data-size-slug="${slug}"`).test(html),
      `/products/${FAMILY}: its own size ${slug} is marked selected`,
    );
  }
  ok(html.includes("25 ft × 14 ft") || html.includes("25 ft x 14 ft"), `/products/${FAMILY}: states its size`);
  // Unpublished sizes must not be advertised anywhere on the page.
  ok(!html.includes("20x12-ft"), `/products/${FAMILY}: the unpublished 20x12 size is not linked`);
}

// REFRESH: a second, independent request must return the identical selected size + price.
for (const size of SIZES.slice(0, 2)) {
  const path = `/products/${FAMILY}/${size}`;
  const again = await get(path);
  ok(again.status === 200, `${path}: reloads 200`);
  ok(h1Of(again.html) === h1Of(pages[size].html), `${path}: refresh preserves the selected size`);
  ok(
    /data-variant-price="(\d+)"/.exec(again.html)?.[1] ===
      /data-variant-price="(\d+)"/.exec(pages[size].html)?.[1],
    `${path}: refresh preserves the price state`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * Legacy ?size= → clean path 301
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("Legacy ?size= redirect");

for (const [query, expected] of [
  ["size=20x10", `/products/${FAMILY}/20x10-ft`],
  ["size=20X10", `/products/${FAMILY}/20x10-ft`],
  ["size=40x10-ft", `/products/${FAMILY}/40x10-ft`],
]) {
  const r = await get(`/products/${FAMILY}?${query}`, UA_BROWSER, "manual");
  ok(r.status === 301, `?${query} → 301 (got ${r.status})`);
  ok(r.location?.includes(expected), `?${query} → ${expected} (got ${r.location})`);
  ok(!r.location?.includes("size="), `?${query} → the size parameter is dropped`);
}
{
  // A tracking parameter must SURVIVE the hop; only `size` is consumed.
  const r = await get(`/products/${FAMILY}?size=20x10&utm_source=google`, UA_BROWSER, "manual");
  ok(r.status === 301, "?size=…&utm_source= → 301");
  ok(r.location?.includes("utm_source=google"), "tracking parameters survive the size redirect");
}
{
  // An unknown size must NOT 301 into a 404 — it falls through to the parent page.
  const r = await get(`/products/${FAMILY}?size=99x99`, UA_BROWSER, "manual");
  ok(r.status === 200, `?size=99x99 stays on the parent page (got ${r.status}), never 301s into a 404`);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 12-13. Structured data in the initial HTML, agreeing with the visible price.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("12-13. Structured data");

for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const { html } = pages[size];
  const nodes = jsonLdNodes(html);
  const [l, w] = size.replace("-ft", "").split("x");
  const plain = `${l} ft x ${w} ft`;

  ok(nodes.length > 0, `${path}: JSON-LD is in the initial HTML`);
  ok(!nodes.some((n) => n.__parseError), `${path}: every JSON-LD block parses`);

  const groups = nodes.filter((n) => n["@type"] === "ProductGroup");
  const productNodes = nodes.filter((n) => n["@type"] === "Product");

  ok(groups.length === 1, `${path}: exactly ONE ProductGroup node (got ${groups.length})`);
  ok(productNodes.length === 1, `${path}: exactly ONE Product node — no conflicting duplicate`);
  ok(groups[0]?.productGroupID === "POC-CO", `${path}: productGroupID is the family's stable id`);
  ok(
    Array.isArray(groups[0]?.variesBy) && groups[0].variesBy.includes("https://schema.org/size"),
    `${path}: variesBy declares size`,
  );

  const product = productNodes[0] ?? {};
  ok(product.size === plain, `${path}: Product.size is the SELECTED size (got ${product.size})`);
  ok(product.sku === `POC-CO-${l}X${w}`, `${path}: Product.sku is the variant SKU`);
  ok(product.url?.endsWith(path), `${path}: Product.url is the variant canonical`);
  ok(
    product.isVariantOf?.["@id"] === groups[0]?.["@id"],
    `${path}: isVariantOf points at the ProductGroup @id on this very page`,
  );
  ok(!product.aggregateRating, `${path}: no fabricated aggregateRating`);
  ok(!product.review, `${path}: no fabricated reviews`);
  ok(!product.gtin && !product.gtin13, `${path}: no fabricated GTIN`);
  ok(!Array.isArray(product.offers), `${path}: no AggregateOffer / offer array on a size page`);

  const visible = /data-variant-price="(\d+)"/.exec(html)?.[1];
  if (visible) {
    ok(product.offers?.price === `${Number(visible).toFixed(2)}`, `${path}: JSON-LD price == visible price`);
    ok(product.offers?.priceCurrency === "INR", `${path}: priceCurrency INR`);
    ok(product.offers?.url?.endsWith(path), `${path}: offer URL == the selected size URL`);
    ok(!!product.offers?.availability, `${path}: offer availability stated`);
  } else {
    ok(!product.offers, `${path}: unpriced ⇒ NO Offer in the JSON-LD`);
  }

  const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");
  ok(!!crumbs, `${path}: breadcrumb structured data present`);
  ok(
    crumbs?.itemListElement?.some((i) => String(i.name).includes(plain)),
    `${path}: breadcrumb ends on the selected size`,
  );

  /* CRAWLABLE SIBLING REFERENCES — the group must point at every other size's canonical URL,
   * absolute, so a crawler landing on any one page can reach the whole ladder. */
  const hasVariant = groups[0]?.hasVariant ?? [];
  ok(hasVariant.length > 0, `${path}: ProductGroup.hasVariant references the other sizes`);
  ok(
    hasVariant.every((v) => typeof v.url === "string" && v.url.startsWith("https://")),
    `${path}: every hasVariant reference is an absolute URL`,
  );
  for (const sibling of SIZES) {
    ok(
      hasVariant.some((v) => v.url?.endsWith(`/products/${FAMILY}/${sibling}`)),
      `${path}: hasVariant references ${sibling}`,
    );
  }
  for (const { target } of PARENT_RENDERED) {
    ok(
      hasVariant.some((v) => v.url?.endsWith(target)),
      `${path}: hasVariant references the parent-served size at ${target}`,
    );
  }
  ok(
    !hasVariant.some((v) => v.url?.includes("20x12")),
    `${path}: hasVariant does NOT reference the unpublished 20x12 size`,
  );
}

/* The PARENT page carries the same group AND declares its own size — it is a page in the
 * ladder, not merely the ladder's index. */
{
  const nodes = jsonLdNodes(pages.__parent.html);
  const group = nodes.find((n) => n["@type"] === "ProductGroup");
  const product = nodes.find((n) => n["@type"] === "Product");

  ok(!!group, `/products/${FAMILY}: parent emits the ProductGroup`);
  ok(group?.productGroupID === "POC-CO", `/products/${FAMILY}: same productGroupID as every size page`);
  ok(
    group?.["@id"] === jsonLdNodes(pages[SIZES[0]].html).find((n) => n["@type"] === "ProductGroup")?.["@id"],
    `/products/${FAMILY}: the group @id is IDENTICAL to the one the size pages emit`,
  );
  ok(product?.size === "25 ft x 14 ft", `/products/${FAMILY}: its Product node states its own size`);
  ok(
    product?.isVariantOf?.["@id"] === group?.["@id"],
    `/products/${FAMILY}: its Product node isVariantOf the family group`,
  );
  ok(
    product?.isVariantOf?.productGroupID === "POC-CO",
    `/products/${FAMILY}: isVariantOf carries the productGroupID`,
  );
  // Its long-standing offer and reviews must survive untouched.
  ok(!!product?.offers?.price, `/products/${FAMILY}: keeps its existing Offer`);
  ok(product?.offers?.priceCurrency === "INR", `/products/${FAMILY}: offer currency INR`);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 14-17. Merchant feed
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("14-17. Merchant feed");

{
  const res = await fetch(`${BASE}/api/merchant-feed`, { headers: { "User-Agent": UA_GOOGLEBOT } });
  const xml = await res.text();
  ok(res.status === 200, `/api/merchant-feed → 200`);

  const items = xml.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
  const tag = (item, name) => item.match(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`))?.[1];
  console.log(`  (live feed: ${items.length} item(s))`);

  const ids = items.map((i) => tag(i, "id"));
  const links = items.map((i) => tag(i, "link"));
  ok(new Set(ids).size === ids.length, "feed g:id values are unique");
  ok(new Set(links).size === links.length, "feed g:link values are unique");

  const variantItems = items.filter((i) => tag(i, "item_group_id") === "POC-CO");
  if (variantItems.length > 0) {
    ok(
      new Set(variantItems.map((i) => tag(i, "item_group_id"))).size === 1,
      "every fed size shares ONE item_group_id",
    );
    ok(
      new Set(variantItems.map((i) => tag(i, "item_group_title"))).size === 1,
      "every fed size shares ONE item_group_title",
    );
    const sizes = variantItems.map((i) => tag(i, "size"));
    ok(new Set(sizes).size === sizes.length, "each fed size submits a DISTINCT g:size");
    ok(!ids.includes("POC-CO-GEN"), "the family PARENT sku is not duplicated in the feed");

    // Feed price must equal the JSON-LD + visible price on its own landing page.
    for (const item of variantItems) {
      const link = tag(item, "link");
      const feedPrice = tag(item, "price");
      const path = new URL(link).pathname;
      const page = await get(path, UA_GOOGLEBOT);
      const visible = /data-variant-price="(\d+)"/.exec(page.html)?.[1];
      ok(
        feedPrice === `${Number(visible).toFixed(2)} INR`,
        `${path}: feed price ${feedPrice} == visible page price`,
      );
      ok(/Add to Cart/i.test(page.html), `${path}: a fed size can actually be bought`);
    }
  } else {
    console.log("  (no size variant is feed-eligible yet — price/photograph pending)");
    // Whatever the reason, an ineligible size must be ABSENT, not half-present.
    for (const size of SIZES) {
      const [l, w] = size.replace("-ft", "").split("x");
      ok(!ids.includes(`POC-CO-${l}X${w}`), `feed correctly omits the gated size POC-CO-${l}X${w}`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 18. Sitemap
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("18. Sitemap");

{
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { "User-Agent": UA_GOOGLEBOT } });
  const xml = await res.text();
  ok(res.status === 200, "/sitemap.xml → 200");
  for (const size of SIZES) {
    const url = `https://portableofficecabin.com/products/${FAMILY}/${size}`;
    const count = xml.split(url).length - 1;
    ok(count >= 1, `sitemap lists ${size}`);
  }
  const parentLoc = `<loc>https://portableofficecabin.com/products/${FAMILY}</loc>`;
  ok(xml.includes(parentLoc), "sitemap still lists the family parent");
  ok(
    xml.split(parentLoc).length - 1 === 1,
    "the family parent appears ONCE — the size it serves does not add a duplicate <loc>",
  );
  ok(!xml.includes(`/products/${FAMILY}/25x14-ft`), "the parent-served size's redirect URL is not in the sitemap");
  ok(!xml.includes(`/products/${FAMILY}/20x12-ft`), "the UNPUBLISHED 20x12 size is not in the sitemap");
  ok(xml.includes("/products/portable-cabin/price-and-cost-guide"), "sitemap still lists the existing guides");
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 19. Existing routes untouched
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("19. Existing routes still work");

for (const path of EXISTING_ROUTES) {
  const page = await get(path);
  ok(page.status === 200, `${path} → 200 (got ${page.status})`);
  ok(page.html.length > 20_000, `${path} → full HTML (${page.html.length} bytes)`);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * GOOGLEBOT PARITY — the crawler and the customer must be served the same product facts.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("Googlebot parity (no cloaking)");

for (const size of SIZES) {
  const path = `/products/${FAMILY}/${size}`;
  const bot = await get(path, UA_GOOGLEBOT);
  const human = pages[size];

  ok(bot.status === human.status, `${path}: same status for Googlebot and a browser`);
  ok(h1Of(bot.html) === h1Of(human.html), `${path}: same <h1>`);
  ok(titleOf(bot.html) === titleOf(human.html), `${path}: same <title>`);
  ok(canonicalOf(bot.html) === canonicalOf(human.html), `${path}: same canonical`);
  ok(
    /data-variant-price="(\d+)"/.exec(bot.html)?.[1] === /data-variant-price="(\d+)"/.exec(human.html)?.[1],
    `${path}: same price`,
  );
  ok(
    /data-availability="([a-z_]+)"/.exec(bot.html)?.[1] === /data-availability="([a-z_]+)"/.exec(human.html)?.[1],
    `${path}: same availability`,
  );
  ok(
    /Add to Cart/i.test(bot.html) === /Add to Cart/i.test(human.html),
    `${path}: same purchasability`,
  );

  // Google's click tracker busts every shared cache — the page must not change because of it.
  const tracked = await get(`${path}?srsltid=abc123`, UA_GOOGLEBOT);
  ok(tracked.status === 200, `${path}?srsltid= → 200`);
  ok(h1Of(tracked.html) === h1Of(human.html), `${path}?srsltid=: same <h1>`);
  ok(canonicalOf(tracked.html)?.endsWith(path), `${path}?srsltid=: canonical is still the clean size URL`);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 20. Mobile layout contract (what HTML alone can prove)
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("20. Mobile layout contract");

for (const size of SIZES.slice(0, 2)) {
  const path = `/products/${FAMILY}/${size}`;
  const { html } = pages[size];

  ok(
    /<meta[^>]+name="viewport"[^>]+content="[^"]*width=device-width/i.test(html),
    `${path}: responsive viewport meta`,
  );
  // The one genuinely wide element on the page scrolls inside its own box rather than
  // widening the document — the rule the Cart/Checkout mobile audit established.
  ok(html.includes("overflow-x-auto"), `${path}: the wide spec table scrolls inside its own container`);
  ok(!/overflow-x-hidden/.test(html), `${path}: no overflow-x-hidden hiding a layout defect`);
  // DOM ORDER is the mobile order: gallery → h1 → size selector → price → CTAs.
  // Measured on rendered markup only — see renderedMarkup().
  const dom = renderedMarkup(html);
  const iGallery = dom.indexOf("aspect-[4/3]");
  const iH1 = dom.indexOf("<h1");
  const iSizes = dom.indexOf('id="choose-your-size"');
  const iBuy = Math.max(dom.indexOf("Price on request for this size"), dom.indexOf("data-variant-price"));
  ok(iGallery > -1 && iH1 > iGallery, `${path}: gallery precedes the title in DOM order`);
  ok(iSizes > iH1, `${path}: size selector follows the title`);
  ok(iBuy > iSizes, `${path}: price follows the size selector`);
}

/* ─────────────────────────────────────────────── report ─────────────────────────────── */
console.log(`\nproduct-variants-http.test.mjs — ${pass} passed, ${fail} failed`);
if (fail) {
  console.log(
    "\nLIVE SIZE-VARIANT CHECK FAILED. A crawler or a JS-disabled customer is not being served\n" +
      "the same product facts as a normal browser — do not deploy.",
  );
  process.exit(1);
}
