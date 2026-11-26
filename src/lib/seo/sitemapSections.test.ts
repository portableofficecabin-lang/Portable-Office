import { describe, it, expect } from "vitest";
import {
  SITEMAP_SECTIONS,
  SITE_URL,
  sectionPath,
  sitemapIndexXml,
  sitemapSectionFor,
  splitSitemap,
  urlsetXml,
} from "./sitemapSections";
import { CITY_PAGES } from "@/data/cityPages";
import { seoPromotions } from "@/data/seoPromotions";
import { categories, products, getProductDetailPath } from "@/data/products";
import { stripComments, blockHashes } from "./cityBlocks";
import { cityContentHash, cityLastModified } from "./cityLastmod";
import manifest from "@/data/sitemapLastmod.json";

/**
 * The per-type sitemaps (/sitemap-index.xml → /sitemaps/<section>.xml) are cut from the same
 * entries as /sitemap.xml. These lock: every real URL shape lands in the section Search Console
 * should report it under, each URL in exactly one section, and well-formed XML.
 */

describe("sitemapSectionFor — every page type lands in its own sitemap", () => {
  it("city pages → cities", () => {
    for (const c of CITY_PAGES) expect(sitemapSectionFor(`${SITE_URL}/cities-we-serve/${c.slug}`)).toBe("cities");
  });
  it("promotions → promotions", () => {
    for (const p of seoPromotions) expect(sitemapSectionFor(p.canonicalUrl)).toBe("promotions");
  });
  it("category pages → categories", () => {
    for (const c of categories) expect(sitemapSectionFor(`${SITE_URL}/products/category/${c.slug}`)).toBe("categories");
  });
  it("product detail pages, size variants and child guides → products", () => {
    for (const p of products) expect(sitemapSectionFor(`${SITE_URL}${getProductDetailPath(p)}`)).toBe("products");
    expect(sitemapSectionFor(`${SITE_URL}/products/container-office/20x10-ft`)).toBe("products");
    expect(sitemapSectionFor(`${SITE_URL}/products/portable-cabin/price-and-cost-guide`)).toBe("products");
    expect(sitemapSectionFor(`${SITE_URL}/products/home-construction/building-construction-contractor`)).toBe("products");
  });
  it("blog posts → blog", () => {
    expect(sitemapSectionFor(`${SITE_URL}/blog/porta-cabins-on-rent`)).toBe("blog");
  });
  it("buying guides at /guides/<slug> → guides (D5, #345)", () => {
    expect(sitemapSectionFor(`${SITE_URL}/guides/portable-cabin-price-and-cost`)).toBe("guides");
  });
  it("hubs and company pages → pages", () => {
    for (const p of ["/", "/products", "/blog", "/cities-we-serve", "/promotions", "/guides", "/about-us", "/contact", "/marketplace", "/warranty"]) {
      expect(sitemapSectionFor(`${SITE_URL}${p === "/" ? "" : p}`)).toBe("pages");
    }
  });
});

describe("splitSitemap — a partition, nothing lost or doubled", () => {
  it("puts each entry in exactly one section", () => {
    const urls = [
      ...CITY_PAGES.map((c) => `${SITE_URL}/cities-we-serve/${c.slug}`),
      ...seoPromotions.map((p) => p.canonicalUrl),
      ...categories.map((c) => `${SITE_URL}/products/category/${c.slug}`),
      ...products.map((p) => `${SITE_URL}${getProductDetailPath(p)}`),
      `${SITE_URL}/blog/porta-cabins-on-rent`,
      SITE_URL,
    ];
    const parts = splitSitemap(urls.map((url) => ({ url })));
    const total = SITEMAP_SECTIONS.reduce((n, s) => n + parts[s].length, 0);
    expect(total).toBe(urls.length);
    expect(parts.cities.length).toBe(CITY_PAGES.length);
    expect(parts.promotions.length).toBe(seoPromotions.length);
  });
});

describe("XML", () => {
  it("index lists every section file on the canonical host by default", () => {
    const xml = sitemapIndexXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const s of SITEMAP_SECTIONS) expect(xml).toContain(`<loc>${SITE_URL}${sectionPath(s)}</loc>`);
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(SITEMAP_SECTIONS.length);
  });
  it("index lists only the sections it is given (the route passes the non-empty ones)", () => {
    const xml = sitemapIndexXml(["pages", "cities"]);
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(2);
    expect(xml).not.toContain(sectionPath("guides"));
  });
  it("urlset escapes XML, keeps a bare date string and omits absent fields", () => {
    const xml = urlsetXml([
      { url: `${SITE_URL}/a?x=1&y=2`, lastModified: "2026-11-25T20:55:37+05:30", changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/b` },
    ]);
    expect(xml).toContain("<loc>https://portableofficecabin.com/a?x=1&amp;y=2</loc>");
    expect(xml).toContain("<lastmod>2026-11-25T20:55:37+05:30</lastmod>");
    expect(xml).toContain("<changefreq>monthly</changefreq>");
    expect(xml).toContain("<priority>0.6</priority>");
    expect(xml).toContain("<url>\n<loc>https://portableofficecabin.com/b</loc>\n</url>");
  });
});

describe("city lastmod — honest or absent", () => {
  const m = (manifest as { cities: Record<string, { lastmod: string; sha: string }> }).cities;
  it("manifest dates are real timestamps, not in the future, and hashes are well-formed", () => {
    for (const e of Object.values(m)) {
      const t = Date.parse(e.lastmod);
      expect(Number.isNaN(t)).toBe(false);
      expect(t).toBeLessThanOrEqual(Date.now() + 24 * 3600 * 1000);
      expect(t).toBeGreaterThan(Date.parse("2026-01-01T00:00:00Z"));
      expect(/^[0-9a-f]{16}$/.test(e.sha)).toBe(true);
    }
  });
  it("emits the date while the page is unchanged, and withholds it once the page changes", () => {
    const page = CITY_PAGES.find((c) => c.slug in m && cityContentHash(c) === m[c.slug].sha);
    if (!page) return; // every page edited since the last `npm run seo:lastmod`: nothing to assert
    expect(cityLastModified(page)).toBe(m[page.slug].lastmod);
    const edited = { ...page, tagline: `${page.tagline} (edited)` };
    expect(cityLastModified(edited)).toBeUndefined();
    expect(cityLastModified({ ...page, slug: "not-in-the-manifest" })).toBeUndefined();
  });
});

describe("cityBlocks — comments and whitespace are not content", () => {
  it("strips comments but never inside strings", () => {
    const src = `const a = "https://x.com/a"; // note\n/* block */ const b = 'it\\'s // fine';`;
    expect(stripComments(src)).toBe(`const a = "https://x.com/a"; \n const b = 'it\\'s // fine';`);
  });
  it("hashes each page block; a comment edit keeps the hash, a copy edit changes it", () => {
    const file = (tagline: string, comment = "") =>
      `export const CITY_PAGES: CityPage[] = [\n  {\n    slug: "a",\n    // ${comment}\n    tagline: "${tagline}",\n  },\n  {\n    slug: "b",\n    tagline: "B",\n  },\n];\n`;
    const base = blockHashes(file("A"));
    expect([...base.keys()]).toEqual(["a", "b"]);
    expect(blockHashes(file("A", "a new note")).get("a")).toBe(base.get("a"));
    expect(blockHashes(file("A changed")).get("a")).not.toBe(base.get("a"));
    expect(blockHashes(file("A changed")).get("b")).toBe(base.get("b"));
    expect(blockHashes("no array here").size).toBe(0);
  });
});
