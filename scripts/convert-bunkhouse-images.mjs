import sharp from "sharp";
import fs from "fs";
import path from "path";

// One-off: convert the 5 supplied Portable Cabin 40ft Bunkhouse photos to
// compressed WebP for public/images/products/. Source files live in
// scripts/source-images/bunkhouse/ named by display-order prefix (any image ext).
// Follows the project convention in scripts/convert-webp.mjs (sharp + webp).

const SRC_DIR = "scripts/source-images/bunkhouse";
const OUT_DIR = "public/images/products";

// prefix in source filename -> output webp name
const MAP = [
  { prefix: "01-front", out: "portable-cabin-40ft-bunkhouse-front.webp" },
  { prefix: "02-dimensions", out: "portable-cabin-40ft-bunkhouse-dimensions.webp" },
  { prefix: "03-angle", out: "portable-cabin-40ft-bunkhouse-angle.webp" },
  { prefix: "04-rear-utilities", out: "portable-cabin-40ft-bunkhouse-rear-utilities.webp" },
  { prefix: "05-side", out: "portable-cabin-40ft-bunkhouse-side.webp" },
];

if (!fs.existsSync(SRC_DIR)) {
  console.error(`Source folder not found: ${SRC_DIR}\nPlace the 5 photos there (e.g. 01-front.jpg, 02-dimensions.jpg, …) and re-run.`);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let done = 0;

for (const { prefix, out } of MAP) {
  const match = files.find((f) => f.toLowerCase().startsWith(prefix));
  if (!match) {
    console.warn(`! No source file starting with "${prefix}" — skipped ${out}`);
    continue;
  }
  const inPath = path.join(SRC_DIR, match);
  const outPath = path.join(OUT_DIR, out);
  try {
    const srcSize = fs.statSync(inPath).size;
    await sharp(inPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);
    const newSize = fs.statSync(outPath).size;
    console.log(
      `✓ ${match} -> ${out}  (${(srcSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB)`,
    );
    done++;
  } catch (e) {
    console.error(`✗ ${match}:`, e.message);
  }
}

console.log(`\nConverted ${done}/${MAP.length} bunkhouse images into ${OUT_DIR}`);
