/**
 * Page type and reporting group for any site path — shared by scripts/seo/site-inventory.ts and
 * scripts/seo/gsc-report.ts so the audit matrix and the Search Console report count pages the same
 * way. Derived from the app's own data (products.ts, cityPages.ts, containerOfficeCluster.ts), never
 * from a hand-kept URL list.
 */
import { products, getProductDetailPath } from "../../src/data/products";
import { containerOfficeLocation } from "../../src/data/containerOfficeCluster";

export type PageType =
  | "home" | "product" | "product-guide" | "size-variant" | "category" | "hub" | "city"
  | "directory" | "promotion" | "blog" | "static" | "policy";

export type PageGroup =
  | "Product categories" | "Individual products" | "Container-office city pages" | "Other city pages"
  | "Promotions" | "Guides & size pages" | "Hubs & directory" | "Blog" | "Home" | "Policies & other";

export const PAGE_GROUPS: readonly PageGroup[] = [
  "Product categories", "Individual products", "Container-office city pages", "Other city pages",
  "Promotions", "Guides & size pages", "Hubs & directory", "Blog", "Home", "Policies & other",
];

export const PRODUCT_PATHS: ReadonlySet<string> = new Set(products.map((p) => getProductDetailPath(p)));
const POLICY = new Set(["/terms-and-conditions", "/privacy-policy", "/refund-policy", "/payment-policy", "/custom-product-policy", "/shipping", "/warranty"]);
const HUBS = new Set(["/products", "/products/portable-cabin", "/products/metal-portable-cabin", "/products/portable-toilet-cabin", "/marketplace", "/promotions"]);

/** "https://www.portableofficecabin.com/x/?a=1#b" → "/x". */
export function normalisePath(urlOrPath: string): string {
  const path = urlOrPath.replace(/^https?:\/\/[^/]+/i, "").split("#")[0].split("?")[0];
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Page type from the path alone. A /products/<parent>/<child> path that is not a product child is
 * a "product-guide" here; site-inventory refines it to "size-variant" when the HTML carries a
 * ProductGroup.
 */
export function pageType(path: string): PageType {
  if (path === "/") return "home";
  if (HUBS.has(path)) return "hub";
  if (PRODUCT_PATHS.has(path)) return "product";
  if (path.startsWith("/products/category/")) return "category";
  if (path === "/cities-we-serve") return "directory";
  if (path.startsWith("/cities-we-serve/")) return "city";
  if (path.startsWith("/promotions/")) return "promotion";
  if (path.startsWith("/blog")) return "blog";
  if (POLICY.has(path)) return "policy";
  if (/^\/products\/[^/]+\/[^/]+$/.test(path)) return "product-guide";
  return "static";
}

/** Reporting group (the brief's page groups), from the path alone. */
export function pageGroup(path: string): PageGroup {
  const type = pageType(path);
  switch (type) {
    case "category": return "Product categories";
    case "product": return "Individual products";
    case "city": return containerOfficeLocation(path.replace("/cities-we-serve/", "")) ? "Container-office city pages" : "Other city pages";
    case "promotion": return "Promotions";
    case "product-guide": case "size-variant": return "Guides & size pages";
    case "hub": case "directory": return "Hubs & directory";
    case "blog": return "Blog";
    case "home": return "Home";
    default: return "Policies & other";
  }
}
