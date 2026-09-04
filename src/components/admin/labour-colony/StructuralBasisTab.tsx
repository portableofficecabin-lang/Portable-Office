"use client";

/**
 * STRUCTURAL DESIGN BASIS & STABILITY — the Labour Colony dossier tab.
 *
 * Answers the customer's five asks in one document: CONNECTING (connection schedule + anchor bolts),
 * STRUCTURE ANALYSIS (rigid-body stability + the civil engine's existing SBC/footing checks),
 * TECHNICAL LOADING (IS 875-1/2 loading sheet), WIND LOAD (IS 875-3 factor chain), and the
 * STABILITY CERTIFICATE boundary — the dossier is certificate-READY, watermarked "FOR STRUCTURAL
 * ENGINEER REVIEW", with a sign-off page for the licensed engineer. Software never certifies.
 *
 * Every number is computed by the pure module labourColonyStructural.ts from the LIVE colony —
 * dimensions and dead weight come from the engine result, the column grid from the civil result.
 * The printable sheet uses literal hex + the `light` class so exportSheetToPdf renders it safely.
 */

import { useMemo, useRef, useState } from "react";

import { floorCountLabel, type LabourColonyConfig, type LabourColonyResult } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import {
  buildStructuralBasis,
  DEFAULT_STRUCTURAL_SITE,
  TERRAIN_LABEL,
  WIND_ZONES,
  type StructuralSiteConfig,
  type TerrainCategory,
} from "@/lib/quotation/labourColonyStructural";
import { exportSheetToPdf } from "@/lib/pdf/sheetPdf";

/* ------------------------------------------------------------------ styles (sheet = literal hex) */
const th: React.CSSProperties = { textAlign: "left", padding: "3px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "3px 8px", fontSize: 11, color: "#334155", borderBottom: "1px solid #e2e8f0" };
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const h2: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#0f172a", margin: "14px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" };

const inputCls = "h-8 w-full rounded border border-input bg-background px-2 text-xs";
const labelCls = "text-[10.5px] text-muted-foreground";

function Num({ value, onCommit, step = 0.05, min = 0 }: { value: number; onCommit: (v: number) => void; step?: number; min?: number }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      type="number" step={step} min={min} className={inputCls}
      value={text ?? String(value)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text);
        if (text != null && text.trim() !== "" && Number.isFinite(n)) onCommit(Math.max(min, n));
        setText(null);
      }}
    />
  );
}

export interface StructuralBasisTabProps {
  config: LabourColonyConfig;
  result: LabourColonyResult | null;
  civilResult: CivilWorkResult | null;
  onConfigChange: (next: LabourColonyConfig) => void;
}

export default function StructuralBasisTab({ config, result, civilResult, onConfigChange }: StructuralBasisTabProps) {
  const site: StructuralSiteConfig = useMemo(
    () => ({ ...DEFAULT_STRUCTURAL_SITE, ...(config.structuralSite ?? {}) }),
    [config.structuralSite],
  );
  const patch = (p: Partial<StructuralSiteConfig>) =>
    onConfigChange({ ...config, structuralSite: { ...site, ...p } });

  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const basis = useMemo(() => {
    if (!result) return null;
    const L = result.area.footprintLengthM;
    const W = result.area.footprintWidthM;
    const grid = civilResult?.foundation.grid ?? null;
    return buildStructuralBasis({
      lengthM: L,
      widthM: W,
      eaveHeightM: Math.max(2.2, config.floors * config.roomHeight),
      roofRiseM: config.floorPlan?.roof?.riseM ?? 0.7,
      floors: config.floors,
      floorAreaSqm: result.area.builtUpPerFloorSqm,
      deadWeightKg: result.weight.totalKg,
      gridCols: grid?.cols ?? Math.max(2, Math.ceil(L / 3) + 1),
      gridRows: grid?.rows ?? Math.max(2, Math.ceil(W / 3) + 1),
      site,
    });
  }, [result, civilResult, config.floors, config.roomHeight, config.floorPlan, site]);

  if (!result || !basis) {
    return <div className="rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground">Configure the colony first — the structural basis is derived from the live design.</div>;
  }
  const { loading, wind, stability, anchorage, connections, warnings, disclaimers, input } = basis;
  const gridEstimated = !civilResult;

  const doExport = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await exportSheetToPdf(sheetRef.current, {
        filename: `structural-design-basis-${(config.projectName || "labour-colony").toLowerCase().replace(/\s+/g, "-")}`,
        orientation: "portrait",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ site parameters (edited, persisted) ---- */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Site & wind parameters (IS 875)</p>
            <p className="text-xs text-muted-foreground">Saved with the project. Every factor is shown in the dossier so the reviewing engineer can verify each line.</p>
          </div>
          <button type="button" onClick={doExport} disabled={exporting}
            className="h-9 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            {exporting ? "Exporting…" : "Export dossier PDF"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className={labelCls}>Wind zone — basic speed Vb</label>
            <select className={inputCls} value={site.basicWindSpeedMs}
              onChange={(e) => patch({ basicWindSpeedMs: Number(e.target.value) })}>
              {WIND_ZONES.map((z) => <option key={z.vb} value={z.vb}>{z.label} — {z.hint}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Terrain category (k2)</label>
            <select className={inputCls} value={site.terrainCategory}
              onChange={(e) => patch({ terrainCategory: Number(e.target.value) as TerrainCategory })}>
              {([1, 2, 3, 4] as TerrainCategory[]).map((t) => <option key={t} value={t}>{TERRAIN_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Design life (k1)</label>
            <select className={inputCls} value={site.designLife}
              onChange={(e) => patch({ designLife: e.target.value as StructuralSiteConfig["designLife"] })}>
              <option value="50yr">General building — 50 yr (k1 = 1.0)</option>
              <option value="5yr">Temporary — 5 yr (k1 = 0.82)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Topography k3 (1.0 flat)</label>
            <Num value={site.k3Topography} onCommit={(v) => patch({ k3Topography: v })} step={0.01} min={1} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Cyclonic coastal region (k4 1.15)</label>
            <select className={inputCls} value={site.cycloneRegion ? "yes" : "no"}
              onChange={(e) => patch({ cycloneRegion: e.target.value === "yes" })}>
              <option value="no">No — inland (k4 = 1.0)</option>
              <option value="yes">Yes — within 60 km of cyclonic coast</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Wall openings % (sets Cpi)</label>
            <Num value={site.openingsPercent} onCommit={(v) => patch({ openingsPercent: v })} step={1} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Base friction μ</label>
            <Num value={site.frictionMu} onCommit={(v) => patch({ frictionMu: v })} step={0.05} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Anchor bolts per column</label>
            <Num value={site.anchorBoltsPerColumn} onCommit={(v) => patch({ anchorBoltsPerColumn: Math.round(v) })} step={1} min={1} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Live load — floors (kN/m²)</label>
            <Num value={site.liveLoadFloorKn} onCommit={(v) => patch({ liveLoadFloorKn: v })} step={0.25} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Live load — roof (kN/m²)</label>
            <Num value={site.liveLoadRoofKn} onCommit={(v) => patch({ liveLoadRoofKn: v })} step={0.25} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ THE PRINTABLE DOSSIER ------------------ */}
      <div ref={sheetRef} className="light relative overflow-hidden rounded-xl border p-6"
        style={{ background: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a" }}>

        {/* review watermark — the professional boundary, visible on screen AND in the PDF */}
        <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
          <span style={{ transform: "rotate(-24deg)", fontSize: 42, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(220,38,38,0.10)", whiteSpace: "nowrap" }}>
            FOR STRUCTURAL ENGINEER REVIEW
          </span>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="cabin-drawing-block">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.02em" }}>STRUCTURAL DESIGN BASIS & STABILITY REPORT</div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {config.projectName || "Labour colony"} · {input.lengthM.toFixed(1)} × {input.widthM.toFixed(1)} m ·{" "}
                  {floorCountLabel(config.floors)} · IS 875 (Parts 1–3)
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 6, padding: "4px 8px" }}>
                DRAFT — NOT A STABILITY CERTIFICATE<br />
                <span style={{ fontWeight: 500, color: "#991b1b" }}>Valid only when verified & signed by a licensed structural engineer</span>
              </div>
            </div>

            {/* §1 building data */}
            <div style={h2}>1 · Building data (from the live design)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={td}>Footprint</td><td style={tdR}>{input.lengthM.toFixed(2)} × {input.widthM.toFixed(2)} m</td>
                  <td style={td}>Eave height (floors × room ht)</td><td style={tdR}>{input.eaveHeightM.toFixed(2)} m</td>
                  <td style={td}>Roof rise</td><td style={tdR}>{input.roofRiseM.toFixed(2)} m</td>
                </tr>
                <tr>
                  <td style={td}>Floors</td><td style={tdR}>{input.floors}</td>
                  <td style={td}>Built-up / floor</td><td style={tdR}>{input.floorAreaSqm.toFixed(1)} m²</td>
                  <td style={td}>Dead weight (engine weight model)</td><td style={tdR}>{input.deadWeightKg.toLocaleString("en-IN")} kg</td>
                </tr>
                <tr>
                  <td style={td}>Column grid {gridEstimated ? "(ESTIMATED — enable Civil Work)" : "(civil foundation grid)"}</td>
                  <td style={tdR}>{input.gridCols} × {input.gridRows} = {input.gridCols * input.gridRows} columns</td>
                  <td style={td}>Foundation gravity / SBC check</td>
                  <td style={tdR} colSpan={3}>{civilResult ? "See Civil Work tab — footings F1/F2/F3 sized per tributary load vs SBC" : "—"}</td>
                </tr>
              </tbody>
            </table>

            {/* §2 loading */}
            <div style={h2}>2 · Technical loading — IS 875 (Parts 1 & 2)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Load</th><th style={{ ...th, textAlign: "right" }}>Value</th><th style={th}>Basis</th></tr></thead>
              <tbody>
                <tr><td style={td}>Dead load DL</td><td style={tdR}>{loading.deadKn.toFixed(1)} kN ({loading.deadPerSqmKn.toFixed(2)} kN/m²)</td><td style={td}>Actual material weights from the colony engine</td></tr>
                <tr><td style={td}>Live load — floors</td><td style={tdR}>{loading.liveFloorsKn.toFixed(1)} kN</td><td style={td}>{site.liveLoadFloorKn} kN/m² × {input.floorAreaSqm.toFixed(0)} m² × {input.floors} (IS 875-2, residential)</td></tr>
                <tr><td style={td}>Live load — roof</td><td style={tdR}>{loading.liveRoofKn.toFixed(1)} kN</td><td style={td}>{site.liveLoadRoofKn} kN/m² (non-accessible roof)</td></tr>
                <tr><td style={{ ...td, fontWeight: 700 }}>Total gravity</td><td style={{ ...tdR, fontWeight: 700 }}>{loading.totalGravityKn.toFixed(1)} kN</td><td style={td}>DL + LL</td></tr>
                {loading.combos.map((c) => (
                  <tr key={c.label}><td style={td}>Combination · {c.label}</td><td style={tdR}>{c.valueKn == null ? "lateral" : `${c.valueKn.toFixed(1)} kN`}</td><td style={td}>{c.basis}</td></tr>
                ))}
              </tbody>
            </table>

            {/* §3 wind */}
            <div style={h2}>3 · Wind load — IS 875 (Part 3)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={td}>Vb {wind.vb} m/s</td><td style={td}>k1 = {wind.k1}</td><td style={td}>k2 = {wind.k2}</td>
                  <td style={td}>k3 = {wind.k3}</td><td style={td}>k4 = {wind.k4}</td>
                  <td style={{ ...td, fontWeight: 700 }}>Vz = {wind.vzMs} m/s</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>pz = 0.6·Vz² = {wind.pzKnSqm.toFixed(3)} kN/m²</td>
                </tr>
                <tr>
                  <td style={td} colSpan={3}>Walls: Cpe +{wind.cpeWindward} / {wind.cpeLeeward} ⇒ net {wind.netWallCoeff}</td>
                  <td style={td} colSpan={2}>Cpi = ±{wind.cpi} ({site.openingsPercent}% openings)</td>
                  <td style={td} colSpan={2}>Roof uplift coeff = 0.9 + Cpi = {wind.roofUpliftCoeff}</td>
                </tr>
                <tr>
                  <td style={td} colSpan={3}>Base shear, wind on long face: {wind.pzKnSqm.toFixed(3)} × {wind.netWallCoeff} × {wind.areaTransverseSqm} m²</td>
                  <td style={{ ...tdR, fontWeight: 700 }} colSpan={2}>{wind.baseShearTransverseKn.toFixed(1)} kN</td>
                  <td style={td}>Gable end:</td><td style={tdR}>{wind.baseShearLongitudinalKn.toFixed(1)} kN</td>
                </tr>
                <tr>
                  <td style={td} colSpan={3}>Roof uplift (worst slope, full plan): {wind.pzKnSqm.toFixed(3)} × {wind.roofUpliftCoeff} × {(input.lengthM * input.widthM).toFixed(1)} m²</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "#dc2626" }} colSpan={2}>{wind.roofUpliftKn.toFixed(1)} kN ↑</td>
                  <td style={td} colSpan={2}>Governs the hold-down design</td>
                </tr>
              </tbody>
            </table>

            {/* §4 stability */}
            <div style={h2}>4 · Stability — rigid body, 0.9·DL restoring, target FoS 1.5</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Check</th><th style={{ ...th, textAlign: "right" }}>Demand</th><th style={{ ...th, textAlign: "right" }}>Resistance</th><th style={{ ...th, textAlign: "right" }}>FoS</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {stability.map((s) => (
                  <tr key={s.label}>
                    <td style={td}>{s.label}</td>
                    <td style={tdR}>{s.demand.toFixed(1)} {s.unit}</td>
                    <td style={tdR}>{s.resistance.toFixed(1)} {s.unit}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{Number.isFinite(s.fos) ? s.fos.toFixed(2) : "∞"} / {s.target}</td>
                    <td style={{ ...td, fontWeight: 700, color: s.ok ? "#15803d" : "#dc2626" }}>{s.ok ? "OK" : "ANCHORAGE REQUIRED"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* §5 anchorage */}
            <div style={h2}>5 · Hold-down anchorage {anchorage.required ? "— REQUIRED" : "— recommended good practice"}</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={td}>Columns × bolts</td><td style={tdR}>{anchorage.columns} × {anchorage.boltsPerColumn} = {anchorage.totalBolts} bolts</td>
                  <td style={td}>Demand / bolt</td><td style={tdR}>{anchorage.tensionPerBoltKn.toFixed(2)} kN T + {anchorage.shearPerBoltKn.toFixed(2)} kN V</td>
                </tr>
                <tr>
                  <td style={{ ...td, fontWeight: 700 }}>Recommended</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{anchorage.recommendedBolt}</td>
                  <td style={td}>Safe {anchorage.boltSafeTensionKn} kN T / {anchorage.boltSafeShearKn} kN V</td>
                  <td style={{ ...tdR, fontWeight: 700, color: anchorage.utilisation <= 1 ? "#15803d" : "#dc2626" }}>Utilisation {anchorage.utilisation.toFixed(2)} ≤ 1</td>
                </tr>
              </tbody>
            </table>

            {/* §6 connections */}
            <div style={h2}>6 · Connection schedule</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Connection</th><th style={th}>Detail</th><th style={th}>Specification</th></tr></thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.item}>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{c.item}</td>
                    <td style={td}>{c.detail}</td>
                    <td style={td}>{c.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* §7 warnings + method */}
            {warnings.length > 0 && (
              <>
                <div style={h2}>7 · Warnings</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {warnings.map((w) => <li key={w} style={{ fontSize: 11, color: "#b45309" }}>{w}</li>)}
                </ul>
              </>
            )}
            <div style={h2}>{warnings.length > 0 ? "8" : "7"} · Method & limits</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {disclaimers.map((d) => <li key={d} style={{ fontSize: 10, color: "#64748b" }}>{d}</li>)}
            </ul>
          </div>

          {/* sign-off — the certificate happens HERE, on paper, by a person */}
          <div className="cabin-drawing-block" style={{ marginTop: 16, border: "1.5px solid #0f172a", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Certification (to be completed by the licensed structural engineer)</div>
            <p style={{ fontSize: 10, color: "#475569", margin: "4px 0 10px" }}>
              I have independently verified the loading, wind analysis, stability checks and anchorage of the structure described above,
              including the site soil report and final drawings, and certify its structural stability subject to the conditions noted.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {["Name & qualification", "Registration / licence no.", "Date"].map((f) => (
                <div key={f}>
                  <div style={{ borderBottom: "1px solid #0f172a", height: 26 }} />
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{f}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ borderBottom: "1px solid #0f172a", height: 26 }} />
                <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Signature</div>
              </div>
              <div style={{ width: 110, height: 80, border: "1.5px dashed #94a3b8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8" }}>
                SEAL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
