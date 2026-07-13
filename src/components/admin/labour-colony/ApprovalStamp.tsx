"use client";

import { useEffect, useRef, useState } from "react";
import type { SignOffDetails } from "./signOff";

/**
 * APPROVAL STAMP + "NOT FOR CONSTRUCTION" WATERMARK
 *
 * The drawing set produced by this calculator is a QUOTATION / APPROVAL issue: every size on it is
 * derived from the entered dimensions and an ASSUMED safe bearing capacity. It is not a stamped
 * structural design and must never be built from. Two pieces enforce that:
 *
 *   • <ApprovalStamp />                — a heavy, unmissable status banner that sits at the TOP of the
 *                                        sheet, carrying the engineer verification checklist, any
 *                                        outstanding items, and a printable CAD-style sign-off strip.
 *   • <NotForConstructionWatermark />  — a diagonal repeating overlay laid over the WHOLE sheet, so a
 *                                        printed page or an exported PDF page can never be mistaken for
 *                                        a construction issue, even if it is separated from this banner.
 *
 * html2canvas safety: every colour here is a plain hex string (no oklch / Tailwind colour functions in
 * any SVG fill or stroke), there are no CSS filters and no backdrop-blur, so the PDF export renders it.
 */

const COL = {
  red: "#dc2626",
  redDark: "#991b1b",
  redInk: "#7f1d1d",
  redSoft: "#fef2f2",
  amber: "#d97706",
  ink: "#0f172a",
  slate: "#334155",
  note: "#64748b",
  rule: "#94a3b8",
  line: "#cbd5e1",
  paper: "#ffffff",
  wash: "#f8fafc",
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
 *
 * `field` names the SignOffDetails key printed on the box's ruled line; `sub` names an optional
 * second line under it (the engineer's licence sits under the engineer's name). A box with no value
 * renders exactly as before — an empty ruled line to be written on by hand.
 *
 * The "Signature & stamp" box has NO field on purpose. It is never filled from data: a real engineer
 * signs and stamps it. See the header of ./signOff.ts.
 */
const SIGN_OFF: {
  role: string;
  hint: string;
  stamp?: boolean;
  field?: keyof SignOffDetails;
  sub?: keyof SignOffDetails;
}[] = [
  { role: "Designed by", hint: "Name / date", field: "designedBy" },
  { role: "Checked by", hint: "Name / date", field: "checkedBy" },
  { role: "Structural Engineer", hint: "Name / licence no.", field: "engineerName", sub: "engineerLicence" },
  { role: "Signature & stamp", hint: "Affix stamp here", stamp: true },
  { role: "Date", hint: "DD / MM / YYYY", field: "date" },
];

export function ApprovalStamp({
  projectName,
  warnings,
  signOff,
}: {
  projectName?: string;
  warnings?: string[];
  /** Names to print onto the sign-off strip. Any field left blank keeps its empty ruled line. */
  signOff?: SignOffDetails;
}) {
  // Robust to undefined / empty / blank-only inputs — never render an empty bullet or an empty strip row.
  const outstanding: string[] = (warnings ?? []).filter(
    (w): w is string => typeof w === "string" && w.trim().length > 0,
  );
  const project: string = projectName && projectName.trim().length > 0 ? projectName.trim() : "—";

  /** A strip field's printable value, or "" when it should stay an empty ruled line. */
  const filled = (key?: keyof SignOffDetails): string => {
    if (!key || !signOff) return "";
    const v = signOff[key];
    return typeof v === "string" ? v.trim() : "";
  };

  return (
    <div
      className="rounded-2xl bg-white p-4 text-slate-800"
      style={{ border: `3px solid ${COL.red}` }}
    >
      {/* ---------- header ---------- */}
      <div
        className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2"
        style={{ borderBottom: `1px solid ${COL.line}` }}
      >
        <h3 className="text-sm font-bold tracking-wide text-slate-900">DRAWING STATUS — APPROVAL STAMP</h3>
        <div className="text-xs" style={{ color: COL.note }}>
          Sheet C-01 · Rev R0 · Issued for review · Scale NTS
        </div>
        <div className="text-[10px]" style={{ color: COL.note }}>
          Schematic reference — NOT a stamped structural drawing
        </div>
      </div>

      {/* ---------- the banner ---------- */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: `2px solid ${COL.redDark}`, background: COL.redSoft }}
      >
        {/* hazard strip — pure SVG, stretched to the card width */}
        <svg
          viewBox="0 0 400 10"
          preserveAspectRatio="none"
          className="block h-2.5 w-full"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern id="apHazard" width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
              <rect x="0" y="0" width="8" height="10" fill={COL.red} />
              <rect x="8" y="0" width="8" height="10" fill={COL.amber} />
            </pattern>
          </defs>
          <rect x="0" y="0" width="400" height="10" fill="url(#apHazard)" />
        </svg>

        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div>
              <div
                className="text-2xl font-extrabold uppercase leading-none tracking-wider sm:text-3xl"
                style={{ color: COL.red }}
              >
                Not for construction
              </div>
              <div
                className="mt-1.5 text-xs font-bold uppercase tracking-widest sm:text-sm"
                style={{ color: COL.redInk }}
              >
                Approval required — issued for review only
              </div>
            </div>

            {/* a rubber-stamp style void box, so the status reads even at a glance / when printed B&W */}
            <div
              className="shrink-0 rounded px-3 py-2 text-center"
              style={{ border: `2px dashed ${COL.redDark}`, background: COL.paper }}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: COL.note }}>
                Status
              </div>
              <div className="text-sm font-extrabold uppercase tracking-wide" style={{ color: COL.red }}>
                Unapproved
              </div>
              <div className="text-[9px]" style={{ color: COL.note }}>
                no engineer stamp
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-snug" style={{ color: COL.slate }}>
            This drawing set is a <b>quotation / approval issue</b> generated from the sizes entered in this
            calculator. It is <b>NOT a stamped structural design</b>. Foundation sizes, reinforcement, footing
            depth, beam and column sections shown here follow standard detailing rules applied to those entered
            sizes and to an <b>assumed</b> safe bearing capacity — they are not the output of a site-specific
            structural analysis.
          </p>
          <p className="mt-2 text-[11px] font-semibold leading-snug" style={{ color: COL.redInk }}>
            A qualified structural engineer must verify every item below and <b>SIGN this sheet</b> before any
            excavation, steel fabrication, bar bending or concreting is started. Build only from the stamped
            issue. Do not scale the drawings — build to written dimensions.
          </p>

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
            <div className="mt-3 rounded-lg p-3" style={{ border: `1px solid ${COL.red}`, background: COL.paper }}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: COL.red }}>
                Outstanding items ({outstanding.length}) — must be resolved before approval
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-[11px] leading-snug" style={{ color: COL.redInk }}>
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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

                {/* The writing area. Filled from the saved sign-off details when we have them, and an
                    empty ruled line when we do not — so an un-entered box still prints to be written on. */}
                <div className="relative h-16" style={{ background: COL.paper }}>
                  {b.stamp ? (
                    /* NEVER data-filled. A real engineer signs and stamps this box. */
                    <svg
                      viewBox="0 0 120 64"
                      className="h-full w-full"
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle
                        cx="60"
                        cy="30"
                        r="22"
                        fill="none"
                        stroke={COL.line}
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                      <text x="60" y="32" textAnchor="middle" fontSize="7" fill={COL.rule} fontFamily="Helvetica, Arial, sans-serif">
                        STAMP
                      </text>
                      <line x1="10" y1="56" x2="110" y2="56" stroke={COL.line} strokeWidth="0.8" />
                    </svg>
                  ) : value ? (
                    /* Real DOM text, not SVG text: html2canvas rasterises DOM text reliably, and it
                       wraps a long name instead of clipping it. Colours stay literal hex. */
                    <div className="flex h-full flex-col justify-end px-2 pb-1.5">
                      <span
                        className="break-words text-[11px] font-semibold leading-tight"
                        style={{ color: COL.ink }}
                      >
                        {value}
                      </span>
                      {sub && (
                        <span className="break-words text-[10px] leading-tight" style={{ color: COL.slate }}>
                          {sub}
                        </span>
                      )}
                      <span
                        className="mt-1 block"
                        style={{ borderTop: `1px solid ${COL.line}`, height: 0 }}
                      />
                    </div>
                  ) : (
                    <svg
                      viewBox="0 0 120 64"
                      className="h-full w-full"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <line x1="8" y1="40" x2="112" y2="40" stroke={COL.line} strokeWidth="0.8" />
                      <line x1="8" y1="56" x2="112" y2="56" stroke={COL.line} strokeWidth="0.8" />
                    </svg>
                  )}
                </div>

                <div
                  className="px-2 py-0.5 text-[9px]"
                  style={{ borderTop: `1px solid ${COL.line}`, color: COL.note }}
                >
                  {b.hint}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[10px] leading-snug" style={{ color: COL.note }}>
          An unsigned sheet carries no structural authority. Until the boxes above are completed and stamped,
          this issue remains <b style={{ color: COL.red }}>NOT FOR CONSTRUCTION</b>, and the watermark on the
          drawings below stays in place on every printed and exported page.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * NOT-FOR-CONSTRUCTION WATERMARK
 *
 * Place inside a `relative` container that wraps the whole drawing sheet, e.g.
 *
 *   <div className="relative">
 *     <div ref={sheetRef}> ...all the drawings... </div>
 *     <NotForConstructionWatermark />
 *   </div>
 *
 * It is absolutely positioned and pointer-events-none, so clicks, hovers and text selection pass
 * straight through to the drawings underneath.
 *
 * Why it measures its own box instead of just using width="100%":
 *   • an SVG sized in % has no intrinsic size, and html2canvas serialises inline SVGs to an <img> —
 *     a percentage-sized SVG rasterises at the 300×150 default and comes out as garbage in the PDF;
 *   • preserveAspectRatio="slice" over a fixed viewBox would scale the text by the sheet height (the
 *     drawing sheet is many thousands of px tall), giving two absurdly large words instead of a
 *     watermark.
 * So we measure the container and emit a 1:1 pixel-space <svg> with numeric width/height and a
 * userSpaceOnUse <pattern> — correct scale at any sheet size, and an intrinsic size html2canvas can
 * rasterise. No CSS gradients, no filters, no backdrop-blur, no external fonts.
 * ---------------------------------------------------------------------------------------------- */

const WM_TILE_W = 300;   // px — one repeat of the phrase plus its gap
const WM_TILE_H = 150;   // px — vertical pitch of the diagonal bands
const WM_TEXT_W = 280;   // px — the phrase is forced to exactly this width (textLength), so it can
                         //      never overflow the tile and get clipped, whatever font is resolved.

export function NotForConstructionWatermark() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      // Guard every number that reaches the SVG: no NaN, no Infinity, no negatives.
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
      {/* Before the first measurement (and in any degenerate 0×0 box) render nothing rather than an
          SVG with zero/NaN geometry. */}
      {w > 0 && h > 0 && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none block"
          focusable="false"
        >
          <defs>
            <pattern
              id="ncWatermarkTile"
              width={WM_TILE_W}
              height={WM_TILE_H}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-30)"
            >
              <text
                x={(WM_TILE_W - WM_TEXT_W) / 2}
                y={WM_TILE_H * 0.62}
                textLength={WM_TEXT_W}
                lengthAdjust="spacing"
                fill={COL.red}
                fillOpacity={0.08}
                fontSize={17}
                fontWeight={700}
                letterSpacing={1}
                fontFamily="Helvetica, Arial, sans-serif"
              >
                NOT FOR CONSTRUCTION
              </text>
            </pattern>
          </defs>
          <rect x={0} y={0} width={w} height={h} fill="url(#ncWatermarkTile)" />
        </svg>
      )}
    </div>
  );
}
