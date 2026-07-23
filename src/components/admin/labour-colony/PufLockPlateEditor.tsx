"use client";

/**
 * PUF LOCK — INTERACTIVE PLATE-POSITION EDITOR.
 *
 * An SVG plate-placement editor drawn over the plinth-beam plan: the A–E / 1–3 column grid with
 * bubbles, the bay dimension chains, every plinth-beam run with its beam mark, and each locking plate
 * as a numbered, clickable, draggable symbol (P01 … Pnn).
 *
 * THIS FILE OWNS NO ENGINEERING. Every quantity, pocket width, weight and validation rule lives in
 * `@/features/labour-colony-studio/model/pufLock` and is read, never recomputed. What this file does
 * own is the SETTING-OUT INTERACTION: where a click lands, which beam centreline a dragged plate
 * snaps to, and the pixel placement of a dimension label. The plate list it hands back is written
 * straight into `PufLockConfig.positions` and re-resolved by the core.
 *
 * Three invariants the editor must never break:
 *   1. EVERY edit sets `layoutEdited: true` — the auto layout must not silently overwrite a hand
 *      placement on the next rebuild (see `resolvePlatePositions`).
 *   2. EVERY touched plate is marked `source: "manual"` so the schedules can report what was placed
 *      by hand.
 *   3. A plate's `id` is NEVER regenerated. Moving, mirroring or renumbering a plate keeps its id, so
 *      a manual position survives save / reload. Only a genuinely NEW plate mints an id.
 *
 * Positions are always edited on top of the RESOLVED list (`positions`), so the first edit
 * materialises the auto layout into stored positions instead of clearing it.
 *
 * Colours are literal hex — never Tailwind classes, CSS variables or oklch() — because this SVG is
 * captured for PNG / PDF export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy, FlipHorizontal2, FlipVertical2, MousePointerClick, Repeat, RotateCcw, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/admin/NumberInput";
import {
  autoPlatePositions,
  renumber,
  type PufLockConfig,
  type PufLockContext,
  type PufLockIssue,
  type PufLockPlatePosition,
} from "@/features/labour-colony-studio/model/pufLock";

/* ------------------------------------------------------------------ drawing colours ------------ */

const COL = {
  paper: "#ffffff",
  beam: "#0f172a",
  beamSoft: "#94a3b8",
  column: "#0f172a",
  bubble: "#334155",
  dim: "#334155",
  body: "#cbd5e1",
  plate: "#1d4ed8",
  plateFill: "#dbeafe",
  plateManual: "#7c3aed",
  plateSelected: "#b45309",
  plateSelectedFill: "#fef3c7",
  plateError: "#b91c1c",
  plateErrorFill: "#fee2e2",
  spacing: "#0f766e",
  joint: "#c2410c",
  muted: "#64748b",
} as const;

/* ------------------------------------------------------------------ local geometry ------------- */

/** One plinth-beam centreline a plate may sit on. Mirrors the beamId convention of the auto layout. */
interface EditorRun {
  id: string;
  axis: "x" | "y";
  /** Fixed ordinate of the run (y for an x-run, x for a y-run), metres. */
  at: number;
  from: number;
  to: number;
  stations: { at: number; ref: string }[];
}

const EPS = 1e-3;
const near = (a: number, b: number, eps = EPS): boolean => Math.abs(a - b) <= eps;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

function uniq(xs: number[], eps = EPS): number[] {
  const out: number[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    if (!out.length || Math.abs(out[out.length - 1] - x) > eps) out.push(x);
  }
  return out;
}

/** The core's own duplicate rule: two plates collide when they share a coordinate within 1 mm. */
const coordKey = (xM: number, yM: number): string => `${Math.round(xM * 1000)}:${Math.round(yM * 1000)}`;

/** Mint an id for a genuinely NEW plate. Existing plates keep the id they were created with. */
function newPlateId(runId: string, alongM: number, taken: Set<string>): string {
  const stem = `plm-${runId}-${Math.round(alongM * 1000)}`;
  if (!taken.has(stem)) return stem;
  for (let i = 0; i < 1000; i++) {
    const id = `${stem}-${Math.random().toString(36).slice(2, 7)}`;
    if (!taken.has(id)) return id;
  }
  return `${stem}-${Date.now().toString(36)}`;
}

/* ------------------------------------------------------------------ component ------------------ */

export interface PufLockPlateEditorProps {
  /** The stored-resolved config — what edits are written back on top of. */
  config: PufLockConfig;
  /** The RESOLVED plate list (`PufLockDerived.positions`) — authoritative, already renumbered. */
  positions: PufLockPlatePosition[];
  /** Live validation issues, so a bad plate can be drawn in red. */
  issues: PufLockIssue[];
  ctx: PufLockContext;
  onChange: (next: PufLockConfig) => void;
}

export function PufLockPlateEditor({ config, positions, issues, ctx, onChange }: PufLockPlateEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [repeatSpacingM, setRepeatSpacingM] = useState<number>(() => Math.max(0.3, config.spacingM));
  const [repeatCount, setRepeatCount] = useState<number>(3);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- grid + runs ---------------- */
  const xs = useMemo(() => uniq(ctx.grid.map((c) => c.xM)), [ctx.grid]);
  const ys = useMemo(() => uniq(ctx.grid.map((c) => c.yM)), [ctx.grid]);
  const gridReady = xs.length >= 2 && ys.length >= 2;

  /** The real grid reference at a (column, row) index — read from the supplied marks, never invented. */
  const refAt = useCallback(
    (ci: number, ri: number): string => {
      const mark = ctx.grid.find((c) => near(c.xM, xs[ci]) && near(c.yM, ys[ri]));
      if (mark?.grid) return mark.grid;
      const letter = ctx.grid.find((c) => near(c.xM, xs[ci]))?.grid?.split("-")[0] ?? "?";
      const number = ctx.grid.find((c) => near(c.yM, ys[ri]))?.grid?.split("-")[1] ?? String(ri + 1);
      return `${letter}-${number}`;
    },
    [ctx.grid, xs, ys],
  );

  /**
   * Every plinth-beam centreline of the grid — rows AND columns. The auto layout only populates the
   * four perimeter runs, but `validatePufLock` accepts a plate on ANY gridline, so the editor lets a
   * plate be placed on any of them and uses the identical `PB-row-<i>` / `PB-col-<i>` beam ids.
   */
  const runs = useMemo<EditorRun[]>(() => {
    if (!gridReady) return [];
    const out: EditorRun[] = [];
    ys.forEach((y, ri) => {
      out.push({
        id: `PB-row-${ri}`,
        axis: "x",
        at: y,
        from: xs[0],
        to: xs[xs.length - 1],
        stations: xs.map((x, ci) => ({ at: x, ref: refAt(ci, ri) })),
      });
    });
    xs.forEach((x, ci) => {
      out.push({
        id: `PB-col-${ci}`,
        axis: "y",
        at: x,
        from: ys[0],
        to: ys[ys.length - 1],
        stations: ys.map((y, ri) => ({ at: y, ref: refAt(ci, ri) })),
      });
    });
    return out;
  }, [gridReady, xs, ys, refAt]);

  /** Nearest gridline station along a run + the signed offset from it (mm) — the setting-out figure. */
  const stationOf = useCallback((run: EditorRun, along: number): { ref: string; offsetMm: number } => {
    let best = run.stations[0];
    for (const s of run.stations) {
      if (!best || Math.abs(s.at - along) < Math.abs(best.at - along)) best = s;
    }
    return { ref: best?.ref ?? "?", offsetMm: Math.round((along - (best?.at ?? 0)) * 1000) };
  }, []);

  /** Snap a free plan point onto the nearest beam centreline. A plate can never leave a beam. */
  const snap = useCallback(
    (xM: number, yM: number): { run: EditorRun; along: number; distM: number } | null => {
      if (!runs.length) return null;
      let best: { run: EditorRun; along: number; distM: number } | null = null;
      for (const run of runs) {
        const dist = run.axis === "x" ? Math.abs(yM - run.at) : Math.abs(xM - run.at);
        const raw = run.axis === "x" ? xM : yM;
        const along = clamp(raw, run.from, run.to);
        if (!best || dist < best.distM) best = { run, along, distM: dist };
      }
      return best;
    },
    [runs],
  );

  /** Materialise a plate on a run. `id` is always supplied — the editor never regenerates one. */
  const placeOn = useCallback(
    (run: EditorRun, along: number, id: string): PufLockPlatePosition => {
      const a = clamp(along, run.from, run.to);
      const st = stationOf(run, a);
      return {
        id,
        mark: "P00", // reissued by renumber() on commit
        xM: run.axis === "x" ? a : run.at,
        yM: run.axis === "x" ? run.at : a,
        axis: run.axis,
        beamId: run.id,
        gridRef: st.ref,
        offsetMm: st.offsetMm,
        source: "manual",
      };
    },
    [stationOf],
  );

  /** Distance of a plate along its own run — the coordinate the offset / copy / repeat tools work in. */
  const alongOf = (p: PufLockPlatePosition): number => (p.axis === "x" ? p.xM : p.yM);
  const runOf = useCallback(
    (p: PufLockPlatePosition): EditorRun | null =>
      runs.find((r) => r.id === p.beamId) ??
      runs.find((r) => r.axis === p.axis && near(r.at, p.axis === "x" ? p.yM : p.xM, 0.15)) ??
      null,
    [runs],
  );

  /* ---------------- commit ---------------- */

  /**
   * Write a new plate list back. Always flags `layoutEdited` so the auto layout can never overwrite
   * the user's setting-out, and renumbers through the core so marks stay in plan order.
   */
  const commit = useCallback(
    (next: PufLockPlatePosition[], message?: string) => {
      onChange({ ...config, layoutEdited: true, positions: renumber(next) });
      setNotice(message ?? null);
    },
    [config, onChange],
  );

  const selected = useMemo(
    () => positions.find((p) => p.id === selectedId) ?? null,
    [positions, selectedId],
  );

  /* ---------------- edit actions ---------------- */

  const addAt = useCallback(
    (xM: number, yM: number) => {
      const hit = snap(xM, yM);
      if (!hit) return;
      const tolM = Math.max(ctx.plinthBeamWidthM, 0.45);
      if (hit.distM > tolM) {
        setNotice("Click on a plinth-beam centreline — a locking plate can only sit on a beam.");
        return;
      }
      const taken = new Set(positions.map((p) => p.id));
      const draft = placeOn(hit.run, hit.along, newPlateId(hit.run.id, hit.along, taken));
      const clash = positions.some((p) => coordKey(p.xM, p.yM) === coordKey(draft.xM, draft.yM));
      if (clash) {
        setNotice("A plate already exists at that coordinate (within 1 mm). Drag the existing plate instead.");
        return;
      }
      setSelectedId(draft.id);
      commit([...positions, draft], `Plate added on ${draft.beamId} at ${draft.gridRef} ${draft.offsetMm >= 0 ? "+" : ""}${draft.offsetMm} mm.`);
    },
    [snap, ctx.plinthBeamWidthM, positions, placeOn, commit],
  );

  const moveTo = useCallback(
    (id: string, xM: number, yM: number) => {
      const current = positions.find((p) => p.id === id);
      if (!current) return;
      const hit = snap(xM, yM);
      if (!hit) return;
      // id is deliberately reused — a moved plate is the SAME plate and must survive save / reload
      const moved = placeOn(hit.run, hit.along, current.id);
      if (near(moved.xM, current.xM, 1e-6) && near(moved.yM, current.yM, 1e-6)) return;
      const clash = positions.some(
        (p) => p.id !== id && coordKey(p.xM, p.yM) === coordKey(moved.xM, moved.yM),
      );
      if (clash) {
        setNotice("Another plate already occupies that coordinate (within 1 mm) — move cancelled.");
        return;
      }
      commit(positions.map((p) => (p.id === id ? moved : p)));
    },
    [positions, snap, placeOn, commit],
  );

  const removeSelected = useCallback(() => {
    if (!selected) return;
    const mark = selected.mark;
    commit(positions.filter((p) => p.id !== selected.id), `Plate ${mark} deleted.`);
    setSelectedId(null);
  }, [selected, positions, commit]);

  /** Find the first free slot walking along a run from `startAlong` in `dir` steps of `step`. */
  const freeSlotOn = useCallback(
    (run: EditorRun, startAlong: number, step: number, dir: 1 | -1, list: PufLockPlatePosition[]): number | null => {
      const used = new Set(list.map((p) => coordKey(p.xM, p.yM)));
      for (let i = 1; i <= 40; i++) {
        const a = startAlong + dir * step * i;
        if (a < run.from - EPS || a > run.to + EPS) return null;
        const probe = placeOn(run, a, "probe");
        if (!used.has(coordKey(probe.xM, probe.yM))) return a;
      }
      return null;
    },
    [placeOn],
  );

  const copySelected = useCallback(() => {
    if (!selected) return;
    const run = runOf(selected);
    if (!run) {
      setNotice("The selected plate is not on a recognised beam run — drag it onto a beam first.");
      return;
    }
    const step = Math.max(0.3, repeatSpacingM);
    const a0 = alongOf(selected);
    const slot = freeSlotOn(run, a0, step, 1, positions) ?? freeSlotOn(run, a0, step, -1, positions);
    if (slot == null) {
      setNotice(`No free position ${step.toFixed(2)} m from ${selected.mark} on ${run.id}.`);
      return;
    }
    const taken = new Set(positions.map((p) => p.id));
    const copy = placeOn(run, slot, newPlateId(run.id, slot, taken));
    setSelectedId(copy.id);
    commit([...positions, copy], `Copied ${selected.mark} to ${copy.gridRef} ${copy.offsetMm >= 0 ? "+" : ""}${copy.offsetMm} mm on ${run.id}.`);
  }, [selected, runOf, repeatSpacingM, positions, freeSlotOn, placeOn, commit]);

  /** Mirror the selected plate about the building centreline of the grid, then re-snap to a beam. */
  const mirrorSelected = useCallback(
    (about: "x" | "y") => {
      if (!selected) return;
      const cx = (xs[0] + xs[xs.length - 1]) / 2;
      const cy = (ys[0] + ys[ys.length - 1]) / 2;
      const mx = about === "x" ? 2 * cx - selected.xM : selected.xM;
      const my = about === "y" ? 2 * cy - selected.yM : selected.yM;
      const hit = snap(mx, my);
      if (!hit) return;
      const taken = new Set(positions.map((p) => p.id));
      const draft = placeOn(hit.run, hit.along, newPlateId(hit.run.id, hit.along, taken));
      if (positions.some((p) => coordKey(p.xM, p.yM) === coordKey(draft.xM, draft.yM))) {
        setNotice(`The mirror image of ${selected.mark} is already occupied by a plate.`);
        return;
      }
      setSelectedId(draft.id);
      commit(
        [...positions, draft],
        `Mirrored ${selected.mark} about the ${about === "x" ? "vertical" : "horizontal"} building centreline.`,
      );
    },
    [selected, xs, ys, snap, positions, placeOn, commit],
  );

  const repeatSelected = useCallback(() => {
    if (!selected) return;
    const run = runOf(selected);
    if (!run) {
      setNotice("The selected plate is not on a recognised beam run — drag it onto a beam first.");
      return;
    }
    const step = Math.max(0.3, repeatSpacingM);
    const want = Math.max(1, Math.round(repeatCount));
    const list = [...positions];
    const taken = new Set(list.map((p) => p.id));
    let made = 0;
    let a = alongOf(selected);
    for (let i = 0; i < want; i++) {
      a += step;
      if (a > run.to + EPS) break;
      const probe = placeOn(run, a, "probe");
      if (list.some((p) => coordKey(p.xM, p.yM) === coordKey(probe.xM, probe.yM))) continue;
      const id = newPlateId(run.id, a, taken);
      taken.add(id);
      list.push(placeOn(run, a, id));
      made++;
    }
    if (!made) {
      setNotice(`No room to repeat ${selected.mark} at ${step.toFixed(2)} m along ${run.id}.`);
      return;
    }
    commit(list, `Repeated ${selected.mark}: ${made} plate${made === 1 ? "" : "s"} added at ${step.toFixed(2)} m centres on ${run.id}.`);
  }, [selected, runOf, repeatSpacingM, repeatCount, positions, placeOn, commit]);

  /** Re-place the selected plate at an exact offset from its nearest gridline. */
  const setOffsetMm = useCallback(
    (mm: number) => {
      if (!selected) return;
      const run = runOf(selected);
      if (!run) return;
      const station = run.stations.find((s) => s.ref === selected.gridRef);
      const base = station ? station.at : alongOf(selected) - selected.offsetMm / 1000;
      const target = base + mm / 1000;
      const moved = placeOn(run, target, selected.id);
      if (positions.some((p) => p.id !== selected.id && coordKey(p.xM, p.yM) === coordKey(moved.xM, moved.yM))) {
        setNotice("Another plate already occupies that offset (within 1 mm).");
        return;
      }
      commit(positions.map((p) => (p.id === selected.id ? moved : p)));
    },
    [selected, runOf, placeOn, positions, commit],
  );

  /**
   * Drop `layoutEdited` so the core regenerates the layout.
   *
   * In "manual" mode nothing is derived at all (`resolvePlatePositions` returns the stored list
   * verbatim), so clearing the list there would simply delete every plate. Manual mode is therefore
   * re-seeded from the core's OWN automatic setting-out rather than emptied.
   */
  const resetAuto = useCallback(() => {
    setSelectedId(null);
    onChange(
      config.mode === "manual"
        ? { ...config, layoutEdited: false, positions: renumber(autoPlatePositions(config, ctx)) }
        : { ...config, layoutEdited: false, positions: [] },
    );
    setNotice("Layout reset — plates regenerated from the automatic setting-out.");
  }, [config, ctx, onChange]);

  /* ---------------- pointer plumbing ---------------- */

  /** px per metre. Kept in a range that leaves a 300 mm plate visible without a huge sheet. */
  const spanX = Math.max(0.5, xs.length >= 2 ? xs[xs.length - 1] - xs[0] : 1);
  const spanY = Math.max(0.5, ys.length >= 2 ? ys[ys.length - 1] - ys[0] : 1);
  const S = clamp(760 / spanX, 14, 90);
  const PAD = 84;
  const X = (m: number) => (m - (xs[0] ?? 0)) * S;
  const Y = (m: number) => (m - (ys[0] ?? 0)) * S;
  const svgW = spanX * S + PAD * 2;
  const svgH = spanY * S + PAD * 2;

  /** Client coordinates → plan metres, through the viewBox scale and the drawing translate. */
  const toModel = useCallback(
    (clientX: number, clientY: number): { xM: number; yM: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const ux = (clientX - rect.left) * (svgW / rect.width);
      const uy = (clientY - rect.top) * (svgH / rect.height);
      return { xM: (ux - PAD) / S + (xs[0] ?? 0), yM: (uy - PAD) / S + (ys[0] ?? 0) };
    },
    [svgW, svgH, S, xs, ys],
  );

  const onSurfacePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    const pt = toModel(e.clientX, e.clientY);
    if (!pt) return;
    setSelectedId(null);
    addAt(pt.xM, pt.yM);
    wrapRef.current?.focus();
  };

  const onPlatePointerDown = (e: React.PointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setDragId(id);
    setNotice(null);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    wrapRef.current?.focus();
  };

  const onPlatePointerMove = (e: React.PointerEvent<SVGGElement>, id: string) => {
    if (dragId !== id) return;
    const pt = toModel(e.clientX, e.clientY);
    if (!pt) return;
    moveTo(id, pt.xM, pt.yM);
  };

  const onPlatePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (dragId) setDragId(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
    if (!selected) return;
    e.preventDefault();
    removeSelected();
  };

  // a plate that no longer exists (deleted, or the layout was reset) must not stay selected
  useEffect(() => {
    if (selectedId && !positions.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [positions, selectedId]);

  /* ---------------- derived read-outs ---------------- */

  /** Issues keyed by plate, so a plate with an error can be drawn red and listed on selection. */
  const issuesByPlate = useMemo(() => {
    const map = new Map<string, PufLockIssue[]>();
    for (const i of issues) {
      if (!i.plateId) continue;
      const list = map.get(i.plateId) ?? [];
      list.push(i);
      map.set(i.plateId, list);
    }
    return map;
  }, [issues]);

  /**
   * Consecutive plates on each run, for the spacing dimensions drawn between them. The GROUPING here
   * matches `consecutiveSpacings` in the core (group by beamId, sort along the axis) — this variant
   * exists only because the drawing also needs the two endpoints to place the label, which the core's
   * flat number[] cannot provide. The distance is the same straight-line centre-to-centre figure.
   */
  const spacingPairs = useMemo(() => {
    const byRun = new Map<string, PufLockPlatePosition[]>();
    for (const p of positions) {
      const list = byRun.get(p.beamId) ?? [];
      list.push(p);
      byRun.set(p.beamId, list);
    }
    const out: { a: PufLockPlatePosition; b: PufLockPlatePosition; m: number }[] = [];
    for (const list of byRun.values()) {
      const sorted = [...list].sort((p, q) => (p.axis === "x" ? p.xM - q.xM : p.yM - q.yM));
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1];
        const b = sorted[i];
        out.push({ a, b, m: Math.hypot(b.xM - a.xM, b.yM - a.yM) });
      }
    }
    return out;
  }, [positions]);

  /**
   * The wall-panel joint each plate supports, WHERE THAT INFORMATION EXISTS. `ctx.panelJoints` is
   * optional; when the project carries no panel-joint schedule this map is simply empty and nothing
   * about joints is shown. Tolerances match the core's own unsupported-joint check.
   */
  const jointByPlate = useMemo(() => {
    const map = new Map<string, string>();
    const joints = ctx.panelJoints;
    if (!joints?.length) return map;
    for (const p of positions) {
      for (const j of joints) {
        if (j.axis !== p.axis) continue;
        const at = p.axis === "x" ? p.yM : p.xM;
        if (!near(at, j.at, 0.15)) continue;
        const pos = p.axis === "x" ? p.xM : p.yM;
        const hit = j.along.find((a) => Math.abs(a - pos) <= 0.3);
        if (hit != null) {
          map.set(p.id, `Panel joint at ${hit.toFixed(3)} m on the ${j.axis === "x" ? "x" : "y"} run`);
          break;
        }
      }
    }
    return map;
  }, [ctx.panelJoints, positions]);

  const manualCount = positions.filter((p) => p.source === "manual").length;

  /* ---------------- empty / error states ---------------- */

  if (!gridReady) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        The column grid needs at least two gridlines in each direction before plates can be set out.
        Complete the Structure and Civil Work tabs first.
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        The PUF panel bottom locking system is switched off — there is no plate layout to edit.
      </div>
    );
  }

  const plateHalfAlong = Math.max(5, (config.plate.lengthMm / 2000) * S);
  const plateHalfAcross = Math.max(4, (config.plate.widthMm / 2000) * S);

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="space-y-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/50"
    >
      {/* ---------- toolbar ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-sm font-bold">Plate-position editor</h4>
          <p className="text-xs text-muted-foreground">
            Click a plinth beam to add a plate · click a plate to select · drag to reposition (snaps to
            the beam centreline) · Delete removes the selected plate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {positions.length} plate{positions.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {manualCount} manual
          </Badge>
          {config.layoutEdited && (
            <Badge variant="outline" className="border-violet-400 font-mono text-[10px] text-violet-600">
              layout edited
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-2.5">
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected} onClick={copySelected}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected} onClick={() => mirrorSelected("x")}>
          <FlipHorizontal2 className="h-3.5 w-3.5" /> Mirror ↔
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected} onClick={() => mirrorSelected("y")}>
          <FlipVertical2 className="h-3.5 w-3.5" /> Mirror ↕
        </Button>
        <div className="flex items-end gap-1.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Spacing (m)</Label>
            <NumberInput
              className="h-8 w-20"
              step={0.05}
              value={repeatSpacingM}
              onChange={(e) => setRepeatSpacingM(Math.max(0.3, Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Count</Label>
            <NumberInput
              className="h-8 w-16"
              value={repeatCount}
              onChange={(e) => setRepeatCount(Math.max(1, Math.round(Number(e.target.value) || 0)))}
            />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected} onClick={repeatSelected}>
            <Repeat className="h-3.5 w-3.5" /> Repeat
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive"
          disabled={!selected}
          onClick={removeSelected}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={resetAuto}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to auto layout
        </Button>
      </div>

      {notice && (
        <p className="flex items-start gap-1.5 rounded-lg border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber-700">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {notice}
        </p>
      )}

      {/* ---------- drawing ---------- */}
      <div className="overflow-x-auto rounded-xl border" style={{ background: COL.paper }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="h-auto w-full select-none"
          style={{ minWidth: Math.max(620, Math.round(svgW)), touchAction: "none" }}
        >
          <text x={svgW / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill={COL.beam} letterSpacing={1}>
            PUF LOCK — BASE-PLATE SETTING-OUT PLAN
          </text>

          {/* click surface: adds a plate wherever a beam is close enough */}
          <rect x={0} y={0} width={svgW} height={svgH} fill={COL.paper} onPointerDown={onSurfacePointerDown} />

          <g transform={`translate(${PAD},${PAD})`}>
            {/* walled body the external PUF panels stand on — dashed reference only */}
            <rect
              x={X(ctx.body.x0)}
              y={Y(ctx.body.y0)}
              width={Math.max(0, (ctx.body.x1 - ctx.body.x0) * S)}
              height={Math.max(0, (ctx.body.y1 - ctx.body.y0) * S)}
              fill="none"
              stroke={COL.body}
              strokeWidth={1.2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />

            {/* plinth-beam runs */}
            {runs.map((r) => {
              const perimeter =
                r.axis === "x"
                  ? near(r.at, ys[0]) || near(r.at, ys[ys.length - 1])
                  : near(r.at, xs[0]) || near(r.at, xs[xs.length - 1]);
              return (
                <line
                  key={r.id}
                  x1={r.axis === "x" ? X(r.from) : X(r.at)}
                  y1={r.axis === "x" ? Y(r.at) : Y(r.from)}
                  x2={r.axis === "x" ? X(r.to) : X(r.at)}
                  y2={r.axis === "x" ? Y(r.at) : Y(r.to)}
                  stroke={perimeter ? COL.beam : COL.beamSoft}
                  strokeWidth={perimeter ? 4 : 2}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              );
            })}

            {/* beam marks — the SAME beamId the plate schedule prints in its host-beam column */}
            {runs.map((r) =>
              r.axis === "x" ? (
                <text
                  key={`m-${r.id}`}
                  x={X(r.from) + 6}
                  y={Y(r.at) - 5}
                  fontSize={7.5}
                  fontWeight={600}
                  fill={COL.muted}
                  pointerEvents="none"
                >
                  {r.id}
                </text>
              ) : (
                <text
                  key={`m-${r.id}`}
                  x={X(r.at) + 5}
                  y={Y(r.from) + 6}
                  fontSize={7.5}
                  fontWeight={600}
                  fill={COL.muted}
                  transform={`rotate(90 ${X(r.at) + 5} ${Y(r.from) + 6})`}
                  pointerEvents="none"
                >
                  {r.id}
                </text>
              ),
            )}

            {/* column marker at every grid intersection */}
            {ys.map((cy, ri) =>
              xs.map((cx, ci) => (
                <rect
                  key={`c-${ci}-${ri}`}
                  x={X(cx) - 3.5}
                  y={Y(cy) - 3.5}
                  width={7}
                  height={7}
                  fill={COL.column}
                  pointerEvents="none"
                />
              )),
            )}

            {/* grid bubbles: letters across the top, numbers down the left */}
            {xs.map((cx, ci) => {
              const label = refAt(ci, 0).split("-")[0];
              return (
                <g key={`bx-${ci}`} pointerEvents="none">
                  <line x1={X(cx)} y1={Y(ys[0]) - 12} x2={X(cx)} y2={Y(ys[0])} stroke={COL.bubble} strokeWidth={0.7} strokeDasharray="3 3" />
                  <circle cx={X(cx)} cy={Y(ys[0]) - 22} r={10} fill={COL.paper} stroke={COL.bubble} strokeWidth={1} />
                  <text x={X(cx)} y={Y(ys[0]) - 18.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={COL.bubble}>
                    {label}
                  </text>
                </g>
              );
            })}
            {ys.map((cy, ri) => {
              const label = refAt(0, ri).split("-")[1] ?? String(ri + 1);
              return (
                <g key={`by-${ri}`} pointerEvents="none">
                  <line x1={X(xs[0]) - 12} y1={Y(cy)} x2={X(xs[0])} y2={Y(cy)} stroke={COL.bubble} strokeWidth={0.7} strokeDasharray="3 3" />
                  <circle cx={X(xs[0]) - 22} cy={Y(cy)} r={10} fill={COL.paper} stroke={COL.bubble} strokeWidth={1} />
                  <text x={X(xs[0]) - 22} y={Y(cy) + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={COL.bubble}>
                    {label}
                  </text>
                </g>
              );
            })}

            {/* bay dimension chains (mm) */}
            <DimChainH
              xsPx={xs.map(X)}
              y={-46}
              labels={xs.slice(0, -1).map((x, i) => String(Math.round((xs[i + 1] - x) * 1000)))}
            />
            <DimChainV
              ysPx={ys.map(Y)}
              x={X(xs[0]) - 50}
              labels={ys.slice(0, -1).map((y, i) => String(Math.round((ys[i + 1] - y) * 1000)))}
            />

            {/* spacing between consecutive plates on each run */}
            {spacingPairs.map(({ a, b, m }) => (
              <g key={`sp-${a.id}-${b.id}`} pointerEvents="none">
                <line
                  x1={X(a.xM)}
                  y1={Y(a.yM)}
                  x2={X(b.xM)}
                  y2={Y(b.yM)}
                  stroke={COL.spacing}
                  strokeWidth={0.9}
                  strokeDasharray="4 3"
                />
                <text
                  x={(X(a.xM) + X(b.xM)) / 2}
                  y={(Y(a.yM) + Y(b.yM)) / 2 - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill={COL.spacing}
                  transform={
                    a.axis === "y"
                      ? `rotate(-90 ${(X(a.xM) + X(b.xM)) / 2} ${(Y(a.yM) + Y(b.yM)) / 2 - 4})`
                      : undefined
                  }
                >
                  {Math.round(m * 1000)}
                </text>
              </g>
            ))}

            {/* the plates */}
            {positions.map((p) => {
              const isSel = p.id === selectedId;
              const bad = (issuesByPlate.get(p.id) ?? []).some((i) => i.level === "error");
              const stroke = bad ? COL.plateError : isSel ? COL.plateSelected : p.source === "manual" ? COL.plateManual : COL.plate;
              const fill = bad ? COL.plateErrorFill : isSel ? COL.plateSelectedFill : COL.plateFill;
              const halfW = p.axis === "x" ? plateHalfAlong : plateHalfAcross;
              const halfH = p.axis === "x" ? plateHalfAcross : plateHalfAlong;
              return (
                <g
                  key={p.id}
                  style={{ cursor: dragId === p.id ? "grabbing" : "grab" }}
                  onPointerDown={(e) => onPlatePointerDown(e, p.id)}
                  onPointerMove={(e) => onPlatePointerMove(e, p.id)}
                  onPointerUp={onPlatePointerUp}
                  onPointerCancel={onPlatePointerUp}
                >
                  {isSel && (
                    <circle cx={X(p.xM)} cy={Y(p.yM)} r={Math.max(halfW, halfH) + 7} fill="none" stroke={COL.plateSelected} strokeWidth={1.2} strokeDasharray="3 3" />
                  )}
                  <rect
                    x={X(p.xM) - halfW}
                    y={Y(p.yM) - halfH}
                    width={halfW * 2}
                    height={halfH * 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSel ? 2 : 1.3}
                  />
                  {/* generous invisible hit target so a small plate stays easy to grab */}
                  <circle cx={X(p.xM)} cy={Y(p.yM)} r={Math.max(13, halfW, halfH)} fill="transparent" />
                  <text
                    x={X(p.xM)}
                    y={Y(p.yM) - Math.max(halfH, 8) - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill={stroke}
                    pointerEvents="none"
                  >
                    {p.mark}
                  </text>
                  {jointByPlate.has(p.id) && (
                    <circle cx={X(p.xM) + halfW + 5} cy={Y(p.yM) - halfH - 2} r={3} fill={COL.joint} pointerEvents="none" />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ---------- selected-plate inspector ---------- */}
      {selected ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Selected plate</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-semibold">
              {selected.mark}
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">{selected.source}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Beam run · nearest gridline</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm">
              {selected.beamId} · {selected.gridRef}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Offset from gridline (mm)</Label>
            <NumberInput
              value={selected.offsetMm}
              onChange={(e) => setOffsetMm(Math.round(Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Plan position (m)</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-card px-3 font-mono text-xs">
              x {selected.xM.toFixed(3)} · y {selected.yM.toFixed(3)}
            </div>
          </div>
          {jointByPlate.has(selected.id) && (
            <p className="text-xs text-orange-700 sm:col-span-2 lg:col-span-4">
              Supports: {jointByPlate.get(selected.id)}
            </p>
          )}
          {(issuesByPlate.get(selected.id) ?? []).map((i) => (
            <p
              key={i.code}
              className={
                i.level === "error"
                  ? "text-xs font-medium text-destructive sm:col-span-2 lg:col-span-4"
                  : "text-xs text-amber-700 sm:col-span-2 lg:col-span-4"
              }
            >
              {i.message}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          No plate selected. Click a plate to edit its exact offset, copy it, mirror it or repeat it at
          a spacing — or click anywhere on a plinth beam to add a new one.
        </p>
      )}

      {/* ---------- setting-out table ---------- */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1.5 pr-3 font-semibold">Plate</th>
              <th className="py-1.5 pr-3 font-semibold">Beam run</th>
              <th className="py-1.5 pr-3 font-semibold">Gridline</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Offset (mm)</th>
              <th className="py-1.5 pr-3 text-right font-semibold">x (m)</th>
              <th className="py-1.5 pr-3 text-right font-semibold">y (m)</th>
              <th className="py-1.5 pr-3 font-semibold">Source</th>
              {ctx.panelJoints?.length ? <th className="py-1.5 pr-3 font-semibold">Panel joint</th> : null}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={ctx.panelJoints?.length ? 8 : 7} className="py-4 text-center text-muted-foreground">
                  No plates placed. Click a plinth beam above to add one, or press “Reset to auto layout”.
                </td>
              </tr>
            ) : (
              positions.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={
                    p.id === selectedId
                      ? "cursor-pointer border-b bg-amber/10 last:border-0"
                      : "cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  }
                >
                  <td className="py-1.5 pr-3 font-semibold">{p.mark}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{p.beamId}</td>
                  <td className="py-1.5 pr-3">{p.gridRef}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p.offsetMm}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p.xM.toFixed(3)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p.yM.toFixed(3)}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{p.source}</td>
                  {ctx.panelJoints?.length ? (
                    <td className="py-1.5 pr-3 text-muted-foreground">{jointByPlate.get(p.id) ?? "—"}</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dimension chains ----------- */

function DimChainH({ xsPx, y, labels }: { xsPx: number[]; y: number; labels: string[] }) {
  if (xsPx.length < 2) return null;
  return (
    <g pointerEvents="none">
      <line x1={xsPx[0]} y1={y} x2={xsPx[xsPx.length - 1]} y2={y} stroke={COL.dim} strokeWidth={1} />
      {xsPx.map((x, i) => (
        <line key={i} x1={x - 3} y1={y + 3} x2={x + 3} y2={y - 3} stroke={COL.dim} strokeWidth={1.2} />
      ))}
      {labels.map((lb, i) => (
        <text key={i} x={(xsPx[i] + xsPx[i + 1]) / 2} y={y - 4} textAnchor="middle" fontSize={8.5} fill={COL.dim}>
          {lb}
        </text>
      ))}
    </g>
  );
}

function DimChainV({ ysPx, x, labels }: { ysPx: number[]; x: number; labels: string[] }) {
  if (ysPx.length < 2) return null;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={ysPx[0]} x2={x} y2={ysPx[ysPx.length - 1]} stroke={COL.dim} strokeWidth={1} />
      {ysPx.map((yy, i) => (
        <line key={i} x1={x - 3} y1={yy + 3} x2={x + 3} y2={yy - 3} stroke={COL.dim} strokeWidth={1.2} />
      ))}
      {labels.map((lb, i) => {
        const cy = (ysPx[i] + ysPx[i + 1]) / 2;
        return (
          <text
            key={i}
            x={x - 5}
            y={cy}
            textAnchor="middle"
            fontSize={8.5}
            fill={COL.dim}
            transform={`rotate(-90 ${x - 5} ${cy})`}
          >
            {lb}
          </text>
        );
      })}
    </g>
  );
}
