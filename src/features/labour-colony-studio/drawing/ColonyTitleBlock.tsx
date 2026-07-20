"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — CAD TITLE BLOCK.
 *
 * The drawing-register block that closes the fabrication set: project / client / location, drawing
 * number, revision, scale, date, the drawn-checked-approved trio and the issue status — every value
 * read from `ColonyDrawingMeta`, nothing invented.
 *
 * It reuses the colony drawing chrome rather than re-implementing it:
 *   • <ApprovalStamp />     — the status banner, revision-control block, engineer verification
 *                             checklist and the printable sign-off strip;
 *   • <DrawingWatermark />  — the tiled diagonal NOT-FOR-CONSTRUCTION overlay, sitting INSIDE the
 *                             block so print, screenshot and the PDF export all carry it.
 *
 * Literal-hex inline colours only (html2canvas cannot resolve Tailwind's oklch tokens); layout-only
 * utility classes are fine.
 */

import { ApprovalStamp } from "@/components/admin/labour-colony/ApprovalStamp";
import { DrawingWatermark } from "@/components/admin/labour-colony/DrawingWatermark";
import {
  todayDDMMYYYY, type DrawingStatus, type RevisionInfo, type SignOffDetails,
} from "@/components/admin/labour-colony/signOff";
import type { ColonyDrawingMeta } from "@/features/labour-colony-studio/model/types";

const COL = {
  ink: "#0f172a",
  slate: "#334155",
  note: "#64748b",
  rule: "#94a3b8",
  line: "#cbd5e1",
  paper: "#ffffff",
  wash: "#f8fafc",
};

export interface ColonyTitleBlockProps {
  meta: ColonyDrawingMeta;
  /** Engineering warnings raised by the model — printed as outstanding items on the stamp. */
  warnings?: string[];
  /** Explicit revision control. Derived from `meta` when omitted. */
  revision?: RevisionInfo;
  /** Explicit sign-off names. Derived from `meta` when omitted. */
  signOff?: SignOffDetails;
}

/** Map a free-text meta status onto the four controlled drawing statuses. */
export function statusFromMeta(status: string | undefined): DrawingStatus {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "approved" || s.startsWith("approve")) return "approved";
  if (s.startsWith("disapprove")) return "disapproved";
  if (s.startsWith("reject")) return "rejected";
  return "revision";
}

/** Build the revision-control block the stamp prints, from the drawing register metadata. */
export function revisionFromMeta(meta: ColonyDrawingMeta): RevisionInfo {
  return {
    status: statusFromMeta(meta.status),
    revNo: meta.revision && meta.revision.trim() ? meta.revision.trim() : "R0",
    revDate: meta.date && meta.date.trim() ? meta.date.trim() : todayDDMMYYYY(),
    revDescription: meta.drawingNumber ? `Issue of drawing ${meta.drawingNumber}` : "First issue",
    remarks: "",
  };
}

/** Build the sign-off strip values from the drawing register metadata. */
export function signOffFromMeta(meta: ColonyDrawingMeta): SignOffDetails {
  return {
    designedBy: meta.drawnBy ?? "",
    checkedBy: meta.checkedBy ?? "",
    engineerName: "",
    engineerLicence: "",
    approvedBy: meta.approvedBy ?? "",
    approvedByDesignation: "",
    date: meta.date && meta.date.trim() ? meta.date.trim() : todayDDMMYYYY(),
  };
}

/** One labelled cell of the title block grid. */
function Cell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded"
      style={{ border: `1px solid ${COL.rule}`, background: COL.paper, gridColumn: wide ? "span 2" : undefined }}
    >
      <div
        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
        style={{ borderBottom: `1px solid ${COL.line}`, background: COL.wash, color: COL.note }}
      >
        {label}
      </div>
      <div className="break-words px-2 py-1 text-[11px] font-semibold" style={{ color: COL.ink, minHeight: 22 }}>
        {value || "—"}
      </div>
    </div>
  );
}

export function ColonyTitleBlock({ meta, warnings, revision, signOff }: ColonyTitleBlockProps) {
  const rev = revision ?? revisionFromMeta(meta);
  const names = signOff ?? signOffFromMeta(meta);
  const approved = rev.status === "approved";

  return (
    <div className="relative" style={{ background: COL.paper }}>
      {/* the watermark sits INSIDE the block, so every export path carries it */}
      <DrawingWatermark text={approved ? "APPROVED ISSUE" : "NOT FOR CONSTRUCTION"} opacity={0.07} />

      <div className="relative" style={{ zIndex: 20 }}>
        {/* ── the CAD title block grid ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ border: `2px solid ${COL.ink}`, background: COL.paper }}>
          <div
            className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2"
            style={{ borderBottom: `1px solid ${COL.line}` }}
          >
            <h3 className="text-sm font-bold tracking-wide" style={{ color: COL.ink }}>TITLE BLOCK — DRAWING REGISTER</h3>
            <div className="text-[11px]" style={{ color: COL.note }}>
              {meta.drawingNumber ?? "—"} · Rev {rev.revNo} · {meta.scale ?? "NTS"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Cell label="Project" value={meta.projectName} wide />
            <Cell label="Client" value={meta.clientName ?? ""} />
            <Cell label="Location" value={meta.location ?? ""} />

            <Cell label="Drawing no." value={meta.drawingNumber ?? ""} />
            <Cell label="Revision" value={rev.revNo} />
            <Cell label="Scale" value={meta.scale ?? "NTS"} />
            <Cell label="Date" value={names.date} />

            <Cell label="Drawn by" value={meta.drawnBy ?? ""} />
            <Cell label="Checked by" value={meta.checkedBy ?? ""} />
            <Cell label="Approved by" value={meta.approvedBy ?? ""} />
            <Cell label="Status" value={meta.status ?? (approved ? "Approved" : "Not for construction")} />
          </div>

          <p className="mt-3 text-[10px] leading-snug" style={{ color: COL.slate }}>
            All dimensions in metres unless noted; enlarged details are in millimetres. Build to written dimensions —
            do not scale the drawings. Sections, quantities and footing sizes shown on this set are read from the
            priced bill of quantities; the drawings and the BOQ cannot disagree.
          </p>
        </div>

        {/* ── the approval stamp + printable sign-off strip ──────────────────────────────── */}
        <div className="mt-3">
          <ApprovalStamp projectName={meta.projectName} warnings={warnings} signOff={names} revision={rev} />
        </div>
      </div>
    </div>
  );
}
