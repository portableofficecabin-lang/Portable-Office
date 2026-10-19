// One-off: convert the five owner-supplied images for /products/ms-container-office-cabin to
// optimized WebP under public/images/products/ms-container-office-cabin/. Re-runnable; skips any
// missing source.
//
// The sources ("cabin (1).webp" … "cabin (5).webp") came in the owner's "MS Container Office Cabin
// product page" folder. Copy them to image-backups/ (gitignored, the existing home for originals);
// only the renamed WebP files ship.
//
// FULL FRAMES, NO CROP: each image keeps its original aspect ratio and is only scaled down (never
// up). The gallery shows them with object-fit: contain (productGalleryFit), so nothing is cut off
// or stretched. New file names, because the image optimizer caches by URL for a year
// (images.minimumCacheTTL), so re-using a name would keep serving an old variant.
//
// The 4:3 crops from the first version (container-office-cabin-{exterior,interior}-example.webp)
// stay on disk only so URLs already crawled (og:image, JSON-LD) still resolve; nothing shows them.
//
// NONE IS CONFIRMED AS THE 15 FT × 10 FT UNIT SOLD ON THE PAGE. Size, materials and fittings
// cannot be read from a photo, and the files carry no camera or generator metadata, so all five
// are shown as illustrative examples: "-example" file names, per-image alt text and an on-image
// label (productImageCaptions.ts), and a gallery note.
import sharp from "sharp";
import { mkdirSync, existsSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/ms-container-office-cabin-originals";
const OUT_DIR = "public/images/products/ms-container-office-cabin";
mkdirSync(OUT_DIR, { recursive: true });

// Gallery order: the exterior with the door first, the interior second, then the other views.
const MAP = [
  ["cabin (4).webp", "container-office-cabin-exterior-door-side-example.webp"],
  ["cabin (1).webp", "container-office-cabin-interior-wide-example.webp"],
  ["cabin (5).webp", "container-office-cabin-exterior-end-view-example.webp"],
  ["cabin (3).webp", "container-office-cabin-exterior-long-side-example.webp"],
  ["cabin (2).webp", "container-office-cabin-roof-aerial-example.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  const to = join(OUT_DIR, dst);
  const { width: w0, height: h0 } = await sharp(from).metadata();
  const encoded = await sharp(from)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  // A source that is already a small WebP at or under 1600 px can come out larger after a
  // re-encode; ship the original bytes then (same pixels, no second generation loss).
  if (w0 <= 1600 && encoded.info.size >= statSync(from).size) {
    copyFileSync(from, to);
    console.log("copied", dst, `${w0}×${h0}`, `${Math.round(statSync(to).size / 1024)} KB (original kept)`);
  } else {
    writeFileSync(to, encoded.data);
    console.log("wrote ", dst, `${encoded.info.width}×${encoded.info.height}`, `${Math.round(encoded.info.size / 1024)} KB (from ${w0}×${h0})`);
  }
}
