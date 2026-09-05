// One-off: the owner supplied six renders for the Prefabricated Portable Cabin (POC-PC-PREFAB).
// Only ONE of them shows the product this SKU actually sells.
//
// Images 2-6 are a furnished prefab HOUSE — porch, curtains, sofa, pitched roof on a lawn. This
// SKU is a site-office / security / storage cabin at Rs 3,24,500 and it is LIVE in the Google
// Merchant feed, where g:image_link must show the thing being sold. Owner decision (2026-09-05):
// ship only the real cabin. The other five stay in image-backups/ for a future Prefab Homes page.
//
// This is a genuine improvement regardless: the product had images:["/placeholder.svg"], so the
// feed was borrowing the SIBLING product's photo (prefab-porta-cabin-exterior.webp) as its
// g:image_link. Now it has one of its own.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "image-backups/public/images/products/prefabricated-portable-cabin-originals";
const OUT_DIR = "public/images/products/prefabricated-portable-cabin";
mkdirSync(OUT_DIR, { recursive: true });

const MAP = [
  ["prefabricated portable cabin image (1).webp", "prefabricated-portable-cabin-factory-yard.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
