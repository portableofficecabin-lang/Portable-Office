# Website claims for approval (issue #107)

**Status: proposal only.** This document changes no page. **No warranty, price, material or delivery wording will be changed until the owner fills in the answers in section 2 and approves them.** Each correction then goes out in its own PR (section 8).

Every quotation below was copied from the source on `main` at `004bfed` (13 Oct 2026). `${keyword}` and `${location}` are the template placeholders the promotion pages fill in, for example "Portable Cabin" and "Chennai". "Promotion pages" means the 99 generated pages at `/promotions/<keyword>-in-<location>`: 10 keywords × 10 locations, minus `/promotions/shipping-container-in-bangalore`, which is a separate hand-written page.

---

## 1. Kept as it is: the container-office starting price

| | |
|---|---|
| **Claim** | "Our container office pricing in ${location} starts from ₹1.5 lakh for basic models … Prices are indicative starting prices and exclude GST, transport beyond 50 km, and installation." |
| **Where** | FAQ (also in the FAQ structured data) on the 10 pages `/promotions/container-office-in-{tamil-nadu, kerala, chennai, karnataka, andhra-pradesh, bangalore, hyderabad, telangana, west-bengal, maharashtra}` |
| **Check** | **Correct.** "Cabins in Office" (SKU POC-CO-CABIN) is listed under Container Offices at **₹1,50,000 excluding GST (₹1,77,000 including GST)**. It is the cheapest product in that category that can be bought online. |
| **Decision** | **Keep ₹1,50,000 excluding GST.** No change is proposed to this figure. |

Two points for information only, with no change proposed:
- The product page and checkout show this item at ₹1,77,000 **including** GST. Both figures are correct because each one says whether GST is included.
- "Cabins in Office" is an indoor modular cabin with glass partitions ("1 m² phone booth to 18+ m² executive cabin"). The cheapest container-built office is the MS Container Office Cabin at ₹2,40,000 excluding GST (₹2,83,200 including GST). Whether "container office from ₹1.5 lakh" should point to the indoor cabin is your call.

---

## 2. Decisions needed from the owner

Please fill in the last column. Until a row is answered, the claims that depend on it stay unchanged.

| # | Question | What the site says today | Your answer |
|---|---|---|---|
| Q1 | **Is there a 10-year structural warranty** on any product? | The promotion pages, Marketplace cards, the Bangalore shipping-container page and the 2BHK prefab home say "10-year structural warranty". The Warranty policy page lists **MS 5 yrs · GI 15 yrs · ACP 20 yrs · PUF panel 25 yrs** and has no 10-year tier. | |
| Q2 | Which warranty tier applies to **container offices and cabins with PUF panels on an MS frame**: MS (5 yrs) or PUF panel (25 yrs)? | Four city pages say 5 years for the structure, and the same pages describe 50 mm PUF panels. | |
| Q3 | Is there a **separate 1-year leakage warranty**? | Four city pages say "one year for leakage". The FAQ says manufacturing leaks are covered by the structural warranty, with no separate leakage term. | |
| Q4 | **Starting price for each promotion keyword**, and how to show it. | One template says "from ₹1.5 lakh" for all 10 keywords (section 5.2). | Figures: approve or replace the proposed column in 5.2. Display: ☐ excluding GST (as the container-office FAQ) ☐ including GST (as product pages) ☐ both |
| Q5 | **Do you hold ready stock** that ships faster than the standard 7–15 working days? If yes, which products and how fast? | "24–72 hour dispatch", "same-day to 48 hours", "2–4 working days", "3–5 days", "same-week", "within a few days", "2 to 5 days", rental "within 48 hours", and the menu's "Ready stock available for immediate dispatch". | |
| Q6 | **One lead time for custom or fitted builds.** | 10–15 days · 10–20 working days · 2–4 weeks · 4–6 weeks · 15–30 days · 20–30 working days · 30–60 days, on different pages. | |
| Q7 | **The real specification** of four products whose own pages disagree (section 5.3, M4). | Prefabricated Portable Cabin, MS Portable Cabin, Standard Site Office Container, Labour Hutments & Staff Accommodation. | |
| Q8 | **Company facts:** founding year, years of experience, number of projects. | About page: "Company Founded 2008". MS Portable Cabin page: "established in 2014". Office Portable Cabin: "since 2010". Labour Hutments: "since the early 2010s". "15+ years" and "500+ projects" appear on the home page and all promotion pages. No source is recorded. | Year: ____ · Years: ____ · Projects: ____ |
| Q9 | **Lifespan figures**: provide one table per material, label them "typical, with maintenance", or remove them? | MS cabins "10–15 years" on some pages and "15–20+ years" on others; containers "10–15", "15–20", "20+" or "25–50 years". | |
| Q10 | Keep **"ISO Grade" / "ISO-grade materials"** in promotion titles and descriptions? | 19 page titles and 8 meta descriptions. No cabin product specifies an "ISO-grade" material. Only container shells are described as ISO containers. | |
| Q11 | **Rental**: are transport, installation and pick-up **included** in the monthly rent? | Two product pages and the menu say "included". The Rental page says "Delivery Charges: Applicable as per distance (delivery not included)". | |
| Q12 | Confirm or remove **installation times** ("installed in about a week", "8–24 hours", "in a weekend", …) and **"% cheaper than RCC" figures** (17 product specs). | No source is recorded for any of them. | |

---

## 3. Confirmed claims — correct today, no change needed

| Claim | Source of truth | Where it appears |
|---|---|---|
| Container office from ₹1,50,000 excluding GST | Cabins in Office, ₹1,50,000 + GST | 10 container-office promotion pages (section 1) |
| Portable cabins from ₹2.36 lakh including GST | Labor Hutments, ₹2,00,000 + GST = ₹2,36,000, the category minimum | `/products/category/portable-cabins` (meta description) |
| Dispatch in 7–15 working days for standard products | Shipping policy and checkout (`DISPATCH_WORKING_DAYS`) | Promotion pages, `/cities-we-serve`, every product page, policies, Merchant feed handling time (40+ places) |
| City pages: manufacturing "about 10–15 days" | Falls inside 7–15 working days | 7 city pages (Mysore, Tirunelveli, Mettur, Hoskote, Tumkur, Sarjapur, Chennai). Optional tidy-up: say "working days". |
| Free delivery in the local zone | Zone 1, ₹0 | Shipping policy, checkout, promotion FAQ, product modal. See section 7: the free zone is defined by pincode and is wider than "50 km". |
| Installation is optional, ₹15,000 including GST | Shipping policy and checkout | Shipping policy, payment policy, checkout, `/cities-we-serve`. See section 5.4, D13: several pages offer installation without saying it is optional. |
| Factory in Tamil Nadu near Hosur (Kamandoddi) | Company address | FAQ, structured data, `/cities-we-serve`, every city-page disclaimer |
| Warranty tiers in the product "Shipping & Warranty" pop-up | Same as the Warranty policy | Every product page |
| No ISO claim on the 18 container-office city pages | — | Checked |

---

## 4. Unsupported claims — no source in the website or its data

These may be true, but nothing records them. Each needs evidence from you, or the claim is removed.

| Claim (exact wording, shortened) | Where | Needs |
|---|---|---|
| "15+ years", "With over 15 years of experience", "500+ projects / clients" | Home page, About, Careers, all 99 promotion pages, the Bangalore shipping page, several product pages | Q8 |
| "…to keep your structure in optimal condition for 15-20 years or more." | Maintenance FAQ on all 99 promotion pages (also in structured data) | Q9 |
| Lifespan rows, e.g. "Durability: 15–20+ year lifespan…", "…containers… can last 25–50 years" | Cabin Portable, Security Cabin, MS Portable Cabin, Narsapura and Cargo Shipping Container pages; spec rows of 11 products **sent to Google Merchant Center** | Q9 |
| " \| ISO Grade", " \| ISO-Grade, Fast Delivery", "…ISO-grade materials supplied across ${location}" | 19 promotion titles, 8 promotion meta descriptions | Q10 |
| "from ₹1.5 lakh" for Labour Colony and Bunker Bed container cabin; title "Bunker Bed container cabin in Chennai \| From ₹1.5L" | 20 promotion FAQs, 2 titles | Q4. Neither category contains a product; the nearest, the 40 ft Bunkhouse, is ₹9,65,000 + GST. |
| Rental fleet specs: "Heavy-duty galvanized steel", "PPGI sandwich panels (60mm)" with "High-density PUF (50mm)" in the same card | `/rental-service` | Rental unit specs (one card gives 60 mm panels and 50 mm PUF; check which is right) |
| Menu: "Ready stock available for immediate dispatch", "Current deals on ready-stock units"; rental "delivered within 48 hours" | Menu on every page; `/rental-service` | Q5 |
| "stock units in days, custom builds in 2–4 weeks"; "turnkey delivery in 2–4 weeks" | `/products/marketing-office`, `/products/workmen-accommodation` | Q5, Q6 |
| Installation durations: "installed in about a week", "Typically 8–24 hours…", "Hours to 2 days…", "Install in a weekend.", "1-2 days after delivery" | 10 product pages; the rows of 8 products are **sent to Merchant Center** | Q12 |
| "30–40% cheaper…", "Up to 60% cheaper…", "40-60% cheaper than RCC…", "20–40% lower than conventional RCC construction" | 17 product specs, 2 product structured-data descriptions, the portable-cabins category (the Merchant feed already filters these out) | Q12 |

---

## 5. Conflicting claims — proposed corrections

Each claim below contradicts the website's own policy pages or catalogue. The **suggested wording** is a proposal. Where it depends on a decision, the cell names that question, and the wording will follow your answer.

### 5.1 Warranty

| ID | Existing wording (exact) | Suggested wording | Pages affected | Code |
|---|---|---|---|---|
| W1 | "10-year structural warranty" (key feature); "…with fast installation and 10-year warranty." (hero); "10-Year Warranty" (badge); meta: "…10-year warranty, IS-grade steel & full customization across ${location}…" and "…Modular design, 10-year structural warranty & professional installation teams…" | *(Q1)* "Structural warranty by material: 5 to 25 years (see warranty policy)". Badge: "Warranty by material". Meta: "…structural warranty by material…" | All 99 promotion pages (meta on 9 + 8 of them); 100 cards on `/marketplace` | `seoPromotions.ts:535, 494, 501`; `SEOPromotionPage.tsx:26, 205`; `Marketplace.tsx:66` |
| W2 | "…every container carries a 10-year structural warranty."; "…every unit carries our 10-year structural warranty."; "10-year structural warranty on every unit" | *(Q1, Q2)* The tier for steel containers (MS: 5 years under the current policy), linked to the warranty policy | `/promotions/shipping-container-in-bangalore` (also in its FAQ structured data) | `promotions/shipping-container-in-bangalore/page.tsx:102`; `ShippingContainerBangaloreContent.tsx:51, 124` |
| W3 | "10-year structural warranty"; "Complete 2BHK prefab home with modular kitchen, bathroom & 10-year warranty…" | *(Q1)* The tier for this home's structure ("light gauge steel" is not a listed tier). Owner to state it. | `/products/family-prefab-home-2bhk` (the second sentence is the product's structured-data description) | `products.ts:475`; `productSEO.ts:54` |
| W4 | "We offer 12-month warranty on structural integrity, waterproofing, and electrical systems. Interiors (flooring, panels, doors) carry 6-month warranty…" | *(Q2)* "Structural warranty by material ([MS 5 / PUF 25] years); electrical fittings 1 year; paint and finish 6 months." | `/products/standard-site-office-container`, `/products/container-site-office`, `/products/modern-container-office` | `SiteOfficeContainerContent.tsx:769`; `ContainerOfficeContent.tsx:758` |
| W5 | Spec "Warranty: 1 year standard; extended options available"; "1-year standard warranty on defects" | *(Q2)* The material tier for this cabin, plus "electrical 1 year". **This row is sent to Merchant Center.** | `/products/cabin-portable` | `products.ts:1288`; `CabinPortableContent.tsx:516-517` |
| W6 | "Warranty: 1–2 years structural, 5 years panels" | *(Q2)* The material tier (PUF panel structures: 25 years under the current policy) | `/products/prefabricated-labour-hutments-staff-accommodation` | `LabourHutmentsStaffAccommodationContent.tsx:355` |
| W7 | "Our stated standard warranty includes five years for the structure and one year for leakage, subject to…" (Hoskote: "…a 5-year structural warranty and 1-year leakage warranty…") | *(Q2 + Q3)* If there is no leakage term: "…[5/25] years for the structure under our warranty policy, which covers leaks caused by manufacturing defects, subject to…" | `/cities-we-serve/portable-container-office-in-thoothukudi`, `…/container-office-in-kalpakkam`, `…/container-office-in-hoskote`, `…/container-office-in-athipattu` | `cityPages.ts:2309, 4415, 4712, 6064` |
| W8 | "Damage-free guarantee (damaged items replaced or refunded)" | "Transit damage reported within 48 hours is repaired, the parts replaced, or compensated (see refund policy)" | Every product page, size-variant page and rental card | `ShippingDeliveryModal.tsx:111` |

### 5.2 Price

The ₹1,50,000 container-office figure stays (section 1). All other figures are from the product catalogue on 13 Oct 2026 and need your approval (Q4).

| Promotion keyword (pages) | Cheapest product you can buy online | Today's FAQ says "from ₹1.5 lakh … exclude GST" | Suggested figure |
|---|---|---|---|
| **Container Office (10)** | Cabins in Office: ₹1,50,000 + GST = ₹1,77,000 | **Correct** | **Keep ₹1,50,000 excluding GST** |
| Portable Cabin (10), Porta Cabin (10) | Labor Hutments: ₹2,00,000 + GST = ₹2,36,000 | Too low | ₹2,00,000 excl. GST (₹2,36,000 incl.) |
| Site Office Container (10) | Steel Portable Office Container: ₹1,60,000 + GST = ₹1,88,800 | Too low | ₹1,60,000 excl. GST (₹1,88,800 incl.) |
| Cargo Storage Container (10), Shipping Container (9) | Used 20 ft container, as-is: ₹50,000 + GST = ₹59,000 (seven containers cost less than ₹1.5 lakh) | Too high | ₹50,000 excl. GST (₹59,000 incl.) |
| Security Cabin (10) | Security Cabin: ₹2,80,000 + GST = ₹3,30,400 | Too low | ₹2,80,000 excl. GST (₹3,30,400 incl.) |
| Portable Toilet Cabin (10) | Portable Toilet Block 4-Unit: ₹5,80,000 + GST = ₹6,84,400 | Too low | ₹5,80,000 excl. GST (₹6,84,400 incl.) |
| Labour Colony (10), Bunker Bed container cabin (10) | No product in the category | Unsupported | No figure: "Priced on quotation for your headcount and layout" |

| ID | Existing wording (exact) | Suggested wording | Pages affected | Code |
|---|---|---|---|---|
| P1 | "Our ${keyword} pricing in ${location} starts from ₹1.5 lakh for basic models, with costs varying based on size, specifications, and customization requirements. Prices are indicative starting prices and exclude GST, transport beyond 50 km, and installation." | Per keyword from the table above. Container office keeps "₹1.5 lakh … exclude GST". Recommended: take the figure from the catalogue in code, so a price change cannot leave the FAQ behind. | 99 promotion pages and their FAQ structured data | `seoPromotions.ts:421-422` |
| P2 | "Need ${mainKeyword}? Factory-direct from ₹1.5L. Weatherproof PUF panels…" | Per keyword, with the GST basis stated (for example "from ₹1.5L + GST" on the container-office page) | 9 promotion meta descriptions | `seoPromotions.ts:495` |
| P3 | Title suffix " \| From ₹1.5L" | Remove from the two Bunker Bed titles (no product) | `/promotions/bunker-bed-container-cabin-in-{chennai, bangalore}` | `seoPromotions.ts:454` |
| P4 | "Price from ₹1.5 lakh"; "Prices start from ₹1.5 lakh for basic models"; table row "From ₹1.5 lakh, fixed quote" | "Used 20 ft containers from ₹59,000 including GST; refurbished from ₹1,48,000 including GST" *(Q4)* | `/promotions/shipping-container-in-bangalore` (meta, FAQ structured data, page) | `page.tsx:32, 102`; `ShippingContainerBangaloreContent.tsx:21, 105, 205` |
| P5 | Price table: "Used/refurbished 20 ft storage container ₹1.5 – ₹2.5 lakh"; "New 20 ft … ₹2 – ₹3.5 lakh"; "20 ft container office … ₹3 – ₹5 lakh"; "40 ft storage container ₹3 – ₹5 lakh"; "40 ft container office / accommodation ₹5 – ₹8 lakh" | Row 1 contradicts the catalogue (₹59,000–₹1,49,000 incl. GST). Owner to confirm rows 2–5, or replace the table with links to the products' fixed prices. | `/promotions/shipping-container-in-bangalore` | `ShippingContainerBangaloreContent.tsx:95-99` |
| P6 | "…dispatched within 7-15 working days of order confirmation and receipt of the advance…"; "…order confirmation and advance." | "…within 7–15 working days of order confirmation and payment…" (products bought online are paid in full; there is no advance) | 99 promotion FAQs (structured data too); Bangalore shipping page | `seoPromotions.ts:426`; `ShippingContainerBangaloreContent.tsx:26, 133` |
| P7 | "Every order starts with a quotation — we offer customization…" | "Fixed-price models can be bought online; custom builds start with a written quotation…" | 99 promotion pages | `seoPromotions.ts:414` |
| P8 | FAQ: "…Unloading (crane or hydra) and installation are charged separately unless your quotation includes them, and GST applies extra." | "…Installation is optional at ₹15,000 including GST, and covers crane or hydra charges for a standard single-unit placement." | `/faq` | `faqs.ts:94` (also `:90`) |

### 5.3 Material

| ID | Existing wording (exact) | Suggested wording | Pages affected | Code |
|---|---|---|---|---|
| M1 | "Every ${mainKeyword} we supply features 50mm PUF insulated panels, galvanized steel framing, and weatherproof construction…" | Per keyword, from the products' own specs: cabins "MS frame; PUF, EPS or rock-wool panels by model"; containers "Corten steel shell; insulation optional (50–100 mm PUF or rock wool)"; toilets "MS structure with ceramic sanitary fittings". Remove "galvanized steel framing" except where a product specifies it. | 99 promotion pages | `seoPromotions.ts:410` |
| M2 | Key features "50mm PUF insulated panels for thermal comfort", "Galvanized steel frame for corrosion resistance" | As M1, per keyword | 99 promotion pages | `seoPromotions.ts:531-532` |
| M3 | Meta: "…Galvanized frames, turnkey delivery…"; "…Weatherproof PUF panels…"; "…50mm PUF insulation, MCB wiring…"; "…PUF sandwich panels, anti-corrosion coating…" | As M1. Drop PUF wording on shipping, cargo and toilet pages. | 9 + 9 + 9 + 8 + 8 promotion meta descriptions | `seoPromotions.ts:493, 495, 496, 497, 504` |
| M4a | Spec "Frame: Hot-dip galvanized MS steel framework", "Wall Panels: PUF insulated sandwich panels" **vs** page "welded from MS C-channel… 1.5–2 mm MS sheet… 30–50 mm glass wool or rock wool" | *(Q7)* One specification. **The spec rows are sent to Merchant Center**, and the feed contradicts the landing page. | `/products/prefabricated-portable-cabin` | `products.ts:1066-1072`; `productCommerce.ts:222`; `PrefabricatedPortableCabinContent.tsx:65, 70, 90-91` |
| M4b | Spec "1.5–2 mm MS sheet with 30–50 mm insulation" **vs** "MS sheet (1.5–2 mm) + 50 mm PUF/glass wool insulation" **vs** "25–50 mm glass wool or rock wool" | *(Q7)* One specification (in the feed) | `/products/ms-portable-cabin` | `products.ts:739-740`; `MSPortableCabinContent.tsx:143, 342` |
| M4c | Spec "Frame: Corten Steel", "Insulation: Rockwool 50mm" **vs** "40-50mm PUF or rockwool" | *(Q7)* One specification (in the feed) | `/products/standard-site-office-container` (text also on `/products/container-site-office`) | `products.ts:396-397`; `productCommerce.ts:373`; `SiteOfficeContainerContent.tsx:146, 250, 761` |
| M4d | "40–50mm PUF/EPS insulated panels" **vs** "40–60mm PUF/EPS insulated sandwich panels" | *(Q7)* One range (in the feed) | `/products/prefabricated-labour-hutments-staff-accommodation` | `LabourHutmentsStaffAccommodationContent.tsx:147, 297`; `products.ts:1179` |
| M5 | Home page specs "MS Steel frame with galvanized C & Z purlins", "50mm / 75mm PUF insulated sandwich panels", "High-density Polyurethane Foam (PUF), 40 kg/m³" | Label as "Typical specification (varies by model)", or list the main options (PUF, EPS, rock wool, glass wool) | `/` | `TechSpecsSection.tsx:2-6` |
| M6 | "…IS-grade steel, a galvanized frame for corrosion resistance…"; "Galvanized steel frame and corten/MS steel body…" | "Corten/MS steel body; optional 50 mm PUF insulation" | `/promotions/shipping-container-in-bangalore` | `page.tsx:102`; `ShippingContainerBangaloreContent.tsx:87` |

### 5.4 Dispatch, delivery and installation

The source of truth is dispatch in **7–15 working days** after order and payment, then transit by zone: Zone 1 free, 1–2 days · Zone 2 ₹18,000, 2–4 days · Zone 3 ₹28,000, 3–5 days · Zone 4 ₹45,000, 5–10 days. Door to door that is **8 to 25 days**. Installation is optional, **₹15,000 including GST**.

| ID | Existing wording (exact) | Suggested wording | Pages affected | Code |
|---|---|---|---|---|
| D1 | "…with 24–72 hour dispatch from Chennai Port yards."; "Bare containers in 48 hours…"; "…delivered and placed… in under 24–72 hours from order confirmation." | *(Q5)* Keep only if stock is real; otherwise "Dispatch in 7–15 working days" | `/products/shipping-container-in-chennai`, `/products/portable-cabin` | `products.ts:1538, 1548, 1552`; `ShippingContainerChennaiContent.tsx:21-22, 76, 353-355`; `PortableCabinContent.tsx:143` |
| D2 | "2–4 working days from our Tamil Nadu factory"; "3–5 day delivery for stock units"; "Deploy in 3–7 Days"; "same-week local delivery" | *(Q5)* As D1 | `/products/shipping-container-in-peenya-industrial`, `…-in-krishnagiri`, `…-in-kormangala` | `products.ts:1427-1446, 1465-1486, 1619` and the three `ShippingContainer*Content.tsx` files |
| D3 | "Deployable in 7–10 days from order confirmation"; "…set up within 7–10 days… including fabrication, delivery, and on-site installation." | "Dispatch in 7–15 working days, then transit by delivery zone (1–2 days within Bengaluru); installation optional" | `/products/container-office`, `/promotions/shipping-container-in-bangalore` | `products.ts:654`; `ContainerOfficeGenericContent.tsx:88`; `page.tsx:99` |
| D4 | "…can typically be delivered within a few days…"; "2 to 5 days"; "within a week including travel" | *(Q5)* "Standard units are dispatched in 7–15 working days; transit to [area] is usually 1–4 days." | 8 container-office city pages (Jigani, Bommasandra, Doddaballapura, SIPCOT Hosur, Shoolagiri, Krishnagiri, Tata Hosur, SIPCOT Coimbatore) and `/products/vip-container-office` | `cityPages.ts:194, 280, 826, 1684, 2474, 2566, 2761, 2969, 3192, 3436`; `VipContainerOfficeContent.tsx:52` |
| D5 | "Factory production takes 4–6 weeks…"; "…2–4 weeks from order confirmation…"; "30–60 days from design to installation"; "10–20 working days"; "Factory production: 2-4 weeks" | *(Q6)* Standard models "7–15 working days"; custom builds use your Q6 range. **Four of these are landing pages of products whose Merchant handling time is 7–15 days.** | `/products/modern-container-office`, `…/cargo-shipping-container`, `…/cargo-containers`, `…/construction-site-portable-office`, `…/office-portable-cabin`, `…/cabin-portable` | listed in the inventory |
| D6 | Pop-up: "Standard delivery: 7–14 working days"; "…manufacturing lead time is 7–14 days or 20–30 working days" | "Dispatch in 7–15 working days, then 1–10 days transit by zone" | Every product page and `/rental-service` | `ShippingDeliveryModal.tsx:94, 198` |
| D7 | "Standard models are typically dispatched within 7–21 working days…" | "…within 7–15 working days…" | `/products/category/portable-cabins` (FAQ structured data too) | `PortableCabinsCategoryContent.tsx:89, 301` |
| D8 | Chip "Delivery: 7–21 Working Days"; meta "Delivery 7–21 Working Days"; size pages "Dispatch 7–21 Working Days" | "Delivery 8–25 days by zone" (door to door) or "Dispatch 7–15 working days". 7–21 days covers neither dispatch nor all zones. | 44 product pages (chip and meta); 5 container-office size pages | `productCommerce.ts:159`; `productFamilies.ts:307, 356, 458`; `variantPageMeta.ts:80-81` |
| D9 | "…with transit to ${location} typically taking 1-5 days"; "· Dispatch 7–15 days + 1–5 days transit" | Transit from the delivery zone: "1–5 days" is wrong for West Bengal and Maharashtra (Zone 4: 5–10 days). Product pages: "+ 1–10 days transit by zone". | 99 promotion pages (wrong on 20); 44 product pages; `/custom-product-policy`; `/products/category/prefab-building` | `seoPromotions.ts:413, 426, 533`; `ProductDetailServer.tsx:409`; `CustomProductPolicy.tsx:116`; `PrefabBuildingCategoryContent.tsx:68, 218-219` |
| D10 | "…beyond 50 km, transport is charged based on distance and confirmed in your written quotation." | "Transport is a flat rate for your delivery zone, including GST, shown at checkout before you pay." | 99 promotion FAQs; product pop-up; `/faq`; `/refund-policy` | `seoPromotions.ts:438`; `ShippingDeliveryModal.tsx:79`; `faqs.ts:94`; `RefundPolicy.tsx:127` |
| D11 | "We offer door-to-door delivery and professional installation…"; "…turnkey delivery…"; "…professional installation teams…"; "Everything included — turnkey" | Keep "installation available" and add, once: "installation is optional, ₹15,000 including GST". Remove "Everything included". | 99 promotion pages; `/products/labour-colony`; `/products/family-prefab-home-2bhk` | `seoPromotions.ts:389, 411, 438, 496, 501`; `LabourColonyContent.tsx:38`; `products.ts:472` |
| D12 | "…pan-India logistics with local teams in ${location}…" | "…pan-India delivery to ${location}…" (the city pages state there is no local office or partner) | 8 promotion meta descriptions | `seoPromotions.ts:497` |
| D13 | "Rental packages with transport, installation, and pick-up included"; "Monthly rentals with delivery, insurance, and pickup included"; menu "Monthly rental with delivery and installation" | *(Q11)* Align with `/rental-service`: "transport charged by distance" | `/products/shipping-container-in-sipcot`, `/products/shipping-container-in-chennai`; menu | `products.ts:1522, 1558`; `site-navigation.ts:268` |
| D14 | Spec "Installation: Factory prep 2–4 weeks + site install 7–21 days" | *(Q6)* **Sent to Merchant Center** next to a 7–15 day handling time | `/products/prefabricated-labour-hutments-staff-accommodation` | `products.ts:1183` |
| D15 | "…pan-India delivery in 7–21 days"; "…delivered in 7-21 days…"; spec "7–21 working days — 7–15 dispatch, plus transit" | "8–25 days door to door by zone" | `/products/steel-portable-cabin`, `/products/prefabricated-portable-cabin` (structured-data descriptions) | `productSEO.ts:113, 133`; `products.ts:809` |

---

## 6. Wording that also reaches Google Merchant Center or structured data

Changing these needs the full Merchant check in CLAUDE.md: the product page, cart, checkout, JSON-LD and feed must still agree.

- **Merchant feed (spec rows of products in the feed):** W5 (Cabin Portable warranty), M4a–M4d (material specs), D14 (labour hutments lead time), the lifespan rows of 11 products, and the installation-time rows of 8 products. One product description is also in the feed: "Takes about a week to install…" (2BHK home).
- **Product structured data (`productSEO.ts`):** W3, D15, and two "% cheaper" sentences.
- **FAQ structured data:** P1, P6, D9 and D10 on the 99 promotion pages; W2 and P4 on the Bangalore shipping page; D4 on 8 city pages and the VIP container office page; D7.
- **Meta descriptions:** W1, P2, M3, D12, the "ISO-grade" meta, and the size-page "Dispatch 7–21".

---

## 7. Conflicts inside the sources of truth (no change proposed here)

These sit in the shipping and checkout data (`shippingZones.ts`, `ShippingDelivery.tsx`, `faqs.ts`). Changing shipping calculations is **protected** (CLAUDE.md) and needs separate approval. They are listed here so the wording decisions above do not build on them.

1. `DELIVERY = "7–21 Working Days"` is called a "conservative envelope", but door-to-door is 8–25 days (Zone 4 up to 25).
2. The Shipping page gives 7–15 working days, and also project lead times of 7–14, 14–20 and 20–30 working days.
3. The FAQ gives custom builds "15 to 30 days".
4. Zone 3's description names Puducherry, but Puducherry pincodes (605…, 609…) resolve to **Zone 2** (₹18,000, not ₹28,000).
5. Zone 1 is described as "within ~50 km", but its pincode prefixes 560, 562, 563 and 635 cover addresses well beyond 50 km. This favours the customer, but "beyond 50 km, transport is charged" is then not exact.
6. The FAQ says "GST applies extra" on installation, while the ₹15,000 installation charge already includes GST (P8).
7. "Express delivery is available at a small additional cost" vs "Charges: Quoted case-by-case".
8. Founding year: 2008, 2010, "early 2010s" and 2014 on different pages (Q8).

---

## 8. How the corrections would be released (after approval)

Separate, reviewable PRs, each verified against the Merchant Center rules in CLAUDE.md:

1. **Promotion template** (`seoPromotions.ts`, `SEOPromotionPage.tsx`, `Marketplace.tsx`, Bangalore shipping page): W1, W2, P1–P7, M1–M3, M6, D3, D9–D12. Fixes 100 pages at once. The container-office ₹1,50,000 figure stays.
2. **Product data** (`products.ts`, `productSEO.ts`, `productFamilies.ts`, `productCommerce.ts` DELIVERY): W3, W5, M4a–d, D1, D2, D8, D13–D15. **Touches the Merchant feed and Product JSON-LD**, so the full anonymous purchase-flow regression test is run.
3. **Product content components and the Shipping & Warranty pop-up:** W4, W6, W8, D5–D7.
4. **City pages** (`cityPages.ts`), wording only: W7, D4.
5. **Policies and FAQ**, only if a decision changes a source of truth (for example a leakage warranty, or a custom-build lead-time table): P8 and section 7.

Out of scope here: the blog posts under `src/views/blog/` repeat some of these claims (for example "1–5 year warranty on structure and leakage").

Related: #106 (container-office cluster), #108 (mobile overflow).
