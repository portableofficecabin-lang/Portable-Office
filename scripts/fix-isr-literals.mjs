#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "(site)");

const marketingBlock =
  /import \{ REVALIDATE_MARKETING \} from "@\/lib\/revalidate";\s*\n\s*export const revalidate = REVALIDATE_MARKETING;\s*\n*/g;

const productsBlock =
  /import \{ REVALIDATE_PRODUCTS \} from "@\/lib\/revalidate";\s*\n*/g;

const productsRevalidate =
  /export const revalidate = REVALIDATE_PRODUCTS;\s*\n*/g;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry === "page.tsx") {
      let content = readFileSync(full, "utf-8");
      const original = content;
      content = content.replace(
        marketingBlock,
        "export const revalidate = 3600; // 1 hour\n\n",
      );
      content = content.replace(
        productsBlock,
        "",
      );
      content = content.replace(
        productsRevalidate,
        "export const revalidate = 1800; // 30 minutes\n\n",
      );
      if (content !== original) {
        writeFileSync(full, content);
        console.log("fixed", relative(SITE, full));
      }
    }
  }
}

walk(SITE);
console.log("Done.");
