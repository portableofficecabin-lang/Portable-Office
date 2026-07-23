/**
 * LABOUR COLONY ASSEMBLY ANIMATION — 2D overlay compositor (spec: "Captions and annotations").
 *
 * Paints the caption overlay onto a Canvas 2D context so EXPORTED frames carry exactly the same
 * titles, step chips, engineering rows, fabrication part marks, connection marks, bolt labels,
 * dimensions and progress the on-screen DOM overlay (AssemblyOverlay) shows — a WebGL capture never
 * contains DOM, so the exporter composites the WebGL frame onto a 2D canvas and calls this to bake the
 * text in. Both surfaces read the SAME CaptionState + OverlayExtras (derived from the shared timeline),
 * so preview and export can never disagree.
 *
 * Colours are LITERAL HEX / rgba only — never an oklch or CSS-var token — so PDF / PNG export is safe.
 * Everything is laid out inside a video-safe margin so no text is clipped at the frame edge.
 *
 * Browser-only (Canvas 2D), but framework-free — no React, no three.
 */

import { ASSEMBLY_SEQUENCE } from "@/features/labour-colony-studio/model/assembly";
import type { AssemblyTimeline, CaptionState } from "./assemblyTypes";
import { activeStepIndexAt } from "./assemblyMotion";

/** Which annotation families the overlay draws (independent of the AssemblyOptions caption toggles). */
export interface OverlayLabelOptions {
  showPartMarks: boolean;
  showConnectionMarks: boolean;
  showBoltLabels: boolean;
  showDimensions: boolean;
}

export const DEFAULT_LABEL_OPTIONS: OverlayLabelOptions = {
  showPartMarks: true,
  showConnectionMarks: true,
  showBoltLabels: true,
  showDimensions: true,
};

/** The per-step annotation payload the caption alone does not carry. */
export interface OverlayExtras {
  /** Short chips across the top-right: "STEP 07 / 19", the shot kind, the construction-step number. */
  chips: string[];
  memberMarks: string;
  connectionMarks: string;
  boltSpec: string;
  dimensionsLine: string;
}

export interface OverlayTheme {
  accent: string;
  panel: string;
  ink: string;
  chip: string;
  muted: string;
}

export const DEFAULT_THEME: OverlayTheme = {
  accent: "#fb923c",
  panel: "rgba(15,23,42,0.58)",
  ink: "#ffffff",
  chip: "rgba(15,23,42,0.72)",
  muted: "rgba(255,255,255,0.82)",
};

const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

/* ----------------------------------------------------------------- extras ---------------------- */

/**
 * The annotation payload for `timeMs`, derived from the timeline — shared by the live overlay and the
 * deterministic exporter so both draw identical labels for the same frame.
 */
export function overlayExtrasFor(timeline: AssemblyTimeline, timeMs: number): OverlayExtras {
  const idx = activeStepIndexAt(timeline, timeMs);
  const step = idx >= 0 && idx < timeline.steps.length ? timeline.steps[idx] : null;
  const chips: string[] = [];
  if (step) {
    // "STEP" counts SHOTS (a construction step split into detail shots contributes several); "SEQ"
    // counts the canonical construction steps, taken from the sequence itself rather than a literal
    // 24, and carries the sub-step ordinal so a 40-shot detail tour never reads as 40 × "SEQ 18".
    chips.push(`STEP ${pad2(step.index + 1)} / ${timeline.steps.length}`);
    chips.push(
      `SEQ ${pad2(step.assemblyStep)}${step.subIndex === undefined ? "" : `.${step.subIndex}`} / ${ASSEMBLY_SEQUENCE.length}`,
    );
    if (step.cutaway) chips.push("CUTAWAY");
  } else if (idx < 0) {
    chips.push("INTRO");
  } else {
    chips.push("COMPLETE");
  }
  return {
    chips,
    memberMarks: step?.memberMarks ?? "",
    connectionMarks: step?.connectionMarks ?? "",
    boltSpec: step?.boltSpec ?? "",
    dimensionsLine: timeline.dimensionsLine,
  };
}

/* ----------------------------------------------------------------- draw ------------------------ */

/**
 * Draw the overlay for `cap` onto `ctx` (a 2D context sized w×h). Sizes scale with height so 720p /
 * 1080p / square / portrait all read correctly, and everything stays inside a 4.5% video-safe margin.
 */
export function drawAssemblyOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cap: CaptionState,
  extras?: OverlayExtras,
  labels: OverlayLabelOptions = DEFAULT_LABEL_OPTIONS,
  theme: OverlayTheme = DEFAULT_THEME,
): void {
  const s = h / 1080;                              // sizing scale
  const m = Math.round(Math.min(w, h) * 0.045);    // video-safe margin
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  /* ---- top-left identity block ---- */
  const topLines: TextLine[] = [];
  if (cap.showCompanyTitle && cap.companyName) topLines.push({ text: cap.companyName, size: 30 * s, weight: 800, color: theme.accent });
  if (cap.projectName) topLines.push({ text: cap.projectName, size: 20 * s, weight: 600, color: theme.ink });
  if (cap.showDimensions && labels.showDimensions && cap.dimensionsLine) {
    topLines.push({ text: cap.dimensionsLine, size: 16 * s, weight: 500, color: theme.muted });
  }
  if (topLines.length) drawTextPanel(ctx, m, m, topLines, theme, s, "left");

  /* ---- top-right step chips ---- */
  if (extras && extras.chips.length) drawChips(ctx, w - m, m, extras.chips, theme, s);

  /* ---- main caption ---- */
  const barY = h - m - 10 * s;
  if (cap.kind === "intro" || cap.kind === "outro") {
    const tSize = clamp(58 * s, 20, ((w - 2 * m) * 1.7) / Math.max(6, cap.title.length));
    drawCentredPanel(ctx, w / 2, h * 0.42, [
      { text: cap.title, size: tSize, weight: 800, color: theme.ink },
      { text: cap.subtitle, size: 24 * s, weight: 500, color: "rgba(255,255,255,0.9)" },
    ], theme, s, w - 2 * m);
  } else {
    /* step heading, bottom-left, above the progress bar */
    const lines: TextLine[] = [
      { text: cap.title, size: 30 * s, weight: 800, color: theme.accent },
      { text: cap.subtitle, size: 21 * s, weight: 500, color: theme.ink },
    ];
    if (extras) {
      if (labels.showPartMarks && extras.memberMarks) lines.push({ text: `MARKS  ${extras.memberMarks}`, size: 14.5 * s, weight: 600, color: theme.muted });
      if (labels.showConnectionMarks && extras.connectionMarks) lines.push({ text: `CONN  ${extras.connectionMarks}`, size: 14.5 * s, weight: 600, color: theme.muted });
      if (labels.showBoltLabels && extras.boltSpec) lines.push({ text: `BOLTS  ${extras.boltSpec}`, size: 14.5 * s, weight: 600, color: theme.muted });
    }
    const headH = lines.reduce((a, l) => a + l.size + 6 * s, 0) + 24 * s;
    drawTextPanel(ctx, m, barY - headH - 22 * s, lines, theme, s, "left", w * 0.62);

    /* engineering rows, bottom-right */
    if (cap.engineeringRows.length) {
      const engLines: TextLine[] = cap.engineeringRows.slice(0, 6).map((r) => ({
        text: [r.label, r.material, r.section, r.qty, r.weight, r.boqRef, r.note].filter(nonEmpty).join("  ·  "),
        size: 14.5 * s,
        weight: 500,
        color: "rgba(255,255,255,0.92)",
      }));
      const engH = engLines.reduce((a, l) => a + l.size + 6 * s, 0) + 24 * s;
      drawTextPanel(ctx, w - m, barY - engH - 22 * s, engLines, theme, s, "right", w * 0.42);
    }
  }

  /* ---- progress bar ---- */
  const barX0 = m, barX1 = w - m, pbY = h - m - 6 * s, barH = 6 * s;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  roundRect(ctx, barX0, pbY, barX1 - barX0, barH, barH / 2); ctx.fill();
  ctx.fillStyle = theme.accent;
  roundRect(ctx, barX0, pbY, Math.max(barH, (barX1 - barX0) * clamp(cap.progress, 0, 1)), barH, barH / 2); ctx.fill();

  if (cap.kind === "step" && cap.totalSteps > 0) {
    ctx.textAlign = "right";
    ctx.font = `600 ${14 * s}px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`STEP ${cap.stepNumber} / ${cap.totalSteps}`, barX1, pbY - 22 * s);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

/* ----------------------------------------------------------------- primitives ------------------ */

interface TextLine { text: string; size: number; weight: number; color: string; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawTextPanel(
  ctx: CanvasRenderingContext2D, x: number, y: number, lines: TextLine[],
  theme: OverlayTheme, s: number, align: "left" | "right", maxW?: number,
): void {
  if (!lines.length) return;
  const padX = 16 * s, padY = 12 * s, gap = 6 * s;
  let width = 0;
  for (const l of lines) { ctx.font = `${l.weight} ${l.size}px ${FONT}`; width = Math.max(width, ctx.measureText(l.text).width); }
  if (maxW) width = Math.min(width, Math.max(40, maxW - padX * 2));
  const totalH = lines.reduce((a, l) => a + l.size, 0) + gap * (lines.length - 1) + padY * 2;
  const panelW = width + padX * 2;
  const px = align === "right" ? x - panelW : x;
  ctx.fillStyle = theme.panel;
  roundRect(ctx, px, y, panelW, totalH, 10 * s); ctx.fill();

  let ty = y + padY;
  ctx.textAlign = align;
  const tx = align === "right" ? px + panelW - padX : px + padX;
  for (const l of lines) {
    ctx.font = `${l.weight} ${l.size}px ${FONT}`;
    ctx.fillStyle = l.color;
    ctx.fillText(ellipsize(ctx, l.text, width), tx, ty);
    ty += l.size + gap;
  }
  ctx.textAlign = "left";
}

function drawCentredPanel(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, lines: TextLine[],
  theme: OverlayTheme, s: number, maxContentW: number,
): void {
  const padX = 34 * s, padY = 22 * s, gap = 12 * s;
  const contentMax = Math.max(40, maxContentW - padX * 2);
  let width = 0;
  for (const l of lines) { ctx.font = `${l.weight} ${l.size}px ${FONT}`; width = Math.max(width, Math.min(contentMax, ctx.measureText(l.text).width)); }
  const totalH = lines.reduce((a, l) => a + l.size, 0) + gap * (lines.length - 1) + padY * 2;
  const panelW = width + padX * 2;
  ctx.fillStyle = theme.panel;
  roundRect(ctx, cx - panelW / 2, cy - totalH / 2, panelW, totalH, 14 * s); ctx.fill();
  let ty = cy - totalH / 2 + padY;
  ctx.textAlign = "center";
  for (const l of lines) {
    ctx.font = `${l.weight} ${l.size}px ${FONT}`;
    ctx.fillStyle = l.color;
    ctx.fillText(ellipsize(ctx, l.text, contentMax), cx, ty);
    ty += l.size + gap;
  }
  ctx.textAlign = "left";
}

/** Right-aligned row of small step chips at (rightX, y). */
function drawChips(
  ctx: CanvasRenderingContext2D, rightX: number, y: number, chips: string[], theme: OverlayTheme, s: number,
): void {
  const size = 14 * s, padX = 10 * s, padY = 6 * s, gap = 6 * s;
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = "left";
  let x = rightX;
  for (let i = chips.length - 1; i >= 0; i--) {
    const text = chips[i];
    const wpx = ctx.measureText(text).width + padX * 2;
    x -= wpx;
    ctx.fillStyle = theme.chip;
    roundRect(ctx, x, y, wpx, size + padY * 2, 6 * s); ctx.fill();
    ctx.fillStyle = i === 0 ? theme.accent : theme.muted;
    ctx.fillText(text, x + padX, y + padY);
    x -= gap;
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
const nonEmpty = (s: string | undefined): s is string => typeof s === "string" && s.length > 0;
const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
