import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ProductsPage from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600; // 1 hour

export const metadata = buildPageMetadata({
  title: "Portable Cabin & Container Product Range",
  description:
    "Browse our full range of portable cabins, container offices, prefab homes, security cabins, portable toilets and shipping containers with specs and prices.",
  path: "/products",
});

type PageProps = {
  searchParams: Promise<{ category?: string; page?: string }>;
};

function ProductsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPage
        initialCategory={params.category}
        initialPage={params.page}
      />
    </Suspense>
  );
}
