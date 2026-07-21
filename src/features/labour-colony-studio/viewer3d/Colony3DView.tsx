"use client";

/**
 * LABOUR COLONY STUDIO — Tekla-style 3D viewer (the R3F scene).
 *
 * Renders the shared ColonyModel as procedural geometry: every ColonyPart is an oriented box
 * (columns / beams / joists / plates / bolts …) except the sloped roof / rafter / stair-flight
 * planes, which render as a two-triangle quad. Structural members carry sharp <Edges> for the
 * fabrication look. Interaction mirrors the cabin viewer, adapted to colony METRES (there is NO
 * mm→m divide — colony coordinates are already metres; the mm→three transform lives entirely in
 * partGeometry, which this file re-uses via boxOfSolid / quadOfSolid / toScene / explodeOffset).
 *
 * Features: orbit / pan / zoom (OrbitControls, damping OFF), click-to-select (raycast → part id)
 * with hover highlight + cursor, four render modes (solid / wireframe / x-ray / hidden-line),
 * a uniform explode slider (0..1) applying each part's explode vector, an axis clip-plane section
 * cut (localClippingEnabled), a two-click measure with an Html distance label, optional part-mark
 * labels, and a camera-preset rig (front/rear/left/right/top/iso). Connection-detail hardware
 * (base plates, gussets, cleats, bolts, nuts, washers, welds) is gated OFF for performance unless
 * the fabrication-detail flag is on or its connection group is selected.
 *
 * frameloop="demand": the canvas repaints only on a React re-render (prop / camera change) or a
 * pointer event — no idle rAF, so a static scene costs nothing.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line, Edges, Sky } from "@react-three/drei";
import * as THREE from "three";
import type {
  ColonyModel, ColonyPart, ColonyPartKind, ColonyPartLayer, ViewMode,
} from "@/features/labour-colony-studio/model/types";
import { CONNECTION_DETAIL } from "@/features/labour-colony-studio/model/assembly";
import { resolvePartColor, type ColonyPalette } from "@/features/labour-colony-studio/model/palette";
import { buildExplodedExplanation, type ExplodedExplanation } from "./explodedAnnotations";
import {
  boxOfSolid, explodeOffset, quadOfSolid, sceneCtxOf, MIN_VIS_M, type SceneCtx,
} from "./partGeometry";

export type CameraPreset = "front" | "rear" | "left" | "right" | "top" | "iso";
export type RenderMode = "solid" | "wireframe" | "xray" | "hidden-line";
export type SectionAxis = "x" | "y" | "z";

export interface ColonyView3DSettings {
  /** Coarse layers whose parts are hidden. */
  hiddenLayers: Set<ColonyPartLayer>;
  /** Specific kinds hidden by the kind-group toggles. */
  hiddenKinds: Set<ColonyPartKind>;
  /**
   * Storeys hidden by the floor toggles (-1 = foundation, 0 = ground, 1 = first …). Lets an engineer
   * isolate a single storey — e.g. ground-floor-only vs first-floor-only truss and framing views.
   * Parts with no floor (roof steel, envelope spanning the building) are never hidden by this filter.
   */
  hiddenFloors: Set<number>;
  /** engineering shows everything; customer hides engineering-only parts (viewMask). */
  viewMode: ViewMode;
  renderMode: RenderMode;
  /** Uniform explode 0 (assembled) … 1 (fully separated). */
  explode: number;
  /** Show the heavy connection-detail hardware (base plates, bolts, gussets, welds …). */
  showConnectionDetail: boolean;
  /** Clip-plane section cut across one axis. */
  section: { enabled: boolean; axis: SectionAxis; position: number };
  /** Overlay fabrication part-mark labels on structural members. */
  showPartMarks: boolean;
  /**
   * Overlay the EXPLANATION layer — leader-line callouts and dimension runs that say what each key
   * member is for, how the load leaves it, and what the spacing and bearing measure. Independent of
   * `showPartMarks`: a mark tells you the piece number, a callout tells you why the piece exists.
   */
  showAnnotations: boolean;
  /**
   * Per-colour-group overrides. Resolved through `resolvePartColor` so the SAME colour a group is
   * given here also appears in the exploded view, the assembly video and every exported frame —
   * there is one resolver and every surface calls it. Undefined ⇒ the model's own engineering colours.
   */
  palette?: ColonyPalette | null;
  /** Higher device-pixel-ratio ceiling for crisper (heavier) rendering. */
  hd: boolean;
}

interface Colony3DViewProps {
  model: ColonyModel;
  settings: ColonyView3DSettings;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  /** Preset + a monotonically-increasing nonce so re-clicking the same preset still fires. */
  preset: { view: CameraPreset; nonce: number };
  /** When true, clicking two parts measures the distance between them instead of selecting. */
  measureMode?: boolean;
  /** Receives a capture() that returns a PNG data URL of the current frame. */
  onCaptureReady?: (capture: () => string | null) => void;
}

/** How far a fully-exploded part travels, scaled by its per-kind explode vector (colony metres). */
const SEP_GAP_M = 2.4;

/** Format a length in metres for the measure / label tags. */
function metricLen(m: number): string {
  if (m < 1) return `${Math.round(m * 1000)} mm`;
  return `${m.toFixed(2)} m`;
}

/** true ⇒ this part is currently drawn (layer on, kind on, mode allows it, detail gate passes). */
function isVisible(
  part: ColonyPart,
  s: ColonyView3DSettings,
  selectedId: string | null,
  selectedConnId: string | null,
): boolean {
  if (s.hiddenLayers.has(part.layer)) return false;
  if (s.hiddenKinds.has(part.kind)) return false;
  if (part.floor != null && s.hiddenFloors.has(part.floor)) return false;
  if (s.viewMode === "customer" && !part.viewMask.includes("customer")) return false;
  // Connection hardware is heavy → only render when the detail flag is on, the part itself is
  // selected, or a sibling in the same connection group is selected.
  if (CONNECTION_DETAIL.has(part.kind)) {
    if (s.showConnectionDetail) return true;
    if (selectedId && part.id === selectedId) return true;
    if (selectedConnId && part.connectionId === selectedConnId) return true;
    return false;
  }
  return true;
}

function opacityOf(part: ColonyPart, mode: RenderMode): number {
  const base = part.opacity ?? 1;
  if (mode === "xray") {
    const structural = part.layer === "structure" || part.layer === "foundation" || part.layer === "connection";
    return Math.min(base, structural ? 0.5 : 0.22);
  }
  if (mode === "hidden-line") return 0.16;
  return base; // solid / wireframe
}

/** Thin parts sitting ON a wall / floor / ceiling plane — a small polygon offset stops z-fighting. */
const OVERLAY_KINDS = new Set<ColonyPartKind>([
  "door", "door-swing", "window", "socket", "light", "fan", "db", "plumbing-fixture", "pipe",
]);

/** Layers whose members get sharp edges for the Tekla look. */
const EDGE_LAYERS = new Set<ColonyPartLayer>([
  "foundation", "structure", "connection", "stair", "roof",
]);

/* ------------------------------------------------------------------ one part ------------------ */

const PartMesh = memo(function PartMesh({
  part, ctx, settings, selected, hovered, clip, onSelect, onHover,
}: {
  part: ColonyPart; ctx: SceneCtx; settings: ColonyView3DSettings;
  selected: boolean; hovered: boolean; clip: THREE.Plane[];
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
}) {
  const mode = settings.renderMode;
  const offset = explodeOffset(part, settings.explode, SEP_GAP_M);
  const opacity = opacityOf(part, mode);
  const wireframe = mode === "wireframe";
  const transparent = !wireframe && (opacity < 1 || mode === "xray" || mode === "hidden-line");
  const color = selected ? "#f59e0b" : resolvePartColor(part, settings.palette);
  const emissive = selected ? "#7c3a00" : hovered ? "#334155" : "#000000";
  const overlay = OVERLAY_KINDS.has(part.kind);
  const showEdges = !wireframe && (mode === "hidden-line" || EDGE_LAYERS.has(part.layer));
  const edgeColor = selected ? "#f59e0b" : mode === "hidden-line" ? "#334155" : "#0f172a";

  const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { stop(e); onSelect(part.id); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { stop(e); onHover(part.id); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { onHover(null); document.body.style.cursor = "auto"; },
  };

  // sloped roof / rafter / stair-soffit plane → a double-sided quad.
  // quadOfSolid maps solid.pts, so it returns a FRESH array every call — it must be computed inside
  // the memo and keyed on the stable (part.solid, ctx) identities, otherwise the geometry would be
  // rebuilt (and the old one disposed) on every render, e.g. 60×/s while dragging Explode/Section.
  const geo = useMemo(() => {
    const quad = quadOfSolid(part.solid, ctx);
    if (!quad) return null;
    const g = new THREE.BufferGeometry();
    const [a, b, c, d] = quad;
    const pos = new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [part.solid, ctx]);
  useEffect(() => () => geo?.dispose(), [geo]);

  if (geo) {
    return (
      <mesh geometry={geo} position={offset} {...handlers}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.3}
          side={THREE.DoubleSide} transparent={transparent} opacity={opacity} roughness={0.85} metalness={0.05}
          wireframe={wireframe} depthWrite={!transparent} clippingPlanes={clip} clipShadows
          polygonOffset={overlay} polygonOffsetFactor={overlay ? -2 : 0} polygonOffsetUnits={overlay ? -2 : 0} />
        {showEdges && <Edges threshold={18} color={edgeColor} />}
      </mesh>
    );
  }

  const b = boxOfSolid(part.solid, ctx);
  if (!b) return null;
  // Clamp each side to MIN_VIS_M so thin plates / bolts / welds stay visible + pickable.
  const size: [number, number, number] = [
    Math.max(b.size[0], MIN_VIS_M),
    Math.max(b.size[1], MIN_VIS_M),
    Math.max(b.size[2], MIN_VIS_M),
  ];
  return (
    <mesh
      position={[b.center[0] + offset[0], b.center[1] + offset[1], b.center[2] + offset[2]]}
      scale={size}
      castShadow={part.layer === "structure" || part.layer === "foundation"}
      {...handlers}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.32}
        transparent={transparent} opacity={opacity} roughness={0.82} metalness={0.08}
        wireframe={wireframe} depthWrite={!transparent} clippingPlanes={clip} clipShadows
        polygonOffset={overlay} polygonOffsetFactor={overlay ? -2 : 0} polygonOffsetUnits={overlay ? -2 : 0} />
      {showEdges && <Edges threshold={15} color={edgeColor} />}
    </mesh>
  );
});

/* ------------------------------------------------------------------ part-mark labels ---------- */

/**
 * Fabrication part marks floating on their members.
 *
 * The mark must travel with its part: it carries the SAME explode offset the mesh does (and falls
 * back to a quad's centroid the way the callout layer below does), otherwise a mark stays welded to
 * the assembled position and, as the explode slider opens, ends up labelling empty space — or worse,
 * sitting over a different member and mis-identifying it to the fabricator.
 */
const PartMarkLabels = memo(function PartMarkLabels({
  parts, ctx, settings,
}: { parts: ColonyPart[]; ctx: SceneCtx; settings: ColonyView3DSettings }) {
  return (
    <>
      {parts.map((p) => {
        const b = boxOfSolid(p.solid, ctx);
        const base = b ? b.center : quadCentre(p, ctx);
        if (!base) return null;
        const off = explodeOffset(p, settings.explode, SEP_GAP_M);
        return (
          <Html
            key={`mark-${p.id}`}
            position={[base[0] + off[0], base[1] + off[1], base[2] + off[2]]}
            center
            distanceFactor={12}
            occlude={false}
          >
            <div style={{ background: "#0f172a", color: "#fff", fontSize: 9, padding: "0 4px", borderRadius: 3, whiteSpace: "nowrap", pointerEvents: "none" }}>
              {p.partMark}
            </div>
          </Html>
        );
      })}
    </>
  );
});

/* ------------------------------------------------------------------ explanation layer --------- */

/**
 * Leader-line callouts + dimension runs that explain the exploded model.
 *
 * Positions are resolved HERE, not in the pure builder, because each anchor must carry the same
 * explode offset its part does — otherwise every label would stay welded to the assembled position
 * and drift away from the member it describes as the slider opens.
 */
const ExplodedExplanationLayer = memo(function ExplodedExplanationLayer({
  explanation, partIndex, ctx, settings, radius,
}: {
  explanation: ExplodedExplanation;
  partIndex: Map<string, ColonyPart>;
  ctx: SceneCtx;
  settings: ColonyView3DSettings;
  radius: number;
}) {
  const anchorOf = (partId: string): [number, number, number] | null => {
    const part = partIndex.get(partId);
    if (!part) return null;
    const b = boxOfSolid(part.solid, ctx);
    const base = b ? b.center : quadCentre(part, ctx);
    if (!base) return null;
    const off = explodeOffset(part, settings.explode, SEP_GAP_M);
    return [base[0] + off[0], base[1] + off[1], base[2] + off[2]];
  };

  return (
    <>
      {explanation.annotations.map((a) => {
        const anchor = anchorOf(a.partId);
        if (!anchor) return null;
        const d = radius * a.distR;
        const label: [number, number, number] = [
          anchor[0] + a.dir[0] * d, anchor[1] + a.dir[1] * d, anchor[2] + a.dir[2] * d,
        ];
        return (
          <group key={a.id}>
            {/* leader line + a dot on the member it points at */}
            <Line points={[anchor, label]} color={a.accent} lineWidth={1.4} dashed dashSize={0.12} gapSize={0.08} />
            <mesh position={anchor}>
              <sphereGeometry args={[Math.max(MIN_VIS_M, radius * 0.012), 10, 10]} />
              <meshBasicMaterial color={a.accent} />
            </mesh>
            <Html position={label} center={false} distanceFactor={radius * 1.1} occlude={false} zIndexRange={[20, 0]}>
              <div
                style={{
                  background: "rgba(255,255,255,0.96)", border: `1.5px solid ${a.accent}`,
                  borderRadius: 6, padding: "5px 8px", minWidth: 190, maxWidth: 300,
                  boxShadow: "0 2px 8px rgba(15,23,42,0.18)", pointerEvents: "none",
                  fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                <div style={{ color: a.accent, fontWeight: 800, fontSize: 9.5, letterSpacing: 0.2, marginBottom: 2 }}>
                  {a.title}
                </div>
                {a.lines.map((ln, i) => (
                  <div key={i} style={{ color: "#0f172a", fontSize: 8.4, lineHeight: 1.32, whiteSpace: "pre" }}>{ln}</div>
                ))}
              </div>
            </Html>
          </group>
        );
      })}

      {explanation.dimensions.map((dm) => {
        const a = anchorOf(dm.fromPartId);
        const b = anchorOf(dm.toPartId);
        if (!a || !b) return null;
        const d = radius * dm.distR;
        const off: [number, number, number] = [dm.dir[0] * d, dm.dir[1] * d, dm.dir[2] * d];
        const a2: [number, number, number] = [a[0] + off[0], a[1] + off[1], a[2] + off[2]];
        const b2: [number, number, number] = [b[0] + off[0], b[1] + off[1], b[2] + off[2]];
        const mid: [number, number, number] = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2, (a2[2] + b2[2]) / 2];
        return (
          <group key={dm.id}>
            {/* witness lines from each member down to the dimension line, then the run itself */}
            <Line points={[a, a2]} color={dm.accent} lineWidth={1} dashed dashSize={0.08} gapSize={0.06} />
            <Line points={[b, b2]} color={dm.accent} lineWidth={1} dashed dashSize={0.08} gapSize={0.06} />
            <Line points={[a2, b2]} color={dm.accent} lineWidth={2} />
            <Html position={mid} center distanceFactor={radius * 1.1} occlude={false} zIndexRange={[20, 0]}>
              <div
                style={{
                  background: dm.accent, color: "#fff", borderRadius: 4, padding: "2px 6px",
                  textAlign: "center", pointerEvents: "none", fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>{dm.text}</div>
                {dm.note && <div style={{ fontSize: 8, opacity: 0.95, whiteSpace: "nowrap" }}>{dm.note}</div>}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
});

/** Centre of a sloped-quad part (the only solid `boxOfSolid` cannot reduce). */
function quadCentre(part: ColonyPart, ctx: SceneCtx): [number, number, number] | null {
  const q = quadOfSolid(part.solid, ctx);
  if (!q || q.length !== 4) return null;
  return [
    q.reduce((a, p) => a + p[0], 0) / 4,
    q.reduce((a, p) => a + p[1], 0) / 4,
    q.reduce((a, p) => a + p[2], 0) / 4,
  ];
}

/* ------------------------------------------------------------------ site backdrop ------------- */

/** Horizon / haze colour shared by the fog, the ground's far edge and the canvas clear colour. */
const HAZE = "#dbe7f2";

/**
 * The realistic site ground — a big grass disc whose colour runs from turf at the centre to the
 * fog's haze at the rim, so the ground dissolves into the horizon instead of ending at a hard edge.
 *
 * The texture is a locally-generated canvas gradient with a little mottling: nothing is fetched
 * (the viewer must work offline and the CSP-free export must stay self-contained), and the same
 * backdrop therefore appears in the captured PNG. Client-only by construction — this component
 * renders inside <Canvas>, which never runs on the server.
 */
function SiteGround({ radius }: { radius: number }) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    if (!g) return null;
    const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, "#93a678");
    grad.addColorStop(0.45, "#9cad82");
    grad.addColorStop(0.78, "#b7c2a4");
    grad.addColorStop(1, HAZE);
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    // faint mottling so the ground reads as turf rather than flat paint
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.hypot(x - 256, y - 256);
      if (r > 240) continue; // keep the hazy rim clean
      g.fillStyle = Math.random() > 0.5 ? "rgba(120,140,95,0.12)" : "rgba(160,175,130,0.12)";
      g.beginPath();
      g.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
      <circleGeometry args={[radius * 20, 96]} />
      {texture
        ? <meshStandardMaterial map={texture} roughness={1} metalness={0} />
        : <meshStandardMaterial color="#9cad82" roughness={1} metalness={0} />}
    </mesh>
  );
}

/* ------------------------------------------------------------------ camera + capture ---------- */

function CaptureBridge({ onReady }: { onReady?: (capture: () => string | null) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!onReady) return;
    onReady(() => {
      try { gl.render(scene, camera); return gl.domElement.toDataURL("image/png"); }
      catch { return null; }
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

function CameraRig({ preset, radius, controls }: {
  preset: { view: CameraPreset; nonce: number };
  radius: number;
  controls: React.MutableRefObject<React.ComponentRef<typeof OrbitControls> | null>;
}) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const r = radius * 2.2;
    const pos: Record<CameraPreset, [number, number, number]> = {
      front: [0, radius * 0.5, r],
      rear: [0, radius * 0.5, -r],
      left: [-r, radius * 0.5, 0],
      right: [r, radius * 0.5, 0],
      top: [0.001, r * 1.1, 0],
      iso: [r * 0.72, r * 0.62, r * 0.72],
    };
    const [x, y, z] = pos[preset.view];
    camera.position.set(x, y, z);
    camera.lookAt(0, radius * 0.25, 0);
    const c = controls.current;
    if (c) { c.target.set(0, radius * 0.25, 0); c.update(); }
    invalidate();
  }, [preset.nonce, preset.view, radius, camera, controls, invalidate]);
  return null;
}

/* ------------------------------------------------------------------ the view ------------------ */

const EMPTY_PLANES: THREE.Plane[] = [];

export function Colony3DView(props: Colony3DViewProps) {
  const { model, settings, selectedId, hoveredId, onSelect, onHover, preset, measureMode } = props;
  const ctx = useMemo(() => sceneCtxOf(model), [model]);
  const controls = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);

  const b = model.bounds;
  const dx = b.max.x - b.min.x, dy = b.max.y - b.min.y, dz = b.max.z - b.min.z;
  const radius = useMemo(() => Math.max(2, Math.hypot(dx, dy, dz) / 2), [dx, dy, dz]);

  // The selected part's connection group — used to reveal only its gated hardware.
  const selectedConnId = useMemo(() => {
    if (!selectedId) return null;
    const p = model.parts.find((x) => x.id === selectedId);
    return p?.connectionId ?? null;
  }, [model, selectedId]);

  const parts = useMemo(
    () => model.parts.filter((p) => isVisible(p, settings, selectedId, selectedConnId)),
    [model, settings, selectedId, selectedConnId],
  );

  const markParts = useMemo(
    () => (settings.showPartMarks
      // `connection` is included so splice plates, bolts, nuts and welds carry their fabrication
      // marks in the exploded view — that detailing is the whole point of turning part marks on.
      ? parts.filter((p) => !!p.partMark
          && (p.layer === "structure" || p.layer === "foundation" || p.layer === "roof" || p.layer === "connection"))
      : []),
    [parts, settings.showPartMarks],
  );

  /* The explanation layer is derived from the WHOLE model, not the filtered `parts`, so a callout
   * survives its anchor being hidden by a layer toggle — it simply resolves no position and skips.
   * Indexed once so each annotation is an O(1) lookup rather than a scan of a few thousand parts. */
  const explanation = useMemo(() => buildExplodedExplanation(model), [model]);
  const partIndex = useMemo(() => {
    const m = new Map<string, ColonyPart>();
    for (const p of parts) m.set(p.id, p);
    return m;
  }, [parts]);

  // Section clipping plane along the chosen axis (three-space). The plane's constant is set INSIDE
  // the memo (never mutated during render); the array reference stays stable while off so
  // React.memo(PartMesh) is not defeated on hover.
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const clip = useMemo(() => {
    if (!settings.section.enabled) return EMPTY_PLANES;
    const pos = settings.section.position;
    // three axes: x = length, y = height, z = width. Height is not centred (ground z=0 → three.y).
    let normal: THREE.Vector3, half: number, centre: number;
    if (settings.section.axis === "x") { normal = new THREE.Vector3(-1, 0, 0); half = dx / 2; centre = 0; }
    else if (settings.section.axis === "y") { normal = new THREE.Vector3(0, -1, 0); half = dz / 2; centre = (b.min.z + b.max.z) / 2; }
    else { normal = new THREE.Vector3(0, 0, -1); half = dy / 2; centre = 0; }
    clipPlane.normal.copy(normal);
    clipPlane.constant = centre - half + pos * (2 * half) + half * 0.0001;
    return [clipPlane];
  }, [settings.section.enabled, settings.section.axis, settings.section.position, clipPlane, dx, dy, dz, b.min.z, b.max.z]);

  // measurement: two clicked part centres (three coords). Cleared when measure mode toggles or the
  // model changes (stale points would render a line at the wrong place).
  const [measurePts, setMeasurePts] = useState<[number, number, number][]>([]);
  useEffect(() => { setMeasurePts([]); }, [measureMode, model]);

  // Stable across renders so it does not defeat React.memo(PartMesh).
  const handleSelect = useCallback((id: string | null) => {
    if (measureMode && id) {
      const part = model.parts.find((p) => p.id === id);
      const box = part && boxOfSolid(part.solid, ctx);
      if (box) setMeasurePts((prev) => (prev.length >= 2 ? [box.center] : [...prev, box.center]));
      return;
    }
    onSelect(id);
  }, [measureMode, model, ctx, onSelect]);

  /* Presentation modes (solid / x-ray) get the realistic site backdrop — procedural sky, grass
   * ground and distance haze. The drafting modes (wireframe / hidden-line) keep the flat paper-grey
   * background, because a technical linework view over a landscape reads as noise. */
  const realistic = settings.renderMode === "solid" || settings.renderMode === "xray";

  const measureM = measurePts.length === 2
    ? Math.hypot(
        measurePts[0][0] - measurePts[1][0],
        measurePts[0][1] - measurePts[1][1],
        measurePts[0][2] - measurePts[1][2],
      )
    : 0;

  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={settings.hd ? [1, 2.75] : settings.renderMode === "wireframe" ? [1, 1.5] : [1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      camera={{ position: [radius * 1.6, radius * 1.4, radius * 1.6], fov: 42, near: 0.05, far: radius * 40 }}
      onPointerMissed={() => !measureMode && onSelect(null)}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={[realistic ? HAZE : "#eef2f7"]} />
      {realistic && <fog attach="fog" args={[HAZE, radius * 7, radius * 26]} />}
      {realistic && (
        /* Procedural atmosphere — no HDRI, nothing fetched. The sun sits on the key light's axis so
         * the sky's bright quadrant and the cast shadows agree. Distance kept inside the camera's
         * far plane (radius * 40) or the sky sphere itself would be clipped. */
        <Sky
          distance={radius * 32}
          sunPosition={[radius * 3, radius * 5, radius * 2]}
          turbidity={5.5}
          rayleigh={1.1}
          mieCoefficient={0.004}
          mieDirectionalG={0.85}
        />
      )}
      <hemisphereLight args={realistic ? ["#eaf3ff", "#8f9c7d", 0.85] : ["#ffffff", "#cbd5e1", 0.9]} />
      <ambientLight intensity={realistic ? 0.32 : 0.4} />
      <directionalLight position={[radius * 3, radius * 5, radius * 2]} intensity={1.3} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-radius * 2} shadow-camera-right={radius * 2}
        shadow-camera-top={radius * 2} shadow-camera-bottom={-radius * 2}
        shadow-camera-near={0.5} shadow-camera-far={radius * 12} />
      <directionalLight position={[-radius * 3, radius * 3, -radius * 2]} intensity={0.45} />

      {realistic && <SiteGround radius={radius} />}
      {!realistic && (
        <Grid
          args={[radius * 8, radius * 8]}
          cellSize={1} cellThickness={0.6} cellColor="#cbd5e1"
          sectionSize={5} sectionThickness={1} sectionColor="#94a3b8"
          position={[0, -0.002, 0]} infiniteGrid fadeDistance={radius * 14} fadeStrength={1.5}
        />
      )}

      {parts.map((p) => (
        <PartMesh
          key={p.id} part={p} ctx={ctx} settings={settings} clip={clip}
          selected={p.id === selectedId} hovered={p.id === hoveredId}
          onSelect={handleSelect} onHover={onHover}
        />
      ))}

      {markParts.length > 0 && <PartMarkLabels parts={markParts} ctx={ctx} settings={settings} />}

      {settings.showAnnotations && (
        <ExplodedExplanationLayer
          explanation={explanation} partIndex={partIndex} ctx={ctx} settings={settings} radius={radius}
        />
      )}

      {/* measurement */}
      {measurePts.map((pt, i) => (
        <mesh key={`mp-${i}`} position={pt}>
          <sphereGeometry args={[Math.max(MIN_VIS_M, radius * 0.02), 12, 12]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
      ))}
      {measurePts.length === 2 && (
        <>
          <Line points={measurePts} color="#dc2626" lineWidth={2} />
          <Html
            position={[(measurePts[0][0] + measurePts[1][0]) / 2, (measurePts[0][1] + measurePts[1][1]) / 2, (measurePts[0][2] + measurePts[1][2]) / 2]}
            center
          >
            <div style={{ background: "#dc2626", color: "#fff", fontSize: 11, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
              {metricLen(measureM)}
            </div>
          </Html>
        </>
      )}

      <OrbitControls ref={controls} makeDefault enableDamping={false}
        minDistance={radius * 0.4} maxDistance={radius * 12} target={[0, radius * 0.25, 0]} />
      <CameraRig preset={preset} radius={radius} controls={controls} />
      <CaptureBridge onReady={props.onCaptureReady} />
    </Canvas>
  );
}
