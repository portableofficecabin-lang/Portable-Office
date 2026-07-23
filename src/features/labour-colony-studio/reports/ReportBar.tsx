"use client";

/**
 * LABOUR COLONY STUDIO — report / export toolbar.
 *
 * One row of one-click exports over the fabrication schedules: member list, cutting list, bolt + nut,
 * plate, weld, connection, truss + staircase, footing, weight summary, dispatch packing list and the
 * six PUF panel bottom-lock schedules as Excel, plus the composed fabrication drawing set as a
 * paginated PDF.
 *
 * Every Excel export is generated from the SAME registry the on-screen ManufacturingReport renders
 * (`reportTables.ts`), so a downloaded workbook always matches what the shop was shown — including
 * the reconciliation Remark columns, which are exported rather than stripped.
 *
 * The PDF button rasterises the engineering-sheet container through `exportColonyDrawingSet`, i.e.
 * the shared `exportSheetToPdf` → oklch-safe capture pipeline. It is disabled outright when the host
 * passes no `sheetRef`, which is how a host says "the drawing sheets are not on this screen at all"
 * — there is nothing to capture, so the button explains itself rather than failing on click.
 */

import * as React from "react";
import {
  Anchor, Boxes, FileSpreadsheet, FileText, Hammer, Layers, Loader2, Package, Ruler, Scissors, Weight, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportUtils";
import type { BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { ColonyDrawingMeta, ColonyModel } from "../model/types";
import { exportColonyDrawingSet } from "../export/exportDrawingSet";
import { buildReportTables, type ReportTable, type ReportTableId } from "./reportTables";

export interface ReportBarProps {
  model: ColonyModel;
  boqResult: BoqResult | null;
  civil: CivilWorkResult | null;
  result: LabourColonyResult;
  meta: ColonyDrawingMeta;
  /** The composed engineering-sheet container to rasterise into the drawing-set PDF. */
  sheetRef?: React.RefObject<HTMLElement | null>;
}

interface ExcelButton {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Schedules combined into one sheet, in order. */
  ids: ReportTableId[];
  fileStem: string;
  sheetName: string;
}

const EXCEL_BUTTONS: ExcelButton[] = [
  { key: "member", label: "Member list", icon: Layers, ids: ["member-list"], fileStem: "colony-member-list", sheetName: "Member list" },
  { key: "cutting", label: "Cutting list", icon: Scissors, ids: ["cutting-list"], fileStem: "colony-cutting-list", sheetName: "Cutting list" },
  { key: "bolts", label: "Bolt + nut schedule", icon: Wrench, ids: ["bolt-schedule", "nut-schedule", "washer-schedule"], fileStem: "colony-bolt-nut-washer-schedule", sheetName: "Bolts nuts washers" },
  { key: "plate", label: "Plate schedule", icon: Ruler, ids: ["plate-schedule"], fileStem: "colony-plate-schedule", sheetName: "Plate schedule" },
  { key: "weld", label: "Weld schedule", icon: Hammer, ids: ["weld-schedule"], fileStem: "colony-weld-schedule", sheetName: "Weld schedule" },
  { key: "conn", label: "Connection schedule", icon: Wrench, ids: ["connection-schedule"], fileStem: "colony-connection-schedule", sheetName: "Connections" },
  { key: "truss", label: "Truss / staircase schedule", icon: Boxes, ids: ["truss-schedule", "staircase-schedule", "railing-schedule"], fileStem: "colony-truss-staircase-schedule", sheetName: "Truss stair railing" },
  { key: "footing", label: "Footing schedule", icon: Layers, ids: ["footing-schedule"], fileStem: "colony-footing-schedule", sheetName: "Footings" },
  { key: "weight", label: "Weight summary", icon: Weight, ids: ["weight-summary"], fileStem: "colony-weight-summary", sheetName: "Weight summary" },
  { key: "dispatch", label: "Dispatch packing list", icon: Package, ids: ["dispatch-list"], fileStem: "colony-dispatch-packing-list", sheetName: "Dispatch list" },
  {
    key: "puflock",
    label: "PUF Lock",
    icon: Anchor,
    ids: [
      "puf-lock-plate-schedule",
      "puf-lock-anchor-schedule",
      "puf-lock-purlin-schedule",
      "puf-lock-weld-schedule",
      "puf-lock-panel-schedule",
      "puf-lock-ordering-summary",
    ],
    fileStem: "colony-puf-lock-schedules",
    sheetName: "PUF lock",
  },
];

/** Drawing-number suffix so a downloaded file is traceable to a drawing revision. */
function revSuffix(meta: ColonyDrawingMeta): string {
  const dwg = (meta.drawingNumber ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return dwg ? `-${dwg}` : "";
}

/**
 * Flatten one or more schedules into a single sheet. Combined exports gain a leading "Schedule"
 * column so the shop can tell the bolt rows from the nut rows, and each schedule's remarks are
 * appended as trailing note rows — a reconciliation difference must survive the export.
 */
function sheetRowsOf(tables: ReportTable[]): Record<string, string | number>[] {
  const multi = tables.length > 1;
  const out: Record<string, string | number>[] = [];
  for (const t of tables) {
    for (const row of t.excelRows) {
      out.push(multi ? { Schedule: t.title, ...row } : { ...row });
    }
    for (const remark of t.remarks) {
      out.push(multi ? { Schedule: t.title, Note: remark } : { Note: remark });
    }
  }
  return out;
}

export function ReportBar({ model, boqResult, civil, result, meta, sheetRef }: ReportBarProps) {
  const { toast } = useToast();
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const tables = React.useMemo(() => buildReportTables(model, boqResult, civil), [model, boqResult, civil]);
  const byId = React.useMemo(() => new Map(tables.map((t) => [t.id, t] as const)), [tables]);

  const handleExcel = React.useCallback((btn: ExcelButton) => {
    const picked = btn.ids.map((id) => byId.get(id)).filter((t): t is ReportTable => !!t);
    const rows = sheetRowsOf(picked);
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: `${btn.label} has no rows for this colony${boqResult ? "" : " — the priced BOQ has not been generated yet"}.`,
        variant: "destructive",
      });
      return;
    }
    try {
      exportToExcel(rows, `${btn.fileStem}${revSuffix(meta)}`, btn.sheetName);
      const dataRows = picked.reduce((a, t) => a + t.rowCount, 0);
      toast({
        title: `${btn.label} exported`,
        description: `${dataRows} row${dataRows === 1 ? "" : "s"} written to ${btn.fileStem}${revSuffix(meta)}.xlsx`,
      });
    } catch (err) {
      toast({
        title: "Excel export failed",
        description: err instanceof Error ? err.message : "The workbook could not be generated.",
        variant: "destructive",
      });
    }
  }, [byId, boqResult, meta, toast]);

  // NOTE: whether the sheet CONTAINER is mounted is deliberately NOT tracked in state. A ref does not
  // trigger a render when it is populated, so any such state is stale by construction (and the
  // dependency list exhaustive-deps would suggest, `[sheetRef]`, is wrong — a ref object's identity
  // never changes, so the effect would only ever run on mount). `handlePdf` already resolves the ref
  // at CLICK time and shows a clear toast when the sheets are not rendered yet, which is both simpler
  // and always correct — no effect, no suppression, no stale disabled state. The PRESENCE of the
  // `sheetRef` prop is a different question: it is a static contract from the host, so gating the
  // button's disabled state on it is safe and keeps a never-workable button off the Reports tab.
  const handlePdf = React.useCallback(async () => {
    const el = sheetRef?.current ?? null;
    if (!el) {
      toast({
        title: "Drawing sheets not ready",
        description: "Open the drawing set so the sheets are rendered, then export again.",
        variant: "destructive",
      });
      return;
    }
    setPdfBusy(true);
    try {
      await exportColonyDrawingSet(el, meta);
      toast({
        title: "Fabrication drawing set exported",
        description: `${meta.drawingNumber ? `${meta.drawingNumber} · ` : ""}${meta.projectName || model.meta.projectName} — PDF downloaded.`,
      });
    } catch (err) {
      toast({
        title: "PDF export failed",
        description: err instanceof Error ? err.message : "The drawing set could not be rendered to PDF.",
        variant: "destructive",
      });
    } finally {
      setPdfBusy(false);
    }
  }, [sheetRef, meta, model.meta.projectName, toast]);

  const totalRows = tables.reduce((a, t) => a + t.rowCount, 0);

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Fabrication exports
          <span className="ml-2 font-normal">
            {totalRows} scheduled row{totalRows === 1 ? "" : "s"} ·{" "}
            {result.weight.totalTonnes.toFixed(2)} t ·{" "}
            {boqResult ? "priced BOQ linked" : "no priced BOQ loaded"}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXCEL_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const rows = btn.ids.reduce((a, id) => a + (byId.get(id)?.rowCount ?? 0), 0);
          return (
            <Button
              key={btn.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExcel(btn)}
              disabled={rows === 0}
              title={rows === 0 ? `${btn.label}: no rows for this colony` : `Export ${btn.label} (${rows} rows) to Excel`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {btn.label}
              <FileSpreadsheet className="ml-2 h-3.5 w-3.5 opacity-60" />
            </Button>
          );
        })}

        <Button
          type="button"
          size="sm"
          onClick={handlePdf}
          disabled={pdfBusy || !sheetRef}
          title={
            sheetRef
              ? "Export the composed fabrication drawing set as a paginated PDF"
              : "Available on the 2D Fabrication Drawings tab — the drawing sheets must be on screen to be rendered into a PDF"
          }
        >
          {pdfBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          {pdfBusy ? "Rendering PDF…" : "Fabrication drawing set PDF"}
        </Button>
      </div>
    </div>
  );
}

export default ReportBar;
