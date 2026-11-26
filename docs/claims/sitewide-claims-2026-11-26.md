# Site-wide claims: inventory for verification or removal (26 Nov 2026)

**Status: draft PR.** It changes no URL, robots directive, sitemap entry or price. Line numbers refer to `main` at `4bb8be9`.

Every claim on the site that has no record behind it is listed here with where it appears. Each one is in one of four groups:

| Group | What happens | Count |
|---|---|---|
| **A. Removed in this PR** | Each is replaced with a fact the site already states (dispatch days, PIN-code delivery zones, the warranty policy, the factory near Hosur). Tell me any ID to keep and I restore that line. | 22 items in 18 files |
| **B. Waiting for your evidence** | Unchanged. You send the evidence, or approve removal. | 10 items |
| **C. Documents sent to customers** (admin PDFs, calculator PDF) | Unchanged. Listed only; a separate PR after your decision. | 4 items |
| **D. Product, category and Merchant files** | Unchanged here. They belong to the product SEO session, which takes them in its own draft PR. Rows marked Merchant-protected need your separate Merchant approval, not just a PR number. | 98 lines |

Earlier rounds already handled other claims, which are not repeated here:
- The 99 promotion pages and the Bangalore shipping-container page (#343, live).
- The blog view counts (#341, live).
- The open questions of `docs/claims/issue-107-claims-approval.md` (warranty, lead times, lifespans, rental terms) stand as asked there.

## A. Removed in this PR

| ID | Claim | Where (file:line on main) | Surface | Now reads |
|---|---|---|---|---|
| S1 | "Portable Office Cabin \| India's Leading Manufacturer" | `app/layout.tsx:27` | Default `<title>` of any page without its own title | "Portable Office Cabin \| Portable Cabin Manufacturer in India" |
| S2 | "India's leading manufacturer of portable office cabins…" | `app/layout.tsx:31` | Default meta description | "Manufacturer of portable office cabins…" |
| S3 | "…India's leading portable cabin and modular building manufacturer" | `app/(site)/careers/page.tsx:11` | /careers meta description | "…a portable cabin and modular building manufacturer with its own factory in Tamil Nadu" |
| S4 | "India's Trusted Portable Cabin & Container Office Supplier" | `src/components/home/HeroSection.tsx:83` | Homepage H2 under the H1 | "Portable Cabin & Container Office Supplier Across India" (H1 unchanged) |
| S5 | "60% Cheaper Than Traditional" chip; "Up to 60% cheaper than traditional construction." | `HeroSection.tsx:11`, `:97` | Homepage hero | "Factory-Direct Prices" chip; "Factory-direct prices. Kinder to the planet…" |
| S6 | Stats row "500+ Cabins Delivered · 15+ Years in Business · 2 Factories · 98% Happy Clients" | `HeroSection.tsx:182–195` | Homepage hero | Four facts from the site's own data: "7–15 Working days to dispatch · Free Delivery to PIN 560 · 562 · 563 · 635 · 5–25 yrs Structural warranty, by material · Mon–Sun Open 7 days a week". There is one factory (near Hosur); Bangalore is an office |
| S7 | "Industry-Leading Standards"; tiles "500+ Projects Completed", "15+ Years Experience" | `src/components/home/WhatSetsUsApart.tsx:81`, `:87`, `:88` | Homepage card | "What You Can Count On"; "Fixed: GST-inclusive prices, standard units"; "In-house: Manufacturing near Hosur" (the ISO and 7-day tiles are unchanged) |
| S8 | "Trusted by construction companies, schools, hospitals & government agencies across India" | `WhatSetsUsApart.tsx:101` | Homepage card | "Site offices, classrooms, clinics, security posts and staff housing, delivered across India" |
| S9 | "Up to 60% Cheaper" | `src/components/home/WhyChooseUs.tsx:22` | Homepage "Why choose us" | "Factory-Direct Pricing", with a description of fixed online prices and written quotations |
| S10 | "National teams of experts all over India"; "15+ years delivering outstanding results" | `src/components/home/CTASection.tsx:8`, `:9` | Homepage call-to-action | "Delivery across India, priced by PIN code"; "Built at our own factory in Tamil Nadu" |
| S11 | "ISO-grade steel containers…" | `src/components/home/InternalLinkingHub.tsx:90` | Homepage link hub | "Steel containers…" ("ISO grade" is not a material grade; same decision as #343) |
| S12 | "For over 15 years…"; "Our Journey" timeline: 2008 Company Founded · 2012 100th Project · 2016 Prefab Homes Launch · 2020 500+ Projects · 2024 Industry Leader | `src/views/About.tsx:43`, `:26–32` (rendered `:112–142`) | /about-us hero and a section | "We manufacture portable structures at our own factory in Tamil Nadu, near Hosur…"; the timeline section is removed. Other pages give 2010, 2014 and "early 2010s" as the founding year |
| S13 | "…one of India's most trusted names… For over 15 years…" | `src/views/Careers.tsx:137` | /careers body | "…designs and manufactures premium portable structures at its own factory in Tamil Nadu, near Hosur, and delivers them across India…" |
| S14 | "India's most trusted manufacturer." | `src/views/Blog.tsx:463` | /blog sidebar | "…built at our own factory in Tamil Nadu." |
| S15 | "…is India's leading manufacturer and supplier…" | `src/views/blog/MSPortableCabinBlog.tsx:254` | Blog post | "…manufactures and supplies… from its own factory in Tamil Nadu." |
| S16 | "…with India's leading manufacturer" (Article JSON-LD description); "As one of the leading manufacturers…"; "…from India's trusted manufacturer." | `src/views/blog/PortaCabinsOnRent.tsx:66`, `:620`, `:652` | Structured data and blog body | "…with the manufacturer"; "As a manufacturer…"; "…from the manufacturer." |
| S17 | "…is a leading manufacturer of portable cabins…" | `src/views/blog/PortableCabinManufacturersBangalore.tsx:436` | Blog post | "…is a manufacturer of portable cabins…" |
| S18 | "As a leading manufacturer… in South India"; "…India's trusted manufacturer…"; "…across Karnataka since the 2010s." | `src/views/blog/PrefabLabourColonyBengaluru.tsx:96`, `:127`, `:183` | Blog post | "As a manufacturer…"; "…a manufacturer…"; "…across Karnataka." |
| S19 | Card "Experience Since 2010s: Diverse portfolio across construction, industrial, and government projects." | `src/views/blog/LabourShedPrefabricatedStructures.tsx:434` | Blog post | "Built for Site Work: Labour sheds, site offices and stores for construction and industrial projects." |
| S20 | "Portable Office Cabin – Leading Manufacturer in South India" | `src/utils/imageGeoTagging.ts:77` | Image-metadata helper (currently not called anywhere) | "…Manufacturer in South India" |
| S21 | Organization JSON-LD "Leading manufacturer…"; service-area JSON-LD "…and 500+ cities"; `seoData` "Leading…" and "15+ years… 500+ projects delivered" | `src/lib/seo/structured-data.ts:580`, `:754`, `:30`, `:44` | Homepage structured data (`seoData` is not referenced anywhere) | The same wording as #339 for `:580` and `:754`, so the two PRs agree; neutral text for `seoData` |
| S22 | "India's trusted manufacturer…"; "delivered across India in 7-15 days"; "40+ industrial hubs" | `public/llms.txt:3`, `:5` | File read by AI assistants | "Manufacturer & supplier…"; "Standard units dispatch in 7-15 working days, with delivery across India" (7–15 days is dispatch, not delivery); "industrial hubs" |

A new test, `src/lib/seo/sitewideClaims.test.ts`, fails if any of these claims returns to these files. Code comments are ignored, so a note about a removed claim does not trip it.

## B. Waiting for your evidence (unchanged)

| ID | Claim | Where | What I need from you |
|---|---|---|---|
| E1 | **"ISO 9001:2015 Certified Company"**, certificate no. QT-99968/0726. You added it on 9 Jul 2026 in commit `ae2b755`, "Iso Certificated Details Upload". | **Public:** <br>• homepage hero badge `HeroSection.tsx:158` (`IsoCertificationBadge`) <br>• `WhatSetsUsApart.tsx:89` tile <br>• header `MobileNavigation.tsx:105` <br>• header/footer trust strip `src/lib/site-navigation.ts:437–438`, `:461`, `:470` <br>• both `hasCertification` nodes in `structured-data.ts:586`, `:642` <br>• villa page `cityPages.ts:34008` <br>• labour-camp page `cityPages.ts:34263`, `:34393`, `:34485` <br>• calculator PDF `CabinCalculator.tsx:2004` <br>• product files (group D) <br>**Admin:** group C | A copy of the certificate showing the certification body, the body's accreditation (e.g. NABCB or IAF), the scope (should cover the manufacture of portable cabins and prefab structures) and valid-from / valid-to dates. If it is current: keep, and I'll add the body's name next to the number everywhere. If it has lapsed or cannot be shown: approve removal from every surface listed. A September draft of this removal was never merged (branch `feat/prefabricated-portable-cabin-rewrite`). |
| E2 | **Client logos**: Tata Projects, Tata Electronics, Ashok Leyland, Asian Paints, Brigade Group, MFAR Constructions, Mythri Constructions, Zhonhen System Integration. Plus "Trusted by Businesses Across India" and "Join Our Happy Customers". | `src/components/home/TrustedClientsSection.tsx:4–24`, `:49`, `:56` (homepage) | For each company: a PO or invoice showing that they bought from you, and their OK to show their logo (trademark use). Remove any you can't evidence. |
| E3 | "Industrial Foams Private Limited is also a leading manufacturer of prefabricated labour huts in Bengaluru." The sentence has been there since the first import (16 Jun 2026). | `src/views/blog/PrefabLabourColonyBengaluru.tsx:96` | Is Industrial Foams Pvt Ltd your company? Your GSTIN is a proprietorship. If it isn't yours, the sentence promotes another company, and may have been copied from its article: approve removal. |
| E4 | "…large-scale developments housing 500+ workers" (capacity) | `PrefabLabourColonyBengaluru.tsx:299` | Have you built a colony for 500+ workers? If not, say "up to N workers" with your largest real figure. |
| E5 | Projects showcase "Multi-Story Labour Camp: Modular accommodation for 500+ workers" | `src/views/Projects.tsx:88` (/gallery and /projects) | Is that photo your own project, and was it for 500+ workers? |
| E6 | "Our container offices are trusted by a wide range of industries operating in the Jigani belt" | `src/data/cityPages.ts:586` (Jigani container office page) | Any delivery in the Jigani belt? If not, reword to "suit a wide range of industries". City pages are left for a separate edit, to avoid conflicts with the city-page PRs. |
| E7 | Lifespans "8–15 year lifespan" and "8–15+ year…" | `app/(site)/blog/labour-shed-prefabricated-structures/page.tsx:9` (meta), `LabourShedPrefabricatedStructures.tsx:139` | Same question as issue-107 Q9: one lifespan table per material, labelled "typical, with maintenance", or remove. |
| E8 | "Eco-Friendly Materials", "Kinder to the planet", "sustainable materials" | `HeroSection.tsx:12`, `:97`; `WhyChooseUs.tsx` (Eco-Friendly card) | Vague environmental claim. Keep it only if you can name what is eco-friendly (e.g. recyclable steel, reusable units). Otherwise approve a factual line such as "Steel units that can be moved and reused". |
| E9 | "Every structure we build meets the highest industry standards"; "To be the global leader…" (a vision statement) | `About.tsx:12`, `:74` | Low risk: puffery and an aspiration, not a factual claim. Keep unless you prefer plainer wording. |
| E10 | **"BIS Certified MS Steel"** in the Merchant feed title and material of the Porta Cabin; **"IS 800" / "IS 2062" steel** in product titles and specs (e.g. "Prefab Labour Hutment IS 800 Steel…") | `src/data/productCommerce.ts:482–483` (**Merchant feed title, Merchant-protected**); `src/data/products.ts`, `productCommerce.ts`, product content files (product SEO session's files) | Mill test certificates or the steel supplier's BIS licence for the sections you use (ISMC, RHS, SHS). IS 800 is a design code, not a steel grade: say "designed to IS 800" only if the structural design follows it. The product SEO session changes these after your decision, and the feed title needs your separate Merchant approval. |

## C. Documents sent to customers (unchanged; listed only)

| ID | Claim | Where | Note |
|---|---|---|---|
| D1 | "ISO 9001:2015 Certified Company" | `src/views/admin/QuotationPro.tsx:189` (quotation PDF) | Follows E1 |
| D2 | "ISO 9001:2015" and "ISO 9001:2015 Certified Company" | `src/views/admin/WarrantyCertificate.tsx:46`, `:754` (warranty certificate PDF) | Follows E1 |
| D3 | "India's Trusted Portable Cabin Manufacturer" | `src/views/admin/CabinQuotation.tsx:432` (cabin quotation PDF) | Same wording as S4. Propose "Portable Cabin Manufacturer, Tamil Nadu" |
| D4 | "ISO 9001:2015 Certified Company" | `src/components/home/cabin-calculator/CabinCalculator.tsx:2004` (PDF the public calculator downloads) | Follows E1 |

Admin features stay. Only the printed wording would change, in a separate PR once you decide E1 and D3.

## D. Product, category and Merchant files (product SEO session)

These files belong to the product SEO session: `src/data/products.ts`, `productSEO.ts`, `productCommerce.ts`, `categoryMeta.ts`, `merchantFeedPolicy.ts`, `src/components/products/*`, `src/views/Products.tsx` and `src/views/ProductDetailServer.tsx`. It agreed (26 Nov) to remove these claims in its own draft PR. This PR does not touch them.

Rows marked Merchant-protected are in `products.ts` descriptions that may feed `<g:description>`, `productCommerce.ts`, `merchantFeedPolicy.ts`, the feed route or the product page template. They need your separate Merchant approval, not only a PR number. The 16 lines in these files that are code comments recording earlier removals are left out.

| # | File:line (main 4bb8be9) | Surface | Text (shortened) | Merchant-protected? |
|---|---|---|---|---|
| P1 | `app/(site)/products/metal-portable-cabin/page.tsx:43` | product route metadata | "metal, size and layout. ISO 9001 factory, delivered pan-India."; | no |
| P2 | `src/components/products/BuildingConstructionContractorContent.tsx:506` | product page body | Portable Office Cabin operates a quality management system certified to ISO 9001:2015 | no |
| P3 | `src/components/products/CabinPortableContent.tsx:46` | product page body | { icon: IndianRupee, title: "60% Cheaper", desc: "Up to 60% cheaper than reinforced cement concrete (RCC) structures for temporary or semi-permanent needs" }, | no |
| P4 | `src/components/products/CabinPortableContent.tsx:386` | product page body | When it comes to portable cabins, seamless utility integration is essential for creating office spaces and site offices that are not only functional but also comfortable … | no |
| P5 | `src/components/products/CargoContainersContent.tsx:75` | product page body | a: "Most containers use Corten (weathering) steel with 355 MPa yield strength and self-passivating corrosion resistance. Mild steel (IS 2062 Grade B) is 20–30% cheaper fo… | no |
| P6 | `src/components/products/CargoContainersContent.tsx:102` | product page body | At Portable Office Cabin, we use the same ISO-grade containers and engineered steel frames as the foundation for modular offices, container homes, and site facilities. Th… | no |
| P7 | `src/components/products/CargoContainersContent.tsx:363` | product page body | <li>• Internal volume up to 60% greater than standard 40 ft</li> | no |
| P8 | `src/components/products/CargoStorageContainersContent.tsx:49` | product page body | { q: "Does Portable Office Cabin deliver across India?", a: "Yes. Portable Office Cabin provides PAN-India delivery with hydraulic ramps for safe transport, crane positio… | no |
| P9 | `src/components/products/CargoStorageContainersContent.tsx:86` | product page body | <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" /> Standard sizes fit vessel bays, rail wagons, and truck chassis—reducing handlin… | no |
| P10 | `src/components/products/CargoStorageContainersContent.tsx:273` | product page body | alt="ISO certified cargo storage container ready for conversion at Portable Office Cabin yard Bengaluru" | no |
| P11 | `src/components/products/CargoStorageContainersContent.tsx:310` | product page body | <p>500+ projects, ISO 9001 quality management, NBC fire safety</p> | no |
| P12 | `src/components/products/CargoStorageContainersPinkContent.tsx:60` | product page body | a: "Pink cargo containers share the same ISO-grade structural specifications as standard units—Corten steel or MS frame, 500 kg/sqm floor load, weatherproof construction.… | no |
| P13 | `src/components/products/CargoStorageContainersPinkContent.tsx:453` | product page body | Portable Office Cabin specialises in prefabricated and modular building solutions—portable cabins, container offices, labour colonies, PEB structures, and container homes… | no |
| P14 | `src/components/products/ConstructionSitePortableOfficeContent.tsx:170` | product page body | ["Structural frame", "IS-grade MS framework with multi-layer anti-corrosion primer and paint system, with hot-dip galvanizing optional for aggressive environments."], | no |
| P15 | `src/components/products/LaborHutmentsContent.tsx:318` | product page body | With years of experience serving India's leading construction and infrastructure development projects, Portable Office Cabin has become a trusted name in prefabricated la… | no |
| P16 | `src/components/products/LaborHutmentsContent.tsx:341` | product page body | { title: "Experience", desc: "Operating since the early 2010s with projects delivered across multiple Indian states for diverse industries" }, | no |
| P17 | `src/components/products/LabourColonyContent.tsx:76` | product page body | Portable Office Cabin is a leading manufacturer of prefabricated labour colonies, serving construction firms, industrial plants, and government tenders across Mumbai, Tha… | no |
| P18 | `src/components/products/LabourHutmentsStaffAccommodationContent.tsx:15` | product page body | ["Reusability", "3–5 sites over 10 years", "Fixed location"], | no |
| P19 | `src/components/products/LabourHutmentsStaffAccommodationContent.tsx:36` | product page body | { q: "What does the labour hutment unit on this page cost?", a: "It is sold at the single price shown at the top of this page, inclusive of 18% GST, with transport and op… | no |
| P20 | `src/components/products/LabourHutmentsStaffAccommodationContent.tsx:487` | product page body | "500+ projects delivered", | no |
| P21 | `src/components/products/MSPortableCabinContent.tsx:253` | product page body | Portable Office Cabin, established in 2014, manufactures and supplies MS portable cabins, container offices, and prefab buildings for both B2B and B2C requirements across… | no |
| P22 | `src/components/products/MetalPortableCabinContent.tsx:549` | product page body | Monday to Saturday, 7 AM to 10 PM. ISO 9001:2015 certified and MSME registered, with | no |
| P23 | `src/components/products/OfficePortableCabinContent.tsx:27` | product page body | "40–60% cheaper than conventional RCC structures when civil work and approvals are included", | no |
| P24 | `src/components/products/OfficePortableCabinContent.tsx:215` | product page body | "Up to 60% lower total project cost compared to conventional construction", | no |
| P25 | `src/components/products/OfficePortableCabinContent.tsx:408` | product page body | "Dedicated modular workspace manufacturer since 2010", | no |
| P26 | `src/components/products/PortaCabinContent.tsx:39` | product page body | { icon: IndianRupee, title: "Cost-Effective", desc: "30–40% cheaper than traditional" }, | no |
| P27 | `src/components/products/PortaCabinContent.tsx:168` | product page body | When compared to conventional brick-and-mortar construction, porta cabins deliver significant advantages in cost, speed, and flexibility. Industry data suggests porta cab… | no |
| P28 | `src/components/products/PortableCabinContent.tsx:229` | product page body | Leading manufacturers offer a range of options, from single-compartment units to multi-bay portable toilets, all designed for easy integration with office cabins, securit… | no |
| P29 | `src/components/products/PortableCabinContent.tsx:380` | product page body | All our products are manufactured in accordance with relevant Indian standards, ensuring proper structural safety, electrical safety, and fire resistance. We work to qual… | no |
| P30 | `src/components/products/PortableCabinsCategoryContent.tsx:126` | product page body | question: "Are portable cabins cheaper than brick-and-mortar construction?", | no |
| P31 | `src/components/products/PortableCabinsCategoryContent.tsx:128` | product page body | "Yes — up to 60% cheaper than conventional construction, and dramatically faster. You also avoid demolition losses: when the project ends, the cabin moves to your next si… | no |
| P32 | `src/components/products/PortableCabinsCategoryContent.tsx:148` | product page body | our portable cabins cost up to 60% less than conventional construction and can be | no |
| P33 | `src/components/products/PortableCabinsCategoryContent.tsx:152` | product page body | We are an ISO 9001:2015 certified manufacturer (Certificate No. QT-99968/0726) with 15+ | no |
| P34 | `src/components/products/PortableCabinsCategoryContent.tsx:154` | product page body | just ~40 km from Bangalore — and 500+ projects delivered across India for clients including Tata Projects, | no |
| P35 | `src/components/products/PortableCabinsCategoryContent.tsx:291` | product page body | <li><strong className="text-foreground">ISO 9001:2015 certified.</strong> Documented quality processes on every build (Certificate No. QT-99968/0726); GST-registered and … | no |
| P36 | `src/components/products/PortableCabinsCategoryContent.tsx:292` | product page body | <li><strong className="text-foreground">15+ years, 500+ projects delivered.</strong> Trusted by Tata Projects, Ashok Leyland, Asian Paints and Brigade Group.</li> | no |
| P37 | `src/components/products/PortableCabinsCategoryContent.tsx:293` | product page body | <li><strong className="text-foreground">Up to 60% cheaper than civil construction</strong> — and the cabin is an asset you can relocate or resell, not a structure you dem… | no |
| P38 | `src/components/products/PortableToiletContent.tsx:322` | product page body | <p>Compliance with regulations is essential when deploying portable toilets in India. All our products are manufactured in accordance with standards set by the Ministry o… | no |
| P39 | `src/components/products/PrefabBuildingCategoryContent.tsx:98` | product page body | "At our own factory at Kamandoddi, near Hosur in Tamil Nadu — roughly 40 km from Bangalore on the Hosur road corridor. We are an ISO 9001:2015 certified manufacturer, cer… | no |
| P40 | `src/components/products/PrefabBuildingCategoryContent.tsx:119` | product page body | ISO 9001:2015 certified manufacturer (Certificate No. QT-99968/0726), and delivered across | no |
| P41 | `src/components/products/PrefabPortaCabinContent.tsx:135` | product page body | { icon: Thermometer, title: "Energy Efficiency", desc: "PUF insulation reduces AC loads by up to 30% in extreme heat" }, | no |
| P42 | `src/components/products/PrefabricatedPortableCabinContent.tsx:100` | product page body | ["Certification", "Built under an ISO 9001:2015 quality system"], | no |
| P43 | `src/components/products/PrefabricatedPortableCabinContent.tsx:494` | product page body | Monday to Saturday, 7 AM to 10 PM. ISO 9001:2015 certified and MSME registered, with | no |
| P44 | `src/components/products/ResidentialBuildingConstructionContractorContent.tsx:301` | product page body | "The full RCC house construction package and specifications — trade by trade, with IS grades and finish levels", | no |
| P45 | `src/components/products/ShippingContainerChennaiContent.tsx:75` | product page body | { q: "Can containers withstand Chennai's coastal climate?", a: "Absolutely. Our containers use ISO-grade Corten steel with corrosion resistance suited to Chennai's coasta… | no |
| P46 | `src/components/products/ShippingContainerForSaleContent.tsx:60` | product page body | "Often 20–40% cheaper than new units of similar size", | no |
| P47 | `src/components/products/ShippingContainerForSaleContent.tsx:178` | product page body | Portable Office Cabin is a supplier and manufacturer of ISO-grade containers designed for both storage and prefabricated building | no |
| P48 | `src/components/products/ShippingContainerKormangalaContent.tsx:22` | product page body | const PRODUCT_NAME = "Used 20 ft Shipping Container (As-Is Grade)"; | no |
| P49 | `src/components/products/ShippingContainerKormangalaContent.tsx:57` | product page body | <h2 className="mb-4 font-display text-2xl font-bold text-foreground">About this as-is grade container</h2> | no |
| P50 | `src/components/products/ShippingContainerKormangalaContent.tsx:59` | product page body | This listing is one used 20 ft shipping container in as-is grade, sold at one fixed online price with GST | no |
| P51 | `src/components/products/ShippingContainerNarsapuraContent.tsx:225` | product page body | <p className="text-sm text-muted-foreground">Doors, windows, internal partitions, mezzanine racks (up to 30% floor addition), electrical points, data cabling, AC cut-outs… | no |
| P52 | `src/components/products/ShippingContainerPeenyaContent.tsx:23` | product page body | { icon: Shield, title: "ISO-Grade Build", description: "Corten steel body with marine-grade plywood flooring — weather-resistant for Bengaluru monsoons" }, | no |
| P53 | `src/components/products/ShippingContainerPeenyaContent.tsx:78` | product page body | a: "Yes, used cargo-grade containers are ideal for raw material and finished goods storage. They are 40–60% cheaper than new units while maintaining structural integrity.… | no |
| P54 | `src/components/products/ShippingContainerPeenyaContent.tsx:245` | product page body | <li><strong>Used cargo-grade containers</strong> suit pure storage — typically 40–60% cheaper while maintaining structural integrity</li> | no |
| P55 | `src/components/products/SiteOfficeContainerManufacturersContent.tsx:62` | product page body | ["Frame structure", "IS-grade MS sections, welded bracing, lifting hooks, and handling-ready base frame"], | no |
| P56 | `src/components/products/SteelPortableCabinContent.tsx:250` | product page body | ISO 9001:2015 certified and MSME registered, and we have supplied everything from a single | no |
| P57 | `src/components/products/SteelPortableCabinContent.tsx:552` | product page body | Monday to Saturday, 7 AM to 10 PM. ISO 9001:2015 certified and MSME registered, with | no |
| P58 | `src/components/products/WorkmenAccommodationContent.tsx:376` | product page body | <p>Portable Office Cabin is a specialised manufacturer and supplier of modular buildings focused on Indian project conditions with over 10 years of experience and cumulat… | no |
| P59 | `src/data/categoryMeta.ts:48` | category meta | description quoting "from ₹2.36 lakh", "ISO 9001 manufacturer" and "15+ years' experience". */ | no |
| P60 | `src/data/categoryMeta.ts:69` | category meta | 213-char description that included "ISO 9001 manufacturer". */ | no |
| P61 | `src/data/productCommerce.ts:244` | commerce data | size: "20 ft GP", material: "ISO-Grade Corrugated Steel", bestFor: "Storage & Office Conversion", | **yes — separate Merchant approval** |
| P62 | `src/data/productCommerce.ts:251` | commerce data | size: "Custom sizes", material: "IS-Grade MS Frame, Insulated Panels", bestFor: "Construction Site Offices", | **yes — separate Merchant approval** |
| P63 | `src/data/productCommerce.ts:583` | commerce data | size: "Custom sizes", material: "IS-Grade MS Frame, Insulated Panels", bestFor: "Project Offices", | **yes — separate Merchant approval** |
| P64 | `src/data/productCommerce.ts:667` | commerce data | h1Title: "Used 20 ft Shipping Container (As-Is Grade)", | **yes — separate Merchant approval** |
| P65 | `src/data/productCommerce.ts:668` | commerce data | feedTitle: "Used 20 ft Shipping Container As-Is Grade | Portable Office Cabin", | **yes — separate Merchant approval** |
| P66 | `src/data/productCommerce.ts:669` | commerce data | size: "20 ft × 8 ft — used, as-is grade", material: "Corten Steel", bestFor: "Storage & Offices", | **yes — separate Merchant approval** |
| P67 | `src/data/productSEO.ts:95` | product title / meta description | description: "Porta cabin with MS steel frame, PUF insulated panels & quick on-site installation. 30–40% cheaper than traditional construction. Call or WhatsApp us!", | no |
| P68 | `src/data/productSEO.ts:118` | product title / meta description | description: 'Factory-built steel portable cabins from 8×10 ft to 40×10 ft. Welded MS frame, insulated walls, ready electricals. ISO 9001 maker, pan-India delivery in ${D… | no |
| P69 | `src/data/productSEO.ts:148` | product title / meta description | description: 'See how a prefabricated portable cabin is built, checked and delivered in ${DOOR_TO_DOOR}. Sizes from 8x8 to 40x10 ft, from an ISO 9001 factory, pan-India.'… | no |
| P70 | `src/data/productSEO.ts:204` | product title / meta description | description: "Prefabricated labour hutments & staff accommodation in India. Modular G+1/G+2 colonies for 50–500 workers. 20–30% cheaper than RCC. Call us today!", | no |
| P71 | `src/data/productSEO.ts:210` | product title / meta description | description: "Prefab porta cabin for India — MS frame, PUF sandwich panels, bolted assembly, relocatable. 40–60% cheaper than RCC. Price incl. GST, buy online.", | no |
| P72 | `src/data/productSEO.ts:222` | product title / meta description | description: "Guide to portable cabin solutions in India — site offices, worker accommodation, security cabins, toilets & containers. 40–60% cheaper than RCC. Call us tod… | no |
| P73 | `src/data/productSEO.ts:247` | product title / meta description | title: "Used 20 ft Shipping Container As-Is Grade | Portable Office Cabin", | no |
| P74 | `src/data/productSEO.ts:248` | product title / meta description | description: "Used 20 ft shipping container in as-is grade, sold online at one fixed price with GST included. Corten steel unit for storage and offices.", | no |
| P75 | `src/data/productSEO.ts:249` | product title / meta description | keywords: "used 20 ft shipping container, as-is grade shipping container, used shipping container for sale, 20 ft container for storage, buy used container online", | no |
| P76 | `src/data/productSEO.ts:278` | product title / meta description | description: "New or used cargo storage containers in India — 20 ft, 40 ft & HC. ISO-certified steel units for storage, offices, homes & modular builds. Get a quote.", | no |
| P77 | `src/data/productSEO.ts:294` | product title / meta description | description: "20ft & 40ft cargo shipping containers in Bangalore & across India. ISO-certified new & used units for storage, freight & office use. Contact us for pricing.… | no |
| P78 | `src/data/productSEO.ts:299` | product title / meta description | description: "Prefab workmen accommodation for 50–500 workers — G+1 modular colonies with dormitories, kitchens & sanitary blocks. 20–40% cheaper than RCC. Get a free quo… | no |
| P79 | `src/data/products.ts:627` | product data (page copy; may feed Merchant <g:description>) | "30–40% cheaper than traditional construction", | **yes — separate Merchant approval** |
| P80 | `src/data/products.ts:920` | product data (page copy; may feed Merchant <g:description>) | { label: "Structure", value: "ISO-grade corrugated steel container shell" }, | **yes — separate Merchant approval** |
| P81 | `src/data/products.ts:1019` | product data (page copy; may feed Merchant <g:description>) | { label: "Structure", value: "IS-grade MS frame / insulated panel build / container-based options" }, | **yes — separate Merchant approval** |
| P82 | `src/data/products.ts:1050` | product data (page copy; may feed Merchant <g:description>) | { label: "Structure", value: "IS-grade MS frame with insulated wall and roof systems" }, | **yes — separate Merchant approval** |
| P83 | `src/data/products.ts:1103` | product data (page copy; may feed Merchant <g:description>) | "Up to 60% cheaper than traditional construction", | **yes — separate Merchant approval** |
| P84 | `src/data/products.ts:1214` | product data (page copy; may feed Merchant <g:description>) | "20–30% cheaper than traditional RCC/brick construction with 80% material recovery on relocation", | **yes — separate Merchant approval** |
| P85 | `src/data/products.ts:1236` | product data (page copy; may feed Merchant <g:description>) | description: "Complete prefab porta cabin solutions for India — factory-fabricated modular buildings with MS steel frameworks and insulated sandwich panels. 40–60% cheape… | **yes — separate Merchant approval** |
| P86 | `src/data/products.ts:1252` | product data (page copy; may feed Merchant <g:description>) | "PUF insulation reduces AC loads by up to 30% in extreme heat", | **yes — separate Merchant approval** |
| P87 | `src/data/products.ts:1300` | product data (page copy; may feed Merchant <g:description>) | description: "Complete cabin portable solutions including site offices, worker accommodation, security cabins, portable toilets, and container conversions. MS, GI, FRP, a… | **yes — separate Merchant approval** |
| P88 | `src/data/products.ts:1317` | product data (page copy; may feed Merchant <g:description>) | "40-60% cheaper than RCC construction", | **yes — separate Merchant approval** |
| P89 | `src/data/products.ts:1449` | product data (page copy; may feed Merchant <g:description>) | name: "Used 20 ft Shipping Container (As-Is Grade)", | **yes — separate Merchant approval** |
| P90 | `src/data/products.ts:1455` | product data (page copy; may feed Merchant <g:description>) | shortDescription: "Used 20 ft shipping container in as-is grade, sold online at one fixed price with GST included, for storage and offices; dispatched within 7–15 working… | **yes — separate Merchant approval** |
| P91 | `src/data/products.ts:1456` | product data (page copy; may feed Merchant <g:description>) | description: "Portable Office Cabin sells this used 20 ft Corten steel shipping container in as-is grade online at one fixed price, GST included, for storage and offices.… | **yes — separate Merchant approval** |
| P92 | `src/data/products.ts:1643` | product data (page copy; may feed Merchant <g:description>) | { label: "Material", value: "Corten steel — ISO-grade with marine plywood flooring" }, | **yes — separate Merchant approval** |
| P93 | `src/data/products.ts:1722` | product data (page copy; may feed Merchant <g:description>) | "ISO-grade corten steel structure with corrugated wall panels for maximum durability", | **yes — separate Merchant approval** |
| P94 | `src/data/products.ts:1758` | product data (page copy; may feed Merchant <g:description>) | "Same ISO-grade structural strength as regular shipping containers", | **yes — separate Merchant approval** |
| P95 | `src/data/products.ts:1822` | product data (page copy; may feed Merchant <g:description>) | description: "Prefabricated workmen accommodation — labour colonies, portable camps, and modular dormitory blocks for 50–500 workers. G+1 double-storey designs with PUF i… | **yes — separate Merchant approval** |
| P96 | `src/data/products.ts:1857` | product data (page copy; may feed Merchant <g:description>) | description: "Prefabricated labour colony — structured worker accommodation for construction sites, metro rail projects, refineries, and industrial plants. Single-storey,… | **yes — separate Merchant approval** |
| P97 | `src/views/ProductDetailServer.tsx:526` | product page template | MS CR Sheet / CRCA Sheet — IS 513 &amp; IS 2062 · Corten · ISO-Grade | **yes — separate Merchant approval** |
| P98 | `src/views/Products.tsx:166` | /products page | ISO 9001:2015 Certified | no |

## How this list was made

1. Searched `app/`, `src/` and `public/llms.txt` on `main` for these patterns:
   - certification and grade: ISO 9001, ISO/IS grade, ISO-certified
   - company age: years in business, founding years, "since 20xx", "since the 2010s"
   - counts: 500+, 98%, happy clients
   - superlatives: India's leading / trusted / most trusted, industry leader, a leading manufacturer
   - clients and savings: "trusted by", government agencies, "% cheaper", "cheaper than RCC / traditional"
   - ratings and awards: awards, testimonials, aggregateRating
2. Read every match:
   - Market statements were dropped, e.g. "demand has grown since the early 2010s", or Kudankulam being "one of India's largest nuclear power projects".
   - Third-party statements were dropped too, e.g. "leading manufacturers in India are at the forefront".
   - Matches that are not claims at all were dropped, e.g. trophy and award shops in Kasturi Nagar, or "one-trip" container grades.
3. Ratings: `aggregateRating` is emitted only from real reviews and never when the review count is 0 (`structured-data.ts:426`). No fixed rating or testimonial was found.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
