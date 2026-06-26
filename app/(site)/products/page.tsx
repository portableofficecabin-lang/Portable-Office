import { ProductsListingWithParams } from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getAllProductsMerged, getMergedCategories } from "@/lib/products/server";

export const revalidate = 3600; // 1 hour

const SITE = "https://portableofficecabin.com";

// Static metadata (no searchParams) so this page renders as static/ISR rather
// than dynamic. The ?category= filter is a client-side convenience; the
// canonical SEO entry points for categories are the SSG /products/category/[slug]
// routes (each with its own canonical/title), so /products canonicalises to itself.
export const metadata = buildPageMetadata({
  title: "Portable Cabin & Container Product Range",
  description:
    "Browse our full range of portable cabins, container offices, prefab homes, security cabins, portable toilets and shipping containers with specs and prices.",
  path: "/products",
});

// No searchParams in the page → fully static/ISR (was ƒ Dynamic). The ?category=
// / ?page= filters are read client-side inside ProductsListingWithParams.
export default async function Page() {
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
      <ProductsListingWithParams products={products} categories={categories} />
    </>
  );
}
