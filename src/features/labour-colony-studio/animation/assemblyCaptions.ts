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
 * The deck sheet setting-out (`model.deck`) and the panel seating system (`model.panelSupport`) are
 * read the same way — the layout and the lock sequence are quoted from the modules that resolved
 * them rather than retold here, so the narration cannot drift from the drawing set. Both are
 * ENGINEERING DETAIL: the sheet quantity is a cutting / ordering figure and the MS seating sections
 * are not itemised at all, so the copy says outright that the priced deck-board and cladding lines
 * remain the source of truth for cost.
 *
 * Pure: no React / three / DOM.
 */

import type {
  ColonyAssemblyStep, ColonyModel, ColonyPart, ColonyPartKind, PartSpec,
} from "@/features/labour-colony-studio/model/types";
import { CONNECTION_DETAIL } from "@/features/labour-colony-studio/model/assembly";
import {
  MIN_EDGE_BEARING_MM, SHEET_LABEL, SHEET_SHORT_MM, isModularSpacing, recommendedSpacingMm,
  type SheetLayoutResult,
} from "@/features/labour-colony-studio/model/sheetLayout";
import {
  buildPanelLockSequence, type PanelSupportSpec,
} from "@/features/labour-colony-studio/model/panelSupport";
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
  /* ---- the detailing systems, present only when this colony actually carries them ----
   * Same rule as every flag above: a colony with no sandwich panel must never gain panel copy, and a
   * model built before these systems existed must still narrate cleanly. The two spec objects are
   * carried through so the step copy can quote the model's OWN resolved numbers instead of a second,
   * drifting derivation of them. */
  hasCBend: boolean;
  hasSheetSetOut: boolean;

  /**
   * A fully TRIANGULATED truss (king post + webs + tie chord), as opposed to a single mono-pitch
   * rafter. A mono roof emits one `rafter` and no `truss-web` at all, so narrating an apex, a king
   * post or web members there would describe a truss that was never built.
   */
  hasTrussFrame: boolean;
  /**
   * The truss's own welds / splice plates / bolts are present. `buildColonyModel` gates every one of
   * them behind `connectionDetail`, so a model built with it off has a truss and no joint hardware —
   * and must not be narrated with weld sizes, plate thicknesses and bolt groups that are not there.
   */
  hasTrussConnDetail: boolean;
  hasDeckCleat: boolean;
  hasPanelSeating: boolean;
  deck?: SheetLayoutResult;
  panelSupport?: PanelSupportSpec;
}

const hasKind = (parts: ColonyPart[], kind: ColonyPartKind): boolean => parts.some((p) => p.kind === kind);
const hasAnyKind = (parts: ColonyPart[], kinds: ColonyPartKind[]): boolean =>
  parts.some((p) => kinds.includes(p.kind));

/**
 * A `c-channel` part is one of TWO different members: the perimeter C-bend that edges the deck, or a
 * jamb / closing channel that receives a panel edge. Only the panel ones carry a slot width, so that
 * field — not the kind — is what tells them apart wherever the copy has to name one of them.
 */
const isPanelSeat = (p: ColonyPart): boolean => p.spec.slotWidthMm != null;
const isPerimeterCBend = (p: ColonyPart): boolean => p.kind === "c-channel" && !isPanelSeat(p);

/** The joist-end cleats belong to the deck assembly, not to the wall cleats that share the kind. */
const isDeckCleat = (p: ColonyPart): boolean =>
  p.kind === "cleat" && (p.assemblyId ?? "").endsWith(":deck");

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
    hasCBend: parts.some(isPerimeterCBend),
    hasSheetSetOut: hasKind(parts, "floor-sheet") && (model.deck?.sheets.length ?? 0) > 0,

    hasTrussFrame: hasKind(parts, "truss-web"),
    hasTrussConnDetail: parts.some((p) =>
      (p.assemblyId ?? "").startsWith("truss:")
      && (p.kind === "weld" || p.kind === "splice-plate" || p.kind === "bolt")),
    hasDeckCleat: parts.some(isDeckCleat),
    hasPanelSeating: hasAnyKind(parts, ["u-channel", "angle-support", "pocket-support"])
      || parts.some(isPanelSeat),
    deck: model.deck,
    panelSupport: model.panelSupport,
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
    case 6: {
      /* The base frame now also lands the PERIMETER C-BEND, and that is the one member of the whole
       * floor a reader is most likely to dismiss as trim. So the copy names all four jobs the single
       * section does and gives the load path end to end: an unsupported deck edge is the defect this
       * member exists to prevent, and a caption that only says it is there does not say that. */
      const cb = ctx.hasCBend;
      return {
        title: "Ground-floor base frame",
        description:
          "The longitudinal and transverse base-frame members are landed on the base plates and bolted " +
          "up, setting the building footprint square and level." +
          (cb
            ? " The perimeter C-bend edge member is then set on all four sides — the LEFT-hand run " +
              "FIRST, because every joist end and the whole deck sheet setting-out is measured from " +
              "that line. One cold-formed section does four jobs at once. EDGE SUPPORT: its top " +
              "flange is a continuous bearing ledge for the outer sheet edge, which has no joist " +
              "beyond the last grid line. PERIMETER MEMBER: its web ties every joist end into one " +
              "rim, so a point load is shared across several joists instead of punching a single " +
              "one. PANEL-HOLDING SUPPORT: its upstand carries the panel base track, so the wall " +
              "lands on steel and not on the edge of a floor sheet. STIFFENING MEMBER: the return " +
              "lip raises the torsional stiffness of the section, so the free edge cannot roll under " +
              "the eccentric load of a wall and a handrail standing on it."
            : ""),
        captionCustomer: "The steel base frame is landed and bolted down." +
          (cb ? " A folded steel rim is set around the floor edge first — everything else is measured from it." : ""),
        captionEngineering:
          "Base-frame longitudinal + transverse members bolted to the base plates; frame squared to diagonals." +
          (cb
            ? " Perimeter C-bend erected left-hand run first (the setting-out datum): edge support + " +
              "rim member + panel seat + stiffener in one section. Load path — sheet / wall base load " +
              "→ C-bend top flange → web acting as a rim beam column to column → bolted cleat → base " +
              "beam → column → base plate → anchor bolts → pedestal → footing."
            : ""),
        tools: "Mobile crane or chain block, tag lines, spanner set, torque wrench, spirit level" +
          (cb ? ", string line, auto level" : ""),
        safety: "Tag lines on every lift; nobody passes under a suspended load; frame stays slung until bolted.",
        inspection: "Base frame diagonals, level and bolt torque checked before any column is erected." +
          (cb ? " C-bend line, top-flange level and the left-hand datum recorded before any joist is laid." : ""),
      };
    }
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
    case 8: {
      /* Three facts land in this step and every one of them is a defect if it stays implicit: whether
       * the support spacing is sheet-modular, whether each sheet joint has steel under it, and how a
       * joist end is actually made up. All of it is read off `model.deck` and the parts themselves, so
       * a frame that IS on the sheet module narrates as a pass rather than as a warning. */
      const deck = ctx.hasSheetSetOut ? ctx.deck : undefined;
      const cleat = ctx.hasDeckCleat;
      return {
        title: "Ground-floor joists & deck",
        description:
          "Floor joists are laid between the base beams at the designed spacing and the structural deck " +
          "and floor finish are fixed over them." +
          (deck ? ` ${sheetSetOutParagraph(deck)}` : "") +
          (cleat
            ? " Every joist end is made up the same way: the cleat is SHOP-welded to the base beam and " +
              "the joist is SITE-bolted to that cleat. A sound weld needs a shop; a bolt needs neither " +
              "power nor a certificate and can be inspected by eye on site."
            : ""),
        captionCustomer: "The ground floor is decked and finished." +
          (deck ? " The floor sheets are numbered and cut so that every joint sits on a steel member." : ""),
        captionEngineering:
          `Floor joists at design c/c between the base beams; deck board${hasKind(parts, "floor-finish") ? " and floor finish" : ""} fixed over.` +
          (deck
            ? ` ${deck.moduleLabel} sheets ${sheetMarkRange(deck)} laid ${sheetLayWords(deck)}` +
              `, ${deck.fullCount} full / ${deck.cutCount} cut, joints on members at ` +
              `${fmtMm(deck.edgeBearingMm)} mm edge bearing.`
            : "") +
          (cleat ? " Joist ends: shop-welded cleat, site-bolted joist." : ""),
        tools: "Chain block, screw gun, joist cleats, chalk line, circular saw",
        safety: "Edge protection before any decking work; no unfixed deck sheet left as a walking surface.",
        inspection: "Joist spacing, bearing length and deck fixing pattern verified against the floor framing plan." +
          (deck
            ? ` Every sheet joint confirmed to land on a member with ${fmtMm(deck.edgeBearingMm)} mm bearing ` +
              `each side (minimum ${MIN_EDGE_BEARING_MM} mm) before the next sheet is fixed.`
            : ""),
      };
    }
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
    case 14: {
      /* The panel SEATING framework is erected with the studwork, not with the panels, and that
       * ordering is the entire point of putting it here: a channel cannot be threaded onto a panel
       * that is already standing. Each seat is named only if the model actually placed one, and its
       * own `role` text is quoted rather than paraphrased so the caption cannot drift from the
       * section the drawing set details. */
      const spec = ctx.hasPanelSeating ? ctx.panelSupport : undefined;
      const seats = spec ? spec.seats.filter((s) => hasKind(parts, s.kind)) : [];
      const seated = seats.length > 0 && spec != null;
      return {
        title: "Wall studs & rails",
        description:
          "Wall studs and the top / bottom framing rails are fixed between the columns on every wall " +
          "line, forming the frame the cladding and linings fix back to." +
          (seated
            ? " The panel seating framework goes up with the studwork and must be complete, plumb and " +
              "signed off BEFORE the first panel arrives — a channel cannot be threaded onto a panel " +
              `that is already standing. ${seats.map((s) => `${s.label} (${s.sectionCall}): ${s.role}`).join(" ")} ` +
              "These MS sections are engineering detail the take-off does not itemise; the priced " +
              "cladding line remains the source of truth for the cost of the panel itself."
            : ""),
        captionCustomer: "The wall framework is built up between the columns." +
          (seated ? " The steel channels the wall panels will slide into are fixed and checked first." : ""),
        captionEngineering: "Wall studs at design c/c with top / bottom rails and cleats on every wall line." +
          (seated
            ? ` Panel seating framework complete before any panel — ${seats.map((s) => s.sectionCall).join(", ")}. ${spec.note}`
            : ""),
        tools: "Screw gun, chop saw, chalk line, spirit level, cleats and fixings" +
          (seated ? ", slot gauge" : ""),
        safety: "Stack studs flat, never on end against a frame; keep cut-off zones clear of the walkway.",
        inspection: "Stud spacing, plumb and rail fixing verified against the wall framing elevations." +
          (seated
            ? ` Every panel seat straight, plumb and free of weld spatter, with the ${fmtMm(spec.slotWidthMm)} mm ` +
              "slot proved with a gauge before the first panel is offered up."
            : ""),
      };
    }
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
    case 17: {
      /* The truss step carries the fullest fabrication story in the sequence, so the copy is layered:
       * the CUSTOMER caption explains it plainly, the ENGINEERING caption states how it is made and
       * joined. Both are gated on what the model ACTUALLY contains, because "sloped" alone is not
       * enough to justify the narration:
       *   • a MONO-pitch roof emits one rafter and no `truss-web`, so it has no apex, no king post
       *     and no web members — describing them would narrate a truss that was never built;
       *   • `connectionDetail: false` builds the truss with NO welds, plates or bolts, so the joint
       *     specification must disappear with them.
       * The weld / plate / bolt FIGURES below are the detailing constants `buildColonyModel` uses;
       * they are literals here, not read from the parts, so `hasTrussConnDetail` only decides whether
       * they are shown at all. The weld and bolt SCHEDULES remain the authority on those values. */
      const triangulated = ctx.sloped && ctx.hasTrussFrame;
      const jointSpec = ctx.hasTrussConnDetail;
      return {
        title: "Roof trusses & rafters",
        description: triangulated
          ? "Each roof truss arrives as ONE ready-fabricated unit: the top chords, bottom tie chord, king " +
            "post and web members are already welded together in the shop. The finished truss is craned " +
            "onto the column heads, seated at the heels and joined at the apex" +
            (jointSpec
              ? " — the site joints are bolted, not welded, through a pair of plates fitted on BOTH faces of the truss."
              : ".")
          : ctx.sloped
            ? "Sloping roof rafters are landed on the column heads and seated at the eaves, setting the roof falls."
            : "Roof rafters and the top frame are landed on the column heads, setting the roof falls.",
        captionCustomer: triangulated
          ? "The roof truss comes ready-made from the factory — already welded — and is simply lifted on" +
            (jointSpec ? " and bolted down." : " and seated.")
          : "The roof structure is lifted into place.",
        captionEngineering: triangulated && jointSpec
          ? "Shop-welded truss: 6 mm continuous fillet weld at every panel point (apex, both heels, king-post " +
            "foot, web-to-chord). Site joints bolted — paired 10 mm splice / cleat plates on BOTH faces, " +
            "4 × M16 gr 8.8 per joint through Ø18 holes; apex gauge 120 / pitch 100 / edge 35, heel gauge 100 / " +
            "pitch 80 / edge 30. One washer and one nut per bolt."
          : triangulated
            ? "Shop-welded triangulated truss lifted in as one unit and seated on the column heads. " +
              "Connection detailing is not modelled in this view — see the weld and bolt schedules."
            : ctx.sloped
              ? "Sloping rafters landed on the column heads to the designed falls and fixed at the eaves."
              : "Roof rafters and top frame landed on the column heads to the designed falls.",
        tools: "Mobile crane, spreader beam, tag lines, spirit level"
          + (jointSpec ? ", podger spanner, calibrated torque wrench" : ""),
        safety: triangulated
          ? "Trusses stay slung and laterally restrained until at least two purlins or ties are fixed. "
            + (jointSpec ? "Never release the sling on a truss held by fewer than the full bolt group." : "")
          : "Rafters stay slung and laterally restrained until the purlins or ties that stabilise them are fixed.",
        inspection: triangulated
          ? "Shop welds visually checked for full continuous profile before dispatch. On site: truss "
            + "spacing, heel bearing"
            + (jointSpec
              ? ", plate seating on both faces, full bolt complement (no open holes) and torque check on every bolt"
              : "")
            + " before the sling is released."
          : "Rafter spacing, eaves bearing and fixing checked before the sling is released.",
      };
    }
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
    case 20: {
      /* A sandwich panel is never "placed on" the frame, it is CAPTURED by it, and the order in which
       * it gains that capture is what stops a wall going up loose. The sequence is therefore read
       * straight out of buildPanelLockSequence() — the same steps the installation crew works to —
       * rather than retold here, so the narration and the method statement cannot diverge. */
      const spec = ctx.hasPanelSeating ? ctx.panelSupport : undefined;
      const lock = spec ? buildPanelLockSequence(spec) : [];
      return {
        title: "Wall panels & partitions",
        description:
          `External cladding${ctx.hasInsulation ? ", cavity insulation" : ""}${ctx.hasLining ? ", internal lining" : ""}` +
          `${ctx.hasPartition ? " and the internal partitions" : ""} are installed over the wall framing.` +
          (lock.length
            ? " The panels are LOCKED into that framework in a fixed order rather than simply stood " +
              `up: ${lock.map((s) => `${s.step}. ${s.title} — ${s.restrainedEdges}`).join(" ")} ` +
              "The rule that order exists to enforce is that no panel is ever left holding on fewer " +
              "than two edges before the next one arrives, and that the head is fixed LAST so the " +
              "panel is never wedged vertically."
            : "") +
          (spec ? ` ${spec.note}` : ""),
        captionCustomer: "The walls are clad, lined and divided into rooms." +
          (lock.length ? " Each panel slides into its steel channel and locks onto the one before it." : ""),
        captionEngineering:
          `External cladding fixed to the stud frame${ctx.hasInsulation ? "; cavity insulation to the specification" : ""}` +
          `${ctx.hasLining ? "; internal lining board over the studwork" : ""}` +
          `${ctx.hasPartition ? `; partitions setting out ${ctx.rooms} rooms` : ""}.` +
          (spec && lock.length
            /* "head fixed last" would contradict the sequence printed beside it — step 7 is the head
             * restraint but step 8 is the closing panel, which is entered afterwards (and gets its own
             * head restraint). Describe the RULE the order encodes instead of the final step. */
            ? ` Panel lock sequence, ${lock.length} steps — each panel gains two edges before the next ` +
              `arrives and no head is fixed until its panel is home: ${fmtMm(spec.thicknessMm)} mm ` +
              `panel into a ${fmtMm(spec.slotWidthMm)} mm slot, ${fmtMm(spec.clearanceMm)} mm free play, ` +
              `${fmtMm(spec.minInsertionMm)} mm minimum insertion on every captured edge. A panel edge ` +
              "bears on steel — never packed with timber or foam."
            : ""),
        tools: "Screw gun, sheet nibbler, chalk line, sealant gun, panel lifter",
        safety: "Two-person handling on full-height panels; keep panel stacks braced against wind.",
        inspection: "Panel fixing centres, sheet alignment and partition line verified against the room layout." +
          (spec
            ? ` Insertion depth, joint closure and the open head movement gap checked panel by panel; ` +
              "no panel accepted that has been forced or packed at an edge."
            : ""),
      };
    }
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

/* ----------------------------------------------------------------- deck set-out copy ----------- */

/** "4 ft width across the joists" — the lay the layout actually resolved, not an assumed one. */
function sheetLayWords(d: SheetLayoutResult): string {
  return d.orientation === "width-across-joists"
    ? "4 ft width across the joists"
    : "8 ft length across the joists";
}

/** "S01–S60" — the laying-sequence range the numbered sheets cover. */
function sheetMarkRange(d: SheetLayoutResult): string {
  const last = d.sheets.length ? d.sheets[d.sheets.length - 1].mark : "";
  return last && d.sheets.length > 1 ? `${d.sheets[0].mark}–${last}` : last;
}

/**
 * The deck setting-out told as one paragraph, read entirely off the layout the model already
 * resolved — spacing, bearing, bearers, sheet counts and the ordering figure.
 *
 * The sheet quantity is a CUTTING and ordering figure, so the paragraph says that outright: the
 * priced deck-board line stays the source of truth for cost, and nothing here is a second purchase.
 */
function sheetSetOutParagraph(d: SheetLayoutResult): string {
  const bearers = d.bearers.length;
  const spacing = d.spacing.modular
    ? `Support members at ${fmtMm(d.spacing.actualMm)} mm centres divide the sheet exactly, so every ` +
      "joint already lands on steel with no added member"
    : `Support members at ${fmtMm(d.spacing.actualMm)} mm centres do not divide the ` +
      `${fmtMm(SHEET_SHORT_MM)} mm sheet width, so ${bearers} bearer line${bearers === 1 ? "" : "s"} ` +
      `${bearers === 1 ? "is" : "are"} added to close every joint the priced frame leaves floating — ` +
      `${d.bearersAvoidableBySpacing} of them a ${fmtMm(d.spacing.recommendedMm)} mm frame would not need at all`;
  const edges = d.unsupportedSheets === 0
    ? "no sheet is left with an unsupported edge"
    : `${d.unsupportedSheets} sheet${d.unsupportedSheets === 1 ? "" : "s"} remain short of full edge support`;
  /* Every count below is ONE deck: the layout is resolved per floor and repeated, so a G+1 colony lays
   * this field twice. Saying "per deck" is what stops the paragraph disagreeing with the step's own
   * part count, which spans every floor the step installs. */
  return `Each deck is then set out as a field of ${d.moduleLabel} sheets laid ${sheetLayWords(d)} and ` +
    `numbered ${sheetMarkRange(d)} in laying sequence, row by row from the origin corner: ` +
    `${d.laidCount} sheets per deck, ${d.fullCount} laid whole and ${d.cutCount} cut to the perimeter. ` +
    `${spacing}. A joint landing on a member gives ${fmtMm(d.edgeBearingMm)} mm bearing to each sheet ` +
    `against a ${MIN_EDGE_BEARING_MM} mm minimum, and ${edges}. Order ${d.purchaseSheets} sheets per ` +
    `deck at ${d.wastagePct.toFixed(1)}% wastage — a cutting and ordering figure only; the priced ` +
    "deck-board line remains the source of truth for cost.";
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

/** Detail rows lead a step's row list, so cap them well below the row budget the overlay paints. */
const MAX_DETAIL_ROWS = 3;

/**
 * The rows that carry a NUMBER a reader has to act on — support spacing, edge bearing, sheet counts,
 * panel slot width, insertion depth — derived from the setting-out fields the parts themselves carry.
 *
 * They exist as their own rows because these are the values that decide whether the step is right: a
 * spacing that is not sheet-modular, or an insertion depth that is not achieved, is a defect, whereas
 * the grouped material rows below restate what the priced take-off already prints. A step with none
 * of the new detailing produces no rows here at all and reads exactly as it did before.
 */
function detailRowsOf(parts: ColonyPart[]): StepEngineeringRow[] {
  const rows: StepEngineeringRow[] = [];

  const cbend = parts.find(isPerimeterCBend);
  if (cbend) {
    rows.push({
      label: "Perimeter C-bend",
      material: isText(cbend.spec.sectionSize) ? cbend.spec.sectionSize : undefined,
      section: cbend.spec.lengthM != null && Number.isFinite(cbend.spec.lengthM)
        ? `${trimNum(cbend.spec.lengthM)} m run`
        : undefined,
      note: "Edge support · rim member · panel seat · stiffener",
    });
  }

  const sheets = parts.filter((p) => isText(p.spec.sheetMark));
  if (sheets.length) {
    const full = sheets.filter((p) => p.spec.sheetFull === true).length;
    rows.push({
      label: "Deck sheets",
      material: SHEET_LABEL,
      qty: `${sheets.length} laid`,
      note: `${full} full · ${sheets.length - full} cut — setting-out, never a priced quantity`,
    });
  }

  const spacingMm = firstSpecValue(parts, (sp) => sp.supportSpacingMm);
  if (spacingMm != null) {
    rows.push({
      label: "Support spacing",
      section: `${fmtMm(spacingMm)} mm c/c`,
      note: isModularSpacing(spacingMm, SHEET_SHORT_MM)
        ? "Sheet-modular — every joint lands on a member"
        : `Not sheet-modular — re-space to ${fmtMm(recommendedSpacingMm(spacingMm))} mm`,
    });
  }

  const bearingMm = firstSpecValue(parts, (sp) => sp.bearingMm);
  if (bearingMm != null) {
    rows.push({
      label: "Edge bearing",
      section: `${fmtMm(bearingMm)} mm per sheet`,
      note: `Minimum ${MIN_EDGE_BEARING_MM} mm — ` +
        (bearingMm >= MIN_EDGE_BEARING_MM ? "achieved" : "SHORT, widen the member top face"),
    });
  }

  const seatParts = parts.filter(isPanelSeat);
  if (seatParts.length) {
    const slotMm = firstSpecValue(seatParts, (sp) => sp.slotWidthMm);
    const insertions = seatParts
      .map((p) => p.spec.minInsertionMm)
      .filter((v): v is number => v != null && Number.isFinite(v));
    rows.push({
      label: "Panel seat",
      section: slotMm != null ? `${fmtMm(slotMm)} mm slot` : undefined,
      qty: `${seatParts.length} nos`,
      note: insertions.length
        ? `${fmtMm(Math.min(...insertions))} mm minimum insertion — the edge bears on steel, never packed`
        : "The panel edge bears on steel, never packed with timber or foam",
    });
  }

  const cleat = parts.find(isDeckCleat);
  if (cleat) {
    rows.push({
      label: "Joist-end cleat",
      material: isText(cleat.spec.weldSpec) ? cleat.spec.weldSpec : undefined,
      section: isText(cleat.spec.boltSpec)
        ? `${cleat.spec.boltSpec} × ${cleat.spec.boltCount ?? 2}`
        : undefined,
      note: "Shop-welded to the beam · joist site-bolted to it",
    });
  }

  return rows.slice(0, MAX_DETAIL_ROWS);
}

/**
 * Engineering caption rows for a step — the real material / section / grade / quantity / weight / BOQ
 * line each group of parts carries, grouped by `boqLineId` (falling back to kind). Every value is READ
 * from `part.spec`, which the model builder populated from the two priced take-offs; nothing is
 * recomputed here. Capped so the overlay stays legible.
 *
 * The setting-out detail rows are prepended, not appended, because the overlay paints only the first
 * few rows and on the steps that carry them those numbers ARE the step. The grouped rows keep their
 * own budget untouched, so a step with no detailing produces byte-identical output.
 */
export function buildColonyStepEngineeringRows(parts: ColonyPart[]): StepEngineeringRow[] {
  const groups = new Map<string, { rep: ColonyPart; count: number }>();
  for (const p of parts) {
    const key = isText(p.boqLineId) ? p.boqLineId : `kind:${p.kind}`;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { rep: p, count: 1 });
  }

  const grouped: StepEngineeringRow[] = [];
  for (const { rep, count } of groups.values()) {
    const sp = rep.spec;
    const material = isText(sp.material) ? sp.material : kindWords(rep.kind);
    const qty = sp.quantity != null && Number.isFinite(sp.quantity)
      ? `${trimNum(sp.quantity)} nos`
      : count > 1 ? `${count} nos` : undefined;
    const weight = sp.totalWeightKg != null && Number.isFinite(sp.totalWeightKg)
      ? `${sp.totalWeightKg.toFixed(1)} kg`
      : undefined;
    grouped.push({
      label: groupLabel(rep, count),
      material: material || undefined,
      section: isText(sp.sectionSize) ? sp.sectionSize : undefined,
      qty,
      weight,
      boqRef: isText(rep.boqLineId) ? rep.boqLineId : undefined,
      note: isText(sp.grade) ? sp.grade : isText(rep.partMark) ? `Mark ${rep.partMark}` : undefined,
    });
    if (grouped.length >= 6) break;
  }
  /* THE OVERLAY PAINTS ONLY THE FIRST SIX ROWS (assemblyOverlayDraw.ts drawAssemblyOverlay →
   * `cap.engineeringRows.slice(0, 6)`), so the six slots are a SHARED budget, not one budget each.
   * Prepending the detail rows unconditionally therefore pushed priced, BOQ-referenced rows off the
   * rendered and exported frame — step 14 silently lost its "Wall stud … (BOQ front:stud:…)" row.
   *
   * Detail rows still lead, because a step's explanation is what the viewer is there to read, but
   * they are capped at two and the grouped rows are trimmed to fill exactly the six visible slots.
   * That keeps at least four priced rows on screen in every step, so the explanation can never
   * displace the take-off it is explaining. */
  const OVERLAY_ROW_BUDGET = 6;
  const MAX_DETAIL_ROWS = 2;
  const detail = detailRowsOf(parts).slice(0, MAX_DETAIL_ROWS);
  return [...detail, ...grouped.slice(0, Math.max(0, OVERLAY_ROW_BUDGET - detail.length))];
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

/** Millimetres read as a whole number wherever they are one — 609.6 mm stays 609.6, 1000 mm stays 1000. */
function fmtMm(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

/** The first defined value of a spec field across a step's parts (they share it within a group). */
function firstSpecValue(parts: ColonyPart[], pick: (sp: PartSpec) => number | undefined): number | undefined {
  for (const p of parts) {
    const v = pick(p.spec);
    if (v != null && Number.isFinite(v)) return v;
  }
  return undefined;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}
