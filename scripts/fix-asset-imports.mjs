import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const importRe = /import\s+(\w+)\s+from\s+["']@\/assets[^"']+["']/g;

for (const file of walk(srcDir)) {
  if (file.includes("resolveImageUrl.ts")) continue;

  let content = fs.readFileSync(file, "utf8");
  const names = [...content.matchAll(importRe)].map((m) => m[1]);
  if (!names.length) continue;

  let changed = false;

  for (const name of names) {
    const objectSrcRe = new RegExp(`\\{\\s*src:\\s*${name}\\s*,`, "g");
    if (objectSrcRe.test(content)) {
      content = content.replace(objectSrcRe, `{ src: resolveImageUrl(${name}),`);
      changed = true;
    }

    const attrRe = new RegExp(`src=\\{${name}\\}`, "g");
    if (attrRe.test(content)) {
      content = content.replace(attrRe, `src={resolveImageUrl(${name})}`);
      changed = true;
    }
  }

  // img src={expr.src} / src={expr.logo} etc.
  content = content.replace(/src=\{([a-zA-Z0-9_.]+)\}/g, (match, expr) => {
    if (match.includes("resolveImageUrl")) return match;
    if (expr.startsWith('"') || expr.startsWith("'") || expr.startsWith("`")) return match;
    if (expr.startsWith("/")) return match;
    if (/^https?:/.test(expr)) return match;
    changed = true;
    return `src={resolveImageUrl(${expr})}`;
  });

  if (!changed) continue;

  if (!content.includes('from "@/utils/resolveImageUrl"')) {
    const lines = content.split("\n");
    let insertAt = 0;
    while (insertAt < lines.length && /^import\s/.test(lines[insertAt])) insertAt++;
    lines.splice(insertAt, 0, 'import { resolveImageUrl } from "@/utils/resolveImageUrl";');
    content = lines.join("\n");
  }

  fs.writeFileSync(file, content);
  console.log("fixed:", path.relative(root, file));
}
