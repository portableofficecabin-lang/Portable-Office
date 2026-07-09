// SEO data and JSON-LD helpers (server-safe — no "use client")

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

export function generateProductStructuredData(product: {
  name: string;
  description: string;
  price?: number;
  image?: string;
  sku?: string;
  inStock?: boolean;
  slug?: string;
  keywords?: string;
  category?: string;
  condition?: "new" | "used" | "refurbished";
  reviews?: Array<{
    rating: number;
    title?: string | null;
    body?: string | null;
    reviewer_name: string;
    created_at: string;
  }>;
}) {
  const conditionUrl =
    product.condition === "used"
      ? "https://schema.org/UsedCondition"
      : product.condition === "refurbished"
        ? "https://schema.org/RefurbishedCondition"
        : "https://schema.org/NewCondition";
  const productUrl = product.slug
    ? `https://portableofficecabin.com/products/${product.slug}`
    : "https://portableofficecabin.com/products";

  const reviews = product.reviews ?? [];
  const hasReviews = reviews.length > 0;
  const avgRating = hasReviews
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const reviewBlock = hasReviews
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: avgRating.toFixed(1),
          reviewCount: reviews.length,
          bestRating: "5",
          worstRating: "1",
        },
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
    : {};

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    keywords: product.keywords,
    category: product.category,
    image: product.image,
    sku: product.sku || "POC-GENERIC",
    mpn: product.sku || "POC-GENERIC",
    brand: {
      "@type": "Brand",
      name: "Portable Office Cabin",
    },
    manufacturer: {
      "@type": "Organization",
      name: "Portable Office Cabin",
      url: "https://portableofficecabin.com",
    },
    ...reviewBlock,
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: product.price || 0,
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      itemCondition: conditionUrl,
      availability:
        product.inStock !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Portable Office Cabin",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 7,
            maxValue: 15,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
    },
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
  sameAs: [
    "https://www.facebook.com/portableofficecabin",
    "https://www.linkedin.com/company/portable-office-cabin",
    "https://www.indiamart.com/portable-office-cabin",
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
  sameAs: [
    "https://www.facebook.com/portableofficecabin",
    "https://www.linkedin.com/company/portable-office-cabin",
    "https://www.indiamart.com/portable-office-cabin",
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
  const image = content.imageUrl.startsWith("http")
    ? content.imageUrl
    : `https://portableofficecabin.com${content.imageUrl}`;

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
    offers: {
      "@type": "Offer",
      url: content.canonicalUrl,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Portable Office Cabin",
      },
    },
  };
}
