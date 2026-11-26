import { describe, it, expect } from "vitest";

import { buildProductPageMetadata } from "./productPageMeta";
import { products, getProductDetailPath } from "@/data/products";
import { getCommerce } from "@/data/productCommerce";

/**
 * PRODUCT INDEXING GUARD — every catalogue product page must stay indexable, self-canonical at the
 * URL that actually serves it, and distinct from every other product page.
 *
 * The 2026-11-25 product SEO audit found all 47 product pages healthy in production (200, index,
 * self-canonical, unique title/description/H1). These checks make that state a build gate, so a
 * future data edit cannot quietly:
 *   • point a canonical at a redirecting flat URL (a product child lives at /products/<parent>/<child>),
 *   • ship a noindex on a sellable page,
 *   • give two products the same <title>, meta description or H1 — the duplicate signal that splits
 *     rankings between sibling pages (owner rule: no keyword cannibalisation).
 * Deploy-time stale heads (cached 404 / noindex after a legacy deploy) are a runtime problem covered
 * by the ISR guard and verify-release SEO checks (PR #328), not by this static test.
 */

const SITE = "https://portableofficecabin.com";

const pages = products.map((product) => {
  const path = getProductDetailPath(product);
  const meta = buildProductPageMetadata(product, path);
  const title =
    typeof meta.title === "string"
      ? meta.title
      : meta.title && typeof meta.title === "object" && "absolute" in meta.title
        ? String(meta.title.absolute)
        : "";
  const h1 = getCommerce(product.id)?.h1Title || product.name;
  return { id: product.id, path, meta, title, description: String(meta.description ?? ""), h1 };
});

describe("product page indexing guard", () => {
  it("covers every catalogue product", () => {
    expect(pages.length).toBe(products.length);
    expect(pages.length).toBeGreaterThan(40);
  });

  it("every product page is indexable and followable", () => {
    for (const p of pages) {
      const robots = p.meta.robots as { index?: boolean; follow?: boolean } | undefined;
      expect({ path: p.path, index: robots?.index, follow: robots?.follow }).toEqual({ path: p.path, index: true, follow: true });
    }
  });

  it("every canonical is the page's own clean URL, and og:url agrees", () => {
    for (const p of pages) {
      const canonical = String(p.meta.alternates?.canonical ?? "");
      expect({ path: p.path, canonical }).toEqual({ path: p.path, canonical: `${SITE}${p.path}` });
      expect(canonical).not.toMatch(/\?|#|\.html$|\/$/);
      const ogUrl = String((p.meta.openGraph as { url?: string } | undefined)?.url ?? "");
      expect({ path: p.path, ogUrl }).toEqual({ path: p.path, ogUrl: canonical });
    }
  });

  it("a product child canonicalises to its nested URL, never the flat redirecting slug", () => {
    const children = products.filter((p) => p.parentSlug);
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(getProductDetailPath(child).startsWith(`/products/${child.parentSlug}/`)).toBe(true);
    }
  });

  it("titles, meta descriptions and H1s are non-empty and unique across product pages", () => {
    for (const field of ["title", "description", "h1"] as const) {
      const seen = new Map<string, string>();
      for (const p of pages) {
        const value = p[field].trim();
        expect({ path: p.path, field, empty: value.length === 0 }).toEqual({ path: p.path, field, empty: false });
        const clash = seen.get(value.toLowerCase());
        expect({ field, value, clash: clash ?? null }).toEqual({ field, value, clash: null });
        seen.set(value.toLowerCase(), p.path);
      }
    }
  });
});
