import ProductDetailPage from "@/views/ProductDetail";
import { products, getProductSlug } from "@/data/products";
import { getProductSEO } from "@/data/productSEO";
import { buildPageMetadata } from "@/lib/seo/metadata";
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
    title: seo?.title || product.name,
    description: seo?.description || product.shortDescription,
    keywords: seo?.keywords,
    path: `/products/${normalized}`,
    ogType: "website",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\.html$/i, "");
  const exists = products.some((p) => getProductSlug(p) === normalized);
  if (!exists) notFound();
  return <ProductDetailPage slug={normalized} />;
}
