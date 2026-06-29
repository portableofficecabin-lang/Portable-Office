// One-off: convert the VIP container office renders (PNG in Downloads) to optimized
// WebP in public/. Re-runnable; skips any source that's missing.
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "C:/Users/user/Downloads";
const OUT_DIR = "public/images/products/vip-container-office";
mkdirSync(OUT_DIR, { recursive: true });

const MAP = [
  ["same-model-front-side-view_m6M4BlHUWEK-dIHm2R1L8Q_lS8LKQyDT4iZuWzP62O9VA.png", "vip-container-office.webp"],
  ["same-model-right-side-view_FobAnT3cUtOMe2I0XqIVNQ_zZjNct3RQwyliFfQnzUnzg.png", "vip-container-office-exterior.webp"],
  ["same-model-front-side-view_eUsDXr2-U3uarLbXo-7_YQ_lS8LKQyDT4iZuWzP62O9VA_cover.png", "vip-container-office-entrance.webp"],
  ["same-model-left-side-view_iePMegMnX1KfiQDU7DkNrA_LggOscGeQvyBbdWBpO102w_cover.png", "vip-container-office-side.webp"],
  ["same-model-interior-view_-wLtVYIYVeG7M1Nn2S1ERw_yX1CoOh6R_uGg6EuvZbyBQ.png", "vip-container-office-interior.webp"],
];

for (const [src, dst] of MAP) {
  const from = join(SRC_DIR, src);
  if (!existsSync(from)) { console.warn("MISSING:", src); continue; }
  await sharp(from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT_DIR, dst));
  console.log("wrote", dst);
}
