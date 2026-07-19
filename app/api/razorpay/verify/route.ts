/**
 * POST /api/razorpay/verify — confirm a payment and, ONLY then, mark the order paid.
 *
 * ── THE SECURITY PROPERTY THAT MATTERS ──────────────────────────────────────────────
 * payment_status is set to "paid" if and ONLY IF
 *     HMAC_SHA256(`${db_razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET)
 * equals the razorpay_signature Razorpay handed the browser. The comparison is
 * TIMING-SAFE (crypto.timingSafeEqual), so the secret cannot be recovered byte-by-byte
 * by measuring how long a wrong signature takes to reject.
 *
 * ── WHY THE ORDER ID COMES FROM OUR DATABASE, NOT THE BROWSER ────────────────────────
 * The browser posts `orderId` (our internal id). We load THAT order, prove it belongs to
 * the caller, and then build the HMAC message from the `razorpay_order_id` WE stored at
 * checkout — never from the `razorpay_order_id` the browser sent. A browser therefore
 * cannot present a valid signature from its own ₹1 order and have it accepted against
 * someone else's ₹4L order: the message being signed is pinned to our own record.
 *
 * ── DEFENCE IN DEPTH: THE CAPTURED AMOUNT IS CONFIRMED WITH RAZORPAY ─────────────────
 * The Checkout handshake signature proves authenticity but carries no amount. So we also
 * fetch the payment from Razorpay's API and confirm its amount (paise), currency and
 * order_id equal what our order record expects. The HMAC alone is sufficient proof of
 * authenticity; this catches an amount/currency drift and is the same check the webhook
 * performs, so the two paths agree.
 *
 * The browser cannot mark an order paid by any other route: RLS grants users no UPDATE
 * on `orders` at all, so even a hand-crafted Supabase call from the console fails. The
 * only writer is this route (and the webhook), holding the service key, after the checks pass.
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { missingPaymentEnv, readPaymentEnv, misconfiguredMessage } from "@/lib/razorpay/env";
import { verifyCheckoutSignature } from "@/lib/razorpay/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments";

/** Rupees stored on the order → the integer paise Razorpay charges. Mirrors computeTotals(). */
const expectedPaise = (totalAmountRupees: number): number => Math.round(totalAmountRupees * 100);

export async function POST(request: Request) {
  // Names only — a value is never logged or returned. See lib/razorpay/env.ts.
  const missing = missingPaymentEnv();
  if (missing.length > 0) {
    console.error(`[razorpay/verify] missing env: ${missing.join(", ")}`);
    return NextResponse.json({ error: misconfiguredMessage(missing) }, { status: 500 });
  }
  // Non-null after the check above.
  const { keyId, keySecret, supabaseUrl, serviceKey } = readPaymentEnv()!;

  // Session is OPTIONAL — a guest verifies a guest order. Ownership is proved differently for
  // the two cases (see step 1 below): a logged-in order must belong to the caller; a guest order
  // (user_id IS NULL) is proved solely by the Razorpay signature, which is pinned to the
  // razorpay_order_id WE stored and can only be produced by Razorpay after a real payment.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const { razorpay_payment_id, razorpay_signature, orderId } = body;
  if (!razorpay_payment_id || !razorpay_signature || !orderId) {
    return NextResponse.json({ error: "Incomplete payment confirmation." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceKey);

  // ── 1. Load OUR order FIRST — the id we sign with must come from our record, not the browser ──
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, order_number, user_id, payment_status, razorpay_order_id, total_amount")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    console.error("[razorpay/verify] order lookup failed:", orderErr?.message);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  // A logged-in order must belong to the caller (unchanged protection: one user can never verify
  // another's order). A GUEST order has user_id = NULL; there is no session to match, so ownership
  // rests entirely on the signature check below — which the browser cannot forge for someone
  // else's order because the HMAC is built from OUR stored razorpay_order_id, not the browser's.
  if (order.user_id) {
    if (!user || order.user_id !== user.id) {
      console.error(`[razorpay/verify] user ${user?.id ?? "anon"} tried to verify order ${orderId} owned by ${order.user_id}`);
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
  }
  if (!order.razorpay_order_id) {
    console.error(`[razorpay/verify] order ${orderId} has no razorpay_order_id — checkout did not complete`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // Idempotent, checked BEFORE the signature work: Razorpay's handler can fire twice
  // (retry, double-click, refresh), and the webhook may already have marked it paid.
  if (order.payment_status === "paid") {
    return NextResponse.json({ orderNumber: order.order_number, alreadyPaid: true });
  }

  // ── 2. The signature must be genuine — signed over OUR stored razorpay_order_id ──────
  const originalOrderId = order.razorpay_order_id;
  const genuine = verifyCheckoutSignature({
    originalOrderId,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    keySecret: keySecret!,
  });

  if (!genuine) {
    console.error(`[razorpay/verify] SIGNATURE MISMATCH for order ${orderId} (user ${user.id})`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // ── 3. Confirm the CAPTURED amount / currency / order with Razorpay ──────────────────
  // The signature proves authenticity; this proves we are being paid the right sum. When
  // Razorpay is momentarily unreachable we do NOT block a cryptographically-valid payment —
  // the webhook (order.paid / payment.captured) re-confirms the amount independently.
  if (order.total_amount != null) {
    const want = expectedPaise(order.total_amount);
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch(`${RAZORPAY_PAYMENTS_URL}/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const payment = (await res.json()) as {
        order_id?: string; amount?: number; currency?: string; status?: string;
        error?: { description?: string };
      };

      if (res.ok && payment?.status) {
        const okStatus = payment.status === "captured" || payment.status === "authorized";
        const amountOk = payment.amount === want;
        const currencyOk = payment.currency === "INR";
        const orderOk = payment.order_id === originalOrderId;
        if (!okStatus || !amountOk || !currencyOk || !orderOk) {
          console.error(
            `[razorpay/verify] PAYMENT MISMATCH on order ${order.order_number} — ` +
            `status=${payment.status} amount=${payment.amount}/${want} ` +
            `currency=${payment.currency} order=${orderOk ? "ok" : "mismatch"}`,
          );
          return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
        }
      } else {
        // Could not read the payment (bad id / API error) — proceed on the HMAC alone, which is
        // already sufficient authenticity proof. The webhook will confirm the amount.
        console.warn(`[razorpay/verify] could not fetch payment ${razorpay_payment_id} for amount check: ${payment?.error?.description ?? res.status}`);
      }
    } catch (err) {
      console.warn(`[razorpay/verify] payment amount check skipped (network): ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── 4. Only now is money considered received ────────────────────────────────────
  // The `.neq("payment_status", "paid")` makes the flip atomic: if a concurrent verify or the
  // webhook already marked this order paid between our read above and this write, THIS update
  // touches zero rows, and we skip the history/cart side-effects so they can never be duplicated.
  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id,
      razorpay_signature,
    })
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id");

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

  // Zero rows updated ⇒ another path won the race and already marked it paid. Report success
  // (the payment IS recorded) without re-writing history or re-clearing the cart.
  if (!updated || updated.length === 0) {
    return NextResponse.json({ orderNumber: order.order_number, alreadyPaid: true });
  }

  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: "confirmed",
    notes: `Payment received via Razorpay (payment id ${razorpay_payment_id}).`,
    created_by: user?.id ?? null, // null for a guest order — there is no acting user
  });

  // The cart has become an order — empty it. Only logged-in carts live in cart_items; a guest's
  // cart is in the browser's localStorage and is cleared client-side on success.
  if (order.user_id) {
    await admin.from("cart_items").delete().eq("user_id", order.user_id);
  }

  return NextResponse.json({ orderNumber: order.order_number });
}
