import type { CityPage } from "@/data/cityPages";
import { cityLastModified } from "@/lib/seo/cityLastmod";

/**
 * Which city pages would ship WITHOUT a sitemap <lastmod> right now.
 *
 * app/sitemap.ts emits a city page's date only while the page's content still hashes to what
 * src/data/sitemapLastmod.json recorded (src/lib/seo/cityLastmod.ts). Any release that edits or adds a
 * page in src/data/cityPages.ts therefore leaves that page undated until `npm run seo:lastmod` is run
 * on main and the regenerated manifest is merged (docs/seo/city-page-release-checklist.md, step 9).
 * This check makes that gap visible instead of silent; it never invents a date.
 */
export interface UndatedCityPage {
  slug: string;
  reason: "not-in-manifest" | "content-changed";
}

export function undatedCityPages(
  pages: readonly CityPage[],
  manifestSlugs: ReadonlySet<string>,
  lastmodOf: (page: CityPage) => string | undefined = cityLastModified,
): UndatedCityPage[] {
  return pages
    .filter((page) => !lastmodOf(page))
    .map((page) => ({ slug: page.slug, reason: manifestSlugs.has(page.slug) ? "content-changed" : "not-in-manifest" }));
}
