"use client";

import type { ConstructionPlan } from "@/lib/quotation/labourColonyPlan";
import type { ColumnMark, FootingType } from "@/lib/quotation/labourColonyRebar";
import { gridLetter } from "@/lib/quotation/labourColonyRebar";

/**
 * FOOTING LAYOUT / SETTING-OUT PLAN — the sheet the site engineer excavates from.
 *
 * Every footing is drawn TO SCALE at its own grid intersection and sized by its OWN type, so an
 * F1 internal pad and an F3 corner pad are visibly different squares, not one generic block. The
 * grid is the ARCHITECTURAL one (plan.colXs × plan.rowYs) with bubbles A,B,C… across and 1,2,3…
 * down, which is what a builder pegs out with a tape.
 *
 * Below the plan, the SETTING-OUT COORDINATE TABLE gives every column an (X, Y) in millimetres
 * from the origin (the top-left corner of the room block), its grid reference and its footing type
 * — so the pits can be marked out without scaling the drawing.
 *
 * Schematic reference — NOT a stamped structural drawing.
 */

const COL = {
  outline: "#0f172a",
  block: "#94a3b8",
  grid: "#94a3b8",
  bubble: "#334155",
  bubbleBg: "#ffffff",
  centre: "#0f172a",
  mark: "#b91c1c",
  colMark: "#1d4ed8",
  dim: "#334155",
  note: "#64748b",
  ink: "#0f172a",
};

/** Footing-type fills / strokes — F1, F2, F3 … Plain hex only: html2canvas cannot parse oklch(). */
const TYPE_FILL = ["#fde68a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff", "#fed7aa"];
const TYPE_STROKE = ["#b45309", "#1d4ed8", "#15803d", "#b91c1c", "#7e22ce", "#c2410c"];

const fillFor = (i: number) => TYPE_FILL[((i % TYPE_FILL.length) + TYPE_FILL.length) % TYPE_FILL.length];
const strokeFor = (i: number) => TYPE_STROKE[((i % TYPE_STROKE.length) + TYPE_STROKE.length) % TYPE_STROKE.length];

/** Finite-or-fallback. Every number crossing a module boundary is sanitised BEFORE it reaches the SVG. */
const fin = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(fin(v, lo), lo), hi);
/** metres → whole millimetres, NaN-proof. */
const mmOf = (m: number) => Math.round(fin(m, 0) * 1000);
/** Sort key from a mark like "C12" → 12; unparseable marks sort last. */
const markNo = (mark: string) => {
  const n = parseInt(mark.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

interface Placed {
  col: ColumnMark;
  type: FootingType;
  typeIndex: number;
  /** Sanitised footing side (m) — never 0, never NaN. */
  sideM: number;
}

export function FootingLayoutPlan({ plan, footingTypes }: { plan: ConstructionPlan; footingTypes: FootingType[] }) {
  const types = (footingTypes ?? []).filter((t): t is FootingType => Boolean(t));

  /* ---- sanitise the grid before anything reaches the SVG ---- */
  const colXs = (plan?.colXs ?? []).filter((v) => Number.isFinite(v));
  const rowYs = (plan?.rowYs ?? []).filter((v) => Number.isFinite(v));

  /* ---- every column, with the footing type that carries it (first type wins on a duplicate) ---- */
  const placedMap = new Map<string, Placed>();
  types.forEach((t, typeIndex) => {
    const side = clamp(t.sideM, 0.3, 6);
    for (const col of t.columns ?? []) {
      if (!col || placedMap.has(col.mark)) continue;
      if (!Number.isFinite(col.xM) || !Number.isFinite(col.yM)) continue;
      placedMap.set(col.mark, { col, type: t, typeIndex, sideM: side });
    }
  });
  const placed = [...placedMap.values()].sort((a, b) => {
    const d = markNo(a.col.mark) - markNo(b.col.mark);
    return d !== 0 ? d : a.col.mark.localeCompare(b.col.mark);
  });

  const degenerate = types.length === 0 || colXs.length < 2 || rowYs.length < 2 || placed.length === 0;

  if (degenerate) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-slate-800">
        <Header meta="No footing schedule to set out" />
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-xs font-semibold text-slate-600">Footing layout not available</p>
          <p className="mt-1 text-[11px] text-slate-500">
            A setting-out plan needs a structural grid of at least 2 × 2 lines and at least one footing type.
            {types.length === 0
              ? " No footing types were produced for this foundation."
              : ` This plan has ${colXs.length} vertical and ${rowYs.length} horizontal grid line(s)${
                  placed.length === 0 ? " and no columns on them" : ""
                }.`}{" "}
            Set the room block and foundation in the Civil tab, then re-open this sheet.
          </p>
        </div>
      </div>
    );
  }

  /* ---- drawing extents (metres) ---- */
  const blockW = Math.max(0, fin(plan.blockW, 0));
  const blockD = Math.max(0, fin(plan.blockD, 0));
  const minX = Math.min(0, ...colXs);
  const minY = Math.min(0, ...rowYs);
  const maxX = Math.max(blockW, ...colXs);
  const maxY = Math.max(blockD, ...rowYs);
  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);

  /* ---- scale: px per metre, bounded so a long block stays legible and a tiny one is not absurd ---- */
  const S = clamp(Math.min(760 / spanX, 460 / spanY), 10, 44);
  const X = (m: number) => (fin(m, minX) - minX) * S;
  const Y = (m: number) => (fin(m, minY) - minY) * S;
  const px = (m: number) => Math.max(0, fin(m, 0)) * S;

  /* ---- the biggest footing decides the margins, so nothing collides with the bubbles/chains ---- */
  const maxSidePx = Math.max(10, ...placed.map((p) => px(p.sideM)));
  const HALF = maxSidePx / 2;
  const CHAIN_OFF = HALF + 22;
  const BUBBLE_OFF = HALF + 48;
  const PAD_L = BUBBLE_OFF + 30;
  const PAD_T = BUBBLE_OFF + 30;
  const PAD_R = HALF + 40;
  const PAD_B = HALF + 54;

  const svgW = Math.round(X(maxX) + PAD_L + PAD_R);
  const svgH = Math.round(Y(maxY) + PAD_T + PAD_B);

  const gridTop = Y(minY) - CHAIN_OFF;
  const gridBot = Y(maxY) + HALF + 12;
  const gridLeft = X(minX) - CHAIN_OFF;
  const gridRight = X(maxX) + HALF + 12;

  const totalFootings = types.reduce((s, t) => s + Math.max(0, Math.round(fin(t.count, 0))), 0);

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      <Header
        meta={`${placed.length} columns · ${types.length} footing type${types.length === 1 ? "" : "s"} · grid ${colXs.length} × ${rowYs.length} · ${totalFootings} footings`}
      />

      {/* ------------------------------------------------------------ SETTING-OUT PLAN */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="h-auto w-full"
          style={{ minWidth: Math.max(640, Math.min(1100, svgW)) }}
        >
          <text x={svgW / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={700} fill={COL.ink} letterSpacing={1}>
            FOOTING LAYOUT — SETTING-OUT PLAN
          </text>

          {/* north arrow */}
          <g transform={`translate(${svgW - 26},34)`}>
            <line x1={0} y1={13} x2={0} y2={-9} stroke={COL.dim} strokeWidth={1.4} />
            <polygon points="0,-14 -4,-6 4,-6" fill={COL.dim} />
            <text x={0} y={25} textAnchor="middle" fontSize={8.5} fill={COL.dim}>N</text>
          </g>

          <g transform={`translate(${PAD_L},${PAD_T})`}>
            {/* ---- room-block outline (light, dashed) — orientation only ---- */}
            {blockW > 0 && blockD > 0 && (
              <rect
                x={X(0)} y={Y(0)} width={px(blockW)} height={px(blockD)}
                fill="none" stroke={COL.block} strokeWidth={1.2} strokeDasharray="8 5"
              />
            )}

            {/* ---- structural grid lines + bubbles ---- */}
            {colXs.map((x, i) => (
              <g key={`gx${i}`}>
                <line
                  x1={X(x)} y1={gridTop} x2={X(x)} y2={gridBot}
                  stroke={COL.grid} strokeWidth={0.8} strokeDasharray="7 3 2 3"
                />
                <circle cx={X(x)} cy={Y(minY) - BUBBLE_OFF} r={9} fill={COL.bubbleBg} stroke={COL.bubble} strokeWidth={1} />
                <text
                  x={X(x)} y={Y(minY) - BUBBLE_OFF + 3.4}
                  textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.bubble}
                >
                  {gridLetter(i)}
                </text>
              </g>
            ))}
            {rowYs.map((y, i) => (
              <g key={`gy${i}`}>
                <line
                  x1={gridLeft} y1={Y(y)} x2={gridRight} y2={Y(y)}
                  stroke={COL.grid} strokeWidth={0.8} strokeDasharray="7 3 2 3"
                />
                <circle cx={X(minX) - BUBBLE_OFF} cy={Y(y)} r={9} fill={COL.bubbleBg} stroke={COL.bubble} strokeWidth={1} />
                <text
                  x={X(minX) - BUBBLE_OFF} y={Y(y) + 3.4}
                  textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.bubble}
                >
                  {i + 1}
                </text>
              </g>
            ))}

            {/* ---- the footings: a square TO SCALE at every grid intersection, sized by its own type ---- */}
            {placed.map((p) => {
              const sPx = Math.max(8, px(p.sideM));
              const cx = X(p.col.xM);
              const cy = Y(p.col.yM);
              const half = sPx / 2;
              const insideF = sPx >= 22;
              const insideC = sPx >= 36;
              const fFont = clamp(sPx * 0.26, 7, 12);
              return (
                <g key={p.col.mark}>
                  <rect
                    x={cx - half} y={cy - half} width={sPx} height={sPx}
                    fill={fillFor(p.typeIndex)} stroke={strokeFor(p.typeIndex)} strokeWidth={1.3}
                  />
                  {/* setting-out point — the grid intersection the tape is pulled from */}
                  <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke={COL.centre} strokeWidth={0.9} />
                  <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke={COL.centre} strokeWidth={0.9} />

                  {/* footing mark — inside the pad when it fits, otherwise outside */}
                  {insideF ? (
                    <text
                      x={cx} y={insideC ? cy - 2 : cy + fFont / 3}
                      textAnchor="middle" fontSize={fFont} fontWeight={700} fill={COL.mark}
                    >
                      {p.type.mark}
                    </text>
                  ) : (
                    <text x={cx - half - 2} y={cy + half + 9} textAnchor="end" fontSize={7.5} fontWeight={700} fill={COL.mark}>
                      {p.type.mark}
                    </text>
                  )}

                  {/* column mark */}
                  {insideC ? (
                    <text x={cx} y={cy + fFont + 1} textAnchor="middle" fontSize={fFont * 0.82} fontWeight={700} fill={COL.colMark}>
                      {p.col.mark}
                    </text>
                  ) : (
                    <text x={cx + half + 3} y={cy - half - 2.5} fontSize={8} fontWeight={700} fill={COL.colMark}>
                      {p.col.mark}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ---- dimension chains: grid spacing across the top and down the left ---- */}
            <DimChainH xs={colXs} X={X} y={Y(minY) - CHAIN_OFF} />
            <DimChainV ys={rowYs} Y={Y} x={X(minX) - CHAIN_OFF} />

            {/* ---- overall ---- */}
            <g>
              <line
                x1={X(colXs[0])} y1={Y(maxY) + HALF + 30} x2={X(colXs[colXs.length - 1])} y2={Y(maxY) + HALF + 30}
                stroke={COL.dim} strokeWidth={1}
              />
              <line x1={X(colXs[0])} y1={Y(maxY) + HALF + 26} x2={X(colXs[0])} y2={Y(maxY) + HALF + 34} stroke={COL.dim} strokeWidth={1} />
              <line
                x1={X(colXs[colXs.length - 1])} y1={Y(maxY) + HALF + 26}
                x2={X(colXs[colXs.length - 1])} y2={Y(maxY) + HALF + 34}
                stroke={COL.dim} strokeWidth={1}
              />
              <text
                x={(X(colXs[0]) + X(colXs[colXs.length - 1])) / 2} y={Y(maxY) + HALF + 44}
                textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.dim}
              >
                {mmOf(colXs[colXs.length - 1] - colXs[0])} mm OVERALL (grid c/c)
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* ------------------------------------------------------------------- LEGEND */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600">
        {types.map((t, i) => (
          <span key={t.mark} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ background: fillFor(i), borderColor: strokeFor(i) }}
            />
            <span className="font-bold text-slate-800">{t.mark}</span>
            <span className="text-slate-500">
              {mmOf(t.sideM)} × {mmOf(t.sideM)} × {mmOf(t.depthM)} deep · {t.kind} ·{" "}
              {Math.max(0, Math.round(fin(t.count, 0)))} no.
            </span>
          </span>
        ))}
        <span className="text-slate-400">Bubbles: letters across (colXs), numbers down (rowYs) — grid ref e.g. A-1</span>
      </div>

      {/* --------------------------------------------- SETTING-OUT COORDINATE TABLE */}
      <div className="mt-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-700">
          Setting-Out Coordinate Table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                {["Column mark", "Grid ref", "Footing type", "X (mm)", "Y (mm)", "Footing size (mm)"].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-1 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {placed.map((p) => (
                <tr key={p.col.mark}>
                  <td className="border border-slate-300 px-2 py-1 font-bold text-blue-700">{p.col.mark}</td>
                  <td className="border border-slate-300 px-2 py-1 font-medium text-slate-700">{p.col.grid}</td>
                  <td className="border border-slate-300 px-2 py-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm border"
                        style={{ background: fillFor(p.typeIndex), borderColor: strokeFor(p.typeIndex) }}
                      />
                      <span className="font-bold text-red-700">{p.type.mark}</span>
                      <span className="text-slate-400">({p.type.kind})</span>
                    </span>
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right tabular-nums">{mmOf(p.col.xM)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right tabular-nums">{mmOf(p.col.yM)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right tabular-nums">
                    {mmOf(p.sideM)} × {mmOf(p.sideM)} × {mmOf(p.type.depthM)} deep
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
          X and Y are measured in millimetres from the SETTING-OUT ORIGIN (0, 0) at the top-left corner of the room
          block: X to the right along the lettered grid, Y down the page along the numbered grid. Peg out the two
          reference lines first, square the grid by diagonals, then mark every footing centre from the table — do not
          scale the drawing. The deepest pad on this layout is{" "}
          {mmOf(Math.max(...types.map((t) => fin(t.depthM, 0))))} mm thick; size the excavation pits for the pad plus
          the PCC bed below it and 150 mm working space each side. Verify all levels at site before excavation.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- helpers */

function Header({ meta }: { meta: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-300 pb-2">
      <h3 className="text-sm font-bold tracking-wide text-slate-900">FOOTING LAYOUT &amp; SETTING-OUT PLAN</h3>
      <div className="text-xs text-slate-500">{meta}</div>
      <div className="text-[10px] text-slate-400">Schematic reference — NOT a stamped structural drawing</div>
    </div>
  );
}

/** Grid-spacing chain across the top: one tick per grid line, the c/c span labelled between them. */
function DimChainH({ xs, X, y }: { xs: number[]; X: (m: number) => number; y: number }) {
  return (
    <g>
      <line x1={X(xs[0])} y1={y} x2={X(xs[xs.length - 1])} y2={y} stroke={COL.dim} strokeWidth={1} />
      {xs.map((x, i) => (
        <line key={`t${i}`} x1={X(x)} y1={y - 4} x2={X(x)} y2={y + 4} stroke={COL.dim} strokeWidth={1} />
      ))}
      {xs.slice(0, -1).map((x, i) => (
        <text key={`l${i}`} x={(X(x) + X(xs[i + 1])) / 2} y={y - 5} textAnchor="middle" fontSize={8.5} fill={COL.dim}>
          {mmOf(xs[i + 1] - x)}
        </text>
      ))}
    </g>
  );
}

/** Grid-spacing chain down the left, labels rotated to read up the page. */
function DimChainV({ ys, Y, x }: { ys: number[]; Y: (m: number) => number; x: number }) {
  return (
    <g>
      <line x1={x} y1={Y(ys[0])} x2={x} y2={Y(ys[ys.length - 1])} stroke={COL.dim} strokeWidth={1} />
      {ys.map((y, i) => (
        <line key={`t${i}`} x1={x - 4} y1={Y(y)} x2={x + 4} y2={Y(y)} stroke={COL.dim} strokeWidth={1} />
      ))}
      {ys.slice(0, -1).map((y, i) => {
        const my = (Y(y) + Y(ys[i + 1])) / 2;
        return (
          <text
            key={`l${i}`} x={x - 5} y={my} textAnchor="middle" fontSize={8.5} fill={COL.dim}
            transform={`rotate(-90 ${x - 5} ${my})`}
          >
            {mmOf(ys[i + 1] - y)}
          </text>
        );
      })}
    </g>
  );
}
