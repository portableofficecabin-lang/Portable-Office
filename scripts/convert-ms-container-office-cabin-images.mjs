// One-off: convert two owner-supplied images for /products/ms-container-office-cabin to optimized
// WebP under public/images/products/ms-container-office-cabin/. Re-runnable; skips any missing source.
//
// The sources ("cabin (4).webp", 2496×1664, and "cabin (1).webp", 1536×864) came in the owner's
// "MS Container Office Cabin product page" folder. Copy them to image-backups/ (gitignored, the
// existing home for originals); only the renamed WebP files ship.
//
// NEITHER IS CONFIRMED AS THE 15 FT × 10 FT UNIT SOLD ON THE PAGE. Size, materials and fittings
// cannot be read from a photo, and the files carry no camera or generator metadata, so both are
// shown as illustrative examples: "-example" file names, per-image alt text and an on-image label
// (productImageCaptions.ts), and a gallery note. Rename them and drop the labels only once the
// owner confirms they show this model.
//
// Both are cropped to 4:3, the gallery frame's ratio, so the frame shows the whole file rather than
// a centre crop: the exterior keeps the door at the left end and the far corner, the interior keeps
// both ceiling fans and the full right-hand window.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/ms-container-office-cabin-originals";
const OUT_DIR = "public/images/products/ms-container-office-cabin";
mkdirSync(OUT_DIR, { recursive: true });

// Gallery order: exterior first, interior second (the existing image stays third).
const MAP = [
  {
    src: "cabin (4).webp",
    dst: "container-office-cabin-exterior-example.webp",
    crop: { left: 108, top: 0, width: 2219, height: 1664 },
    width: 1600,
  },
  {
    src: "cabin (1).webp",
    dst: "container-office-cabin-interior-example.webp",
    crop: { left: 243, top: 0, width: 1152, height: 864 },
    width: 1152,
  },
];

for (const { src, dst, crop, width } of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  const info = await sharp(from)
    .extract(crop)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(join(OUT_DIR, dst));
  console.log("wrote", dst, `${info.width}×${info.height}`, `${Math.round(info.size / 1024)} KB`);
}
