#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (extname(full) === ".tsx") files.push(full);
  }
  return files;
}

for (const file of walk(SRC)) {
  let content = readFileSync(file, "utf-8");
  const match = content.match(/^([\s\S]*?)"use client";\n\n([\s\S]*)$/);
  if (match && !content.startsWith('"use client"')) {
    content = `"use client";\n\n${match[1]}${match[2]}`;
    writeFileSync(file, content);
    console.log("fixed use client:", file);
  }

  if (content.includes("<RedirectTo") && !content.includes('from "@/components/RedirectTo"')) {
    content = content.replace(
      /^(?:"use client";\n\n)?/,
      (m) => `${m}import { RedirectTo } from "@/components/RedirectTo";\n`,
    );
    writeFileSync(file, content);
    console.log("added RedirectTo:", file);
  }

  if (content.includes("<Outlet />")) {
    content = content.replace(/<Outlet \/>/g, "{children}");
    if (!content.includes("children: React.ReactNode")) {
      content = content.replace(
        /export default function (\w+)\(\)/,
        "export default function $1({ children }: { children: React.ReactNode })",
      );
    }
    writeFileSync(file, content);
    console.log("fixed Outlet:", file);
  }
}

console.log("Fix pass done.");
