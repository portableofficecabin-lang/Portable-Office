# City-page release checklist

This applies to every PR that adds or edits a city page: `src/data/cityPages.ts`, the city template, `cityMainProductLinks.ts`, or city images.

**Merging = a production deploy.** Each PR needs the owner's explicit approval by number.

## Before merging
1. **Approval.** The owner has approved this PR by number.
2. **Refresh.** Bring the branch up to date with `origin/main`. After resolving conflicts, check for **0 conflict markers** before committing.
3. **Local gates.** Run:
   - the tsc and eslint ratchets (`node scripts/ci/ratchet.mjs tsc|eslint`);
   - `npm test`;
   - `npm run seo:audit`;
   - `next build`, then `npx tsx scripts/city-page-ssr-audit.ts <local origin>` (**every** city page must pass).
4. **CI.** All four checks (lint, typecheck, test, build) must be green **on the exact head** you will merge.
5. **Merge notice.** Announce the PR to every active session and wait for their acknowledgements (or about 2 minutes with no "hold"). Then merge **pinned to the head SHA and the expected `main` SHA**, and check that the merge commit's parents are exactly (that `main`, that head).

## During the deploy
6. **No site requests.** Make no requests to `portableofficecabin.com` from the merge until the **Deploy run has completed** *and* `/api/build-info` reports the merge SHA. Use the GitHub API only.

## After the deploy
7. **The page.** It returns `200`, has a canonical pointing to itself, is `index, follow`, and its title, H1 and links are as intended. Every page it links answers `200` without a redirect.
8. **The whole site.** Every sitemap URL returns `200`, and only the intended pages changed (diff the full inventory against a snapshot taken before the merge). The Merchant feed is byte-identical unless the PR was meant to change it.
9. **Sitemap dates (`<lastmod>`).** Do this after **every** release that edits `src/data/cityPages.ts`.

   City-page dates come from `src/data/sitemapLastmod.json`. The sitemap **withholds** a page's date once that page's content no longer matches the file. That is deliberate (no stale dates), but it means every edited or new page ships **without** a date until the file is regenerated.

   1. On a new branch from the updated `origin/main` (a full clone, not shallow), run `npm run seo:lastmod`.
   2. If `src/data/sitemapLastmod.json` changed, open a small PR containing only that file. In its description, show:
      - city pages dated, before and after. After must equal the number of city pages: none undated;
      - **existing dates unchanged**. Only the edited or new pages gain or move a date;
      - each new or moved date equals the GitHub `merged_at` of the release that last changed that page's own copy. Its Deploy run finished a few minutes later.
   3. After that PR deploys, check the live `/sitemaps/cities.xml`: every `<url>` has a `<lastmod>`, the URL list is unchanged, and the dates match the PR.
10. **Announce and follow up.** Send "deploy done `<sha>`" to the other sessions, and list the new or changed URLs that need **Request indexing** in Search Console (owner).
