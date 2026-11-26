import { describe, it, expect } from "vitest";
import { seoPromotions, getPromotionSlug } from "./seoPromotions";

/**
 * GENERATED LOCATION PAGES MAY NOT GROW SILENTLY.
 *
 * /promotions/<keyword>-in-<location> pages are generated as keywords × locations
 * (src/data/seoPromotions.ts): adding ONE keyword or ONE location publishes ten new indexable pages
 * that swap only the product and place names. The site-wide audit of 2026-11-25 measured the
 * existing 99 templated pages at a median 83% of 5-word sequences shared with their nearest sibling
 * — the pattern Google's spam policies call doorway pages / scaled content abuse, which can weigh on
 * the whole site. City pages are written one at a time and approved per PR; this generator is not.
 *
 * So the generated set is pinned here. Changing it is allowed only as a deliberate, owner-approved
 * edit of EXPECTED_SLUGS in the same PR — never as a side effect of editing the keyword or location
 * arrays.
 */
const KEYWORDS = [
  "portable-cabin", "container-office", "porta-cabin", "site-office-container", "cargo-storage-container",
  "shipping-container", "labour-colony", "bunker-bed-container-cabin", "security-cabin", "portable-toilet-cabin",
];
const LOCATIONS = [
  "tamil-nadu", "kerala", "chennai", "karnataka", "andhra-pradesh", "bangalore", "hyderabad", "telangana", "west-bengal", "maharashtra",
];
const EXPECTED_SLUGS = KEYWORDS.flatMap((k) => LOCATIONS.map((l) => `${k}-in-${l}`)).sort();

describe("seoPromotions — the generated location-page set is pinned", () => {
  const slugs = seoPromotions.map((p) => getPromotionSlug(p.keyword, p.location)).sort();
  it("generates exactly the reviewed 100 pages (no new keyword or location without approval)", () => {
    expect(slugs.length).toBe(100);
    expect(slugs).toEqual(EXPECTED_SLUGS);
  });
  it("each slug matches its canonical URL", () => {
    for (const p of seoPromotions) {
      expect(p.canonicalUrl).toBe(`https://portableofficecabin.com/promotions/${getPromotionSlug(p.keyword, p.location)}`);
    }
  });
});
