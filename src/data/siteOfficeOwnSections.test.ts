import { describe, it, expect } from "vitest";

import { SITE_OFFICE_OWN_SECTIONS, type OwnSectionItem } from "./siteOfficeOwnSections";
import { products, getProductDetailPath, categories } from "./products";
import { getCommerce } from "./productCommerce";

/**
 * The two site-office sections render on Merchant landing pages, so they are held to the buyer-guide
 * rules (src/data/productBuyerGuides.test.ts): no second price, no invented facts. On top of that,
 * every line must rest on facts that appear verbatim in the product's own catalogue record.
 */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

/** Everything the catalogue record says about a product, as one searchable string. */
function recordText(productId: string): string {
  const p = products.find((x) => x.id === productId);
  if (!p) throw new Error(`no catalogue product ${productId}`);
  return norm(
    [
      p.name,
      p.description,
      p.shortDescription,
      ...(p.specifications ?? []).flatMap((s) => [s.label, s.value]),
      ...(p.features ?? []),
    ].join(" \n "),
  );
}

function allText(): { productId: string; text: string }[] {
  return SITE_OFFICE_OWN_SECTIONS.flatMap((s) =>
    [
      s.heading,
      s.guideNote,
      s.intro.text,
      ...s.groups.flatMap((g) => [g.heading ?? "", ...g.items.map((i) => i.text)]),
      ...s.links.map((l) => `${l.before} ${l.link.label}${l.after}`),
    ]
      .filter(Boolean)
      .map((text) => ({ productId: s.productId, text })),
  );
}

const productPaths = new Set(products.map((p) => getProductDetailPath(p)));
const categoryPaths = new Set(categories.map((c) => `/products/category/${c.slug}`));

describe("site-office own sections", () => {
  it("cover exactly the two site-office products, at their current URLs, with confirmed prices", () => {
    const byId = Object.fromEntries(
      SITE_OFFICE_OWN_SECTIONS.map((s) => [s.productId, getProductDetailPath(products.find((p) => p.id === s.productId)!)]),
    );
    expect(byId).toEqual({
      "42": "/products/container-site-office",
      "2": "/products/standard-site-office-container",
    });
    for (const id of Object.keys(byId)) expect(getCommerce(id)?.priceConfirmed).toBe(true);
  });

  it("every line rests on facts found in the line itself and in the product's own catalogue record", () => {
    for (const s of SITE_OFFICE_OWN_SECTIONS) {
      const record = recordText(s.productId);
      const items: OwnSectionItem[] = [s.intro, ...s.groups.flatMap((g) => g.items)];
      for (const item of items) {
        expect({ productId: s.productId, text: item.text, hasFacts: item.facts.length > 0 }).toEqual({
          productId: s.productId,
          text: item.text,
          hasFacts: true,
        });
        for (const fact of item.facts) {
          const inLine = norm(item.text).includes(norm(fact));
          const inRecord = record.includes(norm(fact));
          expect({ productId: s.productId, fact, inLine, inRecord }).toEqual({ productId: s.productId, fact, inLine: true, inRecord: true });
        }
      }
    }
  });

  it("facts stated about a linked product come from that product's record", () => {
    for (const s of SITE_OFFICE_OWN_SECTIONS) {
      for (const l of s.links) {
        if (!l.facts?.length) continue;
        const target = products.find((p) => getProductDetailPath(p) === l.link.href);
        expect({ href: l.link.href, isProduct: !!target }).toEqual({ href: l.link.href, isProduct: true });
        const record = recordText(target!.id);
        for (const fact of l.facts) {
          const sentence = norm(`${l.before} ${l.link.label}${l.after}`);
          expect({ fact, inSentence: sentence.includes(norm(fact)), inRecord: record.includes(norm(fact)) }).toEqual({
            fact,
            inSentence: true,
            inRecord: true,
          });
        }
      }
    }
  });

  it("never states a ₹ figure (the price box is the page's only price)", () => {
    for (const { productId, text } of allText()) {
      expect({ productId, text, rupee: /₹|\bRs\.?\s?\d|\bINR\b|lakh/i.test(text) }).toEqual({ productId, text, rupee: false });
    }
  });

  it("never states a year, a warranty period, a certification, a project claim or a performance claim", () => {
    const banned = [
      /\b(19|20)\d{2}\b/,
      /warrant/i,
      /\bISO\b|certif|BIS\b|compliant|complies|approved by|IS[- ]grade/i,
      /years'? (of )?experience|\b\d+\+\s*(projects|clients|cabins|units)|\bhundreds of\b|\bthousands of\b|\bhundreds\b/i,
      /we (have )?(installed|delivered|completed|supplied|built) (for|at|in)\b/i,
      /\bcheaper\b|\b\d+\s*%|\bstack/i,
    ];
    for (const { productId, text } of allText()) {
      for (const re of banned) {
        expect({ productId, text, pattern: String(re), hit: re.test(text) }).toEqual({ productId, text, pattern: String(re), hit: false });
      }
    }
  });

  it("links only to live product or category pages, never to the page itself", () => {
    for (const s of SITE_OFFICE_OWN_SECTIONS) {
      const self = getProductDetailPath(products.find((p) => p.id === s.productId)!);
      for (const l of s.links) {
        const ok = productPaths.has(l.link.href) || categoryPaths.has(l.link.href);
        expect({ productId: s.productId, href: l.link.href, ok }).toEqual({ productId: s.productId, href: l.link.href, ok: true });
        expect(l.link.href).not.toBe(self);
      }
    }
  });

  it("the two sections share no heading or line (no templated copy between the pair)", () => {
    const [a, b] = SITE_OFFICE_OWN_SECTIONS.map((s) => new Set(allText().filter((t) => t.productId === s.productId && t.text !== s.guideNote).map((t) => norm(t.text))));
    const shared = [...a].filter((x) => b.has(x));
    expect(shared).toEqual([]);
  });
});
