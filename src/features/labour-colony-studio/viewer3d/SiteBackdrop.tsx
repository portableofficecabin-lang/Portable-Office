"use client";

/**
 * LABOUR COLONY STUDIO — the shared REALISTIC SITE BACKDROP.
 *
 * One implementation of the sky / grass / haze environment, used by BOTH WebGL surfaces — the
 * interactive 3D viewer (Colony3DView) and the assembly animation (AssemblyScene) — so the model
 * a user inspects and the film they export sit in the SAME world. Everything is procedural and
 * locally generated (drei's shader Sky + a canvas-gradient ground): nothing is fetched, so it
 * works offline and appears identically in every captured PNG / WebM frame.
 *
 * Client-only by construction — both hosts mount it inside <Canvas>, which never runs on a server.
 */

import { useEffect, useMemo } from "react";
import { Sky } from "@react-three/drei";
import * as THREE from "three";

/** Horizon / haze colour shared by the fog, the ground's far edge and the canvas clear colour. */
export const HAZE = "#dbe7f2";

/**
 * The realistic site ground — a big grass disc whose colour runs from turf at the centre to the
 * fog's haze at the rim, so the ground dissolves into the horizon instead of ending at a hard edge.
 */
export function SiteGround({ radius }: { radius: number }) {
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

/**
 * Sky + distance haze + grass ground, sized to the model radius. The sun sits on the hosts' shared
 * key-light axis so the sky's bright quadrant and the cast shadows agree; the sky sphere is kept
 * inside every host camera's far plane.
 */
export function SiteAtmosphere({ radius }: { radius: number }) {
  return (
    <>
      <fog attach="fog" args={[HAZE, radius * 7, radius * 26]} />
      <Sky
        distance={radius * 32}
        sunPosition={[radius * 3, radius * 5, radius * 2]}
        turbidity={5.5}
        rayleigh={1.1}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      <SiteGround radius={radius} />
    </>
  );
}
