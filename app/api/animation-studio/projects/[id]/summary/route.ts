/**
 * GET /api/animation-studio/projects/[id]/summary
 *
 * The downloadable project summary — a plain-text brief the customer can send to an architect, a
 * contractor or back to us. It records what was locked, what was generated, what was measured and
 * what the output is NOT.
 *
 * Text/markdown rather than PDF on purpose: this repo already has a jsPDF pipeline for
 * quotations, and reusing it here would imply this document is a quotation. It is not. It carries
 * no price, no timeline and no warranty — the same policy the rest of the construction copy on
 * this site follows.
 */

import { NextResponse } from "next/server";

import { fullNegativePrompt } from "@/lib/animation/server/repo";
import { getCameraPreset } from "@/lib/animation/cameras";
import { requireOwnedProject } from "@/lib/animation/server/context";
import { sumDurations } from "@/lib/animation/duration";
import { DISCLAIMER, TOTAL_DURATION_SECONDS } from "@/lib/animation/types";
import { COMPANY } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { loaded } = owned;
  const p = loaded.project;

  const finals = loaded.outputs.filter((o) => o.kind === "final" || o.kind === "preview");
  const scenes = [...p.scenes].sort((a, b) => a.index - b.index);

  const lines: string[] = [];
  const rule = "=".repeat(78);

  lines.push(rule);
  lines.push(`CONCEPT ANIMATION SUMMARY — ${p.title}`);
  lines.push(`${COMPANY.legalName} · ${COMPANY.url}`);
  lines.push(rule);
  lines.push("");
  lines.push(DISCLAIMER);
  lines.push("");
  lines.push(`Project reference : ${p.publicId}`);
  lines.push(`Created           : ${new Date(p.createdAt).toISOString().slice(0, 10)}`);
  lines.push(`Last updated      : ${new Date(p.updatedAt).toISOString().slice(0, 10)}`);
  lines.push(`Status            : ${p.status}`);
  lines.push(`Approval          : ${p.approvalStatus.replace(/_/g, " ")}`);
  lines.push("");

  lines.push("REFERENCE IMAGES SUPPLIED");
  lines.push("-".repeat(78));
  if (p.assets.length === 0) {
    lines.push("None.");
  } else {
    for (const a of p.assets) {
      const size = a.width && a.height ? `${a.width}x${a.height}` : "size not read";
      lines.push(`  ${a.role.replace(/_/g, " ").padEnd(12)} ${a.originalName || "(unnamed)"}  [${size}, ${a.mimeType}]`);
    }
  }
  lines.push("");

  lines.push("LOCKED BUILDING FEATURES");
  lines.push("-".repeat(78));
  lines.push("These were applied to every scene prompt. 'user' means you corrected the value;");
  lines.push("'detected' means an image-analysis model read it; 'unverified' means nothing");
  lines.push("detected it and a safe default was used.");
  lines.push("");
  for (const [key, node] of Object.entries(p.features)) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    lines.push(`  ${label.padEnd(26)} ${String(node.value)}   (${node.confidence})`);
  }
  lines.push("");

  lines.push("STORYBOARD");
  lines.push("-".repeat(78));
  for (const s of scenes) {
    const preset = getCameraPreset(s.cameraPreset);
    lines.push(`  ${String(s.index + 1).padStart(2)}. ${s.title}  —  ${s.durationSeconds.toFixed(1)}s`);
    lines.push(`      Camera     : ${preset.label}${s.cameraInstructions ? ` (${s.cameraInstructions})` : ""}`);
    lines.push(`      Motion     : ${s.motionIntensity}/100    Transition in: ${s.transitionIn}`);
    lines.push(`      Status     : ${s.status}`);
    lines.push(`      Prompt     : ${wrap(s.improvedPrompt ?? s.prompt, 62, "                   ")}`);
    lines.push("");
  }
  lines.push(`  TOTAL: ${sumDurations(scenes.map((s) => s.durationSeconds)).toFixed(1)}s (target ${TOTAL_DURATION_SECONDS}s)`);
  lines.push("");

  lines.push("NEGATIVE PROMPT APPLIED TO EVERY SCENE");
  lines.push("-".repeat(78));
  lines.push(wrap(fullNegativePrompt(p.settings), 76, "  "));
  lines.push("");

  lines.push("OUTPUT SETTINGS");
  lines.push("-".repeat(78));
  lines.push(`  Aspect ratio      : ${p.settings.aspectRatio}`);
  lines.push(`  Resolution        : ${p.settings.resolution}`);
  lines.push(`  Time of day       : ${p.settings.timeOfDay}`);
  lines.push(`  Consistency seed  : ${p.settings.seed ?? "not set"}`);
  lines.push(`  Construction-stage: ${p.settings.constructionStageMode ? "yes" : "no"}`);
  lines.push(`  Branding on export: ${p.settings.branding.enabled ? "yes" : "no (clean export)"}`);
  lines.push("");

  lines.push("EXPORTED FILES");
  lines.push("-".repeat(78));
  if (finals.length === 0) {
    lines.push("  None exported yet.");
  } else {
    for (const o of finals) {
      const measured =
        o.verifiedDurationSeconds !== null
          ? `${o.verifiedDurationSeconds.toFixed(3)}s (measured server-side)`
          : "duration not verified";
      lines.push(`  ${o.kind.padEnd(8)} ${o.aspectRatio.padEnd(6)} ${o.resolution.padEnd(6)} ${measured}`);
    }
  }
  lines.push("");

  lines.push("WHAT THIS DOCUMENT IS NOT");
  lines.push("-".repeat(78));
  lines.push(wrap(
    "This is not a quotation, a structural drawing, a sanctioned plan or a specification. It " +
      "carries no price, no completion timeline and no warranty. The animation is a concept " +
      "visualisation generated from the reference images above; dimensions, materials, openings " +
      "and finishes are settled only in signed drawings and a written specification.",
    76,
    "  ",
  ));
  lines.push("");
  lines.push(`Questions: ${COMPANY.phones[0].display} · ${COMPANY.email.sales}`);
  lines.push(rule);

  const filename = `concept-animation-${p.publicId}.txt`;
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Soft-wrap a paragraph to `width`, indenting continuation lines. */
function wrap(text: string, width: number, indent: string): string {
  const words = (text ?? "").replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width) {
      out.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) out.push(line.trim());
  return out.join(`\n${indent}`);
}
