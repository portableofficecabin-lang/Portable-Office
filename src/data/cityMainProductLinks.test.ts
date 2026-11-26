import { describe, it, expect } from "vitest";

import { CITY_PAGES } from "./cityPages";
import { products, getProductDetailPath } from "./products";
import {
  CITY_MAIN_PRODUCT_RULES,
  cityMainProductLink,
  cityMainProductRule,
  cityPageHrefs,
} from "./cityMainProductLinks";

/** Dedicated product landing routes that are not catalogue entries (app/(site)/products/<route>/page.tsx). */
const STATIC_PRODUCT_ROUTES = new Set(["/products/portable-cabin", "/products/portable-toilet-cabin", "/products/metal-portable-cabin"]);
const productPaths = new Set(products.map((p) => getProductDetailPath(p)));

describe("city page → main product link", () => {
  it("every rule points at a live product page", () => {
    for (const rule of CITY_MAIN_PRODUCT_RULES) {
      const live = productPaths.has(rule.href) || STATIC_PRODUCT_ROUTES.has(rule.href);
      expect({ href: rule.href, live }).toEqual({ href: rule.href, live: true });
      expect(rule.variants.length).toBeGreaterThan(0);
    }
  });

  it("adds a link only when the page does not already link its main product", () => {
    for (const page of CITY_PAGES) {
      const rule = cityMainProductRule(page.slug);
      const link = cityMainProductLink(page);
      if (!rule) {
        expect({ slug: page.slug, link }).toEqual({ slug: page.slug, link: undefined });
        continue;
      }
      const already = cityPageHrefs(page).has(rule.href);
      expect({ slug: page.slug, adds: !!link }).toEqual({ slug: page.slug, adds: !already });
      if (link) expect(link.link.href).toBe(rule.href);
    }
  });

  it("after this change every mapped city page reaches its main product page", () => {
    const mapped = CITY_PAGES.filter((page) => cityMainProductRule(page.slug));
    expect(mapped.length).toBeGreaterThan(100);
    for (const page of mapped) {
      const rule = cityMainProductRule(page.slug)!;
      const reaches = cityPageHrefs(page).has(rule.href) || cityMainProductLink(page)?.link.href === rule.href;
      expect({ slug: page.slug, reaches }).toEqual({ slug: page.slug, reaches: true });
    }
  });

  it("anchors carry no price, year or place name, and big families vary their anchors", () => {
    for (const rule of CITY_MAIN_PRODUCT_RULES) {
      for (const v of rule.variants) {
        const text = `${v.before} ${v.label}${v.after}`;
        expect({ text, bad: /₹|\b(19|20)\d{2}\b|lakh/i.test(text) }).toEqual({ text, bad: false });
        // The place keyword stays on the city page: no city or district name in a shared anchor.
        expect({ text, place: /Bengaluru|Bangalore|Chennai|Hosur|Krishnagiri|Karnataka|Tamil Nadu|India/.test(text) }).toEqual({ text, place: false });
      }
    }
    const added = new Map<string, Set<string>>();
    for (const page of CITY_PAGES) {
      const link = cityMainProductLink(page);
      if (!link) continue;
      if (!added.has(link.link.href)) added.set(link.link.href, new Set());
      added.get(link.link.href)!.add(link.link.label);
    }
    for (const [href, labels] of added) {
      const count = CITY_PAGES.filter((p) => cityMainProductLink(p)?.link.href === href).length;
      if (count >= 5) expect({ href, distinctAnchors: labels.size >= 2 }).toEqual({ href, distinctAnchors: true });
    }
  });

  it("the city-page href walk sees links in nested sections", () => {
    const page = CITY_PAGES.find((p) => (p.extraSections ?? []).some((s) => (s.inlineLinks ?? []).length > 0));
    expect(page).toBeDefined();
    const nested = page!.extraSections!.flatMap((s) => (s.inlineLinks ?? []).map((il) => il.link.href));
    const hrefs = cityPageHrefs(page!);
    for (const h of nested) expect(hrefs.has(h.replace(/[?#].*$/, "").replace(/\/$/, ""))).toBe(true);
  });
});
