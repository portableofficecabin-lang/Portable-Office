"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — on-screen caption overlay.
 *
 * The crisp DOM twin of the export-time canvas drawer (assemblyOverlayDraw). Both render the SAME
 * CaptionState + OverlayExtras — company / project / dimensions, step chips, step heading + plain
 * language line, fabrication part marks, connection marks, bolt spec, live progress and (engineering
 * mode) the material / section / qty / weight / BOQ rows — so the preview and the exported video read
 * identically. `pointer-events: none` so it never blocks the 3D orbit or the controls beneath it, and
 * everything sits inside a video-safe inset so nothing is clipped.
 *
 * Colours are LITERAL HEX / rgba, matching the canvas drawer exactly.
 */

import type { CaptionState } from "./assemblyTypes";
import type { OverlayExtras, OverlayLabelOptions } from "./assemblyOverlayDraw";
import { DEFAULT_LABEL_OPTIONS } from "./assemblyOverlayDraw";

const PANEL = "rgba(15,23,42,0.58)";
const CHIP = "rgba(15,23,42,0.72)";
const ACCENT = "#fb923c";
const MUTED = "rgba(255,255,255,0.82)";

export interface AssemblyOverlayProps {
  caption: CaptionState;
  extras?: OverlayExtras;
  labels?: OverlayLabelOptions;
  /** video-safe inset, percent. */
  safeInset?: number;
}

export function AssemblyOverlay({
  caption, extras, labels = DEFAULT_LABEL_OPTIONS, safeInset = 4.5,
}: AssemblyOverlayProps) {
  const inset = `${safeInset}%`;
  const annotations: { key: string; text: string }[] = [];
  if (extras) {
    if (labels.showPartMarks && extras.memberMarks) annotations.push({ key: "marks", text: `MARKS  ${extras.memberMarks}` });
    if (labels.showConnectionMarks && extras.connectionMarks) annotations.push({ key: "conn", text: `CONN  ${extras.connectionMarks}` });
    if (labels.showBoltLabels && extras.boltSpec) annotations.push({ key: "bolts", text: `BOLTS  ${extras.boltSpec}` });
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
      {/* top-left identity */}
      {(caption.showCompanyTitle || caption.projectName) && (
        <div style={{ position: "absolute", top: inset, left: inset }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "8px 12px", color: "#ffffff", backdropFilter: "blur(2px)" }}>
            {caption.showCompanyTitle && caption.companyName && (
              <div style={{ fontWeight: 800, fontSize: 15, color: ACCENT, letterSpacing: 0.3 }}>{caption.companyName}</div>
            )}
            {caption.projectName && <div style={{ fontWeight: 600, fontSize: 12.5 }}>{caption.projectName}</div>}
            {caption.showDimensions && labels.showDimensions && caption.dimensionsLine && (
              <div style={{ fontSize: 11, color: MUTED }}>{caption.dimensionsLine}</div>
            )}
          </div>
        </div>
      )}

      {/* top-right step chips */}
      {extras && extras.chips.length > 0 && (
        <div style={{ position: "absolute", top: inset, right: inset, display: "flex", gap: 6 }}>
          {extras.chips.map((c, i) => (
            <span
              key={c}
              style={{
                background: CHIP, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                letterSpacing: 0.4, color: i === 0 ? ACCENT : MUTED, whiteSpace: "nowrap",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* intro / outro centred card */}
      {(caption.kind === "intro" || caption.kind === "outro") && (
        <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", maxWidth: "84%" }}>
          <div style={{ background: PANEL, borderRadius: 14, padding: "18px 26px", color: "#ffffff", backdropFilter: "blur(2px)" }}>
            <div style={{ fontWeight: 800, fontSize: "clamp(20px, 3.4vw, 40px)", lineHeight: 1.1 }}>{caption.title}</div>
            <div style={{ fontSize: "clamp(12px, 1.5vw, 18px)", marginTop: 8, color: "rgba(255,255,255,0.9)" }}>{caption.subtitle}</div>
          </div>
        </div>
      )}

      {/* step heading + fabrication annotations */}
      {caption.kind === "step" && (
        <div style={{ position: "absolute", left: inset, bottom: `calc(${inset} + 42px)`, maxWidth: "62%" }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "10px 14px", color: "#ffffff", backdropFilter: "blur(2px)" }}>
            <div style={{ fontWeight: 800, fontSize: "clamp(14px, 1.9vw, 22px)", color: ACCENT, letterSpacing: 0.3 }}>{caption.title}</div>
            <div style={{ fontSize: "clamp(12px, 1.4vw, 16px)", marginTop: 3 }}>{caption.subtitle}</div>
            {annotations.map((a) => (
              <div key={a.key} style={{ fontSize: 11.5, fontWeight: 600, marginTop: 3, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* engineering rows */}
      {caption.kind === "step" && caption.engineeringRows.length > 0 && (
        <div style={{ position: "absolute", right: inset, bottom: `calc(${inset} + 42px)`, maxWidth: "40%", textAlign: "right" }}>
          <div style={{ background: PANEL, borderRadius: 10, padding: "8px 12px", color: "rgba(255,255,255,0.95)", backdropFilter: "blur(2px)" }}>
            {caption.engineeringRows.slice(0, 6).map((r, i) => (
              <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {[r.label, r.material, r.section, r.qty, r.weight, r.boqRef, r.note].filter(Boolean).join("  ·  ")}
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
          <div style={{ height: "100%", width: `${Math.max(1, Math.min(100, caption.progress * 100))}%`, background: ACCENT, borderRadius: 3, transition: "width 80ms linear" }} />
        </div>
      </div>
    </div>
  );
}
