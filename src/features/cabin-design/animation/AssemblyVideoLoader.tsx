"use client";

/**
 * ANIMATED CABIN ASSEMBLY — lazy-mount boundary.
 *
 * The ONLY place the assembly animation + three.js/R3F are pulled in for this feature, reached
 * exclusively via `dynamic(() => import('./AssemblyVideoLoader'), { ssr:false })` from the studio —
 * so none of that heavy code enters the server bundle, the RSC payload or any public route. Mirrors
 * viewer3d/Cabin3DLoader. Prefers the prebuilt shared model so geometry stays single-source.
 */

import { useMemo } from "react";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel, ViewMode } from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { buildCabinModel } from "@/features/cabin-design/model/cabinModel";
import { AssemblyVideoView } from "./AssemblyVideoView";

export interface AssemblyVideoLoaderProps {
  /** Prebuilt shared model (preferred — one geometry build shared by 2D + 3D + animation). */
  model?: CabinModel;
  /** Fallback: build from config when no model is supplied. */
  config?: CabinConfig;
  boqResult?: BoqResult | null;
  viewMode?: ViewMode;
  projectName?: string;
  customerName?: string;
  companyName?: string;
  selectedId?: string | null;
  onSelectPart?: (id: string | null) => void;
}

export default function AssemblyVideoLoader({ model, config, ...rest }: AssemblyVideoLoaderProps) {
  const built = useMemo(() => (model ? model : config ? buildCabinModel(config) : null), [model, config]);
  if (!built) return null;
  if (!built.parts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This design has no components to animate yet. Adjust the cabin configuration to generate an assembly sequence.
      </div>
    );
  }
  return <AssemblyVideoView model={built} {...rest} />;
}
