import { ProductDetailServer } from "@/views/ProductDetailServer";
import { products, getProductSlug, getProductDetailPath } from "@/data/products";
import { buildProductPageMetadata } from "@/lib/seo/productPageMeta";
import { getProductBySlugMerged, getProductReviewData, getAllProductsMerged } from "@/lib/products/server";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 1800; // 30 minutes

export async function generateStaticParams() {
  // Product CHILDREN (parentSlug set) canonically live at /products/<parent>/<child>
  // (the [slug]/[child] route prerenders them); their flat slug is not prerendered here —
  // a runtime hit on it 308-redirects to the nested canonical below.
  return products.filter((p) => !p.parentSlug).map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\.html$/i, "");
  const staticProduct = products.find((p) => getProductSlug(p) === normalized);
  if (!staticProduct) return {};
  // A product child never renders here — the flat URL redirects to the nested canonical.
  if (staticProduct.parentSlug) return {};

  // Same merged row the page body renders (DB edits can override the images). getAllProductsMerged
  // is React cache()-wrapped, so this shares the page's Supabase query rather than adding one.
  const product = (await getProductBySlugMerged(normalized)) ?? staticProduct;

  return buildProductPageMetadata(product, `/products/${normalized}`); // clean URL, no .html — matches <g:link> and offers.url
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\.html$/i, "");
  // Preserve current behavior: only static-catalog slugs render (DB edits override
  // a static product, but DB-only slugs are not exposed here).
  const staticProduct = products.find((p) => getProductSlug(p) === normalized);
  if (!staticProduct) notFound();

  // Product child: one canonical URL form — the nested one. 308 the flat slug there.
  if (staticProduct.parentSlug) permanentRedirect(getProductDetailPath(staticProduct));

  const [merged, reviewData, allProducts] = await Promise.all([
    getProductBySlugMerged(normalized),
    getProductReviewData(normalized),
    getAllProductsMerged(),
  ]);
  /* A MERCHANT LANDING URL MUST NEVER 404 OR RENDER EMPTY because of a data hiccup: this is
   * the slug of a real static-catalog product (checked above), so if the DB merge fails or
   * omits it for any transient reason we render the STATIC product — exactly the fallback
   * generateMetadata() has always used. An ISR regeneration that 404'd here would be frozen
   * into the edge cache on the clean canonical URL (the one Googlebot fetches) and reported
   * as "user cannot complete purchase". */
  const product = merged ?? staticProduct;

  return (
    <ProductDetailServer
      product={product}
      reviews={reviewData.reviews}
      reviewSummary={reviewData.summary}
      allProducts={allProducts}
      slug={normalized}
    />
  );
}
