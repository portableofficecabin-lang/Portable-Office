# D1, priority 1: the eight clearest old → new URL mappings

**Status: proposal for review. Nothing is redirected, noindexed or delisted.** Each mapping needs your separate approval for the promotion indexing and redirect rules. These are the eight "Priority 1" rows of `d1-promotions-2026-11-26.md`. Each has a clear same-intent replacement that is already a strong page: a city page, the hand-written Bangalore page, or a hub the D1 list keeps. They are ordered by how many internal links must move first, fewest first.

**Data that is missing:** Search Console (no access) and the click logs (`page_views` / `click_events`, admin-only). With either, any old URL that shows real clicks, impressions or Call/WhatsApp clicks would be re-checked before its redirect. Every reason below rests on what the site itself shows.

| # | Old URL | New URL (one-hop 301) | Internal links to move first | Reason |
|---|---|---|---|---|
| 1 | `/promotions/container-office-in-chennai` | `/cities-we-serve/container-office-in-chennai` | none | **Exact same product × place.** The city page has the Chennai content and photos; the promotion is 86.8% the same text as its template siblings. The category pages already send "Chennai" to the city page (`chennaiContainerLink`), so this promotion has no internal links left. |
| 2 | `/promotions/cargo-storage-container-in-karnataka` | `/promotions/shipping-container-in-karnataka` | none | **Synonym, same catalogue category** (Cargo Storage & Shipping Containers), same state. The target is the Karnataka shipping hub, linked from 69 city pages; the old URL has no internal links. |
| 3 | `/promotions/porta-cabin-in-bangalore` | `/promotions/portable-cabin-in-bangalore` | 1: `/cities-we-serve/porta-cabin-devanahalli-airport` | **Synonym, same catalogue category** (Portable Cabins), same city. The target is the Bangalore cabin hub, linked from 18 city pages. Keep "porta cabin" as alternative wording on the target, because people search both. |
| 4 | `/promotions/cargo-storage-container-in-tamil-nadu` | `/promotions/shipping-container-in-tamil-nadu` | 1: `/cities-we-serve/shipping-container-in-mettur-salem` | **Synonym, same category, same state.** The target is the Tamil Nadu shipping hub (6 city-page links). |
| 5 | `/promotions/cargo-storage-container-in-bangalore` | `/promotions/shipping-container-in-bangalore` | 2: `/cities-we-serve/shipping-container-marathahalli-orr`; the "Cargo storage containers in Bangalore" link in the cargo category list (`categoryLandings.ts`, product SEO session's file) | **Synonym, same category, same city.** The target is the hand-written Bangalore page with its live catalogue price table (#343), linked from 66 city pages. |
| 6 | `/promotions/site-office-container-in-chennai` | `/cities-we-serve/container-office-in-chennai` | 3: `/cities-we-serve/container-office-in-kalpakkam`, `…-in-athipattu`, `…-in-chennai` | **Same product family** (container and site offices) **and the same city.** Chennai has one office city page, and it already covers site offices. A third Chennai office page would split the same searches. |
| 7 | `/promotions/porta-cabin-in-karnataka` | `/promotions/portable-cabin-in-karnataka` | 10 city pages (the porta-cabin and portable-cabin pages in Karnataka: Devanahalli airport, Hubballi–Dharwad, Koppal, Chamarajanagar, Bannerghatta Road, Vasanthapura, Mahadevapura, Kaggadasapura, RR Nagar, Richmond Town) | **Synonym, same category, same state.** The target is the Karnataka cabin hub (20 city-page links). 5 of those 10 pages already link both hubs; the other 5 would switch their link to the target: Devanahalli airport, Hubballi–Dharwad, Koppal, Chamarajanagar and Bannerghatta Road. Keep "porta cabin" wording on the target. |
| 8 | `/promotions/porta-cabin-in-tamil-nadu` | `/promotions/portable-cabin-in-tamil-nadu` | 17 Tamil Nadu cabin city pages (Tindivanam, Krishnagiri, Perundurai, Tiruvallur, Kancheepuram, Gummidipoondi, Cheyyar, Padalur & Irur ×2, Mambakkam, Kanchipuram, Sakkarakottai, Ranipet ×2, Dharmapuri, Madurai, Virudhunagar) | **Synonym, same category, same state.** The target is the Tamil Nadu cabin hub (20 city-page links); every one of those 17 pages links both hubs today. Keep "porta cabin" wording on the target. |

## How it would be applied (only after your separate approval)

1. **Move the internal links first,** then the redirects follow; never link to a redirect.
   - 34 city-page links in `src/data/cityPages.ts`, row 5's link in `categoryLandings.ts` (coordinated with the product SEO session), and the `/promotions` index list.
   - Reciprocal link checks stay green (`cities:audit`).
2. **Add one-hop 301s in one PR,** with a test that pins exactly these eight old → new pairs.
   - Each old URL leaves `/sitemaps/promotions.xml` and the flat `/sitemap.xml` in the same deploy.
3. **Rows 3, 7 and 8:** the target page's title or intro gains "porta cabin" as an alternative name, so the synonym's search intent is still answered.
4. **Live check after deploy:**
   - each old URL → exactly one 301 → a 200 self-canonical target;
   - the targets are unchanged otherwise;
   - no sitemap lists an old URL.
5. **Rollback** means removing the eight redirect entries. The old pages come back as they were, since their source stays in `seoPromotions.ts` until a later clean-up.
