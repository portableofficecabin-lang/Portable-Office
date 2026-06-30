"use client";

import { useEffect, useState } from "react";
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

const objectFitClasses: Record<string, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  none: "object-none",
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

  // Two-stage graceful degradation so a real, existing file is NEVER shown as
  // "Image unavailable":
  //   1) next/image (optimized AVIF/WebP variant). If the optimizer errors — e.g. a
  //      slow/cold/large AVIF encode that fails on a constrained box — we fall to…
  //   2) a plain <img> pointing at the ORIGINAL file (no optimizer in the path; a
  //      static file always serves). Only if THAT also fails (the file is genuinely
  //      missing) do we show…
  //   3) the "Image unavailable" placeholder.
  const [optimizedFailed, setOptimizedFailed] = useState(false);
  const [rawFailed, setRawFailed] = useState(false);
  // Reset on src change so switching the gallery's main image is never hidden by a
  // previous image's failure.
  useEffect(() => {
    setOptimizedFailed(false);
    setRawFailed(false);
  }, [resolvedSrc]);

  // Known keyword ratios map to Tailwind classes. Arbitrary ratios (e.g. "4/3") use
  // the native CSS `aspect-ratio` via inline style — NOT a runtime-built
  // `aspect-[${aspectRatio}]` class. Tailwind only generates classes it can see as
  // complete literals at build time, so a dynamically-built class may never exist in
  // the CSS → the box collapses to 0 height and the image looks broken.
  const keywordAspect = aspectRatioClasses[aspectRatio];
  const arbitraryAspect =
    keywordAspect === undefined && aspectRatio !== "auto"
      ? aspectRatio.replace("/", " / ")
      : undefined;

  const objectFitClass = objectFitClasses[objectFit];

  // next/image with `fill` needs a sized parent, which only a real aspect ratio (or
  // explicit width/height) provides. For aspectRatio="auto" there is no reserved box,
  // so a plain <img> is always used there.
  const isFixedBox = aspectRatio !== "auto";

  // Stage selection (mutually exclusive):
  const useOptimized = isFixedBox && !!resolvedSrc && !optimizedFailed;
  const useRaw = !!resolvedSrc && !rawFailed && (!isFixedBox || optimizedFailed);
  const showUnavailable = !resolvedSrc || rawFailed;

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", keywordAspect, className)}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        aspectRatio: arbitraryAspect,
      }}
    >
      {/* (1) Optimized — fixed-aspect slots. AVIF/WebP sized to the slot via `sizes`;
          the box is reserved by the aspect ratio (no layout shift). */}
      {useOptimized && (
        <Image
          src={resolvedSrc}
          alt={geoAlt}
          title={imgTitle}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={onLoad}
          onError={() => setOptimizedFailed(true)}
          className={cn("w-full h-full", objectFitClass)}
        />
      )}

      {/* (2) Original file via plain <img> — the auto-height path, and the fallback
          for a fixed box when the optimizer failed (fills the reserved box). */}
      {useRaw && (
        // Intentional un-optimized fallback to the original static file.
        <img
          src={resolvedSrc}
          alt={geoAlt}
          title={imgTitle}
          width={isFixedBox ? undefined : width}
          height={isFixedBox ? undefined : height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          onLoad={onLoad}
          onError={() => {
            setRawFailed(true);
            onError?.();
          }}
          className={cn(
            isFixedBox ? "absolute inset-0 w-full h-full" : "w-full h-full",
            objectFitClass,
          )}
        />
      )}

      {/* (3) Only when the original file itself is missing. */}
      {showUnavailable && (
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
            <span className="text-xs text-muted-foreground">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}
