import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SPEC_TABLE_CATEGORY_SLUGS, categorySpecRows } from "./categorySpecTables";
import { CATEGORY_LANDING_SLUGS } from "./categoryLandings";
import { getProductDetailPath, products } from "./products";

/**
 * The toilet category's spec table (Search Console phase, 2026-11-27) must be the products' own
 * catalogue rows — not retyped copy — and the toilet hub must link the category with the anchor
 * that names it, so the category owns the head term.
 */
describe("category spec table", () => {
  it("only renders on landing categories that exist", () => {
    for (const slug of SPEC_TABLE_CATEGORY_SLUGS) expect(CATEGORY_LANDING_SLUGS).toContain(slug);
    expect(categorySpecRows("security-cabins", [{ id: "6", name: "x", path: "/x" }])).toEqual([]);
  });

  it("each row is the product's own catalogue specification", () => {
    for (const slug of SPEC_TABLE_CATEGORY_SLUGS) {
      const models = products.filter((p) => p.categorySlug === slug).map((p) => ({ id: p.id, name: p.name, path: getProductDetailPath(p) }));
      const rows = categorySpecRows(slug, models);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const own = products.find((p) => p.id === r.model.id)!.specifications!.map((s) => ({ label: s.label, value: s.value }));
        expect(r.specs).toEqual(own);
      }
    }
  });
});

describe("portable toilet hub", () => {
  const hub = readFileSync(join(process.cwd(), "app/(site)/products/portable-toilet-cabin/page.tsx"), "utf8");
  it("no longer leads with the bare head term in its title or H1", () => {
    const title = hub.match(/title: "([^"]+)"/)?.[1] ?? "";
    const h1 = hub.match(/const H1 = "([^"]+)"/)?.[1] ?? "";
    for (const t of [title, h1]) expect(/^Portable Toilet Cabins?\b/i.test(t)).toBe(false);
  });
  it("links the category with the anchor that names it", () => {
    expect(hub).toMatch(/href="\/products\/category\/portable-toilet-cabins"[^>]*>\s*portable toilet cabins\s*<\/Link>/);
  });
});
