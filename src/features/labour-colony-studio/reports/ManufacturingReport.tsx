"use client";

/**
 * LABOUR COLONY STUDIO — manufacturing report.
 *
 * The shop-floor view of the studio: a picker across every fabrication schedule (member list, cutting
 * list, bolt / nut / washer, plate, weld, connection, truss, staircase, railing, footing, column, beam,
 * weight summary and dispatch packing list), rendering the chosen one as a grouped table with section
 * subtotals, a grand total and a per-schedule Excel export.
 *
 * Reconciliation is the point of this screen, so it is never hidden: whenever a schedule's PLACEMENT
 * count (members the model positioned) disagrees with the PRICED piece count on the BOQ line, the
 * difference is printed both in the row's own Remark column and in a reconciliation panel above the
 * table. The priced BOQ always remains the billed quantity — nothing here re-prices or re-quantifies.
 *
 * Columns, totals and Excel rows all come from the shared registry in `reportTables.ts`, so the
 * exported workbook is always the table on screen.
 */

import * as React from "react";
import { AlertTriangle, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";
import type { BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { ColonyDrawingMeta, ColonyModel } from "../model/types";
import { buildReportTables, formatCell, type ReportTable, type ReportTableId } from "./reportTables";

export interface ManufacturingReportProps {
  model: ColonyModel;
  boqResult: BoqResult | null;
  civil: CivilWorkResult | null;
  result: LabourColonyResult;
  meta: ColonyDrawingMeta;
}

/** Excel file stem, prefixed with the drawing number so a downloaded file is traceable to a revision. */
function fileNameOf(table: ReportTable, meta: ColonyDrawingMeta): string {
  const dwg = (meta.drawingNumber ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return dwg ? `${table.fileStem}-${dwg}` : table.fileStem;
}

/**
 * Excel rejects a worksheet name containing `: \ / ? * [ ]` (xlsx's `check_ws_name` THROWS), and caps
 * it at 31 characters. Several registry titles legitimately carry those characters — e.g. "Footing /
 * foundation schedule" — so the title is sanitised here rather than being restricted upstream, where
 * it is display copy.
 */
function sheetNameOf(title: string): string {
  const safe = title
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31)
    .trim();
  return safe || "Schedule";
}

export function ManufacturingReport({ model, boqResult, civil, result, meta }: ManufacturingReportProps) {
  const { toast } = useToast();
  const tables = React.useMemo(() => buildReportTables(model, boqResult, civil), [model, boqResult, civil]);
  const [activeId, setActiveId] = React.useState<ReportTableId>("member-list");

  const active = React.useMemo(
    () => tables.find((t) => t.id === activeId) ?? tables[0] ?? null,
    [tables, activeId],
  );

  // Picker options, kept in registry order and grouped by discipline.
  const groups = React.useMemo(() => {
    const out: { group: string; tables: ReportTable[] }[] = [];
    for (const t of tables) {
      const last = out.find((g) => g.group === t.group);
      if (last) last.tables.push(t);
      else out.push({ group: t.group, tables: [t] });
    }
    return out;
  }, [tables]);

  const handleExport = React.useCallback(() => {
    if (!active || active.empty) return;
    const fileStem = fileNameOf(active, meta);
    try {
      exportToExcel(active.excelRows, fileStem, sheetNameOf(active.title));
      toast({
        title: `${active.title} exported`,
        description: `${active.rowCount} row${active.rowCount === 1 ? "" : "s"} written to ${fileStem}.xlsx`,
      });
    } catch (err) {
      toast({
        title: "Excel export failed",
        description: err instanceof Error ? err.message : "The workbook could not be generated.",
        variant: "destructive",
      });
    }
  }, [active, meta, toast]);

  if (!active) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No fabrication schedules are available for this model yet.
        </CardContent>
      </Card>
    );
  }

  const hasBoq = !!boqResult && boqResult.lines.length > 0;
  const colCount = active.headers.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Manufacturing report</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {meta.projectName || model.meta.projectName}
              {meta.drawingNumber ? ` · ${meta.drawingNumber}` : ""}
              {meta.revision ? ` Rev ${meta.revision}` : ""}
              {" · "}
              {model.meta.floors} floor{model.meta.floors === 1 ? "" : "s"} ·{" "}
              {result.area.builtUpTotalSqm.toFixed(1)} sqm built-up ·{" "}
              {result.weight.totalTonnes.toFixed(2)} t
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={active.id} onValueChange={(v) => setActiveId(v as ReportTableId)}>
              <SelectTrigger className="w-[280px]" aria-label="Select fabrication schedule">
                <SelectValue placeholder="Select a schedule" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel>{g.group}</SelectLabel>
                    {g.tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                        {t.empty ? " (empty)" : ` (${t.rowCount})`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={active.empty}
              title={active.empty ? "Nothing to export in this schedule" : `Export ${active.title} to Excel`}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Tab strip — the same schedules as the select, for fast switching on wide screens. */}
        <div className="-mx-1 hidden flex-wrap gap-1 lg:flex">
          {tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                t.id === active.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
                t.empty && t.id !== active.id && "opacity-60",
              )}
            >
              {t.title}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{active.note}</span>
        </p>

        {!hasBoq && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              No priced Material BOQ is loaded. Geometry-derived schedules (plates, bolts, welds,
              connections) are still available, but member quantities, weights and reconciliation
              require the priced BOQ.
            </span>
          </div>
        )}

        {active.remarks.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Reconciliation &amp; engineering remarks
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {active.remarks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] opacity-80">
              The priced BOQ remains the billed quantity. Differences above are modelling / detailing
              gaps and are reported, not adjusted.
            </p>
          </div>
        )}

        {active.empty ? (
          <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            {active.emptyReason}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {active.headers.map((h, i) => (
                    <TableHead key={h} className={cn("whitespace-nowrap", active.aligns[i] === "right" && "text-right")}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.sections.map((section) => (
                  <React.Fragment key={section.key || "all"}>
                    {section.key && (
                      <TableRow className="bg-muted/60 hover:bg-muted/60">
                        <TableCell colSpan={colCount} className="py-1.5 text-xs font-semibold uppercase tracking-wide">
                          {section.key}
                        </TableCell>
                      </TableRow>
                    )}
                    {section.rows.map((cells, ri) => (
                      <TableRow key={`${section.key}-${ri}`}>
                        {cells.map((c, ci) => (
                          <TableCell
                            key={ci}
                            className={cn(
                              "whitespace-nowrap text-xs",
                              active.aligns[ci] === "right" && "text-right tabular-nums",
                            )}
                          >
                            {formatCell(c, active.decimals[ci])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {section.totals && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {section.totals.map((c, ci) => (
                          <TableCell
                            key={ci}
                            className={cn(
                              "whitespace-nowrap text-xs font-medium",
                              active.aligns[ci] === "right" && "text-right tabular-nums",
                            )}
                          >
                            {c == null ? "" : formatCell(c, active.decimals[ci])}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
              {active.grand && (
                <TableFooter>
                  <TableRow>
                    {active.grand.map((c, ci) => (
                      <TableCell
                        key={ci}
                        className={cn(
                          "whitespace-nowrap text-xs font-semibold",
                          active.aligns[ci] === "right" && "text-right tabular-nums",
                        )}
                      >
                        {c == null ? "" : formatCell(c, active.decimals[ci])}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}

        {!active.empty && (
          <p className="text-[11px] text-muted-foreground">
            {active.rowCount} row{active.rowCount === 1 ? "" : "s"} · lengths in metres, weights in
            kilograms · quantities read from the priced BOQ and civil work result, never recomputed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ManufacturingReport;
