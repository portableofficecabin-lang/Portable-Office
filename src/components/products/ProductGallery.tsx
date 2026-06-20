"use client";

import { useEffect, useState } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface ProductGalleryProps {
  galleryImages: string[];
  productName: string;
  productImageAlt: string;
  /** SEO title attribute for images (page title / keyword related). Falls back to alt. */
  productImageTitle?: string;
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

  return (
    <div className="relative">
      <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
        <OptimizedImage
          key={productImage}
          src={productImage}
          alt={productImageAlt}
          title={imageTitle}
          productName={productName}
          aspectRatio="4/3"
          className="rounded-2xl"
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
              className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                activeImage === img ? "border-accent" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <img
                src={img}
                alt={`${productImageAlt} – view ${i + 1}`}
                title={`${imageTitle} – view ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
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
