"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the R3F scene (spec: "Animation behaviour" + "Visual style").
 *
 * Renders the shared ColonyModel ONCE (every part becomes a stable mesh, reusing the interactive
 * viewer's coordinate mapping in viewer3d/partGeometry) and drives the animation IMPERATIVELY inside
 * the render loop: each frame it reads the current timeline time, samples the deterministic motion
 * (per-part fly-in offset, opacity, highlight, envelope cut-away) and the cinematic camera, and writes
 * them straight onto the meshes + camera. No per-frame React state, no reconciliation, no geometry
 * rebuild. The SAME apply path backs the deterministic export controller (renderAt(ms)).
 *
 * COORDINATES ARE METRES — boxOfSolid / quadOfSolid already map colony metres into three metres; there
 * is NO /1000 anywhere.
 *
 * Mounted only behind the studio's lazy island (dynamic ssr:false), so three.js never reaches a server
 * or public bundle.
 */

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ColonyModel, ColonyPart, ViewMode } from "@/features/labour-colony-studio/model/types";
import {
  boxOfSolid, quadOfSolid, sceneCtxOf, MIN_VIS_M, type SceneCtx,
} from "@/features/labour-colony-studio/viewer3d/partGeometry";
import { resolvePartColor, type ColonyPalette } from "@/features/labour-colony-studio/model/palette";
import type { AssemblyBackground, AssemblyTimeline, Vec3T } from "./assemblyTypes";
import {
  activeStepCutawayAt, activeStepIndexAt, clamp01, sampleCamera, samplePart,
} from "./assemblyMotion";
import type { SeekCommand } from "./useAssemblyPlayer";

/** Imperative handle the exporter uses to render deterministic frames at an arbitrary resolution. */
export interface AssemblyExportController {
  getCanvas: () => HTMLCanvasElement;
  setSize: (width: number, height: number) => void;
  /** Apply the exact scene state at `timeMs` and synchronously render one frame; returns the canvas.
   *  `keepCurrentCamera` leaves the current (manual) camera untouched — used for a "current frame" PNG. */
  renderAt: (timeMs: number, keepCurrentCamera?: boolean) => HTMLCanvasElement;
  /** Restore the interactive renderer size + resume normal playback. */
  restore: () => void;
}

export interface AssemblySceneProps {
  model: ColonyModel;
  timeline: AssemblyTimeline;
  playing: boolean;
  speed: number;
  loop: boolean;
  autoCamera: boolean;
  mode: ViewMode;
  background: AssemblyBackground;
  quality: "low" | "high";
  selectedId: string | null;
  seek: SeekCommand;
  onTick: (timeMs: number, stepIndex: number, progress: number) => void;
  onSelect: (id: string | null) => void;
  onExportReady?: (controller: AssemblyExportController | null) => void;
  onReady?: () => void;
  /**
   * Per-group colour overrides, resolved through the SAME `resolvePartColor` the 3D viewer uses, so
   * the video and every exported frame carry exactly the colours chosen in the studio.
   */
  palette?: ColonyPalette | null;
}

/* LITERAL HEX only — never oklch / CSS vars, so PNG + WebM export is colour-safe. */
const BG_HEX: Record<AssemblyBackground, string | null> = {
  studio: "#eef2f6", white: "#ffffff", site: "#e6e3dc", transparent: null,
};
const GROUND_HEX: Record<AssemblyBackground, string | null> = {
  studio: "#e2e8f0", white: "#f1f5f9", site: "#d3cec2", transparent: null,
};
const SELECT_HEX = "#f59e0b";
const SELECT_EMISSIVE = "#7c3a00";
const HIGHLIGHT_EMISSIVE = "#b45309";
const NO_EMISSIVE = "#000000";

interface MeshRec { mesh: THREE.Mesh; base: Vec3T; material: THREE.MeshStandardMaterial; part: ColonyPart; }
interface RenderItem { part: ColonyPart; base: Vec3T; size: Vec3T | null; geo: THREE.BufferGeometry | null; }

/** Build the stable render list. Box/prism parts become a unit box scaled to size (metres); sloped
 *  roof / rafter / stair-soffit quads become a two-triangle buffer geometry in absolute scene coords. */
function buildRenderList(model: ColonyModel, ctx: SceneCtx): RenderItem[] {
  return model.parts.map((part) => {
    const b = boxOfSolid(part.solid, ctx);
    if (b) {
      // never let a thin plate / bolt collapse to an invisible hairline
      const size: Vec3T = [
        Math.max(MIN_VIS_M, b.size[0]),
        Math.max(MIN_VIS_M, b.size[1]),
        Math.max(MIN_VIS_M, b.size[2]),
      ];
      return { part, base: b.center, size, geo: null };
    }
    const q = quadOfSolid(part.solid, ctx);
    if (q && q.length === 4) {
      const g = new THREE.BufferGeometry();
      const [a, bb, c, d] = q;
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([...a, ...bb, ...c, ...a, ...c, ...d]), 3));
      g.computeVertexNormals();
      return { part, base: [0, 0, 0] as Vec3T, size: null, geo: g };
    }
    return { part, base: [0, 0, 0] as Vec3T, size: [MIN_VIS_M, MIN_VIS_M, MIN_VIS_M] as Vec3T, geo: null };
  });
}

/**
 * Pull a camera pose back from its target when the frame is narrower than 16:9, so a long colony fits
 * horizontally in portrait / square exports. The horizontal visible extent scales LINEARLY with camera
 * distance, so to keep a wide building the same fraction of frame width at a narrower aspect the
 * distance must scale by REF/aspect (not its square root). Over-pulling in portrait only adds harmless
 * vertical margin, so this is the safe minimal fit.
 */
function fitForAspect(k: { position: Vec3T; target: Vec3T }, aspect: number): Vec3T {
  const REF = 16 / 9;
  if (aspect >= REF) return k.position;
  const pull = REF / Math.max(0.2, aspect);
  return [
    k.target[0] + (k.position[0] - k.target[0]) * pull,
    k.target[1] + (k.position[1] - k.target[1]) * pull,
    k.target[2] + (k.position[2] - k.target[2]) * pull,
  ];
}

/* ----------------------------------------------------------------- scene contents -------------- */

function SceneContents(props: AssemblySceneProps) {
  const { model, timeline } = props;
  const { gl, scene, camera, invalidate } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);

  // Derive the scene context from the MODEL (not timeline.sceneCtx, which is a fresh object on every
  // timeline rebuild) so a caption / option change never invalidates renderList and remounts every
  // mesh. It is value-equal to timeline.sceneCtx — both come from the same model bounds.
  const ctx = useMemo(() => sceneCtxOf(model), [model]);
  const renderList = useMemo(() => buildRenderList(model, ctx), [model, ctx]);
  useEffect(() => () => { for (const it of renderList) it.geo?.dispose(); }, [renderList]);

  const meshMap = useRef<Map<string, MeshRec>>(new Map());

  // stable per-part ref callbacks (only change when the model geometry changes)
  const refCbs = useMemo(() => {
    const m = new Map<string, (mesh: THREE.Mesh | null) => void>();
    for (const it of renderList) {
      const { part, base } = it;
      m.set(part.id, (mesh) => {
        if (mesh) meshMap.current.set(part.id, { mesh, base, material: mesh.material as THREE.MeshStandardMaterial, part });
        else meshMap.current.delete(part.id);
      });
    }
    return m;
  }, [renderList]);

  // live refs mirrored from props (read inside the render loop without re-subscribing)
  const timelineRef = useRef(timeline); timelineRef.current = timeline;
  const playingRef = useRef(props.playing); playingRef.current = props.playing;
  const speedRef = useRef(props.speed); speedRef.current = props.speed;
  const loopRef = useRef(props.loop); loopRef.current = props.loop;
  const autoCameraRef = useRef(props.autoCamera); autoCameraRef.current = props.autoCamera;
  const modeRef = useRef(props.mode); modeRef.current = props.mode;
  const selectedRef = useRef(props.selectedId); selectedRef.current = props.selectedId;
  /* Read through a ref for the same reason mode and selection are: `applyFrame` is memoised and also
   * driven by the exporter, so it must always see the CURRENT palette without being rebuilt. */
  const paletteRef = useRef(props.palette); paletteRef.current = props.palette;
  const onTickRef = useRef(props.onTick); onTickRef.current = props.onTick;
  const exportingRef = useRef(false);
  const playheadRef = useRef(0);
  const readyRef = useRef(false);
  const exportSaved = useRef<{ size: THREE.Vector2; pr: number; aspect: number } | null>(null);

  /* ---- the single apply function (shared by the render loop AND the exporter) ---- */
  const applyFrame = useCallback((
    timeMs: number,
    opts?: { forceAutoCamera?: boolean; ignoreSelection?: boolean; keepCamera?: boolean },
  ) => {
    const tl = timelineRef.current;
    const stepIndex = activeStepIndexAt(tl, timeMs);
    const cutaway = activeStepCutawayAt(tl, timeMs);
    const partCtx = {
      activeStepIndex: stepIndex,
      activeStepCutaway: cutaway,
      stepCount: tl.steps.length,
      options: tl.options,
    };
    const mode = modeRef.current;
    const selected = opts?.ignoreSelection ? null : selectedRef.current;

    for (const entry of tl.schedule) {
      const rec = meshMap.current.get(entry.partId);
      if (!rec) continue;
      const st = samplePart(entry, timeMs, partCtx);
      const modeVisible = mode === "customer" ? rec.part.viewMask.includes("customer") : true;
      const visible = st.visible && modeVisible;
      rec.mesh.visible = visible;
      if (!visible) continue;
      rec.mesh.position.set(
        rec.base[0] + st.offset[0],
        rec.base[1] + st.offset[1],
        rec.base[2] + st.offset[2],
      );
      const op = clamp01((rec.part.opacity ?? 1) * st.opacity);
      const mat = rec.material;
      const isSel = rec.part.id === selected;
      mat.opacity = isSel ? Math.max(op, 0.85) : op;
      mat.transparent = mat.opacity < 0.999;
      mat.depthWrite = !mat.transparent;
      if (isSel) {
        mat.color.set(SELECT_HEX); mat.emissive.set(SELECT_EMISSIVE); mat.emissiveIntensity = 0.6;
      } else if (st.highlight) {
        mat.color.set(resolvePartColor(rec.part, paletteRef.current)); mat.emissive.set(HIGHLIGHT_EMISSIVE); mat.emissiveIntensity = 0.5;
      } else {
        mat.color.set(resolvePartColor(rec.part, paletteRef.current)); mat.emissive.set(NO_EMISSIVE); mat.emissiveIntensity = 0;
      }
    }

    const auto = !opts?.keepCamera
      && (opts?.forceAutoCamera || (autoCameraRef.current && (playingRef.current || exportingRef.current)));
    const controls = controlsRef.current as unknown as { enabled: boolean; target: THREE.Vector3; update: () => void } | null;
    if (auto) {
      const k = sampleCamera(tl, timeMs);
      const pos = fitForAspect(k, (camera as THREE.PerspectiveCamera).aspect || 1.6);
      camera.position.set(pos[0], pos[1], pos[2]);
      camera.lookAt(k.target[0], k.target[1], k.target[2]);
      if (controls) { controls.target.set(k.target[0], k.target[1], k.target[2]); controls.enabled = false; controls.update(); }
    } else if (controls) {
      controls.enabled = !exportingRef.current;
    }
  }, [camera]);

  /* ---- the interactive clock: rAF-driven via useFrame; export bypasses it ---- */
  useFrame((_state, delta) => {
    if (exportingRef.current) return;
    const tl = timelineRef.current;
    if (playingRef.current) {
      let t = playheadRef.current + Math.min(delta, 0.1) * 1000 * speedRef.current;
      if (t >= tl.totalMs) t = loopRef.current ? 0 : tl.totalMs;
      playheadRef.current = t;
    }
    applyFrame(playheadRef.current);
    const prog = tl.totalMs > 0 ? clamp01(playheadRef.current / tl.totalMs) : 0;
    onTickRef.current?.(playheadRef.current, activeStepIndexAt(tl, playheadRef.current), prog);
  });

  /* ---- seek: jump the playhead + re-apply once (works while paused, frameloop=demand) ---- */
  useEffect(() => {
    playheadRef.current = Math.min(Math.max(props.seek.ms, 0), timeline.totalMs);
    applyFrame(playheadRef.current);
    const prog = timeline.totalMs > 0 ? clamp01(playheadRef.current / timeline.totalMs) : 0;
    onTickRef.current?.(playheadRef.current, activeStepIndexAt(timeline, playheadRef.current), prog);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seek.nonce]);

  /* ---- re-apply the paused frame when playback stops or a presentation prop changes. Critically this
   *      re-enables OrbitControls when the animation pauses/ends (the last playing frame left them
   *      disabled while the camera was auto-driven) — spec: manual orbit while paused. ---- */
  useEffect(() => {
    if (!props.playing) { applyFrame(playheadRef.current); invalidate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.playing, props.mode, props.selectedId, props.background, props.autoCamera, props.quality, timeline, props.palette]);

  /* ---- first mount: intro frame + export controller + cleanup ---- */
  useEffect(() => {
    applyFrame(0);
    invalidate();
    if (!readyRef.current) { readyRef.current = true; props.onReady?.(); }
    const controller: AssemblyExportController = {
      getCanvas: () => gl.domElement,
      setSize: (w, h) => {
        exportSaved.current = {
          size: gl.getSize(new THREE.Vector2()),
          pr: gl.getPixelRatio(),
          aspect: (camera as THREE.PerspectiveCamera).aspect,
        };
        gl.setPixelRatio(1);
        gl.setSize(w, h, false);
        (camera as THREE.PerspectiveCamera).aspect = w / h;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      },
      renderAt: (timeMs, keepCurrentCamera) => {
        exportingRef.current = true;
        applyFrame(timeMs, keepCurrentCamera
          ? { ignoreSelection: true, keepCamera: true }
          : { forceAutoCamera: true, ignoreSelection: true });
        gl.render(scene, camera);
        return gl.domElement;
      },
      restore: () => {
        exportingRef.current = false;
        const s = exportSaved.current;
        if (s) {
          gl.setPixelRatio(s.pr);
          gl.setSize(s.size.x, s.size.y, false);
          (camera as THREE.PerspectiveCamera).aspect = s.aspect;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
          exportSaved.current = null;
        }
        applyFrame(playheadRef.current);
        invalidate();
      },
    };
    props.onExportReady?.(controller);
    return () => { props.onExportReady?.(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectProp = props.onSelect;
  const handleSelect = useCallback(
    (id: string) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelectProp(id); },
    [onSelectProp],
  );

  const radius = Math.max(1, timeline.radius);
  const bg = BG_HEX[props.background];
  const ground = GROUND_HEX[props.background];

  return (
    <>
      {bg && <color attach="background" args={[bg]} />}
      <hemisphereLight args={["#ffffff", "#c9d3de", 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[radius * 3, radius * 5, radius * 2]} intensity={1.15} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-near={0.5} shadow-camera-far={radius * 30}
        shadow-camera-left={-radius * 3} shadow-camera-right={radius * 3}
        shadow-camera-top={radius * 3} shadow-camera-bottom={-radius * 3}
      />
      <directionalLight position={[-radius * 3, radius * 3, -radius * 2]} intensity={0.4} />

      {ground && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
          <planeGeometry args={[radius * 20, radius * 20]} />
          <meshStandardMaterial color={ground} roughness={1} metalness={0} />
        </mesh>
      )}

      {renderList.map((it) => (
        it.geo ? (
          <mesh key={it.part.id} ref={refCbs.get(it.part.id)} geometry={it.geo} onClick={handleSelect(it.part.id)}>
            <meshStandardMaterial color={resolvePartColor(it.part, props.palette)} side={THREE.DoubleSide} roughness={0.85} metalness={0.05} transparent opacity={1} />
          </mesh>
        ) : (
          <mesh
            key={it.part.id} ref={refCbs.get(it.part.id)} position={it.base} scale={it.size ?? [1, 1, 1]}
            castShadow={it.part.layer === "structure" || it.part.layer === "walls" || it.part.layer === "roof"}
            onClick={handleSelect(it.part.id)}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={resolvePartColor(it.part, props.palette)} roughness={0.82} metalness={0.05} transparent opacity={1} />
          </mesh>
        )
      ))}

      <OrbitControls
        ref={controlsRef} makeDefault enableDamping={false} enablePan
        minDistance={radius * 0.4} maxDistance={radius * 14} target={[0, radius * 0.25, 0]}
      />
    </>
  );
}

/* ----------------------------------------------------------------- the canvas ------------------ */

export const AssemblyScene = memo(function AssemblyScene(props: AssemblySceneProps) {
  const radius = Math.max(1, props.timeline.radius);
  const transparent = props.background === "transparent";
  const glConfig = useMemo(
    () => ({ preserveDrawingBuffer: true, antialias: true, alpha: transparent }),
    [transparent],
  );
  return (
    <Canvas
      key={transparent ? "alpha" : "opaque"}
      frameloop={props.playing ? "always" : "demand"}
      shadows
      dpr={props.quality === "high" ? [1, 2] : [1, 1.5]}
      gl={glConfig}
      camera={{ position: [radius * 1.8, radius * 1.4, radius * 1.8], fov: 42, near: 0.05, far: radius * 60 }}
      onPointerMissed={() => props.onSelect(null)}
      style={{ background: transparent ? "transparent" : undefined }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
});
