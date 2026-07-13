import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * ============================================================================
 * DEPRECATED — SUPERSEDED BY /api/merchant-feed. DO NOT ADD <item> BACK.
 * ============================================================================
 *
 * THE LIVE FEED IS NOW:  https://portableofficecabin.com/api/merchant-feed
 * (source: app/api/merchant-feed/route.ts)
 *
 * This function remains ONLY to serve a valid RSS 2.0 feed with ZERO items. It
 * must never serve products again. Point Merchant Center at /api/merchant-feed
 * and delete this feed's URL from the Merchant Center UI; until that happens,
 * an empty feed here is harmless and self-healing.
 *
 * WHY IT MUST STAY EMPTY:
 * Two feeds means TWO SOURCES OF TRUTH, and that is exactly how this account got
 * suspended for misrepresentation. The moment this function emits an item, it can
 * disagree with the website about price, availability, link or shipping — and any
 * one of those disagreements disapproves the offer.
 *
 * This feed previously carried a hardcoded 39-product array that had drifted away
 * from the real catalog: prices that did not match the product's own landing page,
 * links to pages that 404, a monthly rental fed as a one-off purchase, a duplicate
 * <g:id>, an unconditional "in_stock" on made-to-order goods, and a hardcoded
 * "0 INR" shipping price that asserted free nationwide delivery (free delivery is
 * only honoured within ~50 km).
 *
 * /api/merchant-feed fixes all of that structurally: it derives every item from
 * feedEligible() in src/data/productCommerce.ts (the same predicate that gates Add
 * to Cart and the JSON-LD offers), prices from sellPrice() in src/lib/pricing/gst.ts,
 * and one <g:shipping> per real zone from src/data/shippingZones.ts. It cannot
 * contradict the website, because it reads the website's own data.
 *
 * An EMPTY feed is the correct state here rather than deleting the function: on its
 * next scheduled fetch, Merchant Center sees zero items and cleanly withdraws every
 * product this feed ever submitted, instead of 404ing and leaving stale offers live.
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
    <title>Portable Office Cabin - Product Feed (DEPRECATED)</title>
    <link>${SITE_URL}</link>
    <description>DEPRECATED — this feed is empty and is no longer maintained. The live Portable Office Cabin product feed is ${SITE_URL}/api/merchant-feed. Please update the feed URL in Merchant Center.</description>
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
