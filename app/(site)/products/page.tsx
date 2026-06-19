import type { Metadata } from "next";
import ProductsPage from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getAllProductsMerged, getMergedCategories } from "@/lib/products/server";

export const revalidate = 3600; // 1 hour

const SITE = "https://portableofficecabin.com";

type PageProps = {
  searchParams: Promise<{ category?: string; page?: string }>;
};

// Conditional canonical: when filtered via ?category=, point to the dedicated
// path-based category page so SEO is consolidated there.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category } = await searchParams;
  if (category) {
    const categories = await getMergedCategories();
    const cat = categories.find((c) => c.slug === category);
    return buildPageMetadata({
      title: cat ? `${cat.name} | Portable Office Cabin` : "Products",
      description:
        cat?.description ||
        "Browse our full range of portable cabins, container offices, prefab homes and more.",
      path: `/products/category/${category}`,
    });
  }
  return buildPageMetadata({
    title: "Portable Cabin & Container Product Range",
    description:
      "Browse our full range of portable cabins, container offices, prefab homes, security cabins, portable toilets and shipping containers with specs and prices.",
    path: "/products",
  });
}

export default async function Page({ searchParams }: PageProps) {
  const { category, page } = await searchParams;
  const [products, categories] = await Promise.all([
    getAllProductsMerged(),
    getMergedCategories(),
  ]);

  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Products", url: `${SITE}/products` },
        ])}
      />
      <ProductsPage
        products={products}
        categories={categories}
        activeCategory={category}
        currentPage={page ? parseInt(page, 10) || 1 : 1}
        basePath="/products"
      />
    </>
  );
}
