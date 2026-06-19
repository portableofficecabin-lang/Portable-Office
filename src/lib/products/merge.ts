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
  const merged = new Map<string, Product>();

  dbProducts.forEach((product) => {
    merged.set(getProductSlug(product), product);
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
