// One-off: convert the owner-supplied Portable Shop Cabin renders to optimized WebP under
// public/images/products/portable-shop-cabin/. Re-runnable; skips any missing source.
//
// The six sources ("cabin (1).webp" … "cabin 6.webp", 1536×1024 to 2496×1664) were dropped into
// public/images/Portable Shop Cabin  product page/product page 3/, which Next would serve verbatim
// under a URL with spaces. Copy them to image-backups/ (gitignored, the existing home for
// originals) and only the renamed WebP files ship.
//
// ALL ARE AI-GENERATED RENDERS, not photographs of a delivered cabin (owner, 2026-10-18). Every
// place they appear says so: the gallery note and per-image alt text (productImageCaptions.ts)
// and the figure captions in PortableShopCabinContent.tsx.
//
// Two sources are deliberately NOT converted:
//   · "cabin (1).webp" — an office interior (desk, task chair, laptop), not a shop. Dropped on the
//     owner's instruction; the page needs a matching retail interior instead.
//   · "cabin (4).webp" — a side wall with a second, steel container-style door. Neither the copy
//     nor the other renders include that door, so showing it would sell an unconfirmed feature.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/portable-shop-cabin-originals";
const OUT_DIR = "public/images/products/portable-shop-cabin";
mkdirSync(OUT_DIR, { recursive: true });

// Ordered as the gallery shows them: the three-quarter view of the glass front and lockable door
// leads → the fully glazed side → the overhead view → the solid rear wall.
const MAP = [
  ["cabin 6.webp", "portable-shop-cabin-front-three-quarter.webp"],
  ["cabin (5).webp", "portable-shop-cabin-glazed-side.webp"],
  ["cabin (2).webp", "portable-shop-cabin-overhead.webp"],
  ["cabin (3).webp", "portable-shop-cabin-rear-wall.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
