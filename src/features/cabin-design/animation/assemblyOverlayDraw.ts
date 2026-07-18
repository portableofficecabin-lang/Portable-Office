/**
 * ANIMATED CABIN ASSEMBLY — caption compositor (spec: "Captions and annotations").
 *
 * Paints the caption overlay onto a 2D canvas so the EXPORTED frames carry the same titles / step
 * headings / progress / engineering rows the on-screen DOM overlay (AssemblyOverlay) shows — drei's
 * <Html> DOM never appears in a WebGL capture, so the exporter composites the WebGL frame onto this
 * 2D canvas and calls this to bake the text in. All copy comes from the shared CaptionState (built
 * from the model + BoqResult) so it can never disagree with the animation. Everything is laid out
 * inside a video-safe margin so no text is clipped at the frame edge.
 *
 * Browser-only (Canvas 2D), but framework-free — no React, no three.
 */

import type { CaptionState } from "./assemblyTypes";

export interface OverlayTheme {
  accent: string;
  panel: string;
  ink: string;
}

const DEFAULT_THEME: OverlayTheme = { accent: "#fb923c", panel: "rgba(15,23,42,0.58)", ink: "#ffffff" };
const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Draw the overlay for `cap` onto `ctx` (a 2D context sized w×h). Sizes scale with height so 720p /
 * 1080p / portrait all read correctly, and everything stays inside a 4.5% video-safe margin.
 */
export function drawAssemblyOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number, cap: CaptionState, theme: OverlayTheme = DEFAULT_THEME,
): void {
  const s = h / 1080;                     // sizing scale
  const m = Math.round(Math.min(w, h) * 0.045); // video-safe margin
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  /* ---- top-left identity block ---- */
  const topLines: { text: string; size: number; weight: number; color: string }[] = [];
  if (cap.showCompanyTitle && cap.companyName) topLines.push({ text: cap.companyName, size: 30 * s, weight: 800, color: theme.accent });
  if (cap.projectName) topLines.push({ text: cap.projectName, size: 20 * s, weight: 600, color: theme.ink });
  if (cap.showDimensions && cap.dimensionsLine) topLines.push({ text: cap.dimensionsLine, size: 16 * s, weight: 500, color: "rgba(255,255,255,0.8)" });
  if (topLines.length) drawTextPanel(ctx, m, m, topLines, theme, s, "left");

  /* ---- main caption ---- */
  if (cap.kind === "intro" || cap.kind === "outro") {
    // centred title card
    const title = cap.title;
    const subtitle = cap.subtitle;
    ctx.textAlign = "center";
    // shrink the title if it would overflow the safe width
    const tSize = clamp(58 * s, 20, ((w - 2 * m) * 1.7) / Math.max(6, title.length));
    const cx = w / 2;
    const block = [
      { text: title, size: tSize, weight: 800, color: theme.ink },
      { text: subtitle, size: 24 * s, weight: 500, color: "rgba(255,255,255,0.9)" },
    ];
    drawCentredPanel(ctx, cx, h * 0.42, block, theme, s, w - 2 * m);
    ctx.textAlign = "left";
  } else {
    // step: heading + subtitle, bottom-left, above the progress bar
    const barY = h - m - 10 * s;
    const lines = [
      { text: cap.title, size: 30 * s, weight: 800, color: theme.accent },
      { text: cap.subtitle, size: 21 * s, weight: 500, color: theme.ink },
    ];
    const panelH = 30 * s + 21 * s + 26 * s;
    drawTextPanel(ctx, m, barY - panelH - 22 * s, lines, theme, s, "left", w * 0.62);

    /* ---- engineering rows (bottom-right) ---- */
    if (cap.engineeringRows.length) {
      const rows = cap.engineeringRows.slice(0, 5).map((r) => {
        const bits = [r.label, r.material, r.section, r.qty, r.weight, r.boqRef].filter(Boolean) as string[];
        return bits.join("  ·  ");
      });
      const engLines = rows.map((t) => ({ text: t, size: 14.5 * s, weight: 500, color: "rgba(255,255,255,0.92)" }));
      drawTextPanel(ctx, w - m, barY - panelH - 22 * s, engLines, theme, s, "right", w * 0.42);
    }
  }

  /* ---- progress bar ---- */
  const barX0 = m, barX1 = w - m, barY = h - m - 6 * s, barH = 6 * s;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  roundRect(ctx, barX0, barY, barX1 - barX0, barH, barH / 2); ctx.fill();
  ctx.fillStyle = theme.accent;
  const fillW = Math.max(barH, (barX1 - barX0) * clamp(cap.progress, 0, 1));
  roundRect(ctx, barX0, barY, fillW, barH, barH / 2); ctx.fill();

  // step counter above the bar (right)
  if (cap.kind === "step" && cap.totalSteps > 0) {
    ctx.textAlign = "right";
    ctx.font = `600 ${14 * s}px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`STEP ${cap.stepNumber} / ${cap.totalSteps}`, barX1, barY - 22 * s);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

function drawTextPanel(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  lines: { text: string; size: number; weight: number; color: string }[],
  theme: OverlayTheme, s: number, align: "left" | "right", maxW?: number,
): void {
  const padX = 16 * s, padY = 12 * s, gap = 6 * s;
  let width = 0;
  for (const l of lines) { ctx.font = `${l.weight} ${l.size}px ${FONT}`; width = Math.max(width, ctx.measureText(l.text).width); }
  if (maxW) width = Math.min(width, maxW - padX * 2);
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
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  lines: { text: string; size: number; weight: number; color: string }[],
  theme: OverlayTheme, s: number, maxContentW: number,
): void {
  const padX = 34 * s, padY = 22 * s, gap = 12 * s;
  const contentMax = Math.max(40, maxContentW - padX * 2); // clamp inside the video-safe width
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
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
