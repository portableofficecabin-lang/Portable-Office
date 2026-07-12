"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ShoppingCart, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingDeliveryModal } from "@/components/products/ShippingDeliveryModal";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/data/products";

// EnquiryModal is interaction-only and renders as a fixed overlay — defer its
// chunk and mount it only when opened (it already returns null when closed), so
// it leaves the /products/[slug] first-load JS without any layout shift.
// ShippingDeliveryModal is kept statically imported because it renders an inline
// trigger button that must be present in the SSR HTML (deferring it would pop the
// button in after hydration and shift the content below — a CLS risk).
const EnquiryModal = dynamic(
  () => import("@/components/products/EnquiryModal").then((m) => ({ default: m.EnquiryModal })),
  { ssr: false },
);

// Client island for the product CTAs (cart/enquiry are client-only). Kept minimal
// so the surrounding product content stays server-rendered.
export function ProductActions({ product }: { product: Product }) {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const { addToCart } = useCart();

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Quoting is the real conversion path — there is no online payment — so the
            enquiry CTA is the primary button and the quote list is secondary. */}
        <Button variant="accent" size="lg" className="flex-1" onClick={() => setIsEnquiryOpen(true)}>
          <MessageSquare className="mr-2 h-5 w-5" />
          Request a Quote
        </Button>
        <Button variant="outline" size="lg" onClick={() => addToCart(product.id)}>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Quote List
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

      {isEnquiryOpen && (
        <EnquiryModal
          product={product}
          isOpen={isEnquiryOpen}
          onClose={() => setIsEnquiryOpen(false)}
        />
      )}
    </>
  );
}
