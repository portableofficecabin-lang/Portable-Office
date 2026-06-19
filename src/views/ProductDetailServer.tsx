import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/JsonLd";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductActions } from "@/components/products/ProductActions";
import { ProductReviewsServer } from "@/components/products/ProductReviewsServer";
import type { ProductReview } from "@/components/products/ProductReviews";
import {
  getProductBySlug,
  getProductDetailPath,
  getProductSlug,
  type Product,
} from "@/data/products";
import { getBestProductImage } from "@/data/productImages";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { generateProductStructuredData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getProductH1, getProductPrimaryKeyword, getProductSEO } from "@/data/productSEO";
import { PortableToiletContent } from "@/components/products/PortableToiletContent";
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
import { SiteOfficeContainerContent } from "@/components/products/SiteOfficeContainerContent";
import { PortableCabinContent } from "@/components/products/PortableCabinContent";

const SITE = "https://portableofficecabin.com";

interface Props {
  product: Product;
  reviews: ProductReview[];
  allProducts: Product[];
  slug: string; // normalized (no .html)
}

export function ProductDetailServer({ product, reviews, allProducts, slug }: Props) {
  const isStaticProduct = !!getProductBySlug(slug);

  const fallbackImage = getBestProductImage(
    product.id,
    product.categorySlug,
    product.images?.[0],
    product.sku,
  );
  const galleryImages = (() => {
    const extras = (product.images || [])
      .map((i) => resolveImageUrl(i))
      .filter((i) => i && !i.includes("placeholder"));
    const list = extras.length > 0 ? extras : [fallbackImage];
    return Array.from(new Set(list));
  })();
  const productImage = resolveImageUrl(galleryImages[0]);

  const relatedProducts = allProducts
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 3);

  const productSEO = getProductSEO(product.id, product.name);
  const productPrimaryKeyword = getProductPrimaryKeyword(product.id, product.name);
  const productH1 = getProductH1(product.id, product.name);
  const productSlug = getProductSlug(product);
  const productCanonicalUrl = `${SITE}${getProductDetailPath(product)}`;
  const categoryPath = `/products/category/${product.categorySlug}`;

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
    reviews,
  });
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: SITE },
    { name: "Products", url: `${SITE}/products` },
    { name: product.category, url: `${SITE}${categoryPath}` },
    { name: productH1, url: productCanonicalUrl },
  ]);

  const cs = product.categorySlug;

  return (
    <Layout>
      <JsonLd data={[structuredData, breadcrumb]} />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href={categoryPath} className="text-muted-foreground hover:text-accent">
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
            <ProductGallery
              galleryImages={galleryImages}
              productName={product.name}
              productImageAlt={`${product.name} by Portable Office Cabin for industrial and modular building use in India`}
              featured={product.featured}
              inStock={product.inStock}
            />

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

              {product.price && (
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <div className="text-sm text-muted-foreground mb-1">{product.priceLabel}</div>
                  <div className="font-display text-4xl font-bold text-foreground">
                    ₹{product.price.toLocaleString("en-IN")}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    * Price may vary based on customization and delivery location
                  </p>
                </div>
              )}

              <ProductActions product={product} />

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
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Specifications</h2>
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {(product.specifications || []).map((spec, index) => (
                    <tr key={spec.label} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                      <td className="px-6 py-4 font-medium text-foreground w-1/3">{spec.label}</td>
                      <td className="px-6 py-4 text-muted-foreground">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category-specific content (server-rendered) */}
          {isStaticProduct && cs === "portable-toilet-cabins" && <div className="mt-16"><PortableToiletContent /></div>}
          {cs === "portable-cabins" && slug === "porta-cabin" && <div className="mt-16"><PortaCabinContent /></div>}
          {cs === "portable-cabins" && slug === "ms-portable-cabin" && <div className="mt-16"><MSPortableCabinContent /></div>}
          {cs === "portable-cabins" && slug === "office-portable-cabin" && <div className="mt-16"><OfficePortableCabinContent /></div>}
          {cs === "portable-cabins" && slug === "prefabricated-portable-cabin" && <div className="mt-16"><PrefabricatedPortableCabinContent /></div>}
          {cs === "portable-cabins" && slug === "prefabricated-labour-hutments-staff-accommodation" && <div className="mt-16"><LabourHutmentsStaffAccommodationContent /></div>}
          {cs === "portable-cabins" && slug === "prefab-porta-cabin" && <div className="mt-16"><PrefabPortaCabinContent /></div>}
          {cs === "portable-cabins" && slug === "labor-hutments" && <div className="mt-16"><LaborHutmentsContent /></div>}
          {cs === "portable-cabins" && slug === "cabin-portable" && <div className="mt-16"><CabinPortableContent /></div>}
          {isStaticProduct && cs === "portable-cabins" && !["porta-cabin","ms-portable-cabin","office-portable-cabin","prefabricated-portable-cabin","prefabricated-labour-hutments-staff-accommodation","prefab-porta-cabin","labor-hutments","cabin-portable"].includes(slug) && <div className="mt-16"><PortableCabinContent /></div>}
          {cs === "site-office-containers" && slug === "construction-site-portable-office" && <div className="mt-16"><ConstructionSitePortableOfficeContent /></div>}
          {cs === "site-office-containers" && slug === "site-office-container-manufacturers" && <div className="mt-16"><SiteOfficeContainerManufacturersContent /></div>}
          {cs === "site-office-containers" && slug === "steel-portable-office-container" && <div className="mt-16"><SteelPortableOfficeContainerContent /></div>}
          {isStaticProduct && cs === "site-office-containers" && !["construction-site-portable-office","site-office-container-manufacturers","steel-portable-office-container"].includes(slug) && <div className="mt-16"><SiteOfficeContainerContent /></div>}
          {cs === "container-offices" && slug === "container-office" && <div className="mt-16"><ContainerOfficeGenericContent /></div>}
          {cs === "container-offices" && slug === "ms-container-office-cabin" && <div className="mt-16"><MSContainerOfficeCabinContent /></div>}
          {cs === "container-offices" && slug === "cabins-in-office" && <div className="mt-16"><CabinsInOfficeContent /></div>}
          {isStaticProduct && cs === "container-offices" && !["container-office","ms-container-office-cabin","cabins-in-office"].includes(slug) && <div className="mt-16"><ContainerOfficeContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-for-sale" && <div className="mt-16"><ShippingContainerForSaleContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "used-shipping-container-for-sale" && <div className="mt-16"><UsedShippingContainerForSaleContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "cargo-container-for-sale" && <div className="mt-16"><CargoContainerForSaleContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-rental" && <div className="mt-16"><ShippingContainerRentalContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-kormangala" && <div className="mt-16"><ShippingContainerKormangalaContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-krishnagiri" && <div className="mt-16"><ShippingContainerKrishnagiriContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-sipcot" && <div className="mt-16"><ShippingContainerSIPCOTContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-chennai" && <div className="mt-16"><ShippingContainerChennaiContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-narsapura-industrial" && <div className="mt-16"><ShippingContainerNarsapuraContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "shipping-container-in-peenya-industrial" && <div className="mt-16"><ShippingContainerPeenyaContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "cargo-storage-containers" && <div className="mt-16"><CargoStorageContainersContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "cargo-containers" && <div className="mt-16"><CargoContainersContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "cargo-storage-containers-pink" && <div className="mt-16"><CargoStorageContainersPinkContent /></div>}
          {cs === "cargo-storage-shipping-containers" && slug === "cargo-shipping-container" && <div className="mt-16"><CargoShippingContainerContent /></div>}
          {cs === "g1-workmen-accommodation" && slug === "workmen-accommodation" && <div className="mt-16"><WorkmenAccommodationContent /></div>}
          {cs === "g1-workmen-accommodation" && slug === "labour-colony" && <div className="mt-16"><LabourColonyContent /></div>}
          {cs === "security-cabins" && slug === "security-cabin" && <div className="mt-16"><SecurityCabinContent /></div>}

          {/* Fresh, in-depth, original sections for SEO pages */}
          <FreshInsightSection slug={slug || ""} />

          {/* Customer Reviews (server-rendered list + client submit) */}
          <ProductReviewsServer reviews={reviews} productSlug={slug} productName={productH1} />

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Related {productPrimaryKeyword} Options
                </h2>
                <Button variant="outline" asChild>
                  <Link href={categoryPath}>
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
    </Layout>
  );
}
