"use client";

/**
 * LABOUR COLONY STUDIO — the 3D viewer's lazy-mount boundary.
 *
 * This is the ONLY thing the studio imports from `viewer3d/`. three.js / R3F / drei are pulled in
 * exclusively through the `dynamic(() => import("./Colony3D"), { ssr:false })` below, so none of that
 * heavy client code ever enters the server bundle, the RSC payload, or any non-3D route — it loads
 * only in the browser, on demand, when this component mounts. A loading skeleton covers the async
 * chunk fetch, and an error boundary keeps a WebGL / geometry failure from taking down the studio
 * page (the rest of the drawing set and BOQ stay usable).
 */

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Box } from "lucide-react";
import type { ColonyModel } from "@/features/labour-colony-studio/model/types";

export interface Colony3DLoaderProps {
  model: ColonyModel;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function Skeleton() {
  return (
    <div className="flex h-[clamp(360px,60vh,640px)] w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-slate-100 text-muted-foreground">
      <Box className="h-8 w-8 animate-pulse opacity-60" />
      <span className="text-sm">Loading 3D model…</span>
    </div>
  );
}

/** ssr:false — three.js must never render on the server. Skeleton covers the chunk fetch. */
const Colony3D = dynamic(() => import("./Colony3D").then((m) => m.Colony3D), {
  ssr: false,
  loading: () => <Skeleton />,
});

/* ------------------------------------------------------------------ error boundary ------------ */

interface BoundaryState { error: Error | null; }

class Viewer3DErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface for debugging without crashing the studio page.
    console.error("Colony 3D viewer failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-[clamp(360px,60vh,640px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
          <span className="font-medium text-destructive">The 3D viewer could not be displayed.</span>
          <span className="text-xs">Your browser may not support WebGL, or the model failed to build. The 2D drawings and BOQ remain available.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ public wrapper ------------ */

export function Colony3DLoader({ model, selectedId, onSelect }: Colony3DLoaderProps) {
  return (
    <Viewer3DErrorBoundary>
      <Colony3D model={model} selectedId={selectedId} onSelect={onSelect} />
    </Viewer3DErrorBoundary>
  );
}

export default Colony3DLoader;
