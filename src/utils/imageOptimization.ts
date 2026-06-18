/**
 * Image Optimization Utility
 * Handles client-side image compression and optimization
 * for maintaining fast page speed and Core Web Vitals standards
 */

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "jpeg" | "webp" | "png";
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: "webp",
};

/**
 * Compress and optimize an image file
 * @param file - The image file to optimize
 * @param options - Optimization options
 * @returns Promise<Blob> - The optimized image as a Blob
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW) {
        height = (height * maxW) / width;
        width = maxW;
      }

      if (height > maxH) {
        width = (width * maxH) / height;
        height = maxH;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType =
        opts.format === "webp"
          ? "image/webp"
          : opts.format === "png"
          ? "image/png"
          : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        mimeType,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Create object URL and load image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate optimized srcset for responsive images
 * @param baseUrl - The base URL of the image
 * @param widths - Array of widths to generate
 * @returns srcset string
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  // For static images, we return the base URL
  // In production, this would integrate with an image CDN
  return widths.map((w) => `${baseUrl} ${w}w`).join(", ");
}

/**
 * Calculate optimal image sizes attribute
 * @param breakpoints - Object mapping breakpoint to size
 * @returns sizes string
 */
export function generateSizes(
  breakpoints: Record<string, string> = {
    "(max-width: 640px)": "100vw",
    "(max-width: 1024px)": "50vw",
    default: "33vw",
  }
): string {
  return Object.entries(breakpoints)
    .filter(([key]) => key !== "default")
    .map(([breakpoint, size]) => `${breakpoint} ${size}`)
    .concat(breakpoints.default || "100vw")
    .join(", ");
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
}

/**
 * Get optimized image format based on browser support
 */
export function getOptimalFormat(): "webp" | "jpeg" {
  return supportsWebP() ? "webp" : "jpeg";
}

/**
 * Preload critical images for better LCP
 * @param imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls: string[]): void {
  imageUrls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Create a placeholder blur data URL for progressive loading
 * @param width - Width of the placeholder
 * @param height - Height of the placeholder
 * @param color - Base color (hex)
 */
export function createBlurPlaceholder(
  _width: number = 10,
  _height: number = 10,
  _color: string = "#f4f4f5"
): string {
  // Return a static 1x1 data URI instead of rasterizing a <canvas> with
  // canvas.toDataURL() on every render. The canvas path ran synchronously on
  // the main thread for each not-yet-loaded image (e.g. across a product grid),
  // contributing to Total Blocking Time. The visible placeholder is the
  // animate-pulse muted background, so the image data URI need only be a stub.
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

/**
 * Lazy load configuration for images
 */
export const lazyLoadConfig = {
  rootMargin: "50px 0px",
  threshold: 0.01,
};
