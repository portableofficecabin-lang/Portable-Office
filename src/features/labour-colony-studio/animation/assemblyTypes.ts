/**
 * LABOUR COLONY ASSEMBLY ANIMATION — types (spec: "Assembly Video").
 *
 * ONE deterministic, typed timeline generated from the SHARED ColonyModel (model/colonyModel.ts) that
 * drives the interactive assembly preview, the step-by-step / cinematic playback, the caption overlay
 * and the video / frame export. Nothing here re-derives geometry — it references the model's stable
 * part ids, `assemblyStep` values and explode vectors, so the 2D fabrication sheets, the 3D viewer,
 * the two priced BOQs and this animation can never disagree (the same single-source rule the rest of
 * the studio holds).
 *
 * COORDINATES: two spaces are in play, kept explicit by naming.
 *   • COLONY m  (Vec3, from model/types) — the model's own right-handed METRE space (x=length,
 *                y=width, z=height; ground z=0; ground-floor FFL = meta.plinthM). NOTE: colony is
 *                ALREADY metres — there is NO mm→m /1000 anywhere (unlike the cabin studio).
 *   • THREE m   (Vec3T = [x, y, z] tuple) — the three.js scene, metres, Y-up. The mapping is the
 *                SAME one the colony 3D viewer uses (viewer3d/partGeometry.ts: toScene / explodeOffset),
 *                so a part sits in exactly the same place in the animation as in the interactive model.
 *
 * Pure data + types: no React, no three.js, no DOM — server-safe, unit-testable, out of the public
 * bundle. The React/three surfaces (AssemblyScene, AssemblyVideoView) and the exporter consume it.
 */

import type {
  ColonyAssemblyStep, ColonyModel, ModelBounds, ViewMode,
} from "@/features/labour-colony-studio/model/types";
import type { SceneCtx } from "@/features/labour-colony-studio/viewer3d/partGeometry";

/** A three.js-space vector (metres): [x = length, y = up, z = width]. */
export type Vec3T = [number, number, number];

/** Customer = clean marketing view; Engineering = full technical captions. Reuses the model's mode. */
export type PresentationMode = ViewMode;

/** Neutral studio backdrops for the animation / export. "transparent" only where the encoder supports it. */
export type AssemblyBackground = "studio" | "white" | "site" | "transparent";

/** A camera pose in three space. */
export interface CameraKeyframe {
  position: Vec3T;
  target: Vec3T;
}

/** The cinematic shot vocabulary (framed from the model bounding box, never hard-coded to one colony). */
export type CameraShotKind =
  | "establish"        // opening three-quarter establishing view
  | "foundation-low"   // low ground-level view for PCC / footings / pedestals / plinth beams
  | "base-connection"  // close-up on base plates + anchor bolts
  | "frame-erection"   // erecting base frame / columns / transfer trusses
  | "floor-deck"       // floor joists + deck + bracing
  | "upper-floor"      // elevated view for the first-floor beams / columns / joists
  | "wall-side"        // side view for wall studs / rails
  | "stair-veranda"    // staircase / corridor / veranda / railing work
  | "roof-elevated"    // elevated view for trusses / purlins / roof sheeting
  | "interior"         // interior / section view for panels / partitions / MEP (cutaway)
  | "opening-closeup"  // door / window close-up
  | "detail-closeup"   // MACRO shot on one bolted connection — bolt heads must be readable
  | "orbit"            // final completed-colony orbit
  | "hero";            // final front three-quarter hero

/** One engineering-mode caption row (all values sourced from the live model + the two priced BOQs). */
export interface StepEngineeringRow {
  label: string;
  material?: string;
  section?: string;
  qty?: string;
  weight?: string;
  boqRef?: string;
  note?: string;
}

/** One installation step in the compacted timeline (empty assembly steps are dropped). */
export interface TimelineStep {
  id: string;
  /** 0-based position in the compacted step list (NOT the raw 1..23 assemblyStep). */
  index: number;
  /** The canonical 1..23 construction step this maps to. */
  assemblyStep: ColonyAssemblyStep;
  title: string;
  description: string;
  /** Non-technical customer line. */
  captionCustomer: string;
  /** Engineering summary line. */
  captionEngineering?: string;
  /** Fabrication part marks present in this step ("C1, PB1, T1"). */
  memberMarks: string;
  /** Connection marks / bolt groups in this step ("BP, AB · 6 base connections"). */
  connectionMarks: string;
  /** Bolt spec + count where the step makes a bolted connection ("M16 gr 8.8 × 24"). */
  boltSpec: string;
  /** Required tools for the step. */
  tools: string;
  /** Site safety note for the step. */
  safety: string;
  /** Inspection / ITP checkpoint that closes the step. */
  inspection: string;
  partIds: string[];
  /** timeline-absolute milliseconds. */
  startMs: number;
  /** how long the parts fly in for. */
  installMs: number;
  /** dwell after install so the viewer can read the step. */
  holdMs: number;
  /** startMs + installMs + holdMs. */
  endMs: number;
  shot: CameraShotKind;
  /** true ⇒ this is an interior/MEP step: the envelope is ghosted so the camera can read the work. */
  cutaway: boolean;
  camera: { from: CameraKeyframe; to: CameraKeyframe };
  engineering: StepEngineeringRow[];
  warnings: string[];
}

/**
 * Per-part motion schedule, precomputed once at timeline-build time so the render loop applies each
 * part in O(1) with no per-frame allocation. `enterOffset` is the three-space displacement the part
 * starts at (derived from its explode vector) and eases to zero across [enterStartMs, enterEndMs].
 */
export interface PartScheduleEntry {
  partId: string;
  stepIndex: number;
  assemblyStep: ColonyAssemblyStep;
  enterStartMs: number;
  enterEndMs: number;
  enterOffset: Vec3T;
  /** true ⇒ an outer wall / roof / ceiling / floor skin that must be ghosted during cutaway steps so
   *  the camera can see the interior work being installed inside it. */
  envelope: boolean;
}

/** The user-tunable presentation + timing options (spec: export config + customer/engineering modes). */
export interface AssemblyOptions {
  mode: PresentationMode;
  background: AssemblyBackground;
  companyName: string;
  projectName: string;
  customerName?: string;
  /** intro title-card duration (ms). */
  introMs: number;
  /** base per-step fly-in duration (ms) — scaled up slightly for steps with many parts. */
  stepInstallMs: number;
  /** dwell after each step (ms). */
  stepHoldMs: number;
  /** final completed-colony orbit duration (ms). */
  outroMs: number;
  autoCamera: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  /** show the engineering caption rows (marks / material / section / qty / weight / BOQ / ITP). */
  showEngineeringCaptions: boolean;
  showCompanyTitle: boolean;
  /** render not-yet-installed parts as faint ghosts instead of hiding them. */
  ghostFuture: boolean;
  /** dim already-installed parts to spotlight the current step. */
  dimInstalled: boolean;
}

/** The whole deterministic timeline — the single object the player, scene and exporter consume. */
export interface AssemblyTimeline {
  steps: TimelineStep[];
  schedule: PartScheduleEntry[];
  /** intro + Σ steps + outro (ms). Always > 0 for a valid model. */
  totalMs: number;
  introMs: number;
  outroMs: number;
  bounds: ModelBounds;
  sceneCtx: SceneCtx;
  /** three-space bounding radius (metres) — the camera framing scale. */
  radius: number;
  options: AssemblyOptions;
  meta: ColonyModel["meta"];
  /** "12.0 × 6.0 × 6.4 m" — echoed in the overlay corner + intro card. */
  dimensionsLine: string;
  /** Precomputed intro title-card + outro completion-card copy. */
  intro: { title: string; subtitle: string };
  outro: { title: string; subtitle: string };
  /** aggregate build warnings (missing explode vectors substituted, empty steps skipped, …). */
  warnings: string[];
}

export type CaptionKind = "intro" | "step" | "outro";

/** The overlay's per-frame caption state (shared by the DOM overlay and the export canvas drawer). */
export interface CaptionState {
  kind: CaptionKind;
  /** 1-based step number, 0 during intro. */
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  engineeringRows: StepEngineeringRow[];
  companyName: string;
  projectName: string;
  dimensionsLine: string;
  /** overall progress 0..1. */
  progress: number;
  showDimensions: boolean;
  showCompanyTitle: boolean;
}

/** Per-part render state at a given timeline time — applied imperatively to the mesh. */
export interface PartRenderState {
  visible: boolean;
  /** three-space offset (metres) added to the installed position. */
  offset: Vec3T;
  /** 0..1 opacity multiplier (combined with the part's own base opacity by the renderer). */
  opacity: number;
  /** currently installing → glow. */
  highlight: boolean;
  /** future part shown faint (only when ghostFuture is on). */
  ghost: boolean;
}

/** A cheap, whole-scene sample (camera + caption + progress) — the per-part states are applied
 *  separately in the render loop from the precomputed schedule to avoid per-frame allocation. */
export interface SceneSample {
  timeMs: number;
  progress: number;
  /** -1 during intro; steps.length during outro; else the active step index. */
  stepIndex: number;
  camera: CameraKeyframe;
  caption: CaptionState;
}

/* ----------------------------------------------------------------- export ---------------------- */

export type ExportFormat = "webm" | "png-sequence" | "png-frame";
export type ExportQuality = "standard" | "high" | "maximum";

export interface ExportSettings {
  format: ExportFormat;
  width: number;
  height: number;
  fps: number;
  quality: ExportQuality;
  /** For "png-frame": the timeline ms to capture. Defaults to the hero (final) frame. */
  frameMs?: number;
  /** For a "current frame" PNG: keep the current on-screen (possibly manual) camera instead of the
   *  cinematic auto-camera. Ignored for video / sequence exports, which always use the cinematic camera. */
  keepCamera?: boolean;
}

export interface ExportProgress {
  phase: "preparing" | "rendering" | "encoding" | "finalizing" | "done" | "cancelled" | "error";
  frame: number;
  totalFrames: number;
  /** 0..100. */
  percent: number;
  message?: string;
}

export interface ExportResult {
  format: ExportFormat;
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  frames: number;
  sizeBytes: number;
  mimeType: string;
}
