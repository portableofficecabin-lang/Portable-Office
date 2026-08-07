"use client";

import { useCallback, useEffect, useState } from "react";
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

/**
 * Client island for the product image gallery.
 *
 * ── WHY EVERY FRAME IS MOUNTED, NOT SWAPPED ────────────────────────────────────────────────────
 * Selecting a thumbnail used to re-point ONE <img> at a new src, which made the switch as slow as a
 * fresh image download — and it was always a fresh download, for two compounding reasons:
 *
 *   1. A thumbnail and the main slot request DIFFERENT optimizer variants. The thumbnail asks for
 *      `sizes="…110px"` (a ~128px wide AVIF); the main slot asks for `(max-width:1024px) 100vw,
 *      50vw` (up to ~1920px). Those are different `/_next/image?w=…` URLs, so having looked at the
 *      thumbnail warms nothing for the big image.
 *   2. The first request for any (image, width, format) triple is transformed by sharp AT REQUEST
 *      TIME. The deploy image does not persist `.next/cache`, so after every release that cold
 *      encode lands on whichever customer clicks first — hundreds of ms of server CPU before a
 *      single byte comes back.
 *
 * So the fix is not a faster swap; it is to have already fetched and decoded the frame before the
 * click happens. Every image is therefore rendered into the same box, stacked, and switching is a
 * pure opacity change — no network, no decode, no layout work, so it lands within one frame.
 *
 * Two details that make that true rather than merely intended:
 *   • Inactive frames are hidden with `opacity-0`, never `display:none`/`hidden`. A display:none
 *     image can be dropped from the rasterised layer, which would put the decode back on the click.
 *   • Inactive frames mount only AFTER the first image has loaded (or the browser goes idle), and
 *     then at `fetchPriority=low`, so warming the gallery can never steal bandwidth from the LCP
 *     image. Hovering/touching a thumbnail also triggers the warm immediately, which covers the
 *     case of a click that beats the idle callback.
 *
 * Selection stays INDEX-based so it is immune to duplicate/normalised URL string-compare issues,
 * and index 0 is selected on both server and client (deterministic → no hydration mismatch).
 */
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
  /** Have the non-active frames been mounted (and therefore started downloading) yet? */
  const [warm, setWarm] = useState(false);
  const warmNow = useCallback(() => setWarm(true), []);

  // Warm on idle as the baseline. The LCP image usually wins the race anyway (it is `priority`, so
  // its fetch starts at <head> parse), but a cached/instant first paint would otherwise never fire
  // an onLoad, so idle — not onLoad alone — is what guarantees the gallery always warms.
  useEffect(() => {
    if (images.length <= 1) return;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(warmNow, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warmNow, 1200); // Safari has no requestIdleCallback
    return () => window.clearTimeout(id);
  }, [images.length, warmNow]);

  // Clamp in case the source list is shorter than a previously-selected index.
  const index = activeIndex < images.length ? activeIndex : 0;

  // No images at all → render nothing (the page layout handles the empty slot).
  // We never show a "broken image" placeholder when real images exist.
  if (images.length === 0) return null;

  const imageTitle = productImageTitle || productImageAlt;

  return (
    <div className="relative">
      <div className="relative aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
        {images.map((src, i) => {
          const isActive = i === index;
          // Frame 0 is the LCP element and is always mounted. The rest appear once warm.
          if (!isActive && i !== 0 && !warm) return null;
          return (
            <OptimizedImage
              key={`${i}-${src}`}
              src={src}
              alt={imageMeta?.[i]?.alt || productImageAlt}
              title={imageMeta?.[i]?.title || imageTitle}
              productName={productName}
              aspectRatio="4/3"
              /* opacity (not display:none) keeps every frame rasterised, so the switch costs one
                 compositor frame. `transition-none` on the incoming frame would be safer still, but
                 a short cross-fade reads better and does not delay the first painted pixel. */
              className={`absolute inset-0 rounded-2xl transition-opacity duration-150 ${
                isActive ? "opacity-100 z-[1]" : "opacity-0 pointer-events-none"
              }`}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={i === 0}
              prefetch={i !== 0}
              /* Only the visible frame is exposed to assistive tech — the alt text stays in the
                 markup for crawlers, but a screen reader announces one image, not five. */
              aria-hidden={!isActive}
            />
          );
        })}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={`${i}-${src}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              /* Belt-and-braces: intent to look at another frame warms the whole gallery, so a
                 click that beats the idle callback still finds its image already decoded. */
              onPointerEnter={warmNow}
              onFocus={warmNow}
              onTouchStart={warmNow}
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

      <div className="absolute top-4 left-4 z-[2] flex gap-2">
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
