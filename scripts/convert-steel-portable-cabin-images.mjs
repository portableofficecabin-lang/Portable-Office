// One-off: convert the owner-supplied Steel Portable Cabin renders to optimized WebP under
// public/images/products/steel-portable-cabin/. Re-runnable; skips any missing source.
//
// The 9.5 MB of source PNGs were dropped into public/images/products/Steel portable cabin/,
// which Next serves verbatim — so they were moved to image-backups/ (gitignored, the existing
// home for originals) and only the WebP files ship. products.ts, the gallery, the OG image and
// the Merchant feed all reference the WebP paths.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/steel-portable-cabin-originals";
const OUT_DIR = "public/images/products/steel-portable-cabin";
mkdirSync(OUT_DIR, { recursive: true });

// Ordered as the gallery shows them: front elevation (hero) → angled exterior → interior
// → blank side/rear → ventilated site unit → roof plan.
const MAP = [
  ["Steel portable cabin images (1).png", "steel-portable-cabin-front.webp"],
  ["Steel portable cabin images (6).png", "steel-portable-cabin-angled-exterior.webp"],
  ["Steel portable cabin images (4).png", "steel-portable-cabin-interior-office.webp"],
  ["Steel portable cabin images (3).png", "steel-portable-cabin-side-rear.webp"],
  ["Steel portable cabin images (5).png", "steel-portable-cabin-ventilated-unit.webp"],
  ["Steel portable cabin images (2).png", "steel-portable-cabin-roof.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
