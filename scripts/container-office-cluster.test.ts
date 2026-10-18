/**
 * CONTAINER OFFICE CLUSTER REGRESSION TEST. Run with:  npx tsx scripts/container-office-cluster.test.ts
 *
 * Guards the topic cluster defined in src/data/containerOfficeCluster.ts:
 *   pillar /products/category/container-offices · Bangalore landing /promotions/container-office-in-bangalore
 *   · directory /cities-we-serve#container-office-locations · one location page per area.
 *
 * FAILS (exit 1) if:
 *   • a container-office page is added to (or removed from) cityPages.ts without a cluster entry, or
 *     a cluster entry points at a page that does not exist;
 *   • a neighbour link is unknown, self-referencing, or not genuinely nearby (> 130 km apart by the
 *     pages' own geo positions), or a page outside ISOLATED (no cluster page within 130 km) has
 *     no neighbour;
 *   • a cluster href is not a clean root-relative path (query strings such as ?srsltid, trailing
 *     slashes, or fragments other than the directory anchor);
 *   • a state hub or the Bangalore landing page stops reaching its location pages, or loses the
 *     pillar / directory link;
 *   • anchors stop being varied: duplicate hub anchors, or a hub anchor identical to the target
 *     page's H1 (an exact-match copy of the heading);
 *   • a card's coverage line names a place its page does not mention (descriptors must come from
 *     the page's own copy, not new claims).
 */

import { CITY_PAGES } from "../src/data/cityPages";
import {
  CONTAINER_OFFICE_BANGALORE_PATH,
  CONTAINER_OFFICE_DIRECTORY_PATH,
  CONTAINER_OFFICE_LOCATIONS,
  CONTAINER_OFFICE_PILLAR_PATH,
  locationPath,
} from "../src/data/containerOfficeCluster";
import { getSEOPromotion } from "../src/data/seoPromotions";

let passed = 0;
let failed = 0;
function check(ok: boolean, label: string) {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL  ${label}`);
  }
}

const pagesBySlug = new Map(CITY_PAGES.map((p) => [p.slug, p]));
const clusterSlugs = new Set(CONTAINER_OFFICE_LOCATIONS.map((l) => l.slug));
const coPageSlugs = CITY_PAGES.filter((p) => /container-office/.test(p.slug)).map((p) => p.slug);

/* ── membership ─────────────────────────────────────────────────────────────────────────── */
check(CONTAINER_OFFICE_LOCATIONS.length >= 18, `cluster has at least 18 locations (has ${CONTAINER_OFFICE_LOCATIONS.length})`);
check(clusterSlugs.size === CONTAINER_OFFICE_LOCATIONS.length, "cluster slugs are unique");
for (const slug of coPageSlugs) check(clusterSlugs.has(slug), `cityPages container-office page "${slug}" is in the cluster`);
for (const loc of CONTAINER_OFFICE_LOCATIONS) {
  const page = pagesBySlug.get(loc.slug);
  check(!!page, `cluster entry "${loc.slug}" has a city page`);
  if (page) {
    const region = loc.state === "Karnataka" ? "IN-KA" : "IN-TN";
    check(page.geo.region === region, `"${loc.slug}" state ${loc.state} matches the page's geo region ${page.geo.region}`);
  }
}

/* ── neighbours: known, not self, genuinely nearby ─────────────────────────────────────── */
const ll = (slug: string) => pagesBySlug.get(slug)!.geo.position.split(";").map(Number) as [number, number];
const km = (a: [number, number], b: [number, number]) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
/* Pages exempt from the "has a neighbour" checks: Mysore and the North Karnataka pages Belagavi,
   Bagalkot and Bidar. Davanagere and Haveri, ~67 km apart on NH-48, are linked to each other, so they
   are checked like every other page. */
const ISOLATED = new Set([
  "container-office-in-mysore",
  "container-office-in-belagavi",
  "container-office-in-bagalkot",
  "container-office-in-bidar",
]);
for (const loc of CONTAINER_OFFICE_LOCATIONS) {
  if (!ISOLATED.has(loc.slug)) check(loc.neighbours.length > 0, `"${loc.slug}" has at least one neighbour`);
  check(new Set(loc.neighbours).size === loc.neighbours.length, `"${loc.slug}" lists each neighbour once`);
  for (const n of loc.neighbours) {
    check(n !== loc.slug, `"${loc.slug}" is not its own neighbour`);
    check(clusterSlugs.has(n), `"${loc.slug}" neighbour "${n}" is a cluster page`);
    if (clusterSlugs.has(n) && pagesBySlug.has(n) && pagesBySlug.has(loc.slug)) {
      const d = km(ll(loc.slug), ll(n));
      check(d <= 130, `"${loc.slug}" → "${n}" is genuinely nearby (${Math.round(d)} km)`);
    }
  }
}
for (const loc of CONTAINER_OFFICE_LOCATIONS) {
  if (ISOLATED.has(loc.slug)) continue;
  check(CONTAINER_OFFICE_LOCATIONS.some((o) => o.neighbours.includes(loc.slug)), `"${loc.slug}" is linked from at least one neighbour`);
}

/* ── clean URLs ─────────────────────────────────────────────────────────────────────────── */
const clean = (href: string) => href.startsWith("/") && !href.includes("?") && !/srsltid|utm_|gclid/i.test(href) && !(href.length > 1 && href.endsWith("/"));
for (const href of [CONTAINER_OFFICE_PILLAR_PATH, CONTAINER_OFFICE_BANGALORE_PATH, ...CONTAINER_OFFICE_LOCATIONS.map((l) => locationPath(l.slug))]) {
  check(clean(href) && !href.includes("#"), `clean path: ${href}`);
}
check(clean(CONTAINER_OFFICE_DIRECTORY_PATH) && CONTAINER_OFFICE_DIRECTORY_PATH.startsWith("/cities-we-serve#"), "directory link is /cities-we-serve#<section>");

/* ── hubs reach their location pages ───────────────────────────────────────────────────── */
function hubHrefs(location: string): string[] {
  const promo = getSEOPromotion("Container Office", location);
  check(!!promo, `promotion "Container Office in ${location}" exists`);
  return (promo?.relatedProductLinks ?? []).map((l) => l.href);
}
const hubs: [string, (l: (typeof CONTAINER_OFFICE_LOCATIONS)[number]) => boolean][] = [
  ["Bangalore", (l) => !!l.bangaloreRegion],
  ["Karnataka", (l) => l.state === "Karnataka"],
  ["Tamil Nadu", (l) => l.state === "Tamil Nadu"],
];
for (const [location, inScope] of hubs) {
  const hrefs = hubHrefs(location);
  check(hrefs.includes(CONTAINER_OFFICE_PILLAR_PATH), `${location} hub links the pillar`);
  check(hrefs.includes(CONTAINER_OFFICE_DIRECTORY_PATH), `${location} hub links the directory`);
  check(new Set(hrefs).size === hrefs.length, `${location} hub has no duplicate links`);
  for (const loc of CONTAINER_OFFICE_LOCATIONS.filter(inScope)) {
    check(hrefs.includes(locationPath(loc.slug)), `${location} hub links "${loc.slug}"`);
  }
  for (const href of hrefs) check(clean(href), `${location} hub link is clean: ${href}`);
}

/* ── varied anchors ─────────────────────────────────────────────────────────────────────── */
const anchors = CONTAINER_OFFICE_LOCATIONS.map((l) => l.hubAnchor.toLowerCase());
check(new Set(anchors).size === anchors.length, "hub anchors are unique");
for (const loc of CONTAINER_OFFICE_LOCATIONS) {
  const page = pagesBySlug.get(loc.slug);
  if (page) check(loc.hubAnchor.toLowerCase() !== page.h1.toLowerCase(), `"${loc.slug}" hub anchor is not a copy of its H1`);
}

/* ── descriptors come from the page's own copy ─────────────────────────────────────────── */
for (const loc of CONTAINER_OFFICE_LOCATIONS) {
  const page = pagesBySlug.get(loc.slug);
  if (!page) continue;
  const text = [page.tagline, page.areasHeading, page.areasText, ...page.intro, page.whyIntro, page.industriesIntro,
    ...page.industries.map((i) => `${i.title ?? ""} ${i.text}`), ...page.faqs.map((f) => f.answer)].join(" ").toLowerCase();
  const tokens = loc.area.split(/,\s*|\s+and\s+/).map((t) => t.replace(/^the\s+/i, "").trim()).filter((t) => /^[A-Z]/.test(t));
  for (const t of tokens) {
    const head = t.split(/\s+/)[0].toLowerCase();
    check(text.includes(head), `"${loc.slug}" coverage term "${t}" appears in the page's own copy`);
  }
}

console.log(`\ncontainer-office-cluster.test.ts — ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
