"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Enquiry form is click-only — defer its chunk out of the product page's first-load JS, as the
// product listing does. (EnquiryModal returns null when closed, so gating the mount loses nothing.)
const EnquiryModal = dynamic(
  () => import("@/components/products/EnquiryModal").then((m) => ({ default: m.EnquiryModal })),
  { ssr: false },
);

/**
 * "Request a Quotation" for a named design option shown in a product page's content.
 *
 * Opens the site's existing quote form (EnquiryModal), which stores the enquiry in
 * public.enquiries with the option in product_name and subject, so the admin Enquiries, Leads
 * and CRM screens show which option was asked about. It shows no price: the option is quoted
 * separately, and the product's fixed price must not appear beside it.
 *
 * Deliberately an outline button: on a purchasable page the buy path stays the only primary CTA
 * (see BuyNowCTA). This button never adds anything to the cart.
 */
export function DesignOptionQuoteButton({
  productId,
  productName,
  designOption,
}: {
  productId: string;
  productName: string;
  designOption: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        // Wraps instead of forcing its narrow column wider at 320 px (the label + lg padding is
        // wider than the card there).
        className="h-auto min-h-12 w-full whitespace-normal px-4 py-3 text-center"
        aria-haspopup="dialog"
        aria-label={`Request a Quotation for the ${designOption}`}
        onClick={() => setIsOpen(true)}
      >
        <FileText className="mr-2 h-5 w-5" />
        Request a Quotation
      </Button>
      {isOpen && (
        <EnquiryModal
          product={{ id: productId, name: productName }}
          designOption={designOption}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
