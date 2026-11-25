import sitemap from "../../sitemap";
import { SITEMAP_SECTIONS, XML_HEADERS, splitSitemap, urlsetXml, type SitemapSection } from "@/lib/seo/sitemapSections";

/**
 * /sitemaps/<section>.xml — one <urlset> per page type, cut from the SAME entries as /sitemap.xml
 * (app/sitemap.ts), so the two can never disagree about which URLs are submitted.
 *
 * Only the six known files exist (dynamicParams = false → any other name is a 404 decided at build,
 * never rendered on demand). Static like /sitemap.xml: built once per deploy.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_SECTIONS.map((section) => ({ file: `${section}.xml` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const section = file.replace(/\.xml$/, "") as SitemapSection;
  if (!SITEMAP_SECTIONS.includes(section)) return new Response("Not found", { status: 404 });
  const parts = splitSitemap(await sitemap());
  return new Response(urlsetXml(parts[section]), { headers: XML_HEADERS });
}
