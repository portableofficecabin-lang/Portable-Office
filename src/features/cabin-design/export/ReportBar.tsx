"use client";

/**
 * REPORTS (spec §6) — surfaces the EXISTING BOQ report generators (src/lib/boq/reports.ts) driven
 * by the studio's LIVE BoqResult, so Material / Weight / Cost / Cutting / Procurement reports all
 * match the current design. reports.ts (xlsx + jsPDF) is dynamic-imported on click so it never
 * enters any non-report bundle. No report logic is duplicated — this is a thin launcher.
 */

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { BoqResult } from "@/lib/boq/types";

type Job = (m: typeof import("@/lib/boq/reports"), r: BoqResult, title: string) => void | Promise<void>;

const REPORTS: { label: string; icon: "pdf" | "xls"; run: Job }[] = [
  { label: "Full BOQ (PDF)", icon: "pdf", run: (m, r, t) => m.exportBoqPdf(r, t) },
  { label: "All reports (Excel)", icon: "xls", run: (m, r, t) => m.exportAllExcel(r, t) },
  { label: "Material / BOQ (Excel)", icon: "xls", run: (m, r, t) => m.exportBoqExcel(r, t) },
  { label: "Cutting list (Excel)", icon: "xls", run: (m, r, t) => m.exportCuttingListExcel(r, t) },
  { label: "Weight report (Excel)", icon: "xls", run: (m, r, t) => m.exportWeightSummaryExcel(r, t) },
  { label: "Cost summary (Excel)", icon: "xls", run: (m, r, t) => m.exportCostSummaryExcel(r, t) },
  { label: "Procurement (Excel)", icon: "xls", run: (m, r, t) => m.exportPurchaseReportExcel(r, t) },
];

export function ReportBar({ boqResult, title }: { boqResult?: BoqResult | null; title: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  const go = async (label: string, run: Job) => {
    if (!boqResult) return;
    setBusy(label);
    try {
      const m = await import("@/lib/boq/reports");
      await run(m, boqResult, title);
    } catch (err: unknown) {
      toast({ title: "Report failed", description: err instanceof Error ? err.message.slice(0, 140) : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {REPORTS.map((r) => (
        <Button key={r.label} variant="outline" size="sm" className="gap-1.5" disabled={!boqResult || busy !== null} onClick={() => go(r.label, r.run)}>
          {busy === r.label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.icon === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          {r.label}
        </Button>
      ))}
      {!boqResult && <span className="self-center text-xs text-muted-foreground">Open the Material BOQ panel below to enable reports.</span>}
    </div>
  );
}
