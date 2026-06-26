"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { OptimizedImage } from "@/components/OptimizedImage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface ProductGalleryProps {
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
}

// Client island for the product image gallery. The first image is rendered
// server-side (in HTML) by passing the resolved galleryImages; this island only
// adds thumbnail-switching interactivity on top.
export function ProductGallery({
  galleryImages,
  productName,
  productImageAlt,
  productImageTitle,
  imageMeta,
  featured,
  inStock,
}: ProductGalleryProps) {
  const imageTitle = productImageTitle || productImageAlt;
  const [activeImage, setActiveImage] = useState<string>(
    galleryImages[0] ? resolveImageUrl(galleryImages[0]) : "",
  );

  useEffect(() => {
    if (galleryImages[0]) setActiveImage(resolveImageUrl(galleryImages[0]));
  }, [galleryImages]);

  const productImage = activeImage || resolveImageUrl(galleryImages[0]);

  // Per-image alt/title for the main image, based on which thumbnail is active.
  const activeIndex = galleryImages.findIndex((img) => resolveImageUrl(img) === productImage);
  const mainAlt = imageMeta?.[activeIndex]?.alt || productImageAlt;
  const mainTitle = imageMeta?.[activeIndex]?.title || imageTitle;

  return (
    <div className="relative">
      <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
        <OptimizedImage
          key={productImage}
          src={productImage}
          alt={mainAlt}
          title={mainTitle}
          productName={productName}
          aspectRatio="4/3"
          className="rounded-2xl"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {galleryImages.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {galleryImages.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActiveImage(img)}
              aria-label={`View image ${i + 1} of ${productName}`}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                activeImage === img ? "border-accent" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              {/* Thumbnails are tiny (~80px) — serve a matched variant via next/image
                  so they aren't shipped at full resolution (fixes image-delivery). */}
              <Image
                src={resolveImageUrl(img)}
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
        {inStock && (
          <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
            In Stock
          </span>
        )}
      </div>
    </div>
  );
}
