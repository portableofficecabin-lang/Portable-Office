/**
 * SITE-OFFICE PAIR: each product's OWN buyer section (owner request, 27 Nov 2026).
 *
 * /products/container-site-office (id 42, the 40 ft × 10 ft office with 15 workstations) and
 * /products/standard-site-office-container (id 2, the 20 ft × 8 ft Corten unit) are different
 * products. Both render the same long SiteOfficeContainerContent guide (the ProductDetailServer
 * fallback for site-office products without content of their own), so 77% of their text was
 * identical in the site inventory of 56143e7, and neither page said much about its own unit below
 * the specification table. Each page now gets a section about its own unit, placed directly under
 * that table. Where the shared guide belongs is a separate decision, to be made from Search Console
 * data; until then it still renders on both pages, and `guideNote` (shown only while it does) tells
 * the reader that the guide covers every size and option, not this unit.
 *
 * SOURCING RULE: every line restates the product's own catalogue record in src/data/products.ts
 * (specifications, features, description). Each item lists the exact `facts` it rests on;
 * siteOfficeOwnSections.test.ts fails if a fact is missing from the line or from the record.
 * Never here: a ₹ figure (the price box is the page's only price, and both pages are Merchant
 * landing pages), a year, a warranty period, a certification, a project or customer claim, or a
 * performance figure. Both URLs and every Merchant field are untouched: nothing in products.ts or
 * productCommerce.ts changes, so the feed and the product structured data cannot change.
 *
 * Deliberately NOT restated for the 20 ft unit: "Can stack two high if needed" (a structural claim)
 * and "We've delivered hundreds of these" (a delivery-volume claim). Neither is verified.
 */

export interface OwnSectionItem {
  text: string;
  /** Substrings of `text` that also appear, case-insensitively, in the product's catalogue record. */
  facts: string[];
}

export interface OwnSectionGroup {
  /** Omitted when the section is a single short list. */
  heading?: string;
  items: OwnSectionItem[];
}

export interface OwnSectionLink {
  before: string;
  link: { href: string; label: string };
  after: string;
  /** Facts the sentence states about the LINKED product, checked against that product's record. */
  facts?: string[];
}

export interface SiteOfficeOwnSection {
  /** Static catalogue id (the commerce identity key) of the ONE product this section renders on. */
  productId: string;
  heading: string;
  /** Shown only while the shared site-office guide still renders further down the same page. */
  guideNote: string;
  intro: OwnSectionItem;
  groups: OwnSectionGroup[];
  /** Closing paragraphs, one link each. */
  links: OwnSectionLink[];
}

export const SITE_OFFICE_OWN_SECTIONS: SiteOfficeOwnSection[] = [
  {
    // 40 ft × 10 ft Container Site Office: its verified layout and fittings.
    productId: "42",
    heading: "Inside the 40 ft × 10 ft Container Site Office",
    guideNote:
      "The buying guide further down this page covers every size and option we build. This section is about this office only.",
    intro: {
      text: "It comes fully fitted from the factory, and the layout can be customised on request.",
      facts: ["fully fitted from the factory", "layout can be customised on request"],
    },
    groups: [
      {
        heading: "Workstations and seating",
        items: [
          {
            text: "15 workstation tables, each with its own overhead file cabinet for drawings, bills and registers",
            facts: ["15 workstation tables, each with its own overhead file cabinet for drawings, bills and registers"],
          },
          {
            text: "15 revolving chairs, so engineers, supervisors and admin staff each have a seat",
            facts: ["15 revolving chairs", "engineers, supervisors and admin staff"],
          },
          {
            text: "A half-portion partition that works as a project manager's cabin or a small meeting room for private discussions",
            facts: ["half-portion partition", "project manager's cabin or a small meeting room for private discussions"],
          },
        ],
      },
      {
        heading: "Power and air conditioning",
        items: [
          {
            text: "2 sockets and 5A switches at every workstation, for laptops, chargers and desk equipment",
            facts: ["2 sockets and 5A switches at every workstation", "laptops, chargers and desk equipment"],
          },
          {
            text: "Provision for 2 air conditioners, with the openings and electrical points ready",
            facts: ["Provision for 2 air conditioners", "openings and electrical points ready"],
          },
          {
            text: "Complete internal wiring done at the factory, so only the main power connection is needed at site",
            facts: ["Complete internal wiring done at the factory", "only the main power connection is needed at site"],
          },
        ],
      },
      {
        heading: "At your site",
        items: [
          {
            text: "No foundation work: only a simple levelled surface is needed at site",
            facts: ["no foundation work", "simple levelled surface is needed at site"],
          },
          {
            text: "Craneable: the whole unit lifts onto a truck and shifts with the project when it moves to a new location",
            facts: ["Craneable", "lifts onto a truck and shifts with the project", "moves to a new location"],
          },
        ],
      },
    ],
    links: [
      {
        before: "For a smaller crew, the",
        link: { href: "/products/standard-site-office-container", label: "20 ft × 8 ft Standard Site Office Container" },
        after: " is the compact unit in the same range.",
      },
      {
        before: "To compare every model and its price, see",
        link: { href: "/products/category/site-office-containers", label: "all site office containers" },
        after: ".",
      },
    ],
  },
  {
    // 20 ft × 8 ft Standard Site Office Container: kept to its own specification.
    productId: "2",
    heading: "The 20 ft × 8 ft unit on this page",
    guideNote:
      "The buying guide further down this page covers every size and option we build. The unit sold here is the one in the Specifications table above.",
    intro: {
      text: "A compact site office built from shipping container steel:",
      facts: ["built from shipping container steel"],
    },
    groups: [
      {
        items: [
          { text: "20ft x 8ft x 8.5ft, with 160 sq ft of floor area", facts: ["20ft x 8ft x 8.5ft", "160 sq ft"] },
          { text: "Corten Steel frame with Rockwool 50mm insulation", facts: ["Corten Steel", "Rockwool 50mm"] },
          { text: "Steel security door and 2x reinforced glass windows", facts: ["Steel security door", "2x reinforced glass"] },
          { text: "Wiring done and ready", facts: ["Wiring done and ready"] },
          { text: "Forklift pockets for easy moving", facts: ["Forklift pockets for easy moving"] },
        ],
      },
    ],
    links: [
      {
        before: "Need desks for a larger site team? The",
        link: { href: "/products/container-site-office", label: "40 ft × 10 ft Container Site Office" },
        after: " comes fitted with 15 workstation tables and a manager's cabin.",
        facts: ["15 workstation tables", "manager's cabin"],
      },
      {
        before: "Every site office container, with its price, is listed on the",
        link: { href: "/products/category/site-office-containers", label: "site office containers page" },
        after: ".",
      },
    ],
  },
];

export function getSiteOfficeOwnSection(productId: string): SiteOfficeOwnSection | undefined {
  return SITE_OFFICE_OWN_SECTIONS.find((s) => s.productId === productId);
}
