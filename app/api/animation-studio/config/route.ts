/**
 * GET /api/animation-studio/config — what this server can actually do, right now.
 *
 * The workspace calls this before it renders a single control, so the interface can tell the
 * truth from the first paint. Every capability the answer denies is a control the UI disables
 * with a reason, rather than a button that fails on click.
 *
 * ── THE READINESS GATE ──────────────────────────────────────────────────────────────────────
 * `ready` is true only when ALL THREE prerequisites hold, because a render needs all three and
 * failing at the third step after the visitor has waited is worse than not offering it:
 *
 *   provider  — something to submit the scenes to
 *   database  — somewhere to record the job, so a page refresh does not lose it
 *   ffmpeg    — the only way the clips become ONE exactly-30-second file
 *
 * `blockers` is the ordered, human-readable list of what is missing. The Generate button reads
 * `ready`; the panel reads `blockers`.
 *
 * The database check is a REAL QUERY, not an env-var check. Credentials can be perfect while the
 * migration has not been applied — which is exactly the state a fresh deployment is in, and
 * exactly the state an env-var check would call "ready".
 *
 * SECURITY: names only. `missingEnv` and `requiredEnv` list VARIABLE NAMES — no value is read
 * into the response, and none of these variables is NEXT_PUBLIC_, so none is in the browser
 * bundle either. Naming them is a deliberate trade, exactly as src/lib/razorpay/env.ts documents:
 * a self-diagnosing configuration screen is worth more than hiding a stack anyone can infer from
 * the network tab.
 */

import { NextResponse } from "next/server";

import { isAssemblyAvailable } from "@/lib/animation/assemble";
import { analysisConfigured } from "@/lib/animation/env";
import { hasFfprobe } from "@/lib/animation/probe";
import { providerStatus } from "@/lib/animation/providers";
import { studioClient } from "@/lib/animation/server/repo";
import type { ProviderConfigStatus } from "@/lib/animation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Is the animation_* schema actually there?
 *
 * A `select ... limit 1` on the projects table. A missing table returns PostgREST error 42P01 and
 * this answers false; a working table returns rows (or none) and it answers true. Cheap enough to
 * run per config request, and it is the only check that distinguishes "configured" from "working".
 */
async function isDatabaseReady(): Promise<boolean> {
  const admin = studioClient();
  if (!admin) return false;
  try {
    const { error } = await admin.from("animation_projects").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  const status = providerStatus();
  const [assemblyAvailable, ffprobeAvailable, databaseReady] = await Promise.all([
    isAssemblyAvailable(),
    hasFfprobe(),
    isDatabaseReady(),
  ]);

  const blockers: ProviderConfigStatus["blockers"] = [];
  if (!status.configured) {
    blockers.push({
      id: "provider",
      message:
        "No video-generation provider is configured on this server. Set the environment variables " +
        `listed below (missing: ${status.missingEnv.join(", ") || "none detected"}).`,
    });
  }
  if (!databaseReady) {
    blockers.push({
      id: "database",
      message:
        "The animation-studio database tables are not reachable. Apply " +
        "supabase/migrations/20260824120000_construction_animation_studio.sql to this project's " +
        "Supabase instance.",
    });
  }
  if (!assemblyAvailable) {
    blockers.push({
      id: "ffmpeg",
      message:
        "No ffmpeg binary was found, so scene clips cannot be joined into one 30-second file. " +
        "Install ffmpeg in the runtime image (Alpine: `apk add --no-cache ffmpeg`) or set FFMPEG_PATH.",
    });
  }

  const body: ProviderConfigStatus = {
    ...status,
    assemblyAvailable,
    ffprobeAvailable,
    analysisAvailable: analysisConfigured(),
    databaseReady,
    ready: blockers.length === 0,
    blockers,
  };

  return NextResponse.json(body, {
    // Configuration is per-deployment, not per-visitor, but it must never be cached at the edge:
    // an operator who has just applied the migration needs the next request to reflect it.
    headers: { "Cache-Control": "no-store" },
  });
}
