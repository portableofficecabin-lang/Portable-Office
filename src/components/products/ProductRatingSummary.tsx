"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductReviewData } from "@/lib/reviews/data";
import { filledStars, formatAverage, type RatingSummary } from "@/lib/reviews/summary";

type Props = {
  productSlug: string;
  /** Aggregate rendered on the server (ISR) for SEO + instant paint. */
  initialSummary: RatingSummary;
};

/**
 * Top trust-strip rating chip. Server-rendered from `initialSummary` (so crawlers see
 * stars + count in the HTML, matching the JSON-LD aggregateRating), then refreshed live
 * from the browser so a newly-approved review updates the count/average here in lock-step
 * with the "Customer Reviews" section below — no waiting for the page's ISR cache.
 */
export function ProductRatingSummary({ productSlug, initialSummary }: Props) {
  const [summary, setSummary] = useState<RatingSummary>(initialSummary);

  useEffect(() => {
    let active = true;
    fetchProductReviewData(supabase, productSlug)
      .then(({ summary }) => { if (active) setSummary(summary); })
      .catch(() => { /* keep server-rendered aggregate on error */ });
    return () => { active = false; };
  }, [productSlug]);

  const { count, average } = summary;
  const filled = filledStars(average);

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex"
        aria-label={count ? `Rated ${average} out of 5 from ${count} reviews` : "No reviews yet"}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-4 w-4 ${n <= filled && count ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
          />
        ))}
      </span>
      {count > 0 ? (
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{formatAverage(average)}</span>{" "}
          ({count} review{count > 1 ? "s" : ""})
        </span>
      ) : (
        <span className="text-muted-foreground">Be the first to review</span>
      )}
    </div>
  );
}
