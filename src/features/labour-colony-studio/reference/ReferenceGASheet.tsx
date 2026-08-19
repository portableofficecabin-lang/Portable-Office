"use client";

/**
 * LABOUR COLONY — THE REFERENCE GENERAL-ARRANGEMENT SHEET.
 *
 * One composed drawing sheet, laid out the way a consultant's tender GA sheet is laid out:
 *
 *   • the SCHEDULE OF DOORS, WINDOWS & VENTILATOR in the top-right corner,
 *   • the floor plans, one per storey, with every door (and its swing) and window located,
 *   • the four elevations — front, right, back, left — with the opening and bracing locations and
 *     the cladding callouts naming the exact panel each surface carries,
 *   • the sheet notes,
 *   • the CAD title block: released-for status, contractor, client, title, size, drawing number,
 *     revision, sheet number and the DSGN / DRWN / CHKD / APPD sign-off grid.
 *
 * Every view reads the SHARED model and the SAME `buildRoomFloorPlan` geometry the priced take-off
 * consumes, and every schedule reads the priced BOQ — this sheet reports the design, it never
 * re-derives it.
 *
 * Each block carries `reference-drawing-block` so the PDF exporter paginates between whole views and
 * never slices a plan, an elevation or the title block across a page.
 */

import type { ReactNode } from "react";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { RoomFloorPlanGeom } from "@/lib/quotation/roomFloorPlan";
import type { ColonyModel } from "../model/types";
import { DrawingWatermark } from "@/components/admin/labour-colony/DrawingWatermark";
import { ReferencePlanView } from "./ReferencePlanView";
import { ReferenceElevationView, type ReferenceFace } from "./ReferenceElevationView";
import { ReferenceTitleBlock, type ReferenceTitleBlockMeta } from "./ReferenceTitleBlock";
import { REF } from "./referenceScale";
import type { BracingNote, EnvelopeCallout, OpeningScheduleRow } from "./referenceRegister";

const FLOOR_TITLES = [
  "Plan of Ground Floor Layout",
  "Plan of First Floor Layout",
  "Plan of Second Floor Layout",
];

/** Face → the caption the reference sheet prints for it. */
const ELEVATIONS: { face: ReferenceFace; title: string; wide: boolean }[] = [
  { face: "front", title: "Front Side Elevation", wide: true },
  { face: "right", title: "Right Side Elevation", wide: false },
  { face: "rear", title: "Back Side Elevation", wide: true },
  { face: "left", title: "Left Side Elevation", wide: false },
];

/** The sheet notes, printed under the views exactly as a tender GA sheet carries them. */
const REFERENCE_NOTES: string[] = [
  "All dimensions are in mm unless noted otherwise.",
  "Build to written dimensions — do not scale this drawing.",
  "Grid letters run along the building length, numbers across the width — the same grid the fabrication and civil drawing sets use.",
  "Door and window marks [D] / [W] refer to the schedule on this sheet.",
  "Sections, panel thicknesses and quantities are read from the priced Material BOQ and the engineering model; the drawing and the bill of materials cannot disagree.",
  "This issue is valid only for the status ticked in the title block. It is not a construction release unless \"Construction\" is ticked and the sheet is signed.",
];

function Block({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`reference-drawing-block light ${className ?? ""}`}
      style={{ background: REF.paper, border: `1px solid ${REF.ink}`, color: REF.ink, padding: 10 }}
    >
      {children}
    </section>
  );
}

/* ───────────────────────────────────────────── the opening schedule block ─────────────────────── */

function OpeningScheduleBlock({ rows }: { rows: OpeningScheduleRow[] }) {
  const head = ["Type", "Size", "Material", "Qty"];
  return (
    <div style={{ border: `1px solid ${REF.ink}`, background: REF.paper }}>
      <div
        style={{
          borderBottom: `1px solid ${REF.ink}`, padding: "3px 6px", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase", color: REF.ink, textAlign: "center",
        }}
      >
        Schedule of doors, windows &amp; ventilator
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "8px 6px", fontSize: 9.5, color: REF.note }}>
          No doors or windows are placed on the plan yet.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  style={{
                    fontSize: 8, textTransform: "uppercase", letterSpacing: "0.05em", color: REF.note,
                    textAlign: h === "Qty" ? "right" : "left", padding: "2px 5px",
                    borderBottom: `1px solid ${REF.ink}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.kind}-${r.mark}-${r.sizeMm}`}>
                <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, fontWeight: 700 }}>{r.type}</td>
                <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}` }}>{r.sizeMm}</td>
                <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}` }}>{r.material}</td>
                <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right", fontWeight: 700 }}>{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────── the key-data + callouts block ──────────── */

function KeyDataBlock({
  model, result, callouts, overall,
}: {
  model: ColonyModel;
  result: LabourColonyResult;
  callouts: EnvelopeCallout[];
  /** The TOTAL colony extent (metres) — the same number the plan and the elevations dimension. */
  overall: { lengthM: number; widthM: number };
}) {
  const a = result.area;
  /* Two different lengths are both true, so BOTH are printed and each is labelled: the overall extent
   * the drawing dimensions (verandas and staircases included), and the room-block footprint the
   * calculator's areas are derived from. Printing only one would make the sheet contradict either the
   * dimension lines or the area figures. */
  const rows: [string, string][] = [
    ["Overall length (incl. veranda / stair)", `${Math.round(overall.lengthM * 1000)} mm`],
    ["Overall width (incl. veranda / stair)", `${Math.round(overall.widthM * 1000)} mm`],
    ["Overall height above NGL", `${Math.round(model.bounds.max.z * 1000)} mm`],
    ["Room block footprint", `${Math.round(a.footprintLengthM * 1000)} × ${Math.round(a.footprintWidthM * 1000)} mm`],
    ["Floors", String(model.meta.floors)],
    ["Rooms", String(result.occupancy.rooms)],
    ["Capacity", `${result.occupancy.totalCapacity} persons`],
    ["Built-up area", `${a.builtUpTotalSqm.toFixed(2)} m²`],
    ["Structural grid", model.meta.gridRef],
    ["Roof", `${model.meta.roofType}${model.meta.sloped ? " (sloped)" : ""}`],
  ];
  return (
    <div style={{ border: `1px solid ${REF.ink}`, background: REF.paper }}>
      <div
        style={{
          borderBottom: `1px solid ${REF.ink}`, padding: "3px 6px", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase", color: REF.ink, textAlign: "center",
        }}
      >
        Building data &amp; cladding
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, color: REF.thin }}>{k}</td>
              <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right", fontWeight: 700 }}>{v}</td>
            </tr>
          ))}
          {callouts.map((c) => (
            <tr key={c.id}>
              <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, color: REF.thin }}>{c.label}</td>
              <td style={{ fontSize: 9, padding: "2px 5px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right", fontWeight: 700 }}>{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ the composed sheet ════════ */

export interface ReferenceGASheetProps {
  model: ColonyModel;
  result: LabourColonyResult;
  /** One resolved floor-plan geometry per storey, in floor order. */
  geoms: RoomFloorPlanGeom[];
  openings: OpeningScheduleRow[];
  callouts: EnvelopeCallout[];
  /** Cross-bracing section + its nut-bolt assembly, for the elevation callouts. */
  bracing?: BracingNote | null;
  meta: ReferenceTitleBlockMeta;
  /** Tile the company watermark across the sheet (on by default at the call site). */
  watermark?: boolean;
}

export function ReferenceGASheet({
  model, result, geoms, openings, callouts, bracing = null, meta, watermark = true,
}: ReferenceGASheetProps) {
  /* ONE overall extent for the whole issue, taken from the ground-floor plan geometry: the plan
   * dimension line, the elevation dimension lines, the building-data block and the title block's
   * size cells all read this, so the sheet cannot state two building lengths. */
  const gf = geoms[0];
  const extent = gf
    ? { x0: gf.bounds.minX, x1: gf.bounds.maxX, y0: gf.bounds.minY, y1: gf.bounds.maxY }
    : { x0: model.bounds.min.x, x1: model.bounds.max.x, y0: model.bounds.min.y, y1: model.bounds.max.y };
  const overall = { lengthM: extent.x1 - extent.x0, widthM: extent.y1 - extent.y0 };

  /**
   * GRID vs PLAN CROSS-CHECK. The architectural plan is set out by `buildRoomFloorPlan`; the columns,
   * footings and plinth beams the elevations stand on are set out by the CIVIL grid
   * (`buildConstructionPlan`). They normally agree. When they do not, the elevation would be drawn to
   * one length and dimensioned to the other — a drawing that silently contradicts itself.
   *
   * So: when they disagree we stop asserting the plan's extent over the elevations, let each view
   * dimension what it actually draws, and say plainly on the sheet that the two disagree. The sheet
   * reports the discrepancy; it must not average it away.
   */
  const TOL_M = 0.75;
  const modelLengthM = model.bounds.max.x - model.bounds.min.x;
  const modelWidthM = model.bounds.max.y - model.bounds.min.y;
  const gridMismatch =
    Math.abs(modelLengthM - overall.lengthM) > TOL_M || Math.abs(modelWidthM - overall.widthM) > TOL_M;

  return (
    <div className="relative space-y-3" style={{ background: REF.paper, padding: 8 }}>
      {watermark && <DrawingWatermark />}

      {gridMismatch && (
        <section
          className="reference-drawing-block light"
          style={{ background: "#fef2f2", border: "1.5px solid #b91c1c", color: "#7f1d1d", padding: 10 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Hold this issue — the structural grid and the architectural plan disagree
          </div>
          <p style={{ fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
            The room plan sets this building out at{" "}
            <strong>{Math.round(overall.lengthM * 1000)} × {Math.round(overall.widthM * 1000)} mm</strong>, but the
            columns, footings and plinth beams the elevations stand on are set out on a grid of{" "}
            <strong>{Math.round(modelLengthM * 1000)} × {Math.round(modelWidthM * 1000)} mm</strong>. The elevations
            below are drawn and dimensioned to the grid they actually carry, so this sheet is internally
            consistent — but the two setting-outs must be reconciled before the drawing is issued. This happens
            when the corridor is on one side only: the civil grid then lays every room of a floor in a single row
            while the room plan splits them into two.
          </p>
        </section>
      )}

      {/* ── plans, with the schedule and the building data alongside the first one ─────────── */}
      <Block>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="overflow-x-auto">
            {geoms[0] && (
              <ReferencePlanView
                geom={geoms[0]}
                model={model}
                title={FLOOR_TITLES[0]}
                openings={openings}
              />
            )}
          </div>
          <div className="space-y-3">
            <OpeningScheduleBlock rows={openings} />
            <KeyDataBlock model={model} result={result} callouts={callouts} overall={overall} />
          </div>
        </div>
      </Block>

      {geoms.slice(1).map((g, i) => (
        <Block key={`plan-${i + 1}`}>
          <div className="overflow-x-auto">
            <ReferencePlanView
              geom={g}
              model={model}
              title={FLOOR_TITLES[Math.min(i + 1, FLOOR_TITLES.length - 1)]}
              openings={openings}
            />
          </div>
        </Block>
      ))}

      {/* ── elevations: the long face beside its gable end, twice ──────────────────────────── */}
      {[0, 2].map((start) => (
        <Block key={`elev-${start}`}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            {ELEVATIONS.slice(start, start + 2).map((e) => (
              <div key={e.face} className="overflow-x-auto">
                <ReferenceElevationView
                  model={model}
                  face={e.face}
                  title={e.title}
                  openings={openings}
                  callouts={callouts}
                  overall={
                    gridMismatch
                      ? undefined
                      : e.face === "front" || e.face === "rear"
                        ? { fromM: extent.x0, toM: extent.x1 }
                        : { fromM: extent.y0, toM: extent.y1 }
                  }
                  bracing={bracing ?? undefined}
                  targetPx={e.wide ? 900 : 460}
                />
              </div>
            ))}
          </div>
        </Block>
      ))}

      {/* ── notes ──────────────────────────────────────────────────────────────────────────── */}
      <Block>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: REF.ink }}>
          Notes
        </div>
        <ol style={{ marginTop: 4, paddingLeft: 18, color: REF.thin, fontSize: 10, lineHeight: 1.5 }}>
          {REFERENCE_NOTES.map((n, i) => (
            <li key={i} style={{ listStyleType: "decimal" }}>{n}</li>
          ))}
        </ol>
      </Block>

      {/* ── title block ────────────────────────────────────────────────────────────────────── */}
      <div className="reference-drawing-block light" style={{ background: REF.paper }}>
        <ReferenceTitleBlock meta={meta} />
      </div>
    </div>
  );
}
