"use client";

/**
 * LABOUR COLONY STUDIO — the shared WebGL-failure notice.
 *
 * Both WebGL surfaces (the 3D viewer and the assembly animation) sit behind an error boundary. Those
 * boundaries used to render the same unfalsifiable sentence:
 *
 *     "Your browser may not support WebGL, or the model failed to build."
 *
 * That message never distinguished the two causes, which have opposite fixes — one is "turn on
 * hardware acceleration", the other is "there is a bug in our code". An admin hitting a genuine
 * exception would go hunting through their display settings, and the exception text (the one thing
 * that would identify the defect) was swallowed into a console nobody was looking at.
 *
 * This component probes for a real GPU context and reports ONLY the cause that is actually true, and
 * always exposes the exception so a fault can be reported instead of guessed at.
 *
 * Shared by both loaders so the diagnosis can never drift apart between the two tabs.
 */

import { AlertTriangle } from "lucide-react";

/**
 * Can this browser give us a WebGL context RIGHT NOW?
 *
 * Only ever called AFTER a failure, so the probe never costs anything on the happy path. A context
 * that exists but is already lost (software-blocklisted GPU, exhausted context pool) counts as
 * unavailable — that is the case the user actually has to act on.
 */
export function webglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    return !gl.isContextLost?.();
  } catch {
    return false;
  }
}

export interface GlFailureNoticeProps {
  /** What failed, in words the admin recognises — e.g. "assembly animation", "3D viewer". */
  label: string;
  /** What else still works, so the admin knows the rest of the studio is unaffected. */
  stillAvailable: string;
  error: Error;
  onRetry: () => void;
}

export function GlFailureNotice({ label, stillAvailable, error, onRetry }: GlFailureNoticeProps) {
  const noGpu = !webglAvailable();
  return (
    <div className="flex min-h-[clamp(360px,60vh,640px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
      <AlertTriangle className="h-7 w-7 text-destructive/80" />
      <span className="font-medium text-destructive">The {label} could not be displayed.</span>

      {noGpu ? (
        <span className="max-w-lg text-xs">
          This browser could not provide a WebGL context. Enable hardware acceleration (or try a
          different browser) and reload. {stillAvailable}
        </span>
      ) : (
        <span className="max-w-lg text-xs">
          WebGL is working on this device, so this is a fault in the {label} itself — not your
          browser. {stillAvailable}
        </span>
      )}

      <details className="mt-1 w-full max-w-lg text-left">
        <summary className="cursor-pointer text-xs font-medium text-foreground/80">
          Technical details
        </summary>
        <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-foreground/80">
          {`${error.name}: ${error.message}`}
          {error.stack ? `\n\n${error.stack.split("\n").slice(1, 6).join("\n")}` : ""}
        </pre>
      </details>

      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}

export default GlFailureNotice;
