import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * ============================================================================
 * GOOGLE MERCHANT CENTER FEED — INTENTIONALLY EMPTY. DO NOT ADD <item> BACK.
 * ============================================================================
 *
 * This function serves a valid RSS 2.0 feed with ZERO items, on purpose.
 *
 * WHY:
 * Portable Office Cabin is a QUOTE-ONLY business. There is no payment gateway
 * and no product on this site can be purchased online — the cart is a Quote
 * List and checkout is a Quote Request. Displayed prices are indicative
 * "starting from" prices, exclusive of GST, of transport beyond 50 km, and of
 * installation. Nothing here is a fixed, all-in, purchasable price.
 *
 * Submitting such products to Merchant Center as purchasable offers would be a
 * misrepresentation of the business: Google requires that the price fed matches
 * the price the buyer actually pays, that the item be buyable, and that any
 * shipping claim be true. This feed previously did the opposite — it carried a
 * hardcoded 39-product array that had drifted away from the real catalog:
 * prices that did not match the product's own landing page, links to pages that
 * 404, a monthly rental fed as a one-off purchase, a duplicate <g:id>, an
 * unconditional "in_stock" on made-to-order goods, and a hardcoded
 * "0 INR" shipping price that asserted free nationwide delivery (free delivery
 * is only honoured within 50 km).
 *
 * An EMPTY feed is the correct fix rather than deleting this function: on its
 * next scheduled fetch, Merchant Center sees zero items and cleanly withdraws
 * every product from the account. It is self-healing even if the feed is never
 * removed in the Merchant Center UI, and it cannot go stale again.
 *
 * IF ONLINE PURCHASE IS EVER INTRODUCED:
 * Do NOT resurrect a hardcoded array. Only feed products once there are fixed
 * all-in prices and a real payment gateway, and generate the items from the
 * SINGLE source of truth — getAllProductsMerged() in src/lib/products/server.ts
 * — so the feed can never contradict the website. Shipping and availability
 * must then reflect the real policy, not a constant.
 * ============================================================================
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://portableofficecabin.com";

function generateFeed(): string {
  // Valid RSS 2.0 envelope, deliberately with no <item> elements. See the note
  // at the top of this file before adding any product here.
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Portable Office Cabin - Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Portable Office Cabin is a quote-only business. Products are made to order and cannot be purchased online, so no purchasable offers are submitted to Merchant Center. Contact us for a quotation.</description>
  </channel>
</rss>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feed = generateFeed();
    return new Response(feed, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error generating merchant feed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
