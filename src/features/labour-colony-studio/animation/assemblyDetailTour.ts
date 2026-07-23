/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the per-assembly ZOOMED DETAIL TOUR (rafter support system).
 *
 * The requirement this file exists for, verbatim: "every rafter need to show these each rafter
 * assembly zooming in video completely need to show … if it take 5min or 7minutes also find. but
 * complete detail required in assembly video."
 *
 * So the video must fly to EVERY cleat / C-purlin / MS-tube connection in turn, hold on it in
 * close-up, and build it up part by part — cleat plate → bolt → washer → nut → C-purlin → MS tube
 * bolted through the web → the covering it carries.
 *
 * WHY THIS IS A SEPARATE MODULE. The timeline builder groups parts by their canonical
 * `assemblyStep`, and the rafter-support steel is ALL step 18 (its covering is ALL step 19) — that
 * mapping is fixed in model/assembly.ts and must not be renumbered, because the 2D sheets, the
 * schedules and the reports key off it. A tour is therefore N shots INSIDE one construction step, and
 * the grouping / ordering / timing arithmetic that makes those N shots deterministic is a pure,
 * testable concern of its own. Nothing here recomputes a geometry, a spacing, a count or a weight:
 * it only PARTITIONS parts the model already emitted and divides a runtime budget.
 *
 * THE PARTITION INVARIANT. `validateAssemblyTimeline` proves every model part is scheduled exactly
 * once. The tour must therefore be a partition of its step's part group — never a duplicate (the part
 * would install twice) and never a subset (the part would never install at all). Every function here
 * is written to that rule: `groupDetailAssemblies` returns disjoint groups plus the leftover
 * `rest`, and their union is the input list.
 *
 * Pure: no React / three / DOM.
 */

import type { ColonyModel, ColonyPart, ColonyPartKind } from "@/features/labour-colony-studio/model/types";
import { isRafterSupportKind } from "@/features/labour-colony-studio/model/assembly";
import type { RafterSupportDerived } from "@/features/labour-colony-studio/model/rafterSupport";
import type { AssemblyOptions } from "./assemblyTypes";

/* ----------------------------------------------------------------- model access ---------------- */

/**
 * The rafter-support bundle carried on the model, read STRUCTURALLY.
 *
 * The model emitter that populates `ColonyModel.rafterSupport` ships alongside this file, so this
 * module reads the field through an intersection rather than assuming the property is already
 * declared on `ColonyModel`. The moment the field is declared the intersection is a no-op, and until
 * then every consumer here degrades to "no rafter support ⇒ no tour" instead of failing to compile.
 * This is a typed structural view, NOT an `any` escape hatch.
 */
type ModelWithRafterSupport = { rafterSupport?: RafterSupportDerived };

/**
 * The resolved rafter-support system, or null when this colony does not build one. Gated on BOTH the
 * config being enabled and at least one cleat being placed — a system with no cleats has no
 * assemblies to tour and no method statement worth showing.
 */
export function rafterSupportOf(model: ColonyModel): RafterSupportDerived | null {
  const d = (model as ColonyModel & ModelWithRafterSupport).rafterSupport;
  if (!d || !d.config?.enabled) return null;
  return Array.isArray(d.positions) && d.positions.length > 0 ? d : null;
}

/** True when the model actually carries rafter-support PARTS — what the animation can narrate. */
export function hasRafterSupportParts(model: ColonyModel): boolean {
  return model.parts.some((p) => isRafterSupportKind(p.kind));
}

/* ----------------------------------------------------------------- id convention --------------- */

/**
 * The join key convention, shared with the model emitter and never re-derived:
 *   part id      `rsup:<levelId>:<cleatMark>:<partRole>`
 *   connectionId `rsup:<levelId>:<cleatMark>`
 *   assemblyId   `rsup-asm:<levelId>:<cleatMark>`
 */
export const RSUP_CONNECTION_PREFIX = "rsup:";

/** The connection key of a rafter-support part, or null when it is not a per-connection part. */
export function rafterConnectionIdOf(part: ColonyPart): string | null {
  if (!isRafterSupportKind(part.kind)) return null;
  const id = part.connectionId;
  if (typeof id !== "string" || !id.startsWith(RSUP_CONNECTION_PREFIX)) return null;
  return id;
}

/** The cleat mark inside a connection id (`rsup:roof:C07` → `C07`), or the whole id if it has none. */
export function cleatMarkOfConnectionId(connectionId: string): string {
  const bits = connectionId.split(":");
  const last = bits[bits.length - 1];
  return last && last.length ? last : connectionId;
}

/** The level segment inside a connection id (`rsup:roof:C07` → `roof`), or "" when absent. */
export function levelIdOfConnectionId(connectionId: string): string {
  const bits = connectionId.split(":");
  return bits.length >= 3 ? bits.slice(1, bits.length - 1).join(":") : "";
}

/**
 * Natural (human) comparison, so "RS-2" sorts before "RS-10" and the tour order matches the cleat
 * schedule rather than ASCII. A plain `localeCompare` would put `RS-100` before `RS-11`, which would
 * make the tour order differ from the printed schedule for any colony with 100+ connections.
 * Deterministic and total: equal chunks fall through to a final string comparison.
 */
export function compareNatural(a: string, b: string): number {
  const ax = a.match(/\d+|\D+/g) ?? [a];
  const bx = b.match(/\d+|\D+/g) ?? [b];
  const n = Math.min(ax.length, bx.length);
  for (let i = 0; i < n; i++) {
    const x = ax[i];
    const y = bx[i];
    const xn = /^\d/.test(x);
    const yn = /^\d/.test(y);
    if (xn && yn) {
      const d = parseInt(x, 10) - parseInt(y, 10);
      if (d !== 0) return d;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return ax.length - bx.length || (a < b ? -1 : a > b ? 1 : 0);
}

/* ----------------------------------------------------------------- grouping -------------------- */

/** Which half of the system a detail shot covers — the steel joint, or the covering it carries. */
export type DetailAssemblyPhase = "steel" | "covering";

/** One rafter-support assembly: everything sharing one `connectionId` inside one construction step. */
export interface DetailAssemblyGroup {
  /** `rsup:<levelId>:<cleatMark>` — the join key with the model and the drawings. */
  connectionId: string;
  /** The cleat mark, e.g. "RS-07". */
  mark: string;
  /** The level segment of the connection id, e.g. "lvl-roof". */
  levelId: string;
  phase: DetailAssemblyPhase;
  /** Every part of the assembly, in erection order (cleat → bolt → washer → nut → purlin → tube → covering). */
  parts: ColonyPart[];
  /** The subset the camera frames on — the joint core, never the metres-wide covering bay. */
  focusParts: ColonyPart[];
}

/**
 * The order the pieces of ONE connection are installed in, so the close-up reads as a fabricator
 * would build it: seat the plate, enter the bolt, fit the washer, run the nut down, land the purlin
 * on the cleat, offer the tube flush to the web, then fix the covering to the tube.
 * Any kind not listed sorts last but keeps a deterministic position.
 */
const DETAIL_PART_RANK: Partial<Record<ColonyPartKind, number>> = {
  "rsup-cleat-plate": 1,
  "rsup-bolt": 2,
  "rsup-washer": 3,
  "rsup-nut": 4,
  "rsup-c-purlin": 5,
  "rsup-ms-tube": 6,
  "rsup-cement-sheet": 7,
  "rsup-puf-roof-panel": 7,
};

/** The tightest sensible framing subset, best first: the bolted joint, then the members, then all. */
const FOCUS_TIERS: ColonyPartKind[][] = [
  ["rsup-cleat-plate", "rsup-bolt", "rsup-nut", "rsup-washer"],
  ["rsup-ms-tube", "rsup-c-purlin"],
];

const COVERING_KINDS: ColonyPartKind[] = ["rsup-cement-sheet", "rsup-puf-roof-panel"];

/** The result of partitioning one construction step's parts into tourable assemblies + the rest. */
export interface DetailPartition {
  groups: DetailAssemblyGroup[];
  /** Everything NOT in a group — the ordinary work of the step, installed in its overview shot. */
  rest: ColonyPart[];
}

/**
 * Partition one construction step's parts into per-connection assemblies plus the leftover.
 *
 * PARTITION GUARANTEE: `groups.flatMap(g => g.parts)` and `rest` are disjoint and together contain
 * every input part exactly once — a part either has a rafter-support connection id or it does not.
 * Groups come back in natural cleat-mark order so the tour is identical on every rebuild.
 */
export function groupDetailAssemblies(parts: ColonyPart[]): DetailPartition {
  const byConn = new Map<string, ColonyPart[]>();
  const rest: ColonyPart[] = [];

  for (const p of parts) {
    const conn = rafterConnectionIdOf(p);
    if (!conn) {
      rest.push(p);
      continue;
    }
    const list = byConn.get(conn);
    if (list) list.push(p);
    else byConn.set(conn, [p]);
  }

  const groups: DetailAssemblyGroup[] = [...byConn.entries()]
    .map(([connectionId, raw]) => {
      const ordered = sortDetailParts(raw);
      const covering = ordered.every((p) => COVERING_KINDS.includes(p.kind));
      return {
        connectionId,
        mark: markOfGroup(connectionId, ordered),
        levelId: levelIdOfConnectionId(connectionId),
        phase: (covering ? "covering" : "steel") as DetailAssemblyPhase,
        parts: ordered,
        focusParts: focusPartsOf(ordered),
      };
    })
    .sort((a, b) => compareNatural(a.mark, b.mark) || compareNatural(a.connectionId, b.connectionId));

  return { groups, rest };
}

/** Erection order inside one assembly; ties break on the stable part id so rebuilds are identical. */
export function sortDetailParts(parts: ColonyPart[]): ColonyPart[] {
  return [...parts].sort(
    (a, b) =>
      (DETAIL_PART_RANK[a.kind] ?? 99) - (DETAIL_PART_RANK[b.kind] ?? 99)
      || a.id.localeCompare(b.id),
  );
}

/** The cleat mark: the plate's own part mark when it carries one, else parsed from the connection id. */
function markOfGroup(connectionId: string, parts: ColonyPart[]): string {
  const plate = parts.find((p) => p.kind === "rsup-cleat-plate");
  const mark = plate?.partMark;
  if (typeof mark === "string" && mark.trim().length) return mark.trim();
  return cleatMarkOfConnectionId(connectionId);
}

/**
 * The parts the camera frames on. The bolted joint first (a 150 × 200 mm plate and its M12 heads),
 * falling back to the members and finally to the whole assembly — because a covering bay is a metre
 * or more wide and framing on it would push the bolt heads down to a few unreadable pixels, which is
 * exactly the failure the user's photograph is asking us to avoid.
 */
function focusPartsOf(parts: ColonyPart[]): ColonyPart[] {
  for (const tier of FOCUS_TIERS) {
    const hit = parts.filter((p) => tier.includes(p.kind));
    if (hit.length) return hit;
  }
  return parts;
}

/* ----------------------------------------------------------------- timing ---------------------- */

/** Floor on a detail fly-in — below this the pieces cannot be read as landing one after another. */
export const MIN_DETAIL_INSTALL_MS = 520;
/** Ceiling on a detail fly-in — beyond this the shot feels slack rather than deliberate. */
export const MAX_DETAIL_INSTALL_MS = 1500;
/** Floor on the dwell — the shortest hold on which a bolt head still registers. */
export const MIN_DETAIL_HOLD_MS = 700;
/** The shortest complete detail shot. */
export const MIN_DETAIL_SHOT_MS = MIN_DETAIL_INSTALL_MS + MIN_DETAIL_HOLD_MS;
/** The longest dwell an admin can ask for on one connection (ms). */
export const MAX_DETAIL_HOLD_MS = 12_000;
/**
 * The absolute number of assemblies the tour will visit individually.
 *
 * At the floor shot length this is ~12 minutes of tour, which is still exportable. Beyond it the
 * video stops being watchable at all, so the tour caps — and the cap is REPORTED (a timeline warning
 * plus a sentence in the overview caption naming how many assemblies are erected together instead),
 * never applied silently.
 */
export const DETAIL_TOUR_HARD_CAP = 600;

/** The resolved shot length + how many assemblies actually get their own shot. */
export interface DetailTiming {
  installMs: number;
  holdMs: number;
  /** installMs + holdMs. */
  shotMs: number;
  /** Assemblies that get their own shot. */
  toured: number;
  /** True when fewer than every assembly is toured (explicit option, or the hard cap). */
  capped: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const finiteOr = (v: number, fallback: number): number => (Number.isFinite(v) ? v : fallback);

/**
 * Divide the runtime budget across the assemblies.
 *
 * The admin asks for a dwell; the builder honours it whenever the tour fits the budget and shortens
 * it — never below the readable floor — when it does not. That is what lets a 20-connection colony
 * and a 200-connection colony both land in the 5–7 minute band the user asked for, with the same
 * default options and without anyone editing a number per project.
 */
export function planDetailTiming(assemblies: number, options: AssemblyOptions): DetailTiming {
  const total = Math.max(0, Math.floor(finiteOr(assemblies, 0)));
  const askedMax = Math.max(0, Math.floor(finiteOr(options.detailTourMaxAssemblies, 0)));
  const requested = askedMax > 0 ? Math.min(total, askedMax) : total;
  const toured = Math.min(requested, DETAIL_TOUR_HARD_CAP);
  const capped = toured < total;

  const wantHold = clamp(finiteOr(options.detailDwellMs, MIN_DETAIL_HOLD_MS), MIN_DETAIL_HOLD_MS, MAX_DETAIL_HOLD_MS);
  const wantShot = wantHold + MAX_DETAIL_INSTALL_MS;
  const budget = Math.max(0, finiteOr(options.detailTourBudgetMs, 0));

  const raw = toured > 0 && budget > 0 ? budget / toured : wantShot;
  const shot = clamp(raw, MIN_DETAIL_SHOT_MS, wantShot);
  const installMs = Math.round(clamp(shot * 0.42, MIN_DETAIL_INSTALL_MS, MAX_DETAIL_INSTALL_MS));
  const holdMs = Math.round(Math.max(MIN_DETAIL_HOLD_MS, shot - installMs));

  return { installMs, holdMs, shotMs: installMs + holdMs, toured, capped };
}
