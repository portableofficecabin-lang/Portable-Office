/** Normalize a static import, string path, or unknown value to an image URL string. */
export function resolveImageUrl(image: unknown): string {
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && "src" in image) {
    return String((image as { src: string }).src);
  }
  return "";
}
