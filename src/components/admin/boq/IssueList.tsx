"use client";

/**
 * VALIDATION (spec §10). Errors first, and never collapsed.
 *
 * An ERROR here is not cosmetic: `missing_unit_weight` / `missing_rate` / `unknown_material` all mean
 * a line priced at ZERO, so the grand total on the Summary tab is UNDERSTATED. The whole point of
 * this list — and of the destructive count badge the panel paints onto the tab trigger — is that a
 * quotation can never be sent while one of these is open without somebody having seen it.
 *
 * `refs` are the take-off / line ids the issue points at; they are printed verbatim because they are
 * exactly what the admin types into the Detailed BOQ's filter to find the offending row.
 */

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BoqIssue } from "@/lib/boq/types";

import { SECTION_META } from "./boqShared";

function IssueCard({ issue }: { issue: BoqIssue }) {
  const isError = issue.severity === "error";

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isError ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50",
      )}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-[12px] font-bold", isError ? "text-red-900" : "text-amber-900")}>
              {issue.message}
            </span>
            <code
              className={cn(
                "rounded px-1 py-0.5 text-[9px] font-semibold",
                isError ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
              )}
            >
              {issue.code}
            </code>
            {issue.section && (
              <span className="rounded bg-white/70 px-1 py-0.5 text-[9px] text-slate-600">
                {SECTION_META[issue.section].label}
              </span>
            )}
          </div>

          {issue.hint && (
            <p className={cn("mt-1 text-[10.5px] leading-snug", isError ? "text-red-800" : "text-amber-800")}>
              {issue.hint}
            </p>
          )}

          {issue.refs.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {issue.refs.map((ref) => (
                <code
                  key={ref}
                  className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[9px] text-slate-600"
                  title="Take-off line id — search for it in the Detailed BOQ"
                >
                  {ref}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IssueList({ issues }: { issues: BoqIssue[] }) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <div className="text-[13px] font-bold text-emerald-900">All checks passed</div>
          <p className="text-[11px] leading-snug text-emerald-800">
            Every material resolved against the Material Master, every member has a unit weight and a rate, no
            shared wall was counted twice and no opening exceeds its wall. This BOQ is safe to quote from.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            {errors.length} error{errors.length === 1 ? "" : "s"} — these lines price at ₹0, so the grand total is
            understated
          </h4>
          <div className="space-y-2">
            {errors.map((issue, i) => (
              <IssueCard key={`${issue.code}-${issue.refs.join("|")}-${i}`} issue={issue} />
            ))}
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {warnings.length} warning{warnings.length === 1 ? "" : "s"} — advisory, they do not block the quotation
          </h4>
          <div className="space-y-2">
            {warnings.map((issue, i) => (
              <IssueCard key={`${issue.code}-${issue.refs.join("|")}-${i}`} issue={issue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default IssueList;
