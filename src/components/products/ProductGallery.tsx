"use client";

import { useState } from "react";
import Image from "next/image";
import { OptimizedImage } from "@/components/OptimizedImage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface ProductGalleryProps {
  /** Image sources (string paths or static imports). Resolved + filtered here. */
  galleryImages: string[];
  productName: string;
  productImageAlt: string;
  /** SEO title attribute for images (page title / keyword related). Falls back to alt. */
  productImageTitle?: string;
  /** Per-image alt/title, aligned by index with galleryImages. Overrides the
   *  generic alt/title for that image when present (per-image descriptive SEO). */
  imageMeta?: { alt: string; title: string }[];
  featured?: boolean;
  inStock?: boolean;
  /** True when the SKU is a standard fixed-price product that can be bought online right now
   *  (isPurchasable). Drives whether the overlay badge reads "Available to Order" (buyable) or
   *  "Made to Order" (quote-only), so the image does not contradict a working Add-to-Cart. */
  purchasable?: boolean;
}

// Client island for the product image gallery. Selection is INDEX-based so it is
// immune to duplicate/normalised URL string-compare issues, and the main image is
// updated in place (no `key` remount) so a thumbnail click switches it instantly
// with no flash/reload. The first VALID image is selected on both server and client
// (deterministic → no hydration mismatch).
export function ProductGallery({
  galleryImages,
  productName,
  productImageAlt,
  productImageTitle,
  imageMeta,
  featured,
  inStock,
  purchasable,
}: ProductGalleryProps) {
  // Normalise to real, non-empty URLs once. Empty/placeholder entries are dropped
  // so they can never become the selected main image.
  const images = galleryImages.map(resolveImageUrl).filter(Boolean);

  const [activeIndex, setActiveIndex] = useState(0);
  // Clamp in case the source list is shorter than a previously-selected index.
  const index = activeIndex < images.length ? activeIndex : 0;

  // No images at all → render nothing (the page layout handles the empty slot).
  // We never show a "broken image" placeholder when real images exist.
  if (images.length === 0) return null;

  const mainSrc = images[index];
  const imageTitle = productImageTitle || productImageAlt;
  const mainAlt = imageMeta?.[index]?.alt || productImageAlt;
  const mainTitle = imageMeta?.[index]?.title || imageTitle;

  return (
    <div className="relative">
      <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
        <OptimizedImage
          src={mainSrc}
          alt={mainAlt}
          title={mainTitle}
          productName={productName}
          aspectRatio="4/3"
          className="rounded-2xl"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={`${i}-${src}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1} of ${productName}`}
              aria-current={i === index}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                i === index ? "border-accent" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              {/* Thumbnails are tiny (~110px) — serve a matched variant via next/image
                  so they aren't shipped at full resolution (image-delivery budget). */}
              <Image
                src={src}
                alt={imageMeta?.[i]?.alt || `${productImageAlt} – view ${i + 1}`}
                title={imageMeta?.[i]?.title || `${imageTitle} – view ${i + 1}`}
                fill
                sizes="(max-width: 768px) 20vw, 110px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="absolute top-4 left-4 flex gap-2">
        {featured && (
          <span className="bg-accent text-accent-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
            Featured
          </span>
        )}
        {/* A standard fixed-price SKU (purchasable) reads "Available to Order" — it can be bought
            and paid for online right now, so the image must not imply it is unavailable. A
            quote-only SKU keeps "Made to Order": accurate for a built-to-brief unit. The `inStock`
            flag still gates the badge — it means "we are currently accepting orders for this". */}
        {inStock && (
          <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
            {purchasable ? "Available to Order" : "Made to Order"}
          </span>
        )}
      </div>
    </div>
  );
}
