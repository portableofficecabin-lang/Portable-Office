import type { MetadataRoute } from "next";

/**
 * ROBOTS POLICY — three rule groups with ONE deliberate difference between them.
 *
 * Per the robots.txt spec a crawler obeys ONLY the single most-specific user-agent group that
 * matches it — a specific group REPLACES `*` entirely, it does not inherit from it. So the
 * Storebot-Google and Googlebot groups below must RESTATE every disallow we still want; anything
 * omitted there would silently become allowed for those bots.
 *
 * WHY the Google groups exist (Merchant Center "User cannot complete purchase", Aug 2026):
 * blocking /cart and /checkout for `*` also blocked Storebot-Google, Google's product-checkout
 * verifier. A bot that cannot fetch the cart/checkout cannot confirm a purchase is completable,
 * and every offer in the account gets disapproved. The fix: Storebot-Google and Googlebot MAY
 * crawl /cart and /checkout; everyone else still may not. Indexing is separately prevented the
 * correct way — next.config.ts sends `X-Robots-Tag: noindex, nofollow` on those routes, which is
 * fully compatible with Storebot's check (the page must be CRAWLABLE, not indexable).
 *
 * Kept identical in every group:
 *  • `Allow: /api/merchant-feed` — Google's feed fetcher obeys robots.txt; the longest-match rule
 *    lets this one path through the broad /api/ block.
 *  • the `?page=`/`&page=` disallows — paginated listing URLs are client-side views of the same
 *    static page (server emits canonical=<base>), so crawling them only manufactures
 *    "non-canonical URL" noise. Every product/category has a clean URL in the sitemap.
 */

/** Disallows every crawler gets — the Google groups restate these, minus /cart + /checkout. */
const PRIVATE_DISALLOWS = [
  "/admin/",
  "/api/",
  "/auth/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/my-account",
  "/*?page=",
  "/*&page=",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Everyone else: public/SEO pages crawlable, private sections + cart/checkout blocked.
        userAgent: "*",
        allow: ["/", "/api/merchant-feed"],
        disallow: [...PRIVATE_DISALLOWS, "/cart", "/checkout"],
      },
      {
        // Google's checkout verifier — MUST be able to walk product → cart → checkout, or every
        // offer fails the "user cannot complete purchase" policy check.
        //
        // NOTE deliberately NO explicit "Allow: /products": /products is already fully allowed via
        // "Allow: /" (nothing disallows it), and an explicit 9-char "/products" allow would OUT-RANK
        // the 8-char "/*?page=" disallow under longest-match — silently re-opening the paginated
        // listing URLs (/products?page=N) this file exists to keep crawlers out of.
        userAgent: "Storebot-Google",
        allow: ["/", "/cart", "/checkout", "/api/merchant-feed"],
        disallow: PRIVATE_DISALLOWS,
      },
      {
        // Googlebot gets the same view as Storebot so the landing-page crawl and the checkout
        // verification can never disagree about what is reachable.
        userAgent: "Googlebot",
        allow: ["/", "/cart", "/checkout", "/api/merchant-feed"],
        disallow: PRIVATE_DISALLOWS,
      },
    ],
    sitemap: "https://portableofficecabin.com/sitemap.xml",
  };
}
