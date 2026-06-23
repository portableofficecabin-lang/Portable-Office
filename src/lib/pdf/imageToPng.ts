import { resolveImageUrl } from "@/utils/resolveImageUrl";

// jsPDF's addImage cannot decode WebP. Resolve the (WebP) asset URL, draw it onto
// a canvas and return a PNG data URL so logos/seals actually render in exported
// PDFs. resolveImageUrl handles both string and StaticImageData imports.
export async function imageToPngDataUrl(src: unknown): Promise<string | null> {
  const url = resolveImageUrl(src);
  if (!url || typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
