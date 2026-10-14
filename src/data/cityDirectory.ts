/**
 * CITIES WE SERVE — how the location pages are grouped on /cities-we-serve and cross-linked.
 *
 * Everything here is DERIVED from CITY_PAGES (src/data/cityPages.ts) and the container-office
 * cluster (src/data/containerOfficeCluster.ts): adding a city page needs no edit in this file, and a
 * new page is never dropped from the directory — anything that matches no family below lands in the
 * "local-service" group rather than disappearing.
 *
 *   family  container-office    → listed by the cluster's own section (ContainerOfficeLocationCards)
 *           shipping-container  → slug "shipping-container-in-<place>": the box itself (sale / rental /
 *                                 grades), the sibling of that place's container-office page
 *           local-service       → everything else (construction and workforce-housing service pages)
 *   state   from the page's own geo.region ("IN-KA" / "IN-TN"), the same field its geo meta tags use.
 */
import { CITY_PAGES, type CityPage } from "@/data/cityPages";
import { containerOfficeLocation } from "@/data/containerOfficeCluster";

export type CityFamily = "container-office" | "shipping-container" | "local-service";
export type DirectoryState = "Karnataka" | "Tamil Nadu" | "Other states";

const STATE_BY_REGION: Readonly<Record<string, DirectoryState>> = {
  "IN-KA": "Karnataka",
  "IN-TN": "Tamil Nadu",
};
/** Display order of the state groups. */
export const DIRECTORY_STATES: readonly DirectoryState[] = ["Karnataka", "Tamil Nadu", "Other states"];

/** Section ids on /cities-we-serve — the targets of the "all locations" links. */
export const SHIPPING_CONTAINER_DIRECTORY_ID = "shipping-container-locations";
export const LOCAL_SERVICE_DIRECTORY_ID = "local-service-guides";
export const SHIPPING_CONTAINER_DIRECTORY_PATH = `/cities-we-serve#${SHIPPING_CONTAINER_DIRECTORY_ID}`;
/** The category that owns the national "shipping containers" intent (the pillar for the family). */
export const SHIPPING_CONTAINER_CATEGORY_PATH = "/products/category/cargo-storage-shipping-containers";

export function cityFamily(page: CityPage): CityFamily {
  if (containerOfficeLocation(page.slug)) return "container-office";
  if (page.slug.startsWith("shipping-container-in-")) return "shipping-container";
  return "local-service";
}

export function cityState(page: CityPage): DirectoryState {
  return STATE_BY_REGION[page.geo.region] ?? "Other states";
}

export const cityPagePath = (slug: string) => `/cities-we-serve/${slug}`;

/** Place line under a directory card: the page's geo placename without the trailing country. */
export const cityPlaceLine = (page: CityPage) => page.geo.placename.replace(/,\s*India$/, "");

/**
 * Link text for a directory card. Shipping pages get a plain descriptive anchor ("Shipping
 * containers in Mysore") instead of their meta title, several of which end in the brand name.
 * Service pages keep the label they have always had on the index (listTitle, else metaTitle).
 */
export function cityDirectoryLabel(page: CityPage): string {
  return cityFamily(page) === "shipping-container" ? `Shipping containers in ${page.city}` : (page.listTitle ?? page.metaTitle);
}

/** One family's pages, grouped by state in DIRECTORY_STATES order; empty states are omitted. */
export function cityPagesByState(family: CityFamily): { state: DirectoryState; pages: CityPage[] }[] {
  const pages = CITY_PAGES.filter((p) => cityFamily(p) === family);
  return DIRECTORY_STATES.map((state) => ({ state, pages: pages.filter((p) => cityState(p) === state) })).filter(
    (g) => g.pages.length > 0,
  );
}

/** Other shipping-container pages in the same state as `slug` (empty for any other family). */
export function shippingContainerSiblings(slug: string): CityPage[] {
  const page = CITY_PAGES.find((p) => p.slug === slug);
  if (!page || cityFamily(page) !== "shipping-container") return [];
  const state = cityState(page);
  return CITY_PAGES.filter((p) => p.slug !== slug && cityFamily(p) === "shipping-container" && cityState(p) === state);
}
