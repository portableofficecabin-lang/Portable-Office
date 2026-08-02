"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { isPurchasable } from "@/data/productCommerce";

/**
 * Direct-purchase CTA pair for the closing band of long-form product content.
 *
 * Replaces the old "Request a Quote" buttons on purchasable pages (owner decision:
 * a quote CTA beside a fixed-price buy path dilutes it and reads as price ambiguity
 * to Merchant Center). Renders NOTHING unless the id passes the same isPurchasable()
 * gate that controls the buy box, the JSON-LD offer and the feed — so a SKU flipped
 * to quote-only can never keep a stray Buy Now behind it, and fallback content
 * rendered without an offer (no productId) shows no buttons at all.
 *
 * "Buy Now" adds the item and goes straight to the cart, which owns quantity and
 * checkout. addToCart itself refuses non-purchasable ids as a second line of defense
 * and raises the "Added to cart" toast for the stay-on-page Add to Cart button.
 */
export function BuyNowCTA({
  productId,
  tone = "light",
}: {
  productId?: string;
  /** "dark" switches the secondary button to the on-dark outline treatment. */
  tone?: "light" | "dark";
}) {
  const { addToCart } = useCart();
  const router = useRouter();

  if (!productId || !isPurchasable(productId)) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="accent"
        size="lg"
        onClick={async () => {
          await addToCart(productId);
          router.push("/cart");
        }}
      >
        <Zap className="mr-2 h-5 w-5" />
        Buy Now
      </Button>
      <Button
        variant={tone === "dark" ? "outline-light" : "outline"}
        size="lg"
        onClick={() => addToCart(productId)}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        Add to Cart
      </Button>
    </div>
  );
}
