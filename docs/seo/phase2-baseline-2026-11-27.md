# SEO phase 2: baseline, the 10 URLs, and what each one needs (27 Nov 2026)

**Status: PROVISIONAL.** There is no Search Console data yet: this session has no access to the property. Nothing below estimates rankings or traffic. The shortlist and its order come from the live site itself:
- which pages target which query on-site;
- what buyer information each page has;
- whether a purchasable product exists for the configuration.

The order will be re-ranked once the exports in section 2 arrive.

Approval stays by PR number. Redirects, bulk noindex and Merchant-field changes are separate decisions and are listed, not made.

## 1. The 10 URLs

**First five,** one per product family:

| # | URL | Purpose (owner of the query) | Target queries (provisional) | Search Console baseline | Mobile baseline (median Lighthouse; LCP element) | Changes (draft PR) | Missing inputs |
|---|---|---|---|---|---|---|---|
| 1 | `/promotions/portable-cabin-in-bangalore` | Bengaluru hub for portable cabins: sizes, prices, delivery, quote. Linked from 11 Bengaluru city pages | portable cabin bangalore; porta cabin bangalore; portable office cabin bangalore | missing (see 2) | score 82; LCP 4.6 s (Chrome: 2480/2276 ms); LCP element: text (P) | **#355:** exact catalogue sizes and prices, spec rows, delivery and installation scope, WhatsApp/call quote | Search Console; photos (section 6) |
| 2 | `/products/category/site-office-containers` | National owner of "site office container" | site office container; site office container price | missing | score 74; LCP 5.6 s (Chrome: 3532/2724 ms); LCP element: text (DIV) | Product SEO session's draft: what's-included block, captions, Hoskote/Hosur links, link from `/products/site-office-container-manufacturers` | Search Console; photos. You decided (27 Nov) that the `site-office-container-manufacturers` title stays |
| 3 | `/promotions/shipping-container-in-bangalore` | Bengaluru owner of "shipping container" (new and used grades, price table) | shipping container bangalore; used shipping container bangalore; shipping container price bangalore | missing | score 83; LCP 4.4 s (Chrome: 2080/1976 ms); LCP element: text (P) | **#355:** delivery and installation block; delivery paragraph corrected | Search Console; photos |
| 4 | `/products/category/portable-toilet-cabins` | National owner of "portable toilet cabin" | portable toilet cabin; portable toilet price | missing | score 75; LCP 5.5 s (Chrome: 3024/3780 ms); LCP element: text (DIV) | Product SEO session's draft: what's-included, a spec table from the catalogue, captions, and `/products/portable-toilet-cabin` becomes a types-and-specifications page at its own URL. Your decision (27 Nov): no 301 | Search Console; photos |
| 5 | `/products/category/security-cabins` | National owner of "security cabin" | security cabin; security guard cabin price | missing | score 75; LCP 5.5 s (Chrome: 2632/3272 ms); LCP element: text (P) | Product SEO session's draft: what's-included, captions, WhatsApp on `/products/security-cabin`, quote action on `/products/guard-security-cabin`, category links | Search Console; photos |

**Second five:**

| # | URL | Purpose | Target queries (provisional) | Search Console baseline | Changes | Missing inputs |
|---|---|---|---|---|---|---|
| 6 | `/products/category/portable-cabins` | National owner of "portable cabin(s)" | portable cabin; portable cabin price | missing | Your decision (27 Nov): "Prices" stays in the `/products/portable-cabin` title; the range page and the category both keep prices. Next: compare the two pages' Search Console queries before changing anything | Search Console |
| 7 | `/cities-we-serve/portable-cabin-manufacturers-in-hosur` | Hosur factory page | portable cabin hosur; portable cabin manufacturers hosur | missing | Next wave: add sizes, prices and delivery from the same data (with the page owner) | Search Console; factory photos |
| 8 | `/cities-we-serve/container-office-in-hoskote` | Hoskote owner of "container office" | container office hoskote; site office hoskote | missing | Next wave: add delivery scope and prices (it has 5 sizes but no delivery facts) | Search Console; site photos |
| 9 | `/products/category/cargo-storage-shipping-containers` | National owner of "shipping container / used shipping container" | used shipping container; shipping container price | missing | Next wave; the used-grade product specs go to the Merchant list (they describe conversions, not the unit sold) | Search Console; your Merchant decision |
| 10 | `/promotions/security-cabin-in-bangalore` | Bengaluru owner of "security cabin" | security cabin bangalore | missing | Next wave: the same buyer-facts section as #355, with exact catalogue security-cabin sizes | Search Console |

## 2. Search Console baseline: the exact export needed

The figures in the brief are: query, the URL Google shows, impressions, clicks, CTR and average position, for 90 days of Web search in India. Please export:

**Export A: queries.**
1. Search Console → *Performance* → *Search results*.
2. Set *Search type: Web* and *Date: Last 3 months* (or *Custom*, the last 90 days).
3. Add the filter *+ New → Country → India*.
4. Tick all four metrics.
5. *Queries* tab → *Export → Download CSV*. Name the file `gsc-in-90d-queries.zip`.

**Export B: pages.** The same filters, then *Pages* tab → *Export*. Name it `gsc-in-90d-pages.zip`. The repo's `npm run seo:gsc-report` reads this one.

**Export C: which queries each of the 10 URLs gets.** This gives query × URL.
1. Keep the filters, and add *+ New → Page → Exact URL* = one of the 10 URLs in section 1.
2. *Queries* tab → *Export*. Name it `gsc-in-90d-<n>.zip`, where `<n>` is the row number (1–10).
3. Repeat for each of the 10.

**Export D (optional, ~10 queries): which URLs Google shows for a query.** Once A has arrived I'll name the queries. For each one:
1. Add *+ New → Query → Exact query*.
2. *Pages* tab → *Export*.

This shows when two of our pages compete for the same query.

**Single-export alternative to A and C.** Looker Studio (Google's own free tool) can produce one file with query × URL:
1. *Create → Data source → Search Console* → the property → *URL Impression*.
2. Add a table with dimensions *Landing Page* and *Query*, and metrics *Impressions*, *Url Clicks*, *URL CTR* and *Average Position*.
3. Add the filter *Country = India* and the date range *Last 90 days*.
4. *Export → CSV*.

**How the priority list is built from these:**
- Drop brand queries: anything containing "portableofficecabin" or "portable office cabin". The second is listed separately, because it is the brand name and also a generic phrase.
- Keep buying queries: product or size terms, with or without a place, plus "price", "for sale", "rent", "manufacturer", "supplier".
- Keep queries with impressions and an average position of 5–20.
- Map each query to the URL Google shows (from C or D), and flag queries where the shown URL is not the owner in section 1.

## 3. Enquiry baseline: what's needed and why it's limited

- **Website forms:** export *Admin → Enquiries* for the last 90 days.
  - Only the category-page form records its source page ("Submitted from: …").
  - The `enquiries` table has no page column, and promotion pages have no form.
- **Call and WhatsApp clicks per page:** run the read-only query below in the Supabase SQL editor. It returns counts only, no personal data.
- **WhatsApp chats:** the new quote buttons in #355 pre-fill the message, e.g. "Hi, I'd like a written quotation for a portable cabin in Bengaluru." Counting chats that start with that text gives page-level WhatsApp leads, which the site itself cannot see.
- **"Qualified enquiry" needs your definition.** Proposal: a phone or WhatsApp contact that names a product or size and a delivery location.

### Test traffic in the site's analytics (please exclude)

Browser-based checks write page views to the production `page_views` and `click_events` tables, even when they run against a local build, and send Google Analytics hits. The product session's #354 now skips this traffic. Before that, these checks from the site-wide SEO session were not blocked (UTC, 26 Nov 2026):

| Window | Runs |
|---|---|
| 07:37–07:40 | 5 Lighthouse runs |
| 15:04–15:09 | 18 Lighthouse runs |
| 15:19–15:24 | about 16 local-build page loads of `/` and `/about-us` |
| 15:54–15:57 | 6 Chrome loads of `/`, `/products/portable-cabin` and `/cities-we-serve/portable-cabin-kolar` |
| 17:18–17:21 | 10+ Lighthouse runs |

Lighthouse sends the user agent "Chrome-Lighthouse". The 15:54 loads used an Android phone user agent, so exclude them by time. Since 27 Nov every check of this session blocks analytics and fails if any non-GET request is sent.

```sql
-- Call / WhatsApp clicks and page views per page, last 90 days, test traffic excluded (read-only)
with excluded as (
  select tstzrange(s, e) r from (values
    ('2026-11-26 07:37:00+00'::timestamptz, '2026-11-26 07:41:00+00'::timestamptz),
    ('2026-11-26 15:04:00+00', '2026-11-26 15:10:00+00'),
    ('2026-11-26 15:19:00+00', '2026-11-26 15:25:00+00'),
    ('2026-11-26 15:54:00+00', '2026-11-26 15:58:00+00'),
    ('2026-11-26 17:18:00+00', '2026-11-26 17:22:00+00')) t(s, e)
), v as (
  select page_path, count(*) views from public.page_views p
  where created_at >= now() - interval '90 days'
    and coalesce(user_agent, '') !~* 'lighthouse|headless'
    and not exists (select 1 from excluded x where x.r @> p.created_at)
  group by page_path
), c as (
  select page_path, count(*) call_or_whatsapp from public.click_events e
  where created_at >= now() - interval '90 days'
    and (element_text ilike '%whatsapp%' or element_text ilike '%call%' or element_text like '%97318%')
    and not exists (select 1 from excluded x where x.r @> e.created_at)
  group by page_path
)
select coalesce(v.page_path, c.page_path) page_path, v.views, c.call_or_whatsapp
from v full join c using (page_path)
where coalesce(v.page_path, c.page_path) in (
  '/promotions/portable-cabin-in-bangalore', '/products/category/site-office-containers',
  '/promotions/shipping-container-in-bangalore', '/products/category/portable-toilet-cabins',
  '/products/category/security-cabins', '/products/category/portable-cabins',
  '/cities-we-serve/portable-cabin-manufacturers-in-hosur', '/cities-we-serve/container-office-in-hoskote',
  '/products/category/cargo-storage-shipping-containers', '/promotions/security-cabin-in-bangalore')
order by 1;
```

## 4. Which URL answers each query (on-site targeting, 27 Nov)

The counts are pages whose title or H1 contains the query's key words. This is on-site competition, not what Google shows.

| Query | Owner (section 1) | Pages targeting it on-site | Competing pages to fix |
|---|---|---|---|
| portable cabin bangalore | #1 | 10 | `/blog/portable-cabin-manufacturers-in-bangalore` (retitled in #352, live); `/promotions/porta-cabin-in-bangalore` (D1: consolidate) |
| portable cabin hosur | #7 | 1 | none |
| site office container | #2 | 25 | `/products/site-office-container-manufacturers` (its title is a Merchant feed title, so it's on the Merchant list); 8 promotion pages (D1) |
| container office hoskote | #8 | 1 | none |
| container office hosur | — | 2 (SIPCOT Hosur; Tata Electronics Hosur) | Two city pages, one area. Check in Search Console before acting |
| shipping container bangalore | #3 | 4 | Locality pages (Jigani, Vijayanagar, Hebbal) name their locality, which is expected |
| used shipping container | #9 | 9 | Grade products own their grades; 5 city pages mention "used" |
| shipping container hoskote | — | 2 | `container-office-in-hoskote` names shipping containers, beside `shipping-container-hoskote`. Watch in Search Console |
| portable toilet | #4 | 20 | **`/products/portable-toilet-cabin`**: same head term, weakest page (0 images, no call or quote action) |
| portable toilet bangalore | (#4 / D1) | 1 | `/promotions/portable-toilet-cabin-in-bangalore` (D1: Improve) |
| security cabin | #5 | 23 | Model pages `/products/security-cabin` and `/products/guard-security-cabin` are fine as models; city cabin pages mention security use |
| security cabin bangalore | #10 | 2 | `/cities-we-serve/portable-cabin-attibele` mentions it. Check in Search Console |

## 5. Buyer information on the candidate pages (live audit, 27 Nov, `0728ac5`)

| Page | Words | Prices | Sizes | Specs | What's included | Delivery | Installation scope | WhatsApp | Call | Form/quote | Images (captioned) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| portable-cabin-in-bangalore (promo) | 703 | – | – | – | – | yes | – | yes | yes | quote | 1 (0) |
| category/site-office-containers | 3,336 | yes | 5 | table | – | yes | yes | yes | yes | form | 5 (0) |
| shipping-container-in-bangalore (promo) | 1,701 | yes | 1 | table | – | yes | yes | yes | yes | quote | 4 (0) |
| category/portable-toilet-cabins | 2,884 | yes | 5 | – | – | yes | yes | yes | yes | form | 1 (0) |
| category/security-cabins | 2,880 | yes | 5 | table | – | yes | yes | yes | yes | form | 2 (0) |
| products/portable-toilet-cabin | 1,447 | yes | – | table | – | – | – | yes | **–** | **–** | **0** |
| products/security-cabin | 2,381 | yes | – | table | – | yes | yes | **–** | yes | quote | 6 (0) |
| products/guard-security-cabin | 1,319 | yes | 2 | table | – | yes | yes | yes | yes | **–** | 9 (0) |
| portable-cabin-manufacturers-in-hosur (city) | 1,916 | – | – | – | – | yes | yes | yes | yes | quote | 5 (2 labelled renders) |
| container-office-in-hoskote (city) | 1,876 | – | 5 | – | – | **–** | yes | yes | yes | quote | 5 (1) |

## 6. Photos and project details that would help each page

Renders stay labelled "Illustrative render". Real photos need accurate captions: what, where, and when if known.

| Page | Photos needed | Project details that would help |
|---|---|---|
| #1 Bengaluru cabins | A 20 × 10 ft office cabin outside and inside (desk, AC, windows); the 40 ft bunkhouse interior; a cabin being unloaded by crane or hydra at a Bengaluru site | Area in Bengaluru, cabin size, use (site office, shop, security) |
| #2 Site office containers | A 20 × 8 ft site office outside and inside with furniture; a 40 ft container office | Site type and size for 1–2 real deliveries |
| #3 Bengaluru shipping containers | A used container yard or stock; a container delivered to a Bengaluru site | Grade delivered (cargo-worthy, WWT…) and its use |
| #4 Portable toilets | A 4-unit block inside and outside; plumbing and tank connections; a block on a site | Site type (construction, event) and number of users |
| #5 Security cabins | A gate cabin at a factory or apartment entrance; the inside desk area | Placement (gate, toll, warehouse) |
| #7 Hosur factory | The factory floor, fabrication, the dispatch yard at Kamandoddi | Factory size and the products built there (from your records) |
| #8 Hoskote | A container office on a Hoskote-area site | Industrial area or site type |

## 7. Mobile performance on the first five

Measured 27 Nov 2026 on production `1a4dd24`:
- Lighthouse 12.2.1 mobile, median of 3 runs. Analytics were blocked, so no test traffic reached the site's analytics; #354 now skips such traffic too.
- Chrome's own LCP entries, 2 runs per page, with the same mobile emulation: 412 px, 4× CPU, 150 ms RTT, 1.6 Mbps.

| Page | Score (runs) | LCP | FCP | TBT | CLS | Transfer | DOM | LCP element (Chrome) | Chrome LCP | TTFB | Render delay after TTFB | Inter latin-ext font (85 KB) downloaded |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/promotions/portable-cabin-in-bangalore` | 82 (83/82/82) | 4.6 s | 1.5 s | 92 ms | 0 | 679 KiB | 676 | P "Factory-built Portable Cabin in Bangalore with fast installa"… | 2480/2276 ms | 248/221 ms | 2232/2055 ms | no |
| `/products/category/site-office-containers` | 74 (74/72/76) | 5.6 s | 2.3 s | 189 ms | 0 | 1207 KiB | 1724 | DIV "Tough offices built from shipping containers for real site c"… | 3532/2724 ms | 235/214 ms | 3297/2510 ms | **yes** |
| `/promotions/shipping-container-in-bangalore` | 83 (86/77/83) | 4.4 s | 2.0 s | 107 ms | 0 | 856 KiB | 1031 | P "Looking for a shipping container in Bangalore for storage, a"… | 2080/1976 ms | 218/230 ms | 1862/1746 ms | **yes** |
| `/products/category/portable-toilet-cabins` | 75 (74/75/76) | 5.5 s | 2.3 s | 141 ms | 0 | 1124 KiB | 1496 | DIV "Clean, proper toilets for sites and events — not the kind yo"… | 3024/3780 ms | 272/237 ms | 2752/3543 ms | **yes** |
| `/products/category/security-cabins` | 75 (74/75/75) | 5.5 s | 2.3 s | 174 ms | 0 | 1122 KiB | 1541 | P "Portable Cabin Manufacturer Serving Bangalore • Karnataka & "… | 2632/3272 ms | 226/244 ms | 2406/3028 ms | **yes** |

**What this shows:**
- **The LCP element is text on all five pages, and it paints at first paint.** In Chrome, LCP equals FCP. The server answers in about 230 ms; the rest is the browser downloading the HTML, CSS and JavaScript on a slow connection before the first paint.
- **Lighthouse's LCP (4.4–5.6 s) is well above its FCP (1.5–2.3 s).** Its estimate for a text LCP also waits for the web fonts that text uses.

**Confirmed issues, fixed in a separate draft (perf branch):**
1. **₹ downloads an 85 KB font file.**
   - The rupee sign (U+20B9) is outside Inter's preloaded "latin" subset. Any page that shows a price downloads Inter's whole "latin-ext" file (85 KB) for that one glyph. That is all four price pages above; the page without prices does not.
   - #355 adds prices to the Bangalore portable cabin page, so without this fix that page would start downloading the file too.
   - The fix: an `@font-face` named "Rupee Local" that draws only ₹ from a font already on the device (Roboto/Noto on Android, Segoe UI/Arial on Windows, Helvetica on Apple), placed first in the site's font stacks. Everything else still uses Inter / Plus Jakarta.
2. **The favicon is a 1600 × 1600 px, 100 KB JPEG fetched on every page view.** `public/favicon.ico` was the same 100 KB file. It is replaced by a real 2 KB `.ico` (16/32/48 px), a 6 KB 192 px PNG and a 5 KB Apple touch icon, made from the same image.

**Not fixed here (the product SEO session's category pages):**
- 1,496–1,724 DOM elements;
- 0.7–0.9 s of style and layout work per load;
- 65–68 KB of HTML;
- ~70 KiB of unused JavaScript.

Sent to the product SEO session for its category drafts.

**Server settings:**
- HTTP/1.1 and gzip; Brotli would compress the 65–68 KB HTML further. These are #349's nginx changes, which need your separate approval.
- #349's read-only step 0 has to be run on the VPS; this laptop has no SSH access.

**Real users:** these are lab measurements. Field data, the Core Web Vitals that Google ranks with, is in Search Console:
1. *Experience → Core Web Vitals → Mobile → Open report*.
2. Export the URL groups that are "Poor" or "Need improvement".

## 8. Measuring results at 28 and 56 days after each release

For each released page, compare the same Search Console filters (Web, India) for the 28 and 56 days before and after the live date. For the target queries and the page itself, compare:
- impressions, clicks, CTR and average position;
- whether Google shows the owner URL for its target query (export D);
- qualified enquiries: the category form ("Submitted from"), call and WhatsApp clicks from the SQL above (test traffic excluded), and WhatsApp chats starting with the page's pre-filled text.

Releases are spaced so each page has its own live date. The comparison is reported per page, without estimates.
