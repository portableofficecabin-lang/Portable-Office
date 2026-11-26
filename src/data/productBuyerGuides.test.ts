import { describe, it, expect } from "vitest";

import { PRODUCT_BUYER_GUIDES, BUYER_GUIDE_CREDENTIALS, type GuideParagraph } from "./productBuyerGuides";
import { products, getProductDetailPath } from "./products";
import { getCommerce } from "./productCommerce";

/**
 * The buyer guides render on Merchant-fed product pages, so their copy is held to the same rules as
 * every other surface of those pages: no second price, no invented facts. These checks fail the
 * build if a future edit slips one in.
 */

const paraText = (p: GuideParagraph) => (typeof p === "string" ? p : `${p.before} ${p.link.label}${p.after}`);

function allText(): { productId: string; text: string }[] {
  return PRODUCT_BUYER_GUIDES.flatMap((g) => [
    ...g.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []).map(paraText), ...(s.bullets ?? [])]),
    g.faqHeading,
    ...g.faqs.flatMap((f) => [f.question, f.answer]),
    g.quote.heading,
    g.quote.text,
  ].map((text) => ({ productId: g.productId, text })));
}

const STATIC_ROUTES = new Set(["/warranty", "/contact"]);
const productPaths = new Set(products.map((p) => getProductDetailPath(p)));

describe("product buyer guides", () => {
  it("each guide belongs to exactly one existing, priced catalogue product", () => {
    const ids = PRODUCT_BUYER_GUIDES.map((g) => g.productId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(products.some((p) => p.id === id)).toBe(true);
      expect(getCommerce(id)?.priceConfirmed).toBe(true);
    }
  });

  it("never states a ₹ figure (the price box is the page's only price)", () => {
    for (const { productId, text } of [...allText(), { productId: "-", text: BUYER_GUIDE_CREDENTIALS }]) {
      expect({ productId, text, rupee: /₹|\bRs\.?\s?\d|\bINR\b|lakh/i.test(text) }).toEqual({ productId, text, rupee: false });
    }
  });

  it("never states a year, a warranty period, a certification or a performance claim", () => {
    const banned = [
      /\b(19|20)\d{2}\b/, // years date the copy and go stale
      /\b\d+\s*(-|–)?\s*(year|yr)s?\b.*warrant|warrant.*\b\d+\s*(year|yr)/i, // warranty periods live on /warranty only
      /\bISO\b|certif|BIS\b|compliant|complies|approved by/i,
      /years'? (of )?experience|\b\d+\+\s*(projects|clients|cabins|units)|\bhundreds of\b|\bthousands of\b/i,
      /we (have )?(installed|delivered|completed|supplied|built) (for|at|in)\b/i, // project claims
      /\bcheaper\b|\b\d+\s*%/i, // savings / percentage claims
    ];
    for (const { productId, text } of allText()) {
      for (const re of banned) {
        expect({ productId, text, pattern: String(re), hit: re.test(text) }).toEqual({ productId, text, pattern: String(re), hit: false });
      }
    }
  });

  it("links only to live product pages or known static routes", () => {
    for (const g of PRODUCT_BUYER_GUIDES) {
      for (const s of g.sections) {
        for (const p of s.paragraphs ?? []) {
          if (typeof p === "string") continue;
          const ok = productPaths.has(p.link.href) || STATIC_ROUTES.has(p.link.href);
          expect({ productId: g.productId, href: p.link.href, ok }).toEqual({ productId: g.productId, href: p.link.href, ok: true });
          // A guide never links to its own page.
          const self = products.find((x) => x.id === g.productId)!;
          expect(p.link.href).not.toBe(getProductDetailPath(self));
        }
      }
    }
  });

  it("headings and FAQ questions are unique across guides (no templated copy)", () => {
    const headings = PRODUCT_BUYER_GUIDES.flatMap((g) => [...g.sections.map((s) => s.heading), g.faqHeading, g.quote.heading]);
    expect(new Set(headings).size).toBe(headings.length);
    const questions = PRODUCT_BUYER_GUIDES.flatMap((g) => g.faqs.map((f) => f.question));
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("every guide has at least five sections and five FAQs", () => {
    for (const g of PRODUCT_BUYER_GUIDES) {
      expect(g.sections.length).toBeGreaterThanOrEqual(5);
      expect(g.faqs.length).toBeGreaterThanOrEqual(5);
    }
  });
});
