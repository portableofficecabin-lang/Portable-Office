import { NextResponse } from "next/server";
import { categories } from "@/data/products";

/**
 * ── LEGACY WORDPRESS TAG URLS → 301 ───────────────────────────────────────────────────────────
 * WordPress served tag archives at /product-tag/<tag>. A tag is a topic, not a product, so the
 * closest live equivalent is the matching CATEGORY listing; when no category fits, the full
 * /products listing. Never the homepage (a blanket homepage redirect reads as a soft-404 to
 * Google and squanders whatever signal the tag page held).
 */

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\.html?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const tokens = (s: string): Set<string> =>
  new Set(norm(s).split("-").filter((t) => t.length > 2));

function overlap(request: Set<string>, candidate: string): number {
  const c = tokens(candidate);
  if (c.size === 0 || request.size === 0) return 0;
  let hit = 0;
  for (const t of request) if (c.has(t)) hit++;
  return hit / Math.max(request.size, c.size);
}

export function GET(request: Request, { params }: { params: { tag: string[] } }): Response {
  const req = tokens((params.tag ?? []).join("-"));

  let best: { path: string; score: number } | null = null;
  for (const c of categories) {
    const score = Math.max(overlap(req, c.slug), overlap(req, c.name));
    if (!best || score > best.score) best = { path: `/products/category/${c.slug}`, score };
  }

  const path = best && best.score >= 0.34 ? best.path : "/products";
  return NextResponse.redirect(new URL(path, "https://portableofficecabin.com"), 301);
}
