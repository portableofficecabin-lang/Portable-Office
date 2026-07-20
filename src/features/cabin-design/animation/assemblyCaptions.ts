/**
 * ANIMATED CABIN ASSEMBLY — captions (spec: "Captions and annotations").
 *
 * Generates the step titles, the non-technical customer lines and the engineering caption rows
 * DYNAMICALLY from the components actually present in each step + the live BoqResult. The wording is
 * never hard-coded to one cabin: a PUF cabin says "insulated PUF panels", an MS-sheet cabin says
 * "profiled steel sheets", an un-insulated cabin never mentions insulation, and steps with no parts
 * are dropped by the timeline builder before they ever reach here. Every technical value comes from
 * the shared model + BoqResult (via inspector/boqLink) — nothing is recomputed.
 *
 * Pure: no React / three / DOM. Runtime-safe to unit-test (the one BoqLine mapping it imports,
 * boqForPart, is itself pure — its only ComponentInspector import is `import type`, erased at build).
 */

import type { AssemblyStep, CabinModel, CabinPart } from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { boqForPart } from "@/features/cabin-design/inspector/boqLink";
import type { StepEngineeringRow } from "./assemblyTypes";

/** Presentation facts derived once from the config, so caption wording matches the real cabin. */
export interface AssemblyContext {
  puf: boolean;
  insulated: boolean;
  sloped: boolean;
  container: boolean;
  toilet: boolean;
  lined: boolean;
  roomCount: number;
  hasPartition: boolean;
  hasSlidingPartition: boolean;
  roofType: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
}

export interface StepCopy {
  title: string;
  description: string;
  captionCustomer: string;
  captionEngineering: string;
  /** Ordered fixing / installation sub-steps for the fitter (optional — most steps have none). */
  instructions?: string[];
  /** Tooling call-out for the step. */
  tools?: string;
  /** What the supervisor signs off before the next step. */
  inspection?: string;
}

const has = (parts: CabinPart[], kind: CabinPart["kind"]): boolean => parts.some((p) => p.kind === kind);

/** The wall skin phrasing that matches the real material (never "PUF" on an MS cabin, and vice-versa). */
function wallSkinPhrase(ctx: AssemblyContext): string {
  if (ctx.puf) return "insulated PUF wall panels";
  return "profiled steel wall sheets";
}
function roofSkinPhrase(ctx: AssemblyContext): string {
  if (ctx.puf) return "insulated PUF roof panels";
  if (ctx.container) return "the container roof";
  return "profiled roof sheeting";
}

/**
 * The dynamic copy for one construction step, given the parts installed in it and the cabin context.
 * Steps that are absent are never passed here (the timeline builder skips empty ones).
 */
export function describeStep(step: AssemblyStep, ctx: AssemblyContext, parts: CabinPart[]): StepCopy {
  switch (step) {
    case 1:
      return {
        title: "Base frame assembly",
        description: "The steel base chassis is set out — longitudinal and cross members that carry the cabin.",
        captionCustomer: "The steel base frame is positioned and joined.",
        captionEngineering: "Base chassis: longitudinal + cross members set to the cabin footprint.",
      };
    case 2:
      return {
        title: "Base Frame & Cross-Stiffener Installation",
        description:
          "Transverse base-frame stiffeners shall be installed between the longitudinal base members at a " +
          "maximum spacing of 2'-0\" centre-to-centre, using the selected structural section, to provide adequate " +
          "support for the floor assembly and distribute imposed loads uniformly across the base frame.",
        captionCustomer: "Cross-stiffeners are fitted across the base frame.",
        captionEngineering:
          "Transverse base-frame cross-stiffeners between the longitudinal members at the specified c/c spacing.",
      };
    case 3:
      return {
        title: "Floor decking — 8 ft × 4 ft sheets",
        description:
          "The structural floor board is laid sheet by sheet over the joist grid using standard 8 ft × 4 ft " +
          "(32 sq ft) boards, laid length-wise along the cabin. Perimeter sheets are cut to fit and the off-cuts " +
          "are reused; the finished flooring is then laid over the deck.",
        captionCustomer: "The floor sheets are laid and finished.",
        captionEngineering: "8′ × 4′ deck boards laid length-wise over the joist grid, then the floor finish.",
        instructions: [
          "1 · Set out from the rear-left corner and lay full 8 ft × 4 ft sheets length-wise along the cabin.",
          "2 · Land each sheet on the joists so every edge is supported and joints fall on a member.",
          "3 · Work along the row, then start the next row — follow the sheet marks (GF-01, GF-02 …).",
          "4 · Measure, mark and cut the perimeter sheets to fit; keep the off-cuts for the opposite end.",
          "5 · Fix each sheet down to the joists, then lay the floor finish over the completed deck.",
        ],
        tools: "Circular saw, tape, chalk line, screw gun",
        inspection: "All joints supported on a member; no unsupported edges; deck level and fully fixed.",
      };
    case 4:
      return {
        title: "Corner columns",
        description: "The corner posts are raised, setting the cabin height.",
        captionCustomer: "The corner columns are raised into position.",
        captionEngineering: "Corner posts set the eave height and carry the top frame.",
      };
    case 5: {
      const mdf = has(parts, "mdf-support");
      return {
        title: "Wall framing",
        description:
          "Intermediate posts, studs and top/bottom rails complete the wall frame" +
          (mdf ? ", with 50 × 25 internal MDF-lining support battens on the room face." : "."),
        captionCustomer: "The wall framework is built up between the columns.",
        captionEngineering:
          "Intermediate posts, studs and perimeter rails frame every wall" +
          (mdf ? "; internal MDF support battens back the lining." : "."),
      };
    }
    case 6:
      return {
        title: "Wall panel installation",
        description: `${cap(wallSkinPhrase(ctx))} are fixed to the structural frame.`,
        captionCustomer: `${cap(wallSkinPhrase(ctx))} are fixed to the frame.`,
        captionEngineering: ctx.puf
          ? "PUF sandwich panels fixed to every wall face."
          : "Profiled external sheeting fixed to every wall face.",
      };
    case 7:
      return {
        title: "Insulation",
        description: "Insulation is fitted within the wall and roof cavities.",
        captionCustomer: "Insulation is fitted inside the walls and roof.",
        captionEngineering: "Cavity insulation to walls and ceiling per the specification.",
      };
    case 8:
      return {
        title: "Internal lining",
        description: "The internal wall lining is fixed over the framing.",
        captionCustomer: "The inner wall lining is installed.",
        captionEngineering: "Internal lining board fixed over the studwork.",
      };
    case 9:
      return {
        title: "Partition walls",
        description: ctx.roomCount > 1
          ? `Internal partitions divide the cabin into ${ctx.roomCount} rooms.`
          : "Internal partitions are installed.",
        captionCustomer: ctx.roomCount > 1
          ? `Partitions divide the cabin into ${ctx.roomCount} rooms.`
          : "Internal partitions are installed.",
        captionEngineering: `${ctx.roomCount - 1 > 0 ? ctx.roomCount - 1 : ""} partition wall(s)${ctx.hasSlidingPartition ? ", including a sliding leaf" : ""}.`.trim(),
      };
    case 10: {
      const d = has(parts, "door");
      const w = has(parts, "window");
      const both = d && w;
      const desc = both
        ? "Doors and windows are set into their openings."
        : d ? "Doors are hung in their frames."
          : w ? "Windows are fitted into their openings."
            : "Openings are fitted out.";
      return {
        title: both ? "Doors & windows" : d ? "Doors" : "Windows",
        description: desc,
        captionCustomer: desc,
        captionEngineering: `${d ? "Door leaves" : ""}${both ? " and " : ""}${w ? "window units" : ""} installed to the opening schedule.`.trim(),
      };
    }
    case 11:
      return ctx.sloped
        ? {
            title: "Roof truss fabrication & installation",
            description:
              "Each roof truss is delivered as a complete, ready-fabricated unit: the rafter pair and the bottom " +
              "tie are FULLY WELDED at every internal joint in the shop (6 mm fillet weld, all round) so no site " +
              "welding is required. The truss is then landed on the top frame and secured at each eave bearing " +
              "through connection plates fitted on BOTH faces of the rafter, using an engineering-standard " +
              "nut-and-bolt fastening system.",
            captionCustomer: "Ready-welded roof trusses are lifted on and bolted down.",
            captionEngineering:
              "Shop-welded truss units (2 rafters + bottom tie) bolted to the top frame through twin connection plates.",
            instructions: [
              "1 · Check each truss mark (T1, T2 …) and confirm all internal joints are fully welded — 6 mm fillet, all round.",
              "2 · Lift the truss and land it on the top frame, apex centred on the cabin width.",
              "3 · Align the truss to its grid line and plumb it square to the base frame.",
              "4 · Offer up a connection plate to EACH face of the rafter at the eave bearing (2 plates per joint).",
              "5 · Line the plate holes through with a drift; holes are ⌀14 mm for M12 bolts (2 mm clearance).",
              "6 · Insert 2 × M12 × 40 property-class 8.8 bolts per joint from the outer face.",
              "7 · Fit a flat washer under the head, then a flat washer + spring washer under the nut.",
              "8 · Run the nuts up hand-tight, re-check alignment, then tighten to 80 Nm with a torque wrench.",
              "9 · Repeat at the opposite eave, then fix the purlins to the rafters at the priced spacing.",
            ],
            tools: "Torque wrench (80 Nm), ⌀14 mm drift, spirit level, lifting sling",
            inspection: "All bolts torqued and marked; truss plumb and square; no site welding on any internal joint.",
          }
        : {
            title: "Roof frame",
            description: "The top perimeter frame is assembled.",
            captionCustomer: "The roof frame is assembled.",
            captionEngineering: "Top perimeter frame closes the structure.",
          };
    case 12:
      return {
        title: "Roof installation",
        description: `${cap(roofSkinPhrase(ctx))} ${ctx.sloped ? "are placed to both slopes, aligned and sealed." : "is placed, aligned and sealed."}`,
        captionCustomer: `${cap(roofSkinPhrase(ctx))} ${ctx.sloped ? "are placed and sealed." : "is placed and sealed."}`,
        captionEngineering: ctx.puf ? "PUF roof panels laid and sealed." : "Roof sheeting laid to falls and sealed.",
      };
    case 13:
      return {
        title: "Ceiling",
        description: "The internal ceiling lining is installed.",
        captionCustomer: "The ceiling is finished.",
        captionEngineering: "Ceiling lining fixed below the roof structure.",
      };
    case 14:
      return {
        title: "Electrical fit-out",
        description: "Lights, fans, sockets, switches and the distribution board are installed.",
        captionCustomer: "Lighting and electrical points are fitted.",
        captionEngineering: "MEP: luminaires, fans, socket + switch points and the DB.",
      };
    case 15:
      return {
        title: "Plumbing fit-out",
        description: "Sanitary fixtures and pipework are installed.",
        captionCustomer: "Plumbing fixtures are installed.",
        captionEngineering: "Wet fixtures and supply / soil pipework connected.",
      };
    case 16:
      return {
        title: "Furniture & fit-out",
        description: "Workstations, storage and loose furniture are placed.",
        captionCustomer: "Furniture and fittings are placed.",
        captionEngineering: "Parametric furniture and loose fittings positioned.",
      };
    case 17:
    default:
      return {
        title: "Completed cabin",
        description: "Every component is assembled in its final position.",
        captionCustomer: "The cabin is complete.",
        captionEngineering: "All components assembled to configuration.",
      };
  }
}

/** The intro title-card sub-line, e.g. "20 × 10 × 8 ft · sloped roof · 2 rooms". */
export function summaryLine(ctx: AssemblyContext): string {
  const parts = [
    `${fmtFt(ctx.lengthFt)} × ${fmtFt(ctx.widthFt)} × ${fmtFt(ctx.heightFt)} ft`,
    `${ctx.roofType} roof`,
  ];
  if (ctx.roomCount > 1) parts.push(`${ctx.roomCount} rooms`);
  if (ctx.puf) parts.push("PUF panel");
  return parts.join(" · ");
}

/** "20 × 10 × 8 ft" style dimension line for the overlay corner. */
export function dimensionsLine(ctx: AssemblyContext): string {
  return `${fmtFt(ctx.lengthFt)} × ${fmtFt(ctx.widthFt)} × ${fmtFt(ctx.heightFt)} ft`;
}

/**
 * Engineering caption rows for a step — real material / section / qty / weight / BOQ line, grouped by
 * the parts' boqLineId (falling back to kind). Uses the LIVE BoqResult via boqForPart; when no BOQ is
 * available (legacy design) it degrades to the part's own spec and never throws.
 */
export function buildStepEngineeringRows(
  parts: CabinPart[], _model: CabinModel, boqResult: BoqResult | null | undefined,
): StepEngineeringRow[] {
  const groups = new Map<string, { rep: CabinPart; count: number }>();
  for (const p of parts) {
    const key = p.boqLineId ?? `kind:${p.kind}`;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { rep: p, count: 1 });
  }

  const rows: StepEngineeringRow[] = [];
  for (const { rep, count } of groups.values()) {
    const boq = safeBoq(rep, boqResult);
    const sp = rep.spec;
    const material = boq?.material ?? sp.material ?? cap(rep.kind.replace(/-/g, " "));
    const section = boq?.spec ?? sp.sectionSize;
    const qty = boq?.qty != null
      ? `${trimNum(boq.qty)} ${boq.uom ?? ""}`.trim()
      : count > 1 ? `${count} nos` : sp.quantity != null ? `${sp.quantity}` : undefined;
    const weight = boq?.totalWeightKg != null && isFinite(boq.totalWeightKg)
      ? `${boq.totalWeightKg.toFixed(1)} kg`
      : sp.totalWeightKg != null ? `${sp.totalWeightKg.toFixed(1)} kg` : undefined;
    rows.push({
      label: groupLabel(rep, count),
      material: material || undefined,
      section: section || undefined,
      qty,
      weight,
      boqRef: boq?.lineId ?? rep.boqLineId,
    });
    if (rows.length >= 6) break; // keep the overlay legible
  }
  return rows;
}

/* ----------------------------------------------------------------- helpers --------------------- */

function groupLabel(rep: CabinPart, count: number): string {
  const base = rep.label.replace(/\s+—.*$/, ""); // drop the "— rear/front" face suffix for the group row
  return count > 1 ? `${base} ×${count}` : base;
}

/** boqForPart, wrapped so a malformed BoqResult can never crash caption generation. */
function safeBoq(part: CabinPart, boqResult: BoqResult | null | undefined) {
  try {
    return boqForPart(part, boqResult);
  } catch {
    return null;
  }
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
function fmtFt(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}
function trimNum(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}
