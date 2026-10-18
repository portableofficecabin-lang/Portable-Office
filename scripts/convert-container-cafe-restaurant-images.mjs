// One-off: convert the owner-supplied Container Cafe & Restaurant renders to optimized WebP under
// public/images/products/container-cafe-restaurant/. Re-runnable; skips any missing source.
//
// The five sources ("cabin (1).webp" … "cabin (5).webp", 1536×1024) were dropped into
// public/images/Container Cafe & Restaurant product page/, which Next would serve verbatim under a
// URL with spaces and an ampersand. Copy them to image-backups/ (gitignored, the existing home for
// originals) and only the renamed WebP files ship.
//
// ALL FIVE ARE AI-GENERATED RENDERS, not photographs of a delivered cafe. Every place they appear
// says so: the gallery note and per-image alt text (products.ts / productImageCaptions.ts) and the
// figure captions in ContainerCafeRestaurantContent.tsx.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/container-cafe-restaurant-originals";
const OUT_DIR = "public/images/products/container-cafe-restaurant";
mkdirSync(OUT_DIR, { recursive: true });

// Ordered as the gallery shows them: the container kitchen leads (a single-level fit-out, the
// format every cafe shares) → the stacked concept's front elevation → its stair and ground-floor
// unit → aerial view → upper-floor dining room.
const MAP = [
  ["cabin (4).webp", "container-cafe-restaurant-kitchen.webp"],
  ["cabin (1).webp", "container-cafe-restaurant-front-exterior.webp"],
  ["cabin (3).webp", "container-cafe-restaurant-staircase-deck.webp"],
  ["cabin (5).webp", "container-cafe-restaurant-aerial.webp"],
  ["cabin (2).webp", "container-cafe-restaurant-dining-interior.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
