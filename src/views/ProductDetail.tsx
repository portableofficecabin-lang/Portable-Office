"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductReviews, type ProductReview } from "@/components/products/ProductReviews";
import { ArrowLeft, Check, MessageSquare, Phone, ChevronRight, ShoppingCart } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { EnquiryModal } from "@/components/products/EnquiryModal";
import { getProductBySlug, getProductDetailPath, getProductSlug, products } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { getBestProductImage } from "@/data/productImages";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SEOHead } from "@/components/SEOHead";
import { generateProductStructuredData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getProductH1, getProductPrimaryKeyword, getProductSEO } from "@/data/productSEO";
import { ShippingDeliveryModal } from "@/components/products/ShippingDeliveryModal";
import { PortableToiletContent } from "@/components/products/PortableToiletContent";
import { PortableCabinContent } from "@/components/products/PortableCabinContent";
import { SiteOfficeContainerContent } from "@/components/products/SiteOfficeContainerContent";
import { ConstructionSitePortableOfficeContent } from "@/components/products/ConstructionSitePortableOfficeContent";
import { SiteOfficeContainerManufacturersContent } from "@/components/products/SiteOfficeContainerManufacturersContent";
import { ContainerOfficeContent } from "@/components/products/ContainerOfficeContent";
import { MSContainerOfficeCabinContent } from "@/components/products/MSContainerOfficeCabinContent";
import { ContainerOfficeGenericContent } from "@/components/products/ContainerOfficeGenericContent";
import { FreshInsightSection } from "@/components/products/FreshInsightSection";
import { PortaCabinContent } from "@/components/products/PortaCabinContent";
import { MSPortableCabinContent } from "@/components/products/MSPortableCabinContent";
import { OfficePortableCabinContent } from "@/components/products/OfficePortableCabinContent";
import { PrefabricatedPortableCabinContent } from "@/components/products/PrefabricatedPortableCabinContent";
import { ShippingContainerForSaleContent } from "@/components/products/ShippingContainerForSaleContent";
import { UsedShippingContainerForSaleContent } from "@/components/products/UsedShippingContainerForSaleContent";
import { CargoContainerForSaleContent } from "@/components/products/CargoContainerForSaleContent";
import { ShippingContainerRentalContent } from "@/components/products/ShippingContainerRentalContent";
import { LabourHutmentsStaffAccommodationContent } from "@/components/products/LabourHutmentsStaffAccommodationContent";
import { PrefabPortaCabinContent } from "@/components/products/PrefabPortaCabinContent";
import { LaborHutmentsContent } from "@/components/products/LaborHutmentsContent";
import { CabinPortableContent } from "@/components/products/CabinPortableContent";
import { SecurityCabinContent } from "@/components/products/SecurityCabinContent";
import { CabinsInOfficeContent } from "@/components/products/CabinsInOfficeContent";
import { SteelPortableOfficeContainerContent } from "@/components/products/SteelPortableOfficeContainerContent";
import { ShippingContainerKormangalaContent } from "@/components/products/ShippingContainerKormangalaContent";
import { ShippingContainerKrishnagiriContent } from "@/components/products/ShippingContainerKrishnagiriContent";
import { ShippingContainerSIPCOTContent } from "@/components/products/ShippingContainerSIPCOTContent";
import { ShippingContainerChennaiContent } from "@/components/products/ShippingContainerChennaiContent";
import { ShippingContainerNarsapuraContent } from "@/components/products/ShippingContainerNarsapuraContent";
import { ShippingContainerPeenyaContent } from "@/components/products/ShippingContainerPeenyaContent";
import { CargoStorageContainersContent } from "@/components/products/CargoStorageContainersContent";
import { CargoContainersContent } from "@/components/products/CargoContainersContent";
import { CargoStorageContainersPinkContent } from "@/components/products/CargoStorageContainersPinkContent";
import { CargoShippingContainerContent } from "@/components/products/CargoShippingContainerContent";
import { WorkmenAccommodationContent } from "@/components/products/WorkmenAccommodationContent";
import { LabourColonyContent } from "@/components/products/LabourColonyContent";
import { useCart } from "@/contexts/CartContext";

import { resolveImageUrl } from "@/utils/resolveImageUrl";

export default function ProductDetailPage({ slug: slugProp }: { slug?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = slugProp ?? params?.slug ?? "";
  const staticProduct = getProductBySlug(slug || "");
  const { products: allProducts, isLoading: productsLoading } = useProducts();
  const normalizedSlug = (slug || "").replace(/\.html$/i, "");
  // DB-first: an admin edit saved to Supabase (merged into allProducts by
  // useProducts) must OVERRIDE the static catalog entry, otherwise saved changes
  // are silently discarded on render. Static remains the fallback for products
  // not (yet) present in the database.
  const dbProduct = allProducts.find((p) => getProductSlug(p) === normalizedSlug || p.id === normalizedSlug);
  const product = dbProduct ?? staticProduct;
  const isStaticProduct = !!staticProduct;
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [approvedReviews, setApprovedReviews] = useState<ProductReview[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const { addToCart } = useCart();

  const productSlugForReviews = slug || "";
  useEffect(() => {
    if (!productSlugForReviews || typeof window === "undefined") return;
    let cancelled = false;
    supabase
      .from("product_reviews")
      .select("id, rating, title, body, reviewer_name, created_at")
      .eq("product_slug", productSlugForReviews)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setApprovedReviews((data || []) as ProductReview[]);
      });
    return () => { cancelled = true; };
  }, [productSlugForReviews]);

  const fallbackImage = product
    ? getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku)
    : "";
  const galleryImages = product
    ? (() => {
        const extras = (product.images || [])
          .map((i) => resolveImageUrl(i))
          .filter((i) => i && !i.includes("placeholder"));
        const list = extras.length > 0 ? extras : [fallbackImage];
        return Array.from(new Set(list));
      })()
    : [];

  useEffect(() => {
    if (galleryImages[0]) {
      setActiveImage(resolveImageUrl(galleryImages[0]));
    }
  }, [product?.id, fallbackImage]);

  if (!product && productsLoading) {
    return (
      <Layout>
        <div className="section-padding">
          <div className="container-custom text-center text-muted-foreground">Loading product…</div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="section-padding">
          <div className="container-custom text-center">
            <h1 className="font-display text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Get related products
  const relatedProducts = products
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 3);

  const productImage = activeImage || resolveImageUrl(galleryImages[0]);
  const productImageAlt = `${product.name} by Portable Office Cabin for industrial and modular building use in India`;
  const productSEO = getProductSEO(product.id, product.name);
  const productPrimaryKeyword = getProductPrimaryKeyword(product.id, product.name);
  const productH1 = getProductH1(product.id, product.name);
  const productSlug = getProductSlug(product);
  const productCanonicalUrl = `https://portableofficecabin.com${getProductDetailPath(product)}`;
  
  // Generate structured data for SEO
  const structuredData = generateProductStructuredData({
    name: productH1,
    description: productSEO.description,
    price: product.price,
    image: productImage,
    sku: product.sku,
    inStock: product.inStock,
    slug: productSlug,
    keywords: productSEO.keywords,
    condition: productSlug === "used-shipping-container-for-sale" ? "used" : "new",
    reviews: approvedReviews,
  });

  return (
    <Layout>
      <SEOHead
        title={productSEO.title}
        description={productSEO.description}
        keywords={productSEO.keywords}
        canonicalUrl={productCanonicalUrl}
        ogImage={productImage.startsWith("http") ? productImage : `https://portableofficecabin.com${productImage.startsWith("/") ? productImage : `/${productImage}`}`}
        ogType="product"
        structuredData={[
          structuredData,
          generateBreadcrumbSchema([
            { name: "Home", url: "https://portableofficecabin.com" },
            { name: "Products", url: "https://portableofficecabin.com/products" },
            { name: product.category, url: `https://portableofficecabin.com/products?category=${product.categorySlug}` },
            { name: productH1, url: productCanonicalUrl },
          ]),
        ]}
      />
      {/* Breadcrumb */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href={`/products?category=${product.categorySlug}`} className="text-muted-foreground hover:text-accent">
              {product.category}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </nav>
        </div>
      </section>

      {/* Product Detail */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Image */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
                <OptimizedImage
                  key={productImage}
                  src={productImage}
                  alt={productImageAlt}
                  title={productImageAlt}
                  productName={product.name}
                  aspectRatio="4/3"
                  className="rounded-2xl"
                  priority
                />
              </div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {galleryImages.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      aria-label={`View image ${i + 1} of ${product.name}`}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                        activeImage === img ? "border-accent" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {product.featured && (
                  <span className="bg-accent text-accent-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
                    Featured
                  </span>
                )}
                {product.inStock && (
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
                    In Stock
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-accent font-medium text-sm uppercase tracking-wider">
                  {product.category}
                </div>
                <span className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-full">
                  SKU: {product.sku}
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {productH1}
              </h1>
              {/^\s*</.test(product.description || "") ? (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-muted-foreground mb-6 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-accent"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-lg text-muted-foreground mb-6 whitespace-pre-line">
                  {product.description}
                </p>
              )}


              {/* Price */}
              {product.price && (
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <div className="text-sm text-muted-foreground mb-1">{product.priceLabel}</div>
                  <div className="font-display text-4xl font-bold text-foreground">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    * Price may vary based on customization and delivery location
                  </p>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Button variant="accent" size="lg" className="flex-1" onClick={() => addToCart(product.id)}>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <Button variant="outline" size="lg" onClick={() => setIsEnquiryOpen(true)}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Request a Quote
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="tel:+919731897976">
                    <Phone className="mr-2 h-5 w-5" />
                    Call Us
                  </a>
                </Button>
              </div>
              <div className="mb-8">
                <ShippingDeliveryModal />
              </div>

              {/* Features */}
              <div className="border-t border-border pt-6">
                <h3 className="font-display font-semibold text-lg mb-4">Key Features</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {(product.features || []).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              Specifications
            </h2>
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {(product.specifications || []).map((spec, index) => (
                    <tr
                      key={spec.label}
                      className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}
                    >
                      <td className="px-6 py-4 font-medium text-foreground w-1/3">
                        {spec.label}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category-specific content */}
          {isStaticProduct && product.categorySlug === "portable-toilet-cabins" && (
            <div className="mt-16">
              <PortableToiletContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "porta-cabin" && (
            <div className="mt-16">
              <PortaCabinContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "ms-portable-cabin" && (
            <div className="mt-16">
              <MSPortableCabinContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "office-portable-cabin" && (
            <div className="mt-16">
              <OfficePortableCabinContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "prefabricated-portable-cabin" && (
            <div className="mt-16">
              <PrefabricatedPortableCabinContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "prefabricated-labour-hutments-staff-accommodation" && (
            <div className="mt-16">
              <LabourHutmentsStaffAccommodationContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "prefab-porta-cabin" && (
            <div className="mt-16">
              <PrefabPortaCabinContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "labor-hutments" && (
            <div className="mt-16">
              <LaborHutmentsContent />
            </div>
          )}
          {product.categorySlug === "portable-cabins" && slug === "cabin-portable" && (
            <div className="mt-16">
              <CabinPortableContent />
            </div>
          )}
          {isStaticProduct && product.categorySlug === "portable-cabins" && slug !== "porta-cabin" && slug !== "ms-portable-cabin" && slug !== "office-portable-cabin" && slug !== "prefabricated-portable-cabin" && slug !== "prefabricated-labour-hutments-staff-accommodation" && slug !== "prefab-porta-cabin" && slug !== "labor-hutments" && slug !== "cabin-portable" && (
            <div className="mt-16">
              <PortableCabinContent />
            </div>
          )}
          {product.categorySlug === "site-office-containers" && slug === "construction-site-portable-office" && (
            <div className="mt-16">
              <ConstructionSitePortableOfficeContent />
            </div>
          )}
          {product.categorySlug === "site-office-containers" && slug === "site-office-container-manufacturers" && (
            <div className="mt-16">
              <SiteOfficeContainerManufacturersContent />
            </div>
          )}
          {product.categorySlug === "site-office-containers" && slug === "steel-portable-office-container" && (
            <div className="mt-16">
              <SteelPortableOfficeContainerContent />
            </div>
          )}
          {isStaticProduct && product.categorySlug === "site-office-containers" && slug !== "construction-site-portable-office" && slug !== "site-office-container-manufacturers" && slug !== "steel-portable-office-container" && (
            <div className="mt-16">
              <SiteOfficeContainerContent />
            </div>
          )}
          {product.categorySlug === "container-offices" && slug === "container-office" && (
            <div className="mt-16">
              <ContainerOfficeGenericContent />
            </div>
          )}
          {product.categorySlug === "container-offices" && slug === "ms-container-office-cabin" && (
            <div className="mt-16">
              <MSContainerOfficeCabinContent />
            </div>
          )}
          {product.categorySlug === "container-offices" && slug === "cabins-in-office" && (
            <div className="mt-16">
              <CabinsInOfficeContent />
            </div>
          )}
          {isStaticProduct && product.categorySlug === "container-offices" && slug !== "container-office" && slug !== "ms-container-office-cabin" && slug !== "cabins-in-office" && (
            <div className="mt-16">
              <ContainerOfficeContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-for-sale" && (
            <div className="mt-16">
              <ShippingContainerForSaleContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "used-shipping-container-for-sale" && (
            <div className="mt-16">
              <UsedShippingContainerForSaleContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "cargo-container-for-sale" && (
            <div className="mt-16">
              <CargoContainerForSaleContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-rental" && (
            <div className="mt-16">
              <ShippingContainerRentalContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-kormangala" && (
            <div className="mt-16">
              <ShippingContainerKormangalaContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-krishnagiri" && (
            <div className="mt-16">
              <ShippingContainerKrishnagiriContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-sipcot" && (
            <div className="mt-16">
              <ShippingContainerSIPCOTContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-chennai" && (
            <div className="mt-16">
              <ShippingContainerChennaiContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-narsapura-industrial" && (
            <div className="mt-16">
              <ShippingContainerNarsapuraContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "shipping-container-in-peenya-industrial" && (
            <div className="mt-16">
              <ShippingContainerPeenyaContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "cargo-storage-containers" && (
            <div className="mt-16">
              <CargoStorageContainersContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "cargo-containers" && (
            <div className="mt-16">
              <CargoContainersContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "cargo-storage-containers-pink" && (
            <div className="mt-16">
              <CargoStorageContainersPinkContent />
            </div>
          )}

          {product.categorySlug === "cargo-storage-shipping-containers" && slug === "cargo-shipping-container" && (
            <div className="mt-16">
              <CargoShippingContainerContent />
            </div>
          )}

          {product.categorySlug === "g1-workmen-accommodation" && slug === "workmen-accommodation" && (
            <div className="mt-16">
              <WorkmenAccommodationContent />
            </div>
          )}

          {product.categorySlug === "g1-workmen-accommodation" && slug === "labour-colony" && (
            <div className="mt-16">
              <LabourColonyContent />
            </div>
          )}

          {product.categorySlug === "security-cabins" && slug === "security-cabin" && (
            <div className="mt-16">
              <SecurityCabinContent />
            </div>
          )}

          {/* Fresh, in-depth, 100% original sections for trending-down SEO pages */}
          <FreshInsightSection slug={slug || ""} />

          {/* Customer Reviews (Google-policy compliant: OTP-verified, admin-approved) */}
          <ProductReviews
            productSlug={productSlugForReviews}
            productName={productH1}
            onReviewsLoaded={setApprovedReviews}
          />

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Related {productPrimaryKeyword} Options
                </h2>
                <Button variant="outline" asChild>
                  <Link href={`/products?category=${product.categorySlug}`}>
                    View All
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((related) => (
                  <Link
                    key={related.id}
                    href={getProductDetailPath(related)}
                    className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all"
                  >
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
                        {related.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {related.shortDescription}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enquiry Modal */}
      <EnquiryModal
        product={product}
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />
    </Layout>
  );
}
