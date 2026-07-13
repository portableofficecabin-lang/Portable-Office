"use client";

import { useEffect, useRef, useState } from "react";
import { statusMeta, type DrawingStatus, type RevisionInfo, type SignOffDetails } from "./signOff";

/**
 * APPROVAL STAMP + STATUS WATERMARK
 *
 * The drawing set carries an explicit APPROVAL STATUS — Approved / Disapproved / Rejected /
 * Modification-Revision required — selected in the sign-off panel. Two pieces put it on paper:
 *
 *   • <ApprovalStamp />    — the status banner at the TOP of the sheet: themed by status, carrying the
 *                            revision block (Rev no / date / description / remarks), the engineer
 *                            verification checklist and a printable CAD-style sign-off strip.
 *   • <StatusWatermark />  — a diagonal repeating overlay across the WHOLE sheet spelling the selected
 *                            status, so a printed page or an exported PDF page always carries it,
 *                            even separated from the banner.
 *
 * Both live INSIDE the exported sheet, so print, screenshot and PDF all carry them.
 *
 * html2canvas safety: every colour is a plain hex string (no oklch / Tailwind colour functions in any
 * SVG fill or stroke), no CSS filters, no backdrop-blur — the PDF export renders it faithfully.
 */

const COL = {
  ink: "#0f172a",
  slate: "#334155",
  note: "#64748b",
  rule: "#94a3b8",
  line: "#cbd5e1",
  paper: "#ffffff",
  wash: "#f8fafc",
  amber: "#d97706",
};

/** The checks a qualified structural engineer must complete and sign off before any work starts. */
const ENGINEER_CHECKS: string[] = [
  "Loads — dead, live, wind and seismic, and the load path down to the footing",
  "Soil investigation report — actual SBC at founding level (the SBC used here is an assumed INPUT)",
  "Bar sizes, spacing, laps, development lengths and every junction detail",
  "Shear — one-way shear and punching (two-way) shear at the footing and the pedestal",
  "Settlement — total and differential, including any adjacent or existing structure",
];

/**
 * The boxes of the printable sign-off strip, in CAD title-block order.
 * `field` names the SignOffDetails key printed on the box's ruled line; `sub` an optional second
 * line. The "Signature & stamp" box has NO field on purpose — a real person signs it by hand.
 */
const SIGN_OFF: {
  role: string;
  hint: string;
  stamp?: boolean;
  field?: keyof SignOffDetails;
  sub?: keyof SignOffDetails;
}[] = [
  { role: "Drawn by", hint: "Name / date", field: "designedBy" },
  { role: "Checked by", hint: "Name / date", field: "checkedBy" },
  { role: "Approved by", hint: "Name / designation", field: "approvedBy", sub: "approvedByDesignation" },
  { role: "Structural Engineer", hint: "Name / licence no.", field: "engineerName", sub: "engineerLicence" },
  { role: "Signature & stamp", hint: "Affix stamp here", stamp: true },
  { role: "Date", hint: "DD / MM / YYYY", field: "date" },
];

export function ApprovalStamp({
  projectName,
  warnings,
  signOff,
  revision,
}: {
  projectName?: string;
  warnings?: string[];
  /** Names to print onto the sign-off strip. Any field left blank keeps its empty ruled line. */
  signOff?: SignOffDetails;
  /** Approval status + revision control block. */
  revision: RevisionInfo;
}) {
  const m = statusMeta(revision.status);
  const approved = revision.status === "approved";

  const outstanding: string[] = (warnings ?? []).filter(
    (w): w is string => typeof w === "string" && w.trim().length > 0,
  );
  const project: string = projectName && projectName.trim().length > 0 ? projectName.trim() : "—";

  const filled = (key?: keyof SignOffDetails): string => {
    if (!key || !signOff) return "";
    const v = signOff[key];
    return typeof v === "string" ? v.trim() : "";
  };

  return (
    <div className="rounded-2xl bg-white p-4 text-slate-800" style={{ border: `3px solid ${m.color}` }}>
      {/* ---------- header ---------- */}
      <div
        className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2"
        style={{ borderBottom: `1px solid ${COL.line}` }}
      >
        <h3 className="text-sm font-bold tracking-wide text-slate-900">DRAWING STATUS — APPROVAL STAMP</h3>
        <div className="text-xs" style={{ color: COL.note }}>
          Sheet C-01 · Rev {revision.revNo || "R0"} · {revision.revDate || "—"} · Scale NTS
        </div>
        <div className="text-[10px]" style={{ color: COL.note }}>
          Schematic reference — NOT a stamped structural drawing
        </div>
      </div>

      {/* ---------- the status banner ---------- */}
      <div className="overflow-hidden rounded-xl" style={{ border: `2px solid ${m.colorDark}`, background: m.colorSoft }}>
        {/* hazard strip — status colour + amber, pure SVG */}
        <svg viewBox="0 0 400 10" preserveAspectRatio="none" className="block h-2.5 w-full" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="apHazard" width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
              <rect x="0" y="0" width="8" height="10" fill={m.color} />
              <rect x="8" y="0" width="8" height="10" fill={approved ? m.colorDark : COL.amber} />
            </pattern>
          </defs>
          <rect x="0" y="0" width="400" height="10" fill="url(#apHazard)" />
        </svg>

        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div>
              <div className="text-2xl font-extrabold uppercase leading-none tracking-wider sm:text-3xl" style={{ color: m.color }}>
                {m.banner}
              </div>
              <div className="mt-1.5 text-xs font-bold uppercase tracking-widest sm:text-sm" style={{ color: m.colorInk }}>
                {m.subline}
              </div>
            </div>

            {/* rubber-stamp style status box — reads at a glance, prints B&W */}
            <div className="shrink-0 rounded px-3 py-2 text-center" style={{ border: `2px dashed ${m.colorDark}`, background: COL.paper }}>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: COL.note }}>
                Status
              </div>
              <div className="text-sm font-extrabold uppercase tracking-wide" style={{ color: m.color }}>
                {m.label}
              </div>
              <div className="text-[9px]" style={{ color: COL.note }}>
                Rev {revision.revNo || "R0"} · {revision.revDate || "—"}
              </div>
            </div>
          </div>

          {/* revision control block — always printed so the issue is traceable */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[8rem_10rem_1fr]" style={{ color: COL.slate }}>
            <RevCell label="Revision no." value={revision.revNo || "R0"} />
            <RevCell label="Revision date" value={revision.revDate || "—"} />
            <RevCell label="Revision description" value={revision.revDescription || "—"} />
          </div>
          {revision.remarks.trim().length > 0 && (
            <div className="mt-2">
              <RevCell label="Remarks" value={revision.remarks} />
            </div>
          )}

          <p className="mt-3 text-[11px] leading-snug" style={{ color: COL.slate }}>
            This drawing set is generated from the sizes entered in this calculator. Foundation sizes,
            reinforcement, footing depth, beam and column sections follow standard detailing rules applied to
            those entered sizes and to an <b>assumed</b> safe bearing capacity — they are not the output of a
            site-specific structural analysis.
          </p>
          {approved ? (
            <p className="mt-2 text-[11px] font-semibold leading-snug" style={{ color: m.colorInk }}>
              This issue is marked <b>APPROVED</b> under the revision above. Build only to written dimensions —
              do not scale the drawings. The structural checklist below must be verified and the sheet signed
              &amp; stamped by the responsible engineer.
            </p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold leading-snug" style={{ color: m.colorInk }}>
              A qualified structural engineer must verify every item below and <b>SIGN this sheet</b> before any
              excavation, steel fabrication, bar bending or concreting is started. Build only from an approved,
              stamped issue. Do not scale the drawings — build to written dimensions.
            </p>
          )}

          {/* engineer verification checklist */}
          <div className="mt-3 rounded-lg p-3" style={{ border: `1px solid ${COL.rule}`, background: COL.paper }}>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: COL.ink }}>
              To be verified &amp; signed by the structural engineer
            </div>
            <ul className="space-y-1">
              {ENGINEER_CHECKS.map((c) => (
                <li key={c} className="flex items-start gap-2 text-[11px] leading-snug" style={{ color: COL.slate }}>
                  <span
                    className="mt-[2px] inline-block h-3 w-3 shrink-0 rounded-[2px]"
                    style={{ border: `1px solid ${COL.rule}`, background: COL.wash }}
                    aria-hidden="true"
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* outstanding items — only when the engine actually raised something */}
          {outstanding.length > 0 && (
            <div className="mt-3 rounded-lg p-3" style={{ border: `1px solid ${m.color}`, background: COL.paper }}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
                Outstanding items ({outstanding.length}) — must be resolved before approval
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-[11px] leading-snug" style={{ color: m.colorInk }}>
                {outstanding.map((w, i) => (
                  <li key={`${i}-${w.slice(0, 24)}`}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ---------- printable CAD sign-off strip ---------- */}
      <div className="mt-4">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COL.ink }}>
            Sign-off strip — print, sign and stamp
          </div>
          <div className="text-[10px]" style={{ color: COL.note }}>
            Project: <span className="font-semibold" style={{ color: COL.ink }}>{project}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SIGN_OFF.map((b) => {
            const value = filled(b.field);
            const sub = filled(b.sub);
            return (
              <div key={b.role} className="overflow-hidden rounded" style={{ border: `1px solid ${COL.rule}` }}>
                <div
                  className="px-2 py-1 text-[10px] font-semibold"
                  style={{ borderBottom: `1px solid ${COL.line}`, background: COL.wash, color: COL.slate }}
                >
                  {b.role}
                </div>

                <div className="relative h-16" style={{ background: COL.paper }}>
                  {b.stamp ? (
                    /* NEVER data-filled. A real person signs and stamps this box. */
                    <svg viewBox="0 0 120 64" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
                      <circle cx="60" cy="30" r="22" fill="none" stroke={COL.line} strokeWidth="1" strokeDasharray="4 3" />
                      <text x="60" y="32" textAnchor="middle" fontSize="7" fill={COL.rule} fontFamily="Helvetica, Arial, sans-serif">
                        STAMP
                      </text>
                      <line x1="10" y1="56" x2="110" y2="56" stroke={COL.line} strokeWidth="0.8" />
                    </svg>
                  ) : value ? (
                    <div className="flex h-full flex-col justify-end px-2 pb-1.5">
                      <span className="break-words text-[11px] font-semibold leading-tight" style={{ color: COL.ink }}>
                        {value}
                      </span>
                      {sub && (
                        <span className="break-words text-[10px] leading-tight" style={{ color: COL.slate }}>
                          {sub}
                        </span>
                      )}
                      <span className="mt-1 block" style={{ borderTop: `1px solid ${COL.line}`, height: 0 }} />
                    </div>
                  ) : (
                    <svg viewBox="0 0 120 64" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <line x1="8" y1="40" x2="112" y2="40" stroke={COL.line} strokeWidth="0.8" />
                      <line x1="8" y1="56" x2="112" y2="56" stroke={COL.line} strokeWidth="0.8" />
                    </svg>
                  )}
                </div>

                <div className="px-2 py-0.5 text-[9px]" style={{ borderTop: `1px solid ${COL.line}`, color: COL.note }}>
                  {b.hint}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[10px] leading-snug" style={{ color: COL.note }}>
          An unsigned sheet carries no structural authority. The status watermark on the drawings below prints
          on every exported page — this issue is{" "}
          <b style={{ color: m.color }}>{m.watermark}</b> at Rev {revision.revNo || "R0"}.
        </p>
      </div>
    </div>
  );
}

/** One labelled value cell of the revision block. */
function RevCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded" style={{ border: `1px solid ${COL.rule}`, background: COL.paper }}>
      <div
        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
        style={{ borderBottom: `1px solid ${COL.line}`, background: COL.wash, color: COL.note }}
      >
        {label}
      </div>
      <div className="break-words px-2 py-1 text-[11px] font-semibold" style={{ color: COL.ink }}>
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * STATUS WATERMARK
 *
 * A diagonal repeating overlay spelling the SELECTED approval status across the whole sheet. Place
 * inside a `relative` container wrapping the drawings; pointer-events-none so interaction passes
 * through. It measures its own box and emits a 1:1 pixel-space <svg> with numeric width/height and a
 * userSpaceOnUse pattern — correct scale at any sheet size, and an intrinsic size html2canvas can
 * rasterise into the PDF (a %-sized SVG would rasterise at 300×150 and come out garbage).
 * ---------------------------------------------------------------------------------------------- */

const WM_TILE_H = 150; // px — vertical pitch of the diagonal bands

export function StatusWatermark({ status }: { status: DrawingStatus }) {
  const m = statusMeta(status);
  const text = m.watermark;
  // Tile sized to the phrase so long statuses ("MODIFICATION / REVISION REQUIRED") never clip.
  const textW = Math.max(120, Math.round(text.length * 11.5));
  const tileW = textW + 40;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Number.isFinite(r.width) ? Math.max(0, Math.round(r.width)) : 0;
      const h = Number.isFinite(r.height) ? Math.max(0, Math.round(r.height)) : 0;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 10, userSelect: "none" }}
      aria-hidden="true"
    >
      {w > 0 && h > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="pointer-events-none block" focusable="false">
          <defs>
            <pattern
              id="statusWatermarkTile"
              width={tileW}
              height={WM_TILE_H}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-30)"
            >
              <text
                x={(tileW - textW) / 2}
                y={WM_TILE_H * 0.62}
                textLength={textW}
                lengthAdjust="spacing"
                fill={m.color}
                fillOpacity={0.08}
                fontSize={17}
                fontWeight={700}
                letterSpacing={1}
                fontFamily="Helvetica, Arial, sans-serif"
              >
                {text}
              </text>
            </pattern>
          </defs>
          <rect x={0} y={0} width={w} height={h} fill="url(#statusWatermarkTile)" />
        </svg>
      )}
    </div>
  );
}
