"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Phone, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingDeliveryModal } from "@/components/products/ShippingDeliveryModal";
import { useCart } from "@/contexts/CartContext";
import { isPurchasable } from "@/data/productCommerce";
import { COMPANY } from "@/lib/company";
import type { Product } from "@/data/products";

// ShippingDeliveryModal is kept statically imported because it renders an inline
// trigger button that must be present in the SSR HTML (deferring it would pop the
// button in after hydration and shift the content below — a CLS risk).

// Client island for the product CTAs (cart is client-only). Kept minimal so the
// surrounding product content stays server-rendered.
export function ProductActions({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const router = useRouter();

  // The SAME predicate that gates the fixed price on the page, the JSON-LD `offers` block and
  // Merchant feed inclusion. A product a customer cannot actually buy at the listed price must
  // never show Add to Cart — that is the mismatch that got the account suspended.
  const purchasable = isPurchasable(product.id);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {purchasable ? (
          /* Buying is a real path for this SKU: fixed price, in stock, payable in full.
             The buy path is the only primary CTA — no quote button beside it. Buy Now
             adds the item and goes straight to the cart (which owns quantity and
             checkout); Add to Cart stays on the page and raises the toast. */
          <>
            <Button
              variant="accent"
              size="lg"
              className="flex-1"
              onClick={async () => {
                await addToCart(product.id);
                router.push("/cart");
              }}
            >
              <Zap className="mr-2 h-5 w-5" />
              Buy Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => addToCart(product.id)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </>
        ) : (
          /* Quote-only SKU (made-to-order, rental, service/guide/location page, or a price the
             owner has not confirmed). No cart CTA — there is no price to charge. The owner-chosen
             path is direct contact: WhatsApp (primary) + the Call button below. */
          <Button variant="accent" size="lg" className="flex-1" asChild>
            <a
              href={`${COMPANY.whatsapp.url}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp Us
            </a>
          </Button>
        )}
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
    </>
  );
}
