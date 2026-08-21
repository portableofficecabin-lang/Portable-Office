import type { Metadata } from "next";

import {
  builtUpAreaSqFt,
  variantDimensionsPlain,
  variantFeedTitle,
  variantIsPurchasable,
  variantPath,
  type ProductFamily,
  type SizeVariant,
} from "@/data/productFamilies";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import type { Product } from "@/data/products";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { primaryImageFor } from "@/lib/seo/productPageMeta";
import { variantIsSearchEligible } from "@/lib/seo/productGroupSchema";

/**
 * SERVER-SIDE METADATA for one standard size — /products/<family>/<size>.
 *
 * ── WHAT IS GUARANTEED HERE ────────────────────────────────────────────────────────────
 *   • A UNIQUE <title> per published size, carrying the size itself.
 *   • A SELF-REFERENCING canonical on the size URL. NOT the parent — canonicalising every
 *     size back to the overview page would tell Google these are duplicates and it would
 *     stop treating them as distinct variant landing pages, which is the entire point of
 *     the multi-page pattern.
 *   • index,follow (from buildPageMetadata) — never noindex.
 *   • A description that mentions a price ONLY when the size genuinely has one, and then
 *     the GST-INCLUSIVE figure, matching the page, the Offer, the cart and the feed.
 *
 * ── AND WHAT IS DELIBERATELY NOT DONE ──────────────────────────────────────────────────
 * No keyword stuffing. The title carries the product, the size and the brand once each.
 * The family's search synonyms ("site office container", "porta office") belong in visible
 * body copy, not repeated through every <title> — repeating them across six near-identical
 * titles is exactly the pattern that reads as doorway pages.
 */

/** Google truncates a snippet past ~160 characters, so we compose to fit rather than get cut. */
const META_DESCRIPTION_MAX = 160;

/** Trim to `max` chars on a word boundary rather than mid-word, adding an ellipsis. */
function truncateOnWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const body = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped;
  return `${body.replace(/[\s.,;:–-]+$/u, "")}…`;
}

/**
 * The page <title>.
 *
 * A PURCHASABLE size uses variantFeedTitle() verbatim — the exact string the Merchant feed
 * sends as <g:title>. Google matches a feed item to its landing page partly on that, so
 * the two must be identical, not merely similar.
 *
 * An UNPRICED size uses a shorter, honest title. It is not in the feed, so there is no feed
 * title to match, and the long "for Project Site Offices | Brand" pattern only pads it.
 */
export function variantPageTitle(family: ProductFamily, variant: SizeVariant): string {
  if (variantIsPurchasable(family, variant) && isOutrightSale(variant.variantId)) {
    return variantFeedTitle(family, variant);
  }
  return `${variant.sizeLabelPlain} ${family.groupTitle} — Size, Specification & Price | ${family.brand}`;
}

/** The meta description. Price-bearing only when a real, payable price exists. */
export function variantPageDescription(family: ProductFamily, variant: SizeVariant): string {
  const area = builtUpAreaSqFt(variant);
  const dims = variantDimensionsPlain(family, variant);
  const commerce = getCommerce(variant.variantId);
  const priced =
    variantIsPurchasable(family, variant) && isOutrightSale(variant.variantId) && commerce;

  const head = `${variant.sizeLabelPlain} ${family.groupTitle} — ${dims}, ${area} sq ft built-up area, ${family.material}.`;

  const tail = priced
    ? `${formatINR(sellPrice(commerce.basePrice))} including 18% GST. Dispatch ${variant.leadTime}. Buy online with UPI, cards or net banking.`
    : `Dispatch ${variant.leadTime}. Request a written quotation for this size.`;

  return truncateOnWordBoundary(`${head} ${tail}`, META_DESCRIPTION_MAX);
}

/**
 * Full Next Metadata for a size page.
 *
 * `variantProduct` is the variant shaped as a catalogue Product, so primaryImageFor()
 * resolves og:image the identical way every other product page does — the size's own photo
 * where one exists, the family's otherwise.
 */
export function buildVariantPageMetadata(
  family: ProductFamily,
  variant: SizeVariant,
  variantProduct: Product,
): Metadata {
  return buildPageMetadata({
    absoluteTitle: variantPageTitle(family, variant),
    description: variantPageDescription(family, variant),
    keywords: [
      `${variant.sizeLabelPlain} ${family.groupTitle.toLowerCase()}`,
      `${family.groupTitle.toLowerCase()} ${variant.sizeLabelPlain} price`,
      `${family.groupTitle.toLowerCase()} standard sizes`,
      family.categoryName.toLowerCase(),
    ].join(", "),
    // SELF-REFERENCING canonical on the size URL. Never the parent.
    path: variantPath(family, variant),
    image: primaryImageFor(variantProduct),
    imageAlt: `${family.groupTitle} — ${family.categoryName} by ${family.brand}`,
    ogType: "website",
    /* A standard size with no confirmed selling price is withheld from search until the
     * price exists. Indexing it would publish a size page whose offer we cannot state —
     * the page would rank on the size keyword and then show no price. Same predicate that
     * gates the Offer and the Product node, so the three can never disagree. */
    noindex: !variantIsSearchEligible(family, variant),
  });
}
