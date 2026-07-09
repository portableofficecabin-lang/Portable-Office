// Shared, framework-neutral (server + client safe) rating-aggregate helpers.
//
// Google's product-review / rich-results policy requires that the star rating and
// review count shown to users MATCH the structured data, and that the aggregate
// reflects EVERY published review (not a truncated page of them). Centralising the
// maths here guarantees the top trust strip, the reviews section and the JSON-LD
// aggregateRating are always computed the same way from the same numbers.

export type RatingSummary = {
  /** Total number of approved (published) reviews for the product. */
  count: number;
  /** Average rating across all approved reviews, rounded to one decimal (0 when none). */
  average: number;
};

/** How many individual review cards we render / embed in JSON-LD. The aggregate
 *  count + average are computed over ALL approved reviews, independent of this. */
export const REVIEW_DISPLAY_LIMIT = 50;

export const EMPTY_RATING_SUMMARY: RatingSummary = { count: 0, average: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Build a RatingSummary from a list of individual ratings.
 * @param ratings   rating values (1-5) to average over — ideally EVERY approved review.
 * @param totalCount authoritative total when it may exceed the sampled `ratings`
 *                   (e.g. a Postgres `count: 'exact'`); defaults to `ratings.length`.
 */
export function summarize(ratings: number[], totalCount?: number): RatingSummary {
  const sampled = ratings.length;
  const count = totalCount ?? sampled;
  const average = sampled ? round1(ratings.reduce((s, r) => s + r, 0) / sampled) : 0;
  return { count, average };
}

/** Number of filled stars (0-5) for a given average — one rounding rule everywhere. */
export function filledStars(average: number): number {
  return Math.round(average);
}

/** The average formatted for display, e.g. 4 -> "4.0". */
export function formatAverage(average: number): string {
  return average.toFixed(1);
}
