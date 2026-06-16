#!/usr/bin/env node
/**
 * Migrates react-router-dom imports to Next.js navigation across src/
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "test") continue;
      walk(full, files);
    } else if (extname(full) === ".tsx" || extname(full) === ".ts") {
      files.push(full);
    }
  }
  return files;
}

const files = walk(SRC).filter((f) => !f.includes("App.tsx"));

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  if (!content.includes("react-router-dom")) continue;

  let changed = true;

  // Remove react-router imports and rebuild
  const imports = new Set();
  if (content.match(/\bLink\b/) && content.includes('from "react-router-dom"')) imports.add("Link");
  if (content.match(/\buseNavigate\b/)) imports.add("useRouter");
  if (content.match(/\buseParams\b/)) imports.add("useParams");
  if (content.match(/\buseLocation\b/)) imports.add("usePathname");
  if (content.match(/\buseSearchParams\b/)) imports.add("useSearchParams");
  if (content.match(/\bNavigate\b/)) imports.add("redirect");
  if (content.match(/\bNavLink\b/) && !file.endsWith("NavLink.tsx")) imports.add("NavLink");

  content = content.replace(
    /import\s+\{[^}]+\}\s+from\s+["']react-router-dom["'];?\n?/g,
    "",
  );
  content = content.replace(
    /import\s+\w+\s+from\s+["']react-router-dom["'];?\n?/g,
    "",
  );

  const nextImports = [];
  if (imports.has("Link") || imports.has("NavLink")) {
    nextImports.push('import Link from "next/link";');
  }
  const navHooks = [];
  if (imports.has("useRouter")) navHooks.push("useRouter");
  if (imports.has("useParams")) navHooks.push("useParams");
  if (imports.has("usePathname")) navHooks.push("usePathname");
  if (imports.has("useSearchParams")) navHooks.push("useSearchParams");
  if (navHooks.length) {
    nextImports.push(`import { ${navHooks.join(", ")} } from "next/navigation";`);
  }
  if (imports.has("redirect")) {
    nextImports.push('import { redirect } from "next/navigation";');
  }

  if (nextImports.length) {
    const useClientNeeded =
      !content.startsWith('"use client"') &&
      !content.startsWith("'use client'") &&
      (navHooks.length > 0 || content.includes("useState") || content.includes("useEffect"));
    if (useClientNeeded) {
      content = `"use client";\n\n${content}`;
    }
    content = `${nextImports.join("\n")}\n${content}`;
  }

  content = content.replace(/\bto=\{/g, "href={");
  content = content.replace(/\bto="/g, 'href="');
  content = content.replace(/\bto='/g, "href='");
  content = content.replace(/\buseNavigate\(\)/g, "useRouter()");
  content = content.replace(/\bnavigate\(/g, "router.push(");
  content = content.replace(/\bconst navigate = useRouter\(\)/g, "const router = useRouter()");
  content = content.replace(/\bconst navigate =/g, "const router =");
  content = content.replace(/\buseLocation\(\)/g, "usePathname()");
  content = content.replace(/\blocation\.pathname/g, "pathname");
  content = content.replace(/\bconst location = usePathname\(\)/g, "const pathname = usePathname()");
  content = content.replace(/\bconst \{ pathname \} = usePathname\(\)/g, "const pathname = usePathname()");
  content = content.replace(/<Navigate to=/g, "<RedirectTo to=");
  content = content.replace(/return <Navigate /g, "return <RedirectTo ");

  writeFileSync(file, content);
  console.log("migrated", file.replace(SRC, "src"));
}

console.log("Migration pass complete.");
