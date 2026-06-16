"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { lazyLoadConfig, createBlurPlaceholder } from "@/utils/imageOptimization";
import { generateGeoAlt, generateImageTitle } from "@/utils/imageGeoTagging";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface OptimizedImageProps {
  src: string | { src: string };
  alt: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately without lazy loading
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      lazyLoadConfig
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

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

  return (
    <div
      ref={imgRef}
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
      {/* Blur placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 animate-pulse bg-muted"
          style={{
            backgroundImage: `url(${createBlurPlaceholder()})`,
            backgroundSize: "cover",
          }}
        />
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          src={resolvedSrc}
          alt={geoAlt}
          title={imgTitle}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" as any } : {})}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            objectFitClass,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

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
