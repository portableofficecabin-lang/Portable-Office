import { ProductDetailServer } from "@/views/ProductDetailServer";
import { products, getProductSlug } from "@/data/products";
import { getProductSEO } from "@/data/productSEO";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getProductBySlugMerged, getApprovedReviews, getAllProductsMerged } from "@/lib/products/server";
import { notFound } from "next/navigation";

export const revalidate = 1800; // 30 minutes

export async function generateStaticParams() {
  return products.map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\.html$/i, "");
  const product = products.find((p) => getProductSlug(p) === normalized);
  if (!product) return {};
  const seo = getProductSEO(product.id, product.name);
  return buildPageMetadata({
    absoluteTitle: seo?.title || product.name,
    description: seo?.description || product.shortDescription,
    keywords: seo?.keywords,
    path: `/products/${normalized}`,
    ogType: "website",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\.html$/i, "");
  // Preserve current behavior: only static-catalog slugs render (DB edits override
  // a static product, but DB-only slugs are not exposed here).
  const exists = products.some((p) => getProductSlug(p) === normalized);
  if (!exists) notFound();

  const [product, reviews, allProducts] = await Promise.all([
    getProductBySlugMerged(normalized),
    getApprovedReviews(normalized),
    getAllProductsMerged(),
  ]);
  if (!product) notFound();

  return (
    <ProductDetailServer
      product={product}
      reviews={reviews}
      allProducts={allProducts}
      slug={normalized}
    />
  );
}
