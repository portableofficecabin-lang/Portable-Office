/**
 * POST /api/razorpay/verify — confirm a payment and, ONLY then, mark the order paid.
 *
 * ── THE SECURITY PROPERTY THAT MATTERS ──────────────────────────────────────────────
 * payment_status is set to "paid" if and ONLY IF
 *     HMAC_SHA256(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET)
 * equals the razorpay_signature Razorpay handed the browser. The comparison is
 * TIMING-SAFE (crypto.timingSafeEqual), so the secret cannot be recovered byte-by-byte
 * by measuring how long a wrong signature takes to reject.
 *
 * The browser cannot mark an order paid by any other route: RLS grants users no UPDATE
 * on `orders` at all, so even a hand-crafted Supabase call from the console fails. The
 * only writer is this route, holding the service key, after the signature checks out.
 *
 * We additionally bind the payment to the order: the order must belong to the caller and
 * its stored razorpay_order_id must match the one being verified — otherwise a valid
 * signature from the attacker's own ₹1 order could be replayed onto someone's ₹4L order.
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time compare of two hex strings. Length is checked first (timingSafeEqual throws on a length mismatch). */
function signaturesMatch(expectedHex: string, receivedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length || expected.length === 0) return false;
  return timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !keySecret && "RAZORPAY_KEY_SECRET",
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`[razorpay/verify] missing env: ${missing.join(", ")}`);
    return NextResponse.json(
      { error: `Payments are not configured on this server (missing: ${missing.join(", ")}).` },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    orderId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return NextResponse.json({ error: "Incomplete payment confirmation." }, { status: 400 });
  }

  // ── 1. The signature must be genuine ────────────────────────────────────────────
  const expected = createHmac("sha256", keySecret!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expected, razorpay_signature)) {
    console.error(`[razorpay/verify] SIGNATURE MISMATCH for order ${orderId} (user ${user.id})`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const admin = createSupabaseServiceClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 2. The order must be this user's, and must be the order that was actually paid ──
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, order_number, user_id, payment_status, razorpay_order_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    console.error("[razorpay/verify] order lookup failed:", orderErr?.message);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.user_id !== user.id) {
    console.error(`[razorpay/verify] user ${user.id} tried to verify order ${orderId} owned by ${order.user_id}`);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.razorpay_order_id !== razorpay_order_id) {
    console.error(`[razorpay/verify] razorpay_order_id mismatch on order ${orderId}`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // Idempotent: Razorpay's handler can fire twice (retry, double-click, refresh).
  if (order.payment_status === "paid") {
    return NextResponse.json({ orderNumber: order.order_number, alreadyPaid: true });
  }

  // ── 3. Only now is money considered received ────────────────────────────────────
  const { error: updateErr } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id,
      razorpay_signature,
    })
    .eq("id", order.id);

  if (updateErr) {
    // The customer HAS paid at this point — never tell them it failed. Log loudly so
    // the owner can reconcile from the Razorpay dashboard.
    console.error(
      `[razorpay/verify] PAID BUT NOT RECORDED — order ${order.order_number} (${order.id}), ` +
      `razorpay_payment_id ${razorpay_payment_id}: ${updateErr.message}`,
    );
    return NextResponse.json(
      { error: "Your payment succeeded but we could not update the order. Please contact us with your payment ID: " + razorpay_payment_id },
      { status: 500 },
    );
  }

  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: "confirmed",
    notes: `Payment received via Razorpay (payment id ${razorpay_payment_id}).`,
    created_by: user.id,
  });

  // The cart has become an order — empty it.
  await admin.from("cart_items").delete().eq("user_id", user.id);

  return NextResponse.json({ orderNumber: order.order_number });
}
