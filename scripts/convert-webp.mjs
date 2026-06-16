import sharp from "sharp";
import fs from "fs";
import path from "path";

const dirs = ["src/assets/products", "src/assets", "src/assets/blog", "src/assets/projects", "src/assets/rental", "src/assets/clients", "src/assets/content"];
let saved = 0, count = 0;

async function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { await walk(p); continue; }
    if (!/\.(png|jpg|jpeg)$/i.test(f)) continue;
    if (st.size < 80_000) continue; // skip small
    const out = p.replace(/\.(png|jpg|jpeg)$/i, ".webp");
    try {
      const meta = await sharp(p).metadata();
      const maxW = Math.min(meta.width || 1600, 1600);
      await sharp(p).resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out + ".tmp");
      const newSize = fs.statSync(out + ".tmp").size;
      if (newSize < st.size * 0.9) {
        fs.renameSync(out + ".tmp", out);
        saved += st.size - newSize;
        count++;
        // remove original png/jpg if webp replaces; keep originals to avoid breaking imports
      } else {
        fs.unlinkSync(out + ".tmp");
      }
    } catch(e) { console.error(p, e.message); }
  }
}

for (const d of dirs) await walk(d);
console.log(`Converted ${count} files, saved ${(saved/1024/1024).toFixed(1)} MB`);
