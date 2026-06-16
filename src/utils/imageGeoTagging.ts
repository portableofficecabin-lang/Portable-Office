/**
 * Image Geo-Tagging & SEO Metadata Utility
 * Automatically applies geo-location, title, and keyword metadata
 * to all images across the website for improved image SEO.
 */

export interface ImageGeoMeta {
  title: string;
  geoLocationName: string;
  geoRegion: string;
  geoPlacename: string;
  geoPosition: string; // "lat;lng"
  icbm: string; // "lat, lng"
  keywords: string;
}

// Default business geo-location (Bangalore, India)
const DEFAULT_GEO = {
  geoLocationName: "South India",
  geoRegion: "IN-KA",
  geoPlacename: "Bangalore, Karnataka, India",
  geoPosition: "12.9716;77.5946",
  icbm: "12.9716, 77.5946",
};

export const INDUSTRIAL_LOCATION_LIST = [
  "Peenya Industrial Area (Phase 1, 2, 3, 4)",
  "Bommasandra Industrial Area",
  "Jigani Industrial Area",
  "Attibele Industrial Area",
  "Harohalli Industrial Area",
  "Kumbalgodu Industrial Area",
  "Doddaballapur Industrial Area",
  "Nelamangala Industrial Area",
  "Hoskote Industrial Area",
  "Bidadi Industrial Area",
  "Malur Industrial Area",
  "Devanahalli Aerospace / Industrial Park",
  "Whitefield Industrial Area",
  "Electronics City Industrial Area",
  "Rajajinagar Industrial Town",
  "Veerasandra Industrial Area",
  "KIADB Industrial Area – Sadaramangala",
  "KIADB Industrial Area – Sompura",
  "KIADB Industrial Area – Iggalur",
  "Hoodi Industrial Area",
  "Ambattur Industrial Estate",
  "Guindy Industrial Estate",
  "Thirumudivakkam Industrial Estate",
  "Sriperumbudur Industrial Park",
  "Oragadam Industrial Corridor",
  "Irungattukottai Industrial Park",
  "Pillaipakkam Industrial Park",
  "Manallur Industrial Park",
  "Nemili Industrial Park",
  "Thervoykandigai Industrial Park",
  "Hosur Industrial Area",
  "Ranipet Industrial Complex",
  "Perundurai Industrial Park (Erode)",
  "Cheyyar Industrial Park",
  "Gummidipoondi Industrial Park",
  "Cuddalore Industrial Park",
  "Bargur Industrial Park",
  "Gangaikondan Industrial Growth Centre",
  "Pudukottai Industrial Complex",
  "Thoothukudi Industrial Park",
  "Manamadurai Industrial Park",
] as const;

const INDUSTRIAL_LOCATION_KEYWORDS = INDUSTRIAL_LOCATION_LIST.join(", ");
const INDUSTRIAL_LOCATION_SUMMARY =
  "Peenya, Bommasandra, Jigani, Ambattur, Sriperumbudur, Oragadam, Hosur and major South India industrial hubs";

// Page-level geo metadata with targeted keywords
const pageGeoMeta: Record<string, Partial<ImageGeoMeta>> = {
  home: {
    title: "Portable Office Cabin – Leading Manufacturer in South India",
    keywords: `portable cabin India, portable office cabin manufacturer, container office Bangalore, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  products: {
    title: "Portable Cabin Products – Buy Online South India",
    keywords: `portable cabin products, container office price India, prefab home manufacturer, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  about: {
    title: "About Portable Office Cabin – Trusted Prefab Manufacturer India",
    keywords: `portable cabin manufacturer India, prefab company Bangalore, modular building supplier, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  contact: {
    title: "Contact Portable Office Cabin – Free Quote South India",
    keywords: `portable cabin quote India, prefab manufacturer contact, portable office enquiry, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  rental: {
    title: "Portable Cabin Rental Service South India",
    keywords: `portable cabin rental India, site office hire, portable toilet rental Bangalore, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  projects: {
    title: "Our Projects – Portable Cabin & Container Office Installations",
    keywords: `portable cabin project India, container office installation, prefab project gallery, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
  blog: {
    title: "Blog – Portable Cabin Industry Insights South India",
    keywords: `portable cabin blog, prefab structures India, container office articles, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  },
};

// Product category-level keywords for image tagging
const categoryKeywords: Record<string, string> = {
  "portable-cabins": `portable cabin, portable office cabin, prefab cabin India, portable cabin manufacturer Bangalore, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  "site-office-containers": `site office container, container office India, shipping container office, site office cabin, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  "container-offices": `container office, modular container office India, portable container workspace Bangalore, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  "prefab-homes": `prefab home India, prefabricated house, modular home manufacturer, 2BHK prefab home, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  "portable-toilet-cabins": `portable toilet, portable toilet cabin India, mobile toilet block, construction site toilet, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
  "security-cabins": `security cabin, guard cabin India, portable security booth, security guard room, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
};

/**
 * Get geo-tagged metadata for a specific page
 */
export function getPageImageMeta(pageKey: string): ImageGeoMeta {
  const pageMeta = pageGeoMeta[pageKey] || {};
  return {
    title: pageMeta.title || "Portable Office Cabin – South India",
    keywords:
      pageMeta.keywords ||
      `portable cabin India, container office, prefab manufacturer, ${INDUSTRIAL_LOCATION_KEYWORDS}`,
    ...DEFAULT_GEO,
  };
}

/**
 * Get geo-tagged metadata for a product image
 */
export function getProductImageMeta(
  productName: string,
  categorySlug?: string
): ImageGeoMeta {
  const catKeywords = categorySlug ? categoryKeywords[categorySlug] || "" : "";
  return {
    title: `${productName} – Portable Office Cabin South India`,
    keywords: `${productName}, ${catKeywords}, portable cabin manufacturer India, ${INDUSTRIAL_LOCATION_KEYWORDS}`.replace(/,\s*,/g, ","),
    ...DEFAULT_GEO,
  };
}

/**
 * Generate a descriptive, SEO-optimized alt text from product name
 * Appends geo-location for image SEO
 */
export function generateGeoAlt(baseAlt: string, appendLocation = true): string {
  if (!appendLocation) return baseAlt;
  // Only append if not already containing location info
  const locationTerms = [
    "india", "bangalore", "karnataka", "tamil nadu", "kerala", "chennai", "hyderabad",
    "telangana", "andhra pradesh", "maharashtra", "west bengal", "peenya", "bommasandra",
    "ambattur", "sriperumbudur", "oragadam", "hosur", "mumbai", "pune", "delhi", "ahmedabad",
    "kolkata", "vizag", "kochi", "coimbatore", " in ",
  ];
  const hasLocation = locationTerms.some((term) =>
    baseAlt.toLowerCase().includes(term)
  );
  return hasLocation ? baseAlt : `${baseAlt} – available in Bangalore, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR & pan-India`;
}

/**
 * Generate image title attribute from alt text
 */
export function generateImageTitle(alt: string, productName?: string): string {
  if (productName) {
    return `${productName} | Portable Office Cabin – Bangalore, Chennai, Hyderabad, Mumbai & pan-India`;
  }
  return `${alt} – Portable Office Cabin | Bangalore, Chennai, Mumbai & across India`;
}
