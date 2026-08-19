"use client";

/**
 * LABOUR COLONY — REFERENCE GA DRAWING: millimetre SVG primitives.
 *
 * The fabrication set's `sheetPrimitives` print METRES ("3.00 m"); the reference sheet prints whole
 * MILLIMETRES ("3000"), because that is what its corner note promises and what a fabricator reads off
 * a tender drawing. Rather than adding a unit mode to the shared primitives (and risking a metre
 * sheet silently switching units), the mm variants live here and the shared ones stay untouched.
 *
 * EXPORT-SAFE: literal hex, explicit <polygon> arrowheads — never <marker>/url(#…), which a
 * serialised standalone SVG drops.
 */

import { REF, mmText, type RefGridStation } from "./referenceScale";

const arrow = (x: number, y: number, dir: "l" | "r" | "u" | "d"): string => {
  const s = 4.5;
  if (dir === "l") return `${x},${y} ${x + s},${y - s / 1.7} ${x + s},${y + s / 1.7}`;
  if (dir === "r") return `${x},${y} ${x - s},${y - s / 1.7} ${x - s},${y + s / 1.7}`;
  if (dir === "u") return `${x},${y} ${x - s / 1.7},${y + s} ${x + s / 1.7},${y + s}`;
  return `${x},${y} ${x - s / 1.7},${y - s} ${x + s / 1.7},${y - s}`;
};

/** One overall horizontal dimension in mm, with witness ticks and a centred label. */
export function DimMmH({ x0, x1, y, m, bold }: { x0: number; x1: number; y: number; m: number; bold?: boolean }) {
  const mid = (x0 + x1) / 2;
  const label = mmText(m);
  const w = Math.max(24, label.length * 6);
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={REF.ink} strokeWidth={bold ? 1 : 0.8} />
      <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke={REF.ink} strokeWidth={0.8} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={REF.ink} strokeWidth={0.8} />
      <polygon points={arrow(x0, y, "l")} fill={REF.ink} />
      <polygon points={arrow(x1, y, "r")} fill={REF.ink} />
      <rect x={mid - w / 2} y={y - 9} width={w} height={11} fill={REF.paper} />
      <text x={mid} y={y - 1} fontSize={bold ? 9.5 : 8.5} textAnchor="middle" fill={REF.ink} fontWeight={bold ? 700 : 500}>
        {label}
      </text>
    </g>
  );
}

/** One overall vertical dimension in mm, label rotated as a CAD sheet sets it out. */
export function DimMmV({ y0, y1, x, m, bold }: { y0: number; y1: number; x: number; m: number; bold?: boolean }) {
  const mid = (y0 + y1) / 2;
  const label = mmText(m);
  const h = Math.max(24, label.length * 6);
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={REF.ink} strokeWidth={bold ? 1 : 0.8} />
      <line x1={x - 4} y1={y0} x2={x + 4} y2={y0} stroke={REF.ink} strokeWidth={0.8} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={REF.ink} strokeWidth={0.8} />
      <polygon points={arrow(x, y0, "u")} fill={REF.ink} />
      <polygon points={arrow(x, y1, "d")} fill={REF.ink} />
      <rect x={x - 9} y={mid - h / 2} width={11} height={h} fill={REF.paper} />
      <text x={x} y={mid} fontSize={bold ? 9.5 : 8.5} textAnchor="middle" fill={REF.ink} fontWeight={bold ? 700 : 500}
        transform={`rotate(-90 ${x} ${mid})`}>
        {label}
      </text>
    </g>
  );
}

/**
 * A horizontal dimension CHAIN in mm — a tick at every station, the bay size between each adjacent
 * pair. `at` maps a station's metre coordinate to its px position, so a mirrored (viewed-from-the-far-
 * side) elevation stays correct without the chain knowing about the flip.
 */
export function DimChainMmH({
  stations, y, at, skipBelowPx = 13,
}: {
  stations: RefGridStation[];
  y: number;
  at: (m: number) => number;
  skipBelowPx?: number;
}) {
  const st = [...stations].map((s) => ({ ...s, px: at(s.m) })).sort((a, b) => a.px - b.px);
  if (st.length < 2) return null;
  const x0 = st[0].px, x1 = st[st.length - 1].px;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={REF.ink} strokeWidth={0.8} />
      <polygon points={arrow(x0, y, "l")} fill={REF.ink} />
      <polygon points={arrow(x1, y, "r")} fill={REF.ink} />
      {st.map((s, i) => (
        <line key={`t${i}`} x1={s.px} y1={y - 4} x2={s.px} y2={y + 4} stroke={REF.ink} strokeWidth={0.8} />
      ))}
      {st.slice(0, -1).map((s, i) => {
        const n = st[i + 1];
        if (n.px - s.px < skipBelowPx) return null;
        const mid = (s.px + n.px) / 2;
        const label = mmText(Math.abs(n.m - s.m));
        return (
          <g key={`d${i}`}>
            <rect x={mid - Math.max(11, label.length * 3.1)} y={y - 9} width={Math.max(22, label.length * 6.2)} height={10} fill={REF.paper} />
            <text x={mid} y={y - 1.5} fontSize={7.5} textAnchor="middle" fill={REF.ink}>{label}</text>
          </g>
        );
      })}
    </g>
  );
}

/** A vertical dimension chain in mm — the level / bay chain up the side of a view. */
export function DimChainMmV({
  stations, x, at, skipBelowPx = 13,
}: {
  stations: RefGridStation[];
  x: number;
  at: (m: number) => number;
  skipBelowPx?: number;
}) {
  const st = [...stations].map((s) => ({ ...s, px: at(s.m) })).sort((a, b) => a.px - b.px);
  if (st.length < 2) return null;
  const y0 = st[0].px, y1 = st[st.length - 1].px;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={REF.ink} strokeWidth={0.8} />
      <polygon points={arrow(x, y0, "u")} fill={REF.ink} />
      <polygon points={arrow(x, y1, "d")} fill={REF.ink} />
      {st.map((s, i) => (
        <line key={`t${i}`} x1={x - 4} y1={s.px} x2={x + 4} y2={s.px} stroke={REF.ink} strokeWidth={0.8} />
      ))}
      {st.slice(0, -1).map((s, i) => {
        const n = st[i + 1];
        if (n.px - s.px < skipBelowPx) return null;
        const mid = (s.px + n.px) / 2;
        const label = mmText(Math.abs(n.m - s.m));
        return (
          <g key={`d${i}`}>
            <rect x={x - 9} y={mid - Math.max(11, label.length * 3.1)} width={10} height={Math.max(22, label.length * 6.2)} fill={REF.paper} />
            <text x={x} y={mid} fontSize={7.5} textAnchor="middle" fill={REF.ink} transform={`rotate(-90 ${x} ${mid})`}>{label}</text>
          </g>
        );
      })}
    </g>
  );
}

/** A grid bubble: a ringed circle carrying the grid label, with its grid line. */
export function RefBubble({ cx, cy, label, r = 9.5 }: { cx: number; cy: number; label: string; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={REF.paper} stroke={REF.ink} strokeWidth={0.9} />
      <text x={cx} y={cy + 3} fontSize={8} textAnchor="middle" fill={REF.ink} fontWeight={700}>{label}</text>
    </g>
  );
}

/**
 * A leader-line callout — the "Roof Cladding (30 mm thick sandwich panel)" note the reference
 * elevations carry, pointing at the thing it names.
 */
/** Greedy word wrap — SVG text does not wrap, so a long spec would run off the sheet edge. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + 1 + w.length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function Callout({
  x, y, tx, ty, label, detail, anchor = "start", maxChars = 26,
}: {
  /** The point being named. */
  x: number; y: number;
  /** Where the text sits. */
  tx: number; ty: number;
  label: string;
  detail?: string;
  anchor?: "start" | "end" | "middle";
  /** Characters per line before the detail wraps. */
  maxChars?: number;
}) {
  const lines = detail ? wrap(`(${detail})`, maxChars) : [];
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={REF.thin} strokeWidth={0.7} />
      <circle cx={x} cy={y} r={1.6} fill={REF.thin} />
      <text x={tx} y={ty - 1} fontSize={7.5} textAnchor={anchor} fill={REF.ink} fontWeight={700}>{label}</text>
      {lines.map((l, i) => (
        <text key={i} x={tx} y={ty + 7.5 + i * 7.5} fontSize={6.5} textAnchor={anchor} fill={REF.note}>{l}</text>
      ))}
    </g>
  );
}

/** The view's own caption, underlined, exactly as the reference sheet titles each view. */
export function ViewTitle({ x, y, title, subtitle }: { x: number; y: number; title: string; subtitle?: string }) {
  const w = Math.max(90, title.length * 5.4);
  return (
    <g>
      <text x={x} y={y} fontSize={9.5} textAnchor="middle" fill={REF.ink} fontWeight={700}>{title}</text>
      <line x1={x - w / 2} y1={y + 2.5} x2={x + w / 2} y2={y + 2.5} stroke={REF.ink} strokeWidth={0.8} />
      {subtitle && <text x={x} y={y + 12} fontSize={7.5} textAnchor="middle" fill={REF.note}>{subtitle}</text>}
    </g>
  );
}
