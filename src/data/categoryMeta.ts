/**
 * CATEGORY PAGE METADATA — /products/category/<slug> (moved out of the route file 2026-11-25 so it
 * can be tested; a Next.js page module may not export arbitrary constants).
 *
 * TITLES are sized for the search result: the rendered <title> is the title below plus the
 * 24-character " | Portable Office Cabin" suffix the root layout appends, and must stay ≤ 65
 * characters so the category keyword AND the brand both display. Before this pass 9 of 17 category
 * titles ran to 66–84 characters and were cut in the result.
 *
 * INTENT MAP (keep categories from competing with their own children and the home page):
 *   home page            → "portable office cabin / portable cabin manufacturer" (brand + maker)
 *   category pages        → the RANGE: compare models, sizes and prices        ← these titles
 *   /products/portable-cabin hub → portable cabin sizes, specifications and prices of the range
 *   product pages         → one exact model (their <title> is the Merchant feed title — not here)
 * So no category title claims "manufacturer" any more except Container Offices, whose
 * manufacturer landing page was built for that query (CONTAINER_OFFICES_META in the route).
 *
 * DESCRIPTIONS: every claim backed by the catalogue; NO hand-typed ₹ figure (it drifts when a price
 * changes) and NO unverified credential (the "ISO 9001 manufacturer" / "15+ years' experience"
 * lines are gone — the ISO certificate has not been produced, see the 2026-11-22 audit).
 * `description` is optional: a title-only override keeps the computed landing description.
 *
 * src/data/categoryMeta.test.ts enforces the length limits.
 */

export const LAYOUT_TITLE_SUFFIX = " | Portable Office Cabin";
export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 160;

export interface CategoryMetaOverride {
  title: string;
  description?: string;
  keywords?: string;
}

export const CATEGORY_META: Record<string, CategoryMetaOverride> = {
  /* Container Offices renders CONTAINER_OFFICES_META (absolute title) in the route; this entry is
     the fallback only and is kept as it was. */
  "container-offices": {
    title: "Container Office Manufacturer in India — Prices & Sizes",
    description:
      "Explore container office cabins in custom sizes with MS steel construction, insulation, electrical fittings and flexible layouts. Request a factory-direct quote.",
    keywords:
      "container office, container office manufacturer, container office price, " +
      "container office cabin, portable container office, container office India",
  },
  /* Was "Portable Cabins in India — Prices, Sizes & Manufacturer" (79 rendered) with a 172-char
     description quoting "from ₹2.36 lakh", "ISO 9001 manufacturer" and "15+ years' experience". */
  "portable-cabins": {
    title: "Portable Cabins — Models, Sizes & Prices",
    description:
      "Factory-built portable cabins in MS and PUF: site offices, bunkhouses, staff housing, shop and cafe cabins. Compare models, sizes and GST-inclusive prices.",
    keywords:
      "portable cabins, portable cabin price, porta cabin, portable office cabin, "
      + "prefabricated portable cabin, MS portable cabin, 20ft portable cabin, 40ft portable cabin bunkhouse",
  },
  /* HOME CONSTRUCTION — a HUB, not a competitor (rewritten 2026-09-07). Its job is to ROUTE, so the
     title and description avoid the head terms its own children compete for. Description trimmed
     from 173 to ≤ 160 characters on 2026-11-25; wording otherwise unchanged. */
  "home-construction": {
    title: "Home Construction Services in Bangalore",
    description:
      "RCC houses built on your own plot in Bangalore and Hosur. Find contractor services, what a build includes and what it costs, or the area you are building in.",
    keywords:
      "home construction services, house construction company, RCC house construction, "
      + "home construction Bangalore Hosur, house building services",
  },
  /* Was "Prefab Buildings — Panel-Built Structures, Made to Your Plan" (84 rendered) with a
     213-char description that included "ISO 9001 manufacturer". */
  "prefab-building": {
    title: "Prefab Buildings Made to Your Plan",
    description:
      "Prefab buildings made to your floor plan: insulated panels, a steel truss roof and clear-span widths for sales galleries, offices and multi-storey blocks.",
    keywords:
      "prefab building, prefabricated building manufacturer, prefab building system, "
      + "panel built structure, prefab office building, prefab sales gallery, "
      + "prefab marketing office, modular building India",
  },
  /* Title-only overrides: the computed landing description stays. */
  "cargo-storage-shipping-containers": { title: "Shipping & Storage Containers for Sale" }, // was 84 rendered
  "g1-workmen-accommodation": { title: "G+1 Workmen Accommodation Blocks" }, // was 74 rendered
};

/**
 * The <title> (before the layout suffix) of a category WITHOUT an override.
 * A category with products: "<name> — Models & Prices" (was "— Models, Specs & Prices", 66–75
 * rendered for the longer names). An EMPTY category has no models or prices to show, so it no
 * longer promises them: "<name> — Get a Quote". Index status is unchanged either way (owner
 * decision 2026-10-13: empty categories stay indexed until their Search Console data is reviewed).
 */
export function defaultCategoryTitle(name: string, productCount: number): string {
  return productCount > 0 ? `${name} — Models & Prices` : `${name} — Get a Quote`;
}
