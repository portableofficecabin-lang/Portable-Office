export interface SEOContent {
  keyword: string;
  location: string;
  imageAlt: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  h1: string;
  content: string[];
  imageUrl: string;
  keyFeatures: string[];
  faqs: { question: string; answer: string }[];
  canonicalUrl: string;
  relatedProductLinks: { name: string; href: string }[];
  geoRegion: string;
  geoPlacename: string;
  geoPosition: string;
  icbm: string;
}

const keywords = [
  { name: "Portable Cabin", categorySlug: "portable-cabins" },
  { name: "Container Office", categorySlug: "container-offices" },
  { name: "Porta Cabin", categorySlug: "portable-cabins" },
  { name: "Site Office Container", categorySlug: "site-office-containers" },
  { name: "Cargo Storage Container", categorySlug: "cargo-storage-shipping-containers" },
  { name: "Shipping Container", categorySlug: "cargo-storage-shipping-containers" },
  { name: "Labour Colony", categorySlug: "labour-colony" },
  { name: "Bunker Bed container cabin", categorySlug: "bunker-bed-container-cabin" },
  { name: "Security Cabin", categorySlug: "security-cabins" },
  { name: "Portable Toilet Cabin", categorySlug: "portable-toilet-cabins" },
];

const locations = [
  { name: "Tamil Nadu", region: "IN-TN", placename: "Tamil Nadu, India", position: "11.1271;78.6569", icbm: "11.1271, 78.6569" },
  { name: "Kerala", region: "IN-KL", placename: "Kerala, India", position: "10.8505;76.2711", icbm: "10.8505, 76.2711" },
  { name: "Chennai", region: "IN-TN", placename: "Chennai, Tamil Nadu, India", position: "13.0827;80.2707", icbm: "13.0827, 80.2707" },
  { name: "Karnataka", region: "IN-KA", placename: "Karnataka, India", position: "15.3173;75.7139", icbm: "15.3173, 75.7139" },
  { name: "Andhra Pradesh", region: "IN-AP", placename: "Andhra Pradesh, India", position: "15.9129;79.7400", icbm: "15.9129, 79.7400" },
  { name: "Bangalore", region: "IN-KA", placename: "Bangalore, Karnataka, India", position: "12.9716;77.5946", icbm: "12.9716, 77.5946" },
  { name: "Hyderabad", region: "IN-TS", placename: "Hyderabad, Telangana, India", position: "17.3850;78.4867", icbm: "17.3850, 78.4867" },
  { name: "Telangana", region: "IN-TS", placename: "Telangana, India", position: "18.1124;79.0193", icbm: "18.1124, 79.0193" },
  { name: "West Bengal", region: "IN-WB", placename: "West Bengal, India", position: "22.9868;87.8550", icbm: "22.9868, 87.8550" },
  { name: "Maharashtra", region: "IN-MH", placename: "Maharashtra, India", position: "19.7515;75.7139", icbm: "19.7515, 75.7139" },
];

const productImages: Record<string, string> = {
  "Portable Cabin": "/images/products/executive-portable-cabin-20ft-front.webp",
  "Container Office": "/images/products/container-office-front.webp",
  "Porta Cabin": "/images/products/porta-cabin-front.webp",
  "Site Office Container": "/images/products/standard-site-office-container-hero.webp",
  "Cargo Storage Container": "/images/products/ms-container-office-cabin-main.webp",
  "Shipping Container": "/images/products/shipping-container-stacked.webp",
  "Labour Colony": "/images/products/labour-hutments-staff-accommodation-1.webp",
  "Bunker Bed container cabin": "/images/products/portable-cabin-40ft-bunkhouse.webp",
  "Security Cabin": "/images/products/guard-security-cabin-front.webp",
  "Portable Toilet Cabin": "/images/products/portable-toilet-block-4unit-front.webp",
};

const keywordImagePools: Record<string, string[]> = {
  "Portable Cabin": [
    "/images/products/executive-portable-cabin-20ft-front.webp",
    "/images/products/executive-portable-cabin-20ft-side.webp",
    "/images/products/executive-portable-cabin-20ft-installed-1.webp",
    "/images/products/executive-portable-cabin-20ft-installed-2.webp",
    "/images/products/ms-portable-cabin-front.webp",
    "/images/products/ms-portable-cabin-side.webp",
    "/images/products/ms-portable-cabin-back.webp",
    "/images/products/cabin-portable-site.webp",
    "/images/products/office-portable-cabin-main.webp",
    "/images/products/prefab-porta-cabin-exterior.webp",
  ],
  "Container Office": [
    "/images/products/container-office-front.webp",
    "/images/products/container-office-side.webp",
    "/images/products/container-office-rear.webp",
    "/images/products/container-office-interior-meeting.webp",
    "/images/products/modern-container-office-40ft-front.webp",
    "/images/products/modern-container-office-40ft-installation.webp",
    "/images/products/modern-container-office-40ft-left-side.webp",
    "/images/products/cabins-in-office-modern.webp",
    "/images/products/ms-container-office-cabin-main.webp",
    "/images/products/container-office-wood-glass.webp",
  ],
  "Porta Cabin": [
    "/images/products/porta-cabin-front.webp",
    "/images/products/porta-cabin-side.webp",
    "/images/products/porta-cabin-rear.webp",
    "/images/products/porta-cabin-interior-office.webp",
    "/images/products/porta-cabin-interior-kitchen.webp",
    "/images/products/prefab-porta-cabin-exterior.webp",
    "/images/products/executive-portable-cabin-20ft-front.webp",
    "/images/products/ms-portable-cabin-front.webp",
    "/images/products/cabin-portable-site.webp",
    "/images/products/office-portable-cabin-main.webp",
  ],
  "Site Office Container": [
    "/images/products/standard-site-office-container-hero.webp",
    "/images/products/standard-site-office-container-left.webp",
    "/images/products/standard-site-office-container-right.webp",
    "/images/products/standard-site-office-container-rear.webp",
    "/images/products/construction-site-portable-office-site-office.webp",
    "/images/products/site-office-container-manufacturers-exterior.webp",
    "/images/products/steel-portable-office-container-crane.webp",
    "/images/products/ms-container-office-cabin-main.webp",
    "/images/products/container-office-front.webp",
    "/images/products/modern-container-office-40ft-front.webp",
  ],
  "Cargo Storage Container": [
    "/images/products/ms-container-office-cabin-main.webp",
    "/images/products/cargo-storage-containers-main.webp",
    "/images/products/cargo-containers-main.webp",
    "/images/products/cargo-shipping-container-main.webp",
    "/images/products/cargo-container-for-sale-main.webp",
    "/images/products/cargo-storage-containers-pink-main.webp",
    "/images/products/shipping-container-krishnagiri-storage.webp",
    "/images/products/shipping-container-sipcot-yard.webp",
    "/images/products/shipping-container-peenya-industrial.webp",
    "/images/products/shipping-container-chennai-port.webp",
  ],
  "Shipping Container": [
    "/images/products/shipping-container-stacked.webp",
    "/images/products/used-shipping-container-main.webp",
    "/images/products/used-shipping-container-third.webp",
    "/images/products/shipping-container-rental-yard.webp",
    "/images/products/shipping-container-kormangala-crane.webp",
    "/images/products/shipping-container-krishnagiri-storage.webp",
    "/images/products/shipping-container-sipcot-yard.webp",
    "/images/products/shipping-container-chennai-port.webp",
    "/images/products/shipping-container-narsapura-yard.webp",
    "/images/products/shipping-container-peenya-industrial.webp",
  ],
  "Labour Colony": [
    "/images/products/labour-hutments-staff-accommodation-1.webp",
    "/images/products/labor-hutments-aerial.webp",
    "/images/products/workmen-accommodation-main.webp",
    "/images/products/labour-colony-aerial.webp",
    "/images/products/family-prefab-home-2bhk-rear.webp",
    "/images/products/family-prefab-home-2bhk-glass-facade.webp",
    "/images/products/portable-cabin-40ft-bunkhouse.webp",
    "/images/products/prefab-porta-cabin-exterior.webp",
    "/images/products/labour-hutments-staff-accommodation-1.webp",
    "/images/products/workmen-accommodation-main.webp",
  ],
  "Bunker Bed container cabin": [
    "/images/products/portable-cabin-40ft-bunkhouse.webp",
    "/images/products/workmen-accommodation-main.webp",
    "/images/products/labor-hutments-aerial.webp",
    "/images/products/labour-hutments-staff-accommodation-1.webp",
    "/images/products/ms-portable-cabin-front.webp",
    "/images/products/executive-portable-cabin-20ft-installed-1.webp",
    "/images/products/cabin-portable-site.webp",
    "/images/products/prefab-porta-cabin-exterior.webp",
    "/images/products/family-prefab-home-2bhk-front-deck.webp",
    "/images/products/porta-cabin-interior-office.webp",
  ],
  "Security Cabin": [
    "/images/products/guard-security-cabin-front.webp",
    "/images/products/guard-security-cabin-angle.webp",
    "/images/products/guard-security-cabin-left-side.webp",
    "/images/products/guard-security-cabin-back.webp",
    "/images/products/guard-security-cabin-interior.webp",
    "/images/products/security-cabin-residential-gate.webp",
    "/images/products/porta-cabin-front.webp",
    "/images/products/ms-portable-cabin-front.webp",
    "/images/products/cabin-portable-site.webp",
    "/images/products/executive-portable-cabin-20ft-side.webp",
  ],
  "Portable Toilet Cabin": [
    "/images/products/portable-toilet-block-4unit-front.webp",
    "/images/products/portable-toilet-block-4unit-left-side.webp",
    "/images/products/portable-toilet-block-4unit-right-angle.webp",
    "/images/products/portable-toilet-block-4unit-back.webp",
    "/images/products/portable-toilet-block-4unit-interior.webp",
    "/images/products/porta-cabin-front.webp",
    "/images/products/cabin-portable-site.webp",
    "/images/products/ms-portable-cabin-side.webp",
    "/images/products/executive-portable-cabin-20ft-front.webp",
    "/images/products/prefab-porta-cabin-exterior.webp",
  ],
};

// Internal links use the CANONICAL URL forms only: path-based category pages
// (/products/category/<slug>) and clean product URLs (no `.html`). This avoids
// emitting links to non-canonical URLs (the Ahrefs "non-canonical specified as
// canonical" issue). Legacy `?category=`/`.html` URLs 301 here (see next.config.ts).
const categoryRelatedLinks: Record<string, { name: string; href: string }[]> = {
  "portable-cabins": [
    { name: "Portable Cabins", href: "/products/category/portable-cabins" },
    { name: "Porta Cabin", href: "/products/porta-cabin" },
    { name: "MS Portable Cabin", href: "/products/ms-portable-cabin" },
    { name: "View All Products", href: "/products" },
  ],
  "container-offices": [
    { name: "Container Offices", href: "/products/category/container-offices" },
    { name: "VIP Container Office", href: "/products/vip-container-office" },
    { name: "Container Office", href: "/products/container-office" },
    { name: "Cabins in Office", href: "/products/cabins-in-office" },
    { name: "View All Products", href: "/products" },
  ],
  "site-office-containers": [
    { name: "Site Office Containers", href: "/products/category/site-office-containers" },
    { name: "Standard Site Office", href: "/products/standard-site-office-container" },
    { name: "Construction Site Office", href: "/products/construction-site-portable-office" },
    { name: "View All Products", href: "/products" },
  ],
  "cargo-storage-shipping-containers": [
    { name: "Cargo Storage Containers", href: "/products/category/cargo-storage-shipping-containers" },
    { name: "Cargo Containers", href: "/products/cargo-containers" },
    { name: "Shipping Container", href: "/products/shipping-container-for-sale" },
    { name: "View All Products", href: "/products" },
  ],
  "labour-colony": [
    { name: "Labour Colony", href: "/products/labour-colony" },
    { name: "Labour Hutments", href: "/products/prefabricated-labour-hutments-staff-accommodation" },
    { name: "Workmen Accommodation", href: "/products/workmen-accommodation" },
    { name: "View All Products", href: "/products" },
  ],
  "bunker-bed-container-cabin": [
    { name: "Bunkhouse Cabin", href: "/products/portable-cabin-40ft-bunkhouse" },
    { name: "Workmen Accommodation", href: "/products/workmen-accommodation" },
    { name: "Labour Hutments", href: "/products/labor-hutments" },
    { name: "View All Products", href: "/products" },
  ],
  "security-cabins": [
    { name: "Security Cabins", href: "/products/category/security-cabins" },
    { name: "Guard Security Cabin", href: "/products/guard-security-cabin" },
    { name: "Security Cabin", href: "/products/security-cabin" },
    { name: "View All Products", href: "/products" },
  ],
  "portable-toilet-cabins": [
    { name: "Portable Toilet Cabins", href: "/products/category/portable-toilet-cabins" },
    { name: "4-Unit Toilet Block", href: "/products/portable-toilet-block-4-unit" },
    { name: "Portable Cabins", href: "/products/category/portable-cabins" },
    { name: "View All Products", href: "/products" },
  ],
};

function getPromotionImage(keyword: string, variation: number): string {
  const pool = keywordImagePools[keyword];
  if (!pool?.length) return productImages[keyword];
  return pool[variation % pool.length];
}

export function getPromotionSlug(keyword: string, location: string): string {
  return `${keyword.toLowerCase().replace(/\s+/g, "-")}-in-${location.toLowerCase().replace(/\s+/g, "-")}`;
}

const uniqueContentVariations = [
  {
    intro: (kw: string, loc: string) =>
      `When businesses in ${loc} need fast, reliable site infrastructure, ${kw} is the practical choice. Our units are built for contractors, developers, and industrial clients who need turnkey space without long construction timelines.`,
  },
  {
    intro: (kw: string, loc: string) =>
      `Projects across ${loc} move quickly, and ${kw} helps teams stay on schedule. We manufacture ready-to-use prefab units designed for offices, storage, accommodation, and operational sites.`,
  },
  {
    intro: (kw: string, loc: string) =>
      `For construction and industrial projects in ${loc}, ${kw} offers a proven alternative to permanent buildings. With over 15 years of experience, we deliver durable structures tailored to local site conditions.`,
  },
];

function generateUniqueContent(keyword: string, location: string, variation: number): string[] {
  const mainKeyword = `${keyword} in ${location}`;
  const intro = uniqueContentVariations[variation % uniqueContentVariations.length].intro(
    mainKeyword,
    location
  );

  return [
    intro,
    `Every ${mainKeyword} we supply features 50mm PUF insulated panels, galvanized steel framing, and weatherproof construction suited to ${location}'s climate. Each unit is engineered for year-round comfort and long service life.`,
    `Clients across ${location} choose us because we handle design, manufacturing, delivery, and installation end to end. From layout planning to electrical fit-outs, our team supports your project at every stage.`,
    `We have delivered ${mainKeyword} throughout ${location} for contractors, infrastructure firms, factories, and government agencies. Whether you need a single unit or a multi-block setup, we scale to your requirements.`,
    `Compared with conventional construction, ${mainKeyword} is faster, more cost-effective, and fully relocatable. Standard units are dispatched within 7-15 working days of order confirmation, with transit to ${location} typically taking 1-5 days; larger or custom projects take longer.`,
    `If you are planning a project in ${location}, contact us for a free written quotation on ${mainKeyword}. Every order starts with a quotation — we offer customization in size, interiors, branding, and utilities so your unit is ready for immediate use on site.`,
  ];
}

function generateUniqueFAQs(keyword: string, location: string, variation: number): { question: string; answer: string }[] {
  const baseFAQs = [
    {
      question: `What is the starting price for ${keyword.toLowerCase()} in ${location}?`,
      answer: `Our ${keyword.toLowerCase()} pricing in ${location} starts from ₹1.5 lakh for basic models, with costs varying based on size, specifications, and customization requirements. Prices are indicative starting prices and exclude GST, transport beyond 50 km, and installation. We provide a detailed written quotation with no hidden charges.`,
    },
    {
      question: `How long does delivery and installation take in ${location}?`,
      answer: `Standard ${keyword.toLowerCase()} units are dispatched within 7-15 working days of order confirmation and receipt of the advance, with transit to ${location} typically taking 1-5 days. Larger or custom projects take longer; your written quotation confirms the exact timeline.`,
    },
    {
      question: `Can you customize ${keyword.toLowerCase()} to meet my specific needs in ${location}?`,
      answer: `Absolutely! We offer complete customization for ${keyword.toLowerCase()} in ${location}, including size variations, layout modifications, interior finishes, electrical fittings, and custom branding options to match your exact requirements.`,
    },
    {
      question: `What kind of maintenance do ${keyword.toLowerCase()} require in ${location}?`,
      answer: `Our ${keyword.toLowerCase()} units in ${location} require minimal maintenance. We recommend annual repainting and regular checks of fittings to keep your structure in optimal condition for 15-20 years or more.`,
    },
    {
      question: `Do you provide delivery and installation services throughout ${location}?`,
      answer: `Yes. We offer door-to-door delivery and professional installation across ${location} and all major cities in India. Delivery is free within 50 km of our facility; beyond 50 km, transport is charged based on distance and confirmed in your written quotation.`,
    },
  ];
  return baseFAQs;
}

// SERP-safe limits: titles ≤ 60 chars, descriptions ≤ 158 chars (under 160).
const META_TITLE_MAX = 60;
const META_DESC_MAX = 158;

// Mix of short and longer suffixes so each "<keyword> in <location>" title can be
// padded toward the ideal 50–60 band without ever exceeding 60.
const titleSuffixes = [
  " | Manufacturer",
  " | Supplier",
  " | Get a Quote",
  " | From ₹1.5L",
  " | Fast Delivery",
  " | ISO Grade",
  " | 7-15 Day Dispatch",
  " | 10Y Warranty",
  " | Custom Built",
  " | Factory Direct",
  " | Best Price",
  " | Free Quote",
  " | Manufacturer & Supplier",
  " | Best Price, Free Quote",
  " | ISO-Grade, Fast Delivery",
  " | Manufacturer in India",
  " | Factory Direct Pricing",
];

function truncateMeta(text: string, max: number): string {
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max - 3);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${lastSpace > 40 ? trimmed.slice(0, lastSpace) : trimmed}...`;
}

function generateMetaTitle(keyword: string, location: string, variation: number): string {
  const base = `${keyword} in ${location}`;
  const candidates = titleSuffixes
    .map((s) => base + s)
    .filter((t) => t.length <= META_TITLE_MAX);
  // Prefer titles that land in the ideal 50–60 band (rotated by variation for
  // uniqueness); otherwise use the longest title that still fits under 60.
  const inRange = candidates.filter((t) => t.length >= 50);
  if (inRange.length) return inRange[variation % inRange.length];
  if (candidates.length) return candidates.reduce((a, b) => (b.length > a.length ? b : a));
  return truncateMeta(base, META_TITLE_MAX);
}

function generateMetaDescription(keyword: string, location: string, variation: number): string {
  const mainKeyword = `${keyword} in ${location}`;
  const templates = [
    `Get a quote for ${mainKeyword} from India's trusted prefab maker. PUF insulated units, custom sizes & pan-India delivery to ${location}. Enquire today!`,
    `Looking for ${mainKeyword}? 10-year warranty, IS-grade steel & full customization across ${location}. Call +91 9731897976 for a free quotation.`,
    `Need ${mainKeyword}? Factory-direct from ₹1.5L. Weatherproof PUF panels, on-site setup & expert support in ${location}. Request your quote.`,
    `${mainKeyword} supplier with 15+ years experience. Galvanized frames, turnkey delivery & flexible layouts for every site in ${location}. Enquire now.`,
    `Premium ${mainKeyword} built to order. 50mm PUF insulation, MCB wiring & pan-India logistics with local teams in ${location}. Book a site visit.`,
    `Affordable ${mainKeyword} for contractors & builders. Quick install, relocatable design & ISO-grade materials supplied across ${location}. Talk to us.`,
    `Top-rated ${mainKeyword} manufacturer. Custom cabins, container offices & storage units delivered ready-to-use in ${location}. Free consultation.`,
    `Reliable ${mainKeyword} for industrial & construction sites. Durable steel frame, thermal comfort & on-time delivery throughout ${location}. Quote today.`,
    `Get ${mainKeyword} at the best price. Modular design, 10-year structural warranty & professional installation teams serving ${location}. Contact us.`,
    `Quality ${mainKeyword} with fast turnaround. Dispatch in 7-15 working days, fully compliant electricals & finishes for ${location} projects. Ask for a quote.`,
    `Expert ${mainKeyword} solutions for every budget. Rental or ownership options, scalable layouts & after-sales support in ${location}. Learn more.`,
    `Leading ${mainKeyword} provider. PUF sandwich panels, anti-corrosion coating & complete electrical fit-outs delivered across ${location}. Call now.`,
  ];

  return truncateMeta(templates[variation % templates.length], META_DESC_MAX);
}

function generateContent(
  keyword: string,
  location: string,
  locationData: { region: string; placename: string; position: string; icbm: string },
  categorySlug: string,
  variation: number
): SEOContent {
  const slugKeyword = keyword.toLowerCase().replace(/\s+/g, "-");
  const slugLocation = location.toLowerCase().replace(/\s+/g, "-");
  const canonicalUrl = `https://portableofficecabin.com/promotions/${slugKeyword}-in-${slugLocation}`;
  
  const mainKeyword = `${keyword} in ${location}`;
  const title = generateMetaTitle(keyword, location, variation);
  const metaDescription = generateMetaDescription(keyword, location, variation);
  const metaKeywords = `${keyword.toLowerCase()}, ${keyword.toLowerCase()} ${location.toLowerCase()}, ${keyword.toLowerCase()} manufacturer ${location.toLowerCase()}, ${keyword.toLowerCase()} supplier ${location.toLowerCase()}, prefab ${keyword.toLowerCase()} ${location.toLowerCase()}`;
  const h1 = mainKeyword;

  const content = generateUniqueContent(keyword, location, variation);
  
  const keyFeatures = [
    `IS-grade materials for superior quality`,
    `50mm PUF insulated panels for thermal comfort`,
    `Galvanized steel frame for corrosion resistance`,
    `Dispatch in 7-15 working days; transit to ${location} typically 1-5 days`,
    `Fully customizable layouts and finishes`,
    `10-year structural warranty`,
    `Pan-India delivery and installation support`,
  ];

  const faqs = generateUniqueFAQs(keyword, location, variation);
  
  const relatedProductLinks = categoryRelatedLinks[categorySlug] ?? [
    { name: "Portable Cabins", href: "/products/category/portable-cabins" },
    { name: "Container Offices", href: "/products/category/container-offices" },
    { name: "Site Office Containers", href: "/products/category/site-office-containers" },
    { name: "View All Products", href: "/products" },
  ];

  return {
    keyword,
    location,
    imageAlt: mainKeyword,
    title,
    metaDescription,
    metaKeywords,
    h1,
    content,
    imageUrl: getPromotionImage(keyword, variation),
    keyFeatures,
    faqs,
    canonicalUrl,
    relatedProductLinks,
    geoRegion: locationData.region,
    geoPlacename: locationData.placename,
    geoPosition: locationData.position,
    icbm: locationData.icbm,
  };
}

export const seoPromotions: SEOContent[] = keywords.flatMap((keyword, idx) =>
  locations.map((location, locIdx) => generateContent(
    keyword.name,
    location.name,
    location,
    keyword.categorySlug,
    idx * 10 + locIdx
  ))
);

export function getSEOPromotion(keyword: string, location: string): SEOContent | undefined {
  return seoPromotions.find(
    promo =>
      promo.keyword.toLowerCase() === keyword.toLowerCase() &&
      promo.location.toLowerCase() === location.toLowerCase()
  );
}

export function getSEOPromotionBySlug(slug: string): SEOContent | undefined {
  const parts = slug.split("-in-");
  if (parts.length !== 2) return undefined;
  const keyword = parts[0].replace(/-/g, " ");
  const location = parts[1].replace(/-/g, " ");
  return getSEOPromotion(keyword, location);
}
