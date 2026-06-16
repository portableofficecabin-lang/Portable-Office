#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = [
  join(ROOT, "src", "pages"),
  join(ROOT, "src", "components"),
  join(ROOT, "src", "contexts"),
  join(ROOT, "src", "hooks"),
];

const HOOK_PATTERNS = [
  /useState\b/,
  /useEffect\b/,
  /useRef\b/,
  /useCallback\b/,
  /useMemo\b/,
  /useContext\b/,
  /createContext\b/,
  /useReducer\b/,
  /useLayoutEffect\b/,
  /framer-motion/,
  /usePathname\b/,
  /useRouter\b/,
  /useParams\b/,
  /useSearchParams\b/,
];

function walk(dir, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (extname(full) === ".tsx" || extname(full) === ".ts") files.push(full);
  }
  return files;
}

let count = 0;
for (const dir of DIRS) {
  for (const file of walk(dir)) {
    let content = readFileSync(file, "utf-8");
    if (content.startsWith('"use client"') || content.startsWith("'use client'")) continue;
    if (!HOOK_PATTERNS.some((p) => p.test(content))) continue;
    content = `"use client";\n\n${content}`;
    writeFileSync(file, content);
    count++;
    console.log("added use client:", file.replace(ROOT, ""));
  }
}

// All app page wrappers should be client boundaries
const appDir = join(ROOT, "app");
for (const file of walk(appDir)) {
  if (!file.endsWith("page.tsx") && !file.endsWith("not-found.tsx")) continue;
  let content = readFileSync(file, "utf-8");
  if (content.startsWith('"use client"')) continue;
  if (content.includes("generateMetadata") || content.includes("generateStaticParams")) continue;
  content = `"use client";\n\n${content}`;
  writeFileSync(file, content);
  count++;
  console.log("client page wrapper:", file.replace(ROOT, ""));
}

console.log(`Done. ${count} files updated.`);
