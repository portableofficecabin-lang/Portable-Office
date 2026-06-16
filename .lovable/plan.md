# Plan: Create 5 Pillar/Cluster Guide Pages

Build dedicated long-form **pillar pages** under a new `/guides/` URL namespace. Each one becomes the topical hub that links down to all related product + blog pages and gets linked back from them.

## Pages to Create


| URL                                 | Topic                               | Links to                         |
| ----------------------------------- | ----------------------------------- | -------------------------------- |
| `/guides/portable-cabins`           | Portable Cabins — Complete Guide    | All cabin products + blog guides |
| `/guides/container-offices`         | Container Offices & Site Offices    | Container office products        |
| `/guides/prefab-homes`              | Prefab Homes & Villas               | Prefab home products             |
| `/guides/security-toilet-cabins`    | Security & Toilet Cabins            | Guard + toilet products          |
| `/guides/cargo-shipping-containers` | Cargo Storage & Shipping Containers | All container guides             |


## Page Structure (each pillar, ~1,800–2,200 words)

1. **Hero** — H1 + meta-rich intro paragraph + CTA buttons (Quote, WhatsApp)
2. **Quick navigation** — jump-links to all sections
3. **What is [topic]?** — definition + use cases
4. **Types & variants** — table of all sub-products with links
5. **Specifications** — sizes, materials, capacity, lead time
6. **Pricing overview** — base ₹ ranges (linking to product pages for exact prices)
7. **Buying vs renting** — when each makes sense
8. **Industries we serve** — construction, IT parks, events, etc.
9. **Multi-city availability** — uses `TARGET_CITIES`
10. **FAQ accordion** — 8–10 questions with `FAQPage` JSON-LD
11. **All products in this cluster** — card grid linking to every product page
12. **Related blog guides** — internal link callouts
13. **Final CTA** — quote / consultation

## SEO Implementation

- Unique `<title>` and meta description per pillar via `SEOHead`
- Canonical URL: `https://portableofficecabin.com/guides/<slug>`
- JSON-LD: `Article` + `FAQPage` + `BreadcrumbList`
- Geo signals via existing `GlobalGeoSignals`
- Internal links: every related product page already linked; we'll also add a "Complete Guide →" link from each category card on the homepage `InternalLinkingHub` so spokes point back to the pillar

## Technical

**New files**

- `src/pages/guides/PortableCabinsGuide.tsx`
- `src/pages/guides/ContainerOfficesGuide.tsx`
- `src/pages/guides/PrefabHomesGuide.tsx`
- `src/pages/guides/SecurityToiletCabinsGuide.tsx`
- `src/pages/guides/CargoShippingContainersGuide.tsx`
- `src/components/guides/PillarLayout.tsx` — shared layout (hero, TOC, FAQ, CTA) to keep each page DRY

**Edits**

- `src/App.tsx` — register 5 routes under `/guides/:slug`
- `src/components/home/InternalLinkingHub.tsx` — point each pillar card's main link from `/products?category=...` to `/guides/<slug>` (keeps current spoke links intact)
- `scripts/generate-sitemap.ts` *(or `public/sitemap.xml` if static)* — add 5 new entries with `priority=0.9`, `changefreq=monthly`
- `src/components/layout/Footer.tsx` — add a "Guides" column linking to all 5 pillars (boosts crawl depth)

**Content rules respected**

- 100% human-written copy, no AI phrasing (per SEO content integrity workflow)
- Pricing in INR, base price only
- Realistic stats only; reuse existing product specs from `src/data/products.ts`
- Geo-tagged imagery using existing product images (no new generic renders).
- Image Convert Webp 100kb or less.
- Human written Content.
- Plagiarism 100% fresh.

## Out of scope (can be added later)

- Hindi / regional language versions
- Video embeds
- Downloadable PDF brochures per pillar

Confirm and I'll build all 5 pages plus the wiring.