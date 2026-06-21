// "Application" (use-case) text per product category, shown on every product
// detail page. Keyed by categorySlug. Falls back to a generic line for any
// category not listed so the field is never empty.

export const productApplications: Record<string, string> = {
  "portable-cabins":
    "Construction site offices, security cabins, on-site accommodation, ticket counters, retail kiosks & temporary offices",
  "site-office-containers":
    "Construction & infrastructure site offices, project management rooms, supervisor cabins & on-site meeting spaces",
  "container-offices":
    "Corporate workspaces, startup & co-working offices, project offices & branded retail outlets",
  "prefab-homes":
    "Farmhouses, resorts, weekend homes, staff quarters, guest houses & holiday cottages",
  "portable-toilet-cabins":
    "Construction sites, public events, exhibitions, parks, highways & industrial facilities",
  "security-cabins":
    "Factory & apartment gates, parking lots, toll plazas, industrial estates & residential complexes",
  "cargo-storage-shipping-containers":
    "Material & equipment storage, warehousing, logistics, site stores & secure on-site storage",
  "g1-workmen-accommodation":
    "Construction labour housing, industrial workforce accommodation, mining & infrastructure project camps",
  "labour-colony":
    "Large project worker housing, construction labour colonies, infrastructure & industrial site camps",
  "bunker-bed-container-cabin":
    "Worker dormitories, labour accommodation, site camps & temporary workforce housing",
  "peb-building":
    "Warehouses, factories, godowns, workshops & commercial buildings",
  "storage-shed":
    "Equipment storage, material godowns, inventory warehousing & industrial storage",
  "fabrication":
    "Structural steelwork, industrial fabrication, custom metal structures & site-specific builds",
  "upvc-windows-doors":
    "Cabins, prefab homes, offices & residential / commercial buildings",
  "modular-furniture":
    "Offices, site cabins, accommodation units & workspaces",
};

/** Application/use-case text for a category, with a safe generic fallback. */
export function getProductApplication(categorySlug: string): string {
  return (
    productApplications[categorySlug] ||
    "Site offices, accommodation, storage & modular building solutions across India"
  );
}
