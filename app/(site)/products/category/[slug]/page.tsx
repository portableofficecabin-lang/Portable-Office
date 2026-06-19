import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductsPage from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { categories as staticCategories } from "@/data/products";
import { getAllProductsMerged, getMergedCategories } from "@/lib/products/server";

export const revalidate = 1800; // 30 minutes

const SITE = "https://portableofficecabin.com";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateStaticParams() {
  return staticCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getMergedCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Category | Portable Office Cabin" };
  return buildPageMetadata({
    title: `${cat.name} — Models, Specs & Prices | Portable Office Cabin`,
    description:
      cat.description ||
      `Browse all ${cat.name} models, specifications and prices. Manufactured in-house and delivered installation-ready across India.`,
    path: `/products/category/${slug}`,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page } = await searchParams;

  const [products, categories] = await Promise.all([
    getAllProductsMerged(),
    getMergedCategories(),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Products", url: `${SITE}/products` },
          { name: category.name, url: `${SITE}/products/category/${slug}` },
        ])}
      />
      <ProductsPage
        products={products}
        categories={categories}
        activeCategory={slug}
        currentPage={page ? parseInt(page, 10) || 1 : 1}
        basePath={`/products/category/${slug}`}
      />
    </>
  );
}
