"use client";

import { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { Layers, Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { captureElementToCanvas } from "@/lib/pdf/sanitizeColors";
import { addLegalFooter } from "@/lib/pdfFooter";
import { ConstructionFloorPlan } from "./ConstructionFloorPlan";
import { PlinthBeamLayout } from "./PlinthBeamLayout";
import { PlinthBeamSection } from "./PlinthBeamSection";
import { ConstructionNotes } from "./ConstructionNotes";
import { buildConstructionPlan, buildBeamSchedule, constructionNotes } from "@/lib/quotation/labourColonyPlan";
import { type LabourColonyConfig, type FloorCount } from "@/lib/quotation/labourColony";
import { type CivilWorkResult } from "@/lib/quotation/labourColonyCivil";

const FLOOR_LABELS = ["GROUND FLOOR PLAN", "FIRST FLOOR PLAN", "SECOND FLOOR PLAN"];

/**
 * Construction-drawing sheet for the Labour Colony Calculator (spec §6/§7):
 * a professional, dimensioned civil drawing set (architectural floor plan +
 * plinth-beam layout + beam schedule + plinth-beam section + notes), driven live
 * by the structure/civil config, with print and paginated PDF export.
 */
export function ConstructionDrawingTab({
  config,
  rooms,
  floors,
  civil,
}: {
  config: LabourColonyConfig;
  rooms: number;
  floors: FloorCount;
  civil: CivilWorkResult;
}) {
  const [floor, setFloor] = useState(0);
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const rpf = Math.max(1, Math.ceil(rooms / Math.max(1, floors)));
  const plan = useMemo(
    () =>
      buildConstructionPlan(config, {
        roomsPerFloor: rpf,
        startRoomNo: floor * rpf + 1,
        floorLabel: FLOOR_LABELS[Math.min(floor, 2)],
      }),
    [config, rpf, floor],
  );
  const section = civil.foundation.section;
  const schedule = useMemo(() => buildBeamSchedule(plan, section), [plan, section]);
  const notes = useMemo(() => constructionNotes(section, floors), [section, floors]);

  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      const canvas = await captureElementToCanvas(sheetRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297, m = 8;
      const imgW = pageW - m * 2;
      const fullImgH = (canvas.height * imgW) / canvas.width;
      const pageImgH = pageH - m * 2;

      if (fullImgH <= pageImgH) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", m, m, imgW, fullImgH);
      } else {
        // paginate: slice the tall canvas into A4-height strips
        const pxPerMm = canvas.height / fullImgH;
        const sliceHpx = Math.floor(pageImgH * pxPerMm);
        let sy = 0, first = true;
        while (sy < canvas.height) {
          const hpx = Math.min(sliceHpx, canvas.height - sy);
          const strip = document.createElement("canvas");
          strip.width = canvas.width;
          strip.height = hpx;
          const ctx = strip.getContext("2d");
          if (!ctx) break;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, strip.width, strip.height);
          ctx.drawImage(canvas, 0, sy, canvas.width, hpx, 0, 0, canvas.width, hpx);
          if (!first) pdf.addPage();
          pdf.addImage(strip.toDataURL("image/png"), "PNG", m, m, imgW, hpx / pxPerMm);
          sy += hpx;
          first = false;
        }
      }
      addLegalFooter(pdf);
      pdf.save(`labour-colony-civil-drawing-${(config.projectName || "colony").replace(/\s+/g, "-").toLowerCase() || "colony"}.pdf`);
      toast({ title: "Drawing PDF downloaded" });
    } catch (err: unknown) {
      console.error("Construction drawing PDF failed:", err);
      const msg = err instanceof Error ? err.message : "";
      toast({ title: "Could not generate drawing PDF", description: msg ? msg.slice(0, 140) : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber" />
          <span className="font-display font-bold text-sm">Civil Construction Drawing</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {floors > 1 && (
            <Select value={String(floor)} onValueChange={(v) => setFloor(Number(v))}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: floors }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{FLOOR_LABELS[Math.min(i, 2)]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="h-4 w-4" /> Print</Button>
          <Button size="sm" onClick={downloadPdf} disabled={busy} className="gap-1.5 bg-gradient-to-r from-amber to-amber-light text-white border-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Drawing PDF
          </Button>
        </div>
      </div>

      <div ref={sheetRef} id="lc-construction-sheet" className="space-y-6 bg-white p-2 rounded-2xl">
        <ConstructionFloorPlan plan={plan} />
        <PlinthBeamLayout plan={plan} schedule={schedule} />
        <PlinthBeamSection foundation={civil.foundation} />
        <ConstructionNotes notes={notes} section={section} floors={floors} />
      </div>
    </div>
  );
}
