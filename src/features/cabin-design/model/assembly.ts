/**
 * SHARED CABIN DESIGN MODEL — assembly sequence (spec §3).
 *
 * The canonical 17-step build order, the human copy for the exploded-animation readout, and the
 * per-kind mapping (which construction step + which explode direction each part family uses). The
 * exploded view reveals parts up to the current step and slides each one along its explode vector,
 * scaled by the animation's separation gap.
 */

import type { AssemblyStep, AssemblyStepInfo, PartKind, Vec3 } from "./types";

/** The 17-step timeline, in build order (spec §3). Step 17 = the collapsed, completed cabin. */
export const ASSEMBLY_SEQUENCE: AssemblyStepInfo[] = [
  { step: 1, title: "Bottom structural frame", description: "The base chassis — longitudinal and cross members that carry the cabin." },
  { step: 2, title: "Base frame & cross-stiffeners", description: "Transverse base-frame stiffeners between the longitudinal members at the joist spacing." },
  { step: 3, title: "Floor board & final flooring", description: "Structural deck board and the finished floor over it." },
  { step: 4, title: "Corner columns", description: "The four corner posts that set the cabin height." },
  { step: 5, title: "Wall framing & stiffeners", description: "Intermediate posts, wall studs and top/bottom framing rails." },
  { step: 6, title: "External wall sheets / panels", description: "The outer skin — profiled sheet or PUF panel — on every wall." },
  { step: 7, title: "Insulation", description: "Wall and roof/ceiling insulation, where specified." },
  { step: 8, title: "Internal wall finish", description: "The inner lining over the framing." },
  { step: 9, title: "Partition walls", description: "Internal partitions that split the cabin into rooms." },
  { step: 10, title: "Doors & windows", description: "Door leaves and window units set into their openings." },
  { step: 11, title: "Roof frame", description: "Top frame, trusses/rafters and purlins." },
  { step: 12, title: "Roof sheets / PUF roof panels", description: "The weatherproof roof covering." },
  { step: 13, title: "Ceiling", description: "The internal ceiling lining." },
  { step: 14, title: "Electrical fittings", description: "Lights, fans, sockets, switches and the distribution board." },
  { step: 15, title: "Plumbing fittings", description: "Wet fixtures and supply/soil pipework, where specified." },
  { step: 16, title: "Furniture & accessories", description: "Workstations, storage and loose furniture." },
  { step: 17, title: "Completed cabin", description: "Every component assembled in its final position." },
];

/** Which construction step each part family belongs to. */
export const STEP_OF_KIND: Record<PartKind, AssemblyStep> = {
  "base-frame": 1,
  joist: 2,
  "floor-board": 3,
  "floor-finish": 3,
  column: 4,
  stud: 5,
  rail: 5,
  "mdf-support": 5,
  "ext-panel": 6,
  insulation: 7,
  "int-finish": 8,
  partition: 9,
  door: 10,
  "door-swing": 10,
  window: 10,
  "roof-frame": 11,
  "gusset-plate": 11,
  fastener: 11,
  "lifting-hook": 11,
  "roof-sheet": 12,
  ceiling: 13,
  light: 14,
  fan: 14,
  socket: 14,
  switch: 14,
  "electrical-panel": 14,
  "plumbing-fixture": 15,
  pipe: 15,
  furniture: 16,
  toilet: 16,
  pantry: 16,
};

/**
 * The unit direction a part family flies out in the exploded view. The renderer multiplies this by
 * the separation gap, so magnitude here only encodes RELATIVE travel (foundations sink, roof lifts,
 * walls fan outward, fit-out lifts clear). Wall/opening parts get a face-specific vector at build
 * time (see cabinModel.ts); these are the family defaults.
 */
export const EXPLODE_OF_KIND: Record<PartKind, Vec3> = {
  "base-frame": { x: 0, y: 0, z: -1.6 },
  joist: { x: 0, y: 0, z: -1.1 },
  "floor-board": { x: 0, y: 0, z: -0.5 },
  "floor-finish": { x: 0, y: 0, z: -0.2 },
  column: { x: 0, y: 0, z: 0.4 },
  stud: { x: 0, y: 0, z: 0.6 },
  rail: { x: 0, y: 0, z: 0.6 },
  "mdf-support": { x: 0, y: 0, z: 0.7 },   // overridden per-face (fans inward toward the room)
  "ext-panel": { x: 0, y: 0, z: 0 },      // overridden per-face
  insulation: { x: 0, y: 0, z: 0 },        // overridden per-face
  "int-finish": { x: 0, y: 0, z: 0 },      // overridden per-face
  partition: { x: 0, y: 0, z: 0.9 },
  door: { x: 0, y: 0, z: 0 },              // overridden per-face
  "door-swing": { x: 0, y: 0, z: 0 },
  window: { x: 0, y: 0, z: 0 },            // overridden per-face
  "roof-frame": { x: 0, y: 0, z: 2.2 },
  "gusset-plate": { x: 0, y: 0, z: 2.5 },
  fastener: { x: 0, y: 0, z: 3.0 },
  "lifting-hook": { x: 0, y: 0, z: 2.6 },
  "roof-sheet": { x: 0, y: 0, z: 2.9 },
  ceiling: { x: 0, y: 0, z: 1.9 },
  light: { x: 0, y: 0, z: 1.4 },
  fan: { x: 0, y: 0, z: 1.4 },
  socket: { x: 0, y: 0, z: 0 },            // overridden per-face
  switch: { x: 0, y: 0, z: 0 },            // overridden per-face
  "electrical-panel": { x: 0, y: 0, z: 0.3 },
  "plumbing-fixture": { x: 0, y: 0, z: -0.3 },
  pipe: { x: 0, y: 0, z: -0.3 },
  furniture: { x: 0, y: 0, z: 0.8 },
  toilet: { x: 0, y: 0, z: 0.7 },
  pantry: { x: 0, y: 0, z: 0.7 },
};
