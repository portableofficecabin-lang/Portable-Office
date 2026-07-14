"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { DrawingWatermark } from "@/components/admin/labour-colony/DrawingWatermark";
import { exportSheetToPdf, formatBytes } from "@/lib/pdf/sheetPdf";
import { COMPANY } from "@/lib/company";

/**
 * ADMIN-ONLY drawing tools for the cabin calculator.
 *
 * The calculator itself is the SAME component on the public homepage and in the admin panel — the
 * admin copy just passes `adminTools`, which mounts this wrapper around the drawing. Everything the
 * admin gets that the customer does not lives here: the watermark toggle and the drawing PDF export.
 *
 * The split of responsibilities is deliberate:
 *   • This component owns the TOOLBAR (never exported — it is UI, not drawing) and the exportable
 *     SHEET (the ref'd node that gets rasterised).
 *   • The drawing arrives as `children`, so this file never imports CabinPreview or CabinCalculator.
 *     CabinCalculator imports THIS — importing back would be a circular import.
 *
 * IMPORTANT — colours inside the sheet are LITERAL HEX inline styles, never Tailwind colour classes.
 * The PDF export rasterises the sheet with html2canvas-pro, which cannot parse Tailwind's oklch()
 * colour tokens. Layout-only utility classes (flex, grid, p-4, text-xs) are fine, and the toolbar —
 * which sits OUTSIDE the sheet — may use normal Tailwind colours.
 */

export interface AdminDrawingToolsProps {
  /** Title-block heading + basis of the PDF filename, e.g. "Executive Cabin 20x10". */
  title: string;
  /** One-line spec for the title block, e.g. "20 x 10 x 9.5 ft · PUF Panel · 2 rooms". */
  subtitle?: string;
  /** The drawing itself. Rendered INSIDE the exportable sheet. */
  children: React.ReactNode;
}

/** `Executive Cabin 20x10` → `executive-cabin-20x10`. Never returns an empty/unsafe name. */
function toFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // spaces, ·, ×, / … all collapse to a single hyphen
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug ? `cabin-drawing-${slug}` : "cabin-drawing";
}

export function AdminDrawingTools({ title, subtitle, children }: AdminDrawingToolsProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  /** Company-name watermark across the sheet. ON by default — a drawing that leaves the office
   *  unmarked is the thing you cannot undo; turning it off has to be a deliberate act. */
  const [watermark, setWatermark] = useState(true);
  /**
   * Today's date for the title block. Filled AFTER mount, never during render: a date computed while
   * rendering differs between the server-rendered HTML and the first client render (hydration
   * mismatch), and it also makes the component non-deterministic to lint.
   */
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  const sheetRef = useRef<HTMLDivElement>(null);

  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      // Same high-fidelity preset as the labour-colony construction sheet: this is CAD-style line art
      // (plans, elevations, dimension text), which is exactly what JPEG compresses worst — its DCT
      // ringing shows up as fuzzy hairlines and mushy text. PNG is lossless at a real print DPI, with
      // a generous size budget so the adaptive back-off rarely has to trade quality away.
      const r = await exportSheetToPdf(sheetRef.current, {
        filename: toFilename(title),
        format: "png",
        dpi: 300,
        minDpi: 220,
        targetBytes: 10_000_000,
        // Without this the exporter only knows the sheet's DIRECT children, and the whole stacked
        // drawing set arrives as ONE child — so a sheet taller than a page gets hard-sliced straight
        // through a plan or an elevation. CabinPreview marks each view with .cabin-drawing-block
        // precisely so the page can break BETWEEN them.
        //
        // `svg` used to be in this list too, and it defeated the whole point: a breakpoint is the top
        // AND bottom edge of every match, so every <svg> edge became a legal page cut INSIDE a block.
        // A .cabin-drawing-block is `<heading> <svg> <legend>` — cutting at the svg's top orphaned the
        // "4 ELEVATIONS" heading at the foot of the previous page, and cutting at its bottom stranded
        // the floor plan's legend at the top of the next one. The blocks are the only safe boundaries.
        breakSelector: ".cabin-drawing-block",
      });
      toast({
        title: r.truncated ? "Drawing PDF downloaded — INCOMPLETE" : "Drawing PDF downloaded",
        description: `${r.pages} page${r.pages > 1 ? "s" : ""} · ${formatBytes(r.bytes)} · ${r.dpi} DPI${r.overBudget ? " (kept above the size budget to preserve legibility)" : ""}${r.truncated ? " — the sheet is longer than the page cap and was cut short." : ""}`,
        variant: r.truncated ? "destructive" : undefined,
      });
    } catch (err: unknown) {
      console.error("Cabin drawing PDF failed:", err);
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Could not generate drawing PDF",
        description: msg ? msg.slice(0, 140) : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* TOOLBAR — deliberately OUTSIDE sheetRef, so no control ever lands in the exported PDF. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* The company name is stamped across the sheet, so a screenshot, a print and the PDF all
            carry it. Off is not the safe default — leave it on unless there is a reason. */}
        <label className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-xs font-medium">
          <Switch checked={watermark} onCheckedChange={setWatermark} aria-label="Watermark" />
          <span className="flex items-center gap-1.5">
            <Droplet className="h-3.5 w-3.5 text-amber" /> Watermark
          </span>
        </label>
        {/* No Print button. This app has no @media print stylesheet, so window.print() would emit the
            whole admin shell — sidebar, wizard, and this very toolbar — wrapped around the drawing.
            The PDF export is the sanctioned path and produces a strictly better artefact. */}
        <Button
          size="sm"
          onClick={downloadPdf}
          disabled={busy}
          className="gap-1.5 bg-gradient-to-r from-amber to-amber-light text-white border-0"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Drawing PDF
        </Button>
      </div>

      {/* THE SHEET. `relative` so the watermark can overlay it, and the watermark lives INSIDE this
          ref'd node — that is the whole feature: with the toggle on it must appear in the DOWNLOADED
          PDF, not just on screen. Colours written here are literal hex (see the file header).
          ── `light` IS LOAD-BEARING, NOT COSMETIC ───────────────────────────────────────────────
          app/layout.tsx renders <html class="dark">, so every theme token inside this white sheet
          would otherwise resolve to the DARK palette — `--foreground` is a near-white
          (src/index.css:16), which paints the drawing's wall labels and dimension text WHITE ON
          WHITE. The drawing SVGs (FloorPreview / Elevations) paint with hsl(var(--…)) tokens, so
          they follow whatever palette is in scope. The `light` class (src/index.css:80) re-binds the
          tokens inside this subtree to the light palette — dark ink on white paper — which fixes the
          sheet on screen AND fixes the colours the PDF exporter flattens out of it. */}
      <div
        ref={sheetRef}
        className="light relative rounded-xl p-4"
        style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
      >
        {watermark && <DrawingWatermark />}

        {/* CAD-style title block — one compact header row. */}
        <div
          className="mb-4 flex flex-wrap items-end justify-between gap-2 pb-3"
          style={{ borderBottom: "2px solid #0f172a" }}
        >
          <div>
            <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 800, letterSpacing: "0.02em" }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#0f172a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {COMPANY.legalName}
            </div>
            {/* Empty until the post-mount effect runs — see `today`. */}
            <div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>{today}</div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
