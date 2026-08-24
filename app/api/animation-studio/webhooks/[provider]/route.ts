/**
 * POST /api/animation-studio/webhooks/[provider]
 *
 * Provider push notification: "your job finished". Optional — polling
 * (/projects/[id]/render GET) is the primary mechanism and works with every provider, including
 * the ones that have no webhooks at all. This route exists so a provider that CAN push does not
 * have to be polled.
 *
 * ── THE SIGNATURE CHECK IS THE WHOLE ROUTE ──────────────────────────────────────────────────
 * This is the one endpoint a stranger can call. So:
 *   • the RAW body is read before anything parses it, because the signature covers raw bytes and
 *     re-serialising parsed JSON produces a different string and a failed check;
 *   • verification is delegated to the adapter, which compares in constant time;
 *   • an adapter with no webhook support returns false, so its webhook URL is permanently inert;
 *   • an unverified request gets 401 and writes NOTHING. It cannot mark a job complete, cannot
 *     create rows, and cannot tell the caller whether the job id it guessed exists.
 *
 * A verified webhook does NOT trust the payload's own status either. It marks the job as needing
 * attention and lets the normal poll fetch the truth from the provider's API — a signed message
 * proves who sent it, not that its contents are the current state.
 */

import { NextResponse } from "next/server";

import { firstStr } from "@/lib/animation/json";
import { resolveVideoProvider } from "@/lib/animation/providers";
import { studioClient } from "@/lib/animation/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;

  const provider = resolveVideoProvider();
  if (!provider || provider.id !== providerId) {
    // Do not reveal which providers exist or are configured.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!provider.capabilities.webhook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const raw = await request.text();
  if (!provider.verifyWebhook(raw, request.headers)) {
    console.error(`[animation-studio] webhook signature rejected for provider ${providerId}`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const providerJobId = firstStr(payload, ["id", "job_id", "jobId", "task_id", "request_id"]);
  if (!providerJobId) {
    return NextResponse.json({ error: "No job id in payload." }, { status: 400 });
  }

  const admin = studioClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: job } = await admin
    .from("animation_render_jobs")
    .select("id, status")
    .eq("provider", provider.id)
    .eq("provider_job_id", providerJobId)
    .maybeSingle();

  // 200 for an unknown id: a webhook that 404s gets retried forever by most providers, and this
  // is the normal shape of a delivery for a job we already finished and cleaned up.
  if (!job) return NextResponse.json({ received: true });

  // IDEMPOTENT: a terminal job is never re-opened by a repeated delivery.
  if (["completed", "failed", "cancelled"].includes(job.status)) {
    return NextResponse.json({ received: true, alreadyFinal: true });
  }

  // Nudge only. The authoritative state comes from the provider's API on the next poll.
  await admin
    .from("animation_render_jobs")
    .update({ status: "processing", response: { webhookAt: new Date().toISOString() } })
    .eq("id", job.id);

  return NextResponse.json({ received: true });
}
