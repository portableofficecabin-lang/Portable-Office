"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the lazy-mount boundary.
 *
 * This is the ONLY module the studio imports from `animation/`. three.js / R3F / drei and the whole
 * animation surface are pulled in exclusively through the `dynamic(() => import("./AssemblyVideoView"),
 * { ssr:false })` below, so none of that heavy client code ever enters the server bundle, the RSC
 * payload, or any non-3D route — it loads only in the browser, on demand, when this component mounts.
 * A loading skeleton covers the async chunk fetch, and an error boundary keeps a WebGL / geometry
 * failure from taking down the studio page (the drawing set, BOQs and reports stay usable).
 *
 * Mirrors viewer3d/Colony3DLoader.
 */

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Film } from "lucide-react";
import type { ColonyModel, ViewMode } from "@/features/labour-colony-studio/model/types";
import type { BoqResult } from "@/lib/boq/types";

export interface AssemblyVideoLoaderProps {
  model: ColonyModel;
  /** Live Material BOQ — a read-only cross-check surface; never an input to the animation. */
  boqResult?: BoqResult | null;
  viewMode?: ViewMode;
  projectName?: string;
  customerName?: string;
  selectedId?: string | null;
  onSelectPart?: (id: string | null) => void;
}

function Skeleton() {
  return (
    <div className="flex h-[clamp(360px,60vh,640px)] w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-slate-100 text-muted-foreground">
      <Film className="h-8 w-8 animate-pulse opacity-60" />
      <span className="text-sm">Loading assembly animation…</span>
    </div>
  );
}

/** ssr:false — three.js must never render on the server. Skeleton covers the chunk fetch. */
const AssemblyVideoView = dynamic(() => import("./AssemblyVideoView").then((m) => m.AssemblyVideoView), {
  ssr: false,
  loading: () => <Skeleton />,
});

/* ------------------------------------------------------------------ error boundary ------------ */

interface BoundaryState { error: Error | null; }

class AssemblyErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface for debugging without crashing the studio page.
    console.error("Colony assembly animation failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-[clamp(360px,60vh,640px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
          <span className="font-medium text-destructive">The assembly animation could not be displayed.</span>
          <span className="text-xs">Your browser may not support WebGL, or the model failed to build. The 2D drawings, BOQs and reports remain available.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ public wrapper ------------ */

export function AssemblyVideoLoader({ model, ...rest }: AssemblyVideoLoaderProps) {
  if (!model.parts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This design has no components to animate yet. Adjust the colony configuration to generate an erection sequence.
      </div>
    );
  }
  return (
    <AssemblyErrorBoundary>
      <AssemblyVideoView model={model} {...rest} />
    </AssemblyErrorBoundary>
  );
}

export default AssemblyVideoLoader;
