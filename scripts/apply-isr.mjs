#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "app", "(site)");

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

const MARKETING_PAGES = new Set([
  "page.tsx",
  "about-us/page.tsx",
  "products/page.tsx",
  "gallery/page.tsx",
  "contact/page.tsx",
  "faq/page.tsx",
  "careers/page.tsx",
  "warranty/page.tsx",
  "shipping/page.tsx",
  "privacy-policy/page.tsx",
  "terms-and-conditions/page.tsx",
  "refund-policy/page.tsx",
  "rental-service/page.tsx",
  "book-appointment/page.tsx",
]);

const BLOG_PAGES = new Set([
  "blog/page.tsx",
  "blog/labour-shed-prefabricated-structures/page.tsx",
  "blog/porta-cabins-on-rent/page.tsx",
  "blog/ms-portable-cabin-durable-mild-steel-modular-building/page.tsx",
  "blog/prefabricated-labor-colony-bengaluru/page.tsx",
  "blog/portable-cabin-manufacturers-in-bangalore/page.tsx",
]);

const DYNAMIC_PAGES = new Set([
  "login/page.tsx",
  "register/page.tsx",
  "forgot-password/page.tsx",
  "reset-password/page.tsx",
  "cart/page.tsx",
  "checkout/page.tsx",
  "my-account/page.tsx",
  "my-account/orders/page.tsx",
]);

function stripUseClient(content) {
  return content
    .replace(/^"use client";\s*\n*/m, "")
    .replace(/^'use client';\s*\n*/m, "")
    .replace(/^import \{ REVALIDATE_MARKETING \} from "@\/lib\/revalidate";\s*\n*export const revalidate = REVALIDATE_MARKETING;\s*\n*/m, "");
}

function updatePage(filePath, relPath) {
  let content = readFileSync(filePath, "utf-8");
  const normalized = normalizePath(relPath);

  if (normalized === "products/[slug]/page.tsx") {
    return false;
  }

  if (DYNAMIC_PAGES.has(normalized)) {
    content = stripUseClient(content);
    if (!content.includes('export const dynamic = "force-dynamic"')) {
      content = `export const dynamic = "force-dynamic";\n\n${content}`;
    }
    writeFileSync(filePath, content);
    console.log("dynamic:", normalized);
    return true;
  }

  if (MARKETING_PAGES.has(normalized)) {
    content = stripUseClient(content);
    if (!content.includes("export const revalidate = 3600")) {
      content = `export const revalidate = 3600; // 1 hour\n\n${content}`;
    }
    writeFileSync(filePath, content);
    console.log("marketing ISR:", normalized);
    return true;
  }

  if (BLOG_PAGES.has(normalized)) {
    content = stripUseClient(content);
    writeFileSync(filePath, content);
    console.log("blog ISR (layout):", normalized);
    return true;
  }

  return false;
}

function walk(dir, base = SITE) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base);
    else if (entry === "page.tsx") {
      updatePage(full, relative(base, full));
    }
  }
}

walk(SITE);
console.log("ISR applied.");
