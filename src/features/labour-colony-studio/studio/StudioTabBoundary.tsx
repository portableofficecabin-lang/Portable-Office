"use client";

/**
 * A small error boundary for the WebGL studio tabs (3D + Assembly Video). If three.js / the GPU
 * context fails on a given admin device, the rest of the studio (2D sheets, reports) keeps working
 * instead of the whole panel white-screening. Mirrors the cabin studio's boundary.
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  label: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class StudioTabBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div className="text-sm font-semibold">The {this.props.label} could not load on this device.</div>
          <div className="max-w-md text-xs text-muted-foreground">
            This usually means WebGL / hardware acceleration is disabled in the browser. The 2D
            fabrication drawings and the reports on the other tabs still work.
          </div>
          <button
            className="mt-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
