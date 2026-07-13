/**
 * THE shared sheet → PDF exporter. Every admin calculator that rasterises a DOM sheet into a PDF
 * must go through `exportSheetToPdf`. It is the one place that decides resolution, image format,
 * pagination and file size, so a new calculator gets a small, correct PDF for free.
 *
 * ── Why the old exports were huge ────────────────────────────────────────────────────────────────
 * They captured at a blind `scale: 2` and embedded the result as **PNG**:
 *
 *     captureElementToCanvas(el, { scale: 2 })  →  canvas.toDataURL("image/png")  →  addImage(…, "PNG")
 *
 * Two separate problems:
 *   1. `scale: 2` on a ~1100 px sheet gives ~2200 px across a 194 mm image area — about **288 DPI**.
 *      Nothing on these sheets needs 288 DPI; ~170 DPI is already crisp for 6–9 pt text and hairline
 *      strokes. Pixel count scales with the SQUARE of the scale, so 288 → 170 DPI alone removes ~65%
 *      of the pixels.
 *   2. PNG is lossless RGBA. On a page of text, hairlines and hatch patterns it compresses badly —
 *      several MB per page. The same page as JPEG at q≈0.92 is typically 5–10× smaller with no
 *      visible difference at print size.
 *
 * ── What this exporter does ──────────────────────────────────────────────────────────────────────
 *   • Derives the capture scale from a TARGET DPI and the real page geometry, instead of guessing.
 *   • Encodes pages as JPEG on an opaque white ground (no alpha channel to carry).
 *   • Builds the PDF with `compress: true`.
 *   • **Paginates on content boundaries**: it breaks BETWEEN the sheet's top-level cards, so a
 *     table, heading, stamp or drawing is never sliced across a page. A hard slice is used only when
 *     one card is genuinely taller than a page.
 *   • **Targets a file size.** It measures the finished PDF and, if it is over budget, steps quality
 *     down and then DPI down and rebuilds — but never below the legibility floors, because a 400 KB
 *     PDF nobody can read is worse than a 1.2 MB one they can.
 *
 * Aspect ratio is preserved at every step, so nothing is stretched; the image is centred in the page
 * margins, so nothing is shifted or clipped.
 */

import jsPDF from "jspdf";
import { captureElementToCanvas } from "./sanitizeColors";
import { addLegalFooter } from "@/lib/pdfFooter";

/* ------------------------------------------------------------------ defaults */

export const SHEET_PDF_DEFAULTS = {
  /** Print resolution. 170 DPI keeps 6 pt text and 0.5 px hairlines crisp on paper. */
  dpi: 170,
  /** Never drop below this — under ~120 DPI the small dimension text starts to mush. */
  minDpi: 120,
  /** JPEG quality. 0.92 is visually lossless for black-on-white line art. */
  quality: 0.92,
  /** Below ~0.72, JPEG ringing becomes visible around thin dark strokes. */
  minQuality: 0.72,
  /** File-size budget. */
  targetBytes: 1_000_000,
  marginMm: 8,
  orientation: "portrait" as "portrait" | "landscape",
} as const;

/**
 * Browsers cap BOTH the canvas area and each dimension; exceeding either yields a blank canvas —
 * a silent, total failure, so the scale must stay inside both.
 *
 * DIMENSION: 32 000 px is Firefox's per-side limit (Chrome/Edge allow 65 535). A drawing sheet is
 * tall and narrow, so this is the cap that bites first; setting it too low silently starves a long
 * sheet of resolution (at 16 384 a 25 000 px sheet fell to 93 DPI).
 *
 * AREA: 40 Mpx ≈ 160 MB of RGBA backing store. Chrome permits far more (268 Mpx), but there is no
 * point allocating a canvas so large it risks an OOM on a modest machine.
 *
 * Past those limits the effective DPI degrades gracefully instead of the export blowing up.
 */
const MAX_CANVAS_PX = 40_000_000;
const MAX_CANVAS_DIM = 32_000;

export interface SheetPdfOptions {
  filename: string;
  orientation?: "portrait" | "landscape";
  marginMm?: number;
  /** Size budget in bytes. Default 1 MB. */
  targetBytes?: number;
  dpi?: number;
  minDpi?: number;
  quality?: number;
  minQuality?: number;
  /** Append the standard legal footer to every page. Default true. */
  footer?: boolean;
  /** Extra CSS selectors whose boundaries are also safe page breaks. */
  breakSelector?: string;
}

export interface SheetPdfResult {
  bytes: number;
  pages: number;
  /** What was actually used after any size back-off. */
  dpi: number;
  quality: number;
  scale: number;
  /** True when the budget could not be met without going below the legibility floors. */
  overBudget: boolean;
}

const A4 = { w: 210, h: 297 };

/* ------------------------------------------------------------------ helpers */

/** Downscale a canvas by `f` (≤1) with smoothing — cheaper than re-capturing the DOM. */
function rescale(src: HTMLCanvasElement, f: number): HTMLCanvasElement {
  if (f >= 0.999) return src;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(src.width * f));
  out.height = Math.max(1, Math.round(src.height * f));
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/**
 * Y positions (in CSS px, relative to the sheet) where a page may be cut without slicing content:
 * the top and bottom edge of every top-level card. Sorted ascending.
 */
function contentBreakpoints(el: HTMLElement, extraSelector?: string): number[] {
  const root = el.getBoundingClientRect();
  const marks = new Set<number>([0]);
  const push = (n: Element) => {
    const r = n.getBoundingClientRect();
    if (r.height <= 0) return;
    marks.add(Math.max(0, r.top - root.top));
    marks.add(Math.max(0, r.bottom - root.top));
  };
  Array.from(el.children).forEach(push);
  if (extraSelector) el.querySelectorAll(extraSelector).forEach(push);
  return [...marks].sort((a, b) => a - b);
}

/** Render one page of the master canvas as a JPEG data URL on an opaque white ground. */
function sliceToJpeg(master: HTMLCanvasElement, y0: number, h: number, quality: number): string {
  const strip = document.createElement("canvas");
  strip.width = master.width;
  strip.height = Math.max(1, Math.round(h));
  const ctx = strip.getContext("2d");
  if (!ctx) return "";
  // JPEG has no alpha — paint the ground explicitly or transparent pixels come out black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, strip.width, strip.height);
  ctx.drawImage(master, 0, Math.round(y0), master.width, strip.height, 0, 0, strip.width, strip.height);
  return strip.toDataURL("image/jpeg", quality);
}

/* ------------------------------------------------------------------- export */

/**
 * Rasterise `el` and save it as a size-budgeted, content-paginated PDF.
 * Returns what it actually achieved so the caller can tell the user.
 */
export async function exportSheetToPdf(el: HTMLElement, opts: SheetPdfOptions): Promise<SheetPdfResult> {
  const o = { ...SHEET_PDF_DEFAULTS, footer: true, ...opts };
  const landscape = o.orientation === "landscape";
  const pageW = landscape ? A4.h : A4.w;
  const pageH = landscape ? A4.w : A4.h;
  const m = o.marginMm;
  const imgWmm = pageW - m * 2;
  const footerMm = o.footer ? 10 : 0;
  const imgHmm = pageH - m * 2 - footerMm;

  const cssW = el.offsetWidth || el.getBoundingClientRect().width || 1000;
  const cssH = el.scrollHeight || el.getBoundingClientRect().height || 1000;

  /** Capture scale that puts `dpi` dots across the printable width, inside the browser's limits. */
  const scaleFor = (dpi: number) => {
    const want = ((imgWmm / 25.4) * dpi) / cssW;
    const areaCap = Math.sqrt(MAX_CANVAS_PX / Math.max(1, cssW * cssH));
    const dimCap = MAX_CANVAS_DIM / Math.max(cssW, cssH);
    return Math.max(0.5, Math.min(want, 3, areaCap, dimCap));
  };

  // Capture ONCE at the highest DPI we might use; any back-off just downscales this canvas.
  const baseDpi = o.dpi;
  const baseScale = scaleFor(baseDpi);
  const master = await captureElementToCanvas(el, {
    scale: baseScale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const breaksCss = contentBreakpoints(el, o.breakSelector);

  /** Build the whole PDF at a given downscale factor + JPEG quality. */
  const build = (f: number, quality: number) => {
    const canvas = rescale(master, f);
    const pxPerMm = canvas.width / imgWmm;
    const pageHpx = imgHmm * pxPerMm;
    // CSS px → canvas px for this build
    const cssToPx = canvas.width / cssW;
    const breaksPx = breaksCss.map((b) => b * cssToPx);

    const pdf = new jsPDF({ orientation: o.orientation, unit: "mm", format: "a4", compress: true });
    let y = 0;
    let pages = 0;
    while (y < canvas.height - 1) {
      const hardEnd = Math.min(y + pageHpx, canvas.height);
      let cut = hardEnd;
      if (hardEnd < canvas.height) {
        // Prefer the LAST content boundary that fits on this page. Require the page to be at least
        // a quarter full, otherwise one tall card would produce a run of nearly-empty pages.
        const candidates = breaksPx.filter((b) => b > y + pageHpx * 0.25 && b <= hardEnd + 0.5);
        if (candidates.length) cut = Math.max(...candidates);
        // else: this single block is taller than a page — a hard slice is the only option.
      }
      const hpx = Math.max(1, cut - y);
      const data = sliceToJpeg(canvas, y, hpx, quality);
      if (pages > 0) pdf.addPage();
      pdf.addImage(data, "JPEG", m, m, imgWmm, hpx / pxPerMm, undefined, "FAST");
      pages++;
      y = cut;
      if (pages > 60) break;   // runaway guard
    }
    if (o.footer) addLegalFooter(pdf);
    const blob = pdf.output("blob") as Blob;
    return { pdf, blob, pages, quality, dpi: baseDpi * f, scale: baseScale * f };
  };

  /**
   * ADAPTIVE size targeting. A fixed ladder of (quality × dpi) combinations would need up to 16
   * rebuilds — each one re-encodes every page, so that is 8–16 s of spinner. Instead we build once,
   * measure, and JUMP to the settings that should hit the budget: JPEG size falls roughly linearly
   * with pixel count, so the linear scale factor we need is ~sqrt(target / actual). Quality is
   * stepped down first because it costs less legibility than resolution. Converges in ≤ 4 builds.
   */
  const minF = Math.min(1, o.minDpi / baseDpi);
  let f = 1;
  let q = o.quality;
  let best = build(f, q);

  for (let i = 0; i < 3 && best.blob.size > o.targetBytes; i++) {
    const ratio = o.targetBytes / best.blob.size;
    const atQualityFloor = q <= o.minQuality + 1e-6;
    const atDpiFloor = f <= minF + 1e-6;
    if (atQualityFloor && atDpiFloor) break;                  // nothing left to give

    if (!atQualityFloor) q = Math.max(o.minQuality, q - 0.06);
    // Never shrink by more than ~40% in one step — overshooting costs legibility for nothing.
    if (!atDpiFloor) f = Math.max(minF, Math.min(f, f * Math.sqrt(Math.max(0.4, ratio))));

    best = build(f, q);
  }

  const name = o.filename.endsWith(".pdf") ? o.filename : `${o.filename}.pdf`;
  best.pdf.save(name);

  return {
    bytes: best.blob.size,
    pages: best.pages,
    dpi: Math.round(best.dpi),
    quality: Number(best.quality.toFixed(2)),
    scale: Number(best.scale.toFixed(2)),
    overBudget: best.blob.size > o.targetBytes,
  };
}

/** Human-readable size, for the toast. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
