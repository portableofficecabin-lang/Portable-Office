import type { Metadata } from "next";

import { type Product } from "@/data/products";
import { getProductSEO } from "@/data/productSEO";
import { getBestProductImage } from "@/data/productImages";
import { getCommerce, isPurchasable, priceUnitSuffix, type ProductCommerce } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * PRODUCT PAGE METADATA — the single builder behind every URL that renders
 * ProductDetailServer.
 *
 * Extracted verbatim from app/(site)/products/[slug]/page.tsx when product CHILD pages
 * (products with `parentSlug`, served at /products/<parent>/<child> by the [slug]/[child]
 * route) began rendering full product pages at a second route: both routes MUST compose
 * <title>, description, canonical and og:image identically, or the feed-title ↔ page-title
 * match and the price surfaces drift apart per-URL.
 */

/** Google truncates a snippet past ~160 characters, so we compose to fit rather than get cut. */
const META_DESCRIPTION_MAX = 160;

/**
 * The page's primary image — resolved EXACTLY the way ProductDetailServer resolves
 * `galleryImages[0]` (see src/views/ProductDetailServer.tsx), so og:image, the gallery and
 * the feed's <g:image_link> can never show three different photos:
 *   1. resolveImageUrl() every `images` entry (an entry may be a plain path OR a static
 *      import whose URL hides on `.src`), dropping placeholders;
 *   2. if nothing real is left, fall back to getBestProductImage() — the product photo, else
 *      the category photo — which is precisely what the page renders.
 * The path may be root-relative here; buildPageMetadata() absolutises it (a relative og:image
 * does not render).
 */
export function primaryImageFor(product: Product): string {
  const gallery = (product.images || [])
    .map((image) => resolveImageUrl(image))
    .filter((url) => url && !url.includes("placeholder"));

  return (
    gallery[0] ??
    getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku)
  );
}

/** Trim to `max` chars on a word boundary rather than mid-word, adding an ellipsis. */
function truncateOnWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const body = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped;
  return `${body.replace(/[\s.,;:–-]+$/u, "")}…`;
}

/**
 * The meta description of a PURCHASABLE SKU — assembled from real catalog data only.
 *
 * ⚠️ Never "starting ₹X". These are FIXED prices: the figure here, the figure on the page, the
 * one in the Product JSON-LD and the one in the Merchant feed are all sellPrice(basePrice), and
 * "starting" would contradict every one of them (and read as a bait price to Google).
 *
 * The price, the delivery window and the buy-online CTA are load-bearing for Shopping, so they
 * are never dropped. When the composed line overruns 160 chars we shed the spec chips instead —
 * material first (longest, and it is repeated in the on-page spec grid), then size.
 */
function buildCommerceDescription(commerce: ProductCommerce): string {
  const tail = `${formatINR(sellPrice(commerce.basePrice))}${priceUnitSuffix(commerce.id)} (incl. GST). Delivery ${commerce.deliveryDays}. Buy online with UPI, cards or net banking.`;

  const variants = [
    [commerce.h1Title, commerce.size, commerce.material, tail], // richest
    [commerce.h1Title, commerce.size, tail], // drop material
    [commerce.h1Title, tail], // drop size too
  ].map((parts) =>
    parts
      .filter((part) => part && part.trim().length > 0)
      .join(". ")
      .trim(),
  );

  const fits = variants.find((variant) => variant.length <= META_DESCRIPTION_MAX);
  // Fallback: even the bare variant overruns (a very long h1) — cut it on a word boundary.
  return fits ?? truncateOnWordBoundary(variants[variants.length - 1], META_DESCRIPTION_MAX);
}

/**
 * The complete Metadata for a product page rendered at `path`.
 *
 * `path` is the CANONICAL route serving the page — `/products/<slug>` for a normal product,
 * `/products/<parent>/<child>` for a product child (i.e. `getProductDetailPath(product)`), so
 * the canonical always matches <g:link> and offers.url.
 */
export function buildProductPageMetadata(product: Product, path: string): Metadata {
  const seo = getProductSEO(product.id, product.name);
  const commerce = getCommerce(product.id);

  // The <title> IS the feed's <g:title>. Google uses a feed-title ↔ landing-page-title match as a
  // relevance signal, so the clean commercial title wins over the keyword-stuffed SEO title.
  // Only a product with no commerce row at all falls back to the old SEO title.
  const title = commerce?.feedTitle || seo.title || product.name;

  // Purchasable → a price-bearing description. Quote-only SKUs (custom/rental/service/guide/
  // location, or priceConfirmed:false) keep the existing description and mention NO price.
  const description =
    commerce && isPurchasable(product.id)
      ? buildCommerceDescription(commerce)
      : seo.description || product.shortDescription;

  return buildPageMetadata({
    absoluteTitle: title,
    description,
    keywords: seo.keywords,
    path,
    image: primaryImageFor(product),
    imageAlt: commerce?.h1Title || product.name,
    ogType: "website",
  });
}
