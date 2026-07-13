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
import { ColumnLayoutPlan } from "./ColumnLayoutPlan";
import { BeamJunctionDetail } from "./BeamJunctionDetail";
import { BarBendingSchedule } from "./BarBendingSchedule";
import { ApprovalStamp, NotForConstructionWatermark } from "./ApprovalStamp";
import { ColumnReinforcementDetail } from "./ColumnReinforcementDetail";
import { BeamSectionDetail } from "./BeamSectionDetail";
import { FootingLayoutPlan } from "./FootingLayoutPlan";
import { FootingScheduleDetail } from "./FootingScheduleDetail";
import { buildColumnMarks } from "@/lib/quotation/labourColonyRebar";
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

  // Columns are set out on the ARCHITECTURAL grid (plan.colXs × rowYs) — and the civil engine is
  // now handed that SAME grid, so `civil.foundation.columnCount` is this same number by
  // construction. The rebar design and BBS come straight from the engine: one source, no recompute,
  // nothing to drift.
  const columns = useMemo(() => buildColumnMarks(plan.colXs, plan.rowYs), [plan.colXs, plan.rowYs]);
  const rebar = civil.foundation.rebar;
  const bbs = civil.foundation.bbs;
  // Load-differentiated footings (F1/F2/F3) — the SAME types the BOQ prices.
  const footingTypes = civil.foundation.footingTypes;

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

      {/* ONE grid — the drawing and the BOQ count the same columns by construction. */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
        <b>Single architectural grid.</b> {plan.colXs.length} × {plan.rowYs.length} ={" "}
        <b>{columns.length} columns</b> — and the Civil BOQ prices exactly{" "}
        <b>{civil.foundation.footingCount} footings, {civil.foundation.pedestalCount} pedestals and{" "}
        {civil.foundation.columnCount} columns</b> from that same grid. Steel is taken off the bar-bending
        schedule below ({civil.foundation.bbs.totalKg} kg = {civil.foundation.bbs.totalTonnes} t), not a
        kg/cum rule of thumb.
      </div>

      {/* Footing types the BOQ actually prices — the schedule and the quantities are one thing. */}
      {footingTypes.length > 0 && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-xs text-sky-900">
          <b>Load-differentiated footings.</b>{" "}
          {footingTypes.map((t) => `${t.mark} (${t.kind}) ${t.count} nos @ ${Math.round(t.sideM * 1000)}×${Math.round(t.sideM * 1000)}×${Math.round(t.depthM * 1000)}`).join(" · ")}
          {" "}— each sized against its own tributary load and the {footingTypes[0].sbcKnm2} kN/m² SBC, and the
          civil BOQ prices exactly these (concrete, excavation, PCC and the bar-bending schedule).
        </div>
      )}

      {/* The sheet. `relative` so the NOT-FOR-CONSTRUCTION watermark can overlay it, and the watermark
          lives INSIDE the ref'd node so it is captured in the exported PDF too. */}
      <div ref={sheetRef} id="lc-construction-sheet" className="relative space-y-6 bg-white p-2 rounded-2xl">
        <ApprovalStamp projectName={config.projectName} warnings={rebar.warnings} />

        <ConstructionFloorPlan plan={plan} />
        <ColumnLayoutPlan plan={plan} columns={columns} rebar={rebar} />

        {/* FOUNDATION — setting-out layout, then a detail per footing type */}
        <FootingLayoutPlan plan={plan} footingTypes={footingTypes} />
        <FootingScheduleDetail rebar={rebar} footingTypes={footingTypes} />

        {/* COLUMNS — the cross-section + tie zones */}
        <ColumnReinforcementDetail rebar={rebar} />

        {/* BEAMS — layout, PB1/PB2 cross-sections + stirrup zones, the through-section, junctions */}
        <PlinthBeamLayout plan={plan} schedule={schedule} />
        <BeamSectionDetail rebar={rebar} schedule={schedule} />
        <PlinthBeamSection foundation={civil.foundation} />
        <BeamJunctionDetail rebar={rebar} />

        {/* STEEL — BBS with IS 2502 shape codes + bent-bar diagrams */}
        <BarBendingSchedule bbs={bbs} rebar={rebar} counts={{
          footings: civil.foundation.footingCount,
          pedestals: civil.foundation.pedestalCount,
          beamLengthM: civil.foundation.plinthBeamLengthM,
        }} />

        <ConstructionNotes notes={notes} section={section} floors={floors} rebar={rebar} columnCount={columns.length} />

        <NotForConstructionWatermark />
      </div>
    </div>
  );
}
