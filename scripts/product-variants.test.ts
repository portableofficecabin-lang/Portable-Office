/**
 * PRODUCT FAMILY + SIZE VARIANT REGRESSION TEST
 *
 * Run:  npm run variants:test
 *       (node --import tsx --import ./scripts/asset-stub-register.mjs scripts/product-variants.test.ts)
 *
 * This is the DATA + LOGIC half of the verification. It proves, without needing a server,
 * that the four surfaces which must never disagree about a size — the page, the JSON-LD,
 * the Merchant feed and the checkout — are all derived from one place and land on the same
 * values. The HTTP half (real 200s, real 404s, canonical tags, Googlebot parity, crawlable
 * links with JS disabled) lives in scripts/product-variants-http.test.mjs.
 *
 * It FAILS (exit 1) if any of these regress:
 *   • a size URL collides with a reserved child page (a guide page losing its URL);
 *   • a duplicate variant id / SKU / URL anywhere on the site;
 *   • a variant's canonical stops being self-referencing, or points at the parent;
 *   • a price appears on a page, in an Offer, in the feed or at checkout that is not
 *     byte-identical to sellPrice(basePrice);
 *   • an UNPRICED size leaks a price, an Offer, an Add-to-Cart or a feed row;
 *   • feed variants stop sharing one item_group_id, or the parent gets fed alongside them;
 *   • a published size falls out of the sitemap;
 *   • an existing product guide, product child or product page loses its route.
 */

import { readFile } from "node:fs/promises";
import { allChildParams, getChildPage } from "../src/data/productChildPages";
import { feedExclusionFor } from "../src/data/merchantFeedPolicy";
import {
  PRODUCT_COMMERCE,
  feedEligible,
  getCommerce,
  isOutrightSale,
  isPurchasable,
} from "../src/data/productCommerce";
import {
  PRODUCT_FAMILIES,
  allVariantParams,
  builtUpAreaSqFt,
  getParentRenderedVariant,
  getVariantByPath,
  parentRenderedVariantParams,
  publishedFamilies,
  publishedVariants,
  variantAsProduct,
  variantCommerceRows,
  variantDimensionsPlain,
  variantOwnSpecs,
  formatFeet,
  variantBaseRupees,
  variantFeedTitle,
  variantHeightFt,
  variantIsFeedEligible,
  variantIsContentComplete,
  variantIsPurchasable,
  variantPath,
  type ProductFamily,
  type SizeVariant,
} from "../src/data/productFamilies";
import {
  products,
  getProductById,
  getProductDetailPath,
  getProductSlug,
} from "../src/data/products";
import { sellPrice, priceForFeed } from "../src/lib/pricing/gst";
import { computeTotals } from "../src/lib/pricing/orderTotals";
import {
  generateProductGroupSchema,
  generateSizeVariantProductSchema,
  productGroupNodeId,
} from "../src/lib/seo/productGroupSchema";
import { buildVariantPageMetadata, variantPageTitle } from "../src/lib/seo/variantPageMeta";
import { buildProductPageMetadata } from "../src/lib/seo/productPageMeta";
import { GET as merchantFeedGET } from "../app/api/merchant-feed/route";
import sitemap from "../app/sitemap";

const SITE = "https://portableofficecabin.com";

let passed = 0;
let failed = 0;
const check = (cond: boolean, label: string) => {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
};

const section = (title: string) => console.log(`\n${title}`);

/** Every published (family, variant) pair, flattened. */
const ALL: Array<{ family: ProductFamily; variant: SizeVariant }> = publishedFamilies().flatMap(
  (family) => publishedVariants(family).map((variant) => ({ family, variant })),
);

check(ALL.length > 0, "at least one published size variant exists");

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 1. IDENTITY — stable, unique ids everywhere
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("1. Identity & uniqueness");

{
  const groupIds = PRODUCT_FAMILIES.map((f) => f.productGroupId);
  check(new Set(groupIds).size === groupIds.length, "product-group ids are unique");

  const slugs = PRODUCT_FAMILIES.map((f) => f.slug);
  check(new Set(slugs).size === slugs.length, "family parent slugs are unique");

  // A family's parent slug must be a REAL product page, or the whole ladder is orphaned.
  for (const family of PRODUCT_FAMILIES) {
    const parent = products.find((p) => p.id === family.parentProductId);
    check(!!parent, `family ${family.productGroupId}: parent product id ${family.parentProductId} exists`);
    check(
      !!parent && getProductSlug(parent) === family.slug,
      `family ${family.productGroupId}: parent product's slug is "${family.slug}"`,
    );
  }

  const variantIds = ALL.map(({ variant }) => variant.variantId);
  check(new Set(variantIds).size === variantIds.length, "variant ids are unique");

  const variantSkus = ALL.map(({ variant }) => variant.sku);
  check(new Set(variantSkus).size === variantSkus.length, "variant SKUs are unique among variants");

  // …and unique against the WHOLE catalogue. A duplicate <g:id> rejects the entire feed.
  const catalogueSkus = new Set(products.map((p) => p.sku));
  const commerceSkusFromCatalogue = new Set(
    PRODUCT_COMMERCE.filter((c) => products.some((p) => p.id === c.id)).map((c) => c.sku),
  );
  for (const { variant } of ALL) {
    /* A `rendersAtParent` size IS an existing catalogue product (it was a product before it
     * was catalogued as a size), so it is EXPECTED to match a catalogue SKU — that identity is
     * the whole point. The collision that must never happen is a NEW size minting a SKU that
     * shadows an unrelated product. */
    if (variant.rendersAtParent) {
      check(catalogueSkus.has(variant.sku), `${variant.sku}: parent-rendered ⇒ IS an existing catalogue SKU`);
      continue;
    }
    check(!catalogueSkus.has(variant.sku), `${variant.sku}: does not collide with a catalogue SKU`);
    check(
      !commerceSkusFromCatalogue.has(variant.sku),
      `${variant.sku}: does not collide with a commerce SKU`,
    );
  }

  const allCommerceSkus = PRODUCT_COMMERCE.map((c) => c.sku);
  check(
    new Set(allCommerceSkus).size === allCommerceSkus.length,
    "every SKU in the commerce catalogue (variants included) is unique",
  );
  const allCommerceIds = PRODUCT_COMMERCE.map((c) => c.id);
  check(
    new Set(allCommerceIds).size === allCommerceIds.length,
    "every id in the commerce catalogue (variants included) is unique",
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 2. RESERVED CHILD SLUGS — a size must never take a guide page's URL
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("2. Reserved child slugs");

{
  const reserved = new Set<string>([
    ...allChildParams().map((p) => `${p.slug}/${p.child}`),
    ...products.filter((p) => p.parentSlug).map((p) => `${p.parentSlug}/${getProductSlug(p)}`),
  ]);

  for (const { family, variant } of ALL) {
    const key = `${family.slug}/${variant.sizeSlug}`;
    check(!reserved.has(key), `size slug "${key}" does not collide with a reserved child page`);
    // The route resolves registry + product children FIRST, so a collision would silently
    // hide the size page. Belt and braces: assert the resolver agrees.
    check(
      !getChildPage(family.slug, variant.sizeSlug),
      `"${key}" is not also a registry guide page`,
    );
  }

  // Known existing guide pages must still resolve — the size ladder must not have
  // displaced them.
  for (const slug of ["price-and-cost-guide", "sizes-and-dimensions", "materials-ms-vs-puf"]) {
    check(!!getChildPage("portable-cabin", slug), `existing guide /products/portable-cabin/${slug} still resolves`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 3. URL SHAPE & ROUTING
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("3. URL shape & routing");

{
  const paths = new Set<string>();
  for (const { family, variant } of ALL) {
    const path = variantPath(family, variant);

    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.sizeSlug), `${variant.sku}: size slug is a clean lowercase slug`);
    check(/^\d+x\d+-ft$/.test(variant.sizeSlug), `${variant.sku}: size slug uses the <L>x<W>-ft shape`);
    check(
      path === (variant.rendersAtParent
        ? `/products/${family.slug}`
        : `/products/${family.slug}/${variant.sizeSlug}`),
      `${variant.sku}: path is the expected form`,
    );
    check(!path.endsWith("/"), `${variant.sku}: no trailing slash`);
    check(!path.includes("?"), `${variant.sku}: no query parameter in the canonical path`);
    check(!paths.has(path), `${variant.sku}: URL is unique`);
    paths.add(path);

    // The route's own resolver finds it — via the child resolver for a size with its own page,
    // via the parent resolver (which 301s) for a size served at the family's parent url.
    if (variant.rendersAtParent) {
      check(
        !getVariantByPath(family.slug, variant.sizeSlug),
        `${variant.sku}: parent-rendered ⇒ NOT served as a child page`,
      );
      check(
        !!getParentRenderedVariant(family.slug, variant.sizeSlug),
        `${variant.sku}: resolves via getParentRenderedVariant (301 to the parent)`,
      );
      check(path === `/products/${family.slug}`, `${variant.sku}: canonical path IS the family parent url`);
      check(
        parentRenderedVariantParams().some((prm) => prm.slug === family.slug && prm.child === variant.sizeSlug),
        `${variant.sku}: its child url is prerendered purely to redirect`,
      );
      check(
        !allVariantParams().some((prm) => prm.slug === family.slug && prm.child === variant.sizeSlug),
        `${variant.sku}: is NOT prerendered as a second copy of the parent page`,
      );
    } else {
      check(!!getVariantByPath(family.slug, variant.sizeSlug), `${variant.sku}: resolves via getVariantByPath`);
      check(
        !getParentRenderedVariant(family.slug, variant.sizeSlug),
        `${variant.sku}: is not a parent-rendered size`,
      );
    }
  }

  // …and does NOT find things that must 404.
  check(!getVariantByPath("container-office", "99x99-ft"), "an undeclared size 404s (no resolver hit)");
  check(!getVariantByPath("container-office", "20x10"), "a size without the -ft suffix 404s");
  check(!getVariantByPath("container-office", "20x10-FT"), "an upper-case size slug 404s");
  check(!getVariantByPath("porta-cabin", "20x10-ft"), "a size under the wrong family 404s");

  // An UNPUBLISHED size must be absent from static params AND from the resolver — that is
  // what turns its URL into a real 404 under dynamicParams:false.
  for (const family of PRODUCT_FAMILIES) {
    for (const variant of family.variants.filter((v) => !v.published)) {
      check(!getVariantByPath(family.slug, variant.sizeSlug), `${variant.sku}: unpublished ⇒ no resolver hit ⇒ 404`);
      check(
        !allVariantParams().some((p) => p.slug === family.slug && p.child === variant.sizeSlug),
        `${variant.sku}: unpublished ⇒ not prerendered`,
      );
    }
  }

  /* Together, the two param sets must cover every published size exactly once: those with their
   * own page, plus those prerendered only to 301 to the parent page that serves them. */
  const ownPageParams = allVariantParams();
  const redirectParams = parentRenderedVariantParams();
  check(
    ownPageParams.length + redirectParams.length === ALL.length,
    "generateStaticParams covers exactly the published sizes (own pages + redirect-only)",
  );
  const paramKeys = [...ownPageParams, ...redirectParams].map((p) => `${p.slug}/${p.child}`);
  check(new Set(paramKeys).size === paramKeys.length, "no size is prerendered twice");
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 4. PRODUCT IDENTITY — the variant carries through to the cart
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("4. Product identity (cart / checkout / Razorpay)");

for (const { family, variant } of ALL) {
  const product = getProductById(variant.variantId);
  check(!!product, `${variant.sku}: getProductById resolves the variant id`);
  if (!product) continue;

  check(product.sku === variant.sku, `${variant.sku}: product carries the variant SKU`);
  check(product.id === variant.variantId, `${variant.sku}: product carries the variant id`);
  check(
    getProductDetailPath(product) === variantPath(family, variant),
    `${variant.sku}: getProductDetailPath returns the variant canonical`,
  );
  check((product.images || []).length > 0, `${variant.sku}: has at least one gallery image`);

  if (variant.rendersAtParent) {
    /* A size served at the family's parent url IS a long-standing catalogue product. It keeps
     * its own row, its own commerce record and its own page copy — the family system must not
     * have rewritten any of it. What it MUST have gained is the size, on its commerce record. */
    check(
      products.some((p) => p.id === variant.variantId),
      `${variant.sku}: parent-rendered ⇒ it IS a real catalogue product, untouched`,
    );
    const commerce = getCommerce(variant.variantId);
    check(
      commerce?.size === variant.sizeLabelPlain,
      `${variant.sku}: its commerce record states the size (${commerce?.size})`,
    );
    check(
      commerce?.feedTitle.includes(variant.sizeLabelPlain) === true,
      `${variant.sku}: its feed title states the size exactly as <g:size> submits it`,
    );
    check(
      variantCommerceRows().every((row) => row.id !== variant.variantId),
      `${variant.sku}: the family system does NOT generate a second commerce row that would shadow it`,
    );
    continue;
  }

  check(
    product.name.includes(variant.sizeLabel),
    `${variant.sku}: product name states the size`,
  );

  // The spec table must state THIS size, and must not restate the parent's dimensions.
  const specs = product.specifications || [];
  check(
    specs.some((s) => s.value === variant.sizeLabelPlain),
    `${variant.sku}: spec table states the selected size`,
  );
  check(
    specs.some((s) => s.value === `${builtUpAreaSqFt(variant)} sq ft`),
    `${variant.sku}: spec table states the built-up area`,
  );
  const dimensionRows = specs.filter((s) => /^dimensions?\b/i.test(s.label));
  check(dimensionRows.length === 1, `${variant.sku}: exactly ONE dimensions row (no parent leak)`);

  // A variant must never appear in the catalogue array — that is what would duplicate it
  // into the marketplace grid, the category counts and the related rails.
  check(
    !products.some((p) => p.id === variant.variantId),
    `${variant.sku}: is NOT a row in the products catalogue`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 5. MONEY — one number, or none at all
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("5. Money");

for (const { family, variant } of ALL) {
  const commerce = getCommerce(variant.variantId);
  check(!!commerce, `${variant.sku}: has a commerce row`);
  if (!commerce) continue;

  const baseRupees = variantBaseRupees(variant);
  const priced = variantIsPurchasable(family, variant);
  /* SEARCH-ELIGIBLE = priced AND editorially approved. The schema builder returns null for
   * anything else, because a Product node with no offer is rejected by Google outright. Price
   * availability and SEO readiness are separate gates: see SizeVariant.contentComplete. */
  const searchEligible = priced && variantIsContentComplete(variant);
  const schema = generateSizeVariantProductSchema(family, variant, ["/images/products/x.webp"]);
  const totals = computeTotals({ items: [{ productId: variant.variantId, quantity: 1 }], pincode: "560001" });

  if (priced && baseRupees !== undefined) {
    const expected = sellPrice(baseRupees);

    check(isPurchasable(variant.variantId), `${variant.sku}: priced ⇒ purchasable`);
    check(isOutrightSale(variant.variantId), `${variant.sku}: priced ⇒ an outright sale, not rent`);
    check(commerce.basePrice === baseRupees, `${variant.sku}: commerce base price == stored paise / 100`);
    if (searchEligible) {
      check(
        (schema as { offers?: { price?: string } } | null)?.offers?.price === priceForFeed(expected),
        `${variant.sku}: JSON-LD offer price == sellPrice(base)`,
      );
    } else {
      check(schema === null, `${variant.sku}: priced but not content-complete ⇒ NO Product node`);
    }
    check(totals.skipped.length === 0, `${variant.sku}: checkout accepts it`);
    check(
      totals.lines[0]?.unitPrice === expected,
      `${variant.sku}: checkout unit price == sellPrice(base)`,
    );
    check(totals.lines[0]?.sku === variant.sku, `${variant.sku}: checkout line carries the variant SKU`);
    check(Number.isInteger(variant.basePricePaise), `${variant.sku}: base price stored as an integer`);
    check(
      (variant.basePricePaise as number) % 100 === 0,
      `${variant.sku}: base price is a whole number of rupees`,
    );
  } else {
    /* ── THE GATE ──────────────────────────────────────────────────────────────────────
     * An unpriced size must leak NOTHING: no price, no Offer, no Add to Cart, no feed row,
     * no chargeable checkout line. This is the assertion that stops an unconfirmed figure
     * ever reaching Google. */
    check(!isPurchasable(variant.variantId), `${variant.sku}: unpriced ⇒ NOT purchasable`);
    check(!isOutrightSale(variant.variantId), `${variant.sku}: unpriced ⇒ not an outright sale`);
    check(commerce.priceConfirmed === false, `${variant.sku}: unpriced ⇒ priceConfirmed is false`);
    check(schema === null, `${variant.sku}: unpriced ⇒ NO Product node at all in the JSON-LD`);
    check(!variantIsFeedEligible(family, variant), `${variant.sku}: unpriced ⇒ not feed-eligible`);
    check(
      !feedEligible().some((c) => c.id === variant.variantId),
      `${variant.sku}: unpriced ⇒ absent from feedEligible()`,
    );
    check(totals.lines.length === 0, `${variant.sku}: unpriced ⇒ nothing chargeable`);
    check(totals.skipped.length === 1, `${variant.sku}: unpriced ⇒ checkout refuses it`);
    check(!totals.payable, `${variant.sku}: unpriced ⇒ order is not payable`);
  }
}

/* THE FLIP: prove that supplying a price turns the whole chain on — pure predicates, on a
 * synthetic family, so the assertion holds for whatever the owner enters later. */
{
  const base: SizeVariant = {
    variantId: "TEST-1", sku: "TEST-1",
    sizeLabel: "20 ft × 10 ft", sizeLabelPlain: "20 ft x 10 ft", sizeSlug: "20x10-ft",
    lengthFt: 20, widthFt: 10,
    basePricePaise: undefined, priceConfirmed: false,
    availability: "in_stock", leadTime: "7 days",
    additionalImages: [], specifications: [], includedConfiguration: [],
    cartEligible: true, merchantEligible: true, published: true,
  };
  const fam = { ...PRODUCT_FAMILIES[0], variants: [base] };

  check(!variantIsPurchasable(fam, base), "flip: no price ⇒ not purchasable");
  check(!variantIsFeedEligible(fam, base), "flip: no price ⇒ not feed-eligible");

  const pricedNoPhoto: SizeVariant = { ...base, basePricePaise: 22_500_000, priceConfirmed: true };
  check(variantIsPurchasable(fam, pricedNoPhoto), "flip: price confirmed ⇒ purchasable");
  check(variantBaseRupees(pricedNoPhoto) === 225000, "flip: 2,25,00,000 paise ⇒ ₹2,25,000");
  check(sellPrice(225000) === 265500, "flip: ₹2,25,000 + 18% GST ⇒ ₹2,65,500 (the brief's worked example)");
  check(priceForFeed(265500) === "265500.00", "flip: feed serialises as 265500.00");
  check(
    !variantIsFeedEligible(fam, pricedNoPhoto),
    "flip: priced but no variant photograph ⇒ still NOT fed",
  );

  const photographed: SizeVariant = { ...pricedNoPhoto, mainImage: "/images/products/real.webp" };
  /* THE SECOND GATE. Price and photograph are necessary but NOT sufficient: contentComplete is
   * an independent editorial approval, defaulting to false, so a fully priced and photographed
   * size is still withheld until someone confirms the page copy is genuinely size-specific. */
  check(
    !variantIsFeedEligible(fam, photographed),
    "flip: priced + photographed but NOT content-complete ⇒ still NOT fed",
  );
  check(!variantIsContentComplete(photographed), "flip: contentComplete defaults to false when unset");

  const fedReady: SizeVariant = { ...photographed, contentComplete: true };
  check(variantIsFeedEligible(fam, fedReady), "flip: priced + photographed + approved ⇒ feed-eligible");
  check(variantIsContentComplete(fedReady), "flip: contentComplete true once set explicitly");

  // Fractional rupees are refused rather than rounded.
  check(
    variantBaseRupees({ ...pricedNoPhoto, basePricePaise: 22_500_050 }) === undefined,
    "flip: a non-whole-rupee paise value is refused, never rounded",
  );
  check(
    variantBaseRupees({ ...pricedNoPhoto, basePricePaise: 0 }) === undefined,
    "flip: a zero price is refused",
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 6. STRUCTURED DATA
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("6. Structured data");

for (const family of publishedFamilies()) {
  const group = generateProductGroupSchema(family, ["/images/products/x.webp"]) as Record<string, unknown>;

  check(group["@type"] === "ProductGroup", `${family.productGroupId}: @type is ProductGroup`);
  check(group["@id"] === productGroupNodeId(family), `${family.productGroupId}: stable @id`);
  check(group.productGroupID === family.productGroupId, `${family.productGroupId}: productGroupID present`);
  check(typeof group.name === "string" && !!group.name, `${family.productGroupId}: group name present`);
  check(typeof group.description === "string" && !!group.description, `${family.productGroupId}: group description present`);
  check(!!group.brand, `${family.productGroupId}: brand present`);
  check(group.material === family.material, `${family.productGroupId}: material present`);
  check(
    Array.isArray(group.variesBy) && (group.variesBy as string[]).includes("https://schema.org/size"),
    `${family.productGroupId}: variesBy declares size`,
  );
  /* hasVariant lists SEARCH-ELIGIBLE sizes only — priced AND editorially approved. Each entry
   * is a full Product node to a validator, so an unpriced or unfinished size listed here would
   * be published as an invalid item inside the group. */
  const eligibleSizes = publishedVariants(family).filter(
    (v) => variantIsPurchasable(family, v) && variantIsContentComplete(v),
  );
  check(
    Array.isArray(group.hasVariant) && (group.hasVariant as unknown[]).length === eligibleSizes.length,
    `${family.productGroupId}: hasVariant lists exactly the search-eligible sizes (${eligibleSizes.length})`,
  );
  check(
    (group.hasVariant as { offers?: unknown }[] | undefined)?.every((v) => !!v.offers) ?? true,
    `${family.productGroupId}: every hasVariant entry carries its own Offer`,
  );
  check(!("offers" in group), `${family.productGroupId}: the ProductGroup itself carries no Offer`);
  check(!("aggregateRating" in group), `${family.productGroupId}: no fabricated aggregateRating`);

  for (const variant of publishedVariants(family)) {
    const raw = generateSizeVariantProductSchema(family, variant, ["/images/products/x.webp"]);

    /* A size that is unpriced or not editorially approved emits NO Product node. That is the
     * whole point of the gate — assert the absence, then move on. */
    if (!(variantIsPurchasable(family, variant) && variantIsContentComplete(variant))) {
      check(raw === null, `${variant.sku}: withheld from search ⇒ no Product node emitted`);
      continue;
    }

    const node = raw as Record<string, unknown>;
    const isVariantOf = node.isVariantOf as Record<string, unknown> | undefined;

    check(node["@type"] === "Product", `${variant.sku}: @type is Product`);
    check(node.url === `${SITE}${variantPath(family, variant)}`, `${variant.sku}: url is the variant canonical`);
    check(node.sku === variant.sku, `${variant.sku}: sku present`);
    check(node.mpn === (variant.mpn ?? variant.sku), `${variant.sku}: mpn present (never fabricated)`);
    check(node.size === variant.sizeLabelPlain, `${variant.sku}: size states the selected size`);
    check(node.material === family.material, `${variant.sku}: material present`);
    check(node.itemCondition === "https://schema.org/NewCondition", `${variant.sku}: condition is New`);
    check(!!isVariantOf, `${variant.sku}: has isVariantOf`);
    check(
      isVariantOf?.["@id"] === productGroupNodeId(family),
      `${variant.sku}: isVariantOf points at the SAME group @id the parent page emits`,
    );
    check(
      isVariantOf?.productGroupID === family.productGroupId,
      `${variant.sku}: isVariantOf carries the productGroupID`,
    );

    // Things that must NEVER appear on a size page.
    check(!("aggregateOffer" in node), `${variant.sku}: no AggregateOffer`);
    check(!("aggregateRating" in node), `${variant.sku}: no fabricated aggregateRating`);
    check(!("review" in node), `${variant.sku}: no fabricated reviews`);
    check(!("gtin" in node) && !("gtin13" in node), `${variant.sku}: no fabricated GTIN`);

    const offers = node.offers as Record<string, unknown> | undefined;
    if (offers) {
      check(offers["@type"] === "Offer", `${variant.sku}: a single Offer, not an array`);
      check(offers.url === node.url, `${variant.sku}: offer URL == the selected variant URL`);
      check(offers.priceCurrency === "INR", `${variant.sku}: priceCurrency is INR`);
      check(!!offers.availability, `${variant.sku}: availability stated`);
      check(offers.itemCondition === "https://schema.org/NewCondition", `${variant.sku}: offer condition New`);
      check(!!offers.hasMerchantReturnPolicy, `${variant.sku}: return policy references the real /refund-policy`);
    }
  }
}

/* The group node emitted on the PARENT page and on a SIZE page must be identical — two
 * different group objects would split one ladder into two groups. */
{
  const family = publishedFamilies()[0];
  const fromParent = JSON.stringify(generateProductGroupSchema(family, ["/a.webp"]));
  const fromVariant = JSON.stringify(generateProductGroupSchema(family, ["/a.webp"]));
  check(fromParent === fromVariant, "the ProductGroup node is identical on the parent and on a size page");
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 7. METADATA — canonical, title, indexability
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("7. Metadata");

{
  const titles = new Set<string>();

  for (const { family, variant } of ALL) {
    const parent = products.find((p) => p.id === family.parentProductId)!;

    if (variant.rendersAtParent) {
      /* This size's page IS the family's parent page, so its metadata is that page's — built by
       * buildProductPageMetadata, not by the variant builder. Its canonical is the parent URL,
       * which for this size is a genuine SELF-canonical: that page is where it is sold. */
      const meta = buildProductPageMetadata(parent, `/products/${family.slug}`);
      const canonical = (meta.alternates as { canonical?: string } | undefined)?.canonical;
      check(
        canonical === `${SITE}${variantPath(family, variant)}`,
        `${variant.sku}: canonical is self-referencing on the page that serves it`,
      );
      // buildPageMetadata returns `{ absolute: "…" }` when given an absoluteTitle.
      const titleText =
        typeof meta.title === "string"
          ? meta.title
          : ((meta.title as { absolute?: string } | undefined)?.absolute ?? "");
      check(
        titleText.includes(variant.sizeLabelPlain),
        `${variant.sku}: the page <title> states its size (got "${titleText}")`,
      );
      check(
        (meta.robots as { index?: boolean } | undefined)?.index === true,
        `${variant.sku}: indexable`,
      );
      continue;
    }

    const meta = buildVariantPageMetadata(family, variant, variantAsProduct({ family, variant }, parent));
    const canonical = (meta.alternates as { canonical?: string } | undefined)?.canonical;
    const robots = meta.robots as { index?: boolean; follow?: boolean } | undefined;

    check(
      canonical === `${SITE}${variantPath(family, variant)}`,
      `${variant.sku}: canonical is SELF-referencing (not the parent)`,
    );
    check(canonical !== `${SITE}/products/${family.slug}`, `${variant.sku}: canonical is NOT the parent page`);
    /* Indexability follows the search gate: a size is indexable once it has a confirmed price
     * AND its page has been editorially approved. Until then it is noindex,follow — crawlable
     * and passing link equity, but withheld from the index. */
    const searchEligible = variantIsPurchasable(family, variant) && variantIsContentComplete(variant);
    check(
      robots?.index === searchEligible,
      `${variant.sku}: ${searchEligible ? "indexable once priced and approved" : "noindex while withheld from search"}`,
    );
    check(robots?.follow === true, `${variant.sku}: always follow — link equity still flows`);
    check(robots?.follow === true, `${variant.sku}: followable`);

    const title = variantPageTitle(family, variant);
    check(title.includes(variant.sizeLabelPlain), `${variant.sku}: <title> states the size`);
    check(!titles.has(title), `${variant.sku}: <title> is unique`);
    titles.add(title);

    const description = String(meta.description ?? "");
    check(description.length > 0 && description.length <= 160, `${variant.sku}: description fits a snippet`);
    check(description.includes(variant.sizeLabelPlain), `${variant.sku}: description states the size`);
    if (!variantIsPurchasable(family, variant)) {
      check(!/₹/.test(description), `${variant.sku}: unpriced ⇒ no ₹ figure in the meta description`);
    }
  }

  // The PARENT keeps its own canonical — the group overview is a page in its own right.
  for (const family of publishedFamilies()) {
    const parent = products.find((p) => p.id === family.parentProductId)!;
    const meta = buildProductPageMetadata(parent, `/products/${family.slug}`);
    const canonical = (meta.alternates as { canonical?: string } | undefined)?.canonical;
    check(canonical === `${SITE}/products/${family.slug}`, `${family.productGroupId}: parent canonical is self-referencing`);
    check(!titles.has(String(meta.title)), `${family.productGroupId}: parent title differs from every size title`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 8. FEED TITLES — length + no price/promo claims (the strict-eligibility guard)
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("8. Feed titles");

{
  const PRICE_CLAIMS = [/₹/, /\bRs\.?\s*\d/i, /\bstarting\s+(from|at)\b/i, /\bper\s+sq\.?\s*(ft|feet)\b/i, /\d[\d,.]*\s*(lakh|crore)s?\b/i];
  const PROMO = [/%/, /\bcheap(er|est)?\b/i, /\bbest\b/i, /\bdiscount/i, /(?<!-)\bfree\b/i, /\boffer\s+(ends|valid)\b/i];

  for (const { family, variant } of ALL) {
    const title = variantFeedTitle(family, variant);
    check(title.length <= 150, `${variant.sku}: feed title is ${title.length} chars (max 150)`);
    check(title.includes(variant.sizeLabelPlain), `${variant.sku}: feed title states the size`);
    for (const re of PRICE_CLAIMS) check(!re.test(title), `${variant.sku}: feed title carries no price claim (${re})`);
    for (const re of PROMO) check(!re.test(title), `${variant.sku}: feed title carries no promotional word (${re})`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 9. RELATED FAMILIES — genuinely different products, never synonyms
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("9. Related product families");

for (const family of publishedFamilies()) {
  check(family.relatedProductIds.length > 0, `${family.productGroupId}: declares related products`);
  for (const id of family.relatedProductIds) {
    const related = products.find((p) => p.id === id);
    check(!!related, `${family.productGroupId}: related product id "${id}" exists in the catalogue`);
    check(id !== family.parentProductId, `${family.productGroupId}: does not link to itself`);
  }
  check(
    new Set(family.relatedProductIds).size === family.relatedProductIds.length,
    `${family.productGroupId}: no duplicate related ids`,
  );
  // Synonyms must be synonyms — never a slug that resolves to its own product page.
  for (const alias of family.searchAliases) {
    const aliasSlug = alias.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    check(
      !PRODUCT_FAMILIES.some((f) => f.slug === aliasSlug),
      `${family.productGroupId}: alias "${alias}" has NOT been turned into its own family`,
    );
  }
  check(
    publishedVariants(family).some((v) => v.sizeSlug === family.defaultVariantSlug),
    `${family.productGroupId}: defaultVariantSlug points at a published size`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 10. MERCHANT FEED
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("10. Merchant feed");

await (async () => {
  const xml = await merchantFeedGET().text();
  const items = xml.split("<item>").slice(1).map((chunk) => chunk.split("</item>")[0]);
  const tag = (item: string, name: string): string | undefined =>
    item.match(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`))?.[1];

  console.log(`  (feed contains ${items.length} item(s))`);

  const ids = items.map((i) => tag(i, "id")).filter(Boolean) as string[];
  const links = items.map((i) => tag(i, "link")).filter(Boolean) as string[];
  check(new Set(ids).size === ids.length, "every feed item has a unique g:id");
  check(new Set(links).size === links.length, "every feed item has a unique g:link");
  check(ids.length === items.length, "every feed item HAS a g:id");

  // Feed prices agree with sellPrice() and therefore with the page, the Offer and checkout.
  for (const item of items) {
    const id = tag(item, "id")!;
    const commerce = PRODUCT_COMMERCE.find((c) => c.sku === id);
    check(!!commerce, `feed ${id}: maps back to a commerce row`);
    if (!commerce) continue;
    const price = tag(item, "price");
    check(
      price === `${priceForFeed(sellPrice(commerce.basePrice))} INR`,
      `feed ${id}: g:price == sellPrice(base) with an INR suffix`,
    );
    check(/^\d+\.\d{2} INR$/.test(price ?? ""), `feed ${id}: price is serialised as "<amount>.00 INR"`);
    check(tag(item, "condition") === "new", `feed ${id}: condition is new`);
    check(!!tag(item, "availability"), `feed ${id}: availability stated`);
    check(!!tag(item, "brand"), `feed ${id}: brand stated`);
    check(!!tag(item, "google_product_category"), `feed ${id}: Google category stated`);
    check(!!tag(item, "product_type"), `feed ${id}: product type stated`);
    check(item.includes("<g:shipping>"), `feed ${id}: carries real shipping information`);
  }

  /* Variant grouping.
   *
   * TWO independent gates decide whether a size is fed, and the test must respect both:
   *   • variantIsFeedEligible()  — the FAMILY gate: published, priced, in stock, has an image.
   *   • feedExclusionFor(sku)    — the ADVERTISEMENT policy in merchantFeedPolicy.ts, which can
   *                                hold back a perfectly sellable SKU (a pending image review,
   *                                a manual submission, a city page).
   * A size passing the first but held by the second is CORRECTLY absent from the feed. Asserting
   * on the family gate alone would demand that the policy be overridden. */
  for (const family of publishedFamilies()) {
    const fedSizes = publishedVariants(family).filter(
      (v) => variantIsFeedEligible(family, v) && !feedExclusionFor(v.sku),
    );
    const heldByPolicy = publishedVariants(family).filter(
      (v) => variantIsFeedEligible(family, v) && !!feedExclusionFor(v.sku),
    );
    const fedItems = items.filter((i) => tag(i, "item_group_id") === family.productGroupId);

    check(
      fedItems.length === fedSizes.length,
      `${family.productGroupId}: feed carries exactly the ${fedSizes.length} eligible, non-held size(s)`,
    );
    for (const held of heldByPolicy) {
      check(
        !ids.includes(held.sku),
        `${family.productGroupId}: ${held.sku} is sellable but held by merchantFeedPolicy — correctly absent`,
      );
    }

    if (fedSizes.length > 0) {
      const groupIds = new Set(fedItems.map((i) => tag(i, "item_group_id")));
      check(groupIds.size === 1, `${family.productGroupId}: all sizes share ONE item_group_id`);
      const titles = new Set(fedItems.map((i) => tag(i, "item_group_title")));
      check(titles.size === 1, `${family.productGroupId}: all sizes share ONE item_group_title`);
      const sizes = fedItems.map((i) => tag(i, "size"));
      check(new Set(sizes).size === sizes.length, `${family.productGroupId}: every size value is distinct`);
      for (const item of fedItems) {
        check(!!tag(item, "variant_option"), `${family.productGroupId}: variant_option submitted`);
      }
    }


    // Every held-back size must be absent, whatever the reason.
    for (const variant of publishedVariants(family).filter((v) => !variantIsFeedEligible(family, v))) {
      check(!ids.includes(variant.sku), `feed excludes ${variant.sku} (held back)`);
    }
  }

  // A non-variant item must not carry grouping attributes (a group of one).
  for (const item of items) {
    const id = tag(item, "id")!;
    const isVariant = ALL.some(({ variant }) => variant.sku === id);
    if (!isVariant) {
      check(!tag(item, "item_group_id"), `feed ${id}: a standalone product carries no item_group_id`);
    }
  }

  check(xml.startsWith("<?xml"), "feed is well-formed XML");
  check(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(xml), "feed contains no unescaped ampersand");
})();

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 10b. THE PRICED-VARIANT FEED CHECKLIST
 *
 * Every attribute the owner requires on an eligible feed variant, asserted item by item
 * against the REAL generated feed. This section is what must go green before any newly
 * priced size is submitted; it exercises whichever sizes are eligible TODAY and will pick
 * up each new one automatically as prices are confirmed.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("10b. Priced-variant feed checklist");

await (async () => {
  const xml = await merchantFeedGET().text();
  const items = xml.split("<item>").slice(1).map((chunk) => chunk.split("</item>")[0]);
  const tag = (item: string, name: string): string | undefined =>
    item.match(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`))?.[1];

  const bySku = new Map(items.map((i) => [tag(i, "id") ?? "", i]));
  const fedVariants = ALL.filter(
    ({ family, variant }) => variantIsFeedEligible(family, variant) && !feedExclusionFor(variant.sku),
  );

  if (fedVariants.length === 0) {
    console.log(
      "  (no size is BOTH family-eligible and clear of merchantFeedPolicy yet — the checklist below\n" +
        "   runs automatically as soon as one is. Every gated size is asserted absent in §5 and §10.)",
    );
  }

  const groupIds = new Set<string>();
  const feedIds = new Set<string>();
  const feedLinks = new Set<string>();

  for (const { family, variant } of fedVariants) {
    const item = bySku.get(variant.sku);
    check(!!item, `${variant.sku}: is present in the feed`);
    if (!item) continue;

    const commerce = getCommerce(variant.variantId)!;
    const expectedPrice = `${priceForFeed(sellPrice(commerce.basePrice))} INR`;
    const expectedLink = `${SITE}${variantPath(family, variant)}`;

    // 1. Unique <g:id>
    check(!feedIds.has(variant.sku), `${variant.sku}: <g:id> is unique across the feed`);
    feedIds.add(variant.sku);
    check(tag(item, "id") === variant.sku, `${variant.sku}: <g:id> is the variant SKU`);

    // 2. Same <g:item_group_id> across every size of the family
    check(
      tag(item, "item_group_id") === family.productGroupId,
      `${variant.sku}: <g:item_group_id> is ${family.productGroupId}`,
    );
    groupIds.add(tag(item, "item_group_id") ?? "");
    check(
      tag(item, "item_group_title") === family.groupTitle,
      `${variant.sku}: <g:item_group_title> is the family name`,
    );

    // 3. Exact <g:size>
    check(tag(item, "size") === variant.sizeLabelPlain, `${variant.sku}: <g:size> is exactly "${variant.sizeLabelPlain}"`);
    check(
      tag(item, "variant_option") === `Dimensions: ${variant.sizeLabelPlain}`,
      `${variant.sku}: <g:variant_option> restates the same dimension`,
    );

    // 4. Size included in <g:title>
    check(
      (tag(item, "title") ?? "").includes(variant.sizeLabelPlain),
      `${variant.sku}: <g:title> contains the size`,
    );
    check((tag(item, "title") ?? "").length <= 150, `${variant.sku}: <g:title> within 150 chars`);

    // 5. Direct self-canonical variant <g:link>
    check(tag(item, "link") === expectedLink, `${variant.sku}: <g:link> is its own canonical URL`);
    check(!feedLinks.has(expectedLink), `${variant.sku}: <g:link> is unique across the feed`);
    feedLinks.add(expectedLink);
    check(/^https:\/\//.test(tag(item, "link") ?? ""), `${variant.sku}: <g:link> is absolute https`);

    // 6. Exact GST-inclusive <g:price>
    check(tag(item, "price") === expectedPrice, `${variant.sku}: <g:price> is ${expectedPrice}`);
    check(
      tag(item, "price") === `${priceForFeed(sellPrice(commerce.basePrice))} INR`,
      `${variant.sku}: <g:price> is sellPrice(base), i.e. GST-inclusive`,
    );

    // 7. Matching <g:availability>
    check(
      tag(item, "availability") === (variant.availability === "in_stock" ? "in_stock" : "out_of_stock"),
      `${variant.sku}: <g:availability> matches the variant's real availability`,
    );

    // 8. Correct product image — present, absolute, and not a rotating bundler hash
    const image = tag(item, "image_link") ?? "";
    check(/^https:\/\//.test(image), `${variant.sku}: <g:image_link> is an absolute https URL`);
    check(!image.includes("/_next/"), `${variant.sku}: <g:image_link> is a stable URL, not a build hash`);
    check(!image.includes("placeholder"), `${variant.sku}: <g:image_link> is not a placeholder`);

    // 9. Active Add to Cart and Buy Now — gated by the SAME predicate the CTAs use
    check(isPurchasable(variant.variantId), `${variant.sku}: is purchasable ⇒ Add to Cart / Buy Now render`);
    check(isOutrightSale(variant.variantId), `${variant.sku}: the price is an outright sale price`);

    // 10. Matching price in JSON-LD, cart, checkout and Razorpay
    const schema = generateSizeVariantProductSchema(family, variant, [image]) as {
      offers?: { price?: string; priceCurrency?: string; url?: string };
    };
    const totals = computeTotals({ items: [{ productId: variant.variantId, quantity: 1 }], pincode: "560001" });
    check(
      schema.offers?.price === priceForFeed(sellPrice(commerce.basePrice)),
      `${variant.sku}: JSON-LD Offer price == <g:price>`,
    );
    check(schema.offers?.priceCurrency === "INR", `${variant.sku}: JSON-LD currency INR`);
    check(schema.offers?.url === expectedLink, `${variant.sku}: JSON-LD offer URL == <g:link>`);
    check(
      totals.lines[0]?.unitPrice === sellPrice(commerce.basePrice),
      `${variant.sku}: cart/checkout unit price == <g:price>`,
    );
    check(
      totals.amountPaise === (totals.grandTotal * 100),
      `${variant.sku}: the Razorpay paise amount is derived from the same total`,
    );
    check(totals.payable, `${variant.sku}: the order is payable online end to end`);
  }

  if (fedVariants.length > 1) {
    check(groupIds.size === 1, "every fed size of a family shares ONE item_group_id");
  }
})();

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 10c. PER-SIZE STRUCTURED-DATA CHECKLIST
 *
 * The owner's required set, asserted on EVERY published size — priced or not.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("10c. Per-size structured-data checklist");

for (const { family, variant } of ALL) {
  const label = `${variant.sku} (${variant.sizeLabelPlain})`;
  const group = generateProductGroupSchema(family, ["/images/products/x.webp"]) as Record<string, unknown>;

  /* A parent-rendered size's Product node is produced by generateProductStructuredData with
   * `sizeVariantOf`; every other size uses the variant builder. Both must satisfy the SAME
   * checklist, so the two shapes are normalised here rather than tested separately. */
  /* A size served at the PARENT keeps its Product node there (generateProductStructuredData
   * with `sizeVariantOf`), so the checklist still applies to it. A size on its own URL only
   * has a node when it is search-eligible — priced AND editorially approved. When it is not,
   * the correct assertion is that nothing was emitted. */
  const searchEligible = variantIsPurchasable(family, variant) && variantIsContentComplete(variant);
  if (!variant.rendersAtParent && !searchEligible) {
    check(
      generateSizeVariantProductSchema(family, variant, ["/images/products/x.webp"]) === null,
      `${label}: withheld from search ⇒ emits no Product node to check`,
    );
    continue;
  }

  const node = (
    variant.rendersAtParent
      ? {
          sku: getCommerce(variant.variantId)?.sku,
          size: getCommerce(variant.variantId)?.size,
          isVariantOf: {
            "@id": productGroupNodeId(family),
            productGroupID: family.productGroupId,
          },
        }
      : generateSizeVariantProductSchema(family, variant, ["/images/products/x.webp"])
  ) as Record<string, unknown>;
  const isVariantOf = node.isVariantOf as Record<string, unknown> | undefined;

  // a. a unique variant SKU
  check(node.sku === variant.sku, `${label}: carries its own unique SKU`);
  // b. productGroupID
  check(group.productGroupID === family.productGroupId, `${label}: ProductGroup carries productGroupID`);
  check(
    isVariantOf?.productGroupID === family.productGroupId,
    `${label}: isVariantOf carries the same productGroupID`,
  );
  // c. variesBy: https://schema.org/size
  check(
    Array.isArray(group.variesBy) && (group.variesBy as string[]).includes("https://schema.org/size"),
    `${label}: variesBy is https://schema.org/size`,
  );
  // d. isVariantOf
  check(
    isVariantOf?.["@id"] === productGroupNodeId(family),
    `${label}: isVariantOf binds to the family's stable group @id`,
  );
  // e. the size itself
  check(node.size === variant.sizeLabelPlain, `${label}: states its own size`);
  // f. crawlable references to the OTHER variant URLs
  const hasVariant = (group.hasVariant ?? []) as Array<{ url?: string; sku?: string }>;
  /* Only SEARCH-ELIGIBLE siblings are referenced. An unpriced or unapproved size listed here
   * would be a Product node with no offer nested inside the group — invalid to Google. */
  const eligibleSiblings = publishedVariants(family).filter(
    (v) => variantIsPurchasable(family, v) && variantIsContentComplete(v),
  );
  check(
    hasVariant.length === eligibleSiblings.length,
    `${label}: hasVariant references every search-eligible size (${eligibleSiblings.length})`,
  );
  for (const sibling of eligibleSiblings) {
    check(
      hasVariant.some((v) => v.url === `${SITE}${variantPath(family, sibling)}`),
      `${label}: hasVariant references ${sibling.sizeSlug} at its canonical URL`,
    );
  }
  check(
    hasVariant.every((v) => typeof v.url === "string" && v.url.startsWith("https://")),
    `${label}: every hasVariant reference is an absolute, crawlable URL`,
  );
  // An UNPUBLISHED size must never be advertised as a variant.
  for (const unpublished of family.variants.filter((v) => !v.published)) {
    check(
      !hasVariant.some((v) => v.url?.endsWith(`/${unpublished.sizeSlug}`)),
      `${label}: hasVariant does NOT reference the unpublished ${unpublished.sizeSlug}`,
    );
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 10d. HEIGHT — never asserted until it is confirmed
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("10d. Height is never invented");

for (const { family, variant } of ALL) {
  const height = variantHeightFt(family, variant);
  const confirmed = variant.heightFt !== undefined || family.heightConfirmedPerSize;

  check(confirmed === (height !== undefined), `${variant.sku}: a height is returned only when confirmed`);

  if (!confirmed) {
    const dims = variantDimensionsPlain(family, variant);
    check(dims === variant.sizeLabelPlain, `${variant.sku}: dimensions are L x W only while height is unconfirmed`);
    check(!/\bx\s*\d+(\.\d+)?\s*ft\s*$/.test(dims.replace(variant.sizeLabelPlain, "")), `${variant.sku}: no height appended`);

    const schema = generateSizeVariantProductSchema(family, variant, []) as Record<string, unknown> | null;
    if (!variant.rendersAtParent) {
      /* Withheld sizes emit no node at all, which trivially carries no invented height. */
      check(
        schema === null || !("height" in schema),
        `${variant.sku}: no height property in the structured data`,
      );
    }
    const commerce = getCommerce(variant.variantId);
    check(
      !/\b9\s*ft\b/.test(commerce?.size ?? ""),
      `${variant.sku}: the old assumed 9 ft height is gone from the commerce size (${commerce?.size})`,
    );
    // The family standard IS shown, but only as a clearly qualified row.
    const specs = variantOwnSpecs(family, variant);
    const heightRow = specs.find((s) => s.label === "Standard Height");
    check(!!heightRow, `${variant.sku}: the family standard height is shown as a separate, qualified row`);
    check(
      heightRow?.value.includes("8 ft 6 in") === true,
      `${variant.sku}: the family standard is stated as 8 ft 6 in`,
    );
    check(
      heightRow?.value.includes("confirm for this size") === true,
      `${variant.sku}: that row says it is not confirmed for this size`,
    );
  }
}

check(formatFeet(8.5) === "8 ft 6 in", "formatFeet(8.5) renders as 8 ft 6 in");
check(formatFeet(9) === "9 ft", "formatFeet(9) renders as 9 ft");

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 10e. PARENT-RENDERED SIZES MUST HAVE A REAL 301
 *
 * A size served at its family's parent page is NOT prerendered at its ladder-shaped URL —
 * a `permanentRedirect()` inside the route is swallowed during static generation (Next
 * answers the prerendered path with the not-found body at HTTP 200), so the redirect lives
 * in next.config.ts instead. That is the only place the two can drift, so it is read back
 * here: a family that gains a `rendersAtParent` size without a matching rule fails this test
 * rather than shipping a 404 on a guessable URL.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("10e. Parent-rendered size redirects");

await (async () => {
  const configSource = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  for (const { family, variant } of ALL) {
    if (!variant.rendersAtParent) continue;
    const from = `/products/${family.slug}/${variant.sizeSlug}`;
    const to = `/products/${family.slug}`;
    const rule = new RegExp(
      `source:\\s*"${from.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"[^}]*destination:\\s*"${to.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"[^}]*statusCode:\\s*301`,
    );
    check(rule.test(configSource), `${variant.sku}: next.config.ts 301s ${from} → ${to}`);
    check(
      !allVariantParams().some((p) => `${p.slug}/${p.child}` === `${family.slug}/${variant.sizeSlug}`),
      `${variant.sku}: its ladder URL is NOT prerendered (which would swallow the redirect)`,
    );
  }
})();

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 11. SITEMAP
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("11. Sitemap");

await (async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  const counts = new Map<string, number>();
  for (const url of urls) counts.set(url, (counts.get(url) ?? 0) + 1);

  /* A size appears in the sitemap only when it is SEARCH-ELIGIBLE — priced AND editorially
   * approved. A withheld size is served noindex, and submitting a URL we are asking Google not
   * to index is a direct contradiction, so its absence here is the assertion. */
  for (const { family, variant } of ALL) {
    const url = `${SITE}${variantPath(family, variant)}`;
    /* A parent-rendered size has NO url of its own — variantPath() returns the parent's, which
     * is always listed. Only sizes with their own URL can be withheld. */
    const eligible =
      variant.rendersAtParent ||
      (variantIsPurchasable(family, variant) && variantIsContentComplete(variant));
    if (eligible) {
      check(counts.get(url) === 1, `sitemap lists ${variantPath(family, variant)} exactly once`);
    } else {
      check(
        counts.get(url) === undefined,
        `sitemap omits ${variantPath(family, variant)} while it is withheld from search`,
      );
    }
  }

  for (const family of publishedFamilies()) {
    check(counts.get(`${SITE}/products/${family.slug}`) === 1, `sitemap still lists the parent /products/${family.slug}`);
    for (const variant of family.variants.filter((v) => !v.published)) {
      check(
        !counts.has(`${SITE}${variantPath(family, variant)}`),
        `sitemap omits the unpublished size ${variant.sizeSlug}`,
      );
    }
  }

  // Nothing the size work touched may have removed an existing URL.
  check(urls.some((u) => u.endsWith("/products/portable-cabin/price-and-cost-guide")), "sitemap still lists the guide pages");
  check(urls.some((u) => u === `${SITE}/products`), "sitemap still lists /products");
  check(urls.every((u) => !u.includes("?")), "no query-parameter URL entered the sitemap");
  check(urls.every((u) => !u.endsWith(".html")), "no .html URL entered the sitemap");
})();

/* ══════════════════════════════════════════════════════════════════════════════════════
 * 12. NO REGRESSION IN THE EXISTING CATALOGUE
 * ══════════════════════════════════════════════════════════════════════════════════════ */
section("12. Existing catalogue untouched");

{
  // Every pre-existing product still resolves by id and still has its own commerce row.
  for (const product of products) {
    check(getProductById(product.id)?.sku === product.sku, `existing product ${product.sku} still resolves by id`);
  }
  // Spot-check a handful of long-standing purchasable SKUs.
  for (const sku of ["POC-PC-20EX", "POC-CO-GEN", "POC-SOC-20ST", "POC-VIP-40"]) {
    const commerce = PRODUCT_COMMERCE.find((c) => c.sku === sku);
    check(!!commerce, `commerce row ${sku} still present`);
    check(!!commerce && isPurchasable(commerce.id), `${sku} is still purchasable`);
  }
  check(feedEligible().length > 0, "the feed still has eligible SKUs");
}

/* ─────────────────────────────────────────────── report ─────────────────────────────── */
console.log(`\nproduct-variants.test.ts — ${passed} passed, ${failed} failed`);
if (failed) {
  console.log(
    "\nSIZE VARIANT SYSTEM REGRESSED. A failure here means the page, the JSON-LD, the Merchant\n" +
      "feed and the checkout can now disagree about a size or its price — do not deploy.",
  );
  process.exit(1);
}
