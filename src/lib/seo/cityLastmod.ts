import { createHash } from "node:crypto";
import type { CityPage } from "@/data/cityPages";
import manifest from "@/data/sitemapLastmod.json";

/**
 * <lastmod> for city pages, from the git-derived manifest written by `npm run seo:lastmod`
 * (scripts/seo/sitemap-lastmod.ts). The date is emitted ONLY while the page's runtime data still
 * hashes to what the manifest recorded: a page edited since the last run, or added after it, gets
 * no lastmod — never a stale one. Google uses lastmod only from sitemaps where it is consistently
 * accurate, so an honest omission is worth more than a date that is sometimes wrong.
 */

type Entry = { lastmod: string; commit: string; sha: string };
const CITIES = (manifest as { cities: Record<string, Entry> }).cities;

/** Stable hash of the page's data object (key order is source order; undefined fields drop out). */
export function cityContentHash(page: CityPage): string {
  return createHash("sha256").update(JSON.stringify(page)).digest("hex").slice(0, 16);
}

export function cityLastModified(page: CityPage): string | undefined {
  const e = CITIES[page.slug];
  return e && e.sha === cityContentHash(page) ? e.lastmod : undefined;
}
