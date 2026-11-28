/**
 * `npm run seo:lastmod:check [-- --warn]` — lists city pages that would ship without a sitemap <lastmod>.
 *
 *   exit 0  every city page is dated
 *   exit 1  some are undated (exit 0 with --warn, for the post-merge reminder workflow)
 *
 * The fix is never to edit the manifest by hand: on a branch from the updated origin/main run
 * `npm run seo:lastmod` and open a small PR (docs/seo/city-page-release-checklist.md, step 9).
 */
import { appendFileSync } from "node:fs";
import { CITY_PAGES } from "../../src/data/cityPages";
import manifest from "../../src/data/sitemapLastmod.json";
import { undatedCityPages } from "../../src/lib/seo/cityLastmodCheck";

const warnOnly = process.argv.includes("--warn");
const meta = manifest as { generatedFrom?: string; cities: Record<string, unknown> };
const undated = undatedCityPages(CITY_PAGES, new Set(Object.keys(meta.cities)));
const dated = CITY_PAGES.length - undated.length;

const lines = [
  `City pages with a sitemap <lastmod>: ${dated}/${CITY_PAGES.length} (manifest generated from ${meta.generatedFrom ?? "?"}).`,
  ...(undated.length
    ? [
        `${undated.length} city page(s) would ship WITHOUT a <lastmod>:`,
        ...undated.map((u) => `- ${u.slug} (${u.reason === "content-changed" ? "edited since the manifest was generated" : "added since the manifest was generated"})`),
        "",
        "Fix: on a branch from the updated origin/main run `npm run seo:lastmod`, then open a small PR with",
        "src/data/sitemapLastmod.json (docs/seo/city-page-release-checklist.md, step 9).",
      ]
    : ["Every city page is dated."]),
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `undated=${undated.length}\n`);
process.exit(undated.length && !warnOnly ? 1 : 0);
