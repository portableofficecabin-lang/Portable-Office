import type { DBProduct, DBCategory } from "@/types/database";
import { Product, Category, getProductSlug } from "@/data/products";

// Framework-agnostic conversion + merge helpers shared by the client hook
// (useProducts) and the server data layer (lib/products/server). DB rows override
// static catalog entries by slug; static entries fill the gaps.

// Convert DB product row to the frontend Product type.
export const convertDBProduct = (dbProduct: DBProduct): Product => ({
  id: dbProduct.id,
  sku: `POC-${dbProduct.slug.toUpperCase().slice(0, 8)}`,
  name: dbProduct.name,
  category: dbProduct.category,
  categorySlug: dbProduct.category_slug,
  description: dbProduct.description || "",
  shortDescription: dbProduct.short_description || "",
  specifications: Object.entries(dbProduct.specifications || {}).map(([label, value]) => ({
    label,
    value: String(value),
  })),
  features: dbProduct.features || [],
  images: dbProduct.image_url ? [dbProduct.image_url] : ["/placeholder.svg"],
  price: dbProduct.price || undefined,
  priceLabel: dbProduct.price ? "Starting from" : undefined,
  featured: dbProduct.is_featured,
  inStock: dbProduct.in_stock,
});

// Convert DB category row to the frontend Category type.
export const convertDBCategory = (dbCategory: DBCategory, productCount: number): Category => ({
  id: dbCategory.id,
  name: dbCategory.name,
  slug: dbCategory.slug,
  description: dbCategory.description || "",
  icon: "building",
  productCount,
});

export const mergeProducts = (dbProducts: Product[], fallbackProducts: Product[]) => {
  /* A DB row overrides its static twin's CONTENT — but never its IDENTITY. The static
   * catalog id (and sku) is the join key for everything that makes a product sellable:
   * getCommerce()/isPurchasable() (the fixed price, Add to Cart, the JSON-LD offers
   * block, merchant-feed eligibility), getProductSEO() and getBestProductImage(). A DB
   * row carries a uuid (and convertDBProduct synthesizes a sku), so letting it replace
   * the whole object severed those joins: every product with a DB row rendered as
   * quote-only — no price, no Add to Cart — which is exactly Google Merchant Center's
   * "user cannot complete purchase" rejection. Keep the static identity, take the DB
   * presentation. A DB-only product (no static twin) keeps its uuid and is simply not
   * sellable online until the owner adds it to the commerce catalog — correct, because
   * price truth lives there, never in the DB row. */
  const staticBySlug = new Map(fallbackProducts.map((p) => [getProductSlug(p), p]));
  const merged = new Map<string, Product>();

  dbProducts.forEach((product) => {
    const key = getProductSlug(product);
    const staticTwin = staticBySlug.get(key);
    merged.set(
      key,
      staticTwin
        ? {
            ...product,
            id: staticTwin.id,
            sku: staticTwin.sku,
            /* The DB schema stores a single image_url, so a converted DB row can only
             * ever carry a ONE-image gallery (or the placeholder). Letting it override
             * a multi-image static gallery collapsed every admin-edited product to one
             * photo (owner-reported defect, Aug 2026). The static catalog owns the
             * gallery — image order there is an owner decision (first image = LCP,
             * JSON-LD, OG and Merchant feed image). The DB image fills in only for a
             * static product that has no images of its own. */
            images: staticTwin.images?.length ? staticTwin.images : product.images,
          }
        : product,
    );
  });

  fallbackProducts.forEach((product) => {
    const key = getProductSlug(product);
    if (!merged.has(key)) {
      merged.set(key, product);
    }
  });

  return Array.from(merged.values());
};

export const mergeCategories = (
  dbCategories: Category[],
  fallbackCategories: Category[],
  allProducts: Product[],
) => {
  const merged = new Map<string, Category>();

  dbCategories.forEach((category) => {
    merged.set(category.slug, {
      ...category,
      productCount: allProducts.filter((product) => product.categorySlug === category.slug).length,
    });
  });

  fallbackCategories.forEach((category) => {
    if (!merged.has(category.slug)) {
      merged.set(category.slug, {
        ...category,
        productCount: allProducts.filter((product) => product.categorySlug === category.slug).length,
      });
    }
  });

  return Array.from(merged.values());
};
