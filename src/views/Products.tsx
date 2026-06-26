"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Filter, Search, Grid, List, X, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/products/ProductCard";
import dynamic from "next/dynamic";
import { Product, Category, getProductDetailPath } from "@/data/products";
import { cn } from "@/lib/utils";

// Enquiry form is click-only — defer its chunk out of the listing first-load JS.
// (EnquiryModal already returns null when closed, so gating the mount loses no animation.)
const EnquiryModal = dynamic(
  () => import("@/components/products/EnquiryModal").then((m) => ({ default: m.EnquiryModal })),
  { ssr: false },
);

const PAGE_SIZE = 12;

type ProductsPageProps = {
  products: Product[];
  categories: Category[];
  activeCategory?: string;
  currentPage?: number;
  /** Base path for pagination/links: "/products" or "/products/category/<slug>". */
  basePath?: string;
};

export function ProductsPageContent({
  products,
  categories,
  activeCategory,
  currentPage = 1,
  basePath = "/products",
}: ProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const activeCategoryObj = categories.find((c) => c.slug === activeCategory);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory) {
      filtered = filtered.filter((p) => p.categorySlug === activeCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      );
    }
    return filtered;
  }, [products, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const buildPageHref = (pageNum: number) => {
    const params = new URLSearchParams();
    if (basePath === "/products" && activeCategory) params.set("category", activeCategory);
    if (pageNum > 1) params.set("page", String(pageNum));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Category links are path-based (drive the dedicated SSR category routes).
  const categoryHref = (slug: string | null) =>
    slug ? `/products/category/${slug}` : "/products";

  const handleEnquire = (product: Product) => {
    setSelectedProduct(product);
    setIsEnquiryOpen(true);
  };

  return (
    <Layout>
      {/* Header */}
      <section className="relative bg-gradient-to-br from-primary via-navy-deep to-primary text-primary-foreground py-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-light/10 rounded-full blur-2xl" />
        <div className="container-custom relative">
          <div className="max-w-3xl">
            <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4">
              <Link href="/" className="hover:text-accent transition-colors">Home</Link>
              <span>/</span>
              <span className="text-accent font-medium">Products</span>
            </nav>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-10 bg-gradient-to-b from-accent to-amber-light rounded-full" />
              <h1 className="font-display text-4xl sm:text-5xl font-bold">
                {activeCategoryObj ? activeCategoryObj.name : "Our Products"}
              </h1>
            </div>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">
              Explore our complete range of <span className="text-accent font-semibold">premium portable structures</span>.
              Quality construction, customizable designs, delivered to your site.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-72 shrink-0">
              <div className="relative mb-5 group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-amber-light/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 rounded-xl border-border/60 bg-card/50 backdrop-blur focus-visible:ring-accent/50 focus-visible:border-accent/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl p-5 shadow-card border border-border/40">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/15 text-accent">
                      <Filter className="h-3.5 w-3.5" />
                    </span>
                    Browse Categories
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Link
                    href={categoryHref(null)}
                    className={cn(
                      "group/cat w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                      !activeCategory
                        ? "bg-gradient-to-r from-accent to-amber-light text-accent-foreground font-semibold shadow-md shadow-accent/20"
                        : "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full transition-all", !activeCategory ? "bg-accent-foreground scale-150" : "bg-border group-hover/cat:bg-accent")} />
                    <span className="flex-1 text-left">All Products</span>
                    <ArrowRight className={cn("h-3.5 w-3.5 transition-all", !activeCategory ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover/cat:opacity-60 group-hover/cat:translate-x-0")} />
                  </Link>

                  {categories
                    .filter((category) => products.some((p) => p.categorySlug === category.slug))
                    .map((category) => {
                      const isActive = activeCategory === category.slug;
                      return (
                        <Link
                          key={category.id}
                          href={categoryHref(category.slug)}
                          className={cn(
                            "group/cat w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-accent to-amber-light text-accent-foreground font-semibold shadow-md shadow-accent/20"
                              : "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full transition-all", isActive ? "bg-accent-foreground scale-150" : "bg-border group-hover/cat:bg-accent")} />
                          <span className="flex-1 text-left line-clamp-1">{category.name}</span>
                          <ArrowRight className={cn("h-3.5 w-3.5 transition-all shrink-0", isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover/cat:opacity-60 group-hover/cat:translate-x-0")} />
                        </Link>
                      );
                    })}
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              <div className="bg-card border border-border/50 rounded-2xl p-5 lg:p-6 mb-6">
                <h2 className="font-display font-bold text-xl text-foreground mb-2">
                  {activeCategoryObj ? activeCategoryObj.name : "Complete Product Catalogue"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeCategoryObj
                    ? `${activeCategoryObj.description}. Browse every ${activeCategoryObj.name.toLowerCase()} model below — each unit is engineered for Indian site conditions, delivered factory-finished, and backed by our standard warranty. Prices shown are base prices in INR (excluding GST, transport and installation).`
                    : "Explore our complete catalogue of portable cabins, container offices, prefab homes, security cabins, portable toilets and shipping containers. Every product is manufactured in-house at our Tamil Nadu and Karnataka factories, delivered installation-ready across India. Filter by category on the left or browse the paginated list — each card links to a full product page with specifications, dimensions and pricing."}
                </p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {pagedProducts.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{(safePage - 1) * PAGE_SIZE + pagedProducts.length}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{filteredProducts.length}</span> products
                  {activeCategory && (
                    <Link href="/products" className="ml-2 inline-flex items-center gap-1 text-accent hover:underline">
                      <X className="h-3 w-3" />
                      Clear filter
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg transition-colors", viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Grid className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg transition-colors", viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {pagedProducts.length > 0 ? (
                <>
                  <div className={cn("grid gap-6", viewMode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                    {pagedProducts.map((product, index) => (
                      <div key={product.id}>
                        {/* First card on the first page is the above-the-fold LCP
                            candidate — load it eagerly at high priority. */}
                        <ProductCard
                          product={product}
                          onEnquire={handleEnquire}
                          priority={safePage === 1 && index === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <nav aria-label="Products pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
                      {safePage > 1 && (
                        <Link href={buildPageHref(safePage - 1)} rel="prev" className="px-4 py-2 rounded-lg border border-border/60 text-sm font-medium hover:border-accent hover:text-accent transition-colors">← Previous</Link>
                      )}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Link
                          key={pageNum}
                          href={buildPageHref(pageNum)}
                          aria-current={pageNum === safePage ? "page" : undefined}
                          className={cn("min-w-[40px] px-3 py-2 rounded-lg border text-sm font-medium text-center transition-colors", pageNum === safePage ? "bg-accent text-accent-foreground border-accent" : "border-border/60 hover:border-accent hover:text-accent")}
                        >
                          {pageNum}
                        </Link>
                      ))}
                      {safePage < totalPages && (
                        <Link href={buildPageHref(safePage + 1)} rel="next" className="px-4 py-2 rounded-lg border border-border/60 text-sm font-medium hover:border-accent hover:text-accent transition-colors">Next →</Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>
                </div>
              )}

              {/* Full Catalogue Index — crawlable list of every product */}
              {products.length > 0 && (
                <section className="mt-16 pt-10 border-t border-border/50" aria-label="Full product catalogue index">
                  <h2 className="font-display font-bold text-xl text-foreground mb-2">Full Catalogue — All Products A–Z</h2>
                  <p className="text-sm text-muted-foreground mb-6">Quick-reference index of every product we manufacture, with prices and direct links to each product page.</p>
                  <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                    {[...products].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                      <li key={`idx-${p.id}`} className="text-sm border-b border-border/30 pb-2">
                        <Link href={getProductDetailPath(p)} className="font-medium text-foreground hover:text-accent transition-colors">{p.name}</Link>
                        {p.shortDescription && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.shortDescription}</p>}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-accent font-semibold">{p.price ? `₹${p.price.toLocaleString("en-IN")}` : "Contact for price"}</span>
                          <span className="mx-1.5">·</span>
                          <span>{p.category}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking — Topical Authority SEO Section */}
      <section className="section-padding bg-muted/40 border-t border-border/40">
        <div className="container-custom">
          <div className="text-center mb-10">
            <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">Browse By Category</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Find the Right Portable Structure</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
              Whether you need a{" "}
              <Link href="/products/category/portable-cabins" className="text-accent hover:underline font-medium">portable cabin for your site</Link>,{" "}
              a <Link href="/products/category/container-offices" className="text-accent hover:underline font-medium">container office</Link>,{" "}
              a <Link href="/products/category/prefab-homes" className="text-accent hover:underline font-medium">prefab home</Link>, or{" "}
              <Link href="/products/category/security-cabins" className="text-accent hover:underline font-medium">security cabins</Link> —
              explore our full catalogue below.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products/category/${cat.slug}`}
                className={cn(
                  "group flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                  activeCategory === cat.slug ? "bg-accent/10 border-accent/50 text-accent" : "bg-card border-border/50 hover:border-accent/40 hover:bg-accent/5 text-foreground",
                )}
              >
                <div>
                  <span className="font-semibold text-sm block">{cat.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{cat.description}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-accent opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-4 gap-6 pt-8 border-t border-border/50">
            <div>
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">Top Products</h3>
              <ul className="space-y-2">
                {[
                  { label: "Porta Cabin", href: "/products/porta-cabin" },
                  { label: "Executive Portable Cabin", href: "/products/executive-portable-cabin-20ft" },
                  { label: "MS Portable Cabin", href: "/products/ms-portable-cabin" },
                  { label: "Prefabricated Portable Cabin", href: "/products/prefabricated-portable-cabin" },
                  { label: "Container Office", href: "/products/container-office" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-border group-hover:bg-accent shrink-0 transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">Homes & Accommodation</h3>
              <ul className="space-y-2">
                {[
                  { label: "Family Prefab Home 2BHK", href: "/products/family-prefab-home-2bhk" },
                  { label: "Luxury Prefab Villa G+1", href: "/products/luxury-prefab-villa-g-1-floors" },
                  { label: "G+1 Workmen Accommodation", href: "/products/category/g1-workmen-accommodation" },
                  { label: "Labour Colony Setup", href: "/products/category/labour-colony" },
                  { label: "Portable Cabin Bunkhouse", href: "/products/portable-cabin-40ft-bunkhouse" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-border group-hover:bg-accent shrink-0 transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">Popular Applications</h3>
              <ul className="space-y-2">
                {[
                  { label: "Construction Site Office", href: "/products/category/site-office-containers" },
                  { label: "Security Guard Cabin", href: "/products/category/security-cabins" },
                  { label: "Portable Toilet for Events", href: "/products/category/portable-toilet-cabins" },
                  { label: "Cargo Storage Container", href: "/products/category/cargo-storage-shipping-containers" },
                  { label: "Portable Cabin Rental", href: "/rental-service" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-border group-hover:bg-accent shrink-0 transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">Resources</h3>
              <ul className="space-y-2">
                {[
                  { label: "Labour Shed Guide (Blog)", href: "/blog/labour-shed-prefabricated-structures" },
                  { label: "Our Completed Projects", href: "/gallery" },
                  { label: "Book a Consultation", href: "/book-appointment" },
                  { label: "About Us", href: "/about-us" },
                  { label: "Contact for Free Quote", href: "/contact" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-border group-hover:bg-accent shrink-0 transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {isEnquiryOpen && (
        <EnquiryModal product={selectedProduct} isOpen={isEnquiryOpen} onClose={() => setIsEnquiryOpen(false)} />
      )}
    </Layout>
  );
}

export default function ProductsPage(props: ProductsPageProps) {
  return <ProductsPageContent {...props} />;
}

/**
 * Client bridge for the /products listing route. The server page renders this
 * with the DEFAULT (unfiltered, page 1) view, so the full catalogue — product
 * cards, category links and the crawlable "All Products A–Z" index — is present
 * in the static HTML for SEO. The ?category= / ?page= filters are then read from
 * the URL in a client effect (window.location.search — NOT useSearchParams, which
 * would force the content behind a Suspense fallback and strip it from the HTML)
 * and applied after hydration. The page stays fully static/ISR. The path-based
 * /products/category/[slug] route does NOT use this — it passes activeCategory as
 * a prop and stays SSG with server-filtered content.
 */
export function ProductsListingWithParams({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setActiveCategory(sp.get("category") || undefined);
    const pageParam = sp.get("page");
    setCurrentPage(pageParam ? parseInt(pageParam, 10) || 1 : 1);
  }, []);

  return (
    <ProductsPageContent
      products={products}
      categories={categories}
      activeCategory={activeCategory}
      currentPage={currentPage}
      basePath="/products"
    />
  );
}
