"use client";

import { useState, useEffect } from "react";
import type { DBProduct, DBCategory } from "@/types/database";
import { products as staticProducts, categories as staticCategories, Product, Category, getProductSlug } from "@/data/products";

// Load the Supabase client lazily so its (~heavy) bundle is parsed only when the
// deferred fetch / realtime subscription actually runs (after the page is
// interactive) instead of during initial page load.
const getSupabase = () =>
  import("@/integrations/supabase/client").then((m) => m.supabase);

// Convert DB product to frontend Product type
const convertDBProduct = (dbProduct: DBProduct): Product => ({
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

// Convert DB category to frontend Category type
const convertDBCategory = (dbCategory: DBCategory, productCount: number): Category => ({
  id: dbCategory.id,
  name: dbCategory.name,
  slug: dbCategory.slug,
  description: dbCategory.description || "",
  icon: "building",
  productCount,
});

const mergeProducts = (dbProducts: Product[], fallbackProducts: Product[]) => {
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

const mergeCategories = (dbCategories: Category[], fallbackCategories: Category[], allProducts: Product[]) => {
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

export function useProducts(options?: { realtime?: boolean }) {
  // realtime defaults to true to preserve existing behaviour; callers on
  // statically-cached public pages can opt out to avoid opening Supabase
  // realtime WebSockets during hydration.
  const realtime = options?.realtime ?? true;
  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  useEffect(() => {
    // Defer the Supabase fetch to browser idle so the client + network request do
    // not run during hydration / the LCP window. Static products are already seeded
    // into state, so the UI renders immediately and refreshes from the DB at idle.
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (ric) idleId = ric(() => fetchData(), { timeout: 3000 });
    else timeoutId = window.setTimeout(() => fetchData(), 1000);

    const cleanupIdle = () => {
      if (idleId !== undefined) (window as any).cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    // Skip realtime subscriptions when not requested (e.g. the statically
    // revalidated homepage), so hydration does not open two WebSockets.
    if (!realtime) return cleanupIdle;

    // Set up realtime channels lazily (after the Supabase client loads). A cancelled
    // flag guards against the effect being torn down before the async import resolves.
    let cancelled = false;
    let teardown: (() => void) | undefined;

    getSupabase().then((supabase) => {
      if (cancelled) return;
      const productsChannel = supabase
        .channel("public-products-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const categoriesChannel = supabase
        .channel("public-categories-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          () => {
            fetchData();
          }
        )
        .subscribe();

      teardown = () => {
        supabase.removeChannel(productsChannel);
        supabase.removeChannel(categoriesChannel);
      };
    });

    return () => {
      cancelled = true;
      cleanupIdle();
      teardown?.();
    };
  }, [realtime]);

  const fetchData = async () => {
    try {
      const supabase = await getSupabase();
      const { data: dbProducts, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (productsError) {
        console.error("Error fetching products:", productsError);
        return;
      }

      const { data: dbCategories, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        return;
      }

      if (dbProducts && dbProducts.length > 0) {
        const convertedProducts = (dbProducts as DBProduct[]).map(convertDBProduct);
        const allProducts = mergeProducts(convertedProducts, staticProducts);
        setProducts(allProducts);
        setIsFromDatabase(true);

        if (dbCategories && dbCategories.length > 0) {
          const convertedCategories = (dbCategories as DBCategory[]).map((cat) =>
            convertDBCategory(cat, allProducts.filter((p) => p.categorySlug === cat.slug).length)
          );
          setCategories(mergeCategories(convertedCategories, staticCategories, allProducts));
        } else {
          setCategories(mergeCategories([], staticCategories, allProducts));
        }
      } else {
        setProducts(staticProducts);
        setCategories(staticCategories);
        setIsFromDatabase(false);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    products,
    categories,
    isLoading,
    isFromDatabase,
    refetch: fetchData,
  };
}

// Get products by category
export function useProductsByCategory(categorySlug: string | null) {
  const { products, categories, isLoading, isFromDatabase } = useProducts();

  const filteredProducts = categorySlug
    ? products.filter((p) => p.categorySlug === categorySlug)
    : products;

  return {
    products: filteredProducts,
    categories,
    isLoading,
    isFromDatabase,
  };
}

// Get featured products
export function useFeaturedProducts() {
  // Featured products on the homepage don't need live updates; skipping realtime
  // avoids opening Supabase WebSockets during the initial hydration pass.
  const { products, isLoading, isFromDatabase } = useProducts({ realtime: false });

  const featuredProducts = products.filter((p) => p.featured);

  return {
    products: featuredProducts,
    isLoading,
    isFromDatabase,
  };
}

// Get single product by ID or slug
export function useProduct(idOrSlug: string) {
  const { products, isLoading } = useProducts();

  const product = products.find((p) => p.id === idOrSlug || (p as any).slug === idOrSlug);

  return {
    product,
    isLoading,
  };
}
