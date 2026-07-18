"use client";

/**
 * DRAWING-SET EXPORT (spec §8).
 *
 * Wraps the composed engineering sheets in an export-ready white sheet (CAD title block + optional
 * company watermark) and produces the multi-sheet PDF via the EXISTING, proven pipeline
 * (exportSheetToPdf → captureElementToCanvas → jsPDF), paginating between `.cabin-drawing-block`
 * plates. Non-destructive: it reuses sheetPdf + DrawingWatermark rather than modifying
 * AdminDrawingTools, and adds the richer drawing register (drawing no / rev / drawn-checked-approved)
 * that the drawing set needs.
 *
 * Load-bearing constraints (same as AdminDrawingTools): literal-hex only inside the sheet, the
 * `light` class to rebind the app's dark palette, watermark ON by default, page breaks only between
 * whole `.cabin-drawing-block` sections.
 */

import { useState } from "react";
import { Download, Loader2, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { DrawingWatermark } from "@/components/admin/labour-colony/DrawingWatermark";
import { exportSheetToPdf, formatBytes } from "@/lib/pdf/sheetPdf";
import type { CabinDrawingMeta } from "@/features/cabin-design/model/types";
import { CabinTitleBlock } from "@/features/cabin-design/drawing/CabinTitleBlock";

function toFilename(meta: CabinDrawingMeta): string {
  const slug = `${meta.drawingNumber ?? "cabin"}-${meta.projectName}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return slug ? `cabin-drawing-set-${slug}` : "cabin-drawing-set";
}

export function DrawingSetSheet({ meta, children }: { meta: CabinDrawingMeta; children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const sheetRef = useState<HTMLDivElement | null>(null);
  const [ref, setRef] = sheetRef;

  const download = async () => {
    if (!ref) return;
    setBusy(true);
    try {
      const r = await exportSheetToPdf(ref, {
        filename: toFilename(meta),
        format: "png",
        dpi: 300,
        minDpi: 220,
        targetBytes: 12_000_000,
        breakSelector: ".cabin-drawing-block",
      });
      toast({
        title: r.truncated ? "Drawing set downloaded — INCOMPLETE" : "Drawing set downloaded",
        description: `${r.pages} page${r.pages > 1 ? "s" : ""} · ${formatBytes(r.bytes)} · ${r.dpi} DPI`,
        variant: r.truncated ? "destructive" : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({ title: "Could not generate drawing set", description: msg.slice(0, 140) || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-xs font-medium">
          <Switch checked={watermark} onCheckedChange={setWatermark} aria-label="Watermark" />
          <span className="flex items-center gap-1.5"><Droplet className="h-3.5 w-3.5 text-amber" /> Watermark</span>
        </label>
        <Button size="sm" onClick={download} disabled={busy} className="gap-1.5 bg-gradient-to-r from-amber to-amber-light text-white border-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Drawing Set PDF
        </Button>
      </div>

      <div ref={setRef} className="light relative rounded-xl p-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
        {watermark && <DrawingWatermark />}
        <CabinTitleBlock meta={meta} />
        {children}
      </div>
    </div>
  );
}
