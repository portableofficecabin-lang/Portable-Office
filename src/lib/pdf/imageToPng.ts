import { resolveImageUrl } from "@/utils/resolveImageUrl";

export interface PdfImageOptions {
  /** Downscale the source to at most this width (px) before embedding. */
  maxWidth?: number;
  /** "jpeg" is far smaller for photos/seals; "png" preserves transparency. */
  format?: "png" | "jpeg";
  /** JPEG quality 0..1. */
  quality?: number;
  /** Fill colour painted before drawing (JPEG has no alpha — use "#ffffff"). */
  background?: string;
}

// jsPDF's addImage cannot decode WebP. Resolve the (WebP) asset URL, draw it onto
// a canvas (downscaled + optionally JPEG-compressed) and return a data URL so the
// embedded image is both renderable AND small — keeping exported PDFs in the KB
// range. resolveImageUrl handles string and StaticImageData imports.
export async function imageToPngDataUrl(
  src: unknown,
  opts: PdfImageOptions = {},
): Promise<string | null> {
  const { maxWidth = 512, format = "png", quality = 0.85, background } = opts;
  const url = resolveImageUrl(src);
  if (!url || typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const sw = img.naturalWidth || img.width;
        const sh = img.naturalHeight || img.height;
        const scale = sw > maxWidth ? maxWidth / sw : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(sw * scale));
        canvas.height = Math.max(1, Math.round(sh * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
