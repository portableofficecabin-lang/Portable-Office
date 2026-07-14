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
 *
 * ── `format: "png"` — for dense CAD-style sheets ─────────────────────────────────────────────────
 * JPEG is a poor fit for line art: its DCT-based compression rings around hard edges — exactly
 * hairline strokes, hatch fills and small text — which is what "blurry lines / fuzzy text" reports
 * trace back to almost every time, not insufficient DPI. PNG is lossless (zero ringing) and, for
 * mostly-white pages with sharp edges and flat colour (a construction drawing sheet, not a photo),
 * its deflate compression is usually competitive with or smaller than a JPEG good enough to look
 * clean at this content type. Callers with dense technical sheets (rebar shape diagrams, hatch
 * patterns, 6–8 pt dimension text) should pass `format: "png"` with a higher `dpi`/`minDpi` and a
 * larger `targetBytes` — the size-budget loop still applies, but only ever flexes DPI for PNG (there
 * is no lossy "quality" knob to step down first).
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
  /** JPEG (small, fine for photos/screenshots) or PNG (lossless — no ringing on line art/text). */
  format: "jpeg" as "jpeg" | "png",
  /**
   * PNG pre-encode quantisation, bits per channel. html2canvas antialiasing scatters thousands of
   * near-identical colours across a line-art page; PNG's deflate then finds almost no repeated runs
   * and the file balloons. Snapping near-white to pure white and rounding each channel to 2^bits
   * levels is invisible at print DPI (32 grey levels still render smooth text edges; flat fills
   * shift < 4/255) but typically cuts the encoded size 3–6×. 8 disables the pass entirely.
   */
  pngQuantizeBits: 5,
} as const;

/**
 * Browsers cap BOTH the canvas area and each dimension; exceeding either yields a blank canvas —
 * a silent, total failure, so the scale must stay inside both.
 *
 * DIMENSION: 32 000 px is Firefox's per-side limit (Chrome/Edge allow 65 535). A drawing sheet is
 * tall and narrow, so this is the cap that bites first; setting it too low silently starves a long
 * sheet of resolution (at 16 384 a 25 000 px sheet fell to 93 DPI).
 *
 * AREA: 64 Mpx ≈ 256 MB of RGBA backing store. Chrome permits far more (268 Mpx); this is headroom
 * for a genuinely tall multi-drawing technical sheet (a dozen stacked construction-drawing cards) to
 * reach a high target DPI without the area cap binding first, while staying well inside what a
 * modest machine can allocate.
 *
 * Past those limits the effective DPI degrades gracefully instead of the export blowing up.
 */
const MAX_CANVAS_PX = 64_000_000;
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
  /** JPEG (default) or PNG. Use PNG for dense line-art/text sheets — see the file header comment. */
  format?: "jpeg" | "png";
  /** PNG-only: bits per channel for the pre-encode quantisation pass (see defaults). 8 disables. */
  pngQuantizeBits?: number;
}

export interface SheetPdfResult {
  bytes: number;
  pages: number;
  /** DPI actually ACHIEVED (after the canvas caps and any size back-off), not the one requested. */
  dpi: number;
  quality: number;
  scale: number;
  /** True when the budget could not be met without going below the legibility floors. */
  overBudget: boolean;
  /** Page breaks that had to cut THROUGH content because one block was taller than a whole page. */
  sliced: number;
  /** True when the page cap stopped the export before the end of the sheet — the PDF is incomplete. */
  truncated: boolean;
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

/** Slice one page-height strip out of the master canvas onto an opaque white ground. */
function sliceStrip(master: HTMLCanvasElement, y0: number, h: number): HTMLCanvasElement {
  const strip = document.createElement("canvas");
  strip.width = master.width;
  strip.height = Math.max(1, Math.round(h));
  const ctx = strip.getContext("2d");
  if (ctx) {
    // No alpha in the output either format — paint the ground explicitly or transparent pixels
    // come out black (JPEG) or stay transparent over a dark PDF viewer background (PNG).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, strip.width, strip.height);
    ctx.drawImage(master, 0, Math.round(y0), master.width, strip.height, 0, 0, strip.width, strip.height);
  }
  return strip;
}

/** Render one page of the master canvas as a JPEG data URL. */
function sliceToJpeg(master: HTMLCanvasElement, y0: number, h: number, quality: number): string {
  return sliceStrip(master, y0, h).toDataURL("image/jpeg", quality);
}

/**
 * Quantise a strip's pixels IN PLACE before PNG encoding: near-white (≥ whiteFloor) snaps to pure
 * white, every other channel value rounds to 2^bits levels, alpha forced opaque. Deflate then sees
 * long identical runs instead of antialiasing noise — the visual change is imperceptible at print
 * DPI, the size change is dramatic. A no-op at bits ≥ 8.
 */
function quantizeStrip(strip: HTMLCanvasElement, bits: number, whiteFloor = 248): void {
  if (bits >= 8) return;
  const ctx = strip.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, strip.width, strip.height);
  const d = img.data;
  const step = 256 >> Math.max(1, Math.min(7, Math.round(bits)));
  const half = step >> 1;
  for (let i = 0; i < d.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const v = d[i + k];
      d[i + k] = v >= whiteFloor ? 255 : Math.min(255, (((v + half) / step) | 0) * step);
    }
    d[i + 3] = 255; // opaque — the ground is already painted white
  }
  ctx.putImageData(img, 0, 0);
}

/** Render one page of the master canvas as a PNG data URL — no compression ringing; quantised for size. */
function sliceToPng(master: HTMLCanvasElement, y0: number, h: number, quantizeBits: number): string {
  const strip = sliceStrip(master, y0, h);
  quantizeStrip(strip, quantizeBits);
  return strip.toDataURL("image/png");
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
  const isPng = o.format === "png";

  /** Build the whole PDF at a given downscale factor + JPEG quality (ignored for PNG). */
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
    let sliced = 0;
    while (y < canvas.height - 1) {
      const hardEnd = Math.min(y + pageHpx, canvas.height);
      let cut = hardEnd;
      if (hardEnd < canvas.height) {
        // Cut at the LAST content boundary that still fits on this page — that fills the page as far
        // as it can go without slicing anything.
        //
        // There used to be an extra `b > y + pageHpx * 0.25` filter here ("keep the page at least a
        // quarter full"), and it was the bug: when the only clean boundary on a page fell inside that
        // first quarter, EVERY candidate was rejected and the code fell through to a hard slice —
        // cutting straight through a floor plan or an elevation, which is precisely what content
        // pagination exists to prevent. A page that is only a third full is a cosmetic cost; a
        // drawing severed across a page break is a broken drawing. So take the clean cut whenever one
        // exists, and hard-slice ONLY when no boundary fits at all — i.e. one block is genuinely
        // taller than a whole page, where slicing is the only option.
        const candidates = breaksPx.filter((b) => b > y + 1 && b <= hardEnd + 0.5);
        if (!candidates.length) {
          sliced++;                                   // nothing fits — one block is taller than a page
        } else {
          const clean = Math.max(...candidates);
          // Would the chunk that STARTS the next page be able to finish inside one page — i.e. is
          // there any boundary within a page of it? If not, it is an unbreakable block taller than a
          // whole page (the footing-schedule card is one): it gets hard-sliced wherever it starts, so
          // pushing it onto a fresh page protects nothing and merely strands THIS page nearly empty.
          // In that one case, fill the page instead. The `fill` guard keeps us from doing so when the
          // page is already nearly full, which would leave just the block's heading dangling at the
          // foot of it.
          const breakable = breaksPx.some((b) => b > clean + 1 && b <= clean + pageHpx + 0.5);
          const fill = (clean - y) / pageHpx;
          if (!breakable && fill < 0.75) {
            cut = hardEnd;
            sliced++;
          } else {
            cut = clean;
          }
        }
      }
      const hpx = Math.max(1, cut - y);
      const data = isPng ? sliceToPng(canvas, y, hpx, o.pngQuantizeBits) : sliceToJpeg(canvas, y, hpx, quality);
      if (pages > 0) pdf.addPage();
      // PNG pages get jsPDF's best flate ("SLOW") — worth the CPU on line art; JPEG is already
      // entropy-coded, so "FAST" avoids pointless recompression time there.
      pdf.addImage(data, isPng ? "PNG" : "JPEG", m, m, imgWmm, hpx / pxPerMm, undefined, isPng ? "SLOW" : "FAST");
      pages++;
      y = cut;
      if (pages > 60) break;   // runaway guard
    }
    // Content past the runaway guard is genuinely missing from the PDF — surface it rather than
    // letting a truncated document look complete.
    const truncated = y < canvas.height - 1;
    if (o.footer) addLegalFooter(pdf);
    const blob = pdf.output("blob") as Blob;
    // Report the DPI actually ACHIEVED, not the one requested: scaleFor() clamps the capture scale to
    // the browser's canvas limits, so a very tall sheet can land well below `o.dpi`. Deriving it from
    // the finished canvas keeps the number in the toast honest.
    const achievedDpi = (canvas.width / imgWmm) * 25.4;
    return { pdf, blob, pages, quality, dpi: achievedDpi, scale: baseScale * f, sliced, truncated };
  };

  /**
   * ADAPTIVE size targeting. A fixed ladder of (quality × dpi) combinations would need up to 16
   * rebuilds — each one re-encodes every page, so that is 8–16 s of spinner. Instead we build once,
   * measure, and JUMP to the settings that should hit the budget: image size falls roughly linearly
   * with pixel count, so the linear scale factor we need is ~sqrt(target / actual). For JPEG, quality
   * is stepped down first because it costs less legibility than resolution; PNG has no lossy quality
   * knob, so it is treated as already "at the quality floor" and only DPI ever flexes. Converges in
   * ≤ 4 builds.
   */
  // The legibility floor has to be measured against what the master canvas ACTUALLY achieved. Using
  // the requested `baseDpi` here meant that when the canvas caps clamped the capture (a long sheet at
  // 300 DPI lands nearer 200), the back-off was still allowed to shrink by minDpi/300 — pushing the
  // real resolution well under the floor it was supposed to protect.
  const masterDpi = (master.width / imgWmm) * 25.4;
  const minF = Math.min(1, o.minDpi / masterDpi);
  let f = 1;
  let q = o.quality;
  let best = build(f, q);

  for (let i = 0; i < 3 && best.blob.size > o.targetBytes; i++) {
    const ratio = o.targetBytes / best.blob.size;
    const atQualityFloor = isPng || q <= o.minQuality + 1e-6;
    const atDpiFloor = f <= minF + 1e-6;
    if (atQualityFloor && atDpiFloor) break;                  // nothing left to give

    if (!atQualityFloor) q = Math.max(o.minQuality, q - 0.06);
    // Never shrink by more than ~40% in one step — overshooting costs legibility for nothing.
    if (!atDpiFloor) f = Math.max(minF, Math.min(f, f * Math.sqrt(Math.max(0.4, ratio))));

    best = build(f, q);
  }

  const name = o.filename.endsWith(".pdf") ? o.filename : `${o.filename}.pdf`;
  best.pdf.save(name);

  if (best.truncated) {
    console.warn(`[sheetPdf] ${name}: the sheet is longer than the ${best.pages}-page cap — the PDF is truncated.`);
  }

  return {
    bytes: best.blob.size,
    pages: best.pages,
    dpi: Math.round(best.dpi),
    quality: Number(best.quality.toFixed(2)),
    scale: Number(best.scale.toFixed(2)),
    overBudget: best.blob.size > o.targetBytes,
    sliced: best.sliced,
    truncated: best.truncated,
  };
}

/** Human-readable size, for the toast. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
