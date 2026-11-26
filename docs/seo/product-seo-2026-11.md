# Product SEO pass — November 2026

Audit of every product, category, product-hub, product-guide and size-variant page, the keyword map
it produced, the cannibalisation evidence, and the decisions that still need the owner. Written with
the six "SEO n/6" pull requests of 2026-11-25. Measured on main **a62de02** (local production build and
production itself).

## 1. Inventory

| Page type | Count | Indexable | Notes |
|---|---|---|---|
| Product pages | 47 | 47 | 46 at `/products/<slug>`, 1 product child (`/products/marketing-office/prefab-marketing-office`) |
| Category pages | 17 | 17 | 7 have **no products** (labour-colony, bunker-bed-container-cabin, peb-building, storage-shed, fabrication, upvc-windows-doors, modular-furniture); kept indexed by owner decision 2026-10-13 |
| Product hubs | 3 | 3 | `/products/portable-cabin`, `/products/portable-toilet-cabin`, `/products/metal-portable-cabin` (+ `/products` listing) |
| Product guides | 13 | 13 | 11 portable-cabin guides + 2 home-construction contractor pages |
| Size-variant pages | 6 sizes in 1 family (Container Office) | 1 | 25 × 14 ft renders at `/products/container-office` (indexable). 10 × 10, 20 × 8, 20 × 10, 30 × 10 and 40 × 10 ft have their own URLs served **noindex, follow** and kept out of the sitemap: no owner-confirmed price and `contentComplete: false`. 20 × 12 ft is unpublished (real 404). |

**Live check (production, a62de02, 2026-11-25):** all 378 sitemap URLs return 200 to a browser and
to Googlebot; 0 noindex, 0 wrong or missing canonicals, 0 default-title/stale heads, every page on
the current build. Private routes (`/cart`, `/checkout`, `/my-account`, `/login`, `/register`,
`/admin`, `/auth/*`) carry `X-Robots-Tag: noindex, nofollow`. `/products?page=2`, `?sort=` and
`?utm_*` URLs canonicalise to the clean URL and `?page=` is disallowed in robots.txt; `?category=`,
`.html`, `/product/…` and mixed-case product URLs 301 to the canonical page. Googlebot and
Storebot-Google may crawl `/cart` and `/checkout` **on purpose** (Merchant Center checkout
verification) — indexing is blocked by the header.

**Stale 404 / noindex after deploys:** root cause and fix are in draft PR #328 (ISR stale-build guard
+ SEO head checks in verify-release); the structural fix is the release-based deploy activation.

**Not available:** Google Search Console (impressions, clicks, CTR, positions, index coverage,
Google-selected canonicals) and field Core Web Vitals. No figure in this document is estimated.

## 2. Keyword map (one primary intent per page)

Intent levels: the **home page** owns "portable office cabin / portable cabin manufacturer"; a
**category** owns the range ("compare models and prices"); a **hub** owns the specification/price
overview of a family; a **product** owns one model; a **city page** owns product × place; a **guide**
owns one informational question.

### Portable cabins

| URL | Primary keyword | Secondary | Intent |
|---|---|---|---|
| `/products/category/portable-cabins` | portable cabins | portable cabin models, portable cabin prices | compare the range |
| `/products/portable-cabin` | portable cabin sizes, specifications and prices | portable cabin price, portable cabin size | specification overview |
| `/products/metal-portable-cabin` | metal portable cabin | MS vs GI vs PUF cabin | choose a material |
| `/products/office-portable-cabin` | office portable cabin | site office cabin | one model |
| `/products/executive-portable-cabin-20ft` | 20 ft portable cabin / executive portable cabin | 20 × 10 PUF cabin | one model |
| `/products/ms-portable-cabin` | MS portable cabin | mild steel portable cabin | one model |
| `/products/steel-portable-cabin` | steel portable cabin | — | one model — **see C1** |
| `/products/prefabricated-portable-cabin` | prefabricated portable cabin | factory-built cabin | one model |
| `/products/porta-cabin` | porta cabin | 40 × 12 porta cabin | one model |
| `/products/prefab-porta-cabin` | prefab porta cabin | bolted / knock-down porta cabin | one model |
| `/products/cabin-portable` | PUF sandwich panel portable cabin | 50–75 mm panel cabin | one model |
| `/products/portable-cabin-40ft-bunkhouse` | portable bunkhouse / 40 ft bunkhouse | worker cabin with bathroom | one model |
| `/products/portable-shop-cabin` | portable shop cabin | 10 × 10 shop cabin | one model |
| `/products/container-cafe-restaurant` | container cafe / container restaurant | — | quote-only |
| `/products/prefabricated-labour-hutments-staff-accommodation` | prefab staff accommodation | labour hutment (staff) | one model |
| `/products/labor-hutments` | labour hutments | worker hutment | one model |
| 11 guides `/products/portable-cabin/*` | one question each (price, sizes, layouts, toilet & pantry, schools, insulation, installation, lifespan, new vs used, transport, materials) | — | informational |

### Container offices and site offices

| URL | Primary keyword | Intent |
|---|---|---|
| `/products/category/container-offices` | container office manufacturer (India) | manufacturer / range |
| `/products/container-office` (+ 5 noindex sizes) | container office | one model, 25 × 14 ft |
| `/products/ms-container-office-cabin` | MS container office cabin | one model, 15 × 10 ft |
| `/products/modern-container-office` | modern container office (40 ft, glass) | one model |
| `/products/vip-container-office` | VIP container office | one model |
| `/products/cabins-in-office` | office cabins (indoor modular) | one model |
| `/products/category/site-office-containers` | site office containers | range |
| `/products/standard-site-office-container` | site office container 20 ft | one model |
| `/products/container-site-office` | 40 ft container site office (15 workstations) | one model — **see C5** |
| `/products/site-office-container-manufacturers` | custom site office container | one model — **see C5** |
| `/products/steel-portable-office-container` | steel office container | one model |
| `/products/construction-site-portable-office` | construction site office cabin | one model |
| `/products/marketing-office`, `/…/prefab-marketing-office` | marketing office / sales gallery; prefab marketing office | one model each |

### Containers, sanitation, security, accommodation, homes

| URL | Primary keyword |
|---|---|
| `/products/category/cargo-storage-shipping-containers` | shipping & storage containers (range) |
| `/products/shipping-container-for-sale` | 20 ft GP shipping container for sale |
| `/products/20ft-40ft-storage-container-corten-steel` | 20 ft storage container |
| `/products/cargo-container-for-sale` | cargo container for sale |
| `/products/cargo-shipping-container`, `/products/cargo-containers`, `/products/cargo-storage-containers` | cargo shipping container; cargo container types; cargo storage containers |
| `/products/cargo-storage-containers-pink` | pink container (retail/branding) |
| `/products/shipping-container-rental` | shipping container on rent |
| `/products/shipping-container-in-{kormangala,krishnagiri,sipcot,chennai,narsapura-industrial,peenya-industrial}` | the grade in the H1 (used as-is / refurbished premium / industrial / WWT / refurbished / cargo-worthy) — **see C6** |
| `/products/portable-toilet-cabin` (hub), `/products/category/portable-toilet-cabins`, `/products/portable-toilet-block-4-unit` | portable toilet cabin; portable toilet cabins (range); 4-unit toilet block |
| `/products/category/security-cabins`, `/products/security-cabin`, `/products/guard-security-cabin` | security cabins (range); security cabin; guard cabin with 360° view |
| `/products/category/g1-workmen-accommodation`, `/products/workmen-accommodation`, `/products/labour-colony` | G+1 workmen accommodation; workmen accommodation; labour colony — **see C4** |
| `/products/category/prefab-homes`, `/products/family-prefab-home-2bhk`, `/products/luxury-prefab-villa-g-1-floors` | prefab homes; 2BHK prefab home; prefab villa |
| `/products/category/prefab-building` | prefab buildings |
| `/products/construction-individual-building`, `/products/home-construction/*` | house construction cost & specification; building contractor Bangalore; construction contractor Shikaripalya |

City-specific keywords stay on their city pages (one product × place per page); no product page was
given a place keyword in these PRs.

## 3. Cannibalisation findings (evidence; nothing merged, redirected or deleted)

| # | Pages | Evidence | Recommendation (owner decision) |
|---|---|---|---|
| C1 | `/products/ms-portable-cabin` vs `/products/steel-portable-cabin` | Near-identical commerce material text ("1.5–2 mm MS Sheet, 30–50 mm Insulation"; Steel adds "Welded MS Frame"), the same GST-inclusive price (₹5,19,200), and "steel" here *is* mild steel. Different H1s and copy. | Confirm whether they are one physical product. If yes: after a Search Console review, keep the stronger URL and 301 the other (Merchant feed: one SKU). If no: give Steel Portable Cabin its distinguishing spec. |
| C2 | `/products/executive-portable-cabin-20ft` vs `/products/office-portable-cabin` | Same price (₹3,36,300). Executive = 20 × 10 ft, 50 mm PUF; Office = "custom sizes", IS-standard MS frame. | Confirm they are different builds; if the Office cabin is the same 20 × 10 unit, merge after GSC review. |
| C3 | `/products/cabin-portable`, `/products/prefab-porta-cabin`, `/products/site-office-container-manufacturers`, `/products/security-cabin`, `/products/cargo-storage-containers`, `/products/cargo-containers` | Six SKUs share the same base price (₹2,80,000 + GST) despite different builds and sizes. | Confirm each price is current for that build. |
| C4 | `/products/category/labour-colony` (0 products) vs `/products/labour-colony` | Identical H1 "Labour Colony" (the only exact duplicate H1 among product-scope pages). | Part of the empty-category decision (A6): after GSC review, `noindex, follow` or 301 the empty category to `/products/category/g1-workmen-accommodation`. Its title no longer promises models or prices (PR 2). |
| C5 | `/products/container-site-office` vs `/products/category/site-office-containers` vs `/products/site-office-container-manufacturers` vs `/products/standard-site-office-container` | Reversed-word variants of one head term. Container Site Office is a distinct 40 × 10 ft, 15-workstation model (keep). "Site Office Container Manufacturers" is a *manufacturer-intent* page selling one custom unit, overlapping both categories. | Keep URLs. Proposed page title for the manufacturers SKU (protected, see §5): "Custom Site Office Container, MS Frame". |
| C6 | Place-slug container SKUs vs city/promotion pages | 4 of 6 carry 5–15 H2s naming the place (e.g. Chennai: "Shipping Containers in Chennai — Sales & Modular Conversions"); `/promotions/shipping-container-in-chennai` targets the same query. Peenya and Narsapura have no competing page. | After GSC review, move the place copy of the Chennai/Krishnagiri/SIPCOT SKUs to their place pages and keep the SKUs on the grade (their H1s already are). |
| C7 | Category vs single product (singular/plural) — portable toilet cabin(s), security cabin(s), portable cabin(s) | Normal list-vs-item pattern; titles now distinct ("— Models & Prices" on categories). | Monitor only. |

## 4. Metadata changed in PR 2 (before → after, rendered `<title>` includes " | Portable Office Cabin")

| Page | Before | After |
|---|---|---|
| `/products/category/portable-cabins` title | Portable Cabins in India — Prices, Sizes & Manufacturer (79) | Portable Cabins — Models, Sizes & Prices (64) |
| ↳ description | "…from ₹2.36 lakh (incl. GST). ISO 9001 manufacturer with 15+ years' experience…" (172) | "Factory-built portable cabins in MS and PUF: site offices, bunkhouses, staff housing, shop and cafe cabins. Compare models, sizes and GST-inclusive prices." (151) |
| `/products/category/prefab-building` title | Prefab Buildings — Panel-Built Structures, Made to Your Plan (84) | Prefab Buildings Made to Your Plan (58) |
| ↳ description | "…ISO 9001 manufacturer, built in Tamil Nadu, delivered pan-India." (213) | "Prefab buildings made to your floor plan: insulated panels, a steel truss roof and clear-span widths for sales galleries, offices and multi-storey blocks." (154) |
| `/products/category/home-construction` description | 173 chars | same wording, 157 chars |
| `/products/category/cargo-storage-shipping-containers` | Cargo Storage & Shipping Containers — Models, Specs & Prices (84) | Shipping & Storage Containers for Sale (62) |
| `/products/category/g1-workmen-accommodation` | G+1 Workmen Accommodation — Models, Specs & Prices (74) | G+1 Workmen Accommodation Blocks (56) |
| Other categories with products | "<name> — Models, Specs & Prices" (54–71) | "<name> — Models & Prices" (54–64) |
| 7 empty categories | "<name> — Models, Specs & Prices" (promised models and prices they do not have) | "<name> — Get a Quote" (49–64) |
| `/products/portable-cabin/insulation-and-cooling` | Insulated Portable Cabins — PUF Panels & Cooling (72) | Insulated Portable Cabins & PUF Panels (62) |
| `/products/portable-cabin/installation-and-site-preparation` | Portable Cabin Installation & Site Preparation (70) | Portable Cabin Installation & Site Prep (63) |
| `/products/portable-cabin/transport-and-delivery` | Portable Cabin Transport & Delivery Across India (72) | Portable Cabin Transport & Delivery (59) |
| `/products/portable-cabin/materials-ms-vs-puf` | Portable Cabin Materials: MS Sheet vs PUF Panel (71) | Portable Cabin Materials: MS vs PUF Panel (65) |
| `/products/portable-cabin/price-and-cost-guide` description | "…Live prices included." (162) | same, 140 |
| `/products/portable-toilet-cabin` description | "…fast pan-India delivery." (175) | "Portable toilet cabins in MS, GI and FRP, plus bio-toilets: single or multi-seater, with water tank, exhaust and western or Indian pan, delivered across India." (159) |
| `/products/container-cafe-restaurant` description | 193 | 155 (title unchanged — owner's choice in #152) |
| `/products/construction-individual-building` description | 171 | 160 |

H1s, canonicals, robots, Open Graph images and URLs are unchanged. Open Graph and Twitter titles and
descriptions follow the `<title>`/description through `buildPageMetadata`.

## 5. Product page titles — proposal only (needs the protected-flow approval)

Every product page's `<title>` is its commerce `feedTitle` (`buildProductPageMetadata`), the same
string sent to Merchant Center as `<g:title>`. 43 of 47 are 72–113 characters, so the search result
cuts them, and eight portable-cabin titles end in the same "…for Site Offices", which pulls them
towards one query. Changing them touches the Merchant feed (October 2026 audit item A4), so **nothing
here is implemented**. Two options for the owner:

- **(a) Decouple:** keep the rich `feedTitle` for Shopping and give each product page a short page
  title (Google does not require the two to match; it requires price and availability to match).
- **(b) Shorten both together** under "I approve changing the protected Merchant purchase flow."

Proposed page titles (≤ 41 characters + " | Portable Office Cabin"):

| Product | Proposed page title |
|---|---|
| Office Portable Cabin | Office Portable Cabin, Insulated MS |
| Executive Portable Cabin 20ft | 20 ft Executive Portable Cabin, PUF |
| MS Portable Cabin | MS Portable Cabin — Mild Steel Build |
| Steel Portable Cabin | Steel Portable Cabin 20 × 10 ft |
| Prefabricated Portable Cabin | Prefabricated Portable Cabin, Galvanised |
| Prefab Porta Cabin | Prefab Porta Cabin, Bolted ISMC Frame |
| Porta Cabin | Porta Cabin 40 × 12 ft, MS Steel |
| Sandwich Panel Portable Cabin | Sandwich Panel Portable Cabin 50–75 mm |
| Portable Cabin 40ft Bunkhouse | 40 ft Bunkhouse Cabin with Bathroom |
| Container Office | Container Office 25 × 14 ft |
| MS Container Office Cabin | MS Container Office Cabin 15 × 10 ft |
| Modern Container Office | Modern 40 ft Container Office |
| Standard Site Office Container | Site Office Container 20 × 8 ft |
| Site Office Container Manufacturers | Custom Site Office Container, MS Frame |
| Container Site Office | 40 ft Container Site Office |
| Steel Office Container | Steel Office Container 10–40 ft |
| Construction Site Portable Office | Construction Site Office Cabin |
| Guard Security Cabin | Guard Cabin 20 × 10 ft, 360° View |
| Security Cabin | MS Security Cabin, PUF Insulated |

## 6. Owner decisions and evidence still needed

1. **Search Console export** (Performance → last 3 months, India → Pages and Queries; Indexing →
   Pages): needed for C1, C2, C4, C6, the product-title decision and the empty categories.
2. **C1/C2/C3** — confirm which SKUs are the same physical product and confirm the shared prices.
3. **Size variants** — the 5 noindex Container Office sizes become indexable only with an
   owner-confirmed price and owner-approved size-specific copy (`contentComplete`).
4. **Reviews** — `/products/container-office` and `/products/vip-container-office` each carry one
   5-star review, published in their AggregateRating. Confirm both come from genuine customers;
   reviews written by the business or its staff are not eligible for review snippets and should be
   un-approved in the admin panel.
5. **Unverified claims still live** (listed in PR 3's description): Executive cabin BOCW compliance
   and workshop locations, 2BHK loan / resale / project claims, Guard cabin and Site Office catalogue
   project lines, Office Cabins dB and install-time figures, the toilet hub's 2025 price ranges.
6. **ISO 9001:2015** — header, footer and Organization schema still state it; the certificate has
   not been produced.
