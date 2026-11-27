/**
 * IMAGE DISCLOSURE for the product-card images on the site-office-container, portable-toilet and
 * security-cabin category pages (Search Console phase, 2026-11-27). Small on purpose: ProductCard is
 * a client component, so it imports only this file — productImageCaptions.ts spreads these entries
 * into its own maps for the product-page galleries.
 *
 * Every frame was checked by eye. Seven are generated product illustrations, not photographs of a
 * delivered unit, so their alt text says "Illustrative render" and they carry the visible label.
 * One is a photograph (container-site-office-main.webp) and is described without a label.
 *
 * Five of these file names exist twice in the repo with DIFFERENT pictures — public/images/products/
 * and src/assets/products/ (both versions are renders). The alt text below names only what is true
 * of both versions, because the lookup is by file name.
 */

export interface ImageDisclosure {
  alt: string;
  /** Visible on-image label — set only for images that are not photographs of the unit. */
  label?: string;
}

export const RENDER_LABEL = "Illustrative render";

export const CARD_IMAGE_DISCLOSURE: Record<string, ImageDisclosure> = {
  // Site office containers
  "standard-site-office-container.webp": { alt: "Illustrative render of a steel container office", label: RENDER_LABEL },
  "construction-site-portable-office-site-office.webp": { alt: "Illustrative render of a white portable site office cabin", label: RENDER_LABEL },
  "site-office-container-manufacturers-exterior.webp": {
    alt: "Illustrative render of a site office container with an entrance door and large windows",
    label: RENDER_LABEL,
  },
  "steel-portable-office-container-crane.webp": { alt: "Illustrative render of a steel portable office container", label: RENDER_LABEL },
  "container-site-office-main.webp": {
    alt: "Photograph of a long white container site office with a blue base band, two doors and four windows, on open ground beside a planted gravel border",
  },
  // Portable toilet cabins
  "portable-toilet-block-4unit-front.webp": {
    alt: "Illustrative render of a four-door portable toilet block, the doors marked rest room 1 to 4",
    label: RENDER_LABEL,
  },
  // Security cabins
  "guard-security-cabin-front.webp": {
    alt: "Illustrative render of a grey-framed security cabin with glazed walls and an open glass door showing a desk and chair inside",
    label: RENDER_LABEL,
  },
  "security-cabin-residential-gate.webp": { alt: "Illustrative render of a glazed security cabin", label: RENDER_LABEL },
};

/**
 * File basename of an image URL or path, without a query string and without the content hash Next
 * adds to imported assets (`/_next/static/media/name.<hash>.webp` → `name.webp`).
 */
export function imageFileBasename(imageUrl: string): string {
  const base = imageUrl.split("/").pop()?.split("?")[0] ?? "";
  return base.replace(/\.[0-9a-f]{8,}(?=\.[a-z0-9]+$)/i, "");
}

/** The disclosure for a card image, by file basename, if one is recorded. */
export function getCardImageDisclosure(imageUrl: string): ImageDisclosure | undefined {
  return imageUrl ? CARD_IMAGE_DISCLOSURE[imageFileBasename(imageUrl)] : undefined;
}
