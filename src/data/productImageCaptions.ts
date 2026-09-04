// Per-image descriptive captions keyed by the image file basename. Used to build
// unique, keyword-rich alt/title text for each gallery image (server-rendered in
// ProductDetailServer). Falls back to the generic product alt when not listed.

export const productImageCaptions: Record<string, string> = {
  // Portable Cabin 40ft Bunkhouse
  "portable-cabin-40ft-bunkhouse-front.webp":
    "front view with glass sliding doors and furnished interior",
  "portable-cabin-40ft-bunkhouse-side.webp":
    "side elevation with windows and split AC unit",
  "portable-cabin-40ft-bunkhouse-angle.webp":
    "angled exterior view showing 40ft length and 10ft width",
  "portable-cabin-40ft-bunkhouse-dimensions.webp":
    "40ft length x 10ft width exterior dimensions",
  "portable-cabin-40ft-bunkhouse-rear-utilities.webp":
    "rear view with electrical and plumbing utility connections installed",
};

/** Resolve a caption from an image URL/path by its file basename. */
export function getImageCaption(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  const base = imageUrl.split("/").pop()?.split("?")[0] ?? "";
  return productImageCaptions[base];
}
