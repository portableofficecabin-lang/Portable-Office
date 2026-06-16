"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ReviewSubmitModal } from "./ReviewSubmitModal";

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string;
  created_at: string;
};

type Props = {
  productSlug: string;
  productName: string;
  onReviewsLoaded?: (reviews: ProductReview[]) => void;
};

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ProductReviews({ productSlug, productName, onReviewsLoaded }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, title, body, reviewer_name, created_at")
      .eq("product_slug", productSlug)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data || []) as ProductReview[];
    setReviews(list);
    onReviewsLoaded?.(list);
    setLoading(false);
  }, [productSlug, onReviewsLoaded]);

  useEffect(() => { load(); }, [load]);

  const average =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-16" aria-labelledby="reviews-heading">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="reviews-heading" className="font-display text-2xl font-bold text-foreground">
            Customer Reviews
          </h2>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-3 mt-2">
              <Stars value={average} size="h-5 w-5" />
              <span className="font-semibold text-foreground">{average.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">
                · {reviews.length} verified review{reviews.length === 1 ? "" : "s"}
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

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            No verified reviews yet for {productName}.
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
              <p className="text-xs text-muted-foreground mt-3">
                — {r.reviewer_name}
              </p>
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
