/**
 * POST /api/razorpay/order — create a Razorpay order for the signed-in user's cart.
 *
 * ── THE SECURITY PROPERTY THAT MATTERS ──────────────────────────────────────────────
 * The amount charged is RECOMPUTED HERE, on the server, from the user's own cart_items
 * rows + the commerce catalog + the zone table. Nothing about the price comes from the
 * browser — the client posts only a pincode and an installation flag. If a customer
 * tampers with the JS and posts ₹1, they are still charged the real total, because the
 * real total is never something they sent us.
 *
 * The same computeTotals() the cart and checkout UI render from is used here, so the
 * figure the customer was shown and the figure Razorpay charges are the same integer.
 *
 * Razorpay is called over its REST API with fetch + HTTP Basic auth — deliberately no
 * `razorpay` npm package, to avoid the install step and the supply-chain dependency.
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { missingPaymentEnv, readPaymentEnv, misconfiguredMessage } from "@/lib/razorpay/env";
import { computeTotals } from "@/lib/pricing/orderTotals";
import { getProductById } from "@/data/products";

// node:crypto / Supabase cookies — must not run on the edge, and must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

/** Razorpay rejects anything under ₹1. A ₹0 order would also mean our maths broke. */
const MIN_AMOUNT_PAISE = 100;

export async function POST(request: Request) {
  // ── Fail loudly on missing config, rather than pretending to take a payment ──────
  // Names only — a value is never logged or returned. See lib/razorpay/env.ts.
  const missing = missingPaymentEnv();
  if (missing.length > 0) {
    console.error(`[razorpay/order] missing env: ${missing.join(", ")}`);
    return NextResponse.json({ error: misconfiguredMessage(missing) }, { status: 500 });
  }
  // Non-null after the check above.
  const { keyId, keySecret, supabaseUrl, serviceKey } = readPaymentEnv()!;

  // ── Session is OPTIONAL. Guest checkout is supported (Merchant Center requires that a
  //    brand-new logged-out visitor can complete a purchase). A logged-in buyer's cart is
  //    still read authoritatively from the database; a guest sends the product ids + quantities
  //    and the server re-prices every line from the catalog, so neither can dictate a price. ──
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: {
    pincode?: string; wantsInstallation?: boolean;
    address_line1?: string; address_line2?: string; city?: string; state?: string; notes?: string;
    items?: { productId?: string; quantity?: number }[];
    customer?: { name?: string; email?: string; phone?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pincode = (body.pincode ?? "").trim();
  const wantsInstallation = body.wantsInstallation === true;

  // Guest contact — required for a guest order, so we can confirm and deliver it. Validated
  // here (the DB columns are nullable so existing logged-in orders are unaffected).
  const guestName = (body.customer?.name ?? "").trim();
  const guestEmail = (body.customer?.email ?? "").trim();
  const guestPhone = (body.customer?.phone ?? "").replace(/\D/g, "");

  // ── Resolve the cart. Logged-in → the DB cart (browser sends no items). Guest → the posted
  //    { productId, quantity } list, which computeTotals re-prices from the catalog below. ──
  let cartRows: { product_id: string; quantity: number }[];
  if (user) {
    const { data, error: cartErr } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", user.id);
    if (cartErr) {
      console.error("[razorpay/order] cart read failed:", cartErr.message);
      return NextResponse.json({ error: "Could not read your cart." }, { status: 500 });
    }
    cartRows = (data ?? []).map((r) => ({ product_id: r.product_id as string, quantity: r.quantity as number }));
  } else {
    // Guest path: validate contact, then take items from the request body.
    if (!guestName || guestName.length < 2) {
      return NextResponse.json({ error: "Please enter your name to complete a guest checkout." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (guestPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit phone number." }, { status: 400 });
    }
    cartRows = (Array.isArray(body.items) ? body.items : [])
      .map((i) => ({ product_id: String(i.productId ?? "").trim(), quantity: Number(i.quantity) }))
      .filter((i) => i.product_id && Number.isFinite(i.quantity) && i.quantity > 0);
  }

  if (!cartRows || cartRows.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // ── Authoritative totals ────────────────────────────────────────────────────────
  const totals = computeTotals({
    items: cartRows.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      name: getProductById(row.product_id)?.name,
    })),
    pincode,
    wantsInstallation,
  });

  if (totals.skipped.length > 0) {
    // A quote-only product reached the cart (e.g. added before the guard existed).
    // Refuse to charge for it rather than inventing a price.
    return NextResponse.json(
      { error: "Your cart contains a made-to-order product that cannot be bought online. Please remove it and request a quote." },
      { status: 400 },
    );
  }
  if (totals.lines.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (!totals.zone || totals.shipping === null) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit delivery pincode so we can calculate transport." },
      { status: 400 },
    );
  }
  if (totals.amountPaise < MIN_AMOUNT_PAISE) {
    console.error(`[razorpay/order] computed amount too low: ${totals.amountPaise} paise`);
    return NextResponse.json({ error: "Order total is invalid. Please contact us." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceKey);

  // ── Local order first, so the Razorpay receipt can carry our order number ───────
  // order_number is generated by the `set_order_number` trigger when passed as "".
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      // NULL for a guest order (orders.user_id is nullable per the guest-orders migration);
      // the authenticated user's id otherwise, so the order still appears in their history.
      user_id: user?.id ?? null,
      // Guest contact is stored on the order (guests have no profiles row). Left null for
      // logged-in orders, which carry contact via the account/profile — unchanged behaviour.
      customer_name: user ? null : guestName,
      customer_email: user ? null : guestEmail,
      customer_phone: user ? null : guestPhone,
      order_number: "",
      status: "pending",
      total_amount: totals.grandTotal,
      payment_method: "razorpay",
      payment_status: "pending",
      shipping_address_line1: body.address_line1 ?? null,
      shipping_address_line2: body.address_line2 ?? null,
      shipping_city: body.city ?? null,
      shipping_state: body.state ?? null,
      shipping_pincode: pincode,
      notes: body.notes || null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    console.error("[razorpay/order] order insert failed:", orderErr?.message);
    return NextResponse.json({ error: "Could not start your order." }, { status: 500 });
  }

  // Line items, including transport and installation as their own rows, so the sum of
  // order_items always reconciles to orders.total_amount and the admin sees the breakdown.
  const orderItems: Record<string, unknown>[] = totals.lines.map((line) => ({
    order_id: order.id,
    product_id: line.productId,
    product_name: line.name,
    product_sku: line.sku,
    quantity: line.quantity,
    unit_price: line.unitPrice,
  }));

  orderItems.push({
    order_id: order.id,
    product_id: null,
    product_name: `Transport — ${totals.zone.name}`,
    product_sku: totals.zone.id,
    quantity: 1,
    unit_price: totals.shipping,
  });

  if (totals.installation > 0) {
    orderItems.push({
      order_id: order.id,
      product_id: null,
      product_name: "On-site installation & positioning",
      product_sku: "INSTALLATION",
      quantity: 1,
      unit_price: totals.installation,
    });
  }

  const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
  if (itemsErr) {
    console.error("[razorpay/order] order_items insert failed:", itemsErr.message);
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not start your order." }, { status: 500 });
  }

  // ── Create the Razorpay order ───────────────────────────────────────────────────
  let razorpayOrder: { id?: string; amount?: number; currency?: string; error?: { description?: string } };
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totals.amountPaise,
        currency: "INR",
        // Razorpay caps the receipt at 40 chars; "ORD-10001" is comfortably inside.
        receipt: order.order_number,
        // user_id only when signed in; a guest order is reconciled by order_id + email instead.
        notes: {
          order_id: order.id,
          ...(user ? { user_id: user.id } : { guest_email: guestEmail }),
        },
      }),
    });
    razorpayOrder = await res.json();
    if (!res.ok || !razorpayOrder?.id) {
      throw new Error(razorpayOrder?.error?.description || `Razorpay returned ${res.status}`);
    }
  } catch (err) {
    console.error("[razorpay/order] Razorpay order creation failed:", err instanceof Error ? err.message : err);
    // Roll the local order back (order_items cascade) so no orphan pending order is left.
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not reach the payment gateway. Please try again." }, { status: 502 });
  }

  const { error: updateErr } = await admin
    .from("orders")
    .update({ razorpay_order_id: razorpayOrder.id })
    .eq("id", order.id);

  if (updateErr) {
    // Almost always means the migration has not been applied to this database.
    console.error("[razorpay/order] could not store razorpay_order_id:", updateErr.message);
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "Payment could not be started (order storage failed). Please contact us." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    razorpayOrderId: razorpayOrder.id,
    amount: totals.amountPaise,
    currency: "INR",
    keyId, // the public key_id — safe to expose, and sourced here so it cannot drift
    orderId: order.id,
    orderNumber: order.order_number,
  });
}
