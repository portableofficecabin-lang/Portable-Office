"use client";

import { useState } from "react";
import { ShoppingCart, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnquiryModal } from "@/components/products/EnquiryModal";
import { ShippingDeliveryModal } from "@/components/products/ShippingDeliveryModal";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/data/products";

// Client island for the product CTAs (cart/enquiry are client-only). Kept minimal
// so the surrounding product content stays server-rendered.
export function ProductActions({ product }: { product: Product }) {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const { addToCart } = useCart();

  return (
    <>
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

      <EnquiryModal
        product={product}
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />
    </>
  );
}
