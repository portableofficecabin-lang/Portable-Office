# D4 runbook: deploy, migrate, roll back (PR #344)

**Applies to:** PR #344, "rename the six location-named container URLs to their grade".
**Owner approvals required (each separate):**
1. Merge and deploy: approval of **#344** by number.
2. Production Supabase migration: a separate approval given after step 2 has passed live.
3. A rollback: approval of the revert PR by number, like any merge to `main`.

Nothing in this PR changes ids, SKUs, prices, page content, the Merchant feed or the purchase flow. None of the six products is in the Merchant feed (`merchantFeedPolicy.ts`). The feed rendered from this branch is byte-identical to `main`'s.

## The six renames

| id | SKU | Old URL `/products/…` | New URL `/products/…` |
|---|---|---|---|
| 29 | POC-SC-KRMG | shipping-container-in-kormangala | used-20ft-shipping-container-as-is-grade |
| 30 | POC-SC-KRSH | shipping-container-in-krishnagiri | refurbished-20ft-shipping-container-premium |
| 31 | POC-SC-SIPCOT | shipping-container-in-sipcot | refurbished-20ft-shipping-container-industrial |
| 32 | POC-SC-CHN | shipping-container-in-chennai | used-20ft-shipping-container-wind-water-tight |
| 33 | POC-SC-NRSP | shipping-container-in-narsapura-industrial | refurbished-20ft-shipping-container |
| 34 | POC-SC-PNYA | shipping-container-in-peenya-industrial | used-20ft-shipping-container-cargo-worthy |

The same list is kept in four places, and unit tests check that they agree:
- `src/data/productSlugRenames.ts`
- the 12 rules in `next.config.ts`
- the legacy `/product/<old>` route
- the SQL migration

The `/promotions/shipping-container-in-*` pages are different URLs and do **not** change.

## What the migration does, and why it is optional for the site

`supabase/migrations/20261126120000_product_slug_renames.sql`:
1. creates `public.product_slug_aliases`, with RLS that lets anyone read and only admins write;
2. inserts the six pairs;
3. renames `public.products.slug` from an old slug to the new one. It only touches rows that still carry the old slug, and skips a row if the new slug is already taken.

The site never reads this table, because the code holds the map. Product rows join their catalogue twin by the slugified product **name**, not by the `slug` column (`src/lib/products/merge.ts`). Reviews are read under both the current and the earlier slugs (`src/lib/reviews/data.ts`). As a result:
- the site works fully, and identically, **with or without** the migration;
- the migration keeps the database consistent with the site: the admin product list and the sitemap `lastmod` look up `products.slug`.

**Production today:** `products` is readable by everyone (policy "Anyone can view products", `using (true)`), and it holds one row, `container-office`. So step 3 of the migration would update **0 rows** today. The migration would only create the alias table and its six rows. The pre-check below confirms this before anything is written.

Nothing applies migrations automatically: no workflow in `.github/workflows/` runs `supabase` or `psql`. The migration runs only when someone applies it by hand.

## Sequence

### Step 0: before merging
1. Refresh #344 against current `main`. If #345 (D5, the guides move) merged first, resolve the one shared `src/data/cityPages.ts` hunk. Around the SIPCOT city links, **keep both**: the D4 product slug and D5's `/guides/…` URLs.
2. Run locally:
   - `npx tsc` ratchet and eslint ratchet;
   - `npm test`;
   - `src/data/productSlugRenames.test.ts` and `src/lib/seo/productPageMeta.test.ts` (the #338 guard);
   - `npm run variants:test`, `landings:test`, `cities:audit`, `seo:audit`.
3. Confirm CI is green on the PR head.
4. Save the current live Merchant feed (`GET /api/merchant-feed`) for the comparison in step 2. This is allowed only while no deploy is running.
5. Peer sessions: send a MERGE NOTICE, wait for acks, then merge pinned to the head SHA and the expected `main` SHA. Read the merge commit's parents to confirm no concurrent merge happened.

### Step 1: merge and deploy (approval: #344)
- The merge triggers **Deploy Portable Office** (legacy in-place deploy), and its `verify-release` step runs.
- **No production site requests** until the run has completed **and** `/api/build-info` reports the merge SHA. Use the GitHub API only while waiting.

### Step 2: live checks of the code (no database change yet)
| Check | Expected |
|---|---|
| 6 new URLs | `200`, `index, follow`, self-canonical, H1 unchanged, Product JSON-LD with the **same SKU and GST-inclusive price** as before, Add to Cart present |
| 6 old clean URLs `/products/<old>` | **one** `301`, `Location: /products/<new>` |
| 6 old `.html` URLs `/products/<old>.html` | **one** `301` straight to `/products/<new>` (not via `/products/<old>`) |
| 6 legacy URLs `/product/<old>` | **one** `301` to `/products/<new>` |
| `/sitemap.xml` | contains the 6 new URLs, contains none of the old ones |
| City pages that linked an old URL (20 links in `cityPages.ts`, 5 in Cities We Serve) | the link points straight at the new URL. Spot-check two pages. |
| `/api/merchant-feed` | identical to the copy saved in step 0 (same item count, same links) |
| Cart | Add one renamed product to the cart and go to checkout until the **Pay** button is enabled. **Never click Pay.** A guest cart saved before the deploy still resolves, because it stores only `product_id` and quantity. |
| `/products/container-office/20x10-ft` | still `200` and `noindex, follow` (unrelated control, from #338) |

If an old URL still answers `200` after build-info shows the merge SHA, look for a stale cache in front of Next (response headers) before anything else. Do not cancel or re-run a deploy without telling the owner.

Then send "#344 deploy done `<sha>`" to peer sessions.

### Step 3: Search Console (owner)
- **URL Inspection → Request indexing** for the 6 new URLs.
- Inspecting an old URL should show "Page with redirect". Google moves the ranking to the new URL over the following weeks. The old URLs stay redirecting **permanently**; do not remove the rules.

### Step 4: production migration (separate owner approval)
Run in **Supabase dashboard → SQL editor**. Use `supabase db push` only if `supabase migration list` shows this file is the *only* pending migration, because `db push` applies every pending file. Never run `full_schema.sql` against production.

**4a. Read-only pre-check:**
```sql
select id, name, slug from public.products
 where slug in (
   'shipping-container-in-kormangala','shipping-container-in-krishnagiri','shipping-container-in-sipcot',
   'shipping-container-in-chennai','shipping-container-in-narsapura-industrial','shipping-container-in-peenya-industrial',
   'used-20ft-shipping-container-as-is-grade','refurbished-20ft-shipping-container-premium',
   'refurbished-20ft-shipping-container-industrial','used-20ft-shipping-container-wind-water-tight',
   'refurbished-20ft-shipping-container','used-20ft-shipping-container-cargo-worthy');
select to_regclass('public.product_slug_aliases');            -- expected: null (not created yet)
select product_slug, status, count(*) from public.product_reviews
 where product_slug like 'shipping-container-in-%' or product_slug like '%-20ft-shipping-container%'
 group by 1, 2;
```
Expected: no products rows (see above). If a row exists under **both** an old and a new slug, stop and report to the owner. The migration would leave it unchanged rather than fail, but it needs a decision.

**4b. Apply:** paste and run the whole of `supabase/migrations/20261126120000_product_slug_renames.sql`. It runs in one transaction and is safe to run twice.

**4c. Post-check:**
```sql
select old_slug, new_slug, product_sku from public.product_slug_aliases order by product_sku;   -- 6 rows
select id, slug from public.products where slug like 'shipping-container-in-%';               -- 0 rows
```
Then reload one new product page and its old URL. Both should behave exactly as in step 2; the site does not read the table.

### Step 5: watch for 7–14 days
- Search Console: Pages → "Page with redirect" for the 6 old URLs, "Indexed" for the 6 new ones. Watch for any new 404s under `/products/`.
- Enquiries and orders for the six SKUs continue as normal: same ids and SKUs.

## Rollback

All rollbacks go through a revert PR that the owner approves by number, then deploy and live checks as in steps 1–2.

**A. Code only (migration not applied).** `git revert -m 1 <D4 merge sha>` reverts it all:
- the old URLs serve the products again (200);
- the 12 redirects go;
- the links switch back to the old URLs.

The **new** URLs would then 404. If they have been live for more than a day or two, Google may already have them, so add six reverse `301`s, new → old, in the same revert PR.

**B. Migration also applied.** Do A first, then run `supabase/rollback/20261126120000_product_slug_renames.down.sql` in the SQL editor. It:
- moves any `products.slug` from a new slug back to its old slug (skipping a row if the old slug is taken);
- drops `product_slug_aliases`.

It is safe to run twice, and it never touches orders, carts, reviews, ids or SKUs. Today the order of A and B makes no practical difference, because the site does not read either thing B changes. Code first keeps the two in step.

**Reviews written during D4:** a review submitted on a renamed page is stored under the **new** slug. After rollback A, the old page reads only the old slug, so such a review would be stored but not shown. Before rolling back, run:

```sql
select product_slug, count(*) from public.product_reviews where product_slug in (<six new slugs>) group by 1;
```

If any exist, the owner decides whether to re-point them. Nothing does this automatically.

**What a rollback never affects:** orders, order items, Razorpay records, quotations, carts and the Merchant feed. They key on `product_id` and `product_sku`, which D4 does not change.
