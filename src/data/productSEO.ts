// Unique, professionally written meta data for each product page
// Aligned with Google SEO guidelines: titles < 60 chars, descriptions < 160 chars

interface ProductSEOData {
  title: string;
  description: string;
  keywords: string;
  /** Optional H1 override. When omitted, the H1 is derived from `title` (brand
   *  suffix stripped). Set it to decouple a short on-page H1 from a longer,
   *  keyword-rich <title>. */
  h1?: string;
}

const productSEOMap: Record<string, ProductSEOData> = {
  // Executive Portable Cabin 20ft
  "1": {
    title: "Executive Portable Cabin 20ft | Portable Office Cabin",
    description: "Get a quote for a 20ft executive portable cabin with 50mm PUF insulation, complete wiring & AC provision. Ideal for site offices. Delivery across India.",
    keywords: "executive portable cabin, 20ft portable cabin, portable site office, PUF insulated cabin, portable cabin price India, prefab office cabin, portable cabin manufacturer",
  },
  // Standard Site Office Container
  "2": {
    title: "Standard Site Office Container | Portable Office Cabin",
    description: "Heavy-duty 20ft site office container with Corten steel frame & Rockwool insulation. Built for tough construction sites. Stackable, secure & ready to deliver.",
    keywords: "site office container, 20ft container office, Corten steel container, construction site office, shipping container office India, portable office container price",
  },
  // Modern Container Office — INTENT: Premium/designer 40ft variant with glass facade
  "3": {
    title: "Modern Container Office 40ft | Portable Office Cabin",
    description: "Designer 40ft modern container office with full glass facade, acoustic panels & split AC. Premium corporate workspace for startups. Turnkey install in India.",
    keywords: "modern container office design, 40ft glass container office, designer container office India, premium container workspace, acoustic container office, corporate container office",
  },
  // Family Prefab Home 2BHK
  "4": {
    title: "2BHK Prefab Home | Portable Office Cabin",
    description: "Complete 2BHK prefab home with modular kitchen, bathroom & 10-year warranty. Ideal for farmhouses & resorts. Get a free quote today!",
    keywords: "2BHK prefab home, prefab house India, prefabricated home price, modular home 2BHK, quick build home, farmhouse prefab, prefab home manufacturer India",
  },
  // Portable Toilet Block - 4 Unit
  "5": {
    title: "4-Unit Portable Toilet Block | Portable Office Cabin",
    description: "4-unit MS portable toilet block with ceramic fittings, exhaust fans & 500L water tank. Hygienic sanitation for construction sites & events. Request a quote.",
    keywords: "portable toilet block, 4 unit portable toilet, MS toilet cabin, construction site toilet, mobile toilet India, portable sanitation unit, toilet cabin price",
  },
  // Guard Security Cabin
  "6": {
    title: "Guard Security Cabin – 360° View | Portable Office Cabin",
    description: "Compact security guard cabin with 4-side glass windows, built-in desk & weatherproof design. Ideal for factories & apartments. Fast delivery pan-India.",
    keywords: "security guard cabin, guard booth India, security cabin price, portable guard cabin, factory security cabin, 360 degree security cabin, guard booth manufacturer",
  },
  // Portable Cabin 40ft Bunkhouse
  "7": {
    title: "40ft Portable Bunkhouse – 12 Person | Portable Office Cabin",
    description: "40ft portable bunkhouse for 8–12 workers with attached bathroom, pantry & split AC. Meets welfare standards. Ideal for remote sites. Get a free quote!",
    keywords: "portable bunkhouse, 40ft bunkhouse, worker accommodation cabin, labour camp cabin, site accommodation India, portable bunkhouse price, prefab bunkhouse",
  },
  // Luxury Prefab Villa G+1 Floors
  "8": {
    title: "Luxury Prefab Villa 3BHK G+1 | Portable Office Cabin",
    description: "Premium 3BHK prefab villa with 1500 sq ft, real wood interiors & smart home wiring. Ready in days, not months. Perfect for farmhouses & resorts in India.",
    keywords: "luxury prefab villa, 3BHK prefab home, prefab villa India, G+1 prefab house, premium modular home, farmhouse villa prefab, prefab villa price India",
  },
  // Container Office — INTENT: Buy single standard unit (transactional)
  "10": {
    title: "Container Office for Sale in India | Portable Office Cabin",
    description: "Ready-to-deploy container offices in India — 20ft & 40ft units from ₹7L. Insulated, relocatable, 7–15 day dispatch. PAN-India shipping. Get a free quote!",
    keywords: "container office for sale India, buy container office, 20ft container office price, 40ft container office price, ready container office, container office delivery India",
  },
  // Porta Cabin
  "9": {
    title: "Porta Cabin Manufacturer India | Portable Office Cabin",
    description: "Porta cabin with MS steel frame, PUF insulated panels & quick on-site installation. 30–40% cheaper than traditional construction. Free quote available!",
    keywords: "porta cabin, porta cabin price, porta cabin manufacturer India, portable cabin, prefab porta cabin, MS steel porta cabin, porta cabin for site office",
  },
  // MS Portable Cabin
  "11": {
    title: "MS Portable Cabin Manufacturer in India | Portable Office Cabin",
    h1: "MS Portable Cabin",
    description: "MS portable cabin manufacturer in India — mild steel site offices, security & accommodation cabins with PUF insulation, custom sizes and fast pan-India delivery.",
    keywords: "MS portable cabin, MS portable cabin manufacturer India, mild steel portable cabin, MS portable cabin price India, MS cabin sizes, portable office cabin India, site office cabin, security cabin, labour accommodation cabin",
  },
  // 20ft & 40ft Storage Container – Corten Steel
  "12": {
    title: "20ft & 40ft Storage Container | Portable Office Cabin",
    description: "20ft & 40ft Corten steel storage containers with lockable doors & weatherproof construction. Stackable, secure on-site storage across India. Get a quote!",
    keywords: "20ft storage container, 40ft storage container, Corten steel container, cargo storage container India, heavy duty storage container, site storage container price",
  },
  // Prefabricated Portable Cabin
  "13": {
    title: "Prefabricated Portable Cabin | Portable Office Cabin",
    description: "Prefabricated portable cabins with quick 2-4 hour assembly, weather-resistant steel frame & PUF insulation. 60% cheaper than construction. Get a free quote!",
    keywords: "prefabricated portable cabin, prefab cabin India, portable cabin manufacturer, modular portable cabin, prefab site office, prefabricated cabin price, quick install cabin",
  },
  // New & Used Shipping Container for Sale in India
  "14": {
    title: "Shipping Container for Sale in India | Portable Office Cabin",
    h1: "Shipping Container for Sale",
    description: "New or used shipping containers in India – 20 ft, 40 ft & high cube. Storage, offices & modular buildings with delivery, installation & conversion support.",
    keywords: "shipping container for sale India, new shipping container price, used shipping container for sale, 20 ft shipping container, 40 ft shipping container, buy shipping container India, container for sale near me",
  },
  // Construction Site Portable Office
  "15": {
    title: "Construction Site Portable Office | Prefab Site Cabin",
    description: "Portable construction site office cabins & container offices for Indian projects. Insulated, relocatable & ready for meetings, planning & site coordination.",
    keywords: "construction site portable office, site office container India, portable site office cabin, construction office cabin, container site office, project office cabin, modular site office India",
  },
  // Used Shipping Container for Sale
  "16": {
    title: "Used Shipping Container for Sale | Portable Office Cabin",
    description: "Used shipping containers for sale or rent in India — storage, site offices, labour rooms & conversions. 20 ft, 40 ft and high-cube units with delivery support.",
    keywords: "used shipping container for sale, used shipping container price India, used container on rent, 20 ft used container, 40 ft used container, cargo worthy container, wind and watertight container",
  },
  // Cargo Container – Buy, Rent or Convert
  "17": {
    title: "Cargo Container for Sale in India | Portable Office Cabin",
    h1: "Cargo Container for Sale",
    description: "Cargo containers for sale, rent or lease in India. 10 ft to 40 ft HC & reefer formats with in-house conversion for offices, homes & modular infrastructure.",
    keywords: "cargo container for sale, cargo container on rent India, container rental India, cargo container conversion, 20 ft cargo container price, 40 ft container rent, reefer container India, container lease India",
  },
  // Shipping Container Rental
  "18": {
    title: "Shipping Container Rental | Portable Office Cabin",
    description: "Rent shipping containers in India for storage, site offices, labour accommodation & modular spaces. 10, 20, 40 ft & high cube units with delivery support.",
    keywords: "shipping container rental, container rental India, 20 ft container rental, 40 ft container rental, container office rental, storage container rental, shipping container on rent India",
  },
  // Site Office Container Manufacturers
  "19": {
    title: "Site Office Container Manufacturers | Portable Office Cabin",
    description: "Site office container manufacturers in India for prefabricated workspace solutions, project offices, modular complexes, and custom insulated site cabins.",
    keywords: "site office container manufacturers, site office container India, prefabricated site office, modular site office container, site office container supplier, portable office container manufacturer",
  },
  // MS Container Office Cabin — INTENT: Mild-steel material variant (heavy-duty)
  "20": {
    title: "MS Container Office Cabin | Portable Office Cabin",
    description: "Heavy-duty MS (mild steel) container office cabin with ISMB frame, 40–60mm insulation & corrugated cladding. Built for monsoons & repeat relocation. From ₹2.4L.",
    keywords: "MS container office cabin, mild steel container office, heavy duty container office cabin, ISMB frame office cabin, corrugated steel office cabin India, MS office cabin price",
  },
  // Office Portable Cabin
  "21": {
    title: "Office Portable Cabin – Insulated Prefab Site Office",
    description: "Office portable cabin in India with fast delivery, insulated panels, office-ready electricals & flexible layouts for sites, factories & project offices.",
    keywords: "office portable cabin, portable office cabin India, site office cabin, prefab office cabin, modular office cabin, portable cabin office, office cabin manufacturer India",
  },
  // Prefabricated Labour Hutments & Staff Accommodation
  "22": {
    title: "Prefab Labour Hutments & Staff Housing",
    description: "Prefabricated labour hutments & staff accommodation in India. Modular G+1/G+2 colonies for 50–500 workers. 20–30% cheaper than RCC. Get a free quote!",
    keywords: "prefabricated labour hutments, staff accommodation, labour colony, worker housing India, prefab labour camp, modular staff quarters, construction worker accommodation, BOCW compliant housing",
  },
  // Prefab Porta Cabin
  "23": {
    title: "Prefab Porta Cabin – Types, Pricing & Guide",
    description: "Prefab porta cabin guide for India 2026: types, sizes, pricing (₹900–₹2,000/sq ft), specs & selection tips. 40–60% cheaper than RCC. Get a free quote!",
    keywords: "prefab porta cabin, porta cabin price India, portable cabin types, prefab cabin manufacturer, modular porta cabin, site office porta cabin, prefab porta cabin 2026, porta cabin sizes India",
  },
  // Labor Hutments
  "24": {
    title: "Labor Hutments – Prefab Worker Accommodation",
    description: "Prefabricated labor hutments in India for construction sites & industrial projects. Move-in ready with insulated panels. 20–35% lifecycle savings. Get a quote!",
    keywords: "labor hutments, prefab labor hutments, worker accommodation India, labour hutment manufacturer, construction worker housing, prefabricated labour huts, labor camp India",
  },
  // Cabin Portable
  "25": {
    title: "Cabin Portable – Offices, Sites & Solutions",
    description: "Guide to portable cabin solutions in India — site offices, worker accommodation, security cabins, toilets & containers. 40–60% cheaper than RCC. Get a quote!",
    keywords: "cabin portable, portable cabin India, portable office cabin, site office cabin, container office, security cabin, portable toilet, labour accommodation cabin, prefab cabin",
  },
  // Security Cabin
  "26": {
    title: "Portable Security Guard Cabin | Portable Office Cabin",
    description: "Portable security & guard cabins — MS, GI, FRP, ACP, PVC & PUF from ₹40,000. Police, toll & gate booths with pan-India dispatch in 7–15 days. Get a quote.",
    keywords: "security cabin, portable security cabin, security guard cabin, watchman cabin, GI security cabin, FRP security cabin, MS security cabin, steel security cabin, portable guard cabin, gate security cabin, toll booth cabin, police booth cabin, security cabin price, security cabin manufacturer India",
  },
  // Cabins in Office
  "27": {
    title: "Office Cabins – Modular Workspaces | Portable Office Cabin",
    description: "Modern modular office cabins — glass partitions, acoustic booths, meeting pods & executive suites. 30–40 dB sound cut. Install in a weekend. Get a quote!",
    keywords: "cabins in office, office cabin, modular office cabin, glass office partition, acoustic office booth, phone booth office, meeting pod, prefab office cabin, office cabin price India, modular workspace",
  },
  // Steel Portable Office Container — INTENT: Portability + ISMC/RHS structural steel + stackable G+1
  "28": {
    title: "Steel Office Container 10–40ft | Portable Office Cabin",
    description: "Portable steel office containers in 10/20/30/40ft sizes with ISMC/RHS frame, stackable G+1 & G+2 setups, PUF insulation & 10–25 year design life. From ₹1.6L.",
    keywords: "portable steel office container, stackable container office, ISMC steel container office, G+1 container office, 10ft portable office container, RHS steel office container India",
  },
  "29": {
    title: "Shipping Container in Koramangala | Portable Office Cabin",
    description: "Shipping containers in Koramangala for sale, rent or conversion — offices, cafés, homes & storage. 20 & 40 ft ISO containers. Get a free quote.",
    keywords: "shipping container Koramangala, container office Koramangala, container café Bangalore, shipping container rental Koramangala, used container Bangalore, container home Koramangala, portable office Koramangala, container storage Bangalore",
  },
  "30": {
    title: "Shipping Container in Krishnagiri | Portable Office Cabin",
    description: "20 ft & 40 ft shipping containers in Krishnagiri for sale or rent — storage, offices, homes & modular solutions. Used units from ₹1.5L. Get a free quote!",
    keywords: "shipping container Krishnagiri, used shipping container Krishnagiri, container office Krishnagiri, container storage Hosur, shipping container Tamil Nadu, portable office Krishnagiri, container home Krishnagiri, modular container Krishnagiri",
  },
  "31": {
    title: "Shipping Container in SIPCOT | Portable Office Cabin",
    description: "Shipping containers for SIPCOT estates — Sriperumbudur, Oragadam, Hosur & Gummidipoondi. Storage, offices & labour camps from ₹1.5L. Get a free quote!",
    keywords: "shipping container SIPCOT, container office Sriperumbudur, container storage Oragadam, shipping container Hosur, SIPCOT container rental, prefab labour colony SIPCOT, portable office SIPCOT, container Gummidipoondi",
  },
  "32": {
    title: "Shipping Container in Chennai | Portable Office Cabin",
    description: "Shipping containers in Chennai for sale, rent or conversion — storage, offices, homes & cafés. Used 20 ft from ₹80K. 7–15 day dispatch. Get a free quote!",
    keywords: "shipping container Chennai, container office Chennai, used shipping container Chennai, container rental Chennai, container home ECR, shipping container Ennore, container café OMR, modular container Sriperumbudur",
  },
  "33": {
    title: "Shipping Container in Narsapura | Portable Office Cabin",
    description: "Shipping containers in Narsapura Industrial Area for sale or rent — storage, offices, labour colonies for KIADB plots. Used 20 ft from ₹95K. 7–15 day dispatch.",
    keywords: "shipping container Narsapura, container office KIADB, shipping container Narsapura Industrial Area, container storage Kolar, portable office Narsapura, container Vemgal, container Malur, modular container Hoskote",
  },
  "34": {
    title: "Shipping Container in Peenya | Portable Office Cabin",
    description: "Shipping containers in Peenya, Bengaluru for sale or rent — storage, offices, security cabins & modular solutions. Used 20 ft from ₹85K. Get a free quote!",
    keywords: "shipping container Peenya, container office Peenya Industrial Area, shipping container Bengaluru, container storage Tumkur Road, portable office Peenya, container Peenya 2nd Stage, modular container Bengaluru, used shipping container Peenya",
  },
  "35": {
    title: "Cargo Storage Containers | Portable Office Cabin",
    description: "New or used cargo storage containers in India — 20 ft, 40 ft & HC. ISO-certified steel units for storage, offices, homes & modular builds. Get a quote.",
    keywords: "cargo storage containers, cargo container India, 20 ft storage container, 40 ft container, shipping container for sale, used container India, container office, cargo container price, ISO container, corten steel container",
  },
  "36": {
    title: "Cargo Containers – Types, Uses & Modular Building",
    description: "Guide to cargo containers — GP, High Cube, flat rack, open top, reefer & tank types. Available for sale, rent or conversion for offices, homes & sites in India.",
    keywords: "cargo containers, cargo container types, shipping container guide, GP container, high cube container, flat rack container, open top container, reefer container, container office India, modular container building, cargo container price India",
  },
  "37": {
    title: "Pink Cargo Storage Containers | Portable Office Cabin",
    h1: "Pink Cargo Storage Containers",
    description: "Pink cargo storage containers for retail pop-ups, cafés, offices & branding. 20ft & 40ft ISO containers in vibrant pink. Custom shades & fit-out.",
    keywords: "pink shipping container, pink cargo container, pink container shop, pink container café, pink storage container India, pink container office, pink pop-up store, pink modular building, pink container price",
  },
  "38": {
    title: "Cargo Container for Sale Bangalore | Portable Office Cabin",
    description: "20ft & 40ft cargo shipping containers in Bangalore & across India. ISO-certified new & used units for storage, freight & office use. From ₹1.25L. Get a quote.",
    keywords: "cargo shipping container for sale Bangalore, buy cargo container India, 20ft shipping container price Bangalore, 40ft cargo container India, ISO shipping container Bangalore, used cargo container for sale, shipping container price India, cargo container manufacturer Bangalore",
  },
  "39": {
    title: "Workmen Accommodation – Prefab Labour Colonies",
    description: "Prefab workmen accommodation for 50–500 workers — G+1 modular colonies with dormitories, kitchens & sanitary blocks. 20–40% cheaper than RCC. Get a free quote!",
    keywords: "workmen accommodation, prefab labour colony, worker housing India, labour camp, prefab dormitory, G+1 worker accommodation, construction site housing, labour hutments, portable camp India",
  },
  "40": {
    title: "Labour Colony – Prefab Worker Accommodation",
    description: "Prefabricated labour colony for construction sites & industrial projects. G+1/G+2 modular camps for 50–500 workers. ₹350–1,000+/sq ft. Get a free quote!",
    keywords: "labour colony, prefab labour colony, labour camp India, worker accommodation, prefab dormitory, G+1 labour colony, construction worker housing, labour hutments, modular labour colony, portable camp",
  },
  // VIP Container Office
  "41": {
    title: "VIP Container Office — Luxury Portable Office Cabin India",
    h1: "VIP Container Office",
    description: "Premium VIP container office for sale & rent in India. Fully furnished, AC, insulated, glass façade & executive interiors. Get a free quote from Portable Office Cabin.",
    keywords: "VIP container office, luxury container office, VIP portable office cabin, executive container office, premium office container, VIP container office price, furnished container office, modern container office, VIP office cabin India",
  },
};

export function getProductSEO(productId: string, productName: string): ProductSEOData {
  return productSEOMap[productId] || {
    title: `${productName} | Portable Office Cabin`,
    description: `${productName} – quality portable structure manufactured in India. Customizable, durable & delivered pan-India. Contact us for a free quote!`,
    keywords: `${productName}, portable cabin, portable office, prefab structure India, modular building`,
  };
}

export function getProductSEOTitle(productId: string, productName: string): string {
  return getProductSEO(productId, productName)
    .title.replace(/\s*\|\s*(Portable Office Cabin|POC)\s*$/i, "")
    .trim();
}

export function getProductPrimaryKeyword(productId: string, productName: string): string {
  return getProductSEO(productId, productName).keywords.split(",")[0]?.trim() || productName;
}

export function getProductH1(productId: string, productName: string): string {
  const seo = getProductSEO(productId, productName);
  return seo.h1 || getProductSEOTitle(productId, productName) || productName;
}
