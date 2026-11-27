import type { CityPage, CityPageInlineLink } from "@/data/cityPages";

/**
 * CITY PAGE → MAIN PRODUCT PAGE — one contextual link per city page, up the SEO hierarchy
 * (Homepage → category → main product → size variant; a city page targets its product × place
 * keyword and points UP to the product page that owns the product keyword).
 *
 * The 2026-11-25 product SEO audit found 54 city pages with no link to their product family's main
 * page — all 30 container-office pages (they linked only the category), 19 of 28 portable-cabin
 * pages, 2 shipping-container pages, 2 "Portable Cabins (Porta Cabins)" pages and the PUF-panel page.
 *
 * HOW IT RENDERS: the city template calls cityMainProductLink(page) and renders the result as one
 * inline-link paragraph straight before the FAQs. It returns undefined — so the page is unchanged,
 * byte for byte — when:
 *   • the slug matches no family rule (construction, contractor and any future unmapped page), or
 *   • the page ALREADY links the family's main product anywhere in its own data (intro, sections,
 *     solutions, related links, nearby links, CTA links …). Every link the city template renders to a
 *     /products/ page comes from the entry's data — the template's fixed links and the nearby blocks
 *     only point at categories and sibling city pages — so a walk over the entry finds them all.
 *
 * WHAT IT NEVER DOES: change a page's title, description, H1, keywords, place targeting or existing
 * copy; add a ₹ figure (city pages carry none); add a second link to a product the page already links.
 *
 * Anchors are descriptive and vary between pages of one family (picked by a stable hash of the slug),
 * so 30 container-office pages do not all send one identical anchor.
 */

interface AnchorVariant {
  before: string;
  label: string;
  after: string;
  /**
   * Overrides the rule's href for this anchor only — used where the WORDING points somewhere else in
   * the family (owner 2026-11-27: "browse models / prices" wording → the category; "specifications"
   * wording → the types page).
   */
  href?: string;
}

interface MainProductRule {
  /** Matched against the city page slug, first rule wins. */
  match: RegExp;
  /** Canonical path of the family's main product page. */
  href: string;
  variants: AnchorVariant[];
}

export const CITY_MAIN_PRODUCT_RULES: MainProductRule[] = [
  {
    match: /^portable-toilet/,
    href: "/products/portable-toilet-cabin",
    variants: [
      { before: "Unit types, fittings and sizes for the whole range are on our", label: "portable toilet types and specifications", after: " page." },
      { before: "To compare single units, blocks and fittings, see the", label: "portable toilet cabin range", after: ".", href: "/products/category/portable-toilet-cabins" },
    ],
  },
  {
    match: /^portable-security-cabin-/,
    href: "/products/security-cabin",
    variants: [
      { before: "Sizes, insulation options and the standard build are set out on our", label: "security cabin", after: " page." },
      { before: "For the standard specification and online price, see the", label: "MS security cabin", after: " page." },
    ],
  },
  {
    match: /^labour-/,
    href: "/products/labour-colony",
    variants: [
      { before: "Block layouts, floors and capacities are explained on our", label: "prefabricated labour colony", after: " page." },
    ],
  },
  {
    match: /^portable-marketing-office-/,
    href: "/products/marketing-office",
    variants: [
      { before: "The standard layout and specification are on our", label: "marketing office", after: " page." },
    ],
  },
  {
    match: /^portable-office-cabin-/,
    href: "/products/office-portable-cabin",
    variants: [
      { before: "The standard build and online price are on our", label: "office portable cabin", after: " page." },
    ],
  },
  {
    match: /^portable-shop-/,
    href: "/products/portable-shop-cabin",
    variants: [
      { before: "The standard model, with its glass front and online price, is on our", label: "portable shop cabin", after: " page." },
      { before: "To order the standard size online, see the", label: "10 ft × 10 ft portable shop cabin", after: "." },
    ],
  },
  {
    match: /^puf-panel-cabin-/,
    href: "/products/cabin-portable",
    variants: [
      { before: "Panel thicknesses and the standard build are on our", label: "sandwich panel portable cabin", after: " page." },
    ],
  },
  {
    match: /^porta-cabin-/,
    href: "/products/porta-cabin",
    variants: [
      { before: "Our standard model, with its full specification and online price, is on the", label: "porta cabin", after: " page." },
      { before: "To see the specification of a standard unit, visit our", label: "40 ft × 12 ft porta cabin", after: " page." },
    ],
  },
  {
    match: /^portable-cabin-/,
    href: "/products/portable-cabin",
    variants: [
      { before: "Sizes, specifications and prices for the full range are on our", label: "portable cabin overview", after: " page." },
      { before: "To compare the standard sizes side by side, see the", label: "portable cabin sizes and specifications", after: " page." },
      { before: "Not sure which size you need? Our", label: "portable cabin range", after: " page compares the standard models." },
    ],
  },
  {
    match: /^shipping-container/,
    href: "/products/shipping-container-for-sale",
    variants: [
      { before: "The standard unit we sell online is the", label: "20 ft GP shipping container", after: ", with its full specification and price." },
      { before: "To buy a standard container outright, see our", label: "shipping container for sale", after: " page." },
    ],
  },
  {
    match: /^(portable-)?container-office/,
    href: "/products/container-office",
    variants: [
      { before: "To compare a ready-made model, our", label: "container office", after: " page lists the full specification, photos and online price." },
      { before: "For a standard unit you can order online, see the", label: "25 ft × 14 ft container office", after: " and its specification." },
      { before: "The", label: "standard container office", after: " page shows a ready-made model with its specification and price." },
    ],
  },
];

/** Every `href` string anywhere in a city page entry (all of its contextual, related, nearby and CTA links). */
export function cityPageHrefs(page: CityPage): Set<string> {
  const out = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === "object") {
      for (const [key, v] of Object.entries(value)) {
        if (key === "href" && typeof v === "string") out.add(v.replace(/[?#].*$/, "").replace(/\/$/, ""));
        else walk(v);
      }
    }
  };
  walk(page);
  return out;
}

/** The family rule a city page belongs to, by slug; undefined for unmapped pages. */
export function cityMainProductRule(slug: string): MainProductRule | undefined {
  return CITY_MAIN_PRODUCT_RULES.find((rule) => rule.match.test(slug));
}

/** Stable, deterministic choice among a family's anchor variants. */
function variantFor(slug: string, count: number): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % count;
}

/**
 * The inline link to render before a city page's FAQs, or undefined when the page has no mapped
 * family or already links its family's main product page.
 */
export function cityMainProductLink(page: CityPage): CityPageInlineLink | undefined {
  const rule = cityMainProductRule(page.slug);
  if (!rule) return undefined;
  const v = rule.variants[variantFor(page.slug, rule.variants.length)];
  const href = v.href ?? rule.href;
  const hrefs = cityPageHrefs(page);
  if (hrefs.has(rule.href) || hrefs.has(href)) return undefined;
  return { before: v.before, link: { label: v.label, href }, after: v.after };
}
