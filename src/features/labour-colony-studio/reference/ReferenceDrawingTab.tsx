"use client";

/**
 * LABOUR COLONY CALCULATOR — REFERENCE DRAWING tab.
 *
 * The admin surface for the reference issue: a consultant-style General Arrangement sheet (plans,
 * four elevations, the door / window / ventilator schedule, notes and a full CAD title block) plus
 * the complete BILL OF MATERIALS naming the exact model of every component — how much PUF panel,
 * which C section the rafter purlin is, which MS pipe sits on it, how many bolts, nuts and washers.
 *
 * ADDITIVE: it reads the live calculation, the priced Material BOQ, the priced civil result and the
 * shared engineering model, and changes none of them. When the priced BOQ belongs to a previous
 * configuration the tab refuses to print its numbers at all — it drops back to the live take-off and
 * says so, rather than issuing a drawing whose schedule quietly describes a different building.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Droplet, FileSpreadsheet, Loader2, Printer, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { exportSheetToPdf, formatBytes } from "@/lib/pdf/sheetPdf";
import { exportToExcel } from "@/lib/exportUtils";
import type { BoqResult } from "@/lib/boq/types";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { buildRoomFloorPlan } from "@/lib/quotation/roomFloorPlan";

import { useColonyStudioModel } from "../model/useColonyStudioModel";
import { ReferenceGASheet } from "./ReferenceGASheet";
import { ReferenceBomSheet } from "./ReferenceBomSheet";
import { RELEASED_FOR, type ReferenceTitleBlockMeta, type ReleasedFor } from "./ReferenceTitleBlock";
import {
  buildBracingNote, buildEnvelopeCallouts, buildMaterialRegister, buildOpeningSchedule,
} from "./referenceRegister";

export interface ReferenceDrawingTabProps {
  result: LabourColonyResult;
  civil?: CivilWorkResult | null;
  boqResult?: BoqResult | null;
  projectName?: string;
  clientName?: string;
  location?: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function ReferenceDrawingTab({
  result, civil = null, boqResult = null, projectName, clientName, location,
}: ReferenceDrawingTabProps) {
  const { model, boqStale } = useColonyStudioModel({ result, civil, boqResult });

  /* A stale priced BOQ describes a PREVIOUS colony. The schedules and the bill of materials are the
   * whole point of this sheet, so they fall back to the live model rather than print numbers that
   * belong to a building this drawing is not of. */
  const boq = boqStale ? null : boqResult;

  const floors = Math.max(1, model.meta.floors);
  const geoms = useMemo(
    () => Array.from({ length: floors }, (_, f) => buildRoomFloorPlan(result, result.config.floorPlan, f)),
    [result, floors],
  );

  const openings = useMemo(() => buildOpeningSchedule(model, boq), [model, boq]);
  const callouts = useMemo(() => buildEnvelopeCallouts(model, result, boq), [model, result, boq]);
  const bracing = useMemo(() => buildBracingNote(model, result, boq), [model, result, boq]);
  const register = useMemo(
    () => buildMaterialRegister(model, boq, civil, openings, bracing),
    [model, boq, civil, openings, bracing],
  );

  /* ---- title-block state -------------------------------------------------------------------- */
  const [client, setClient] = useState(clientName ?? "");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [revision, setRevision] = useState("0");
  const [sheet, setSheet] = useState("1");
  const [scale, setScale] = useState("NTS");
  const [releasedFor, setReleasedFor] = useState<ReleasedFor>("Preliminary");
  const [designedBy, setDesignedBy] = useState("");
  const [drawnBy, setDrawnBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [busy, setBusy] = useState(false);

  /** Today's date is browser-only — seeding it in useState would desync the server render. */
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }));
  }, []);

  const project = projectName || result.config.projectName || "Labour Colony";
  const where = location || result.config.location || "";

  /* The TOTAL colony extent — verandas and staircases included — read from the ground-floor plan
   * geometry, which is exactly what the plan and the elevations dimension. The room-block footprint
   * (`result.area.footprintLengthM`) is a different, smaller number and belongs in the building-data
   * block on the sheet, labelled as such; putting it in the title block's SIZE cells would make the
   * title block disagree with the dimension lines on the same sheet. */
  const extent = useMemo(() => {
    const gf = geoms[0];
    const b = gf
      ? { x0: gf.bounds.minX, x1: gf.bounds.maxX, y0: gf.bounds.minY, y1: gf.bounds.maxY }
      : { x0: model.bounds.min.x, x1: model.bounds.max.x, y0: model.bounds.min.y, y1: model.bounds.max.y };
    return { lengthM: b.x1 - b.x0, widthM: b.y1 - b.y0, heightM: model.bounds.max.z };
  }, [geoms, model.bounds]);

  const meta: ReferenceTitleBlockMeta = useMemo(() => ({
    projectName: project,
    clientName: client,
    location: where,
    title: "General Arrangement Layout",
    drawingNumber: drawingNumber || `LC-GA-${String(floors)}F-01`,
    revision,
    scale,
    sheet,
    date: today,
    releasedFor,
    designedBy, drawnBy, checkedBy, approvedBy,
    lengthLabel: `${extent.lengthM.toFixed(2)} M`,
    widthLabel: `${extent.widthM.toFixed(2)} M`,
    heightLabel: `${extent.heightM.toFixed(2)} M`,
  }), [
    project, client, where, drawingNumber, floors, revision, scale, sheet, today, releasedFor,
    designedBy, drawnBy, checkedBy, approvedBy, extent,
  ]);

  const sheetRef = useRef<HTMLDivElement>(null);

  /* ---- exports ------------------------------------------------------------------------------ */
  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      const r = await exportSheetToPdf(sheetRef.current, {
        filename: `labour-colony-reference-drawing-${slug(project) || "colony"}`,
        /* Break between whole views and whole schedule tables — a plan, an elevation or a bill-of-
         * materials group must never be sliced across a page. */
        breakSelector: ".reference-drawing-block, table, tbody > tr",
        format: "png",
        dpi: 300,
        minDpi: 220,
        targetBytes: 12_000_000,
      });
      toast({
        title: r.truncated ? "Reference drawing downloaded — INCOMPLETE" : "Reference drawing downloaded",
        description: `${r.pages} page${r.pages > 1 ? "s" : ""} · ${formatBytes(r.bytes)} · ${r.dpi} DPI${r.truncated ? " — the sheet is longer than the page cap and was cut short." : ""}`,
        variant: r.truncated ? "destructive" : undefined,
      });
    } catch (err: unknown) {
      console.error("Reference drawing PDF failed:", err);
      const msg = err instanceof Error ? err.message : "";
      toast({ title: "Could not generate the drawing PDF", description: msg ? msg.slice(0, 140) : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const exportRegister = () => {
    const rows = register.groups.flatMap((g) =>
      g.rows.map((r) => ({
        Group: g.title,
        Item: r.item,
        "Exact model": r.model,
        Unit: r.uom,
        Qty: r.qty,
        "Unit weight (kg)": r.unitWeightKg ?? "",
        "Total weight (kg)": r.totalWeightKg ?? "",
        "Order note": r.purchase,
        Source: r.source,
      })),
    );
    if (rows.length === 0) {
      toast({ title: "Nothing to export yet", description: "Price the Material BOQ to fill the register.", variant: "destructive" });
      return;
    }
    exportToExcel(rows, `labour-colony-bill-of-materials-${slug(project) || "colony"}`, "Bill of materials");
    toast({ title: "Bill of materials exported", description: `${rows.length} rows across ${register.groups.length} groups.` });
  };

  const totalRows = register.groups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="space-y-4">
      {/* ---------------- header + actions ---------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Ruler className="mt-0.5 h-5 w-5 text-amber" />
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">Reference Drawing &amp; Bill of Materials</h3>
            <p className="text-xs text-muted-foreground">
              General Arrangement sheet — {floors} floor plan{floors > 1 ? "s" : ""}, four elevations, the opening
              schedule and the title block — plus {totalRows.toLocaleString("en-IN")} bill-of-materials rows naming the
              exact model of every component.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-xs font-medium">
            <Switch checked={watermark} onCheckedChange={setWatermark} aria-label="Watermark" />
            <span className="flex items-center gap-1.5"><Droplet className="h-3.5 w-3.5 text-amber" /> Watermark</span>
          </label>
          <Button variant="outline" size="sm" onClick={exportRegister} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Bill of materials → Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={downloadPdf} disabled={busy} className="gap-1.5 border-0 bg-gradient-to-r from-amber to-amber-light text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download drawing PDF
          </Button>
        </div>
      </div>

      {/* ---------------- stale priced BOQ ---------------- */}
      {boqStale && (
        <div className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Priced Material BOQ is out of date — the bill of materials is showing take-off values</div>
            <p className="mt-0.5 text-xs">
              The colony configuration changed after the Material BOQ was last priced, so its purchase register and
              cutting list belong to the previous building. They are withheld from this sheet rather than printed
              against the wrong drawing. Re-open the <span className="font-medium">Material BOQ</span> tab to re-price,
              then return — the schedules and the register will fill in automatically.
            </p>
          </div>
        </div>
      )}
      {!boqResult && (
        <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Open the <span className="font-medium">Material BOQ</span> tab once to price the take-off. The drawing itself is
          complete without it; the purchase register and cutting list fill in from that tab&rsquo;s own priced result, so
          this sheet can never print a different quantity than the BOQ shows.
        </div>
      )}

      {/* ---------------- title-block editor (never printed; only its values are) ---------------- */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title block</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Client" value={client} onChange={setClient} placeholder="Client / EPC contractor" />
          <Field label="Drawing no." value={drawingNumber} onChange={setDrawingNumber} placeholder={`LC-GA-${floors}F-01`} />
          <Field label="Revision" value={revision} onChange={setRevision} placeholder="0" />
          <Field label="Sheet" value={sheet} onChange={setSheet} placeholder="1" />
          <Field label="Scale" value={scale} onChange={setScale} placeholder="NTS" />
          <div className="space-y-1">
            <Label className="text-xs">Released for</Label>
            <Select value={releasedFor} onValueChange={(v) => setReleasedFor(v as ReleasedFor)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELEASED_FOR.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Designed by (DSGN)" value={designedBy} onChange={setDesignedBy} />
          <Field label="Drawn by (DRWN)" value={drawnBy} onChange={setDrawnBy} />
          <Field label="Checked by (CHKD)" value={checkedBy} onChange={setCheckedBy} />
          <Field label="Approved by (APPD)" value={approvedBy} onChange={setApprovedBy} />
        </div>
      </div>

      {/* ---------------- the sheet ---------------- */}
      <div ref={sheetRef} className="light overflow-x-auto rounded-xl border border-border" style={{ background: "#ffffff" }}>
        <ReferenceGASheet
          model={model}
          result={result}
          geoms={geoms}
          openings={openings}
          callouts={callouts}
          bracing={bracing}
          meta={meta}
          watermark={watermark}
        />
        <ReferenceBomSheet register={register} />
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input className="h-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "—"} />
    </div>
  );
}

export default ReferenceDrawingTab;
