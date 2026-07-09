"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, MessageSquarePlus, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchProductReviewData } from "@/lib/reviews/data";
import {
  filledStars,
  formatAverage,
  EMPTY_RATING_SUMMARY,
  type RatingSummary,
} from "@/lib/reviews/summary";
import { ReviewSubmitModal } from "./ReviewSubmitModal";

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string;
  verified_purchase?: boolean;
  created_at: string;
};

type Props = {
  productSlug: string;
  productName: string;
  /** Reviews rendered on the server (ISR) for SEO + instant paint; the list then
   *  refreshes live on mount so a just-approved review appears without a cache wait. */
  initialReviews?: ProductReview[];
  /** Authoritative count + average (over ALL approved reviews) rendered on the server. */
  initialSummary?: RatingSummary;
};

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  const filled = filledStars(value);
  return (
    <div className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ProductReviews({ productSlug, productName, initialReviews, initialSummary }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews ?? []);
  const [summary, setSummary] = useState<RatingSummary>(initialSummary ?? EMPTY_RATING_SUMMARY);
  const [open, setOpen] = useState(false);

  // Refresh approved reviews + the aggregate live from the browser so a newly-approved
  // review shows immediately, without waiting for the product page's ISR / CDN HTML cache
  // to revalidate (~30 min). The count/average come from the aggregate over ALL approved
  // reviews (not just the cards below), keeping this section in step with the top strip
  // and the JSON-LD. On error we keep the server-rendered values as-is.
  const load = useCallback(async () => {
    try {
      const data = await fetchProductReviewData(supabase, productSlug);
      setReviews(data.reviews);
      setSummary(data.summary);
    } catch {
      /* keep server-rendered reviews/summary */
    }
  }, [productSlug]);

  useEffect(() => { load(); }, [load]);

  const { count, average } = summary;

  return (
    <section className="mt-16" aria-labelledby="reviews-heading">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="reviews-heading" className="font-display text-2xl font-bold text-foreground">
            Customer Reviews
          </h2>
          {count > 0 ? (
            <div className="flex items-center gap-3 mt-2">
              <Stars value={average} size="h-5 w-5" />
              <span className="font-semibold text-foreground">{formatAverage(average)}</span>
              <span className="text-muted-foreground text-sm">
                · Based on {count} review{count === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mt-2">
              No reviews yet — be the first to share your experience.
            </p>
          )}
        </div>
        <Button onClick={() => setOpen(true)} variant="accent">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Write a Review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            No reviews yet for {productName}.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <article key={r.id} className="bg-card rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <Stars value={r.rating} />
                <time className="text-xs text-muted-foreground" dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleDateString("en-IN", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </time>
              </div>
              {r.title && (
                <h3 className="font-semibold text-foreground mb-1">{r.title}</h3>
              )}
              {r.body && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{r.body}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <p className="text-xs text-muted-foreground">— {r.reviewer_name}</p>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified Purchase
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ReviewSubmitModal
        productSlug={productSlug}
        productName={productName}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={load}
      />
    </section>
  );
}
