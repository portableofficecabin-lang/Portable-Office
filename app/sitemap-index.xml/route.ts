import sitemap from "../sitemap";
import { SITEMAP_SECTIONS, XML_HEADERS, sitemapIndexXml, splitSitemap } from "@/lib/seo/sitemapSections";

/**
 * /sitemap-index.xml — lists the per-type sitemaps (/sitemaps/<section>.xml) that have at least one
 * URL, so a section with no pages yet (e.g. "guides" before they exist) is never submitted empty.
 * robots.txt points here; /sitemap.xml stays the full flat list (see src/lib/seo/sitemapSections.ts).
 * Static: built once per deploy, like /sitemap.xml.
 */
export const dynamic = "force-static";

export async function GET() {
  const parts = splitSitemap(await sitemap());
  const sections = SITEMAP_SECTIONS.filter((s) => parts[s].length > 0);
  return new Response(sitemapIndexXml(sections), { headers: XML_HEADERS });
}
