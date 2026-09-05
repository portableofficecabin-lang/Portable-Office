// One-off: normalise the owner-supplied Metal Portable Cabin renders into the repo's
// naming convention under public/images/products/metal-portable-cabin/.
// Re-runnable; skips any missing source.
//
// The sources arrived already WebP at 1024x1024, so this re-encodes at q80 rather than
// resizing (withoutEnlargement would make a resize a no-op at that size). The originals
// live in image-backups/ — gitignored, and the only copy of the untouched artwork.
//
// Gallery order below is the same one the Steel Portable Cabin page established:
// front elevation (hero) -> angled front -> interior -> rear/service side ->
// alternate colour finish -> elevated view.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/metal-portable-cabin-originals";
const OUT_DIR = "public/images/products/metal-portable-cabin";
mkdirSync(OUT_DIR, { recursive: true });

const MAP = [
  ["Metal Portable Cabin — Product images (2).webp", "metal-portable-cabin-front.webp"],
  ["Metal Portable Cabin — Product images (6).webp", "metal-portable-cabin-angled-front.webp"],
  ["Metal Portable Cabin — Product images (4).webp", "metal-portable-cabin-interior-office.webp"],
  ["Metal Portable Cabin — Product images (1).webp", "metal-portable-cabin-rear-service-side.webp"],
  ["Metal Portable Cabin — Product images (5).webp", "metal-portable-cabin-colour-coated-terracotta.webp"],
  ["Metal Portable Cabin — Product images (3).webp", "metal-portable-cabin-elevated-view.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).webp({ quality: 80 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
