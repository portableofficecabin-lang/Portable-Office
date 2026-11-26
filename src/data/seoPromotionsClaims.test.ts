import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seoPromotions, getPromotionSlug } from "./seoPromotions";

/**
 * Promotion pages must not state claims nothing on record supports (removed 2026-11-26):
 * "15+ years", "500+ projects / clients", deliveries to "government agencies" in every place,
 * one "from ₹1.5 lakh" price for every product, "ISO grade" / "IS-grade" materials, a
 * "15-20 years" lifespan, "fully compliant" electricals, "book a site visit", and a decorative
 * five-star rating. URLs and indexing are untouched by that change; this test also pins the URL
 * shape so a wording edit can never move a promotion page.
 */
const BANNED = [
  /\b15\s*\+?\s*years?\b/i,
  /over 15 years/i,
  /500\s*\+/,
  /government agenc/i,
  /\bISO[- ]?grade\b/i,
  /\bIS-grade\b/i,
  /₹\s?1\.5\s?(lakh|L)\b/i,
  /15\s*[-–]\s*20\+?\s*years?/i,
  /fully compliant/i,
  /site visit/i,
  /We have delivered/i,
];

describe("promotion copy states no unsupported claims", () => {
  it("generated promotions: title, description, keywords, body, features and FAQs", () => {
    for (const p of seoPromotions) {
      const text = JSON.stringify([p.title, p.metaDescription, p.metaKeywords, p.h1, p.content, p.keyFeatures, p.faqs]);
      for (const re of BANNED) expect({ url: p.canonicalUrl, claim: re.source, found: re.test(text) }).toEqual({ url: p.canonicalUrl, claim: re.source, found: false });
    }
  });

  it("the shared promotion view and the Bangalore promotion carry none either", () => {
    const files = [
      "src/views/SEOPromotionPage.tsx",
      "src/components/promotions/ShippingContainerBangaloreContent.tsx",
      "app/(site)/promotions/shipping-container-in-bangalore/page.tsx",
    ];
    for (const f of files) {
      // Code comments may name the removed claims; only check what renders (strip comments).
      const src = readFileSync(join(process.cwd(), f), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      for (const re of BANNED.filter((r) => !/₹/.test(r.source))) expect({ f, claim: re.source, found: re.test(src) }).toEqual({ f, claim: re.source, found: false });
      // The Bangalore page's "from ₹1.5 lakh" and its "Used/refurbished 20 ft … ₹1.5 – ₹2.5 lakh" row were not
      // substantiated by any catalogue configuration (ids 29–34: ₹50,000–₹1,50,000 before GST). Removed 2026-11-26.
      if (f !== "src/views/SEOPromotionPage.tsx") {
        expect({ f, found: /₹\s?1\.5\b/.test(src) }).toEqual({ f, found: false });
        expect({ f, found: /Used\/refurbished 20 ft storage container/.test(src) }).toEqual({ f, found: false });
        // No indicative "₹X – ₹Y lakh" ranges at all: the price table lists catalogue products with their
        // own fixed prices (src/data/bangaloreContainerPrices.ts).
        expect({ f, found: /₹\s?\d+(\.\d+)?\s?[–-]\s?₹\s?\d+(\.\d+)?\s?lakh/i.test(src) }).toEqual({ f, found: false });
      }
    }
    expect(/<Star\b/.test(readFileSync(join(process.cwd(), "src/views/SEOPromotionPage.tsx"), "utf8"))).toBe(false);
  });

  it("URLs are unchanged and titles stay unique and within 60 characters", () => {
    const titles = new Set<string>();
    for (const p of seoPromotions) {
      expect(p.canonicalUrl).toBe(`https://portableofficecabin.com/promotions/${getPromotionSlug(p.keyword, p.location)}`);
      expect(p.title.length).toBeLessThanOrEqual(60);
      titles.add(p.title);
    }
    expect(seoPromotions.length).toBe(100);
    expect(titles.size).toBe(100);
  });
});
