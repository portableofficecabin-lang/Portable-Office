/**
 * LABOUR COLONY ASSEMBLY ANIMATION — captions (spec: "Captions and annotations").
 *
 * Per-step copy for the 24-step civil-led erection sequence, generated DYNAMICALLY from the components
 * actually present in each step plus the model's own meta — never hard-coded to one colony. A
 * single-storey colony never mentions first-floor splices, an un-insulated colony never mentions
 * insulation, a colony without a veranda never mentions a walkway plate, and steps with no parts are
 * dropped by the timeline builder before they ever reach here.
 *
 * Every technical value (material, section, grade, quantity, weight, BOQ line) is READ from the parts
 * the shared model already carries — `part.spec` is populated upstream from the two priced take-offs
 * (Material BOQ + civil engine) and `part.boqLineId` is the join key. NOTHING here recomputes a price
 * or a quantity, and nothing here needs the live BoqResult, which is what keeps the timeline
 * deterministic for a given model.
 *
 * Pure: no React / three / DOM.
 */

import type {
  ColonyAssemblyStep, ColonyModel, ColonyPart, ColonyPartKind,
} from "@/features/labour-colony-studio/model/types";
import { CONNECTION_DETAIL } from "@/features/labour-colony-studio/model/assembly";
import type { StepEngineeringRow } from "./assemblyTypes";

/* ----------------------------------------------------------------- context --------------------- */

/** Presentation facts derived once from the model, so the wording matches the real colony. */
export interface ColonyAssemblyContext {
  projectName: string;
  title: string;
  floors: number;
  rooms: number;
  sloped: boolean;
  roofType: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  plinthM: number;
  floorHM: number;
  gridRef: string;
  /* which physical systems this colony actually has */
  hasPcc: boolean;
  hasFooting: boolean;
  hasPedestal: boolean;
  hasPlinthBeam: boolean;
  hasBasePlate: boolean;
  hasAnchorBolt: boolean;
  hasTruss: boolean;
  hasPurlin: boolean;
  hasStair: boolean;
  hasVeranda: boolean;
  hasWalkway: boolean;
  hasPartition: boolean;
  hasInsulation: boolean;
  hasLining: boolean;
  hasCeiling: boolean;
  hasRailing: boolean;
  hasElectrical: boolean;
  hasPlumbing: boolean;
  hasBunk: boolean;
  hasSplice: boolean;
  hasBrace: boolean;
  upperFloor: boolean;
}

const hasKind = (parts: ColonyPart[], kind: ColonyPartKind): boolean => parts.some((p) => p.kind === kind);
const hasAnyKind = (parts: ColonyPart[], kinds: ColonyPartKind[]): boolean =>
  parts.some((p) => kinds.includes(p.kind));

export function colonyContextOf(model: ColonyModel): ColonyAssemblyContext {
  const parts = model.parts;
  const m = model.meta;
  return {
    projectName: m.projectName,
    title: m.title,
    floors: m.floors,
    rooms: m.rooms,
    sloped: m.sloped,
    roofType: m.roofType,
    lengthM: m.totalLengthM,
    widthM: m.totalWidthM,
    heightM: m.totalHeightM,
    plinthM: m.plinthM,
    floorHM: m.floorHM,
    gridRef: m.gridRef,
    hasPcc: hasKind(parts, "pcc"),
    hasFooting: hasKind(parts, "footing"),
    hasPedestal: hasKind(parts, "pedestal"),
    hasPlinthBeam: hasKind(parts, "plinth-beam"),
    hasBasePlate: hasKind(parts, "base-plate"),
    hasAnchorBolt: hasKind(parts, "anchor-bolt"),
    hasTruss: hasAnyKind(parts, ["roof-truss", "rafter", "truss-web"]),
    hasPurlin: hasKind(parts, "purlin"),
    hasStair: hasAnyKind(parts, ["stair-stringer", "stair-tread", "landing"]),
    hasVeranda: hasAnyKind(parts, ["veranda-beam", "veranda-joist", "veranda-post"]),
    hasWalkway: hasKind(parts, "walkway-plate"),
    hasPartition: hasKind(parts, "partition"),
    hasInsulation: hasKind(parts, "insulation"),
    hasLining: hasKind(parts, "int-finish"),
    hasCeiling: hasKind(parts, "ceiling"),
    hasRailing: hasAnyKind(parts, ["handrail", "handrail-post", "toe-plate"]),
    hasElectrical: hasAnyKind(parts, ["light", "fan", "socket", "db"]),
    hasPlumbing: hasAnyKind(parts, ["plumbing-fixture", "pipe"]),
    hasBunk: hasAnyKind(parts, ["bunk", "furniture"]),
    hasSplice: hasKind(parts, "splice-plate"),
    hasBrace: hasKind(parts, "brace"),
    upperFloor: m.floors > 1 || parts.some((p) => (p.floor ?? 0) >= 1),
  };
}

/* ----------------------------------------------------------------- step copy ------------------- */

/** The full per-step copy the animation surfaces (the procedural rows the spec's engineering caption
 *  must carry: tools, safety, inspection — alongside the customer / engineering caption lines). */
export interface ColonyStepCopy {
  title: string;
  description: string;
  captionCustomer: string;
  captionEngineering: string;
  tools: string;
  safety: string;
  inspection: string;
}

const FLOOR_WORD = (n: number): string => (n <= 1 ? "the floor" : `all ${n} floors`);

/**
 * The dynamic copy for one construction step, given the parts installed in it and the colony context.
 * Steps that are absent are never passed here (the timeline builder skips empty ones).
 */
export function describeColonyStep(
  step: ColonyAssemblyStep, ctx: ColonyAssemblyContext, parts: ColonyPart[],
): ColonyStepCopy {
  switch (step) {
    case 1:
      return {
        title: "PCC / lean concrete bed",
        description:
          "A levelling course of lean concrete is cast in every excavated pit on the column grid, " +
          "giving a clean, true base for the footing reinforcement.",
        captionCustomer: "A levelling concrete bed is cast in every foundation pit.",
        captionEngineering: `PCC levelling bed cast under every footing on grid ${ctx.gridRef}.`,
        tools: "Concrete mixer, screed board, spirit level, string line, excavation tools",
        safety: "Keep excavation edges shored and barricaded; nobody works under an unsupported face.",
        inspection: "PCC top level and thickness checked against the foundation layout before reinforcement is placed.",
      };
    case 2:
      return {
        title: "Isolated footings",
        description:
          "RCC isolated footings are reinforced, shuttered and cast to the sizes the foundation design " +
          "resolved for the bearing capacity at each column.",
        captionCustomer: "The concrete footings that carry the building are cast.",
        captionEngineering:
          "RCC isolated footings cast to the footing schedule; starter bars projected for the pedestals.",
        tools: "Bar bending machine, shuttering set, cover blocks, needle vibrator, cube moulds",
        safety: "Cap every projecting starter bar; keep clear of the vibrator lead and the pour chute.",
        inspection: "Reinforcement, cover and footing size verified against the footing schedule before the pour; cubes cast.",
      };
    case 3:
      return {
        title: "Pedestals",
        description:
          "RCC pedestals are raised from each footing up to plinth level, carrying the column starter " +
          "bars and the anchor-bolt assembly.",
        captionCustomer: "Short concrete pedestals are raised from each footing.",
        captionEngineering: "RCC pedestals cast from footing top to plinth level with the anchor-bolt template set.",
        tools: "Shuttering set, plumb bob, needle vibrator, auto level, anchor-bolt template",
        safety: "Do not climb green shuttering; brace and prop every pedestal box before pouring.",
        inspection: "Pedestal verticality, top level and anchor-bolt template position recorded before the pour.",
      };
    case 4:
      return {
        title: "Plinth beams",
        description:
          "Tie / plinth beams are cast between the pedestals, closing the substructure grid and " +
          "distributing the wall and floor loads back into the footings.",
        captionCustomer: "Concrete tie beams link the foundations into one rigid grid.",
        captionEngineering: "Plinth / tie beams cast between pedestals to complete the substructure grid.",
        tools: "Shuttering set, bar bending machine, needle vibrator, auto level",
        safety: "Support shuttering from firm ground; keep the trench access route clear of stacked rebar.",
        inspection: "Plinth beam line, level, lap lengths and cover verified before the pour.",
      };
    case 5:
      return {
        title: "Base plates & anchor bolts",
        description:
          "Holding-down anchor bolts, levelling plates and the column base plates are set, packed and " +
          "grouted at finished plinth level so the steel frame lands dead level.",
        captionCustomer: "Steel base plates are levelled and bolted to the foundations.",
        captionEngineering:
          "Base plates set on levelling packs over the HD anchor-bolt groups; non-shrink grout after final level.",
        tools: "Torque wrench, spanner set, levelling shims, auto level, grout gun",
        safety: "Do not stand plates on unsecured packs; torque bolts in a diagonal sequence.",
        inspection: "Base plate level, packing and anchor-bolt torque recorded on the ITP before erection starts.",
      };
    case 6:
      return {
        title: "Ground-floor base frame",
        description:
          "The longitudinal and transverse base-frame members are landed on the base plates and bolted " +
          "up, setting the building footprint square and level.",
        captionCustomer: "The steel base frame is landed and bolted down.",
        captionEngineering: "Base-frame longitudinal + transverse members bolted to the base plates; frame squared to diagonals.",
        tools: "Mobile crane or chain block, tag lines, spanner set, torque wrench, spirit level",
        safety: "Tag lines on every lift; nobody passes under a suspended load; frame stays slung until bolted.",
        inspection: "Base frame diagonals, level and bolt torque checked before any column is erected.",
      };
    case 7:
      return {
        title: "Ground-floor columns",
        description:
          "Ground-floor columns are erected on the base plates, plumbed in both directions and " +
          "temporarily guyed until the permanent bracing is in.",
        captionCustomer: "The ground-floor columns are raised and plumbed.",
        captionEngineering: "GF columns erected to the base plates, plumbed in two planes and temporarily guyed.",
        tools: "Crane or gin pole, plumb bob / laser plumb, guy ropes, turnbuckles, spanner set",
        safety: "Never release a lift until temporary guys are tensioned; exclusion zone under the erection radius.",
        inspection: "Column verticality (both axes), grid position and base bolt torque signed off before load transfer.",
      };
    case 8:
      return {
        title: "Ground-floor joists & deck",
        description:
          "Floor joists are laid between the base beams at the designed spacing and the structural deck " +
          "and floor finish are fixed over them.",
        captionCustomer: "The ground floor is decked and finished.",
        captionEngineering:
          `Floor joists at design c/c between the base beams; deck board${hasKind(parts, "floor-finish") ? " and floor finish" : ""} fixed over.`,
        tools: "Chain block, screw gun, joist cleats, chalk line, circular saw",
        safety: "Edge protection before any decking work; no unfixed deck sheet left as a walking surface.",
        inspection: "Joist spacing, bearing length and deck fixing pattern verified against the floor framing plan.",
      };
    case 9:
      return {
        title: "Ground-floor bracing",
        description:
          "Vertical cross and knee bracing is installed on the braced bays, taking the wind and " +
          "erection loads out of the ground-floor frame.",
        captionCustomer: "Cross bracing stiffens the ground-floor frame.",
        captionEngineering: "GF vertical cross / knee bracing installed to the braced-bay layout; temporary guys released after.",
        tools: "Spanner set, torque wrench, turnbuckles, drift pins, ladder or scaffold",
        safety: "Release temporary guys only after the permanent bracing in that bay is fully bolted.",
        inspection: "Bracing member marks, bolt count and tension checked bay by bay before guys are struck.",
      };
    case 10:
      return {
        title: "Ground-floor / transfer trusses",
        description:
          "Transfer trusses are landed where the layout carries a floor or roof over a clear span, " +
          "transferring the load back onto the column lines.",
        captionCustomer: "Transfer trusses are lifted into place over the open spans.",
        captionEngineering: "Transfer trusses landed on the GF column heads; end connections bolted before the sling is released.",
        tools: "Mobile crane, spreader beam, tag lines, drift pins, torque wrench",
        safety: "Use a spreader beam on long trusses; keep the truss laterally restrained until purlins or ties are in.",
        inspection: "Truss camber, bearing seat and end-connection bolting verified before de-rigging.",
      };
    case 11:
      return {
        title: "First-floor beams",
        description:
          "The first-floor perimeter and transverse floor beams are landed on the ground-floor columns " +
          "and connected through end plates and cleats.",
        captionCustomer: "The first-floor beams are landed on the columns.",
        captionEngineering: "FF perimeter + transverse floor beams landed on GF column heads; end-plate / cleat connections made up.",
        tools: "Mobile crane, tag lines, podger spanners, drift pins, torque wrench",
        safety: "Full harness with twin lanyards above the ground floor; beams landed and bolted before release.",
        inspection: "Beam level, line and end-connection bolt torque checked across every bay.",
      };
    case 12:
      return {
        title: "First-floor columns & splices",
        description:
          "First-floor columns are spliced onto the ground-floor columns, plumbed and bolted through " +
          "the splice plates.",
        captionCustomer: "The upper-floor columns are spliced on and plumbed.",
        captionEngineering: "FF columns spliced to the GF column heads; splice plates bolted and columns re-plumbed.",
        tools: "Crane, laser plumb, splice plates, drift pins, torque wrench",
        safety: "Erect from a MEWP or a fully boarded platform; no free climbing of a spliced column.",
        inspection: "Splice plate bolt torque, joint gap and column verticality recorded per column.",
      };
    case 13:
      return {
        title: "First-floor joists & deck",
        description:
          "First-floor joists and the deck over them are fixed to carry the upper accommodation.",
        captionCustomer: "The upper floor is decked out.",
        captionEngineering: "FF joists at design c/c on the floor beams; deck fixed to the fixing schedule.",
        tools: "Chain block, screw gun, joist hangers / cleats, chalk line",
        safety: "Edge protection and a covered leading edge; never work off an unfixed deck sheet.",
        inspection: "Joist bearing, spacing and deck fixings verified before any load is placed on the upper floor.",
      };
    case 14:
      return {
        title: "Wall studs & rails",
        description:
          "Wall studs and the top / bottom framing rails are fixed between the columns on every wall " +
          "line, forming the frame the cladding and linings fix back to.",
        captionCustomer: "The wall framework is built up between the columns.",
        captionEngineering: "Wall studs at design c/c with top / bottom rails and cleats on every wall line.",
        tools: "Screw gun, chop saw, chalk line, spirit level, cleats and fixings",
        safety: "Stack studs flat, never on end against a frame; keep cut-off zones clear of the walkway.",
        inspection: "Stud spacing, plumb and rail fixing verified against the wall framing elevations.",
      };
    case 15:
      return {
        title: "Staircase",
        description:
          "Stair stringers, treads and the intermediate landing are erected and connected at both the " +
          "floor and landing ends.",
        captionCustomer: "The staircase is installed between floors.",
        captionEngineering: "Stair stringers landed and bolted at both ends; treads and landing framing fixed to the stair schedule.",
        tools: "Chain block, spanner set, spirit level, drift pins, temporary handrail",
        safety: "Fit a temporary handrail as soon as the flight is bolted; no stair used until both ends are connected.",
        inspection: "Going, rise and landing level checked against the stair detail; both end connections signed off.",
      };
    case 16:
      return {
        title: "Corridor & veranda framing",
        description:
          "Corridor and veranda beams, joists and posts are erected along the access side and the " +
          "chequered walkway plate is laid over them.",
        captionCustomer: "The access corridor and veranda are framed and floored.",
        captionEngineering:
          `Veranda / corridor beams, joists and posts erected on the access side${ctx.hasWalkway ? "; chequered walkway plate laid and fixed" : ""}.`,
        tools: "Chain block, spanner set, screw gun, spirit level, plate lifting clamps",
        safety: "Edge protection along the open corridor edge before the walkway plate is walked on.",
        inspection: "Walkway level, plate fixing and post bases verified before the railing step.",
      };
    case 17:
      return {
        title: "Roof trusses & rafters",
        description: ctx.sloped
          ? "Roof trusses and rafters are landed on the column heads and connected at the ridge and eave, " +
            "setting the roof pitch."
          : "Roof rafters and the top frame are landed on the column heads, setting the roof falls.",
        captionCustomer: "The roof structure is lifted into place.",
        captionEngineering: ctx.sloped
          ? "Roof trusses / rafters landed on the column heads; ridge and eave connections bolted through gussets."
          : "Roof rafters and top frame landed on the column heads to the designed falls.",
        tools: "Mobile crane, spreader beam, tag lines, gusset plates, torque wrench",
        safety: "Trusses stay slung and laterally restrained until at least two purlins or ties are fixed.",
        inspection: "Truss spacing, bearing and ridge / eave connection bolting checked before the sling is released.",
      };
    case 18:
      return {
        title: "Roof purlins & bracing",
        description:
          "Purlins and the roof wind-bracing are fixed across the trusses, stabilising the roof plane " +
          "and providing the fixing line for the sheeting.",
        captionCustomer: "Purlins and roof bracing tie the roof structure together.",
        captionEngineering: "Purlins at design c/c with roof plan bracing; cleats bolted to every truss top chord.",
        tools: "Screw gun, spanner set, purlin cleats, safety net or fall-arrest line",
        safety: "Fall-arrest anchored to the truss top chord; never traverse on unfixed purlins.",
        inspection: "Purlin spacing, cleat bolting and roof bracing tension checked before sheeting starts.",
      };
    case 19:
      return {
        title: "Roof sheeting & ceiling",
        description:
          `Roofing sheets are laid to falls with ridge and eave flashing${ctx.hasCeiling ? ", and the internal ceiling lining is fixed below" : ""}.`,
        captionCustomer: "The roof is sheeted and sealed.",
        captionEngineering:
          `Roof sheeting laid to falls with the specified end / side laps and flashing${ctx.hasCeiling ? "; ceiling lining fixed below the roof structure" : ""}.`,
        tools: "Sheet lifting clamps, self-drilling screw gun, sealant gun, crimping tool",
        safety: "Sheets never left unfixed in wind; crawl boards over the purlins; fall-arrest at all times.",
        inspection: "Lap lengths, fixing pattern and flashing seal verified; roof rain-tightness checked.",
      };
    case 20:
      return {
        title: "Wall panels & partitions",
        description:
          `External cladding${ctx.hasInsulation ? ", cavity insulation" : ""}${ctx.hasLining ? ", internal lining" : ""}` +
          `${ctx.hasPartition ? " and the internal partitions" : ""} are installed over the wall framing.`,
        captionCustomer: "The walls are clad, lined and divided into rooms.",
        captionEngineering:
          `External cladding fixed to the stud frame${ctx.hasInsulation ? "; cavity insulation to the specification" : ""}` +
          `${ctx.hasLining ? "; internal lining board over the studwork" : ""}` +
          `${ctx.hasPartition ? `; partitions setting out ${ctx.rooms} rooms` : ""}.`,
        tools: "Screw gun, sheet nibbler, chalk line, sealant gun, panel lifter",
        safety: "Two-person handling on full-height panels; keep panel stacks braced against wind.",
        inspection: "Panel fixing centres, sheet alignment and partition line verified against the room layout.",
      };
    case 21: {
      const d = hasKind(parts, "door");
      const w = hasKind(parts, "window");
      const both = d && w;
      const what = both ? "Doors and windows" : d ? "Doors" : "Windows";
      return {
        title: both ? "Doors & windows" : d ? "Doors" : "Windows",
        description: `${what} are set into their framed openings, packed, fixed and sealed.`,
        captionCustomer: `${what} are fitted into their openings.`,
        captionEngineering: `${what} installed to the opening schedule; frames packed square, fixed and perimeter-sealed.`,
        tools: "Spirit level, packing shims, screw gun, sealant gun, glazing suckers",
        safety: "Glazed units carried on edge with suckers; opening left barricaded until the unit is fixed.",
        inspection: "Opening sizes, frame square, operation and seal checked against the door / window schedule.",
      };
    }
    case 22:
      return {
        title: "Railings",
        description:
          "Handrail posts, top and mid rails and toe plates are fixed along the corridors, verandas " +
          "and stair flights, replacing the temporary edge protection.",
        captionCustomer: "Permanent handrails and toe plates are fitted.",
        captionEngineering: "Handrail posts, top / mid rails and toe plates fixed to the edge-protection detail.",
        tools: "Screw gun, spanner set, spirit level, drill, post base fixings",
        safety: "Temporary edge protection is removed only bay by bay, immediately behind the permanent railing.",
        inspection: "Railing height, post spacing and a horizontal load check recorded before temporary protection is struck.",
      };
    case 23: {
      const bits: string[] = [];
      if (ctx.hasElectrical) bits.push("lights, fans, socket points and the distribution board");
      if (ctx.hasPlumbing) bits.push("wet fixtures and pipework");
      if (ctx.hasBunk) bits.push("furniture and bunks");
      const list = bits.length ? bits.join(", ") : "the internal fit-out";
      return {
        title: "Electrical, plumbing & fit-out",
        description: `The services and fit-out are installed across ${FLOOR_WORD(ctx.floors)}: ${list}.`,
        captionCustomer: "Services, fittings and furniture are installed.",
        captionEngineering: `MEP and fit-out: ${list}.`,
        tools: "Electrician's tool kit, pipe wrench, conduit bender, test meter, drill",
        safety: "Lock-off and prove dead before any connection; pressure-test pipework behind a barrier.",
        inspection: "Earth continuity, insulation resistance and a pipework pressure test recorded before handover.",
      };
    }
    case 24:
    default:
      return {
        title: "Completed colony",
        description: "Every component is assembled in its final position, ready for handover.",
        captionCustomer: "The labour colony is complete.",
        captionEngineering: "All components assembled to the approved configuration and drawing set.",
        tools: "Snag list, measuring tape, camera",
        safety: "Site cleared of temporary works, plant and debris before handover.",
        inspection: "Final joint inspection and snag close-out against the full ITP record.",
      };
  }
}

/* ----------------------------------------------------------------- marks / bolts --------------- */

const MAX_MARKS = 8;

/** Distinct fabrication part marks of the STRUCTURAL members in a step ("C1, PB1, T1 · 24 members"). */
export function memberMarksOf(parts: ColonyPart[]): string {
  const members = parts.filter((p) => !CONNECTION_DETAIL.has(p.kind));
  const marks = distinct(members.map((p) => p.partMark).filter(isText));
  const total = members.length;
  if (!marks.length) {
    const kinds = distinct(members.map((p) => kindWords(p.kind))).slice(0, 4);
    return kinds.length ? `${kinds.join(", ")} · ${total} nos` : "";
  }
  const shown = marks.slice(0, MAX_MARKS).join(", ");
  const more = marks.length > MAX_MARKS ? ` +${marks.length - MAX_MARKS}` : "";
  return `${shown}${more} · ${total} nos`;
}

/** Connection marks + the number of distinct connection groups ("BP1, AB · 6 connections"). */
export function connectionMarksOf(parts: ColonyPart[]): string {
  const conn = parts.filter((p) => CONNECTION_DETAIL.has(p.kind));
  const groups = distinct(parts.map((p) => p.connectionId).filter(isText)).length;
  if (!conn.length && !groups) return "";
  const marks = distinct(conn.map((p) => p.partMark).filter(isText));
  const label = marks.length
    ? marks.slice(0, MAX_MARKS).join(", ")
    : distinct(conn.map((p) => kindWords(p.kind))).slice(0, 4).join(", ");
  const groupBit = groups ? `${groups} connection${groups === 1 ? "" : "s"}` : "";
  return [label, groupBit].filter(Boolean).join(" · ");
}

/**
 * The bolt spec + count for the step, read from the parts' own fabrication spec — the synthesized
 * connection detail the priced take-offs deliberately do not itemise. Never a priced quantity.
 */
export function boltSpecOf(parts: ColonyPart[]): string {
  const counts = new Map<string, number>();
  for (const p of parts) {
    const spec = p.spec.boltSpec;
    if (!isText(spec)) continue;
    counts.set(spec, (counts.get(spec) ?? 0) + (p.spec.boltCount ?? 1));
  }
  if (!counts.size) {
    const bolts = parts.filter((p) => p.kind === "bolt" || p.kind === "anchor-bolt").length;
    return bolts ? `${bolts} bolts` : "";
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([spec, n]) => `${spec} × ${n}`)
    .join(" · ");
}

/** The distinct BOQ line references a step touches ("floor:joist:6, front:brace:100"). */
export function boqRefsOf(parts: ColonyPart[]): string {
  const refs = distinct(parts.map((p) => p.boqLineId).filter(isText));
  if (!refs.length) return "";
  const shown = refs.slice(0, 4).join(", ");
  return refs.length > 4 ? `${shown} +${refs.length - 4}` : shown;
}

/* ----------------------------------------------------------------- summary lines --------------- */

/** The intro title-card sub-line, e.g. "24.0 × 8.0 × 6.4 m · 2 floors · 12 rooms · sloped roof". */
export function colonySummaryLine(ctx: ColonyAssemblyContext): string {
  const bits = [colonyDimensionsLine(ctx)];
  bits.push(`${ctx.floors} floor${ctx.floors === 1 ? "" : "s"}`);
  if (ctx.rooms > 0) bits.push(`${ctx.rooms} room${ctx.rooms === 1 ? "" : "s"}`);
  if (ctx.roofType) bits.push(`${ctx.roofType} roof`);
  return bits.join(" · ");
}

/** "24.0 × 8.0 × 6.4 m" — the overlay corner dimension line. */
export function colonyDimensionsLine(ctx: ColonyAssemblyContext): string {
  return `${fmtM(ctx.lengthM)} × ${fmtM(ctx.widthM)} × ${fmtM(ctx.heightM)} m`;
}

/* ----------------------------------------------------------------- engineering rows ------------ */

/**
 * Engineering caption rows for a step — the real material / section / grade / quantity / weight / BOQ
 * line each group of parts carries, grouped by `boqLineId` (falling back to kind). Every value is READ
 * from `part.spec`, which the model builder populated from the two priced take-offs; nothing is
 * recomputed here. Capped so the overlay stays legible.
 */
export function buildColonyStepEngineeringRows(parts: ColonyPart[]): StepEngineeringRow[] {
  const groups = new Map<string, { rep: ColonyPart; count: number }>();
  for (const p of parts) {
    const key = isText(p.boqLineId) ? p.boqLineId : `kind:${p.kind}`;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { rep: p, count: 1 });
  }

  const rows: StepEngineeringRow[] = [];
  for (const { rep, count } of groups.values()) {
    const sp = rep.spec;
    const material = isText(sp.material) ? sp.material : kindWords(rep.kind);
    const qty = sp.quantity != null && Number.isFinite(sp.quantity)
      ? `${trimNum(sp.quantity)} nos`
      : count > 1 ? `${count} nos` : undefined;
    const weight = sp.totalWeightKg != null && Number.isFinite(sp.totalWeightKg)
      ? `${sp.totalWeightKg.toFixed(1)} kg`
      : undefined;
    rows.push({
      label: groupLabel(rep, count),
      material: material || undefined,
      section: isText(sp.sectionSize) ? sp.sectionSize : undefined,
      qty,
      weight,
      boqRef: isText(rep.boqLineId) ? rep.boqLineId : undefined,
      note: isText(sp.grade) ? sp.grade : isText(rep.partMark) ? `Mark ${rep.partMark}` : undefined,
    });
    if (rows.length >= 6) break;
  }
  return rows;
}

/* ----------------------------------------------------------------- helpers --------------------- */

function isText(s: string | undefined | null): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function distinct(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function groupLabel(rep: ColonyPart, count: number): string {
  const base = rep.label.replace(/\s+—.*$/, "").trim() || kindWords(rep.kind);
  return count > 1 ? `${base} ×${count}` : base;
}

function kindWords(kind: ColonyPartKind): string {
  const s = kind.replace(/-/g, " ");
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function fmtM(v: number): string {
  return Number.isFinite(v) ? v.toFixed(1) : "0.0";
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}
