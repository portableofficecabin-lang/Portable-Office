/**
 * POST /api/razorpay/webhook — Razorpay's server-to-server payment notifications.
 *
 * This is the AUTHORITATIVE backstop for payment state. The browser /verify call is a UX
 * nicety that can be lost (the customer closes the tab the instant the payment succeeds);
 * Razorpay guarantees the webhook is delivered, so this is what makes "did we get paid?"
 * reliable regardless of what the browser did.
 *
 * ── FOUR THINGS THIS ROUTE GETS RIGHT ───────────────────────────────────────────────
 * 1. RAW BODY, THEN SIGNATURE, THEN PARSE. The HMAC must be computed over the exact bytes
 *    Razorpay signed. We read request.text() and verify it BEFORE JSON.parse — parsing and
 *    re-serialising would change the bytes and every signature would fail.
 * 2. A SEPARATE SECRET. The webhook signature uses RAZORPAY_WEBHOOK_SECRET (the value you
 *    set on the dashboard webhook), NOT the API key secret. Timing-safe comparison.
 * 3. IDEMPOTENCY. Razorpay delivers at least once. We CLAIM each event by its Razorpay
 *    event id in razorpay_webhook_events (UNIQUE) before acting; a duplicate delivery hits
 *    the unique violation and is acknowledged with 200 without re-touching the order. The
 *    order write is itself guarded (`payment_status != 'paid'`) as a second safety net.
 * 4. NO SECRETS IN LOGS. We never log the secret, the raw body or the signature header —
 *    only event type and entity ids.
 *
 * A 2xx tells Razorpay "handled, do not retry". We therefore return 200 for duplicates and
 * for events we choose to ignore, and reserve non-2xx for "genuinely could not process,
 * please redeliver" (bad signature → 400; transient failure → 500).
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/razorpay/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Service-role client. Left UNTYPED (no <Database> generic) on purpose — same as
 * app/api/razorpay/order/route.ts: the razorpay_* columns and the razorpay_webhook_events
 * table are added by migrations that are not yet in the generated supabase types, so a typed
 * client would reject them. The 3-arg overload infers an `any` schema, which is what we want here.
 */
function serviceClient(url: string, key: string) {
  return createSupabaseServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
type ServiceClient = ReturnType<typeof serviceClient>;

/** Rupees stored on the order → the integer paise Razorpay charges. Mirrors computeTotals(). */
const expectedPaise = (totalAmountRupees: number): number => Math.round(totalAmountRupees * 100);

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_description?: string;
}
interface OrderEntity {
  id?: string;
  amount?: number;
  amount_paid?: number;
  currency?: string;
  status?: string;
}
interface WebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    order?: { entity?: OrderEntity };
  };
}

/**
 * Atomically flip an order to paid. The `.neq("payment_status", "paid")` is the idempotency
 * guard: a second webhook (or the browser /verify) that already marked it paid updates zero
 * rows, so the history row and cart clear happen exactly once. Returns true iff THIS call flipped it.
 */
async function markOrderPaid(
  admin: ServiceClient,
  order: { id: string; user_id: string; order_number: string },
  paymentId: string | undefined,
  note: string,
): Promise<boolean> {
  const patch: Record<string, unknown> = { payment_status: "paid", status: "confirmed" };
  if (paymentId) patch.razorpay_payment_id = paymentId;

  const { data: updated, error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id");

  if (error) throw new Error(`order update failed: ${error.message}`);
  if (!updated || updated.length === 0) return false; // already paid — nothing more to do

  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: "confirmed",
    notes: note,
    created_by: null, // server-to-server: there is no acting user
  });
  await admin.from("cart_items").delete().eq("user_id", order.user_id);
  return true;
}

/** Find the local order that owns a Razorpay order id. Returns null when we do not recognise it. */
async function findOrder(admin: ServiceClient, razorpayOrderId: string | undefined) {
  if (!razorpayOrderId) return null;
  const { data } = await admin
    .from("orders")
    .select("id, user_id, order_number, payment_status, total_amount, razorpay_order_id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  return data ?? null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !webhookSecret && "RAZORPAY_WEBHOOK_SECRET",
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`[razorpay/webhook] missing env: ${missing.join(", ")}`);
    // 500 → Razorpay will retry once the server is configured. Never acknowledge blindly.
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  // ── 1. RAW body, exactly as signed. Do NOT parse before verifying. ───────────────
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature({ rawBody: raw, signature, webhookSecret: webhookSecret! })) {
    // No ids logged — an unauthenticated caller does not get to write to our logs, and we
    // do not echo the signature. This is the ONLY place we return 400.
    console.error("[razorpay/webhook] invalid signature — rejected");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // ── 2. Now it is safe to parse ────────────────────────────────────────────────────
  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    console.error("[razorpay/webhook] valid signature but unparseable body");
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";
  const payment = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const paymentId = payment?.id;
  // order.paid carries the order id on the order entity; payment.* on the payment entity.
  const razorpayOrderId = orderEntity?.id ?? payment?.order_id;

  // Razorpay's own event id is the idempotency key. Fall back to a composite that is still
  // unique per delivery (payment/order ids are unique) if the header is ever absent.
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${eventType}:${paymentId ?? razorpayOrderId ?? "na"}`;

  const admin = serviceClient(supabaseUrl!, serviceKey!);

  // ── 3. CLAIM the event. A duplicate delivery loses this insert and is acknowledged. ──
  const { data: claim, error: claimErr } = await admin
    .from("razorpay_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      razorpay_payment_id: paymentId ?? null,
      razorpay_order_id: razorpayOrderId ?? null,
      outcome: "processing",
    })
    .select("id")
    .single();

  if (claimErr) {
    // 23505 = unique_violation → we have already handled this exact event. Success, no-op.
    if ((claimErr as { code?: string }).code === "23505") {
      return NextResponse.json({ status: "duplicate" });
    }
    // 42P01 / PGRST205 → the razorpay_webhook_events table is missing (migration not applied).
    console.error(`[razorpay/webhook] could not record event ${eventType}: ${claimErr.message}`);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  // From here we OWN the claim. If processing throws, we release it (delete) so Razorpay's
  // retry reprocesses rather than the event being permanently swallowed.
  let outcome = "ignored";
  let orderId: string | null = null;

  try {
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const order = await findOrder(admin, razorpayOrderId);
        if (!order) {
          outcome = "order_not_found";
          console.error(`[razorpay/webhook] ${eventType}: no local order for razorpay order ${razorpayOrderId}`);
          break;
        }
        orderId = order.id;

        // Confirm the captured sum before trusting the event. The amount lives on whichever
        // entity the event carries (order.paid → order.amount; payment.captured → payment.amount).
        const gotPaise = orderEntity?.amount ?? payment?.amount;
        const gotCurrency = orderEntity?.currency ?? payment?.currency ?? "INR";
        if (order.total_amount != null) {
          const want = expectedPaise(order.total_amount);
          if (gotPaise !== want || gotCurrency !== "INR") {
            outcome = "amount_mismatch";
            console.error(
              `[razorpay/webhook] AMOUNT MISMATCH on order ${order.order_number} — ` +
              `got ${gotPaise} ${gotCurrency}, expected ${want} INR. Not marking paid; reconcile manually.`,
            );
            break;
          }
        }

        const flipped = await markOrderPaid(
          admin, order, paymentId,
          `Payment confirmed via Razorpay webhook (${eventType}${paymentId ? `, payment id ${paymentId}` : ""}).`,
        );
        outcome = flipped ? "processed" : "already_paid";
        break;
      }

      case "payment.failed": {
        const order = await findOrder(admin, razorpayOrderId);
        if (!order) {
          outcome = "order_not_found";
          break;
        }
        orderId = order.id;
        // Never overwrite a paid order (a later successful retry may already have confirmed it).
        if (order.payment_status !== "paid") {
          await admin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", order.id)
            .neq("payment_status", "paid");
          await admin.from("order_status_history").insert({
            order_id: order.id,
            status: "pending",
            notes: `Payment attempt failed via Razorpay${payment?.error_description ? ` — ${payment.error_description}` : ""}.`,
            created_by: null,
          });
          outcome = "processed";
        } else {
          outcome = "ignored_already_paid";
        }
        break;
      }

      default:
        outcome = "ignored";
        break;
    }
  } catch (err) {
    // Release the claim so the redelivery is not treated as a duplicate and can retry.
    await admin.from("razorpay_webhook_events").delete().eq("id", claim.id);
    console.error(`[razorpay/webhook] processing failed for ${eventType}: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  // Record what happened, for reconciliation.
  await admin
    .from("razorpay_webhook_events")
    .update({ outcome, order_id: orderId })
    .eq("id", claim.id);

  return NextResponse.json({ status: "ok", outcome });
}
