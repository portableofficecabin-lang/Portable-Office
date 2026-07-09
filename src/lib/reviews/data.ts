// Single source of truth for fetching a product's published reviews + rating aggregate.
// Framework-neutral: the caller supplies a Supabase client, so the SAME query runs
// server-side (ISR, static/anon client) and client-side (browser client) — keeping the
// server-rendered HTML, the JSON-LD and the live client refresh perfectly consistent.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ProductReview } from "@/components/products/ProductReviews";
import { summarize, REVIEW_DISPLAY_LIMIT, type RatingSummary } from "./summary";

export type ProductReviewData = {
  /** Newest approved reviews (up to REVIEW_DISPLAY_LIMIT) for cards + JSON-LD sample. */
  reviews: ProductReview[];
  /** Authoritative count + average over ALL approved reviews (not just the page above). */
  summary: RatingSummary;
};

// Only public, non-PII columns (reviewer_email / reviewer_phone are REVOKEd from anon).
const REVIEW_COLUMNS = "id, rating, title, body, reviewer_name, verified_purchase, created_at";

type Client = SupabaseClient<Database>;

/**
 * Fetch the display list AND the true aggregate in parallel.
 *
 * The aggregate query pulls `rating` only with `count: 'exact'`, so the total review
 * count is always accurate (Postgres counts every matching row, ignoring the row cap)
 * and the average is exact for any realistic review volume — decoupling both from the
 * 50-row display limit. Throws on error; callers decide the fallback.
 */
export async function fetchProductReviewData(
  client: Client,
  productSlug: string,
): Promise<ProductReviewData> {
  const listPromise = client
    .from("product_reviews")
    .select(REVIEW_COLUMNS)
    .eq("product_slug", productSlug)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(REVIEW_DISPLAY_LIMIT);

  const aggPromise = client
    .from("product_reviews")
    .select("rating", { count: "exact" })
    .eq("product_slug", productSlug)
    .eq("status", "approved")
    .limit(2000);

  const [listRes, aggRes] = await Promise.all([listPromise, aggPromise]);
  if (listRes.error) throw listRes.error;
  if (aggRes.error) throw aggRes.error;

  const reviews = (listRes.data ?? []) as ProductReview[];
  const ratings = ((aggRes.data ?? []) as { rating: number }[]).map((r) => r.rating);
  const summary = summarize(ratings, aggRes.count ?? undefined);

  return { reviews, summary };
}
