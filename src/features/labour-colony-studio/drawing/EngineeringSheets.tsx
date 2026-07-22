"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — THE COMPOSED DRAWING SET.
 *
 * The single component the studio's 2D tab renders and the drawing-set exporter rasterises. It puts
 * the whole issue in erection order:
 *
 *   1. GENERAL ARRANGEMENT   — the ground-floor GA plan + the key project data read from the priced
 *                              labour-colony result (areas, occupancy, weight).
 *   2. FRAMING PLANS         — one per floor (`model.meta.floors`).
 *   3. FOUNDATION LAYOUT     — footings / pedestals / plinth beams + the setting-out table.
 *   4. COLUMN GRID           — the bubbled structural grid + the column schedule.
 *   5. FRAMING ELEVATIONS    — front, rear, left and right.
 *   6. CONNECTION DETAILS    — enlarged base plate + truss gusset.
 *   7. PUF LOCK — LAYOUT     — base-plate layout plan on the plinth beams + setting-out table.
 *   8. PUF LOCK — ENLARGED   — enlarged plan of a typical assembly + section A–A through the pocket.
 *   9. PUF LOCK — SECTION    — "PUF panel bottom locking detail at plinth beam".
 *  10. PUF LOCK — FABRICATION— plate hole layout, C-purlin cut length, weld symbols + parts table.
 *  11. TITLE BLOCK           — drawing register, approval stamp and the NOT-FOR-CONSTRUCTION watermark.
 *
 * The four PUF-lock sheets are ADDITIVE and sit AFTER the connection details, so the existing sheet
 * numbers S-01…S-nn are unchanged. They render an explained empty state (never a half-detail) when
 * the locking system is switched off, and read every number from `model.pufLock`.
 *
 * Every sheet is wrapped in a printable `.colony-drawing-block` div with a white (#ffffff) background
 * and the `light` class, which is exactly what `exportColonyDrawingSet` paginates on — a plan, plate
 * or schedule is never sliced across a PDF page.
 *
 * The customer view drops the engineering-only sheets (foundation, column grid, connection details);
 * nothing is recomputed here — every number comes from the shared model, the priced BOQ-backed
 * `LabourColonyResult` or the priced `CivilWorkResult`.
 */

import type { ReactNode } from "react";

import type { ColonyDrawingMeta, ColonyModel, ColonyPart, ViewMode } from "@/features/labour-colony-studio/model/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";

import { ColonyTitleBlock } from "./ColonyTitleBlock";
import { ColumnGridSheet } from "./ColumnGridSheet";
import { FoundationLayoutSheet } from "./FoundationLayoutSheet";
import { FramingElevationSheet, type ElevationFaceName } from "./FramingElevationSheet";
import { FramingPlanSheet } from "./FramingPlanSheet";
import { ConnectionDetailSheet } from "./ConnectionDetailSheet";
import {
  PufLockEnlargedPlanSheet, PufLockFabricationSheet, PufLockLayoutSheet, PufLockSectionSheet,
} from "./PufLockDetailSheet";
import { DimLineH, DimLineV, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, planPpm, planSpan } from "./planScale";

const PAD = 74;

export interface EngineeringSheetsProps {
  model: ColonyModel;
  result: LabourColonyResult;
  civil: CivilWorkResult | null;
  meta: ColonyDrawingMeta;
  viewMode?: ViewMode;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/* ─────────────────────────────────────────────────────────────────────── the sheet frame ─────── */

function Sheet({
  no, title, subtitle, meta, children,
}: {
  no: string;
  title: string;
  subtitle?: string;
  meta: ColonyDrawingMeta;
  children: ReactNode;
}) {
  return (
    <section
      className="colony-drawing-block light rounded-2xl p-4"
      style={{ background: "#ffffff", border: "1.5px solid #0f172a", color: "#0f172a" }}
    >
      <header
        className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2"
        style={{ borderBottom: "1px solid #cbd5e1" }}
      >
        <div>
          <h3 className="text-sm font-bold tracking-wide" style={{ color: "#0f172a" }}>
            {no} · {title}
          </h3>
          {subtitle && <div className="text-[10px]" style={{ color: "#64748b" }}>{subtitle}</div>}
        </div>
        <div className="text-[10px] text-right" style={{ color: "#64748b" }}>
          <div>{meta.projectName}</div>
          <div>
            {meta.drawingNumber ?? "—"} · Rev {meta.revision ?? "R0"} · {meta.scale ?? "NTS"}
          </div>
        </div>
      </header>
      {children}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────── general arrangement plan ───── */

export interface GeneralArrangementSheetProps {
  model: ColonyModel;
  result: LabourColonyResult;
  meta: ColonyDrawingMeta;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/**
 * The GA plan: the ground-floor envelope, internal partitions, door and window openings and the
 * overall setting-out dimensions, beside a key-data panel read straight from the priced result.
 */
export function GeneralArrangementSheet({ model, result, meta, selectedId, onSelect }: GeneralArrangementSheetProps) {
  const b = model.bounds;
  const { L, D } = planSpan(b);
  const ppm = planPpm(Math.max(L, D));
  const mx = (m: number) => PAD + (m - b.min.x) * ppm;
  const my = (m: number) => PAD + (m - b.min.y) * ppm;
  const svgW = L * ppm + PAD * 2 + 40;
  const svgH = D * ppm + PAD * 2 + 34;

  const gf = (p: ColonyPart) => (p.floor ?? 0) === 0;
  const walls = model.parts.filter((p) => p.kind === "ext-panel" && gf(p));
  const partitions = model.parts.filter((p) => p.kind === "partition" && gf(p));
  const doors = model.parts.filter((p) => p.kind === "door" && gf(p));
  const windows = model.parts.filter((p) => p.kind === "window" && gf(p));
  const stair = model.parts.filter((p) => p.layer === "stair" && gf(p));
  const walkway = model.parts.filter((p) => p.kind === "walkway-plate" && gf(p));

  const rectOf = (p: ColonyPart) => {
    const f = footprintXY(p.solid);
    if (!f) return null;
    return { x: mx(f.x0), y: my(f.y0), w: Math.max(1.5, mx(f.x1) - mx(f.x0)), h: Math.max(1.5, my(f.y1) - my(f.y0)) };
  };

  const drawGroup = (parts: ColonyPart[], fill: string, stroke: string, opacity = 1) =>
    parts.map((p) => {
      const r = rectOf(p);
      if (!r) return null;
      const sel = p.id === selectedId;
      return (
        <rect key={p.id} x={r.x} y={r.y} width={r.w} height={r.h}
          onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}
          fill={sel ? PLAN.selFill : fill} fillOpacity={sel ? 1 : opacity}
          stroke={sel ? PLAN.sel : stroke} strokeWidth={sel ? 1.8 : 0.6} />
      );
    });

  const a = result.area;
  const occ = result.occupancy;
  const w = result.weight;

  const facts: { k: string; v: string }[] = [
    { k: "Floors", v: String(model.meta.floors) },
    { k: "Footprint", v: `${a.footprintLengthM.toFixed(2)} × ${a.footprintWidthM.toFixed(2)} m` },
    { k: "Built-up (per floor)", v: `${a.builtUpPerFloorSqm.toFixed(2)} m²` },
    { k: "Built-up (total)", v: `${a.builtUpTotalSqm.toFixed(2)} m² (${a.builtUpTotalSqft.toFixed(0)} sq ft)` },
    { k: "Rooms", v: String(occ.rooms) },
    { k: "Persons per room", v: String(occ.personsPerRoom) },
    { k: "Total capacity", v: `${occ.totalCapacity} persons` },
    { k: "Bunk beds", v: String(occ.bunkBedsTotal) },
    { k: "Roof", v: `${model.meta.roofType}${model.meta.sloped ? " (sloped)" : ""} · ${a.roofActualSqm.toFixed(2)} m²` },
    { k: "Plinth / floor height", v: `${mLabel(model.meta.plinthM)} / ${mLabel(model.meta.floorHM)}` },
    { k: "Total weight", v: `${w.totalKg.toFixed(0)} kg (${w.totalTonnes.toFixed(3)} t)` },
    { k: "Structural steel", v: `${result.structural.totalSteelKg.toFixed(0)} kg` },
  ];

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 640) }}>
          <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

          {/* building envelope */}
          <rect x={mx(b.min.x)} y={my(b.min.y)} width={L * ppm} height={D * ppm}
            fill={PLAN.wallFill} stroke={PLAN.dim} strokeWidth={1.2} />

          {drawGroup(walkway, PLAN.pcc, PLAN.sub, 0.6)}
          {drawGroup(walls, PLAN.wallFill, PLAN.dim, 0.95)}
          {drawGroup(partitions, "#c7b299", PLAN.dim, 0.9)}
          {drawGroup(stair, PLAN.plinth, PLAN.dim, 0.7)}
          {drawGroup(windows, PLAN.opening, PLAN.dim, 0.9)}
          {drawGroup(doors, PLAN.door, PLAN.dim, 0.95)}

          {/* overall setting-out dimensions */}
          <DimLineH x0={mx(b.min.x)} x1={mx(b.max.x)} y={my(b.min.y) - 30} label={mLabel(L)} />
          <DimLineV y0={my(b.min.y)} y1={my(b.max.y)} x={mx(b.min.x) - 30} label={mLabel(D)} />

          <NorthArrow x={svgW - 28} y={34} />
          <ScaleBar x={mx(b.min.x)} y={svgH - 20} ppm={ppm} />
          <text x={mx(b.min.x)} y={my(b.max.y) + 26} fontSize={10} fill={PLAN.ink} fontWeight={700}>
            General arrangement — ground floor plan
          </text>
          <text x={mx(b.min.x)} y={my(b.max.y) + 38} fontSize={8} fill={PLAN.sub}>
            {model.meta.title} · {model.meta.rooms} rooms · {model.meta.floors} floor(s) · grid {model.meta.gridRef}
          </text>
        </svg>
      </div>

      {/* key project data — read from the priced result, never recomputed here */}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
        <thead>
          <tr>
            {["Key project data", "Value", "Key project data", "Value"].map((h, i) => (
              <th key={`${h}-${i}`} style={{ textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(facts.length / 2) }).map((_, i) => {
            const left = facts[i * 2];
            const right = facts[i * 2 + 1];
            return (
              <tr key={left.k}>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{left.k}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 600 }}>{left.v}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{right ? right.k : ""}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 600 }}>{right ? right.v : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Areas, occupancy and weights are the priced calculator output for {meta.projectName} — the drawing reports
        them, it does not re-derive them.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ the composed set ═══════ */

const FACES: ElevationFaceName[] = ["front", "rear", "left", "right"];

export function EngineeringSheets({
  model, result, civil, meta, viewMode = "engineering", selectedId, onSelect,
}: EngineeringSheetsProps) {
  const engineering = viewMode !== "customer";
  const floors = Math.max(1, model.meta.floors);
  const warnings = model.warnings.map((w) => w.message);

  let n = 0;
  const sheetNo = () => `S-${String(++n).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <Sheet no={sheetNo()} title="General arrangement" subtitle="Ground floor GA plan + key project data" meta={meta}>
        <GeneralArrangementSheet model={model} result={result} meta={meta} selectedId={selectedId} onSelect={onSelect} />
      </Sheet>

      {Array.from({ length: floors }).map((_, f) => (
        <Sheet key={`fp-${f}`} no={sheetNo()}
          title={f === 0 ? "Ground floor framing plan" : `Floor ${f} framing plan`}
          subtitle="Columns, beams, joists and bracing on the structural grid" meta={meta}>
          <FramingPlanSheet model={model} floor={f} meta={meta} selectedId={selectedId} onSelect={onSelect} />
        </Sheet>
      ))}

      {engineering && (
        <Sheet no={sheetNo()} title="Foundation / footing layout" subtitle="Footings, pedestals, PCC and plinth beams + setting-out table" meta={meta}>
          <FoundationLayoutSheet model={model} civil={civil} meta={meta} selectedId={selectedId} onSelect={onSelect} />
        </Sheet>
      )}

      {engineering && (
        <Sheet no={sheetNo()} title="Structural column grid" subtitle="Bubbled grid, bay dimensions and the column schedule" meta={meta}>
          <ColumnGridSheet model={model} meta={meta} selectedId={selectedId} onSelect={onSelect} />
        </Sheet>
      )}

      {FACES.map((face) => (
        <Sheet key={`el-${face}`} no={sheetNo()}
          title={`${face.charAt(0).toUpperCase()}${face.slice(1)} elevation`}
          subtitle="Framing elevation with level markers and openings" meta={meta}>
          <FramingElevationSheet model={model} face={face} meta={meta} selectedId={selectedId} onSelect={onSelect} />
        </Sheet>
      ))}

      {engineering && (
        <Sheet no={sheetNo()} title="Connection details" subtitle="Enlarged column base plate and truss ridge gusset" meta={meta}>
          <ConnectionDetailSheet model={model} meta={meta} connectionId={selectedIdConnection(model, selectedId)} />
        </Sheet>
      )}

      {engineering && (
        <Sheet no={sheetNo()} title="PUF panel bottom lock — base-plate layout"
          subtitle="Plate layout on the plinth-beam runs, offsets, spacing and the setting-out table" meta={meta}>
          <PufLockLayoutSheet model={model} meta={meta} selectedId={selectedId} onSelect={onSelect} />
        </Sheet>
      )}

      {engineering && (
        <Sheet no={sheetNo()} title="PUF panel bottom lock — enlarged plan"
          subtitle="Typical assembly in plan with section A–A through the receiving pocket" meta={meta}>
          <PufLockEnlargedPlanSheet model={model} meta={meta} />
        </Sheet>
      )}

      {engineering && (
        <Sheet no={sheetNo()} title="PUF panel bottom locking detail at plinth beam"
          subtitle="Dimensioned section: anchorage, plate, paired C-purlins, pocket and seated panel" meta={meta}>
          <PufLockSectionSheet model={model} meta={meta} />
        </Sheet>
      )}

      {engineering && (
        <Sheet no={sheetNo()} title="PUF panel bottom lock — fabrication detail"
          subtitle="Plate hole layout, C-purlin cut length and end profile, weld symbols and parts table" meta={meta}>
          <PufLockFabricationSheet model={model} meta={meta} />
        </Sheet>
      )}

      <div className="colony-drawing-block light rounded-2xl" style={{ background: "#ffffff" }}>
        <ColonyTitleBlock meta={meta} warnings={warnings} />
      </div>
    </div>
  );
}

/** When the selected part belongs to a connection group, enlarge THAT connection. */
function selectedIdConnection(model: ColonyModel, selectedId: string | null | undefined): string | undefined {
  if (!selectedId) return undefined;
  const part = model.parts.find((p) => p.id === selectedId);
  return part?.connectionId;
}
