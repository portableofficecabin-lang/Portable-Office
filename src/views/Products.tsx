"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useState, useMemo, useEffect } from "react";
import { BadgeCheck, Factory, Filter, Search, Grid, List, Truck, X, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageHero, PageHeroChip } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/products/ProductCard";
import dynamic from "next/dynamic";
import { Product, Category, getProductDetailPath } from "@/data/products";
import { getCommerce, isPurchasable, priceUnitSuffix } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { categoryServiceLinks as CATEGORY_SERVICE_LINKS } from "@/lib/site-navigation";
import { CATEGORY_H1, PortableCabinsCategoryContent } from "@/components/products/PortableCabinsCategoryContent";
import { PrefabBuildingCategoryContent } from "@/components/products/PrefabBuildingCategoryContent";
import { HomeConstructionCategoryContent } from "@/components/products/HomeConstructionCategoryContent";
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
  /**
   * Search term supplied by the URL (`/products?search=...`), which is what the
   * header search box submits to. Seeds — and re-seeds — the sidebar search field
   * below, so the header search drives this existing client-side filter instead of
   * needing a search backend the site does not have.
   */
  initialSearch?: string;
};

export function ProductsPageContent({
  products,
  categories,
  activeCategory,
  currentPage = 1,
  basePath = "/products",
  initialSearch = "",
}: ProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Re-sync when the URL-provided term changes — i.e. when a header search lands
  // here, including a second search made while already on this page. It cannot
  // clobber typing, because `initialSearch` only changes when the URL changes.
  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const activeCategoryObj = categories.find((c) => c.slug === activeCategory);

  /* Does this category actually sell anything at a fixed price? Read from isPurchasable() —
   * the SAME predicate that gates Add to Cart, the product JSON-LD offer and Merchant feed
   * eligibility — so the blurb below can never claim a price the catalogue does not have. */
  const categoryHasFixedPrices = activeCategoryObj
    ? products.some((p) => p.categorySlug === activeCategoryObj.slug && isPurchasable(p.id))
    : true;

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
    // Carry the active search across pagination. Without this, page 2 of a search
    // result dropped the term and dumped the user back into the full catalogue.
    if (searchQuery) params.set("search", searchQuery);
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
      {/* ▶ LCP ELEMENT (/products and /products/category/[slug], mobile):
          PageHero's <h1> is the LCP — the band is pure CSS with NO image, so the
          largest above-the-fold paint is this display-size heading text. It needs no
          image optimization; it paints as soon as the HTML + (display:swap) fallback
          font arrive, i.e. it is gated only by TTFB, not by any asset. The first
          product card image below is preloaded as a desktop LCP fallback
          (ProductCard `priority`). Keep PageHero image-free for this reason. */}
      <PageHero
        eyebrow={activeCategoryObj ? "Product Category" : "Our Range"}
        breadcrumbs={[
          { name: "Home", href: "/" },
          ...(activeCategoryObj
            ? [{ name: "Products", href: "/products" }, { name: activeCategoryObj.name }]
            : [{ name: "Products" }]),
        ]}
        /* Per-category SEO H1 override (one H1 per page — this REPLACES the category
           name, never adds a second heading). PageHero renders `title` as the page's
           <h1>, so the override keeps working exactly as it did in the old band. */
        title={
          activeCategoryObj
            ? (CATEGORY_H1[activeCategoryObj.slug] ?? activeCategoryObj.name)
            : "Our Products"
        }
        description={
          activeCategoryObj ? (
            activeCategoryObj.description
          ) : (
            <>
              Explore our complete range of{" "}
              <span className="font-semibold text-accent">premium portable structures</span>. Quality
              construction, customizable designs, delivered to your site.
            </>
          )
        }
      >
        <div className="flex flex-wrap gap-2.5">
          <PageHeroChip>
            <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            ISO 9001:2015 Certified
          </PageHeroChip>
          <PageHeroChip>
            <Factory className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            In-house manufacturing
          </PageHeroChip>
          <PageHeroChip>
            <Truck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            Delivery across India
          </PageHeroChip>
        </div>
      </PageHero>

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
                      /* Service pages that belong to THIS category, rendered directly beneath it.
                       * The list is built from the product catalogue, so it can only ever show
                       * categories — a service page that is not a product had no way into it, and
                       * Building Construction Contractor was reachable only from the body of the
                       * category page. Keyed off the parent slug rather than appended at the end,
                       * so a child always sits under its own parent even if categories reorder. */
                      const serviceLinks = CATEGORY_SERVICE_LINKS.filter(
                        (link) => link.parentSlug === category.slug,
                      );
                      return (
                        <Fragment key={category.id}>
                          <Link
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

                          {serviceLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="group/svc w-full flex items-center gap-2.5 py-2 pl-7 pr-3 rounded-xl text-[13px] text-foreground/70 transition-all duration-200 hover:bg-muted/60 hover:text-foreground"
                            >
                              <span className="w-1 h-1 rounded-full bg-border transition-all shrink-0 group-hover/svc:bg-accent" />
                              <span className="flex-1 text-left leading-snug">{link.name}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 opacity-0 -translate-x-2 transition-all group-hover/svc:opacity-60 group-hover/svc:translate-x-0" />
                            </Link>
                          ))}
                        </Fragment>
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
                    /* Price wording MUST match the cards below, which render sellPrice() figures
                     * labelled "incl. GST" — the previous "excluding GST" text contradicted them
                     * on the same screen (the exact mismatch class behind the Merchant suspension). */
                    ? categoryHasFixedPrices
                      ? `${activeCategoryObj.description}. Browse every ${activeCategoryObj.name.toLowerCase()} model below — each unit is engineered for Indian site conditions, delivered factory-finished, and backed by our standard warranty. Prices shown are fixed GST-inclusive prices in INR; transport and installation are quoted separately for your site.`
                      /* A QUOTE-ONLY CATEGORY GETS DIFFERENT WORDING, because the sentence above is
                         false for one. Home Construction is cast on the customer's own plot: nothing is
                         "delivered factory-finished", no warranty term has ever been supplied for it, and
                         its only product renders "Contact us for pricing" — so "Prices shown are fixed
                         GST-inclusive prices" contradicted the card directly beneath it on the same screen.
                         That is the landing-page price-mismatch class the Merchant rules exist to prevent,
                         so the claim is derived from the catalogue rather than asserted for every category. */
                      : `${activeCategoryObj.description}. Every project in this category is priced individually after a site visit and quoted against a written specification — there is no catalogue price, because there is no catalogue building.`
                    : "Explore our complete catalogue of portable cabins, container offices, prefab homes, security cabins, portable toilets and shipping containers. Every product is manufactured in-house at our Tamil Nadu factory near Hosur — just 40 km from Bangalore — and delivered installation-ready across India. Filter by category on the left or browse the paginated list — each card links to a full product page with specifications, dimensions and pricing."}
                </p>
              </div>

              <div className="flex items-center justify-between mb-6">
                {/* ONE template literal → ONE contiguous text node. The previous markup
                    interleaved JSX expressions and styled spans, so React emitted
                    `<!-- -->` separators between the fragments ("Showing<!-- --> <span>1
                    <!-- -->–5</span>…") and the rendered sentence could never be found
                    as contiguous bytes in the server HTML — the last element SSR audits
                    flagged on listing/category pages. Traded for it: the numbers lose
                    their font-medium emphasis. */}
                <div className="text-sm text-muted-foreground">
                  {`Showing ${pagedProducts.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0}–${(safePage - 1) * PAGE_SIZE + pagedProducts.length} of ${filteredProducts.length} products`}
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
                            candidate — load it eagerly at high priority. Cards 2–6
                            (the rest of the first visible rows) eager-load at LOW
                            priority: painted straight from the server HTML so SSR
                            audits don't count them as deferred/client-rendered,
                            while staying behind the LCP fetch in the scheduler.
                            Everything further down stays lazy. */}
                        <ProductCard
                          product={product}
                          onEnquire={handleEnquire}
                          priority={safePage === 1 && index === 0}
                          prefetch={safePage === 1 && index > 0 && index < 6}
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

              {/* ORDER MATTERS. The per-category content sits ABOVE the "Full Catalogue — All Products
                  A–Z" index below, never after it.

                  It used to come last. That was survivable on a category with ten products and actively
                  broken on one with a single product: the A–Z index lists EVERY product on the site, so on
                  /products/category/home-construction — one product — roughly forty unrelated rows sat
                  between the grid and the category's own writing, pushing that writing far below the fold
                  and making it look absent. The category's own copy is the point of a category page; the
                  A–Z list is a crawl aid that belongs under it. */}
              {/* Per-category SEO content — buying guide, live price table, FAQ (schema-matched). */}
              {activeCategory === "portable-cabins" && (
                <PortableCabinsCategoryContent products={products} />
              )}
              {activeCategory === "prefab-building" && (
                <PrefabBuildingCategoryContent products={products} />
              )}
              {/* Quote-only category — this block carries no price table and no FAQ; see the
                  file header for why. It exists so the category links its service pages. */}
              {activeCategory === "home-construction" && <HomeConstructionCategoryContent />}

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
                          {/* Same source as the product card, the detail page, the JSON-LD and the
                              feed: the commerce catalog via sellPrice(). This index used to render
                              the legacy static `p.price` field, which drifts from the catalog and
                              published a DIFFERENT figure than the card directly above it — the
                              exact landing-page price mismatch that got the Merchant Center account
                              suspended. Quote-only products show no figure at all. */}
                          <span className="text-accent font-semibold">
                            {(() => {
                              const c = getCommerce(p.id);
                              return isPurchasable(p.id) && c
                                ? `${formatINR(sellPrice(c.basePrice))} incl. GST${priceUnitSuffix(p.id)}`
                                : "Contact for price";
                            })()}
                          </span>
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
            <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">BROWSE BY CATEGORY</span>
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
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">TOP PRODUCTS</h3>
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
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">HOMES & ACCOMMODATION</h3>
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
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">POPULAR APPLICATIONS</h3>
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
              <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wide">RESOURCES</h3>
              <ul className="space-y-2">
                {[
                  { label: "Labour Shed Guide (Blog)", href: "/blog/labour-shed-prefabricated-structures" },
                  { label: "Our Completed Projects", href: "/gallery" },
                  { label: "About Us", href: "/about-us" },
                  { label: "Contact Us", href: "/contact" },
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
  const [search, setSearch] = useState("");

  /**
   * ALL THREE params (?search=, ?category=, ?page=) need REACTIVE reading.
   *
   * The pagination controls are plain <Link>s to /products?page=N. That navigation
   * changes only the query string; Next treats it as the same route segment, so this
   * component re-renders but never REMOUNTS — a mount-only effect reads ?page= once
   * and then never again, which left "Next →" updating the URL while the list stayed
   * frozen on page 1 (the exact bug this bridge now fixes; ?search= had already hit
   * the same trap and been moved to the bridge earlier). Reading window.location
   * during render does not work either: Next writes the new URL in the commit phase,
   * so the render triggered by the navigation still sees the old query.
   *
   * useSearchParams() is the only reactive source, and it must sit inside a Suspense
   * boundary or it opts the whole route out of static rendering. The bridge below
   * renders NOTHING, so the boundary wraps zero markup: /products stays fully
   * static/ISR (verified in the build output) and every crawlable product/category
   * link stays in the HTML.
   *
   * The URL is the single source of truth, applied atomically in one callback per
   * URL change — so there is exactly one state writer and no ordering races. The old
   * "reset to page 1 when the search term changes" special case is subsumed: a header
   * search navigates to /products?search=term with NO page param, which IS page 1,
   * while a deep-linked /products?search=cabin&page=3 keeps its page 3.
   */
  const handleParamsChange = useCallback(
    (params: { search: string; category?: string; page: number }) => {
      setSearch(params.search);
      setActiveCategory(params.category);
      setCurrentPage(params.page);
    },
    [],
  );

  return (
    <>
      <Suspense fallback={null}>
        <ListingParamsBridge onChange={handleParamsChange} />
      </Suspense>
      <ProductsPageContent
        products={products}
        categories={categories}
        activeCategory={activeCategory}
        currentPage={currentPage}
        basePath="/products"
        initialSearch={search}
      />
    </>
  );
}

/**
 * Reports the current `?search=` / `?category=` / `?page=` values to its parent and
 * renders nothing.
 *
 * Isolated in its own component purely so the Suspense boundary that
 * useSearchParams() requires contains no markup — see ProductsListingWithParams.
 * One effect fires per URL change with ALL params together, so the parent applies
 * them atomically (a page change can never race a search change).
 */
function ListingParamsBridge({
  onChange,
}: {
  onChange: (params: { search: string; category?: string; page: number }) => void;
}) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") || undefined;
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) || 1 : 1;

  useEffect(() => {
    onChange({ search, category, page });
  }, [search, category, page, onChange]);

  return null;
}

/**
 * Reports the current `?page=` value and renders nothing — the category-route
 * counterpart of ListingParamsBridge (category comes from the PATH there, and the
 * header search always leaves /products/category/* for /products, so only the page
 * number needs reactive reading).
 */
function PageParamBridge({ onChange }: { onChange: (page: number) => void }) {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) || 1 : 1;

  useEffect(() => {
    onChange(page);
  }, [page, onChange]);

  return null;
}

/**
 * Client bridge for the /products/category/[slug] route. activeCategory comes from
 * the path (a server prop), so the category's filtered content + crawlable A–Z index
 * are present in the static HTML and the route stays SSG/ISR (revalidate honoured).
 * Only ?page is read client-side after hydration — exactly like
 * ProductsListingWithParams — so deep-linked pagination still works WITHOUT awaiting
 * searchParams on the server (which would force the whole route into dynamic
 * rendering and run Supabase round-trips on every request → TTFB tax).
 */
export function CategoryListingWithParams({
  products,
  categories,
  activeCategory,
  basePath,
}: {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  basePath: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reactive, not mount-only: the pagination <Link>s change only the query string,
  // which re-renders WITHOUT remounting — a mount-only read left "Next →" dead on
  // the category routes exactly as it was on /products. Same null-rendering bridge
  // inside Suspense, so the route stays SSG/ISR with all content in the HTML.
  return (
    <>
      <Suspense fallback={null}>
        <PageParamBridge onChange={setCurrentPage} />
      </Suspense>
      <ProductsPageContent
        products={products}
        categories={categories}
        activeCategory={activeCategory}
        currentPage={currentPage}
        basePath={basePath}
      />
    </>
  );
}
