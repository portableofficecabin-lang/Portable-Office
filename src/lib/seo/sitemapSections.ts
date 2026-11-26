import type { MetadataRoute } from "next";

/**
 * PER-TYPE SITEMAPS — the same URL set as /sitemap.xml, split by page type so Search Console's
 * Page-indexing report can be filtered per sitemap (products vs categories vs city pages vs
 * promotions vs blog vs everything else).
 *
 *   /sitemap-index.xml          → <sitemapindex> listing the six files below (robots.txt points here)
 *   /sitemaps/<section>.xml     → one <urlset> per section
 *   /sitemap.xml                → UNCHANGED: the full flat <urlset>
 *
 * WHY /sitemap.xml STAYS FLAT. It is already submitted in Search Console, and the deploy and CI
 * tooling reads it as a page list: verify-release.mjs and deploy-portable-office.sh request every
 * <loc> after each deploy, and seo-audit.mjs, site-inventory.ts, merchant-url-audit.mjs and the
 * product-variant tests do the same. Turning it into an index would make those checks request
 * six sitemap files instead of ~380 pages and still pass. The split files are built from the SAME
 * entries (app/sitemap.ts's default export), so the two views cannot drift apart:
 * sitemapSections.test.ts checks that every URL lands in exactly one section.
 *
 * Classification is by URL path only, so a new page type needs no change here unless it lives
 * under a new top-level path (it then falls into "pages", which is still submitted).
 */

export const SITE_URL = "https://portableofficecabin.com";

// "guides" = /guides/<slug> buying guides (D5, PR #345 moves the portable-cabin guides there). Until
// they exist the section is empty, and the index lists only sections that have URLs.
export const SITEMAP_SECTIONS = ["pages", "products", "categories", "cities", "promotions", "blog", "guides"] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

/** Published path of a section's file, e.g. "/sitemaps/products.xml". */
export const sectionPath = (section: SitemapSection) => `/sitemaps/${section}.xml`;
export const SITEMAP_INDEX_PATH = "/sitemap-index.xml";

/** Which per-type sitemap a URL belongs to. Index pages (/products, /blog, /cities-we-serve,
 *  /promotions, /guides) are hubs, not members of their type, so they go to "pages". */
export function sitemapSectionFor(url: string): SitemapSection {
  const path = url.startsWith("http") ? new URL(url).pathname : url;
  if (/^\/products\/category\/[^/]+$/.test(path)) return "categories";
  if (/^\/products\/.+/.test(path)) return "products";
  if (/^\/cities-we-serve\/.+/.test(path)) return "cities";
  if (/^\/promotions\/.+/.test(path)) return "promotions";
  if (/^\/blog\/.+/.test(path)) return "blog";
  if (/^\/guides\/.+/.test(path)) return "guides";
  return "pages";
}

export function splitSitemap(entries: MetadataRoute.Sitemap): Record<SitemapSection, MetadataRoute.Sitemap> {
  const out = Object.fromEntries(SITEMAP_SECTIONS.map((s) => [s, [] as MetadataRoute.Sitemap])) as Record<
    SitemapSection,
    MetadataRoute.Sitemap
  >;
  for (const e of entries) out[sitemapSectionFor(e.url)].push(e);
  return out;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** W3C datetime as Next's own sitemap serialiser writes it (a bare YYYY-MM-DD string is kept as is). */
function lastmod(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

/** One <urlset>, in the same shape Next emits for /sitemap.xml (loc, lastmod, changefreq, priority). */
export function urlsetXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((e) => {
      const parts = [`<loc>${xmlEscape(e.url)}</loc>`];
      if (e.lastModified) parts.push(`<lastmod>${lastmod(e.lastModified)}</lastmod>`);
      if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>\n${parts.join("\n")}\n</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** The <sitemapindex>, listing the given sections (the route passes only non-empty ones, so an empty
 *  section is never submitted). No <lastmod> per child: a child also changes when a URL is added or
 *  removed, which no entry date records, so any date here would be a guess. */
export function sitemapIndexXml(sections: readonly SitemapSection[] = SITEMAP_SECTIONS): string {
  const body = sections.map((s) => `<sitemap>\n<loc>${SITE_URL}${sectionPath(s)}</loc>\n</sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  // Same edge policy as the other public documents (next.config.ts PUBLIC_HTML_CACHE).
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
} as const;
