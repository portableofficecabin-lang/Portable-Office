/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  PRODUCT FAMILIES + STANDARD SIZE VARIANTS — the ONE authoritative source.
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * A FAMILY is one genuinely distinct physical product (its own material, construction,
 * fire rating, layout or specification). A VARIANT is one STANDARD SIZE of that family.
 * Every variant gets its own crawlable, indexable URL:
 *
 *      /products/<family.slug>/<variant.sizeSlug>
 *
 * Everything downstream reads from HERE and therefore cannot disagree with it:
 *   • the variant landing page (H1, size selector, price, availability, specs)
 *   • <title> / meta description / rel=canonical
 *   • the ProductGroup + Product + Offer JSON-LD
 *   • the Google Merchant Center feed (one item per ELIGIBLE variant, one item_group_id)
 *   • the cart, the checkout and the Razorpay amount
 *   • the XML sitemap
 *
 * ── THE DUPLICATION RULE (read before adding anything) ──────────────────────────────
 * "Container Office", "Site Office Container", "Portable Office Cabin" and "Porta Office"
 * are SEARCH SYNONYMS for the same physical cabin. They belong in `searchAliases` — used
 * naturally in visible copy and FAQs — and NOWHERE else. They must NEVER become:
 *   • a second family,
 *   • a second product-group id,
 *   • a second SEO page, or
 *   • a second Merchant Center record.
 * A new family is justified ONLY by a real difference: MS vs GI vs fire-rated shell, a
 * different layout (with toilet), a different storey count, a different specification.
 *
 * ── THE TWO GATES (identical in spirit to src/data/productCommerce.ts) ───────────────
 *   1. `published`      — does this size have a real, working landing page at all?
 *                         false ⇒ NOT prerendered ⇒ the URL returns a genuine 404.
 *   2. `priceConfirmed` — has the owner verified a REAL, FIXED, payable base price?
 *                         false ⇒ no price shown, no Add to Cart, no JSON-LD Offer, and
 *                         no Merchant feed row. The page stays a normal indexable page.
 *
 * Nothing here is ever invented. A size with no owner-confirmed price is published with
 * `basePricePaise: undefined` and `priceConfirmed: false`; the moment the owner supplies
 * the figure, the price block, the cart CTAs, the Offer and the feed row all switch on
 * automatically, because every one of them reads those same two fields.
 *
 * ── MONEY ────────────────────────────────────────────────────────────────────────────
 * Base prices are stored as INTEGER PAISE, exclusive of GST — an exact, decimal-safe
 * integer, never a float. They are converted to whole rupees and put through the site's
 * single money function, sellPrice() in src/lib/pricing/gst.ts, so the variant page, the
 * cart, the checkout, the Razorpay order, the JSON-LD and the feed all land on the
 * byte-identical integer that every other SKU on this site already uses.
 */

import type { KeySpec, ProductCommerce } from "@/data/productCommerce";
import type { Product } from "@/data/products";
import { GST_RATE } from "@/lib/pricing/gst";

/** Paise per rupee. Base prices are stored in paise so no float ever touches money. */
export const PAISE_PER_RUPEE = 100;

/**
 * One STANDARD SIZE of a family.
 *
 * `lengthFt` x `widthFt` are the size's DEFINITION, not a claim, so `builtUpAreaSqFt` is
 * derived from them rather than typed in twice. `heightFt` is the family's standard
 * external height (see ProductFamily.standardHeightFt) unless a size overrides it.
 */
/**
 * The availability states a standard size may be in.
 *
 * `pre_order` is accepted here and mapped everywhere, but no size uses it today — it exists so
 * that a made-to-order size with a confirmed price and an open order book can be stated
 * honestly rather than squeezed into in/out of stock.
 */
export type VariantAvailability = "in_stock" | "out_of_stock" | "pre_order";

/** Every availability value, and the two vocabularies each one maps to. Exhaustive by type. */
const AVAILABILITY_MAP: Record<
  VariantAvailability,
  { schema: string; feed: "in_stock" | "out_of_stock" | "preorder" }
> = {
  in_stock: { schema: "https://schema.org/InStock", feed: "in_stock" },
  out_of_stock: { schema: "https://schema.org/OutOfStock", feed: "out_of_stock" },
  pre_order: { schema: "https://schema.org/PreOrder", feed: "preorder" },
};

/** Is this a supported availability value? Guards against data widened without mappings. */
export function isValidAvailability(value: string): value is VariantAvailability {
  return Object.prototype.hasOwnProperty.call(AVAILABILITY_MAP, value);
}

/** The schema.org availability URL for this size — used by the Offer node. */
export function variantSchemaAvailability(variant: SizeVariant): string {
  return AVAILABILITY_MAP[variant.availability].schema;
}

/** The Merchant Center `<g:availability>` value for this size. */
export function variantFeedAvailability(
  variant: SizeVariant,
): "in_stock" | "out_of_stock" | "preorder" {
  return AVAILABILITY_MAP[variant.availability].feed;
}

export interface SizeVariant {
  /** Stable variant ID. Also the commerce-catalog join key and the cart's product_id. */
  variantId: string;
  /** Stable SKU. Becomes <g:id> in the feed and `sku` in the JSON-LD. UNIQUE site-wide. */
  sku: string;
  /**
   * Manufacturer part number — ONLY when a genuine one exists. These are made-to-order
   * steel structures with no MPN and no GTIN, so this is deliberately undefined for every
   * variant today.
   *
   * ── THE RULE IS ABOUT THE FEED, NOT THE PAGE ────────────────────────────────────────
   * An earlier version of this comment read "Do NOT set it to the SKU", full stop, which
   * contradicted productGroupSchema.ts — that file emits `mpn: variant.mpn ?? variant.sku`.
   * Both are right, because they are talking about different places:
   *
   *   • MERCHANT FEED — emits NO <g:mpn> and declares <g:identifier_exists>no</g:identifier_exists>.
   *     Submitting an internal SKU as an MPN there would contradict that declaration and
   *     weaken product matching. Never add one unless a real MPN exists, in which case
   *     identifier_exists must go.
   *   • PAGE JSON-LD — falls back to the SKU, which is the convention every other product
   *     page already follows (see `mpn: sku` in lib/seo/structured-data.ts). schema.org
   *     makes no identifier-existence declaration to contradict.
   *
   * Set this field only when a genuine manufacturer part number exists; it is never
   * fabricated in either place.
   */
  mpn?: string;

  /** Human size, with a proper multiplication sign. Used in the H1, buttons, breadcrumb. */
  sizeLabel: string;
  /** ASCII size, for <title>, <g:size>, schema.org `size` and the spec table. */
  sizeLabelPlain: string;
  /** URL segment: /products/<family>/<sizeSlug>. Lowercase, hyphenated, stable forever. */
  sizeSlug: string;

  lengthFt: number;
  widthFt: number;
  /**
   * External height in feet — set ONLY when it has been confirmed FOR THIS SIZE.
   *
   * Left undefined, the height is omitted from this size's identity strings entirely
   * (dimensions, <title>, <g:size>, schema.org `size`) rather than back-filled from the
   * family standard. A height carried into a size's definition without being confirmed for
   * that size is an invented specification, and it would ship inside the exact strings
   * Google matches a feed item to its landing page on.
   *
   * The family's standard height is still SHOWN, clearly labelled as a family standard and
   * as unconfirmed for the size — see ProductFamily.standardHeightFt.
   */
  heightFt?: number;

  /**
   * TRUE when this size is served by the family's PARENT page rather than by its own
   * /products/<family>/<size> URL.
   *
   * One size of a family may already have a long-standing product page of its own — for the
   * Container Office Cabin that is the 25 ft x 14 ft build at /products/container-office,
   * live and owner-priced since long before the size ladder existed. It is a GENUINE size,
   * not a duplicate of the group, so it belongs in the size selector, in `hasVariant`, and
   * in the Merchant feed under the family's item_group_id like any other size.
   *
   * What changes is only WHERE it lives:
   *   • its canonical (and therefore its <g:link>) is the parent URL, self-referencing;
   *   • it is NOT prerendered as a child route — /products/<family>/<size> 301s to the parent
   *     so the guessable URL never 404s and never becomes a second copy of the same page;
   *   • it keeps its EXISTING hand-written commerce row (variantCommerceRows() skips it), so
   *     its price, SKU and identity are untouched by the family system.
   */
  rendersAtParent?: boolean;

  /**
   * BASE PRICE, EXCLUSIVE OF GST, IN INTEGER PAISE.
   *
   * `undefined` means the owner has NOT confirmed a price for this size. That is not a
   * bug and must never be filled with a guess, an interpolation from area, or a figure
   * lifted from an indicative range: an unconfirmed number presented as payable is the
   * misrepresentation that suspended this Merchant Center account once already.
   */
  basePricePaise?: number;
  /** Owner has verified basePricePaise is a real, fixed, payable price. Gate #2. */
  priceConfirmed: boolean;

  /**
   * Are we accepting orders for this size right now?
   *
   * This answers a COMMERCE question, not an SEO one. A temporarily out-of-stock size is
   * still a real product with a real page: it stays indexed and stays in the sitemap, and
   * its Offer and its feed row simply carry the matching status. Only `variantIsPurchasable`
   * — Add to Cart, the cart and Razorpay — requires `in_stock`.
   *
   * Every value here maps to exactly one schema.org status and one Merchant Center value,
   * via variantSchemaAvailability() and variantFeedAvailability(). Adding a value to this
   * union without adding both mappings is a compile error, which is the point.
   */
  availability: VariantAvailability;
  /** Manufacturing / dispatch window shown beside the CTAs. */
  leadTime: string;

  /**
   * Variant-specific photography. EMPTY until a real photograph of THIS size exists —
   * the family gallery is used instead and the variant is held out of the feed by
   * `merchantEligible: false`, because Google judges the feed image against the landing
   * page and a family photo captioned as one exact size is a misrepresentation.
   */
  mainImage?: string;
  additionalImages: string[];

  /** Rows appended to the family spec table for THIS size only. Real data only. */
  specifications: KeySpec[];
  /** What ships as standard in this size. Family-level unless a size genuinely differs. */
  includedConfiguration: string[];

  /**
   * EDITORIAL-QUALITY APPROVAL GATE — not a second price source.
   *
   * A commerce record makes a size sellable and populates the visible price. This flag is a
   * separate question: is the page itself finished — genuinely unique, size-specific content
   * rather than the family boilerplate with the dimensions swapped?
   *
   * Price availability and SEO readiness are deliberately independent. A size can be priced and
   * buyable while its page is still thin, and that page must not be indexed, listed in the
   * sitemap, published as a Product/Offer, carried in ProductGroup.hasVariant, or submitted to
   * Merchant Center. All five require a valid commerce record AND this flag.
   *
   * OPTIONAL and DEFAULTS TO FALSE: every read goes through variantIsContentComplete(), which
   * treats undefined as false, so a new size is withheld until someone explicitly approves it.
   * Never set this true to clear a validator warning — set it only when the copy is real.
   */
  contentComplete?: boolean;
  /** May this size be added to the cart? Still ANDed with priceConfirmed + availability. */
  cartEligible: boolean;
  /** May this size be submitted to Merchant Center? Still ANDed with every gate above. */
  merchantEligible: boolean;
  /** Does a page exist at all? false ⇒ not prerendered ⇒ the URL 404s for real. */
  published: boolean;

  /** Why a size is gated. Surfaced in the implementation report and the feed log. */
  note?: string;
}

/** One genuinely distinct physical product, sold in several standard sizes. */
export interface ProductFamily {
  /** Stable product-group ID. Becomes <g:item_group_id> and schema productGroupID. */
  productGroupId: string;
  /** The group's name. Becomes <g:item_group_title> and the ProductGroup `name`. */
  groupTitle: string;
  /** Parent product slug — the family lives at /products/<slug>. */
  slug: string;
  /** The src/data/products.ts product id whose page IS this family's parent page. */
  parentProductId: string;

  brand: string;
  material: string;
  description: string;

  /**
   * SEARCH SYNONYMS ONLY. Natural language for visible copy, FAQs and descriptions.
   * These never become families, pages, group ids or feed rows — see the header.
   */
  searchAliases: string[];

  /** The size a visitor lands on from a "see sizes" link. Must be a published variant. */
  defaultVariantSlug: string;
  /** GENUINELY different products to cross-link. products.ts ids — never synonyms. */
  relatedProductIds: string[];

  published: boolean;
  /** Family-level feed gate. ANDed with each variant's own merchantEligible. */
  merchantEligible: boolean;

  /**
   * The family's STANDARD external height in feet — 8.5 = 8 ft 6 in.
   *
   * Owner-stated as the commonly used standard, and the same no-surcharge baseline the cabin
   * calculator already encodes (STANDARD_HEIGHT_FT in
   * src/components/home/cabin-calculator/pricing.ts). It is shown on a size page as a clearly
   * labelled FAMILY standard.
   */
  standardHeightFt: number;
  /**
   * Has that standard height been confirmed for EVERY individual size?
   *
   * While this is false, the height is displayed as a family standard but is kept OUT of each
   * size's identity strings — dimensions, <title>, <g:size> and schema.org `size` carry length
   * x width only. A size whose height has been confirmed individually sets `heightFt` on the
   * variant and gets the full L x W x H treatment regardless of this flag.
   *
   * Flip this to true only once the height is verified for each published size.
   */
  heightConfirmedPerSize: boolean;
  /** Primary use case — drives the "best for" chip and the feed title. */
  bestFor: string;
  /** Google product taxonomy id. 114 = Business & Industrial > Construction. */
  googleProductCategory: string;
  /** <g:product_type> — our own category path. */
  productType: string;
  /** Category label + slug shown in the breadcrumb and the category link. */
  categoryName: string;
  categorySlug: string;

  /** What the sizes vary by, as schema.org property URLs. */
  variesBy: string[];

  variants: SizeVariant[];
}

const DELIVERY = "7–21 Working Days";
const CAT_CONSTRUCTION = "114"; // Business & Industrial > Construction
const BRAND = "Portable Office Cabin";

/**
 * The family's standard fit-out. Taken VERBATIM from the parent product's own catalog
 * record (src/data/products.ts, id 10) — it is family-level truth, so every size ships
 * with it and nothing here is a per-size claim.
 */
const CONTAINER_OFFICE_INCLUDED = [
  "50 mm PUF / EPS / Rockwool sandwich wall panels",
  "Concealed copper wiring with MCB distribution board and LED lighting",
  "Vinyl or laminate flooring finish on cement board",
  "Powder-coated aluminium or uPVC windows with glass",
  "Steel entrance door with lock",
  "Provision for a split AC sized to the container volume",
  "Corner lifting hooks for crane handling and flatbed transport",
];

/**
 * A size that the owner has NOT yet priced.
 *
 * Every field that could state or imply a price is left empty on purpose. The page is
 * published (real content, real URL, indexable, in the sitemap, linked from the parent),
 * but it carries NO figure, NO Add to Cart, NO JSON-LD Offer and NO feed row until the
 * owner supplies `basePricePaise` and flips `priceConfirmed`.
 *
 * `merchantEligible` is ALSO false and stays false until a photograph of the actual unit
 * exists — the family's five renders show a timber/composite-clad garden module, which is
 * exactly why the parent SKU POC-CO-GEN is already held out of the feed by
 * src/data/merchantFeedPolicy.ts. Feeding a size with that image would repeat the fault.
 */
function unpricedContainerOfficeSize(
  lengthFt: number,
  widthFt: number,
  opts: { note?: string; published?: boolean } = {},
): SizeVariant {
  const idSuffix = `${lengthFt}X${widthFt}`;
  return {
    variantId: `POC-CO-${idSuffix}`,
    sku: `POC-CO-${idSuffix}`,
    sizeLabel: `${lengthFt} ft × ${widthFt} ft`,
    sizeLabelPlain: `${lengthFt} ft x ${widthFt} ft`,
    sizeSlug: `${lengthFt}x${widthFt}-ft`,
    lengthFt,
    widthFt,
    basePricePaise: undefined,
    priceConfirmed: false,
    availability: "in_stock",
    leadTime: DELIVERY,
    additionalImages: [],
    specifications: [],
    includedConfiguration: CONTAINER_OFFICE_INCLUDED,
    cartEligible: true,
    merchantEligible: false,
    /* Explicitly false, not merely absent. Every one of these sizes is still the family
     * boilerplate with the dimensions substituted — no size-specific layout, capacity,
     * specification, application, image or FAQ content yet. Flip to true only when that copy
     * is genuinely written for the size, and never to clear a validator warning. */
    contentComplete: false,
    published: opts.published ?? true,
    note:
      opts.note ??
      "AWAITING OWNER-CONFIRMED PRICE and a photograph of the actual MS steel unit in this size. " +
        "Published as an indexable landing page; excluded from the cart, the JSON-LD Offer and the " +
        "Merchant feed until both are supplied.",
  };
}

export const PRODUCT_FAMILIES: ProductFamily[] = [
  {
    productGroupId: "POC-CO",
    groupTitle: "Container Office Cabin",
    slug: "container-office",
    parentProductId: "10",
    brand: BRAND,
    material: "High-Tensile MS / Corten Steel",
    description:
      "A container office is a factory-built, fully finished steel workspace that arrives ready to " +
      "use and can be relocated between project sites. The shell is high-tensile MS or Corten " +
      "steel, the walls are 50 mm insulated sandwich panels, and the electrical, lighting, " +
      "flooring and windows are fitted before it leaves the factory.",
    /* SYNONYMS — visible copy only. Never a second family, page, group id or feed row. */
    searchAliases: [
      "site office container",
      "portable office cabin",
      "porta office",
      "office container",
      "portacabin office",
    ],
    defaultVariantSlug: "20x10-ft",
    /* GENUINELY DIFFERENT products, each with its own construction or specification —
     * not synonyms of this one. ids from src/data/products.ts:
     *   20 MS Container Office Cabin (heavy ISMB/ISMC sections)
     *    3 Modern Container Office (Corten container shell, 40 x 8)
     *   41 VIP Container Office (heavy-gauge executive fit-out)
     *    2 Standard Site Office Container (Corten + 50 mm rockwool)
     *   28 Steel Office Container (ISMC / RHS, stackable) */
    relatedProductIds: ["20", "3", "41", "2", "28"],
    published: true,
    merchantEligible: true,
    /* 8 ft 6 in — owner-stated common standard, matching STANDARD_HEIGHT_FT in the cabin
     * calculator. NOT yet confirmed size by size, so it is shown as a labelled family
     * standard and kept out of every size's identity string (see heightConfirmedPerSize). */
    standardHeightFt: 8.5,
    heightConfirmedPerSize: false,
    bestFor: "Project Site Offices",
    googleProductCategory: CAT_CONSTRUCTION,
    productType: "Container Offices",
    categoryName: "Container Offices",
    categorySlug: "container-offices",
    variesBy: ["https://schema.org/size"],
    variants: [
      unpricedContainerOfficeSize(10, 10),
      unpricedContainerOfficeSize(20, 8),
      unpricedContainerOfficeSize(20, 10),
      /**
       * ── 25 ft x 14 ft — THE ONE PRICED SIZE, AND IT ALREADY HAS A PAGE ─────────────────
       *
       * This is `POC-CO-GEN` (products.ts id "10"): a real, owner-verified build at a fixed
       * ₹12,00,000 ex-GST, live at /products/container-office since long before the size
       * ladder existed. The owner has confirmed it is the 25 ft x 14 ft configuration, so it
       * is a GENUINE size of this family — not a duplicate of the group — and it takes its
       * place in the ladder like any other size: same productGroupId, its own <g:size>, a
       * slot in the size selector, and an entry in `hasVariant`.
       *
       * `rendersAtParent` keeps its URL exactly where it is. Its canonical and its <g:link>
       * are /products/container-office, self-referencing, and nothing about its existing
       * commerce row, price, SKU or page is altered — variantCommerceRows() skips it
       * precisely so the hand-written row in productCommerce.ts stays the single truth.
       *
       * It is NOT suppressed from the Merchant feed when other sizes become eligible: it is
       * a priced size in its own right. Whether it is actually fed remains governed, as it
       * always has been, by src/data/merchantFeedPolicy.ts — which still holds it back over
       * image accuracy. That hold is the owner's to lift, not this file's.
       */
      {
        variantId: "10",
        sku: "POC-CO-GEN",
        sizeLabel: "25 ft × 14 ft",
        sizeLabelPlain: "25 ft x 14 ft",
        sizeSlug: "25x14-ft",
        lengthFt: 25,
        widthFt: 14,
        rendersAtParent: true,
        /* ₹12,00,000 ex-GST → ₹14,16,000 incl. 18% GST. Stated here in paise for the family
         * system's own gates; the CHARGEABLE figure still comes from the existing commerce
         * row via getCommerce("10"), and product-variants.test.ts asserts the two agree. */
        basePricePaise: 1_200_000_00,
        priceConfirmed: true,
        availability: "in_stock",
        leadTime: DELIVERY,
        /* Uses the family's own long-standing gallery from products.ts id 10 — the audited
         * image set, not a per-size photo. */
        additionalImages: [],
        specifications: [],
        includedConfiguration: CONTAINER_OFFICE_INCLUDED,
        cartEligible: true,
        merchantEligible: true,
        published: true,
        /* EDITORIAL GATE — approved, and the only size in this family that is.
         *
         * This is not a new size page awaiting copy: it is the family's long-standing PARENT
         * page (rendersAtParent), carrying the full owner-written Container Office content that
         * predates the size ladder entirely. Its price has been owner-confirmed since before
         * these variants existed. So the question the flag asks — is the page finished, with
         * genuinely size-specific content? — is already answered yes by a page that has been
         * live for months.
         *
         * The five new sizes stay false: they have neither confirmed prices nor their own copy.
         * Feed inclusion is unaffected either way — merchantFeedPolicy.ts still holds POC-CO-GEN
         * back pending a product-accurate photograph, which is a separate gate again. */
        contentComplete: true,
        note:
          "Owner-verified 25 ft x 14 ft build at a fixed ₹12,00,000 ex-GST. Served at the family's " +
          "parent URL. Feed inclusion remains governed by merchantFeedPolicy.ts, which currently " +
          "holds POC-CO-GEN back pending a product-accurate photograph.",
      },
      /**
       * ── 20 ft x 12 ft — UNPUBLISHED, awaiting confirmation that we build it ─────────────
       * No 20 ft x 12 ft unit appears anywhere in the catalogue or the site copy (the nearest
       * evidence is the 40 ft x 12 ft POC-PC-PORTA). `published: false` means it is not
       * prerendered, not in the sitemap, not in the size selector, has no commerce row, and
       * its URL returns a genuine 404 — not a soft or empty page.
       * Flip to `published: true` ONLY once the owner confirms this size is manufactured.
       */
      unpricedContainerOfficeSize(20, 12, {
        published: false,
        note:
          "UNPUBLISHED — awaiting owner confirmation that this size is manufactured at all. No 20 ft " +
          "x 12 ft unit appears in the catalogue or site copy, so it is not indexed on instruction " +
          "alone. Returns a real 404 until confirmed.",
      }),
      unpricedContainerOfficeSize(30, 10),
      unpricedContainerOfficeSize(40, 10),
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────────────────
 *  LOOKUPS — built once at module load.
 * ────────────────────────────────────────────────────────────────────────────────────── */

const FAMILY_BY_SLUG = new Map(PRODUCT_FAMILIES.map((f) => [f.slug, f]));
const FAMILY_BY_GROUP_ID = new Map(PRODUCT_FAMILIES.map((f) => [f.productGroupId, f]));
const FAMILY_BY_PARENT_PRODUCT_ID = new Map(PRODUCT_FAMILIES.map((f) => [f.parentProductId, f]));

export interface VariantHit {
  family: ProductFamily;
  variant: SizeVariant;
}

const VARIANT_BY_ID = new Map<string, VariantHit>();
const VARIANT_BY_PATH = new Map<string, VariantHit>();
for (const family of PRODUCT_FAMILIES) {
  for (const variant of family.variants) {
    VARIANT_BY_ID.set(variant.variantId, { family, variant });
    VARIANT_BY_PATH.set(`${family.slug}/${variant.sizeSlug}`, { family, variant });
  }
}

/** The family whose parent page lives at /products/<slug>, if any. */
export function getFamilyBySlug(slug: string): ProductFamily | undefined {
  const family = FAMILY_BY_SLUG.get(slug);
  return family?.published ? family : undefined;
}

/** The family with this stable product-group id. */
export function getFamilyByGroupId(groupId: string): ProductFamily | undefined {
  return FAMILY_BY_GROUP_ID.get(groupId);
}

/** The family whose PARENT catalogue product this is — used to gate the parent's feed row. */
export function getFamilyByParentProductId(productId: string): ProductFamily | undefined {
  return FAMILY_BY_PARENT_PRODUCT_ID.get(productId);
}

/**
 * Resolve /products/<slug>/<child> to a PUBLISHED size that has its own child page.
 *
 * Returns undefined for an unpublished size (⇒ a genuine 404) and for a `rendersAtParent`
 * size (⇒ handled by getParentRenderedVariant, which 301s to the parent instead of rendering
 * a duplicate of it here).
 */
export function getVariantByPath(slug: string, child: string): VariantHit | undefined {
  const hit = VARIANT_BY_PATH.get(`${slug}/${child}`);
  if (!hit || !hit.family.published || !hit.variant.published) return undefined;
  return hit.variant.rendersAtParent ? undefined : hit;
}

/** Resolve a commerce/cart id (== variantId) to its family + variant. */
export function getVariantById(variantId: string): VariantHit | undefined {
  const hit = VARIANT_BY_ID.get(variantId);
  if (!hit || !hit.family.published || !hit.variant.published) return undefined;
  return hit;
}

/** Every published variant of a published family, in declaration order. */
export function publishedVariants(family: ProductFamily): SizeVariant[] {
  return family.published ? family.variants.filter((v) => v.published) : [];
}

/** Every published family. */
export function publishedFamilies(): ProductFamily[] {
  return PRODUCT_FAMILIES.filter((f) => f.published);
}

/**
 * { slug, child } for every published size that has its OWN child page.
 *
 * A `rendersAtParent` size is excluded — it is served by the family's parent page, so it has
 * no child route to prerender. Its guessable child URL is handled separately (see
 * parentRenderedVariantParams).
 */
export function allVariantParams(): { slug: string; child: string }[] {
  return publishedFamilies().flatMap((family) =>
    publishedVariants(family)
      .filter((variant) => !variant.rendersAtParent)
      .map((variant) => ({ slug: family.slug, child: variant.sizeSlug })),
  );
}

/**
 * { slug, child } for every published size that lives at the PARENT url.
 *
 * These are prerendered too, but only so the route can 301 them to the parent: a visitor or a
 * crawler who guesses /products/container-office/25x14-ft should land on the real page rather
 * than a 404, and must never be served a second copy of it at a second URL.
 */
export function parentRenderedVariantParams(): { slug: string; child: string }[] {
  return publishedFamilies().flatMap((family) =>
    publishedVariants(family)
      .filter((variant) => variant.rendersAtParent)
      .map((variant) => ({ slug: family.slug, child: variant.sizeSlug })),
  );
}

/** Resolve a family+child slug to a size that is served at the PARENT url, if any. */
export function getParentRenderedVariant(slug: string, child: string): VariantHit | undefined {
  const hit = VARIANT_BY_PATH.get(`${slug}/${child}`);
  if (!hit || !hit.family.published || !hit.variant.published) return undefined;
  return hit.variant.rendersAtParent ? hit : undefined;
}

/**
 * The canonical path of a size. The ONE URL form: no query, no trailing slash.
 * A `rendersAtParent` size canonicalises to the family's parent page — which is a genuine
 * SELF-referencing canonical for it, because that page is where it is sold.
 */
export function variantPath(family: ProductFamily, variant: SizeVariant): string {
  return variant.rendersAtParent
    ? `/products/${family.slug}`
    : `/products/${family.slug}/${variant.sizeSlug}`;
}

/* ──────────────────────────────────────────────────────────────────────────────────────
 *  DERIVED VALUES — computed, never typed in twice.
 * ────────────────────────────────────────────────────────────────────────────────────── */

/** Built-up area in sq ft. DERIVED from the size itself, so it can never contradict it. */
export function builtUpAreaSqFt(variant: SizeVariant): number {
  return variant.lengthFt * variant.widthFt;
}

/**
 * CONFIRMED external height in feet, or undefined.
 *
 * A size's own `heightFt` wins. Otherwise the family standard is used ONLY once
 * `heightConfirmedPerSize` says it has been verified for every size. Until then this returns
 * undefined and the height is left out of the size's identity entirely — see the note on
 * SizeVariant.heightFt for why a back-filled height is an invented specification.
 */
export function variantHeightFt(family: ProductFamily, variant: SizeVariant): number | undefined {
  if (variant.heightFt !== undefined) return variant.heightFt;
  return family.heightConfirmedPerSize ? family.standardHeightFt : undefined;
}

/** 8.5 → "8 ft 6 in"; 9 → "9 ft". Feet-and-inches, the way the trade states a cabin height. */
export function formatFeet(feet: number): string {
  const whole = Math.floor(feet);
  const inches = Math.round((feet - whole) * 12);
  return inches === 0 ? `${whole} ft` : `${whole} ft ${inches} in`;
}

/**
 * The size's dimension string — ASCII, for <title>, the spec table and the feed.
 *
 * "20 ft x 10 ft" while the height is unconfirmed; "20 ft x 10 ft x 8 ft 6 in" once it is.
 * Length and width are the size's DEFINITION so they are always safe to state; the height is
 * only ever appended when it has actually been confirmed.
 */
export function variantDimensionsPlain(family: ProductFamily, variant: SizeVariant): string {
  const height = variantHeightFt(family, variant);
  return height === undefined
    ? variant.sizeLabelPlain
    : `${variant.sizeLabelPlain} x ${formatFeet(height)}`;
}

/**
 * BASE PRICE IN WHOLE RUPEES, or undefined when the owner has not confirmed one.
 *
 * Paise → rupees is an exact integer division here because every stored figure is a whole
 * number of rupees (the business quotes and invoices in rupees). A stored value that is
 * NOT a whole rupee is refused rather than rounded: a sub-rupee drift between this page
 * and Razorpay is precisely the price mismatch Merchant Center disapproves for.
 */
export function variantBaseRupees(variant: SizeVariant): number | undefined {
  const paise = variant.basePricePaise;
  if (paise === undefined) return undefined;
  if (!Number.isInteger(paise) || paise <= 0) return undefined;
  if (paise % PAISE_PER_RUPEE !== 0) {
    console.error(
      `[productFamilies] ${variant.sku}: basePricePaise ${paise} is not a whole rupee — refusing to price it`,
    );
    return undefined;
  }
  return paise / PAISE_PER_RUPEE;
}

/**
 * Is this size genuinely payable online right now?
 * ALL of: family published · variant published · cartEligible · in stock · price confirmed
 * AND a usable base price. Anything less and the page shows no figure at all.
 */
export function variantIsPurchasable(family: ProductFamily, variant: SizeVariant): boolean {
  return (
    family.published &&
    variant.published &&
    variant.cartEligible &&
    variant.availability === "in_stock" &&
    variant.priceConfirmed &&
    variantBaseRupees(variant) !== undefined
  );
}

/**
 * Has an editor approved this size's page as finished? Defaults to FALSE when unset.
 *
 * Read this rather than variant.contentComplete directly, so the default lives in exactly one
 * place and an unset flag can never be mistaken for approval.
 */
export function variantIsContentComplete(variant: SizeVariant): boolean {
  return variant.contentComplete === true;
}

/**
 * ── THE SECOND OF THREE PREDICATES: may this size appear in SEARCH? ────────────────────
 *
 * Deliberately NOT the same question as variantIsPurchasable(). The three are separate
 * concerns and must never be collapsed into one another:
 *
 *   variantIsPurchasable   — cart / payment eligibility. Requires in_stock.
 *   variantIsSearchEligible — content / indexing / schema eligibility. THIS ONE.
 *   variantIsFeedEligible  — search eligibility PLUS Merchant-specific rules.
 *
 * Requires a VALID availability value, not `in_stock`: a temporarily out-of-stock size is
 * still a genuine product with a genuine page, and de-indexing it would throw away earned
 * ranking for a condition that reverses next week. Its Offer and feed row state the real
 * status instead.
 *
 * `cartEligible` is likewise NOT required — whether a size can be bought online has no
 * bearing on whether its page deserves to be indexed.
 *
 * What IS required is a confirmed price and an approved page, because this single predicate
 * drives every search surface: robots, sitemap, ProductGroup.hasVariant, the Product/Offer
 * node and (through variantIsFeedEligible) Merchant Center. One source of truth, so they
 * cannot disagree.
 */
export function variantIsSearchEligible(family: ProductFamily, variant: SizeVariant): boolean {
  return (
    family.published &&
    variant.published &&
    isValidAvailability(variant.availability) &&
    variant.priceConfirmed &&
    variantBaseRupees(variant) !== undefined &&
    variantIsContentComplete(variant)
  );
}

/**
 * ── THE THIRD PREDICATE: may this size be submitted to Merchant Center? ────────────────
 *
 * Search eligibility PLUS the Merchant-specific requirements: both merchantEligible flags
 * and a real variant photograph, because Google compares the feed image against the landing
 * page it links to.
 *
 * Built on variantIsSearchEligible, not variantIsPurchasable — an out-of-stock size with a
 * confirmed price and a finished page belongs in the feed carrying `out_of_stock`, which is
 * how Merchant Center expects availability to be reported.
 */
export function variantIsFeedEligible(family: ProductFamily, variant: SizeVariant): boolean {
  return (
    variantIsSearchEligible(family, variant) &&
    family.merchantEligible &&
    variant.merchantEligible &&
    variantHasFeedImage(variant)
  );
}

/**
 * Does this size have an image Google may be shown?
 *
 * A size with its OWN child page needs its OWN photograph: it is a distinct landing page, and
 * Google judges a feed image against the page it links to. A `rendersAtParent` size links to
 * the family's long-standing product page and is shown that page's own audited gallery, so it
 * needs no separate photo — its images are already whatever that page displays, and whether
 * they are good enough for Merchant Center is decided where it has always been decided, in
 * src/data/merchantFeedPolicy.ts.
 */
function variantHasFeedImage(variant: SizeVariant): boolean {
  return variant.rendersAtParent ? true : !!variant.mainImage;
}

/** Why this size is not in the feed — one short, reviewable reason. "" when it IS eligible. */
export function variantFeedHoldReason(family: ProductFamily, variant: SizeVariant): string {
  /* Each branch names ONE specific, reviewable cause, in the same order the predicates above
   * evaluate them — a diagnostic, not a second rulebook. The gates themselves stay in
   * variantIsSearchEligible / variantIsFeedEligible; this function only explains them.
   *
   * NOTE what is deliberately NOT a hold reason any more: being out of stock, and not being
   * cartEligible. Neither withholds a feed row now — an out-of-stock size is submitted with
   * `out_of_stock`, which is how Merchant Center expects it to be reported. */
  if (!family.published || !variant.published) return "not published";
  if (!isValidAvailability(variant.availability))
    return `unsupported availability value "${variant.availability}"`;
  if (!variant.priceConfirmed || variantBaseRupees(variant) === undefined)
    return "no owner-confirmed fixed price";
  if (!variantIsContentComplete(variant))
    return "page not editorially approved — contentComplete is false";
  if (!family.merchantEligible) return "family held out of the feed";
  if (!variant.merchantEligible) return "variant held out of the feed";
  if (!variantHasFeedImage(variant)) return "no variant-accurate photograph";

  /* Backstop: the branches above must account for EVERY way variantIsFeedEligible() can fail.
   * If a gate is ever added there without a reason here, the feed route would silently treat
   * a held-back size as eligible. Fail loudly instead of quietly. */
  if (!variantIsFeedEligible(family, variant))
    return "held by a feed gate with no specific reason — variantFeedHoldReason is out of step with variantIsFeedEligible";

  return "";
}

/* ──────────────────────────────────────────────────────────────────────────────────────
 *  TEXT — composed from real fields only. Nothing here invents a benefit or a spec.
 * ────────────────────────────────────────────────────────────────────────────────────── */

/** The variant <h1> / product name: "Container Office Cabin 20 ft × 10 ft". */
export function variantName(family: ProductFamily, variant: SizeVariant): string {
  return `${family.groupTitle} ${variant.sizeLabel}`;
}

/**
 * The Merchant Center <g:title> and the page <title>.
 * Pattern: "<group> <size> (<area> sq ft) <material> for <use case> | <brand>".
 * Composed, not written, so it is identical in the feed and on the page — Google matches
 * a feed item to its landing page partly on that. Capped at 150 chars by the feed route.
 */
export function variantFeedTitle(family: ProductFamily, variant: SizeVariant): string {
  return `${family.groupTitle} ${variant.sizeLabelPlain} (${builtUpAreaSqFt(variant)} sq ft) ${family.material} for ${family.bestFor} | ${family.brand}`;
}

/**
 * Variant-specific description: the size's own hard facts first, then the shared family
 * copy. Deliberately NOT spun — reusing family content is allowed; manufacturing fake
 * differences to make pages look unique is not.
 */
export function variantDescription(family: ProductFamily, variant: SizeVariant): string {
  const height = variantHeightFt(family, variant);
  const facts =
    `${family.groupTitle} in the ${variant.sizeLabelPlain} standard size — ` +
    `${builtUpAreaSqFt(variant)} sq ft of built-up area, ` +
    // Stated only when confirmed for this size. Never back-filled from the family standard.
    (height === undefined ? "" : `${formatFeet(height)} external height, `) +
    `${family.material.toLowerCase()} shell.`;
  return `${facts} ${family.description}`;
}

/**
 * The spec rows that belong to the SIZE. The size's DERIVED dimensions come first (they
 * cannot contradict the size, because they are computed from it); family-level rows are
 * appended by the page from the parent product's own catalog record, so there is exactly
 * one copy of them.
 */
export function variantOwnSpecs(family: ProductFamily, variant: SizeVariant): KeySpec[] {
  const height = variantHeightFt(family, variant);
  return [
    { label: "Size", value: variant.sizeLabelPlain },
    {
      // The row header states exactly which dimensions are being given, so a two-dimension
      // value never reads as a truncated three-dimension one.
      label: height === undefined ? "Dimensions (L x W)" : "Dimensions (L x W x H)",
      value: variantDimensionsPlain(family, variant),
    },
    { label: "Built-up Area", value: `${builtUpAreaSqFt(variant)} sq ft` },
    /* The family standard height, shown but explicitly NOT claimed for this size. It is a
     * separate, qualified row rather than part of the dimensions above, so a reader is never
     * told the unit is this tall — only that the range is normally built to it. */
    ...(height === undefined
      ? [
          {
            label: "Standard Height",
            value: `${formatFeet(family.standardHeightFt)} (${family.groupTitle.toLowerCase()} family standard — confirm for this size)`,
          },
        ]
      : []),
    { label: "Frame / Material", value: family.material },
    { label: "Brand", value: family.brand },
    ...variant.specifications,
  ];
}

/* ──────────────────────────────────────────────────────────────────────────────────────
 *  COMMERCE BRIDGE — every published variant becomes a first-class commerce row.
 *
 *  This is what makes the cart, the checkout, the Razorpay amount, the JSON-LD Offer gate
 *  and the feed work with NO change to any of them: they all already key off
 *  getCommerce(id) / isPurchasable(id), and a variant simply IS an id they now know.
 *
 *  An unpriced variant still gets a row, with basePrice 0 and priceConfirmed:false. Both
 *  isPurchasable() and feedEligible() reject it on priceConfirmed alone, so the zero can
 *  never reach a price surface — and the row's existence is what lets the page render its
 *  spec chips, its delivery window and its "contact us for pricing" state from the same
 *  catalogue every other product on this site uses.
 * ────────────────────────────────────────────────────────────────────────────────────── */

export function variantCommerceRows(): ProductCommerce[] {
  const rows: ProductCommerce[] = [];
  for (const family of publishedFamilies()) {
    for (const variant of publishedVariants(family)) {
      /* A size served at the family's PARENT url already HAS a hand-written commerce row —
       * it was a product long before it was catalogued as a size. Generating a second row
       * for the same id would shadow the original in BY_ID and silently replace its price,
       * title and identity. The hand-written row stays the one truth; the family data only
       * describes where that size sits in the ladder. */
      if (variant.rendersAtParent) continue;

      const baseRupees = variantBaseRupees(variant);
      rows.push({
        id: variant.variantId,
        sku: variant.sku,
        // 0 ⇒ NOT PRICED. priceConfirmed:false below keeps it out of every price surface.
        basePrice: baseRupees ?? 0,
        priceConfirmed: variant.priceConfirmed && baseRupees !== undefined,
        kind: "product",
        // Cart/checkout truth: only an in_stock size is buyable right now. A pre-order size
        // is deliberately false here — it is not yet payable, whatever the feed reports.
        inStock: variant.availability === "in_stock",
        // Feed truth: the full three-state value, so a pre-order size is not misreported as
        // out of stock. Hand-written rows omit this and keep their existing derivation.
        feedAvailability: variantFeedAvailability(variant),
        h1Title: variantName(family, variant),
        feedTitle: variantFeedTitle(family, variant),
        size: variantDimensionsPlain(family, variant),
        material: family.material,
        bestFor: family.bestFor,
        deliveryDays: variant.leadTime,
        googleProductCategory: family.googleProductCategory,
        productType: family.productType,
        extraSpecs: [
          { label: "Built-up Area", value: `${builtUpAreaSqFt(variant)} sq ft` },
          ...variant.specifications,
        ],
        note: variant.note,
      });
    }
  }
  return rows;
}

/**
 * A size variant, shaped as a catalogue `Product` so that everything already written
 * against `Product` — the cart's display enrichment, the Razorpay order's line naming,
 * ProductActions, ProductGallery — works on a variant untouched.
 *
 * `parentSlug` + `slug` mean getProductDetailPath() returns the nested canonical
 * /products/<family>/<size> with no special-casing anywhere.
 *
 * `parent` is the family's catalogue product, passed in by the caller (products.ts owns
 * the array; this module must not import it at runtime). Gallery, features and the
 * family spec rows come from it, so a variant can never drift from its own family.
 */
export function variantAsProduct(hit: VariantHit, parent: Product): Product {
  const { family, variant } = hit;
  const images = variant.mainImage ? [variant.mainImage, ...variant.additionalImages] : parent.images;

  return {
    ...parent,
    id: variant.variantId,
    sku: variant.sku,
    name: variantName(family, variant),
    category: family.categoryName,
    categorySlug: family.categorySlug,
    slug: variant.sizeSlug,
    parentSlug: family.slug,
    description: variantDescription(family, variant),
    shortDescription: `${family.groupTitle}, ${variant.sizeLabelPlain} — ${builtUpAreaSqFt(variant)} sq ft built-up area.`,
    /* The size's derived dimensions FIRST, then the family's own rows minus any that would
     * restate a dimension or an area for a DIFFERENT configuration (the parent is the base
     * 25 ft x 14 ft build, so its Dimensions/Floor Area/Sizes Available rows must not sit
     * in a 20 ft x 10 ft page's spec table contradicting the size in the H1). */
    specifications: [
      ...variantOwnSpecs(family, variant),
      ...(parent.specifications || []).filter(
        (s) =>
          !/^(dimensions?|sizes?|sizes available|floor area|total area|overall size|built-?up area|brand|frame|frame\s*\/\s*material)\b/i.test(
            s.label.trim(),
          ),
      ),
    ],
    images,
    /* Product.price is a legacy ex-GST display figure that nothing on a variant page reads
     * (money comes from the commerce row). Cleared so it can never be picked up by accident. */
    price: undefined,
    priceLabel: undefined,
    featured: false,
    inStock: variant.availability === "in_stock",
  };
}

/** GST rate applied to every variant. Re-exported so callers need one import, not two. */
export const VARIANT_GST_RATE = GST_RATE;
