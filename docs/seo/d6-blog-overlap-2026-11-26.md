# D6 — blog posts vs commercial pages: which page owns each query

**Status: recommendation only.** This document changes no title, page, link or redirect. Each action needs your approval by number. Any 301 needs a separate approval.

- Source: `main` at `8302a6b`; text from the 25 Nov production crawl.
- Same method as D1:
  1. Take the head query each blog post targets (its title and H1).
  2. List every page on the site whose title or H1 targets the same query.
  3. Measure how much text they share: 5-word sequences, with nav, footer and form boilerplate removed.
  4. Give the query **one owner page**, as your no-cannibalisation rule requires. Your keyword map of 5 Sep 2026 is applied where it exists.

## Summary

The blog posts are **not duplicates**: each shares only 0.0–0.8% of its text with the competing pages. The problem is **targeting**. Four of the five posts put a commercial head term in their title and H1 that a product, service or local page should own. The long blog posts (1,345–4,142 words) then compete with shorter commercial pages. So the main fix is to retitle each post to its real informational intent and link it to the owner page with the commercial anchor. Only one post (MS cabin) is a candidate for merging.

| # | Query (intent) | Owner page | Competing blog post | Text shared | Recommendation |
|---|---|---|---|---|---|
| B1 | "porta cabin on rent" / "portable cabin on hire" (transactional) | `/rental-service`, "Portable Cabin Rental Service", 1,412 words | `/blog/porta-cabins-on-rent`, "Porta Cabins on Rent Across India", 2,150 words | 0.4% | **Retitle** the post to rental know-how. Put "Porta Cabin on Rent" into the `/rental-service` title and H1. Confirm or remove the post's rent figures |
| B2 | "portable cabin manufacturer(s) in Bangalore" (commercial, local) | `/promotions/portable-cabin-in-bangalore`, "Portable Cabin in Bangalore \| Manufacturer & Supplier" (D1 Keep hub, linked from 18 city pages) | `/blog/portable-cabin-manufacturers-in-bangalore`, "Portable Cabin Manufacturers in Bangalore \| Prices", 1,493 words | 0.0% | **Retitle** the post to a buyer's checklist and drop "\| Prices". Replace its ₹ ranges with links to live product prices |
| B3 | "labour colony in Bangalore / Bengaluru" (product and price) | `/promotions/labour-colony-in-bangalore`. Your keyword map of 5 Sep 2026 gives the post "broad guide" and the city page "labour camp setup" | `/blog/prefabricated-labor-colony-bengaluru`, "Prefab Labour Colony in Bengaluru", 4,142 words | 0.0% | **Keep your map, and make it work.** The post's title becomes explicitly a planning guide and links to the promotion. The promotion gets the D1 "Improve" rewrite; otherwise the 4,142-word guide keeps outranking it |
| B4 | "MS portable cabin" (product) | `/products/ms-portable-cabin`, "MS Portable Cabin — Insulated Steel Site Office Cabin", 2,722 words | `/blog/ms-portable-cabin-durable-mild-steel-modular-building`, "MS Portable Cabin – Durable Mild Steel Modular Cabins", 1,345 words | 0.1% | **Consolidate** (recommended): move any unique paragraph to the product page, then 301 the post to it. Or retitle it as an "MS vs GI vs PUF cabins" comparison |
| B5 | "labour shed" / "prefabricated labour shed" (informational) | `/blog/labour-shed-prefabricated-structures`. No other page targets "labour shed" | — | 0.0–0.4% against the hutment and colony pages | **Keep.** Link "labour hutments" and "labour colony" product pages from the body with descriptive anchors. Its lifespan line waits for claims item E7 (#348) |
| B6 | "guides" (site navigation) | `/guides` (new, product SEO session's #345) | `/blog` title "Blog — Prefab Cabin Guides" | — | **Retitle** `/blog` to "Blog — Articles on Portable Cabins & Prefab Buildings", so the site has one "Guides" section. Coordinate with the product SEO session |

## Details

### B1 · porta cabins on rent

- **Owner:** `/rental-service`. It is the transactional page, with rental units, monthly figures and an enquiry form. Its title "Portable Cabin Rental Service" doesn't contain "porta cabin" or "on rent", the phrases people type.
- **Conflict:** the blog post's title and H1 are "Porta Cabins on Rent…", which is the transactional phrase.
- **Proposed:**
  - Blog title and H1: "Renting a Porta Cabin: Costs, Terms and What to Check Before You Hire". The URL stays.
  - First paragraph: a link to `/rental-service` with the anchor "porta cabins on rent".
  - `/rental-service` title: "Porta Cabin & Portable Cabin on Rent | Rental Service". The H1 is aligned to match.
- **Rent figures:** the post states rent ranges: security cabins ₹4,000–₹7,000, office cabins ₹10,000–₹18,000, site offices ₹18,000–₹32,000 and labour accommodation ₹15,000–₹28,000 a month. These appear in the visible text and in the FAQ structured data (`PortaCabinsOnRent.tsx:24`). `/rental-service` lists its own monthly figures per unit (for example ₹13,500, ₹20,040, ₹15,000, ₹28,000). Either confirm the ranges match your current rates, or replace them with a link to `/rental-service`.
- **Rental terms:** what the rent includes is still open as issue-107 Q11 (transport, installation, pick-up).

### B2 · portable cabin manufacturers in Bangalore

- **Owner:** `/promotions/portable-cabin-in-bangalore`. D1 keeps it as the Bangalore hub, linked from 18 city pages. Its title already carries "Manufacturer & Supplier".
- **Conflict:** the post's title and H1 lead with "Portable Cabin Manufacturers in Bangalore" and add "| Prices".
- **Proposed title and H1:** "Choosing a Portable Cabin Supplier in Bengaluru: 10 Checks Before You Order". Link the hub with the anchor "portable cabins in Bangalore".
- **Prices:** the post's generic ranges are not from the catalogue and conflict with it, e.g. a 40 ft container office's live prices are ₹7,31,600–₹18,88,000 including GST, as on `/promotions/shipping-container-in-bangalore`. The ranges are:
  - "₹80,000–1.2 lakh"
  - "₹5–7 lakh" for a 40 ft container
  - "₹12–18 lakh"
  - "₹1,200–1,800/sq.ft."
- **Proposed fix:** replace the ranges with "Standard units show their fixed GST-inclusive price on the product page; custom builds are quoted in writing", with links.

### B3 · labour colony in Bangalore

- **Your map (5 Sep 2026, recorded in `src/data/cityPages.ts`):** the promotion owns the product and price query; the blog is the broad guide; the Labour Camp city page owns "labour camp setup". This review keeps that.
- **Risk:** the guide's title "Prefab Labour Colony in Bengaluru" is the same head term as the promotion's (Bengaluru = Bangalore). The guide is 4,142 words of distinct text; the promotion is 658 words of template text. So Google is likely to rank the guide for the product query.
- **Proposed:**
  - Guide title "Prefab Labour Colony in Bengaluru: A Planning Guide (Layout, Capacity, Compliance)", with the H1 aligned to match.
  - A link near the top: "Labour colony in Bangalore: models and prices" → the promotion.
  - The D1 "Improve" rewrite of the promotion: catalogue models and prices, Bengaluru delivery facts, real photos.
- **Rate figure:** the guide's "₹75 to ₹120 per sq. ft." figure needs your confirmation or removal.

### B4 · MS portable cabin

- **Owner:** `/products/ms-portable-cabin`. It is purchasable and has 2,722 words.
- **Conflict:** the post's title "MS Portable Cabin – Durable Mild Steel Modular Cabins" has the same head term.
- **Recommended:** move any paragraph that the product page lacks into its FAQ, then 301 the post to the product page. This needs your separate approval and a check with the product SEO session, which owns the product page.
- **Alternative:** retitle the post "MS vs GI vs PUF Portable Cabins: Which Steel Cabin Suits Your Site?" and rewrite its intro to match.

### B5 · labour shed

No other page targets "labour shed". The post stays as the owner page. Two small additions:
- link the hutment and colony product pages with descriptive anchors;
- settle the lifespan figure (E7 in #348).

### B6 · "Guides" naming

The product SEO session's #345 (approved) creates `/guides`. `/blog` is still titled "Blog — Prefab Cabin Guides". One title change in `app/(site)/blog/page.tsx` avoids two sections both called "Guides".

## What applying it would touch (after approval; not done)

- **Titles, H1s, first paragraphs and links of the five posts:** `src/views/blog/*`, `app/(site)/blog/*/page.tsx`. These files belong to the site-wide session.
- **`/rental-service`:** title and H1 (`app/(site)/rental-service/page.tsx`, `src/views/RentalService.tsx`).
- **B4 product-page FAQ:** the product SEO session's file. The 301 needs a separate approval.
- **Not touched:** no blog URL changes, except B4 if you approve its 301.

## Data that is missing

- Search Console queries per page; no access. With them, each owner choice would be checked against the queries the pages actually rank for. Export steps: `seo-sitewide-2026-11-25/promotions-gsc-export-and-claims.md` section A, run with the filter `/blog/` instead of `/promotions/`.
- Enquiries cannot be attributed to blog posts either. See D1, "Data that is missing".
