/**
 * Multi-Location SEO Data
 * Defines city-level targeting for ranking across multiple locations in India.
 * Used by structured data, geo signals, and on-page content.
 */

export interface CityGeo {
  city: string;
  state: string;
  stateCode: string;
  lat: string;
  lng: string;
  industrialAreas: string[];
}

export const TARGET_CITIES: CityGeo[] = [
  {
    city: "Bangalore",
    state: "Karnataka",
    stateCode: "IN-KA",
    lat: "12.9716",
    lng: "77.5946",
    industrialAreas: [
      "Peenya Industrial Area",
      "Bommasandra Industrial Area",
      "Jigani Industrial Area",
      "Whitefield Industrial Area",
      "Electronics City",
      "Bidadi Industrial Area",
      "Nelamangala Industrial Area",
      "Hoskote Industrial Area",
      "Devanahalli Aerospace Park",
    ],
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    stateCode: "IN-TN",
    lat: "13.0827",
    lng: "80.2707",
    industrialAreas: [
      "Ambattur Industrial Estate",
      "Guindy Industrial Estate",
      "Sriperumbudur Industrial Park",
      "Oragadam Industrial Corridor",
      "Irungattukottai Industrial Park",
      "Gummidipoondi Industrial Park",
    ],
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    stateCode: "IN-TG",
    lat: "17.3850",
    lng: "78.4867",
    industrialAreas: [
      "Patancheru Industrial Area",
      "Jeedimetla Industrial Area",
      "Nacharam Industrial Area",
      "Pashamylaram Industrial Area",
      "Shamshabad Aerospace SEZ",
      "Maheshwaram Industrial Zone",
    ],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    stateCode: "IN-MH",
    lat: "19.0760",
    lng: "72.8777",
    industrialAreas: [
      "Andheri MIDC",
      "Taloja MIDC",
      "Bhiwandi Industrial Area",
      "Navi Mumbai Industrial Belt",
      "Thane-Belapur Industrial Area",
    ],
  },
  {
    city: "Pune",
    state: "Maharashtra",
    stateCode: "IN-MH",
    lat: "18.5204",
    lng: "73.8567",
    industrialAreas: [
      "Chakan Industrial Area",
      "Ranjangaon MIDC",
      "Hinjewadi IT Park",
      "Pimpri-Chinchwad Industrial Belt",
      "Talegaon Industrial Area",
    ],
  },
  {
    city: "Ahmedabad",
    state: "Gujarat",
    stateCode: "IN-GJ",
    lat: "23.0225",
    lng: "72.5714",
    industrialAreas: [
      "Naroda Industrial Area",
      "Vatva Industrial Area",
      "Sanand Industrial Park",
      "Changodar Industrial Area",
    ],
  },
  {
    city: "Delhi NCR",
    state: "Delhi",
    stateCode: "IN-DL",
    lat: "28.7041",
    lng: "77.1025",
    industrialAreas: [
      "Manesar Industrial Area",
      "Noida Industrial Area",
      "Greater Noida Industrial Belt",
      "Bahadurgarh Industrial Area",
      "Bhiwadi Industrial Area",
    ],
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    stateCode: "IN-WB",
    lat: "22.5726",
    lng: "88.3639",
    industrialAreas: [
      "Howrah Industrial Belt",
      "Durgapur Industrial Area",
      "Haldia Industrial Park",
      "Falta SEZ",
    ],
  },
  {
    city: "Hosur",
    state: "Tamil Nadu",
    stateCode: "IN-TN",
    lat: "12.7409",
    lng: "77.8253",
    industrialAreas: [
      "Hosur Industrial Area",
      "SIPCOT Hosur",
      "Hosur IT Park",
    ],
  },
  {
    city: "Coimbatore",
    state: "Tamil Nadu",
    stateCode: "IN-TN",
    lat: "11.0168",
    lng: "76.9558",
    industrialAreas: [
      "Coimbatore SIDCO Industrial Estate",
      "Sulur Industrial Area",
      "Perundurai Industrial Park",
    ],
  },
  {
    city: "Vizag",
    state: "Andhra Pradesh",
    stateCode: "IN-AP",
    lat: "17.6868",
    lng: "83.2185",
    industrialAreas: [
      "Visakhapatnam Industrial Area",
      "Atchutapuram SEZ",
      "Anakapalli Industrial Park",
    ],
  },
  {
    city: "Kochi",
    state: "Kerala",
    stateCode: "IN-KL",
    lat: "9.9312",
    lng: "76.2673",
    industrialAreas: [
      "Cochin SEZ",
      "Kalamassery Industrial Area",
      "Ambalamugal Industrial Belt",
    ],
  },
];

/** All city names for quick keyword generation */
export const ALL_CITY_NAMES = TARGET_CITIES.map((c) => c.city);

/** Comma-separated city list for meta keywords */
export const CITY_KEYWORD_STRING = ALL_CITY_NAMES.join(", ");

/** Generate areaServed array for structured data */
export function generateAreaServed() {
  return TARGET_CITIES.map((city) => ({
    "@type": "City",
    name: city.city,
    containedInPlace: {
      "@type": "State",
      name: city.state,
    },
  }));
}

/** Generate GeoCircle service areas for structured data */
export function generateServiceAreaSchema() {
  return {
    "@type": "Service",
    serviceType: "Portable Cabin Manufacturing & Supply",
    provider: {
      "@type": "Organization",
      name: "Portable Office Cabin",
    },
    areaServed: TARGET_CITIES.map((city) => ({
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: city.lat,
        longitude: city.lng,
      },
      geoRadius: "100000",
      name: `${city.city}, ${city.state}`,
    })),
  };
}

/** Get a short summary of key cities for alt text / titles */
export const MULTI_CITY_SUMMARY =
  "Bangalore, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR, Ahmedabad, Kolkata & pan-India";

/** Generate location-aware keywords for a given product */
export function generateMultiLocationKeywords(productName: string): string {
  const topCities = ["Bangalore", "Chennai", "Hyderabad", "Mumbai", "Pune", "Delhi", "Ahmedabad", "Kolkata"];
  return topCities.map((city) => `${productName} in ${city}`).join(", ");
}
