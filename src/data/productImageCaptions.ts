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
  // Steel Portable Cabin (id 46)
  "steel-portable-cabin-front.webp":
    "front elevation with timber-finish entrance door, two grilled sliding windows and exterior downlights",
  "steel-portable-cabin-angled-exterior.webp":
    "angled exterior showing the full 20ft length, entrance door and external utility cabinet",
  "steel-portable-cabin-interior-office.webp":
    "fitted-out interior with desks, storage unit, track lighting and vinyl flooring",
  "steel-portable-cabin-side-rear.webp":
    "blank side and rear elevation with ventilation louvres and rear window",
  "steel-portable-cabin-ventilated-unit.webp":
    "louvred site cabin finish in two-tone paint with steel flush door",
  "steel-portable-cabin-roof.webp":
    "overhead view of the sloping profiled steel roof and corner lifting points",
};

/** Resolve a caption from an image URL/path by its file basename. */
export function getImageCaption(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  const base = imageUrl.split("/").pop()?.split("?")[0] ?? "";
  return productImageCaptions[base];
}
