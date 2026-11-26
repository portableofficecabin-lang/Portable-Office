import { describe, it, expect } from "vitest";

import { CATEGORY_META, DESCRIPTION_MAX, LAYOUT_TITLE_SUFFIX, TITLE_MAX, defaultCategoryTitle } from "./categoryMeta";
import { categories, products } from "./products";
import { productChildGroups } from "./productChildPages";

/**
 * Search-result fit for the product-scope titles this repo composes by hand: category pages and the
 * product guide children. (Product page titles are the Merchant feed titles — protected, not here.)
 */

// Container Offices renders CONTAINER_OFFICES_META.absoluteTitle in its route (55 chars, no suffix);
// its CATEGORY_META entry is a fallback that the route never reaches.
const ABSOLUTE_TITLE_CATEGORIES = new Set(["container-offices"]);

const rendered = (title: string) => `${title}${LAYOUT_TITLE_SUFFIX}`;

describe("category metadata", () => {
  const effective = categories
    .filter((c) => !ABSOLUTE_TITLE_CATEGORIES.has(c.slug))
    .map((c) => {
      const count = products.filter((p) => p.categorySlug === c.slug).length;
      return { slug: c.slug, count, title: CATEGORY_META[c.slug]?.title ?? defaultCategoryTitle(c.name, count) };
    });

  it(`every category <title> fits in ${TITLE_MAX} characters with the brand suffix`, () => {
    for (const { slug, title } of effective) {
      const len = rendered(title).length;
      expect({ slug, title, fits: len <= TITLE_MAX }).toEqual({ slug, title, fits: true });
    }
  });

  it("category titles are unique", () => {
    const titles = effective.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("an empty category does not promise models or prices", () => {
    for (const { slug, count, title } of effective) {
      if (count === 0) expect({ slug, promises: /model|price/i.test(title) }).toEqual({ slug, promises: false });
    }
  });

  it("override descriptions fit, and carry no typed price or unverified credential", () => {
    for (const [slug, meta] of Object.entries(CATEGORY_META)) {
      // Container Offices' route computes its description (containerOfficesMetaDescription).
      if (!meta.description || ABSOLUTE_TITLE_CATEGORIES.has(slug)) continue;
      const d = meta.description;
      expect({ slug, len: d.length >= 70 && d.length <= DESCRIPTION_MAX }).toEqual({ slug, len: true });
      expect({ slug, bad: /₹|lakh|ISO\s?9001|years'? (of )?experience|\d+\+ years/i.test(d) }).toEqual({ slug, bad: false });
    }
  });
});

describe("product guide (child page) metadata", () => {
  const pages = productChildGroups.flatMap((g) => g.children.map((p) => ({ parent: g.parentSlug, ...p })));

  it(`every guide <title> fits in ${TITLE_MAX} characters with the brand suffix`, () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect({ slug: p.slug, fits: rendered(p.title).length <= TITLE_MAX }).toEqual({ slug: p.slug, fits: true });
    }
  });

  it(`every guide meta description fits in ${DESCRIPTION_MAX} characters`, () => {
    for (const p of pages) {
      expect({ slug: p.slug, fits: p.metaDescription.length <= DESCRIPTION_MAX }).toEqual({ slug: p.slug, fits: true });
    }
  });
});
