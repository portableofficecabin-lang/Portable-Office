import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { PRODUCT_SLUG_RENAMES, renamedProductSlug, earlierProductSlugs } from "./productSlugRenames";
import { products, getProductSlug, getProductDetailPath } from "./products";
import { feedEligible } from "./productCommerce";
import { feedExclusionFor } from "./merchantFeedPolicy";
import { allChildParams } from "./productChildPages";
import { allVariantParams } from "./productFamilies";
import { GET as legacyProductRoute } from "../../app/product/[...slug]/route";

/**
 * D4 — the six product URL renames. Everything that must agree on the six pairs is checked here:
 * the catalogue, the one-hop 301s in next.config.ts (read as text, the same way
 * scripts/product-variants.test.ts checks the size-variant redirects), the legacy /product/<old>
 * route, the review read, the database migration and every internal link in the source tree.
 */

const ROOT = process.cwd();
const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
const migration = readFileSync(join(ROOT, "supabase/migrations/20261126120000_product_slug_renames.sql"), "utf8");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|mjs|json)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("D4 product URL renames", () => {
  it("each rename names a real catalogue product whose id and SKU are unchanged and whose slug is the new one", () => {
    expect(PRODUCT_SLUG_RENAMES.length).toBe(6);
    for (const r of PRODUCT_SLUG_RENAMES) {
      const product = products.find((p) => p.id === r.id)!;
      expect({ id: r.id, sku: product?.sku, slug: product && getProductSlug(product) }).toEqual({ id: r.id, sku: r.sku, slug: r.to });
      expect(getProductDetailPath(product)).toBe(`/products/${r.to}`);
      expect(products.some((p) => getProductSlug(p) === r.from)).toBe(false);
    }
  });

  it("new slugs are unique and collide with no product, guide or size-variant URL", () => {
    const tos = PRODUCT_SLUG_RENAMES.map((r) => r.to);
    expect(new Set(tos).size).toBe(tos.length);
    const productSlugs = products.map((p) => getProductSlug(p));
    for (const to of tos) expect(productSlugs.filter((s) => s === to).length).toBe(1);
    const nested = new Set([...allChildParams(), ...allVariantParams()].map((c) => c.child));
    for (const to of tos) expect(nested.has(to)).toBe(false);
  });

  it("none of the renamed products is in the Merchant feed (no feed <g:link> changes)", () => {
    // What the feed route submits: commerce-eligible AND not excluded by merchantFeedPolicy.ts
    // (the six are excluded there as location pages; that protected file is not changed by D4).
    const fed = new Set(feedEligible().filter((c) => !feedExclusionFor(c.sku)).map((c) => c.id));
    for (const r of PRODUCT_SLUG_RENAMES) expect({ id: r.id, fed: fed.has(r.id) }).toEqual({ id: r.id, fed: false });
  });

  it("next.config.ts 301s the old URL and its legacy-extension form straight to the new URL, above the generic rule", () => {
    const generic = config.indexOf(`{ source: "/products/:slug.html"`);
    expect(generic).toBeGreaterThan(0);
    for (const r of PRODUCT_SLUG_RENAMES) {
      for (const source of [`/products/${r.from}`, `/products/${r.from}.html`]) {
        const rule = `{ source: "${source}", destination: "/products/${r.to}", statusCode: 301 }`;
        const at = config.indexOf(rule);
        expect({ source, present: at > 0, beforeGeneric: at > 0 && at < generic }).toEqual({ source, present: true, beforeGeneric: true });
      }
    }
  });

  it("the legacy /product/<old> route goes straight to the renamed page", () => {
    for (const r of PRODUCT_SLUG_RENAMES) {
      const res = legacyProductRoute(new Request(`https://portableofficecabin.com/product/${r.from}`), { params: { slug: [r.from] } });
      expect({ from: r.from, status: res.status, location: res.headers.get("location") }).toEqual({
        from: r.from,
        status: 301,
        location: `https://portableofficecabin.com/products/${r.to}`,
      });
    }
  });

  it("reviews written under an old slug are read for the new slug", () => {
    for (const r of PRODUCT_SLUG_RENAMES) {
      expect(earlierProductSlugs(r.to)).toEqual([r.from]);
      expect(renamedProductSlug(r.from)).toBe(r.to);
    }
    expect(earlierProductSlugs("porta-cabin")).toEqual([]);
  });

  it("the database migration seeds exactly the same six pairs", () => {
    for (const r of PRODUCT_SLUG_RENAMES) {
      const row = new RegExp(`\\('${r.from}',\\s*'${r.to}',\\s*'${r.sku}'\\)`);
      expect({ from: r.from, inMigration: row.test(migration) }).toEqual({ from: r.from, inMigration: true });
    }
    expect((migration.match(/\('shipping-container-in-/g) ?? []).length).toBe(6);
  });

  it("no internal link in the source tree still points at an old URL", () => {
    const allowed = new Set([join(ROOT, "src/data/productSlugRenames.ts"), join(ROOT, "src/data/productSlugRenames.test.ts")]);
    const files = [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "app"))].filter((f) => !allowed.has(f));
    for (const r of PRODUCT_SLUG_RENAMES) {
      const linkLike = new RegExp(`["'\`]/products/${r.from}["'\`#?]`);
      const hits = files.filter((f) => linkLike.test(readFileSync(f, "utf8")));
      expect({ from: r.from, hits }).toEqual({ from: r.from, hits: [] });
    }
  });
});
