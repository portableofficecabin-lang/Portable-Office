"use client";

import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Error containment for the WebGL tabs (3D & Exploded, Assembly Video) — and ONLY those tabs.
 *
 * WHY THIS EXISTS: these two tabs are the studio's only surfaces that depend on a GPU context and
 * the react-three-fiber reconciler. A crash there (driver context loss, an R3F/React internals
 * mismatch like the 2026-07 `ReactCurrentBatchConfig` incident, an exotic mobile GPU) used to
 * unwind through the whole admin Cabin Design Calculator and blank the page — taking the 2D
 * drawings, BOQ and reports down with a renderer they do not depend on. This boundary confines the
 * blast radius to the tab body and offers a retry (remounting the subtree recreates the Canvas and
 * a fresh WebGL context, which is the correct recovery for context loss).
 *
 * Deliberately NOT wrapped around the 2D / reports tabs: those are plain DOM + SVG, and a boundary
 * there would only mask real bugs that tests should catch.
 */
interface Props {
  /** Shown in the fallback so the user knows which tab failed ("3D view", "Assembly video"). */
  label: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  /** Incremented on retry — used as a key to force a full remount of the crashed subtree. */
  attempt: number;
}

export class StudioTabBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Log loudly — a boundary that swallows errors silently turns crashes into ghost bugs.
    console.error(`[cabin-studio] ${this.props.label} crashed:`, error);
  }

  private retry = (): void => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-semibold text-destructive">
            The {this.props.label} could not be displayed.
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            The rest of the studio (2D drawings, reports, BOQ) is unaffected. This is usually a
            graphics-driver or WebGL issue — retrying opens a fresh 3D context.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      );
    }
    // Keying by attempt guarantees the retry remounts (not just re-renders) the crashed tree.
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}
