// SEO data and JSON-LD helpers (server-safe — no "use client")

import {
  BRAND,
  getCommerce,
  hasGenuineSalePrice,
  isPurchasable,
} from "@/data/productCommerce";
import { priceForFeed, sellPrice } from "@/lib/pricing/gst";
import {
  DISPATCH_WORKING_DAYS,
  FALLBACK_ZONE_ID,
  SHIPPING_ZONES,
  type ShippingZone,
} from "@/data/shippingZones";

export const SITE_URL = "https://portableofficecabin.com";

/** Structured data must carry absolute URLs — a bundler-hashed relative asset path
 *  (e.g. /_next/static/media/foo.webp) is unresolvable to a crawler. */
function absoluteUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export const seoData = {
  home: {
    title: "Portable Office Cabin Manufacturer in Bangalore | India",
    description:
      "Leading portable office cabin manufacturer in Bangalore offering container offices, site cabins & prefab structures. 7-15 days delivery. Call now!",
    keywords:
      "portable office cabin manufacturer Bangalore, container office, site cabin, prefab structure, porta cabin India",
  },
  products: {
    title: "Products | Portable Cabins & Container Offices",
    description:
      "Browse portable cabins, container offices, prefab homes, site offices, toilet blocks & security cabins. Customizable, durable, ready to ship.",
    keywords:
      "portable cabin products, container office price, prefab home India, site office container, portable toilet block, security guard cabin, modular office, portable structure catalog",
  },
  about: {
    title: "About Us | Portable Office Cabin Manufacturer",
    description:
      "Portable Office Cabin: 15+ years building portable cabins & prefab solutions across India. 500+ projects delivered, quality guaranteed.",
    keywords:
      "portable cabin manufacturer, prefab company India, modular building supplier, portable office manufacturer, about portable cabin company",
  },
  contact: {
    title: "Contact Us | Free Quote for Portable Cabins",
    description:
      "Reach Portable Office Cabin for quotes & support. Call, email, or visit our facility. Fast response on all portable cabin enquiries.",
    keywords:
      "contact portable cabin, portable office quote, prefab home inquiry, site office price, portable cabin manufacturer contact",
  },
  rental: {
    title: "Rental Service | Hire Portable Cabins & Site Offices",
    description:
      "Rent portable cabins, site offices, toilet blocks & security cabins. Flexible terms, quick delivery, well-maintained units across India.",
    keywords:
      "portable cabin rental, site office hire, portable toilet rental, security cabin rent, construction site cabin rental, temporary office hire India",
  },
  appointment: {
    title: "Book Appointment | Schedule a Consultation for Portable Cabins",
    description:
      "Book a free consultation with our portable cabin experts. Discuss your requirements, get customized solutions, and receive a detailed quote for your project.",
    keywords:
      "book portable cabin consultation, schedule prefab meeting, portable office appointment, cabin manufacturer visit",
  },
};

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

/** `priceValidUntil` for an Offer: one year from the build date, as YYYY-MM-DD.
 *  Computed, never hard-coded — a date in the past makes Google drop the offer. */
function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/* ────────────────────────────────────────────────────────────────────────────────────────
 *  SHIPPING — modelled from SHIPPING_ZONES, never flattened to a single rate.
 *
 *  We used to emit ONE OfferShippingDetails claiming ₹0 freight for all of India. That was
 *  false (only Zone 1 is free) and it is exactly the kind of claim that got the Merchant
 *  Center account suspended. Freight is now expressed per zone, at the zone's real rate.
 *
 *  The wrinkle: SHIPPING_ZONES.pincodePrefixes deliberately OVERLAP and are resolved
 *  longest-prefix-first (see resolveShippingZone) — "560" is Zone 1 (free) while the shorter
 *  "56" is Zone 2 (₹18,000). schema.org has no precedence rule between two DefinedRegions,
 *  so emitting those prefixes verbatim would let a crawler read "free delivery to 561xxx",
 *  which we do not honour. Zone 4 is worse: it has NO prefixes at all (it is the fallback),
 *  so it cannot be expressed as prefixes even in principle.
 *
 *  So instead of prefixes we emit non-overlapping PostalCodeRangeSpecifications, derived
 *  from the same table by resolving every 3-digit pincode bucket through the same
 *  longest-prefix rule the checkout uses and then merging consecutive buckets. The result
 *  partitions the whole Indian pincode space (1xxxxx–8xxxxx) exactly once, so every postal
 *  code carries precisely the rate the customer will actually be charged. Zone 1's ₹0 is
 *  genuinely free and stays ₹0; nothing else claims free delivery.
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/** Indian pincodes begin 1–8. 0xxxxx and 9xxxxx are not allocated, so we never claim them. */
const PIN_FIRST_DIGIT_MIN = 1;
const PIN_FIRST_DIGIT_MAX = 8;
const PIN_LENGTH = 6;

interface PostalRange {
  begin: string;
  end: string;
}

/** The bucket width we partition on = the longest prefix in the table (3 today). */
const ZONE_PREFIX_LEN = SHIPPING_ZONES.reduce(
  (max, z) => z.pincodePrefixes.reduce((m, p) => Math.max(m, p.length), max),
  1,
);

/** Same longest-prefix-wins rule as resolveShippingZone(), applied to a pincode bucket. */
function zoneForBucket(bucket: string): ShippingZone | undefined {
  let best: ShippingZone | undefined;
  let bestLength = -1;
  for (const zone of SHIPPING_ZONES) {
    for (const prefix of zone.pincodePrefixes) {
      if (bucket.startsWith(prefix) && prefix.length > bestLength) {
        best = zone;
        bestLength = prefix.length;
      }
    }
  }
  return best ?? SHIPPING_ZONES.find((z) => z.id === FALLBACK_ZONE_ID);
}

/**
 * zoneId -> the contiguous, mutually exclusive pincode ranges that zone really covers.
 * Computed once at module load, straight from SHIPPING_ZONES, so an owner edit to the freight
 * table flows into the JSON-LD with no second place to update.
 */
const ZONE_POSTAL_RANGES: Map<string, PostalRange[]> = (() => {
  const ranges = new Map<string, PostalRange[]>();
  // A prefix longer than the bucket width would make the partition unsound. Bail out rather
  // than emit a rate we cannot prove — omitting shippingDetails is always safe (Merchant
  // Center's account-level shipping settings then carry it), a wrong rate never is.
  if (ZONE_PREFIX_LEN > 3) return ranges;

  const pad = PIN_LENGTH - ZONE_PREFIX_LEN;
  const first = PIN_FIRST_DIGIT_MIN * 10 ** (ZONE_PREFIX_LEN - 1);
  const last = (PIN_FIRST_DIGIT_MAX + 1) * 10 ** (ZONE_PREFIX_LEN - 1) - 1;

  let runZoneId: string | undefined;
  let runStart = "";
  let runEnd = "";

  const flush = () => {
    if (!runZoneId) return;
    const list = ranges.get(runZoneId) ?? [];
    list.push({ begin: runStart + "0".repeat(pad), end: runEnd + "9".repeat(pad) });
    ranges.set(runZoneId, list);
  };

  for (let n = first; n <= last; n++) {
    const bucket = String(n).padStart(ZONE_PREFIX_LEN, "0");
    const zoneId = zoneForBucket(bucket)?.id;
    if (zoneId && zoneId === runZoneId) {
      runEnd = bucket; // extend the current run
      continue;
    }
    flush();
    runZoneId = zoneId;
    runStart = bucket;
    runEnd = bucket;
  }
  flush();

  return ranges;
})();

/**
 * One OfferShippingDetails per zone. handlingTime is the manufacturing/dispatch lead time
 * (DISPATCH_WORKING_DAYS, the 7–15 working days published across the site); transitTime is
 * the zone's own road leg. Together they reconstruct the "7–21 Working Days" the page shows.
 *
 * Installation is NOT folded in — it is a separate optional line item at checkout, not freight.
 */
function shippingDetailsForAllZones() {
  return SHIPPING_ZONES.map((zone) => {
    const postalRanges = ZONE_POSTAL_RANGES.get(zone.id) ?? [];
    if (postalRanges.length === 0) return null;
    return {
      "@type": "OfferShippingDetails",
      name: zone.name,
      shippingRate: {
        "@type": "MonetaryAmount",
        // GST-inclusive, exactly what computeTotals() adds to the order.
        value: zone.rate,
        currency: "INR",
      },
      shippingDestination: postalRanges.map((range) => ({
        "@type": "DefinedRegion",
        addressCountry: "IN",
        postalCodeRange: {
          "@type": "PostalCodeRangeSpecification",
          postalCodeBegin: range.begin,
          postalCodeEnd: range.end,
        },
      })),
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: DISPATCH_WORKING_DAYS.min,
          maxValue: DISPATCH_WORKING_DAYS.max,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: zone.transitDaysMin,
          maxValue: zone.transitDaysMax,
          unitCode: "DAY",
        },
      },
    };
  }).filter(Boolean);
}

/**
 * RETURNS. This mirrors /refund-policy EXACTLY and must keep doing so.
 *
 * That page states: every unit is custom-built to order, so "we do not accept returns" once
 * the product has been manufactured and delivered; an order may be cancelled within 48 hours
 * of confirmation for a full refund only if manufacturing has not started.
 *
 * A cancellation window is NOT a return window, so the correct category is
 * MerchantReturnNotPermitted. Claiming a 30-day return here would look better in Shopping and
 * would itself be a misrepresentation — the site does not honour it.
 */
const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IN",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
  merchantReturnLink: `${SITE_URL}/refund-policy`,
} as const;

/** Product schema.
 *
 *  The `offers` block is emitted ONLY when `isPurchasable(id)` — the same single predicate
 *  that gates Add to Cart and Merchant feed inclusion (see src/data/productCommerce.ts), so
 *  page / JSON-LD / cart / feed can never disagree. Quote-only SKUs (custom, rental, service,
 *  guide, location, or any product whose price the owner has not confirmed) get a valid
 *  Product node with NO price and NO availability — asserting either would be a
 *  misrepresentation. Callers that pass no `id` at all (the promotions landing pages) are
 *  quote-only by definition and likewise get no offers.
 *
 *  The price is `sellPrice(basePrice)` — GST-inclusive, the identical integer the page shows,
 *  the cart charges and the feed submits. Shipping and returns are modelled from
 *  src/data/shippingZones.ts and /refund-policy respectively (see above). */
export function generateProductStructuredData(product: {
  /** Product.id from src/data/products.ts — the join key into the commerce catalog.
   *  Without it nothing is treated as purchasable and no `offers` is emitted. */
  id?: string;
  name: string;
  description: string;
  /** The whole gallery. Emitted as an ARRAY of absolute https URLs, as Google prefers. */
  images?: string[];
  /** Single-image convenience for callers with only a hero (e.g. the promotions landing
   *  pages). Folded into the same `image` array. */
  image?: string;
  sku?: string;
  slug?: string;
  keywords?: string;
  category?: string;
  reviews?: Array<{
    rating: number;
    title?: string | null;
    body?: string | null;
    reviewer_name: string;
    created_at: string;
  }>;
  /** Authoritative aggregate over ALL approved reviews. When provided it drives
   *  aggregateRating (so the count/average match the on-page trust strip exactly,
   *  even when more reviews exist than are embedded in `reviews` below). */
  ratingSummary?: { count: number; average: number };
}) {
  const productUrl = product.slug
    ? `${SITE_URL}/products/${product.slug}`
    : `${SITE_URL}/products`;

  // The commerce catalog is the authority on money and on what may be sold.
  const commerce = product.id ? getCommerce(product.id) : undefined;
  const purchasable = !!product.id && isPurchasable(product.id) && !!commerce;

  // A genuine strike-through: offers.price stays the CURRENT (lower) price, and the higher
  // "was" price is carried as a ListPrice UnitPriceSpecification — the only correct way to
  // express a sale in schema.org. hasGenuineSalePrice() is false for every SKU today (no
  // compareAtBasePrice is set anywhere, deliberately), so this renders nothing yet; putting
  // the higher number in offers.price would misstate what the customer is charged.
  const salePriceBlock =
    commerce && hasGenuineSalePrice(commerce) && commerce.compareAtBasePrice
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceType: "https://schema.org/ListPrice",
            price: priceForFeed(sellPrice(commerce.compareAtBasePrice)),
            priceCurrency: "INR",
          },
        }
      : {};

  // Empty ONLY if the range derivation bailed out (see ZONE_POSTAL_RANGES). In that case we
  // omit the key entirely and let Merchant Center's account-level shipping settings carry
  // freight — saying nothing is safe, quoting a rate we cannot prove is not.
  const shipping = shippingDetailsForAllZones();

  const offerBlock =
    purchasable && commerce
      ? {
          offers: {
            "@type": "Offer",
            url: productUrl,
            // GST-INCLUSIVE, rounded once in sellPrice() — byte-identical to the price
            // rendered on the page, charged at checkout and submitted to the feed.
            price: priceForFeed(sellPrice(commerce.basePrice)),
            priceCurrency: "INR",
            ...salePriceBlock,
            // Built to order, but never sold when we cannot supply it: isPurchasable()
            // already requires inStock, so this is InStock in practice. BackOrder (not
            // OutOfStock) is the honest fallback — the unit is still orderable, it just
            // ships after manufacture.
            availability: commerce.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/BackOrder",
            itemCondition: "https://schema.org/NewCondition",
            priceValidUntil: oneYearFromNow(),
            seller: {
              "@type": "Organization",
              name: BRAND,
              url: SITE_URL,
            },
            ...(shipping.length > 0 ? { shippingDetails: shipping } : {}),
            hasMerchantReturnPolicy: RETURN_POLICY,
          },
        }
      : {};

  // No GTINs exist for these products, so identity is brand + mpn, and mpn is the SKU.
  const sku = commerce?.sku || product.sku || "POC-GENERIC";

  // Absolute — the catalog hands us bundler-hashed paths like /_next/static/media/….webp,
  // which a crawler cannot resolve. Deduped so a hero passed twice isn't emitted twice.
  const images = Array.from(
    new Set(
      [...(product.images || []), ...(product.image ? [product.image] : [])]
        .filter(Boolean)
        .map(absoluteUrl),
    ),
  );

  const reviews = product.reviews ?? [];
  // Prefer the authoritative aggregate (all approved reviews); fall back to computing
  // from the embedded sample. Google requires the aggregate to reflect every review and
  // to match what the page shows — never emit an aggregateRating when the count is 0.
  const totalCount = product.ratingSummary?.count ?? reviews.length;
  const avgRating =
    product.ratingSummary?.average ??
    (reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0);
  const hasReviews = totalCount > 0;

  const reviewBlock = hasReviews
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: avgRating.toFixed(1),
          reviewCount: totalCount,
          ratingCount: totalCount,
          bestRating: "5",
          worstRating: "1",
        },
        // Embed the individual reviews actually shown on the page (a sample of the
        // aggregate). Omit the key entirely when none are available rather than emit [].
        ...(reviews.length > 0
          ? {
              review: reviews.slice(0, 20).map((r) => ({
                "@type": "Review",
                reviewRating: {
                  "@type": "Rating",
                  ratingValue: r.rating,
                  bestRating: "5",
                  worstRating: "1",
                },
                author: { "@type": "Person", name: r.reviewer_name },
                datePublished: r.created_at,
                ...(r.title ? { name: r.title } : {}),
                ...(r.body ? { reviewBody: r.body } : {}),
              })),
            }
          : {}),
      }
    : {};

  // For a fed SKU the schema name MUST be the feed title: it is what <g:title> sends and what
  // the page <title> renders, and Google matches the feed item to its landing page on it.
  // Quote-only SKUs (and callers with no commerce object) keep the caller's name — they are
  // never fed, so there is nothing to match.
  const name = purchasable && commerce ? commerce.feedTitle : product.name;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: product.description,
    keywords: product.keywords,
    category: product.category,
    url: productUrl,
    ...(images.length > 0 ? { image: images } : {}),
    sku,
    mpn: sku,
    brand: {
      "@type": "Brand",
      name: BRAND,
    },
    manufacturer: {
      "@type": "Organization",
      name: BRAND,
      url: SITE_URL,
    },
    ...offerBlock,
    ...reviewBlock,
  };
}

function generateAreaServedForSchema() {
  return [
    { "@type": "Country", name: "India" },
    { "@type": "State", name: "Karnataka" },
    { "@type": "State", name: "Tamil Nadu" },
    { "@type": "State", name: "Telangana" },
    { "@type": "State", name: "Andhra Pradesh" },
    { "@type": "State", name: "Maharashtra" },
    { "@type": "State", name: "Gujarat" },
    { "@type": "State", name: "Delhi" },
    { "@type": "State", name: "Kerala" },
    { "@type": "State", name: "West Bengal" },
    { "@type": "City", name: "Bangalore" },
    { "@type": "City", name: "Chennai" },
    { "@type": "City", name: "Hyderabad" },
    { "@type": "City", name: "Mumbai" },
    { "@type": "City", name: "Pune" },
    { "@type": "City", name: "Delhi NCR" },
    { "@type": "City", name: "Ahmedabad" },
    { "@type": "City", name: "Kolkata" },
    { "@type": "City", name: "Hosur" },
    { "@type": "City", name: "Coimbatore" },
    { "@type": "City", name: "Vizag" },
    { "@type": "City", name: "Kochi" },
  ];
}

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Portable Office Cabin",
  description:
    "Leading manufacturer of portable cabins, container offices, and prefab solutions in India",
  url: "https://portableofficecabin.com",
  logo: "https://portableofficecabin.com/logo.jpeg",
  taxID: "33FVKPK6238Q1ZT",
  hasCertification: {
    "@type": "Certification",
    name: "ISO 9001:2015",
    about: "Quality Management System",
    certificationIdentification: "QT-99968/0726",
  },
  identifier: {
    "@type": "PropertyValue",
    propertyID: "Udyam Registration Number",
    value: "UDYAM-TN-11-0068545",
  },
  // Only profiles that actually exist — a sameAs pointing at a dead page is a bad
  // entity-verification signal. There is no Twitter/X and no IndiaMart profile.
  sameAs: [
    "https://www.facebook.com/portableofficecabin",
    "https://www.linkedin.com/in/portable-office-cabin-9b939a168",
    "https://www.instagram.com/portableofficecabin",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-9731897976",
      contactType: "sales",
      areaServed: generateAreaServedForSchema(),
      availableLanguage: ["English", "Hindi", "Tamil", "Kannada", "Telugu"],
    },
    {
      "@type": "ContactPoint",
      telephone: "+91-90199-10931",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Survey No. 222 Door No: 2/149-6 Road 1C, Kamandoddi",
    addressLocality: "Hosur",
    addressRegion: "Tamil Nadu",
    postalCode: "635117",
    addressCountry: "IN",
  },
};

export const localBusinessStructuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Portable Office Cabin",
  description:
    "Manufacturer and supplier of portable cabins, container offices, prefab homes, and modular structures across India",
  url: "https://portableofficecabin.com",
  telephone: "+91-9731897976",
  email: "sales@portableofficecabin.com",
  priceRange: "₹₹₹",
  image: "https://portableofficecabin.com/logo.jpeg",
  taxID: "33FVKPK6238Q1ZT",
  hasCertification: {
    "@type": "Certification",
    name: "ISO 9001:2015",
    about: "Quality Management System",
    certificationIdentification: "QT-99968/0726",
  },
  identifier: {
    "@type": "PropertyValue",
    propertyID: "Udyam Registration Number",
    value: "UDYAM-TN-11-0068545",
  },
  // Same verified-real profiles as the Organization node.
  sameAs: [
    "https://www.facebook.com/portableofficecabin",
    "https://www.linkedin.com/in/portable-office-cabin-9b939a168",
    "https://www.instagram.com/portableofficecabin",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Survey No. 222 Door No: 2/149-6 Road 1C, Kamandoddi",
    addressLocality: "Hosur",
    addressRegion: "Tamil Nadu",
    postalCode: "635117",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "12.7409",
    longitude: "77.8253",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "07:00",
      closes: "22:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday"],
      opens: "10:00",
      closes: "19:00",
    },
  ],
  areaServed: generateAreaServedForSchema(),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Portable Cabin & Modular Building Products",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Portable Cabins" },
      { "@type": "OfferCatalog", name: "Container Offices" },
      { "@type": "OfferCatalog", name: "Site Office Containers" },
      { "@type": "OfferCatalog", name: "Prefab Homes" },
      { "@type": "OfferCatalog", name: "Shipping Containers" },
      { "@type": "OfferCatalog", name: "Portable Toilets" },
      { "@type": "OfferCatalog", name: "Security Cabins" },
    ],
  },
};

export const serviceAreaStructuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Portable Cabin & Container Office Manufacturing",
  provider: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    url: "https://portableofficecabin.com",
  },
  areaServed: [
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "12.9716", longitude: "77.5946" },
      geoRadius: "150000",
      name: "Bangalore & Karnataka Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "13.0827", longitude: "80.2707" },
      geoRadius: "150000",
      name: "Chennai & Tamil Nadu Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "17.3850", longitude: "78.4867" },
      geoRadius: "150000",
      name: "Hyderabad & Telangana Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "19.0760", longitude: "72.8777" },
      geoRadius: "200000",
      name: "Mumbai & Maharashtra Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "28.7041", longitude: "77.1025" },
      geoRadius: "200000",
      name: "Delhi NCR Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "23.0225", longitude: "72.5714" },
      geoRadius: "150000",
      name: "Ahmedabad & Gujarat Region",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: "22.5726", longitude: "88.3639" },
      geoRadius: "150000",
      name: "Kolkata & West Bengal Region",
    },
  ],
  description:
    "Pan-India portable cabin, container office, prefab home, and modular building manufacturing with delivery and installation support across Bangalore, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR, Ahmedabad, Kolkata, and 500+ cities.",
};

export function generatePromotionStructuredData(content: {
  h1: string;
  metaDescription: string;
  canonicalUrl: string;
  imageUrl: string;
  location: string;
  geoPlacename: string;
  geoPosition: string;
  keyword: string;
}) {
  const [latitude, longitude] = content.geoPosition.split(";").map((v) => v.trim());
  const image = absoluteUrl(content.imageUrl);

  // No `offers` — these are quote-request landing pages. Nothing here is transactable,
  // so an Offer (price / availability) would be a misrepresentation.
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: content.h1,
    description: content.metaDescription,
    url: content.canonicalUrl,
    image,
    serviceType: content.keyword,
    provider: {
      "@type": "LocalBusiness",
      name: "Portable Office Cabin",
      url: "https://portableofficecabin.com",
      telephone: "+91-9731897976",
      email: "sales@portableofficecabin.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: content.location,
        addressCountry: "IN",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude,
        longitude,
      },
    },
    areaServed: {
      "@type": "Place",
      name: content.geoPlacename,
      address: {
        "@type": "PostalAddress",
        addressLocality: content.location,
        addressCountry: "IN",
      },
    },
  };
}
