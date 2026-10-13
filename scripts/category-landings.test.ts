/**
 * CATEGORY LANDING SECTIONS — DATA REGRESSION TEST
 *
 * Run:  npm run landings:test
 *       (node --import tsx --import ./scripts/asset-stub-register.mjs scripts/category-landings.test.ts)
 *
 * Proves, without a server, that the shared category landing sections (src/data/categoryLandings.ts)
 * can never publish a figure or a link the rest of the site contradicts. It FAILS (exit 1) if:
 *   • a model row's price is not byte-identical to sellPrice(getCommerce(id).basePrice), or a
 *     price is shown for a SKU that is not purchasable, or a rental shows without "/ month";
 *   • any ₹ figure in the authored copy or FAQs is not one of the computed figures (model prices,
 *     installation, rental), or the copy uses "starting from" / "from ₹" phrasing;
 *   • a category's FAQ set is outside 6–10 questions or repeats a question;
 *   • a link in CATEGORY_LINKS points anywhere other than a real route (a product, a populated
 *     category, a guide, a city page, a promotion page, a blog post or a static hub);
 *   • a cross-sell id is missing, or is in the same category it is meant to supplement;
 *   • the empty-category indexing rule stops matching the catalogue, or it gets wired into the
 *     sitemap / category robots tag while the owner's hold is in place (section 8).
 * The HTTP half (200s, rendered HTML, FAQPage == visible FAQ, prices == product pages) is checked
 * against a running build; see the PR description for that run.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CATEGORY_LANDING_SLUGS,
  CATEGORY_LINKS,
  CHENNAI_CITY_PAGE_SLUG,
  chennaiContainerLink,
  resolveCategoryLanding,
  type ResolvedCategoryLanding,
} from "../src/data/categoryLandings";
import { categories, getProductDetailPath, products } from "../src/data/products";
import { getCommerce, isPurchasable, isRentalPrice } from "../src/data/productCommerce";
import { allChildParams } from "../src/data/productChildPages";
import { CITY_PAGES, cityPageBySlug, type CityPage } from "../src/data/cityPages";
import { seoPromotions } from "../src/data/seoPromotions";
import { INSTALLATION } from "../src/data/shippingZones";
import { formatINR, sellPrice } from "../src/lib/pricing/gst";
import { isCategoryIndexable } from "../src/lib/seo/categoryIndexing";

let passed = 0;
let failed = 0;
const check = (cond: boolean, label: string) => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
};
const section = (title: string) => console.log(`\n${title}`);

/* Every route a landing link may legitimately point at. */
const ROUTES = new Set<string>([
  ...products.map((p) => getProductDetailPath(p)),
  ...categories.filter((c) => isCategoryIndexable(c.slug, products)).map((c) => `/products/category/${c.slug}`),
  ...allChildParams().map(({ slug, child }) => `/products/${slug}/${child}`),
  ...CITY_PAGES.map((c) => `/cities-we-serve/${c.slug}`),
  ...seoPromotions.map((p) => new URL(p.canonicalUrl).pathname),
  // Static route segments that exist as their own page.tsx.
  ...["/products/portable-toilet-cabin", "/products/portable-cabin", "/products/metal-portable-cabin", "/shipping"],
]);
const isBlogRoute = (href: string) =>
  /^\/blog\/[a-z0-9-]+$/.test(href) && existsSync(join("app", "(site)", "blog", href.slice("/blog/".length), "page.tsx"));

const resolved = new Map<string, ResolvedCategoryLanding>();

section("1. Every landing slug resolves against the catalogue");
for (const slug of CATEGORY_LANDING_SLUGS) {
  const landing = resolveCategoryLanding(slug, products, categories);
  check(!!landing, `${slug}: resolves`);
  if (!landing) continue;
  resolved.set(slug, landing);
  const inCategory = products.filter((p) => p.categorySlug === slug);
  check(landing.models.length === inCategory.length, `${slug}: one model row per product (${inCategory.length})`);
  check(CATEGORY_LINKS[slug] !== undefined, `${slug}: has a CATEGORY_LINKS entry`);
}

section("2. Model prices are the commerce catalogue's own figures");
for (const [slug, landing] of resolved) {
  for (const m of landing.models) {
    const c = getCommerce(m.id);
    if (m.priceLabel === undefined) {
      check(!isPurchasable(m.id), `${slug}/${m.id}: no price shown only when not purchasable`);
      continue;
    }
    check(isPurchasable(m.id) && !!c, `${slug}/${m.id}: price shown only for a purchasable SKU`);
    if (!c) continue;
    const expected = `${formatINR(sellPrice(c.basePrice))}${isRentalPrice(m.id) ? " / month" : ""}`;
    check(m.priceLabel === expected, `${slug}/${m.id}: "${m.priceLabel}" === "${expected}"`);
    check(m.path === getProductDetailPath(products.find((p) => p.id === m.id)!), `${slug}/${m.id}: links the canonical path`);
  }
}

section("3. Copy and FAQs carry only computed ₹ figures, no starting-price phrasing");
for (const [slug, landing] of resolved) {
  const allowed = new Set<string>([
    formatINR(INSTALLATION.rate),
    ...landing.models.flatMap((m) => (m.priceLabel ? [m.priceLabel, m.priceLabel.replace(" / month", "")] : [])),
  ]);
  const texts = [
    landing.heading,
    ...landing.intro,
    ...landing.applications.flatMap((a) => [a.title, a.text]),
    ...landing.choosing.flatMap((c) => [c.title, c.text]),
    ...landing.faqs.flatMap((f) => [f.question, f.answer]),
  ];
  for (const t of texts) {
    for (const figure of t.match(/₹[\d,]+(?: \/ month)?/g) ?? []) {
      check(allowed.has(figure), `${slug}: "${figure}" in copy is a computed figure`);
    }
    check(!/starting (from|at)|from ₹|upwards of ₹/i.test(t), `${slug}: no starting-price phrasing in "${t.slice(0, 50)}…"`);
  }
  const questions = landing.faqs.map((f) => f.question);
  check(questions.length >= 6 && questions.length <= 10, `${slug}: 6–10 FAQs (${questions.length})`);
  check(new Set(questions).size === questions.length, `${slug}: no repeated FAQ question`);
}

section("4. Every link target is a real route");
for (const [slug, links] of Object.entries(CATEGORY_LINKS)) {
  for (const l of [...links.locationLinks, ...links.guideLinks]) {
    check(ROUTES.has(l.href) || isBlogRoute(l.href), `${slug}: ${l.href} is a real route`);
  }
  for (const rel of links.relatedCategorySlugs) {
    check(ROUTES.has(`/products/category/${rel}`), `${slug}: related category ${rel} is populated and routable`);
  }
  for (const id of links.crossSellProductIds) {
    const p = products.find((x) => x.id === id);
    check(!!p, `${slug}: cross-sell id ${id} exists`);
    check(!!p && p.categorySlug !== slug, `${slug}: cross-sell id ${id} is from another category`);
  }
  const hrefs = [...links.locationLinks, ...links.guideLinks].map((l) => l.href);
  check(new Set(hrefs).size === hrefs.length, `${slug}: no duplicate link`);
}

section("5. Empty-category indexing rule (helper only — not wired in, see section 8)");
for (const c of categories) {
  const count = products.filter((p) => p.categorySlug === c.slug).length;
  check(isCategoryIndexable(c.slug, products) === count > 0, `${c.slug}: indexable iff it holds a product (${count})`);
}

section("6. Chennai links follow the city page");
{
  const live = !!cityPageBySlug(CHENNAI_CITY_PAGE_SLUG);
  const cityHref = `/cities-we-serve/${CHENNAI_CITY_PAGE_SLUG}`;
  for (const slug of ["site-office-containers", "container-offices"]) {
    const chennai = CATEGORY_LINKS[slug].locationLinks.find((l) => l.name === "Chennai");
    check(
      !!chennai && (live ? chennai.href === cityHref : chennai.href.startsWith("/promotions/")),
      `${slug}: Chennai → ${live ? "city page" : "promotion page (city page not published yet)"} (${chennai?.href})`,
    );
  }
  // Simulate the city page being published: the helper must switch to its canonical URL.
  if (!live) CITY_PAGES.push({ slug: CHENNAI_CITY_PAGE_SLUG } as CityPage);
  check(chennaiContainerLink("container-office").href === cityHref, "with the city page published, the link is its canonical URL");
  if (!live) {
    CITY_PAGES.pop();
    check(
      chennaiContainerLink("container-office").href === "/promotions/container-office-in-chennai",
      "without it, the Chennai promotion page",
    );
  }
}

section("7. Adding a product to an empty category makes it indexable");
{
  const empty = categories.find((c) => !products.some((p) => p.categorySlug === c.slug));
  check(!!empty, "there is an empty category to test with");
  if (empty) {
    check(!isCategoryIndexable(empty.slug, products), `${empty.slug}: noindex while empty`);
    const withProduct = [...products, { ...products[0], id: "test-new-product", categorySlug: empty.slug }];
    check(isCategoryIndexable(empty.slug, withProduct), `${empty.slug}: indexable once a product is filed under it`);
    const populated = products[0].categorySlug;
    const emptied = products.filter((p) => p.categorySlug !== populated);
    check(!isCategoryIndexable(populated, emptied), `${populated}: noindex again if its last product is moved out`);
  }
}

section("8. Owner hold: empty categories keep their index status and sitemap entry");
{
  // Owner decision 2026-10-13: no noindex / sitemap removal for the empty categories until their
  // Search Console performance has been reviewed. Lifting the hold means changing these checks.
  const sitemapSrc = readFileSync(join("app", "sitemap.ts"), "utf8");
  const pageSrc = readFileSync(join("app", "(site)", "products", "category", "[slug]", "page.tsx"), "utf8");
  check(!sitemapSrc.includes("isCategoryIndexable"), "app/sitemap.ts does not filter categories by isCategoryIndexable");
  check(/categories\.map\(\(category\) =>\s*entry\(`\/products\/category\/\$\{category\.slug\}`/.test(sitemapSrc), "app/sitemap.ts lists every category");
  check(!pageSrc.includes("isCategoryIndexable"), "the category page does not derive robots from isCategoryIndexable");
  check(!/noindex\s*:/.test(pageSrc), "the category page sets no noindex");
}

console.log(`\ncategory-landings.test.ts — ${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
