import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { productImageAltText, productGalleryNotes, getImageAltText } from "./productImageCaptions";
import { products, getProductSlug } from "./products";

/**
 * Image disclosure and alt-text registry. A key that matches no file silently falls back to the
 * generic "<name> – view N" alt, and a render gallery whose alts do not say "Illustrative" tells
 * image search a render is a photograph — both are caught here.
 */

function basenamesUnder(dir: string, out = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) basenamesUnder(full, out);
    else out.add(entry);
  }
  return out;
}

const publicFiles = basenamesUnder(join(process.cwd(), "public", "images"));

describe("product image registry", () => {
  it("every alt-text key names an image file that exists", () => {
    for (const key of Object.keys(productImageAltText)) {
      expect({ key, exists: publicFiles.has(key) }).toEqual({ key, exists: true });
    }
  });

  it("every gallery note belongs to a catalogue product", () => {
    const slugs = new Set(products.map((p) => getProductSlug(p)));
    for (const slug of Object.keys(productGalleryNotes)) {
      expect({ slug, known: slugs.has(slug) }).toEqual({ slug, known: true });
    }
  });

  it("a gallery declared as renders has an 'Illustrative' alt on every image", () => {
    for (const [slug, note] of Object.entries(productGalleryNotes)) {
      if (!/all images on this page are illustrative/i.test(note)) continue;
      const product = products.find((p) => getProductSlug(p) === slug)!;
      for (const img of product.images ?? []) {
        if (typeof img !== "string") continue;
        const alt = getImageAltText(img) ?? "";
        expect({ slug, img, illustrative: /^Illustrative/.test(alt) }).toEqual({ slug, img, illustrative: true });
      }
    }
  });
});
