"use client";

/**
 * 3D viewer — the lazy-mount boundary.
 *
 * This module is the ONLY place three.js / R3F / drei and the BOQ-backed model builder are pulled
 * in, and it is meant to be reached exclusively via `dynamic(() => import('./Cabin3DLoader'),
 * { ssr:false })` from the admin studio — so none of that heavy code enters the server bundle, the
 * RSC payload, or any non-3D route. The model is rebuilt only when the design (config) changes.
 */

import { useMemo } from "react";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel, CabinPart, ViewMode } from "@/features/cabin-design/model/types";
import type { InspectorBoq } from "@/features/cabin-design/inspector/ComponentInspector";
import { buildCabinModel } from "@/features/cabin-design/model/cabinModel";
import { Cabin3D } from "./Cabin3D";

export interface Cabin3DLoaderProps {
  /** Prebuilt shared model (preferred — one geometry build shared by 2D + 3D). */
  model?: CabinModel;
  /** Fallback: build from config when no model is supplied. */
  config?: CabinConfig;
  viewMode?: ViewMode;
  boqLookup?: (part: CabinPart) => InspectorBoq | null | undefined;
  selectedId?: string | null;
  onSelectPart?: (id: string | null) => void;
}

export default function Cabin3DLoader({ model, config, viewMode, boqLookup, selectedId, onSelectPart }: Cabin3DLoaderProps) {
  // Prefer the shared model; only build here if a bare config was passed (keeps geometry single-source).
  const built = useMemo(() => (model ? model : config ? buildCabinModel(config) : null), [model, config]);
  if (!built) return null;
  return (
    <Cabin3D
      model={built}
      viewMode={viewMode}
      boqLookup={boqLookup}
      selectedId={selectedId}
      onSelectPart={onSelectPart}
    />
  );
}
