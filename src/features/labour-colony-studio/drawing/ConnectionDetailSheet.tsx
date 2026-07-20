"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — ENLARGED CONNECTION DETAILS.
 *
 * Two blown-up details, both drawn from the model's own connection GROUPS (`part.connectionId`), so a
 * detail can only ever show hardware the model actually carries:
 *
 *   DETAIL A — COLUMN BASE PLATE, plan + section: plate size and thickness, the 4 holding-down anchor
 *     bolts with bolt gauge / edge distance / hole diameter callouts, the nut + washer stack, the
 *     levelling / grout gap over the pedestal, and the column-to-plate weld symbol.
 *   DETAIL B — TRUSS RIDGE GUSSET, in the plane of the truss: the gusset plate outline, the rafter /
 *     king-post member marks meeting at the ridge, the bolt group where the connection group carries
 *     bolts, and the weld callout where it is a welded joint.
 *
 * Enlarged details are dimensioned in MILLIMETRES (mmLabel) off the metre model — nothing is scaled by
 * hand and no size is invented: plate sizes, thicknesses, bolt specs, hole diameters and bolt
 * positions all come from the synthesized connection parts the shared model built. Literal hex,
 * export-safe (explicit polygons, no <marker> refs).
 */

import type {
  ColonyDrawingMeta, ColonyModel, ColonyPart, PartSolid,
} from "@/features/labour-colony-studio/model/types";
import { PLAN, footprintXY, mmLabel, spanZ } from "./planScale";

export interface ConnectionDetailSheetProps {
  model: ColonyModel;
  meta: ColonyDrawingMeta;
  /** A specific `part.connectionId` to enlarge. A representative one is picked when omitted. */
  connectionId?: string;
}

/* ────────────────────────────────────────────────────────────────────────────── small helpers ── */

const num = (v: number | undefined, f = 0): string => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(f) : "—");

/** A dimension line in the enlarged detail, labelled in millimetres. */
function DimH({ x0, x1, y, mm }: { x0: number; x1: number; y: number; mm: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={PLAN.dim} strokeWidth={0.9} />
      <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke={PLAN.dim} strokeWidth={0.9} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={PLAN.dim} strokeWidth={0.9} />
      <polygon points={`${x0},${y} ${x0 + 5},${y - 3} ${x0 + 5},${y + 3}`} fill={PLAN.dim} />
      <polygon points={`${x1},${y} ${x1 - 5},${y - 3} ${x1 - 5},${y + 3}`} fill={PLAN.dim} />
      <rect x={mid - 20} y={y - 9} width={40} height={11} fill={PLAN.paper} />
      <text x={mid} y={y - 1} fontSize={8} textAnchor="middle" fill={PLAN.ink}>{mmLabel(mm)}</text>
    </g>
  );
}

function DimV({ y0, y1, x, mm }: { y0: number; y1: number; x: number; mm: number }) {
  const mid = (y0 + y1) / 2;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={PLAN.dim} strokeWidth={0.9} />
      <line x1={x - 4} y1={y0} x2={x + 4} y2={y0} stroke={PLAN.dim} strokeWidth={0.9} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={PLAN.dim} strokeWidth={0.9} />
      <polygon points={`${x},${y0} ${x - 3},${y0 + 5} ${x + 3},${y0 + 5}`} fill={PLAN.dim} />
      <polygon points={`${x},${y1} ${x - 3},${y1 - 5} ${x + 3},${y1 - 5}`} fill={PLAN.dim} />
      <rect x={x - 9} y={mid - 20} width={11} height={40} fill={PLAN.paper} />
      <text x={x} y={mid} fontSize={8} textAnchor="middle" fill={PLAN.ink} transform={`rotate(-90 ${x} ${mid})`}>{mmLabel(mm)}</text>
    </g>
  );
}

/** A leader line with a text note at its tail. */
function Leader({ x, y, tx, ty, text, anchor = "start" }: {
  x: number; y: number; tx: number; ty: number; text: string; anchor?: "start" | "end";
}) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={PLAN.dim} strokeWidth={0.7} />
      <circle cx={x} cy={y} r={1.6} fill={PLAN.dim} />
      <text x={anchor === "end" ? tx - 3 : tx + 3} y={ty - 2} fontSize={7.5} textAnchor={anchor} fill={PLAN.ink}>{text}</text>
    </g>
  );
}

/**
 * An ISO weld symbol: arrow to the joint, a horizontal reference line and a fillet triangle carrying
 * the leg size and length. `allRound` adds the circle at the kink.
 */
function WeldSymbol({ x, y, tx, ty, text, allRound }: {
  x: number; y: number; tx: number; ty: number; text: string; allRound?: boolean;
}) {
  const refX1 = tx + 74;
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={PLAN.weld} strokeWidth={0.9} />
      <polygon points={`${x},${y} ${x + (tx > x ? -6 : 6)},${y - 3} ${x + (tx > x ? -6 : 6)},${y + 3}`} fill={PLAN.weld} />
      <line x1={tx} y1={ty} x2={refX1} y2={ty} stroke={PLAN.weld} strokeWidth={0.9} />
      {allRound && <circle cx={tx} cy={ty} r={3.4} fill="none" stroke={PLAN.weld} strokeWidth={0.9} />}
      <polygon points={`${tx + 10},${ty} ${tx + 20},${ty} ${tx + 10},${ty - 9}`} fill={PLAN.weld} />
      <text x={tx + 23} y={ty - 2} fontSize={7.5} fill={PLAN.weld} fontWeight={700}>{text}</text>
    </g>
  );
}

/** Section-cut hatching inside a rectangle (concrete / steel body). */
function Hatch({ x, y, w, h, step = 7, color }: { x: number; y: number; w: number; h: number; step?: number; color: string }) {
  const lines: string[] = [];
  for (let i = -h; i < w; i += step) lines.push(`${x + i},${y + h} ${x + i + h},${y}`);
  return (
    <g>
      {lines.map((l, i) => {
        const [a, bpt] = l.split(" ");
        const [x1, y1] = a.split(",").map(Number);
        const [x2, y2] = bpt.split(",").map(Number);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.45} opacity={0.55} />;
      })}
    </g>
  );
}

/** A break line closing off a truncated member. */
function BreakLine({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const m = (x0 + x1) / 2;
  return (
    <polyline points={`${x0},${y} ${m - 6},${y} ${m - 2},${y - 6} ${m + 2},${y + 6} ${m + 6},${y} ${x1},${y}`}
      fill="none" stroke={PLAN.ink} strokeWidth={0.9} />
  );
}

/* ─────────────────────────────────────────────────────────────────── connection group selection ── */

const zOf = (s: PartSolid) => spanZ(s);

function groupOf(model: ColonyModel, cid: string | undefined): ColonyPart[] {
  if (!cid) return [];
  return model.parts.filter((p) => p.connectionId === cid);
}

/* ============================================================================== the sheet ======= */

export function ConnectionDetailSheet({ model, meta, connectionId }: ConnectionDetailSheetProps) {
  /* ---- pick the two representative connection groups --------------------------------------- */
  const basePlates = model.parts.filter((p) => p.kind === "base-plate" && p.connectionId);
  const gussets = model.parts.filter((p) => p.kind === "gusset" && p.connectionId);

  const wantedIsBase = connectionId != null && basePlates.some((p) => p.connectionId === connectionId);
  const wantedIsRidge = connectionId != null && gussets.some((p) => p.connectionId === connectionId);

  const baseCid = wantedIsBase ? connectionId : basePlates[0]?.connectionId;
  const ridgeCid = wantedIsRidge ? connectionId : gussets[0]?.connectionId;

  const baseGroup = groupOf(model, baseCid);
  const ridgeGroup = groupOf(model, ridgeCid);

  const plate = baseGroup.find((p) => p.kind === "base-plate");
  const levelling = baseGroup.find((p) => p.kind === "levelling-plate");
  const anchors = baseGroup.filter((p) => p.kind === "anchor-bolt");
  const nuts = baseGroup.filter((p) => p.kind === "nut");
  const washers = baseGroup.filter((p) => p.kind === "washer");

  const baseGrid = plate?.grid;
  const column = model.parts.find((p) => p.kind === "column" && (p.floor ?? 0) === 0 && p.grid === baseGrid);
  const pedestal = model.parts.find((p) => p.kind === "pedestal" && p.grid === baseGrid);

  const gusset = ridgeGroup.find((p) => p.kind === "gusset") ?? gussets[0];
  const trussTag = (gusset?.connectionId ?? "").split(":").slice(0, 2).join(":"); // "truss:t1"
  const trussMembers = trussTag
    ? model.parts.filter((p) => p.assemblyId === trussTag && (p.kind === "rafter" || p.kind === "truss-web" || p.kind === "ridge"))
    : [];
  const ridgeBolts = ridgeGroup.filter((p) => p.kind === "bolt" || p.kind === "anchor-bolt");

  const svgW = 980;
  const svgH = 700;

  /* ---- DETAIL A geometry (metres → detail px) ----------------------------------------------- */
  const pf = plate ? footprintXY(plate.solid) : null;
  const pz = plate ? zOf(plate.solid) : null;
  const plateSideM = pf ? Math.max(pf.x1 - pf.x0, pf.y1 - pf.y0) : 0;
  const plateTM = pz ? pz.z1 - pz.z0 : 0;
  // 300 px across the plate, so every base plate size reads at the same sheet size.
  const dppm = plateSideM > 0 ? 300 / plateSideM : 300;

  const planOx = 130, planOy = 130;                       // plan pane origin (plate top-left)
  const px = (m: number) => planOx + (pf ? (m - pf.x0) * dppm : 0);
  const py = (m: number) => planOy + (pf ? (m - pf.y0) * dppm : 0);

  const boltPlan = anchors
    .map((a) => {
      const f = footprintXY(a.solid);
      if (!f) return null;
      return { id: a.id, cx: (f.x0 + f.x1) / 2, cy: (f.y0 + f.y1) / 2, dM: Math.max(f.x1 - f.x0, f.y1 - f.y0) };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const bxs = [...new Set(boltPlan.map((b) => Number(b.cx.toFixed(4))))].sort((a, b) => a - b);
  const bys = [...new Set(boltPlan.map((b) => Number(b.cy.toFixed(4))))].sort((a, b) => a - b);
  const gaugeXm = bxs.length >= 2 ? bxs[bxs.length - 1] - bxs[0] : 0;
  const gaugeYm = bys.length >= 2 ? bys[bys.length - 1] - bys[0] : 0;
  const edgeXm = pf && bxs.length ? Math.max(0, bxs[0] - pf.x0) : 0;
  const edgeYm = pf && bys.length ? Math.max(0, bys[0] - pf.y0) : 0;
  const holeDiaMm = plate?.spec.holeDiaMm;
  const boltSpec = plate?.spec.boltSpec ?? anchors[0]?.spec.boltSpec ?? "—";
  const boltCount = plate?.spec.boltCount ?? anchors.length;

  /* ---- DETAIL A section (x–z), same scale --------------------------------------------------- */
  const secOx = 620;                                       // section pane centre-x
  const secBaseY = 300;                                    // px of the base-plate underside (z = plate z0)
  const sz = (m: number) => (pz ? secBaseY - (m - pz.z0) * dppm : secBaseY);
  const cf = column ? footprintXY(column.solid) : null;
  const cz = column ? zOf(column.solid) : null;
  const pedf = pedestal ? footprintXY(pedestal.solid) : null;
  const pedz = pedestal ? zOf(pedestal.solid) : null;
  const lz = levelling ? zOf(levelling.solid) : null;
  const az = anchors[0] ? zOf(anchors[0].solid) : null;
  const nz = nuts[0] ? zOf(nuts[0].solid) : null;
  const wz = washers[0] ? zOf(washers[0].solid) : null;
  const groutM = lz && pz ? Math.max(0, pz.z0 - lz.z0) : 0;

  const halfPlate = (plateSideM / 2) * dppm;

  /* ---- DETAIL B geometry (y–z plane of the truss) ------------------------------------------- */
  const gf = gusset ? footprintXY(gusset.solid) : null;
  const gz = gusset ? zOf(gusset.solid) : null;
  const gyC = gf ? (gf.y0 + gf.y1) / 2 : 0;
  const gzC = gz ? (gz.z0 + gz.z1) / 2 : 0;
  const gSpanM = Math.max(0.6, gf ? (gf.y1 - gf.y0) * 3.2 : 0.8);
  const gppm = 260 / gSpanM;
  const gOx = 250, gOy = 540;
  const gx = (m: number) => gOx + (m - gyC) * gppm;
  const gy = (m: number) => gOy - (m - gzC) * gppm;

  const projYZ = (s: PartSolid): { x: number; y: number }[] | null => {
    if (s.kind === "quad") return s.pts.map((p) => ({ x: gx(p.y), y: gy(p.z) }));
    const f = footprintXY(s), z = zOf(s);
    if (!f || !z) return null;
    return [
      { x: gx(f.y0), y: gy(z.z0) }, { x: gx(f.y1), y: gy(z.z0) },
      { x: gx(f.y1), y: gy(z.z1) }, { x: gx(f.y0), y: gy(z.z1) },
    ];
  };

  const gussetW = gf ? gf.y1 - gf.y0 : 0;
  const gussetH = gz ? gz.z1 - gz.z0 : 0;
  /** The plate is thin in x (the gusset lies IN the truss plane), so x is its thickness. */
  const gussetT = gf ? gf.x1 - gf.x0 : 0;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 680) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* ══════════════════════════ DETAIL A — COLUMN BASE PLATE ══════════════════════════ */}
        <text x={40} y={40} fontSize={11} fill={PLAN.ink} fontWeight={800}>
          DETAIL A — COLUMN BASE PLATE {baseGrid ? `AT GRID ${baseGrid}` : ""} (enlarged, mm)
        </text>
        <line x1={40} y1={48} x2={svgW - 40} y2={48} stroke={PLAN.rule} strokeWidth={1} />

        {!plate || !pf ? (
          <text x={40} y={80} fontSize={10} fill={PLAN.sub}>
            No base-plate connection group in the model — enable connection detail to generate it.
          </text>
        ) : (
          <>
            <text x={planOx} y={planOy - 26} fontSize={9} fill={PLAN.dim} fontWeight={700}>A1 · PLAN ON BASE PLATE</text>

            {/* column footprint over the plate (dashed — above the cut) */}
            {cf && (
              <rect x={px(cf.x0)} y={py(cf.y0)} width={(cf.x1 - cf.x0) * dppm} height={(cf.y1 - cf.y0) * dppm}
                fill="none" stroke={PLAN.column} strokeWidth={1} strokeDasharray="5 3" />
            )}

            {/* the plate */}
            <rect x={px(pf.x0)} y={py(pf.y0)} width={(pf.x1 - pf.x0) * dppm} height={(pf.y1 - pf.y0) * dppm}
              fill={PLAN.plateFill} stroke={PLAN.plate} strokeWidth={1.6} />

            {/* bolt holes + bolts */}
            {boltPlan.map((bp) => {
              const holeR = holeDiaMm ? (holeDiaMm / 1000) * dppm / 2 : (bp.dM * dppm) / 2 + 2;
              return (
                <g key={bp.id}>
                  <circle cx={px(bp.cx)} cy={py(bp.cy)} r={holeR} fill={PLAN.paper} stroke={PLAN.plate} strokeWidth={1} />
                  <circle cx={px(bp.cx)} cy={py(bp.cy)} r={(bp.dM * dppm) / 2} fill={PLAN.bolt} />
                  {/* centre cross */}
                  <line x1={px(bp.cx) - holeR - 5} y1={py(bp.cy)} x2={px(bp.cx) + holeR + 5} y2={py(bp.cy)} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                  <line x1={px(bp.cx)} y1={py(bp.cy) - holeR - 5} x2={px(bp.cx)} y2={py(bp.cy) + holeR + 5} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                </g>
              );
            })}

            {/* plan dimensions: overall, bolt gauge, edge distance */}
            <DimH x0={px(pf.x0)} x1={px(pf.x1)} y={planOy - 12} mm={pf.x1 - pf.x0} />
            {bxs.length >= 2 && <DimH x0={px(bxs[0])} x1={px(bxs[bxs.length - 1])} y={py(pf.y1) + 22} mm={gaugeXm} />}
            {bxs.length >= 1 && <DimH x0={px(pf.x0)} x1={px(bxs[0])} y={py(pf.y1) + 44} mm={edgeXm} />}
            <DimV y0={py(pf.y0)} y1={py(pf.y1)} x={px(pf.x1) + 26} mm={pf.y1 - pf.y0} />
            {bys.length >= 2 && <DimV y0={py(bys[0])} y1={py(bys[bys.length - 1])} x={px(pf.x0) - 22} mm={gaugeYm} />}
            {bys.length >= 1 && <DimV y0={py(pf.y0)} y1={py(bys[0])} x={px(pf.x0) - 46} mm={edgeYm} />}

            <text x={px(pf.x0)} y={py(pf.y1) + 66} fontSize={7.5} fill={PLAN.dim}>
              Bolt gauge {mmLabel(gaugeXm)} × {mmLabel(gaugeYm)} · edge distance {mmLabel(edgeXm)} / {mmLabel(edgeYm)}
            </text>

            {boltPlan[0] && (
              <Leader x={px(boltPlan[0].cx)} y={py(boltPlan[0].cy)} tx={planOx - 92} ty={planOy - 44}
                text={`${boltCount} nos ${boltSpec} — Ø${num(holeDiaMm)} holes`} />
            )}

            {/* ── A2 · SECTION ─────────────────────────────────────────────────────────────── */}
            <text x={secOx - halfPlate} y={planOy - 26} fontSize={9} fill={PLAN.dim} fontWeight={700}>A2 · SECTION THROUGH BASE</text>

            {/* pedestal / RCC below */}
            {pedz && (
              <>
                <rect x={secOx - halfPlate * 1.35} y={sz(pedz.z1)} width={halfPlate * 2.7}
                  height={Math.max(20, (pedz.z1 - Math.max(pedz.z0, pedz.z1 - 0.6)) * dppm)}
                  fill={PLAN.footingFill} stroke={PLAN.pedestal} strokeWidth={1.2} />
                <Hatch x={secOx - halfPlate * 1.35} y={sz(pedz.z1)} w={halfPlate * 2.7}
                  h={Math.max(20, (pedz.z1 - Math.max(pedz.z0, pedz.z1 - 0.6)) * dppm)} color={PLAN.pedestal} />
                <Leader x={secOx - halfPlate * 1.2} y={sz(pedz.z1) + 24} tx={secOx - halfPlate * 1.2 - 96} ty={sz(pedz.z1) + 52}
                  text={`RCC pedestal ${pedestal?.partMark ?? ""}`} />
              </>
            )}

            {/* grout / levelling gap */}
            {lz && groutM > 0 && (
              <>
                <rect x={secOx - halfPlate} y={sz(pz ? pz.z0 : 0)} width={halfPlate * 2} height={Math.max(3, groutM * dppm)}
                  fill={PLAN.pcc} stroke={PLAN.pedestal} strokeWidth={0.8} />
                <Leader x={secOx - halfPlate + 6} y={sz(pz ? pz.z0 : 0) + 3} tx={secOx - halfPlate - 110} ty={sz(pz ? pz.z0 : 0) - 6}
                  text={`Levelling plate / grout ${mmLabel(groutM)} mm`} />
              </>
            )}

            {/* the base plate in section */}
            {pz && (
              <>
                <rect x={secOx - halfPlate} y={sz(pz.z1)} width={halfPlate * 2} height={Math.max(3, plateTM * dppm)}
                  fill={PLAN.plate} stroke={PLAN.plate} strokeWidth={1} />
                <DimV y0={sz(pz.z1)} y1={sz(pz.z0)} x={secOx + halfPlate + 30} mm={plateTM} />
                <Leader x={secOx + halfPlate - 8} y={sz(pz.z1) + 2} tx={secOx + halfPlate + 54} ty={sz(pz.z1) - 22}
                  text={`Base plate ${plate.partMark ?? "BP"} ${mmLabel(pf.x1 - pf.x0)}×${mmLabel(pf.y1 - pf.y0)}×${mmLabel(plateTM)} thk`} />
              </>
            )}

            {/* column above, truncated with a break line */}
            {cf && cz && pz && (
              <>
                {(() => {
                  const cw = (cf.x1 - cf.x0) * dppm;
                  const topY = sz(pz.z1) - 118;
                  return (
                    <g>
                      <rect x={secOx - cw / 2} y={topY} width={cw} height={sz(pz.z1) - topY}
                        fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.4} />
                      <BreakLine x0={secOx - cw / 2} x1={secOx + cw / 2} y={topY} />
                      <Leader x={secOx - cw / 2} y={topY + 34} tx={secOx - cw / 2 - 120} ty={topY + 12}
                        text={`Column ${column?.partMark ?? "C"} ${column?.spec.sectionSize ?? ""}`} />
                      <WeldSymbol x={secOx + cw / 2 + 2} y={sz(pz.z1) - 4} tx={secOx + cw / 2 + 58} ty={sz(pz.z1) - 44}
                        allRound
                        text={plate.spec.weldSpec ?? "6 fillet, all round — shop weld"} />
                    </g>
                  );
                })()}
              </>
            )}

            {/* anchor bolt + washer + nut stack in section */}
            {az && pz && boltPlan.slice(0, 2).map((bp, i) => {
              const sx = secOx + (i === 0 ? -1 : 1) * (Math.abs(bp.cx - (pf.x0 + pf.x1) / 2) * dppm);
              const dPx = Math.max(2.4, bp.dM * dppm);
              return (
                <g key={`sec-${bp.id}`}>
                  {/* embedded shank (dashed below the pedestal top) */}
                  <line x1={sx} y1={sz(az.z0)} x2={sx} y2={sz(pz.z0)} stroke={PLAN.bolt} strokeWidth={dPx} strokeDasharray="6 3" opacity={0.7} />
                  <line x1={sx} y1={sz(pz.z0)} x2={sx} y2={sz(az.z1)} stroke={PLAN.bolt} strokeWidth={dPx} />
                  {wz && (
                    <rect x={sx - dPx * 1.8} y={sz(wz.z1)} width={dPx * 3.6} height={Math.max(2, (wz.z1 - wz.z0) * dppm)}
                      fill={PLAN.plate} />
                  )}
                  {nz && (
                    <rect x={sx - dPx * 1.5} y={sz(nz.z1)} width={dPx * 3} height={Math.max(3, (nz.z1 - nz.z0) * dppm)}
                      fill={PLAN.bolt} stroke={PLAN.ink} strokeWidth={0.6} />
                  )}
                  {i === 1 && nz && (
                    <Leader x={sx + dPx * 1.5} y={sz(nz.z1) + 2} tx={sx + 66} ty={sz(nz.z1) - 26}
                      text="Nut + washer, tighten after grouting" />
                  )}
                  {i === 0 && (
                    <Leader x={sx} y={sz(az.z0) - 6} tx={sx - 118} ty={sz(az.z0) + 16}
                      text={`${boltSpec} — embedded ${mmLabel(pz.z0 - az.z0)} mm`} />
                  )}
                </g>
              );
            })}
          </>
        )}

        {/* ══════════════════════════ DETAIL B — TRUSS RIDGE GUSSET ═════════════════════════ */}
        <line x1={40} y1={430} x2={svgW - 40} y2={430} stroke={PLAN.rule} strokeWidth={1} />
        <text x={40} y={452} fontSize={11} fill={PLAN.ink} fontWeight={800}>
          DETAIL B — TRUSS RIDGE / EAVE GUSSET {trussTag ? `(${trussTag.toUpperCase()})` : ""} (enlarged, mm)
        </text>

        {!gusset || !gf || !gz ? (
          <text x={40} y={480} fontSize={10} fill={PLAN.sub}>
            No gusset connection group in the model — a flat or mono roof has no ridge gusset.
          </text>
        ) : (
          <>
            {/* truss members meeting at the joint */}
            {trussMembers.map((m) => {
              const pts = projYZ(m.solid);
              if (!pts) return null;
              return (
                <polygon key={m.id} points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.1} opacity={0.95} />
              );
            })}

            {/* the gusset plate over them */}
            <polygon
              points={[
                `${gx(gf.y0)},${gy(gz.z1)}`, `${gx(gf.y1)},${gy(gz.z1)}`,
                `${gx(gf.y1)},${gy(gz.z0)}`, `${gx(gf.y0)},${gy(gz.z0)}`,
              ].join(" ")}
              fill={PLAN.plateFill} stroke={PLAN.plate} strokeWidth={1.6} opacity={0.95} />

            {/* bolt group — only when the connection group actually carries bolts */}
            {ridgeBolts.length > 0
              ? ridgeBolts.map((bp) => {
                const f = footprintXY(bp.solid);
                if (!f) return null;
                const r = Math.max(2.5, ((f.y1 - f.y0) * gppm) / 2);
                const cy0 = zOf(bp.solid);
                const cyv = cy0 ? (cy0.z0 + cy0.z1) / 2 : gzC;
                return (
                  <g key={bp.id}>
                    <circle cx={gx((f.y0 + f.y1) / 2)} cy={gy(cyv)} r={r + 1.6} fill={PLAN.paper} stroke={PLAN.plate} strokeWidth={0.9} />
                    <circle cx={gx((f.y0 + f.y1) / 2)} cy={gy(cyv)} r={r} fill={PLAN.bolt} />
                  </g>
                );
              })
              : (
                <WeldSymbol x={gx(gf.y1)} y={gy(gzC)} tx={gx(gf.y1) + 90} ty={gy(gzC) - 46} allRound
                  text={gusset.spec.weldSpec ?? "Fillet weld all round — size to engineer's approval"} />
              )}

            {/* gusset dimensions */}
            <DimH x0={gx(gf.y0)} x1={gx(gf.y1)} y={gy(gz.z0) + 26} mm={gussetW} />
            <DimV y0={gy(gz.z1)} y1={gy(gz.z0)} x={gx(gf.y1) + 26} mm={gussetH} />
            <Leader x={gx(gf.y0) + 6} y={gy(gz.z1) + 6} tx={gx(gf.y0) - 150} ty={gy(gz.z1) - 24}
              text={`Gusset ${gusset.partMark ?? "GP"} ${mmLabel(gussetW)}×${mmLabel(gussetH)}×${mmLabel(gussetT)} thk`} />

            {/* member marks */}
            {trussMembers.slice(0, 4).map((m, i) => {
              const pts = projYZ(m.solid);
              if (!pts) return null;
              const cxp = pts.reduce((a, p) => a + p.x, 0) / pts.length;
              const cyp = pts.reduce((a, p) => a + p.y, 0) / pts.length;
              return (
                <g key={`mk-${m.id}`}>
                  <rect x={cxp - 16} y={cyp - 7} width={32} height={13} rx={2} fill={PLAN.paper} stroke={PLAN.rule} strokeWidth={0.6} />
                  <text x={cxp} y={cyp + 3} fontSize={7.5} textAnchor="middle" fill={PLAN.ink} fontWeight={700}>
                    {m.partMark ?? `M${i + 1}`}
                  </text>
                </g>
              );
            })}

            <text x={560} y={490} fontSize={8} fill={PLAN.dim} fontWeight={700}>CONNECTION SCHEDULE</text>
            {[
              ["Connection", gusset.connectionId ?? "—"],
              ["Gusset plate", `${mmLabel(gussetW)} × ${mmLabel(gussetH)} × ${mmLabel(gussetT)} mm`],
              ["Members", trussMembers.map((m) => m.partMark ?? m.kind).filter((v, i, arr) => arr.indexOf(v) === i).join(", ") || "—"],
              ["Bolts in group", ridgeBolts.length > 0 ? `${ridgeBolts.length} nos ${ridgeBolts[0]?.spec.boltSpec ?? ""}` : "Welded joint — no bolt group"],
              ["Weld", gusset.spec.weldSpec ?? "Fillet all round, size to engineer's approval"],
              ["Fabrication", gusset.fabrication ?? "shop"],
            ].map(([k, v], i) => (
              <g key={k}>
                <text x={560} y={508 + i * 15} fontSize={8} fill={PLAN.sub}>{k}</text>
                <text x={680} y={508 + i * 15} fontSize={8} fill={PLAN.ink} fontWeight={600}>{v}</text>
                <line x1={560} y1={512 + i * 15} x2={940} y2={512 + i * 15} stroke={PLAN.hair} strokeWidth={0.5} />
              </g>
            ))}
          </>
        )}

        <text x={40} y={svgH - 14} fontSize={7.5} fill={PLAN.sub}>
          All dimensions in millimetres unless noted. Plate sizes, bolt specifications, hole diameters and bolt
          positions are read from the model&apos;s connection groups — {meta.projectName}. Build to written dimensions.
        </text>
      </svg>
    </div>
  );
}
