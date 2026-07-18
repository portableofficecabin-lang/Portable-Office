"use client";

/**
 * 3D viewer — the R3F scene (spec §2 + §3).
 *
 * Renders the shared CabinModel as procedural geometry: every part is an oriented box (all cabin
 * prisms are rectangles) except the sloped roof planes, which are two-triangle quads. Interaction:
 * orbit (rotate) / pan / zoom via OrbitControls, click-to-select (raycast → part id) with a hover
 * highlight, per-part explode offsets for the assembly animation, and a camera-preset rig for the
 * six standard views + isometric + reset.
 *
 * frameloop="demand": the canvas only repaints when React re-renders (a prop or camera change) or a
 * pointer event fires — no idle rAF, so it does not drain battery/CPU when static. The parent drives
 * the exploded animation by stepping `explodeT`, which re-renders and paints one frame each tick.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { CabinModel, CabinPart, PartLayer, ViewMode } from "@/features/cabin-design/model/types";
import { boxOfSolid, explodeOffset, quadOfSolid, sceneCtxOf, type SceneCtx } from "./partGeometry";

export type CameraPreset = "front" | "rear" | "left" | "right" | "top" | "iso";

export interface View3DSettings {
  layers: Record<PartLayer, boolean>;
  transparentWalls: boolean;
  viewMode: ViewMode;
  /** The exploded/assembly overlay. When inactive the cabin shows fully assembled. */
  assembly: {
    active: boolean;
    /** "explode" = uniform pull-apart slider; "assembly" = staggered build-up animation. */
    mode: "assembly" | "explode";
    /** assembly mode: parts with assemblyStep ≤ revealStep are shown. */
    revealStep: number;
    /** 0 = settled … 1 = fully separated. In assembly mode this is the CURRENT step's separation. */
    stepT: number;
  };
  /** Render every part as edges only. */
  wireframe: boolean;
  /** See-through everything (ghost) to read the interior. */
  xray: boolean;
  /** A clipping plane across the width to cut the model open. */
  section: { enabled: boolean; position: number };
  /** Overlay overall L / W / H dimension labels. */
  showDimensions: boolean;
}

interface Cabin3DViewProps {
  model: CabinModel;
  settings: View3DSettings;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  /** Preset + a monotonically-increasing nonce so re-clicking the same preset still fires. */
  preset: { view: CameraPreset; nonce: number };
  /** Receives a capture() that returns a PNG data URL of the current frame (spec §8). */
  onCaptureReady?: (capture: () => string | null) => void;
  /** When true, clicking two parts measures the distance between them instead of selecting. */
  measureMode?: boolean;
}

/** mm → feet-inches, for the measurement/dimension labels. */
function ftIn(mm: number): string {
  const totalIn = Math.round((mm / 304.8) * 12);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return `${ft}′-${inch}″`;
}

const SEP_GAP_M = 2.4; // how far a fully-exploded part travels, scaled by its explode vector

/** true ⇒ this part is currently drawn (layer on, mode allows it, revealed at this build step). */
function isVisible(part: CabinPart, s: View3DSettings): boolean {
  if (!s.layers[part.layer]) return false;
  if (s.viewMode === "customer" && !part.viewMask.includes("customer")) return false;
  if (s.assembly.active && s.assembly.mode === "assembly" && part.assemblyStep > s.assembly.revealStep) return false;
  return true;
}

/** The separation fraction for this part, 0 = settled … 1 = fully separated. */
function partSeparation(part: CabinPart, s: View3DSettings): number {
  if (!s.assembly.active) return 0;
  if (s.assembly.mode === "explode") return s.assembly.stepT;
  // assembly: earlier steps already settled; the current step flies in (stepT 1 → 0).
  if (part.assemblyStep < s.assembly.revealStep) return 0;
  return s.assembly.stepT;
}

function opacityOf(part: CabinPart, s: View3DSettings): number {
  const base = part.opacity ?? 1;
  if (s.xray) return Math.min(base, part.layer === "structure" ? 0.5 : 0.22);
  if (s.transparentWalls && (part.layer === "walls" || part.layer === "roof")) {
    return Math.min(base, part.kind === "floor-board" || part.kind === "floor-finish" ? 0.9 : 0.22);
  }
  return base;
}

/* ------------------------------------------------------------------ one part ------------------ */

const PartMesh = memo(function PartMesh({
  part, ctx, settings, selected, hovered, clip, onSelect, onHover,
}: {
  part: CabinPart; ctx: SceneCtx; settings: View3DSettings;
  selected: boolean; hovered: boolean; clip: THREE.Plane[];
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
}) {
  const offset = explodeOffset(part, partSeparation(part, settings), SEP_GAP_M);
  const opacity = opacityOf(part, settings);
  const transparent = opacity < 1 || settings.xray;
  const wireframe = settings.wireframe;
  const color = selected ? "#f59e0b" : part.colorHex;
  const emissive = selected ? "#7c3a00" : hovered ? "#334155" : "#000000";

  const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { stop(e); onSelect(part.id); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { stop(e); onHover(part.id); },
    onPointerOut: () => onHover(null),
  };

  // sloped roof plane → a double-sided quad
  const quad = quadOfSolid(part.solid, ctx);
  const geo = useMemo(() => {
    if (!quad) return null;
    const g = new THREE.BufferGeometry();
    const [a, b, c, d] = quad;
    const pos = new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [quad]);
  useEffect(() => () => geo?.dispose(), [geo]);

  if (geo) {
    return (
      <mesh geometry={geo} position={offset} {...handlers}>
        <meshStandardMaterial color={color} emissive={emissive} side={THREE.DoubleSide}
          transparent={transparent} opacity={opacity} roughness={0.85} metalness={0.05}
          wireframe={wireframe} depthWrite={!transparent} clippingPlanes={clip} clipShadows />
      </mesh>
    );
  }

  const b = boxOfSolid(part.solid, ctx);
  if (!b) return null;
  return (
    <mesh
      position={[b.center[0] + offset[0], b.center[1] + offset[1], b.center[2] + offset[2]]}
      scale={b.size}
      castShadow={part.layer === "structure" || part.layer === "walls"}
      {...handlers}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.35}
        transparent={transparent} opacity={opacity} roughness={0.82} metalness={0.05}
        wireframe={wireframe} depthWrite={!transparent} clippingPlanes={clip} clipShadows />
    </mesh>
  );
});

/* ------------------------------------------------------------------ camera rig ---------------- */

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

export function Cabin3DView(props: Cabin3DViewProps) {
  const { model, settings, selectedId, hoveredId, onSelect, onHover, preset, measureMode } = props;
  const ctx = useMemo(() => sceneCtxOf(model), [model]);
  const controls = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);

  const b = model.bounds;
  const radius = useMemo(
    () => Math.max(2, Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z, b.max.y - b.min.y) / 1000 / 2),
    [b.max.x, b.max.y, b.max.z, b.min.x, b.min.y, b.min.z],
  );

  const parts = useMemo(() => model.parts.filter((p) => isVisible(p, settings)), [model, settings]);

  // section clipping plane, along the width (three z). Position 0..1 slides it through the cabin.
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const halfZ = (b.max.y - b.min.y) / 1000 / 2;
  // The plane's constant is updated INSIDE the memo (never mutated during render), and the array
  // reference stays stable while the section is off so React.memo(PartMesh) is not defeated on hover.
  const clip = useMemo(() => {
    if (!settings.section.enabled) return EMPTY_PLANES;
    clipPlane.constant = -halfZ + settings.section.position * (2 * halfZ) + halfZ * 0.0001;
    return [clipPlane];
  }, [settings.section.enabled, settings.section.position, clipPlane, halfZ]);

  // measurement: two clicked part centres (three coords). Cleared when measure mode toggles AND when
  // the model geometry changes (old points would otherwise render a stale line at the wrong place).
  const [measurePts, setMeasurePts] = useState<[number, number, number][]>([]);
  useEffect(() => { setMeasurePts([]); }, [measureMode, model]);

  // Stable across renders so it does not defeat React.memo(PartMesh) (Phase 8).
  const handleSelect = useCallback((id: string | null) => {
    if (measureMode && id) {
      const part = model.parts.find((p) => p.id === id);
      const box = part && boxOfSolid(part.solid, ctx);
      if (box) setMeasurePts((prev) => (prev.length >= 2 ? [box.center] : [...prev, box.center]));
      return;
    }
    onSelect(id);
  }, [measureMode, model, ctx, onSelect]);

  const measureMm = measurePts.length === 2
    ? Math.hypot(
        measurePts[0][0] - measurePts[1][0],
        measurePts[0][1] - measurePts[1][1],
        measurePts[0][2] - measurePts[1][2],
      ) * 1000
    : 0;

  // overall dimension anchor points (three coords)
  const dimX = (b.max.x - b.min.x), dimY = (b.max.y - b.min.y), dimZ = (b.max.z - b.min.z);

  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={settings.wireframe ? [1, 2] : [1, 3]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      camera={{ position: [radius * 1.6, radius * 1.4, radius * 1.6], fov: 42, near: 0.05, far: radius * 40 }}
      onPointerMissed={() => !measureMode && onSelect(null)}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={["#f1f5f9"]} />
      <hemisphereLight args={["#ffffff", "#cbd5e1", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[radius * 3, radius * 5, radius * 2]} intensity={1.15} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-radius * 3, radius * 3, -radius * 2]} intensity={0.4} />

      <Grid
        args={[radius * 8, radius * 8]}
        cellSize={1} cellThickness={0.6} cellColor="#cbd5e1"
        sectionSize={5} sectionThickness={1} sectionColor="#94a3b8"
        position={[0, -0.002, 0]} infiniteGrid fadeDistance={radius * 14} fadeStrength={1.5}
      />

      {parts.map((p) => (
        <PartMesh
          key={p.id} part={p} ctx={ctx} settings={settings} clip={clip}
          selected={p.id === selectedId} hovered={p.id === hoveredId}
          onSelect={handleSelect} onHover={onHover}
        />
      ))}

      {/* measurement */}
      {measurePts.map((pt, i) => (
        <mesh key={`mp-${i}`} position={pt}><sphereGeometry args={[radius * 0.02, 12, 12]} /><meshBasicMaterial color="#dc2626" /></mesh>
      ))}
      {measurePts.length === 2 && (
        <>
          <Line points={measurePts} color="#dc2626" lineWidth={2} />
          <Html position={[(measurePts[0][0] + measurePts[1][0]) / 2, (measurePts[0][1] + measurePts[1][1]) / 2, (measurePts[0][2] + measurePts[1][2]) / 2]} center>
            <div style={{ background: "#dc2626", color: "#fff", fontSize: 11, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{ftIn(measureMm)}</div>
          </Html>
        </>
      )}

      {/* overall dimension labels */}
      {settings.showDimensions && (
        <>
          <Html position={[0, -0.05, dimZ / 1000 / 2 + 0.3]} center><DimTag>{ftIn(dimX)}</DimTag></Html>
          <Html position={[dimX / 1000 / 2 + 0.3, -0.05, 0]} center><DimTag>{ftIn(dimY)}</DimTag></Html>
          <Html position={[-dimX / 1000 / 2 - 0.3, dimZ / 1000 / 2, 0]} center><DimTag>H {ftIn(model.meta.heightFt * 304.8)}</DimTag></Html>
        </>
      )}

      <OrbitControls ref={controls} makeDefault enableDamping={false}
        minDistance={radius * 0.4} maxDistance={radius * 12} target={[0, radius * 0.25, 0]} />
      <CameraRig preset={preset} radius={radius} controls={controls} />
      <CaptureBridge onReady={props.onCaptureReady} />
    </Canvas>
  );
}

const EMPTY_PLANES: THREE.Plane[] = [];

function DimTag({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0f172a", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{children}</div>;
}
