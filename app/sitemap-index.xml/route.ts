import { XML_HEADERS, sitemapIndexXml } from "@/lib/seo/sitemapSections";

/**
 * /sitemap-index.xml — lists the per-type sitemaps (/sitemaps/<section>.xml). robots.txt points
 * here; /sitemap.xml stays the full flat list (see src/lib/seo/sitemapSections.ts for why).
 * Static: built once per deploy, like /sitemap.xml.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(sitemapIndexXml(), { headers: XML_HEADERS });
}
