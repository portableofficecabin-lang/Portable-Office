"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { generateGeoAlt, generateImageTitle } from "@/utils/imageGeoTagging";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface OptimizedImageProps {
  src: string | { src: string };
  alt: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately (eager + fetchpriority high) — LCP images only
  /** Responsive `sizes` hint so next/image fetches a variant matched to the slot,
   *  not the full-resolution file. Default biases slightly large (full-width on
   *  mobile, half-width on desktop) to avoid under-fetch/blur on section images. */
  sizes?: string;
  aspectRatio?: "square" | "video" | "portrait" | "auto" | string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  geoTag?: boolean; // Auto-append geo-location to alt/title
  productName?: string; // For product-specific title generation
  onLoad?: () => void;
  onError?: () => void;
}

const aspectRatioClasses: Record<string, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  auto: "",
};

export function OptimizedImage({
  src,
  alt,
  title,
  className,
  width,
  height,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  aspectRatio = "auto",
  objectFit = "cover",
  geoTag = true,
  productName,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const resolvedSrc = resolveImageUrl(src);
  // Auto geo-tag alt and title for image SEO
  const geoAlt = geoTag ? generateGeoAlt(alt) : alt;
  const imgTitle = title || (geoTag ? generateImageTitle(alt, productName) : undefined);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const aspectClass =
    aspectRatioClasses[aspectRatio] || `aspect-[${aspectRatio}]`;

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
  }[objectFit];

  // Only a real aspect ratio reserves a fixed-size box. For those we can safely use
  // next/image with `fill` (it needs a sized parent). For aspectRatio="auto" there
  // is no reserved height, so `fill` would collapse the image — keep a plain <img>
  // there (behavior unchanged; the underlying file is already pre-resized).
  const isFixedBox = aspectRatio !== "auto";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectClass,
        className
      )}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
    >
      {/* For fixed-aspect slots, next/image (fill) serves AVIF/WebP sized to the
          slot via `sizes` (fixes over-delivery) and the box is reserved by the
          aspect-ratio wrapper (no layout shift). Visual output is identical to the
          old <img>: fills the box with object-cover. Off-screen images stay lazy;
          only `priority` ones are eager. */}
      {!hasError && resolvedSrc && isFixedBox ? (
        <Image
          src={resolvedSrc}
          alt={geoAlt}
          title={imgTitle}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={onLoad}
          onError={handleError}
          className={cn("w-full h-full", objectFitClass)}
        />
      ) : null}

      {/* auto-height slots — plain <img> (no fixed box for fill). */}
      {!hasError && resolvedSrc && !isFixedBox ? (
        <img
          src={resolvedSrc}
          alt={geoAlt}
          title={imgTitle}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          onLoad={onLoad}
          onError={handleError}
          className={cn("w-full h-full", objectFitClass)}
        />
      ) : null}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs text-muted-foreground">
              Image unavailable
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
