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
 *                                 grades), the sibling of that place's container-office page; also
 *                                 "shipping-container-<place>" (no "-in-"), the owner's URL for
 *                                 Shipping Containers in Shivamogga (2026-11-05); and
 *                                 "shipping-containers-<use>-<place>", the owner's URL for Shipping
 *                                 Containers for Hydel Power Project Sites in the Visakhapatnam
 *                                 Region (2026-11-07)
 *           local-service       → everything else (construction and workforce-housing service pages)
 *   state   from the page's own geo.region ("IN-KA" / "IN-TN" / "IN-AP"), the same field its geo meta
 *           tags use; any other region is grouped under "Other states".
 */
import { CITY_PAGES, type CityPage } from "@/data/cityPages";
import { containerOfficeLocation } from "@/data/containerOfficeCluster";

export type CityFamily = "container-office" | "shipping-container" | "local-service";
export type DirectoryState = "Karnataka" | "Tamil Nadu" | "Andhra Pradesh" | "Other states";

const STATE_BY_REGION: Readonly<Record<string, DirectoryState>> = {
  "IN-KA": "Karnataka",
  "IN-TN": "Tamil Nadu",
  // First page: the hydel project page near Visakhapatnam (2026-11-07). A state with no page is
  // omitted from the directory, so this adds no empty group.
  "IN-AP": "Andhra Pradesh",
};
/** Display order of the state groups. */
export const DIRECTORY_STATES: readonly DirectoryState[] = ["Karnataka", "Tamil Nadu", "Andhra Pradesh", "Other states"];

/** Section ids on /cities-we-serve — the targets of the "all locations" links. */
export const SHIPPING_CONTAINER_DIRECTORY_ID = "shipping-container-locations";
export const LOCAL_SERVICE_DIRECTORY_ID = "local-service-guides";
export const SHIPPING_CONTAINER_DIRECTORY_PATH = `/cities-we-serve#${SHIPPING_CONTAINER_DIRECTORY_ID}`;
/** The category that owns the national "shipping containers" intent (the pillar for the family). */
export const SHIPPING_CONTAINER_CATEGORY_PATH = "/products/category/cargo-storage-shipping-containers";

export function cityFamily(page: CityPage): CityFamily {
  if (containerOfficeLocation(page.slug)) return "container-office";
  // "shipping-container-" covers the first two slug shapes above and "shipping-containers-" the third;
  // no other city page starts with either.
  if (/^shipping-containers?-/.test(page.slug)) return "shipping-container";
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
 * A page's own `directoryLabel` (optional) overrides both; no earlier page sets it.
 */
export function cityDirectoryLabel(page: CityPage): string {
  if (page.directoryLabel) return page.directoryLabel;
  return cityFamily(page) === "shipping-container" ? `Shipping containers in ${page.city}` : (page.listTitle ?? page.metaTitle);
}

/**
 * The named states that have a shipping-container page, as prose ("Karnataka and Tamil Nadu"), for the
 * "all locations" link. "Other states" is left out because it is not a place name.
 */
export function shippingContainerStatesText(): string {
  const states = cityPagesByState("shipping-container")
    .map((g) => g.state)
    .filter((s) => s !== "Other states");
  return states.length > 1 ? `${states.slice(0, -1).join(", ")} and ${states[states.length - 1]}` : (states[0] ?? "");
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
