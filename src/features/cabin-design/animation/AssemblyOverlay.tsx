"use client";

/**
 * ANIMATED CABIN ASSEMBLY — on-screen caption overlay (spec: "Captions and annotations").
 *
 * The crisp DOM twin of the export-time canvas drawer (assemblyOverlayDraw). Both render the SAME
 * CaptionState — company / project / dimensions, step heading + plain-language line, live progress
 * and (engineering mode) the material / section / qty / weight / BOQ rows — so the preview and the
 * exported video read identically. `pointer-events: none` so it never blocks the 3D orbit or the
 * controls beneath it; everything sits inside a video-safe inset so nothing is clipped.
 */

import type { CaptionState } from "./assemblyTypes";

const PANEL = "rgba(15,23,42,0.58)";

export function AssemblyOverlay({ caption, safeInset = 4.5 }: { caption: CaptionState; safeInset?: number }) {
  const inset = `${safeInset}%`;
  return (
    <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
      {/* top-left identity */}
      {(caption.showCompanyTitle || caption.projectName) && (
        <div style={{ position: "absolute", top: inset, left: inset }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "8px 12px", color: "#fff", backdropFilter: "blur(2px)" }}>
            {caption.showCompanyTitle && caption.companyName && (
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fb923c", letterSpacing: 0.3 }}>{caption.companyName}</div>
            )}
            {caption.projectName && <div style={{ fontWeight: 600, fontSize: 12.5 }}>{caption.projectName}</div>}
            {caption.showDimensions && caption.dimensionsLine && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{caption.dimensionsLine}</div>
            )}
          </div>
        </div>
      )}

      {/* intro / outro centred card */}
      {(caption.kind === "intro" || caption.kind === "outro") && (
        <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", maxWidth: "84%" }}>
          <div style={{ background: PANEL, borderRadius: 14, padding: "18px 26px", color: "#fff", backdropFilter: "blur(2px)" }}>
            <div style={{ fontWeight: 800, fontSize: "clamp(20px, 3.4vw, 40px)", lineHeight: 1.1 }}>{caption.title}</div>
            <div style={{ fontSize: "clamp(12px, 1.5vw, 18px)", marginTop: 8, color: "rgba(255,255,255,0.9)" }}>{caption.subtitle}</div>
          </div>
        </div>
      )}

      {/* step heading */}
      {caption.kind === "step" && (
        <div style={{ position: "absolute", left: inset, bottom: `calc(${inset} + 42px)`, maxWidth: "62%" }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "10px 14px", color: "#fff", backdropFilter: "blur(2px)" }}>
            <div style={{ fontWeight: 800, fontSize: "clamp(14px, 1.9vw, 22px)", color: "#fb923c", letterSpacing: 0.3 }}>{caption.title}</div>
            <div style={{ fontSize: "clamp(12px, 1.4vw, 16px)", marginTop: 3 }}>{caption.subtitle}</div>
          </div>
        </div>
      )}

      {/* engineering rows */}
      {caption.kind === "step" && caption.engineeringRows.length > 0 && (
        <div style={{ position: "absolute", right: inset, bottom: `calc(${inset} + 42px)`, maxWidth: "40%", textAlign: "right" }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "8px 12px", color: "rgba(255,255,255,0.95)", backdropFilter: "blur(2px)" }}>
            {caption.engineeringRows.slice(0, 5).map((r, i) => (
              <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {[r.label, r.material, r.section, r.qty, r.weight, r.boqRef].filter(Boolean).join("  ·  ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* progress bar + step counter */}
      <div style={{ position: "absolute", left: inset, right: inset, bottom: inset }}>
        {caption.kind === "step" && caption.totalSteps > 0 && (
          <div style={{ textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, marginBottom: 4, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
            STEP {caption.stepNumber} / {caption.totalSteps}
          </div>
        )}
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(1, Math.min(100, caption.progress * 100))}%`, background: "#fb923c", borderRadius: 3, transition: "width 80ms linear" }} />
        </div>
      </div>
    </div>
  );
}
