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

// Owner-specified alt text, keyed by file basename. Used verbatim as the alt and title in
// ProductDetailServer, in place of the "<product name> — <caption>" form built from the
// captions above. Only the images listed here are affected.
export const productImageAltText: Record<string, string> = {
  // Portable Shop Cabin (id 48). All four are AI-generated renders, not photographs of a
  // delivered cabin, so each alt says so before describing the frame.
  "portable-shop-cabin-front-three-quarter.webp":
    "Illustrative render of a 10 ft × 10 ft portable shop cabin with a glazed display front, a lockable entrance door and a glazed side",
  "portable-shop-cabin-glazed-side.webp":
    "Illustrative render of the portable shop cabin's glazed side, with display shelving visible inside",
  "portable-shop-cabin-overhead.webp":
    "Illustrative render of the portable shop cabin from above, showing the roof, glazed front and entrance door",
  "portable-shop-cabin-rear-wall.webp":
    "Illustrative render of the portable shop cabin's solid rear wall, standing on corner blocks",
  // 20ft Storage Container – Corten Steel (id 12, issue #100)
  "20ft-storage-container-corten-steel-three-quarter.webp":
    "20ft Corten Steel Storage Container – Portable Office Cabin",
  "20ft-storage-container-corten-steel-front.webp":
    "20ft Corten Steel Storage Container front view with cargo doors – Portable Office Cabin",
  "20ft-storage-container-corten-steel-side-elevation.webp":
    "20ft Corten Steel Storage Container side view – Portable Office Cabin",
  // Container Cafe & Restaurant (id 47). All five are AI-generated renders, not photographs of a
  // delivered cafe, so each alt says so before describing the frame.
  "container-cafe-restaurant-kitchen.webp":
    "Illustrative render of a container kitchen with stainless steel counters, exhaust hood and a garden-facing window",
  "container-cafe-restaurant-front-exterior.webp":
    "Illustrative render of a two-storey container cafe concept with a glass-fronted upper container on steel columns",
  "container-cafe-restaurant-staircase-deck.webp":
    "Illustrative render of a steel staircase to an upper deck beside a yellow ground-floor container cafe",
  "container-cafe-restaurant-aerial.webp":
    "Illustrative render of a stacked container cafe concept seen from above, with a lawn and outdoor seating",
  "container-cafe-restaurant-dining-interior.webp":
    "Illustrative render of the upper-floor dining room in a container restaurant concept, with full-height glazing",
  // MS Container Office Cabin (id 20). Owner-supplied, but not confirmed as the 15ft x 10ft unit
  // sold on the page, so each alt says "illustrative example" and names only what is visible:
  // no size, material or included-fitting claims. The five full-frame images in the gallery:
  "container-office-cabin-exterior-door-side-example.webp":
    "Illustrative example of a white and blue container office cabin with a door and three windows fitted with grilles",
  "container-office-cabin-interior-wide-example.webp":
    "Illustrative example of a container office interior with wood-grain wall panels, two ceiling fans, a tube light and sliding windows",
  "container-office-cabin-exterior-end-view-example.webp":
    "Illustrative example of a white and blue container office cabin seen from one end, with an outdoor wall light and three windows fitted with grilles",
  "container-office-cabin-exterior-long-side-example.webp":
    "Illustrative example of the long side of a white and blue container office cabin, with three windows fitted with grilles",
  "container-office-cabin-roof-aerial-example.webp":
    "Illustrative example of a container office cabin seen from above, showing its blue profiled roof sheets",
  // The first version's 4:3 crops of two of them. No longer in the gallery; the files are kept so
  // URLs already crawled (og:image, JSON-LD) resolve, and stay labelled if ever shown again.
  "container-office-cabin-exterior-example.webp":
    "Illustrative example of a white and blue container office cabin with a door and three windows fitted with grilles",
  "container-office-cabin-interior-example.webp":
    "Illustrative example of a container office interior with wood-grain wall panels, two ceiling fans, a tube light and sliding windows",
};

/**
 * A short visible label printed on a gallery image while it is the one shown, keyed by file
 * basename. For images that are not confirmed photographs of the unit sold on the page, so the
 * disclosure sits on the image itself and not only in its alt text or the gallery note.
 */
export const productImageLabels: Record<string, string> = {
  "container-office-cabin-exterior-door-side-example.webp": "Illustrative example",
  "container-office-cabin-interior-wide-example.webp": "Illustrative example",
  "container-office-cabin-exterior-end-view-example.webp": "Illustrative example",
  "container-office-cabin-exterior-long-side-example.webp": "Illustrative example",
  "container-office-cabin-roof-aerial-example.webp": "Illustrative example",
  "container-office-cabin-exterior-example.webp": "Illustrative example",
  "container-office-cabin-interior-example.webp": "Illustrative example",
};

/**
 * A visible line printed under a product's gallery, keyed by the product's canonical slug (the
 * slug survives an admin DB edit of the row; a field on the record might not). Used where the
 * gallery needs a disclosure the alt text alone cannot carry — e.g. that every image is a render.
 */
export const productGalleryNotes: Record<string, string> = {
  "portable-shop-cabin":
    "All images on this page are illustrative renders of the shop cabin, not photographs of a delivered unit. Shelves and stock shown inside are not included in the price.",
  "container-cafe-restaurant":
    "All images on this page are illustrative renders of container cafe concepts, not photographs of a completed project.",
  "ms-container-office-cabin":
    "Images marked “Illustrative example” show container office cabins and may differ from the 15 ft × 10 ft unit sold on this page in size, layout and finish. What the unit includes is set out in its specifications.",
};

/** The visible gallery note for a product slug, if it has one. */
export function getProductGalleryNote(slug: string): string | undefined {
  return productGalleryNotes[slug];
}

/**
 * How a product's gallery fits its images into the 4:3 frame, keyed by canonical slug. Unlisted
 * products keep the default "cover" (fills the frame, may trim edges). "contain" shows every image
 * whole, never cropped or stretched — for galleries whose images differ in shape and must be seen
 * in full.
 */
export const productGalleryFit: Record<string, "contain"> = {
  "ms-container-office-cabin": "contain",
};

/** The gallery fit for a product slug, if it is not the default. */
export function getProductGalleryFit(slug: string): "contain" | undefined {
  return productGalleryFit[slug];
}

function imageBasename(imageUrl: string): string {
  return imageUrl.split("/").pop()?.split("?")[0] ?? "";
}

/** Resolve a caption from an image URL/path by its file basename. */
export function getImageCaption(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  return productImageCaptions[imageBasename(imageUrl)];
}

/** Resolve owner-specified alt text from an image URL/path by its file basename. */
export function getImageAltText(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  return productImageAltText[imageBasename(imageUrl)];
}

/** Resolve the visible on-image label from an image URL/path by its file basename. */
export function getImageLabel(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  return productImageLabels[imageBasename(imageUrl)];
}
