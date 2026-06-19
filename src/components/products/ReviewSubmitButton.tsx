"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewSubmitModal } from "./ReviewSubmitModal";

// Client island: the "Write a Review" button + submit modal. The review list itself
// is server-rendered (ProductReviewsServer). After a submit, refresh so the page
// re-fetches on next ISR pass (reviews require admin approval before they appear).
export function ReviewSubmitButton({
  productSlug,
  productName,
}: {
  productSlug: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="accent">
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Write a Review
      </Button>
      <ReviewSubmitModal
        productSlug={productSlug}
        productName={productName}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => router.refresh()}
      />
    </>
  );
}
