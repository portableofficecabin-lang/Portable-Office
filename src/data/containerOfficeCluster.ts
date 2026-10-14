/**
 * CONTAINER OFFICE TOPIC CLUSTER — the one place that defines how the container-office pages link
 * to each other.
 *
 *   PILLAR            /products/category/container-offices        broad "container office" intent
 *   BANGALORE LANDING /promotions/container-office-in-bangalore   Bangalore commercial intent
 *   DIRECTORY         /cities-we-serve#container-office-locations every location, grouped by state
 *   LOCATION PAGES    /cities-we-serve/<slug>                       one local intent each (18 pages)
 *
 * Read by: the pillar's locations block (ContainerOfficeCategoryContent), the directory section
 * (CitiesWeServe), the "nearby locations" block on every location page (cities-we-serve/[slug])
 * and the promotion hubs (CITY_LINKS_BY_PROMOTION in seoPromotions.ts). The page content itself
 * stays in cityPages.ts; nothing here changes a page's title, H1 or copy.
 *
 * Rules for this file:
 *  · `area` is a SHORT description taken from the location page's own "areas we serve" text,
 *    not new copy, so a card never claims coverage the page does not.
 *  · `neighbours` are the genuinely nearby cluster pages, chosen from the distance between the
 *    pages' own geo positions (all within ~50 km, except where noted). A page with no
 *    neighbour in reach (Mysore) gets none rather than a forced link.
 *  · Anchors are deliberately varied. `hubAnchor` is used where many locations are listed together
 *    (pillar, promotion hubs); `nearbyLabel` is used inside a neighbour's "nearby" list, whose
 *    heading already says "container offices", so it names the place only.
 *  · Clean root-relative paths only: no query strings, no tracking parameters, no trailing slash.
 */

export const CONTAINER_OFFICE_PILLAR_PATH = "/products/category/container-offices";
export const CONTAINER_OFFICE_BANGALORE_PATH = "/promotions/container-office-in-bangalore";
/** In-page anchor of the directory's container-office section (see CitiesWeServe). */
export const CONTAINER_OFFICE_DIRECTORY_ID = "container-office-locations";
export const CONTAINER_OFFICE_DIRECTORY_PATH = `/cities-we-serve#${CONTAINER_OFFICE_DIRECTORY_ID}`;

export type ClusterState = "Karnataka" | "Tamil Nadu";

export interface ContainerOfficeLocation {
  /** cityPages.ts slug; the page lives at /cities-we-serve/<slug>. */
  slug: string;
  state: ClusterState;
  /** Card title in the directory and pillar lists. */
  name: string;
  /** Place as it reads in "More container office options near …" on the page itself. */
  placeName: string;
  /** Short coverage line, taken from the page's own areas text. */
  area: string;
  /** Anchor used where many locations are listed together (pillar, promotion hubs). */
  hubAnchor: string;
  /** Anchor used in a neighbouring page's "nearby" list (place name only). */
  nearbyLabel: string;
  /** Slugs of genuinely nearby cluster pages. */
  neighbours: string[];
  /** Bengaluru-region page: also links to the Bangalore landing page. */
  bangaloreRegion?: boolean;
}

export const CONTAINER_OFFICE_LOCATIONS: ContainerOfficeLocation[] = [
  // ── Karnataka ── south and south-east Bengaluru first, then east, north, the NH 48 corridor and
  //    Mysore (the only Karnataka page outside the Bengaluru region).
  {
    slug: "container-office-in-bidar",
    state: "Karnataka",
    name: "Bidar",
    placeName: "Bidar",
    area: "Bidar city, Naubad, Kolhar Industrial Area, Humnabad and Bhalki",
    hubAnchor: "Container offices for Bidar's industrial and highway projects",
    nearbyLabel: "Bidar district",
    neighbours: ["container-office-in-kalaburagi"], // Kalaburagi ~97 km (both Kalyana Karnataka)
  },
  {
    slug: "container-office-in-kalaburagi",
    state: "Karnataka",
    name: "Kalaburagi",
    placeName: "Kalaburagi",
    area: "Kalaburagi city, Nandur, Kapnoor, Sedam and Wadi",
    hubAnchor: "Container offices for Kalaburagi and the Sedam–Wadi cement belt",
    nearbyLabel: "Kalaburagi district",
    neighbours: ["container-office-in-bidar"], // ~97 km (both Kalyana Karnataka)
  },
  {
    slug: "container-office-in-jigani",
    state: "Karnataka",
    name: "Jigani",
    placeName: "Jigani",
    area: "Jigani Industrial Area, Anekal, Attibele and the South Bengaluru industrial corridor",
    hubAnchor: "Container offices in Jigani Industrial Area",
    nearbyLabel: "Jigani Industrial Area",
    neighbours: ["container-office-in-bommasandra", "container-office-in-sarjapur", "container-office-in-sipcot-hosur"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-bommasandra",
    state: "Karnataka",
    name: "Bommasandra",
    placeName: "Bommasandra",
    area: "Bommasandra Industrial Area, Hosur Road, Electronic City and Chandapura",
    hubAnchor: "Bommasandra Industrial Area container offices",
    nearbyLabel: "Bommasandra on Hosur Road",
    neighbours: ["container-office-in-jigani", "container-office-in-sarjapur", "container-office-in-sipcot-hosur"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-sarjapur",
    state: "Karnataka",
    name: "Sarjapur Road",
    placeName: "Sarjapur Road",
    area: "Sarjapur town, Dommasandra, Sompura and Muthanallur",
    hubAnchor: "Container offices along Sarjapur Road",
    nearbyLabel: "Sarjapur Road",
    neighbours: ["container-office-in-bommasandra", "container-office-in-jigani", "container-office-in-hoskote", "container-office-in-sipcot-hosur"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-hoskote",
    state: "Karnataka",
    name: "Hoskote",
    placeName: "Hoskote",
    area: "Hoskote town, Old Madras Road and the Chokkahalli and Pillagumpe industrial areas",
    hubAnchor: "Hoskote and Old Madras Road container offices",
    nearbyLabel: "Hoskote and Old Madras Road",
    neighbours: ["container-office-in-sarjapur", "container-office-in-bommasandra", "container-office-in-doddaballapura"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-doddaballapura",
    state: "Karnataka",
    name: "Doddaballapura",
    placeName: "Doddaballapura",
    area: "Doddaballapura Industrial Area, Devanahalli, Yelahanka and North Bengaluru",
    hubAnchor: "Container offices for Doddaballapura and North Bengaluru",
    nearbyLabel: "Doddaballapura and North Bengaluru",
    neighbours: ["container-office-in-hoskote", "container-office-in-tumkur"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-davanagere",
    state: "Karnataka",
    name: "Davanagere",
    placeName: "Davanagere",
    area: "Davanagere city, Harihar, Karur Industrial Area and the NH-48 corridor",
    hubAnchor: "Container offices for Davanagere and Harihar",
    nearbyLabel: "Davanagere",
    neighbours: [], // nearest cluster page on main is Tumkur, ~180 km away
  },
  {
    slug: "container-office-in-tumkur",
    state: "Karnataka",
    name: "Tumkur",
    placeName: "Tumkur",
    area: "Tumkur city, Vasanthanarasapura and Kyathsandra",
    hubAnchor: "Container offices and site offices in Tumkur",
    nearbyLabel: "Tumkur district",
    neighbours: ["container-office-in-doddaballapura"],
    bangaloreRegion: true,
  },
  {
    slug: "container-office-in-belagavi",
    state: "Karnataka",
    name: "Belagavi",
    placeName: "Belagavi",
    area: "Belagavi city, Udyambag, Machhe, Gokak and Khanapur",
    hubAnchor: "Udyambag and Belagavi container offices",
    nearbyLabel: "Belagavi",
    neighbours: [], // North Karnataka: no merged cluster page within reach
  },
  {
    slug: "container-office-in-mysore",
    state: "Karnataka",
    name: "Mysore",
    placeName: "Mysore",
    area: "Mysore city, Hootagalli and Hebbal",
    hubAnchor: "Container offices in Mysore (Mysuru)",
    nearbyLabel: "Mysore",
    neighbours: [], // nearest cluster page is ~120 km away
  },

  // ── Tamil Nadu ── the Hosur–Krishnagiri belt first (it borders South Bengaluru), then the west
  //    (Salem, Coimbatore), the Chennai belt and the far south.
  {
    slug: "container-office-in-sipcot-hosur",
    state: "Tamil Nadu",
    name: "SIPCOT Hosur",
    placeName: "SIPCOT Hosur",
    area: "SIPCOT Phase 1 and 2, Hosur Industrial Estate, Zuzuvadi and Bagalur Road",
    hubAnchor: "SIPCOT Hosur container offices",
    nearbyLabel: "SIPCOT Hosur",
    neighbours: ["container-office-near-tata-electronics-hosur", "container-office-in-sipcot-shoolagiri", "container-office-in-bommasandra"],
  },
  {
    slug: "container-office-near-tata-electronics-hosur",
    state: "Tamil Nadu",
    name: "Near Tata Electronics, Hosur",
    placeName: "the Tata Electronics belt in Hosur",
    area: "Vendor and supplier offices in the industrial belt around the plant",
    hubAnchor: "Vendor offices near the Tata Electronics plant, Hosur",
    nearbyLabel: "The Tata Electronics belt, Hosur",
    neighbours: ["container-office-in-sipcot-hosur", "container-office-in-sipcot-shoolagiri", "container-office-in-sipcot-krishnagiri"],
  },
  {
    slug: "container-office-in-sipcot-shoolagiri",
    state: "Tamil Nadu",
    name: "SIPCOT Shoolagiri",
    placeName: "SIPCOT Shoolagiri",
    area: "SIPCOT Shoolagiri and the industrial plots along NH-44",
    hubAnchor: "Container offices for SIPCOT Shoolagiri on NH-44",
    nearbyLabel: "SIPCOT Shoolagiri",
    neighbours: ["container-office-in-sipcot-hosur", "container-office-in-sipcot-krishnagiri", "container-office-near-tata-electronics-hosur"],
  },
  {
    slug: "container-office-in-sipcot-krishnagiri",
    state: "Tamil Nadu",
    name: "SIPCOT Krishnagiri",
    placeName: "SIPCOT Krishnagiri",
    area: "SIPCOT Krishnagiri, SIPCOT Kurubarapalli and the Krishnagiri district parks",
    hubAnchor: "SIPCOT Krishnagiri container offices",
    nearbyLabel: "SIPCOT Krishnagiri",
    neighbours: ["container-office-in-sipcot-shoolagiri", "container-office-in-sipcot-hosur"],
  },
  {
    slug: "container-office-in-mettur-salem",
    state: "Tamil Nadu",
    name: "Mettur, Salem",
    placeName: "Mettur and Salem",
    area: "Mettur Dam, Mecheri, Omalur and Salem city",
    hubAnchor: "Mettur and Salem container offices",
    nearbyLabel: "Mettur and Salem",
    neighbours: ["container-office-in-sipcot-coimbatore", "container-office-in-sipcot-krishnagiri"], // ~125 km / ~95 km
  },
  {
    slug: "container-office-in-sipcot-coimbatore",
    state: "Tamil Nadu",
    name: "SIPCOT Coimbatore",
    placeName: "SIPCOT Coimbatore",
    area: "SIPCOT Coimbatore, Sulur, Pollachi and the Kongu belt",
    hubAnchor: "Container offices for SIPCOT Coimbatore and the Kongu belt",
    nearbyLabel: "SIPCOT Coimbatore",
    neighbours: ["container-office-in-mettur-salem"], // ~125 km, the nearest cluster page
  },
  {
    slug: "container-office-in-chennai",
    state: "Tamil Nadu",
    name: "Chennai",
    placeName: "Chennai",
    area: "Sriperumbudur, Oragadam and project sites across Chennai",
    hubAnchor: "Container offices across Chennai",
    nearbyLabel: "Chennai",
    neighbours: ["container-office-in-athipattu", "container-office-in-kalpakkam"],
  },
  {
    slug: "container-office-in-athipattu",
    state: "Tamil Nadu",
    name: "Athipattu, Tiruvallur",
    placeName: "Athipattu",
    area: "Athipattu, Vallur, Minjur and North Ennore",
    hubAnchor: "Athipattu and North Ennore container offices",
    nearbyLabel: "Athipattu and North Ennore",
    neighbours: ["container-office-in-chennai", "container-office-in-kalpakkam"],
  },
  {
    slug: "container-office-in-kalpakkam",
    state: "Tamil Nadu",
    name: "Kalpakkam, Chengalpattu",
    placeName: "Kalpakkam",
    area: "Kalpakkam, Sadras, Mamallapuram and the East Coast Road",
    hubAnchor: "Container offices for Kalpakkam and the ECR",
    nearbyLabel: "Kalpakkam and the ECR",
    neighbours: ["container-office-in-chennai", "container-office-in-athipattu"],
  },
  {
    slug: "portable-container-office-in-thoothukudi",
    state: "Tamil Nadu",
    name: "Thoothukudi",
    placeName: "Thoothukudi",
    area: "Harbour Estate, SIPCOT Meelavittan and Thoothukudi city",
    hubAnchor: "Portable container offices in Thoothukudi",
    nearbyLabel: "Thoothukudi",
    neighbours: ["container-office-in-tirunelveli"],
  },
  {
    slug: "container-office-in-tirunelveli",
    state: "Tamil Nadu",
    name: "Tirunelveli",
    placeName: "Tirunelveli",
    area: "Tirunelveli, Gangaikondan and the Aralvaimozhi wind corridor",
    hubAnchor: "Tirunelveli container offices for wind and solar project sites",
    nearbyLabel: "Tirunelveli",
    neighbours: ["portable-container-office-in-thoothukudi"],
  },
];

export const CLUSTER_STATES: ClusterState[] = ["Karnataka", "Tamil Nadu"];

const BY_SLUG = new Map(CONTAINER_OFFICE_LOCATIONS.map((l) => [l.slug, l]));

export function containerOfficeLocation(slug: string): ContainerOfficeLocation | undefined {
  return BY_SLUG.get(slug);
}

export function containerOfficeLocationsIn(state: ClusterState): ContainerOfficeLocation[] {
  return CONTAINER_OFFICE_LOCATIONS.filter((l) => l.state === state);
}

export function locationPath(slug: string): string {
  return `/cities-we-serve/${slug}`;
}

/** Promotion-hub links ({ name, href }) for the given location slugs, using each page's hubAnchor. */
export function hubLinksFor(slugs: string[]): { name: string; href: string }[] {
  return slugs.map((slug) => {
    const loc = BY_SLUG.get(slug);
    if (!loc) throw new Error(`containerOfficeCluster: unknown location slug "${slug}"`);
    return { name: loc.hubAnchor, href: locationPath(slug) };
  });
}

/**
 * Pillar-link wording for a location page's "nearby" block. Rotates through four phrasings so the
 * pages do not repeat one exact-match anchor.
 */
const PILLAR_ANCHORS = [
  "the full container office range, with sizes and specifications",
  "container office models and standard sizes",
  "every container office design we build",
  "container office layouts, sizes and specifications",
];

/* The eighteen original pages keep the phrasing their list position gave them when the rotation was
   introduced (Oct 2026). The rotation used to follow the live array index, so every page inserted
   mid-list silently re-worded the pillar link on every page after it. Pages added since take a
   phrasing derived from their own slug, which no later insertion can move. */
const PILLAR_ANCHOR_ORDER = [
  "container-office-in-jigani",
  "container-office-in-bommasandra",
  "container-office-in-sarjapur",
  "container-office-in-hoskote",
  "container-office-in-doddaballapura",
  "container-office-in-tumkur",
  "container-office-in-mysore",
  "container-office-in-sipcot-hosur",
  "container-office-near-tata-electronics-hosur",
  "container-office-in-sipcot-shoolagiri",
  "container-office-in-sipcot-krishnagiri",
  "container-office-in-mettur-salem",
  "container-office-in-sipcot-coimbatore",
  "container-office-in-chennai",
  "container-office-in-athipattu",
  "container-office-in-kalpakkam",
  "portable-container-office-in-thoothukudi",
  "container-office-in-tirunelveli",
];

export function pillarAnchorFor(slug: string): string {
  const pinned = PILLAR_ANCHOR_ORDER.indexOf(slug);
  const i = pinned >= 0 ? pinned : [...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return PILLAR_ANCHORS[i % PILLAR_ANCHORS.length];
}
