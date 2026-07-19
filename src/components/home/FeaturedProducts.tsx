// SERVER COMPONENT — no "use client". This section has no interactive state (its buttons are
// links + a static enquiry CTA), so it is server-rendered: the featured product names, categories,
// GST-inclusive prices and detail links are all present in the initial HTML for SEO, and the
// section ships ZERO client JS.
//
// Data comes from getAllProductsMerged() — the SAME server-side, ISR-cached (page revalidate),
// cookie-less read the product listing/detail pages use. It merges any admin overrides from
// Supabase over the static catalog and falls back to the static catalog if Supabase is
// unreachable, so the homepage can never fail to render its featured products. Prices/availability
// still come from the commerce catalog (productCommerce.ts), so this card can never disagree with
// the product page, the cart, the JSON-LD or the Merchant feed.
import Link from "next/link";
import { ArrowRight, Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllProductsMerged } from "@/lib/products/server";
import { getBestProductImage } from "@/data/productImages";
import { getProductDetailPath } from "@/data/products";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { GST_PERCENT_LABEL, formatINR, sellPrice } from "@/lib/pricing/gst";

export async function FeaturedProducts() {
  const allProducts = await getAllProductsMerged();
  const displayProducts = allProducts.filter((p) => p.featured).slice(0, 6);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-muted/50">
      <div className="container-custom">
        {/* SEO Content Block */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8 mb-12">
          <h3 className="font-display font-bold text-xl text-foreground mb-3">Applications of Portable Workspaces</h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            The versatility of portable workspaces makes them an essential part of modern infrastructure for a wide range of industries. On construction sites, portable cabins serve as site offices, meeting rooms, and storage units, providing a comfortable and functional environment for project teams. Educational institutions use modular office containers and elegant prefab units as temporary classrooms, administrative blocks, or staff rooms, especially during periods of expansion or renovation. Security cabins and portable toilets are indispensable for maintaining safety and hygiene at both public events and busy work sites. Businesses in sales and service sectors benefit from the ability to quickly deploy and relocate office spaces as their needs evolve. In cities like Chennai and across India, these flexible solutions help clients meet their operational goals efficiently, supporting everything from infrastructure projects to day-to-day business operations. With tailored applications and modern design, portable workspaces are redefining what's possible for organizations seeking smart, scalable, and elegant space solutions.
          </p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-4">
          <div>
            <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
              Featured Products
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Popular Choices
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/products">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mb-12 max-w-3xl">
          Many portable office cabins feature powder-coated windows, which offer enhanced durability, weather protection, and improved aesthetics.
        </p>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayProducts.map((product, index) => (
            <div
              key={product.id}
              className="group bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl overflow-hidden shadow-card hover:shadow-2xl transition-all duration-500 animate-fade-up border border-border/50 hover:border-accent/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                <OptimizedImage 
                  src={getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku)} 
                  alt={product.name}
                  className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                  aspectRatio="4/3"
                  priority={index < 3}
                />
                
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                
                {/* Badge */}
                {product.featured && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-accent to-amber-light text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    ⭐ Featured
                  </div>
                )}

                {/* Product Name on Image */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-display font-bold text-lg text-white drop-shadow-lg line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/80 to-primary/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <Button size="sm" variant="secondary" className="shadow-lg" asChild>
                    <Link href={getProductDetailPath(product)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="accent" className="shadow-lg">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enquire Now
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-accent to-amber-light rounded-full" />
                  <span className="text-xs text-accent font-bold uppercase tracking-wider">
                    {product.category}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2 group-hover:text-accent transition-colors">
                  {product.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-5 line-clamp-2">
                  {product.shortDescription}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  {isPurchasable(product.id) ? (
                    <div>
                      <span className="text-xs text-muted-foreground">Price (incl. {GST_PERCENT_LABEL} GST)</span>
                      <div className="font-display font-bold text-xl bg-gradient-to-r from-accent to-amber-light bg-clip-text text-transparent">
                        {formatINR(sellPrice(getCommerce(product.id)!.basePrice))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-muted-foreground">Made to order</span>
                      <div className="font-display font-bold text-lg text-foreground">Request a quote</div>
                    </div>
                  )}
                  <Link 
                    href={getProductDetailPath(product)}
                    className="text-accent font-semibold text-sm flex items-center gap-1 hover:gap-3 transition-all bg-accent/10 px-4 py-2 rounded-full hover:bg-accent/20"
                  >
                    Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
