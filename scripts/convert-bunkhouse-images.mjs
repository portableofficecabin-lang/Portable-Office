import sharp from "sharp";
import fs from "fs";
import path from "path";

// One-off: convert the supplied Portable Cabin 40ft Bunkhouse photos to compressed
// WebP for public/images/products/. Sources are the user's curated PNGs in Downloads.
// Follows the project convention in scripts/convert-webp.mjs (sharp + webp).

const DL = "C:/Users/user/Downloads";
const OUT_DIR = "public/images/products";

const MAP = [
  { src: `${DL}/FRONT IMAGE - Portable Cabin 40ft Bunkhouse.png`, out: "portable-cabin-40ft-bunkhouse-front.webp" },
  { src: `${DL}/SIDE IMAGE - Portable Cabin 40ft Bunkhouse.png`, out: "portable-cabin-40ft-bunkhouse-side.webp" },
  { src: `${DL}/OTHER SIDE - Portable Cabin 40ft Bunkhouse.png`, out: "portable-cabin-40ft-bunkhouse-angle.webp" },
  { src: `${DL}/BACK - Portable Cabin 40ft Bunkhouse.png`, out: "portable-cabin-40ft-bunkhouse-dimensions.webp" },
  { src: `${DL}/use-the-same-make-and-exact-model-as-the_JKwPHISSUuiOZDbga_EYZQ_-XMMJNSgSHe4OqpuHq1PFw.png`, out: "portable-cabin-40ft-bunkhouse-rear-utilities.webp" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
let done = 0;

for (const { src, out } of MAP) {
  if (!fs.existsSync(src)) {
    console.warn(`! Source missing: ${src} — skipped ${out}`);
    continue;
  }
  const outPath = path.join(OUT_DIR, out);
  try {
    const srcSize = fs.statSync(src).size;
    await sharp(src)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);
    const newSize = fs.statSync(outPath).size;
    console.log(`✓ ${out}  (${(srcSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB)`);
    done++;
  } catch (e) {
    console.error(`✗ ${out}:`, e.message);
  }
}

console.log(`\nConverted ${done}/${MAP.length} bunkhouse images into ${OUT_DIR}`);
