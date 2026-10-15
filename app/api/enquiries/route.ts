/**
 * POST /api/enquiries — the category-page custom-requirement enquiry.
 *
 * ── WHY A SERVER ROUTE ──────────────────────────────────────────────────────────────────────
 * The older forms insert into `enquiries` straight from the browser with the public anon key, so
 * nothing stands between a script and the table or the notification e-mail function. This route
 * is the server-side gate for the category form:
 *
 *   1. same-origin only (the Origin host must equal the Host the request arrived on);
 *   2. body capped at ENQUIRY_MAX_BODY_BYTES;
 *   3. per-IP attempt limit, then the SAME validation the form runs, re-run here as the authority;
 *   4. honeypot + minimum fill time — bots are acknowledged and silently dropped;
 *   5. per-IP / per-email / per-phone submission limits, plus a site-wide e-mail budget that never
 *      refuses a submission (src/lib/enquiries/rateLimit.ts);
 *   6. the product name is resolved from the catalogue on the server — never taken from the client;
 *   7. insert with the anon key, so Row Level Security still applies (production has no
 *      service-role key, and this route needs none);
 *   8. notification fields are made markup-inert before they reach the e-mail function.
 *
 * The client IP is read from X-Real-IP / X-Forwarded-For, which the production nginx sets from
 * $remote_addr (verified 2026-10-12). The Next server is not reachable except through nginx.
 */

import { NextResponse } from "next/server";

import {
  CUSTOM_MODEL,
  ENQUIRY_MAX_BODY_BYTES,
  ENQUIRY_MIN_FILL_MS,
  neutraliseMarkup,
  validateCategoryEnquiry,
} from "@/lib/enquiries/categoryEnquiry";
import { ATTEMPT_RULES, NOTIFY_RULES, SUBMIT_RULES, SlidingWindowLimiter } from "@/lib/enquiries/rateLimit";
import { CATEGORY_LANDING_SLUGS } from "@/data/categoryLandings";
import { categories, products } from "@/data/products";
import { getCommerce } from "@/data/productCommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One limiter per server process — production runs exactly one. */
const limiter = new SlidingWindowLimiter();

const NOTIFY_TIMEOUT_MS = 12_000;

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** True only for a browser POST from a page on this same site. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The page the form was submitted from, if it is a plain same-site path. */
function sourcePath(request: Request, fallback: string): string {
  const referer = request.headers.get("referer");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (referer && host) {
      const url = new URL(referer);
      if (url.host === host && /^\/[a-z0-9/_-]*$/i.test(url.pathname)) return url.pathname;
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json(403, { error: "Forbidden." });

  const ip = clientIp(request);
  const attempt = limiter.take(ATTEMPT_RULES.map((rule) => ({ rule, key: ip })));
  if (!attempt.allowed) {
    console.warn(`[enquiries] 429 ${attempt.blockedBy}`);
    return json(
      429,
      { error: "Too many requests. Please wait a few minutes, or call us." },
      { "Retry-After": String(attempt.retryAfterSec) },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > ENQUIRY_MAX_BODY_BYTES) return json(413, { error: "Request too large." });
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json(415, { error: "Unsupported content type." });
  }
  const raw = await request.text();
  if (raw.length > ENQUIRY_MAX_BODY_BYTES) return json(413, { error: "Request too large." });

  let body: { categorySlug?: unknown; fields?: unknown; website?: unknown; elapsedMs?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const categorySlug = typeof body.categorySlug === "string" ? body.categorySlug : "";
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category || !CATEGORY_LANDING_SLUGS.includes(categorySlug)) {
    return json(400, { error: "Unknown category." });
  }

  const fields = body.fields && typeof body.fields === "object" ? (body.fields as Record<string, unknown>) : {};
  const { data, errors } = validateCategoryEnquiry(fields);
  if (Object.keys(errors).length > 0) return json(400, { error: "Please correct the highlighted fields.", errors });

  // Bot heuristics: acknowledge exactly like a success, store nothing, send nothing.
  const elapsed = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.website === "string" && body.website.trim() !== "") || elapsed < ENQUIRY_MIN_FILL_MS) {
    console.warn("[enquiries] dropped: honeypot or too fast");
    return json(201, { ok: true });
  }

  const phoneDigits = data.phone.replace(/\D/g, "").slice(-10);
  const submit = limiter.take([
    { rule: SUBMIT_RULES.ip10m, key: ip },
    { rule: SUBMIT_RULES.ipDay, key: ip },
    { rule: SUBMIT_RULES.email10m, key: data.email },
    { rule: SUBMIT_RULES.phone10m, key: phoneDigits },
  ]);
  if (!submit.allowed) {
    console.warn(`[enquiries] 429 ${submit.blockedBy}`);
    return json(
      429,
      { error: "We have already received several enquiries from you. Please wait a few minutes, or call us." },
      { "Retry-After": String(submit.retryAfterSec) },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    console.error("[enquiries] missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return json(503, { error: "Enquiries are temporarily unavailable. Please call us." });
  }

  // The model must be a catalogue product IN THIS CATEGORY; its name comes from the catalogue.
  const product =
    data.model !== CUSTOM_MODEL ? products.find((p) => p.id === data.model && p.categorySlug === categorySlug) : undefined;
  const productName = product ? getCommerce(product.id)?.h1Title || product.name : undefined;
  const modelLabel = productName ?? `Custom requirement (size or layout not listed)`;
  const page = sourcePath(request, `/products/category/${categorySlug}`);

  const message = [
    `Category: ${category.name}`,
    `Model: ${modelLabel}`,
    `Size required: ${data.size || "—"}`,
    `Quantity: ${data.qty}`,
    `Delivery location: ${data.location}`,
    `PIN code: ${data.pincode || "—"}`,
    "",
    "Additional specifications:",
    data.specs || "—",
    "",
    "Message:",
    data.message || "—",
    "",
    `Submitted from: ${page}`,
  ].join("\n");

  const row = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: null,
    subject: `Category enquiry — ${category.name}: ${modelLabel} × ${data.qty}`,
    message,
    enquiry_type: "quote",
    product_id: product?.id ?? null,
    product_name: productName ?? `${category.name} — custom requirement`,
    lead_source: "Category Page Enquiry",
  };

  const authHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };

  // Insert. Prefer return=minimal: the anon role has no SELECT on this table by design.
  let insertRes: Response;
  try {
    insertRes = await fetch(`${supabaseUrl}/rest/v1/enquiries`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "return=minimal" },
      body: JSON.stringify(row),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[enquiries] insert request failed:", err instanceof Error ? err.message : err);
    return json(502, { error: "Your enquiry could not be sent. Please try again or call us." });
  }
  if (!insertRes.ok) {
    const detail = await insertRes.text().catch(() => "");
    // The database trigger (once applied) raises "rate_limited" for repeat submissions.
    if (detail.includes("rate_limited")) {
      return json(429, { error: "We have already received several enquiries from you. Please wait a few minutes, or call us." });
    }
    console.error(`[enquiries] insert rejected: HTTP ${insertRes.status} ${detail.slice(0, 200)}`);
    return json(502, { error: "Your enquiry could not be sent. Please try again or call us." });
  }

  // Site-wide e-mail budget (NOTIFY_RULES): over it the enquiry stays stored — nobody is refused
  // because of other people's traffic — but no e-mail is sent for it.
  if (!limiter.take([{ rule: NOTIFY_RULES.global10m, key: "all" }]).allowed) {
    console.warn("[enquiries] notification suppressed: site-wide e-mail budget used up (possible flood)");
    return json(201, { ok: true, notification: "suppressed" });
  }

  // Notify. Every free-text field is made markup-inert first (see neutraliseMarkup).
  let notification: "sent" | "failed" = "failed";
  try {
    const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-enquiry-notification`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: neutraliseMarkup(row.name),
        email: row.email,
        phone: neutraliseMarkup(row.phone),
        subject: neutraliseMarkup(row.subject),
        message: neutraliseMarkup(row.message),
        enquiry_type: row.enquiry_type,
        product_name: neutraliseMarkup(row.product_name),
      }),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
      cache: "no-store",
    });
    notification = notifyRes.ok ? "sent" : "failed";
    if (!notifyRes.ok) console.error(`[enquiries] notification HTTP ${notifyRes.status}`);
  } catch (err) {
    console.error("[enquiries] notification failed:", err instanceof Error ? err.message : err);
  }

  // The enquiry is stored either way; the admin Enquiries screen is the system of record.
  return json(201, { ok: true, notification });
}

export function GET() {
  return json(405, { error: "Method not allowed." }, { Allow: "POST" });
}
