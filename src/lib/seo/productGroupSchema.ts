/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  ProductGroup + size-variant structured data — Google's MULTI-PAGE variant pattern.
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * Google supports two ways of describing a product that comes in several sizes. This site
 * uses the MULTI-PAGE one, because each standard size has its own indexable landing page:
 *
 *   • ONE `ProductGroup` node, with a stable `@id` and `productGroupID`, emitted on the
 *     parent page AND on every size page — byte-identical, so a crawler that sees two of
 *     the pages resolves them to the same group instead of two competing groups.
 *   • On a size page, ONE `Product` node whose `isVariantOf` points at that group `@id`,
 *     carrying that size's own name, URL, `size`, SKU and — when the size is genuinely
 *     purchasable — its `Offer`.
 *   • `hasVariant` lists the SIBLING size URLs, which is how Google discovers the rest of
 *     the group from any single page in it.
 *
 * ── WHAT THIS FILE WILL NOT DO ──────────────────────────────────────────────────────
 *   • No `AggregateOffer` on a size page. A size page describes ONE priced thing.
 *   • No `Offer` at all on a size the owner has not priced. A Product node with no offer
 *     is valid; an offer with an invented price is a misrepresentation.
 *   • No rating, no review, no GTIN, and no return or shipping claim that the business
 *     does not actually honour — shipping comes from the real zone table and returns from
 *     /refund-policy, both via the shared helpers in ./structured-data.
 *   • No second, conflicting `Product` node. The size page emits exactly one.
 *
 * The price, where present, is `sellPrice(basePrice)` — the SAME integer the page renders,
 * the cart charges, Razorpay is sent and the Merchant feed submits.
 */

import { getCommerce, isOutrightSale, BRAND } from "@/data/productCommerce";
import {
  builtUpAreaSqFt,
  publishedVariants,
  variantDescription,
  variantHeightFt,
  variantIsPurchasable,
  variantName,
  variantPath,
  type ProductFamily,
  type SizeVariant,
} from "@/data/productFamilies";
import { priceForFeed, sellPrice } from "@/lib/pricing/gst";
import { RETURN_POLICY, shippingDetailsForAllZones, SITE_URL } from "@/lib/seo/structured-data";

/** Absolute https URL. A crawler cannot resolve a root-relative image or link. */
function absolute(url: string): string {
  if (!url) return SITE_URL;
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * The group's stable `@id`. A fragment on the PARENT page URL, so it is unique site-wide,
 * human-readable in a rich-results test, and identical on every page of the group.
 */
export function productGroupNodeId(family: ProductFamily): string {
  return `${SITE_URL}/products/${family.slug}#product-group`;
}

/** The parent (overview) page URL of a family. */
export function familyUrl(family: ProductFamily): string {
  return `${SITE_URL}/products/${family.slug}`;
}

/** The absolute canonical URL of one size. */
export function variantUrl(family: ProductFamily, variant: SizeVariant): string {
  return `${SITE_URL}${variantPath(family, variant)}`;
}

/** `validFrom` for an Offer: today, as YYYY-MM-DD. Computed — a literal would go stale. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `priceValidUntil`: one year out, pairing with validFrom to state a coherent window. */
function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The `Offer` for one size — emitted ONLY when the size is genuinely payable online.
 *
 * Gated on BOTH `variantIsPurchasable()` (the family data) and `isOutrightSale()` (the
 * commerce catalogue), which are the same predicates that gate the visible price block,
 * the Add to Cart button and Merchant feed inclusion. They cannot disagree, so the page,
 * the schema, the cart and the feed cannot disagree either.
 */
function variantOffer(family: ProductFamily, variant: SizeVariant) {
  if (!variantIsPurchasable(family, variant)) return undefined;
  const commerce = getCommerce(variant.variantId);
  if (!commerce || !isOutrightSale(variant.variantId)) return undefined;

  const shipping = shippingDetailsForAllZones();

  return {
    "@type": "Offer",
    // The EXACT selected-variant URL — never the parent, never a sibling.
    url: variantUrl(family, variant),
    // GST-inclusive, rounded once in sellPrice(). Identical on the page, in the cart,
    // at Razorpay and in <g:price>.
    price: priceForFeed(sellPrice(commerce.basePrice)),
    priceCurrency: "INR",
    availability:
      variant.availability === "in_stock"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    validFrom: todayISO(),
    priceValidUntil: oneYearFromNow(),
    seller: { "@type": "Organization", name: BRAND, url: SITE_URL },
    // Real zone freight, or nothing at all when the zone partition could not be derived.
    ...(shipping.length > 0 ? { shippingDetails: shipping } : {}),
    // Mirrors /refund-policy exactly: made to order, so returns are not permitted.
    hasMerchantReturnPolicy: RETURN_POLICY,
  };
}

/**
 * A sibling reference: the minimum Google needs to follow the group to another size page.
 * Deliberately carries NO offer — the price of a sibling belongs on the sibling's own page,
 * and duplicating it here is how two pages end up quoting different numbers for one size.
 */
/**
 * One entry in ProductGroup.hasVariant.
 *
 * Carries the variant's own offer, because each of these is a full Product node to a
 * validator, not a pointer — and a Product with no offer, review or aggregateRating is
 * rejected ("Either 'offers', 'review' or 'aggregateRating' should be specified"). Five
 * unpriced container-office sizes were shipping exactly that, nested inside the group.
 *
 * Returns null for a size with no confirmed price, so it drops out of hasVariant instead of
 * being published as an invalid item. It reappears the moment a commerce record exists.
 */
function siblingVariantRef(family: ProductFamily, variant: SizeVariant) {
  const offer = variantOffer(family, variant);
  if (!offer) return null;

  return {
    "@type": "Product",
    "@id": `${variantUrl(family, variant)}#product`,
    name: variantName(family, variant),
    url: variantUrl(family, variant),
    sku: variant.sku,
    size: variant.sizeLabelPlain,
    offers: offer,
  };
}

/**
 * The ProductGroup node. IDENTICAL on the parent page and on every size page.
 *
 * `images` is the family gallery, already absolute-ready (root-relative is fine, it is
 * absolutised here). `hasVariant` lists every PUBLISHED size, so the group is discoverable
 * from any page in it.
 */
export function generateProductGroupSchema(family: ProductFamily, images: string[] = []) {
  const gallery = Array.from(new Set(images.filter(Boolean).map(absolute)));

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": productGroupNodeId(family),
    productGroupID: family.productGroupId,
    name: family.groupTitle,
    description: family.description,
    url: familyUrl(family),
    ...(gallery.length > 0 ? { image: gallery } : {}),
    brand: { "@type": "Brand", name: family.brand },
    manufacturer: { "@type": "Organization", name: family.brand, url: SITE_URL },
    material: family.material,
    category: family.categoryName,
    // Google reads this to know the group is a size ladder rather than, say, a colour one.
    variesBy: family.variesBy,
    hasVariant: publishedVariants(family)
      .map((v) => siblingVariantRef(family, v))
      .filter(Boolean),
  };
}

/**
 * The selected size's own `Product` node, for a SIZE page.
 *
 * One node, one offer (or none). `isVariantOf` binds it to the group by the group's stable
 * `@id`, which is the join Google's multi-page pattern relies on.
 */
export function generateSizeVariantProductSchema(
  family: ProductFamily,
  variant: SizeVariant,
  images: string[] = [],
) {
  const gallery = Array.from(new Set(images.filter(Boolean).map(absolute)));
  const offer = variantOffer(family, variant);
  /* A size with no confirmed price yields no offer, and a Product node carrying neither an
   * offer nor a rating is rejected outright by Google ("Either 'offers', 'review' or
   * 'aggregateRating' should be specified"). Emit nothing rather than an invalid item: the
   * page still carries its ProductGroup and BreadcrumbList, and this node returns the moment
   * a commerce record exists for the variantId. Inventing a price to satisfy the validator is
   * not an option. */
  if (!offer) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${variantUrl(family, variant)}#product`,
    name: variantName(family, variant),
    description: variantDescription(family, variant),
    url: variantUrl(family, variant),
    ...(gallery.length > 0 ? { image: gallery } : {}),
    sku: variant.sku,
    /* No GTIN exists for a made-to-order steel structure, so identity is brand + part
     * number, and the part number is the SKU — the same convention every other product
     * page on this site already uses. `variant.mpn` is here for the day a genuine
     * manufacturer part number exists; it is never fabricated. */
    mpn: variant.mpn ?? variant.sku,
    brand: { "@type": "Brand", name: family.brand },
    manufacturer: { "@type": "Organization", name: family.brand, url: SITE_URL },
    material: family.material,
    category: family.categoryName,
    // The variant axis, stated exactly as <g:size> submits it.
    size: variant.sizeLabelPlain,
    width: { "@type": "QuantitativeValue", value: variant.widthFt, unitCode: "FOT" },
    depth: { "@type": "QuantitativeValue", value: variant.lengthFt, unitCode: "FOT" },
    /* `height` is emitted ONLY when it has been confirmed for this size. An unconfirmed
     * height would otherwise be published as a structured, machine-readable specification —
     * the strongest possible way to state a number nobody has verified. Omitting the property
     * is valid schema.org; a QuantitativeValue with no value is not. */
    ...(variantHeightFt(family, variant) !== undefined
      ? {
          height: {
            "@type": "QuantitativeValue",
            value: variantHeightFt(family, variant),
            unitCode: "FOT",
          },
        }
      : {}),
    floorSize: { "@type": "QuantitativeValue", value: builtUpAreaSqFt(variant), unitCode: "FTK" },
    itemCondition: "https://schema.org/NewCondition",
    isVariantOf: {
      "@type": "ProductGroup",
      "@id": productGroupNodeId(family),
      productGroupID: family.productGroupId,
      name: family.groupTitle,
      url: familyUrl(family),
    },
    ...(offer ? { offers: offer } : {}),
  };
}
