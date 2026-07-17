"use client";

import Link from "next/link";
import { ArrowRight, Eye, MessageSquare, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product, getProductDetailPath } from "@/data/products";
import { getBestProductImage } from "@/data/productImages";
import { getCommerce, hasGenuineSalePrice, isPurchasable } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  product: Product;
  onEnquire?: (product: Product) => void;
  /** Eager-load + fetchPriority high for the first above-the-fold card so it can
   *  be the LCP element on listing/category pages without a lazy-load round-trip. */
  priority?: boolean;
}

export function ProductCard({ product, onEnquire, priority = false }: ProductCardProps) {
  const { addToCart } = useCart();
  const productImage = getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku);

  // Same commerce catalog, same isPurchasable() gate as the product page and the JSON-LD, so
  // the card price is the identical GST-inclusive integer the product page shows. Quote-only
  // SKUs show no price and no cart CTA.
  const commerce = getCommerce(product.id);
  const purchasable = isPurchasable(product.id);
  const sellingPrice = commerce ? sellPrice(commerce.basePrice) : undefined;

  // Struck-through "was" price — only where the unit genuinely sold at it (no SKU today).
  // Same helper, same sellPrice(), so the card can never disagree with the product page.
  const compareAtPrice =
    commerce && hasGenuineSalePrice(commerce) && commerce.compareAtBasePrice !== undefined
      ? sellPrice(commerce.compareAtBasePrice)
      : undefined;

  return (
    <div className="group bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl overflow-hidden shadow-card hover:shadow-2xl transition-all duration-500 border border-border/50 hover:border-accent/30">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <div className="w-full h-full transition-transform duration-700 group-hover:scale-110">
          <OptimizedImage
            src={productImage}
            alt={`${product.name} – ${product.category} by Portable Office Cabin, India`}
            title={`${product.name} | ${product.category} – Portable Office Cabin`}
            aspectRatio="4/3"
            className="w-full h-full"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        </div>
        
        {/* Gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {product.featured && (
            <span className="bg-gradient-to-r from-accent to-amber-light text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              ⭐ Featured
            </span>
          )}
          {/* Every cabin is fabricated against the order — nothing ships off a shelf — so the badge
              states the real fulfilment model rather than implying warehouse stock. The `inStock`
              flag still gates it: it means "we are currently accepting orders for this", not
              "a finished unit is sitting in a yard". The ✓ tick is dropped with the wording: it
              specifically connoted on-hand availability. */}
          {product.inStock && (
            <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              Made to Order
            </span>
          )}
        </div>

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
          {purchasable && (
            <Button size="sm" variant="accent" className="shadow-lg" onClick={() => addToCart(product.id)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-accent to-amber-light rounded-full" />
            <span className="text-xs text-accent font-bold uppercase tracking-wider">
              {product.category}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
            SKU: {product.sku}
          </span>
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-5 line-clamp-2">
          {product.shortDescription}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {purchasable && sellingPrice !== undefined ? (
            <div>
              <div className="flex items-baseline gap-2">
                {compareAtPrice !== undefined && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatINR(compareAtPrice)}
                  </span>
                )}
                <div className="font-display font-bold text-xl bg-gradient-to-r from-accent to-amber-light bg-clip-text text-transparent">
                  {formatINR(sellingPrice)}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Incl. taxes</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm font-medium">Request a quote for pricing</span>
          )}
          <Link
            href={getProductDetailPath(product)}
            className="text-accent font-semibold text-sm flex items-center gap-1 hover:gap-3 transition-all bg-accent/10 px-4 py-2 rounded-full hover:bg-accent/20"
          >
            Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Purchasable → buying is the primary path (fixed price, payable in full).
            Quote-only → a written quotation is the only honest path. */}
        {purchasable ? (
          <Button
            variant="accent"
            className="w-full mt-5"
            onClick={() => addToCart(product.id)}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        ) : (
          onEnquire && (
            <Button
              variant="accent"
              className="w-full mt-5"
              onClick={() => onEnquire(product)}
              aria-label={`Request a quote for ${product.name}`}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Request a Quote
            </Button>
          )
        )}
      </div>
    </div>
  );
}
