"use client";

/**
 * LABOUR COLONY ENGINEERING STUDIO — the admin surface that hosts the whole detailing system.
 *
 * One ADDITIVE tab on the Labour Colony calculator. It builds the shared structural model ONCE from
 * the live calculation + the two priced BOQs, and drives everything from that single source of truth:
 *   • the 2D fabrication drawing set (framing plans, foundation layout, column grid, elevations,
 *     connection details, title block) + a drawing-set PDF export,
 *   • the Tekla-style interactive 3D model (layers, part marks, section cut, x-ray/wireframe, exploded),
 *   • the step-by-step assembly animation + video export,
 *   • the fabrication reports/schedules (member, cutting, bolt/nut/washer, plate, weld, connection,
 *     truss, staircase, footing, weight, dispatch),
 *   • the dual-source component inspector (steel → Material BOQ, foundation → Civil BOQ).
 *
 * GEOMETRY vs PRICE: the model is cached on a `geomKey` built from the CONFIG geometry, the civil
 * substructure geometry, each member's CHOSEN SECTION (materialKey) and each member's PRICED PIECE
 * COUNT — but NOT rates/wastage/charges. So a rate change re-prices without rebuilding geometry,
 * while a section swap, spacing/quantity change or engineering-config change rebuilds correctly.
 *
 * STALE BOQ: the priced BOQ is produced by a panel inside the (unmounted-when-closed) Material BOQ
 * tab, so it can lag behind a config edit made elsewhere. When it does, the studio refuses to blend
 * the two — it drops the resolvers, rebuilds purely from the live take-off, and says so in a banner.
 *
 * Nothing existing is modified. Dynamically imported (ssr:false) by LabourColonyQuotation, and the two
 * WebGL islands are lazier still so three.js only loads when those tabs are opened.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Boxes, FileBarChart, Film, Layers, Loader2, Ruler, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoqResult } from "@/lib/boq/types";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "@/features/labour-colony-studio/model/colonyModel";
import { parseSectionFromSpec, type SectionDims } from "@/features/labour-colony-studio/model/sectionDims";
import type { ColonyDrawingMeta, ColonyModel, ViewMode } from "@/features/labour-colony-studio/model/types";
import { ComponentInspector } from "@/features/labour-colony-studio/inspector/ComponentInspector";
import { EngineeringSheets } from "@/features/labour-colony-studio/drawing/EngineeringSheets";
import { ManufacturingReport } from "@/features/labour-colony-studio/reports/ManufacturingReport";
import { ReportBar } from "@/features/labour-colony-studio/reports/ReportBar";
import { StudioTabBoundary } from "./StudioTabBoundary";

const LoadingBox = ({ label }: { label: string }) => (
  <div className="flex h-[clamp(360px,60vh,640px)] items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {label}
  </div>
);

const Colony3DLoader = dynamic(
  () => import("@/features/labour-colony-studio/viewer3d/Colony3DLoader").then((m) => m.Colony3DLoader),
  { ssr: false, loading: () => <LoadingBox label="Loading 3D model…" /> },
);

const AssemblyVideoLoader = dynamic(
  () => import("@/features/labour-colony-studio/animation/AssemblyVideoLoader").then((m) => m.AssemblyVideoLoader),
  { ssr: false, loading: () => <LoadingBox label="Loading assembly animation…" /> },
);

export interface ColonyDrawingStudioProps {
  /** The live labour-colony calculation (geometry + sections source). */
  result: LabourColonyResult;
  /** The priced civil substructure — foundation members resolve against this. Null when civil is off. */
  civil?: CivilWorkResult | null;
  /** The live priced Material BOQ (lifted from ColonyBoqPanel) — steel members resolve against this. */
  boqResult?: BoqResult | null;
  /** Title-block seed from the project meta. */
  projectName?: string;
  clientName?: string;
  location?: string;
}

type StudioTab = "2d" | "3d" | "reports" | "video";

export function ColonyDrawingStudio({
  result, civil = null, boqResult = null, projectName, clientName, location,
}: ColonyDrawingStudioProps) {
  /* ---- LIVE SECTION RESOLVER — the real cross-section each member is PRICED with ------------- */
  const sectionByLine = useMemo(() => {
    const map = new Map<string, SectionDims | null>();
    for (const l of boqResult?.lines ?? []) {
      if (l.cutLengthM != null) map.set(l.id, parseSectionFromSpec(l.spec));
    }
    return map;
  }, [boqResult]);
  const resolveSection = useCallback((id: string) => sectionByLine.get(id) ?? null, [sectionByLine]);

  /* ---- LIVE QUANTITY RESOLVER — the PRICED piece count (incl. manual override / lock) --------- */
  const qtyByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of boqResult?.lines ?? []) {
      if (l.cutLengthM != null && l.pieces != null) map.set(l.id, l.pieces);
    }
    return map;
  }, [boqResult]);
  const resolveQty = useCallback((id: string) => qtyByLine.get(id) ?? null, [qtyByLine]);

  /* ---- geometry signature: sections + piece counts, but NEVER rates ------------------------- */
  const sectionSig = useMemo(
    () => (boqResult?.lines ?? []).filter((l) => l.cutLengthM != null).map((l) => `${l.id}=${l.materialKey}`).join(","),
    [boqResult],
  );
  const qtySig = useMemo(
    () => (boqResult?.lines ?? []).filter((l) => l.cutLengthM != null).map((l) => `${l.id}=${l.pieces}`).join(","),
    [boqResult],
  );
  /** The civil substructure geometry that positions the foundation + the column grid. */
  const civilSig = useMemo(() => {
    const f = civil?.foundation;
    if (!f) return "none";
    return JSON.stringify({
      xs: f.grid?.xsM, ys: f.grid?.ysM,
      sec: f.section,
      ft: (f.footingTypes ?? []).map((t) => `${t.mark}:${t.sideM}:${t.depthM}:${t.count}`),
    });
  }, [civil]);
  const configSig = useMemo(() => JSON.stringify(result.config), [result.config]);

  /* ---- STALENESS GUARD — the priced BOQ can silently belong to a PREVIOUS colony -------------
   * `boqResult` is produced by ColonyBoqPanel, which lives inside the Material BOQ tab, and tab
   * content is UNMOUNTED while that tab is closed. So editing capacity or room size on the
   * Structure tab and coming straight here leaves `boqResult` pinned to the old colony while the
   * geometry below has already moved on — the resolvers would then paint the previous colony's
   * sections and piece counts onto the new grid and present them as priced fact.
   *
   * Two independent checks, because neither alone is sufficient:
   *   1. configSig vs. accepted — a ref records the configSig that was in force when each NEW
   *      `boqResult` identity arrived. A configSig change with an unchanged boqResult identity is
   *      exactly the "config edited, never re-priced" signature. This catches EVERY config edit,
   *      including room dimensions, which TakeoffMeta cannot express without re-deriving the
   *      take-off's own internals (lengthM/widthM are computed from external wall runs, not read
   *      off `result`).
   *   2. TakeoffMeta vs. result — covers the FIRST render, where a boqResult already present on
   *      mount is accepted at face value by (1) because there is no earlier configSig to compare
   *      it against. Only meta fields the take-off reads STRAIGHT off `result` are compared, so
   *      this recomputes nothing.
   * When stale we withhold the resolvers entirely rather than mix two colonies — buildColonyModel
   * then falls back to its own take-off, which is always self-consistent — and we say so plainly. */
  const acceptedBoq = useRef<BoqResult | null>(null);
  const acceptedConfigSig = useRef<string | null>(null);
  if (acceptedBoq.current !== boqResult) {
    // Render-phase derived state: a new boqResult identity means ColonyBoqPanel has just re-priced,
    // so the config in force right now is the config it was priced against.
    acceptedBoq.current = boqResult;
    acceptedConfigSig.current = boqResult ? configSig : null;
  }
  const boqMetaMismatch = useMemo(() => {
    const m = boqResult?.meta;
    if (!m) return false;
    return (
      m.source !== "colony"
      || m.rooms !== result.occupancy.rooms
      || m.modules !== result.structural.modules
      || m.floors !== Math.max(1, result.config.floors)
    );
  }, [boqResult, result.occupancy.rooms, result.structural.modules, result.config.floors]);
  const boqStale = boqResult != null && (acceptedConfigSig.current !== configSig || boqMetaMismatch);

  /* `boqStale` joins the key so that clearing staleness rebuilds even when the fresh BOQ happens to
   * land on identical sections and piece counts — otherwise the cached take-off fallback would be
   * served while the banner claims the priced BOQ is linked. */
  const geomKey = useMemo(
    () => [configSig, civilSig, sectionSig, qtySig, boqStale ? "stale" : "priced"].join("|"),
    [configSig, civilSig, sectionSig, qtySig, boqStale],
  );

  /* ---- build the model once per geometry change (a rate change reuses the cached model) ------ */
  const modelCache = useRef<{ key: string; model: ColonyModel } | null>(null);
  const model = useMemo(() => {
    if (modelCache.current && modelCache.current.key === geomKey) return modelCache.current.model;
    // Stale BOQ ⇒ no resolvers, so the model derives sections and counts from its own take-off of
    // the CURRENT result instead of half-adopting the previous colony's priced values.
    const built = buildColonyModel(
      { result, civil, columnGrid: null },
      boqStale ? {} : { resolveSection, resolveQty },
    );
    modelCache.current = { key: geomKey, model: built };
    return built;
  }, [geomKey, result, civil, resolveSection, resolveQty, boqStale]);

  /* ---- studio state ------------------------------------------------------------------------- */
  const [viewMode, setViewMode] = useState<ViewMode>("engineering");
  const [tab, setTab] = useState<StudioTab>("2d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPart = useMemo(
    () => (selectedId ? model.parts.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, model],
  );

  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [drawnBy, setDrawnBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [customer, setCustomer] = useState(clientName ?? "");
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  const drawingMeta: ColonyDrawingMeta = useMemo(() => ({
    projectName: projectName || result.config.projectName || model.meta.projectName || "Labour Colony",
    clientName: customer || undefined,
    location: location || result.config.location || undefined,
    drawingNumber: "LC-STR-001",
    revision: "R0",
    date: today,
    scale: "NTS",
    drawnBy: drawnBy || undefined,
    checkedBy: checkedBy || undefined,
    approvedBy: approvedBy || undefined,
    status: "NOT FOR CONSTRUCTION",
  }), [projectName, result.config.projectName, result.config.location, model.meta.projectName, customer, location, today, drawnBy, checkedBy, approvedBy]);

  const partCount = model.parts.length;
  const steelParts = useMemo(() => model.parts.filter((p) => p.boqSource === "steel").length, [model]);

  return (
    <div className="space-y-4">
      {/* ---------------- header ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-amber" />
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">Engineering Detailing, 3D &amp; Assembly</h3>
            <p className="text-xs text-muted-foreground">
              {model.meta.title} · {model.meta.rooms} rooms · grid {model.meta.gridRef} · {partCount.toLocaleString("en-IN")} modelled
              components ({steelParts.toLocaleString("en-IN")} {boqStale ? "structural" : "priced from the Material BOQ"}). Every
              view is generated from the live calculator geometry and{" "}
              {boqStale ? "the live take-off (priced BOQ out of date)" : "the priced BOQ"}.
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["engineering", "customer"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium",
                viewMode === m ? "bg-amber text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "engineering" ? <Ruler className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {m === "engineering" ? "Engineering" : "Customer"}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- stale priced BOQ (non-blocking) ---------------- */}
      {boqStale && (
        <div className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Priced BOQ is out of date — showing take-off values</div>
            <p className="mt-0.5 text-xs">
              The colony configuration changed after the Material BOQ was last priced, so the priced sections and piece
              counts belong to the previous colony. Every section, quantity and schedule below is currently derived from
              the live take-off rather than the priced BOQ. Re-open the{" "}
              <span className="font-medium">Material BOQ</span> tab to re-price, then return here — the drawings, 3D
              model and schedules will switch back to the priced values automatically.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- model warnings (deterministic engineering warnings) ---------------- */}
      {model.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="mb-1 font-semibold">Engineering warnings ({model.warnings.length})</div>
          <ul className="list-inside list-disc space-y-0.5 text-xs">
            {model.warnings.slice(0, 6).map((w, i) => (
              <li key={i}>{w.message}{w.memberId ? ` (${w.memberId})` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- tabs ---------------- */}
      <div className="inline-flex flex-wrap rounded-lg border border-border p-0.5">
        {([
          ["2d", "2D Fabrication Drawings", <Layers key="a" className="h-3.5 w-3.5" />],
          ["3d", "3D & Exploded", <Boxes key="b" className="h-3.5 w-3.5" />],
          ["reports", "Reports & Schedules", <FileBarChart key="c" className="h-3.5 w-3.5" />],
          ["video", "Assembly Video", <Film key="d" className="h-3.5 w-3.5" />],
        ] as const).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id as StudioTab)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
              tab === id ? "bg-amber text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ---------------- 2D ---------------- */}
      {tab === "2d" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["Client", customer, setCustomer],
              ["Drawn by", drawnBy, setDrawnBy],
              ["Checked by", checkedBy, setCheckedBy],
              ["Approved by", approvedBy, setApprovedBy],
            ] as const).map(([label, value, set]) => (
              <label key={label} className="text-xs text-muted-foreground">
                {label}
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  placeholder="—"
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <StudioTabBoundary label="fabrication drawings">
              <div ref={sheetRef} className="light overflow-x-auto rounded-xl border border-border" style={{ background: "#ffffff" }}>
                <EngineeringSheets
                  model={model}
                  result={result}
                  civil={civil}
                  meta={drawingMeta}
                  viewMode={viewMode}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </StudioTabBoundary>
            <div className="space-y-3">
              <ComponentInspector part={selectedPart} boqResult={boqResult} civil={civil} onClose={() => setSelectedId(null)} />
              <ReportBar
                model={model}
                boqResult={boqResult}
                civil={civil}
                result={result}
                meta={drawingMeta}
                sheetRef={sheetRef}
              />
            </div>
          </div>
        </div>
      ) : tab === "3d" ? (
        /* ---------------- 3D ---------------- */
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <StudioTabBoundary label="3D model">
            <Colony3DLoader model={model} selectedId={selectedId} onSelect={setSelectedId} />
          </StudioTabBoundary>
          <ComponentInspector part={selectedPart} boqResult={boqResult} civil={civil} onClose={() => setSelectedId(null)} />
        </div>
      ) : tab === "reports" ? (
        /* ---------------- reports ---------------- */
        <div className="space-y-4">
          {/* No sheetRef here: the drawing container is mounted only under the 2D tab, so on this tab
              the ref is always null. Passing it would render a PDF button that can never work; omitting
              it makes ReportBar disable the button and point the admin at the 2D tab instead. */}
          <ReportBar model={model} boqResult={boqResult} civil={civil} result={result} meta={drawingMeta} />
          {!boqResult && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Open the <span className="font-medium">Material BOQ</span> tab once to price the structure — the schedules then
              show live material, weight and cost against every member. Geometry-only schedules work already.
            </div>
          )}
          <StudioTabBoundary label="reports">
            <div className="light rounded-xl border border-border p-4" style={{ background: "#ffffff" }}>
              <ManufacturingReport model={model} boqResult={boqResult} civil={civil} result={result} meta={drawingMeta} />
            </div>
          </StudioTabBoundary>
        </div>
      ) : (
        /* ---------------- assembly video ---------------- */
        <StudioTabBoundary label="assembly animation">
          <AssemblyVideoLoader
            model={model}
            boqResult={boqResult}
            viewMode={viewMode}
            projectName={drawingMeta.projectName}
            customerName={customer || undefined}
            selectedId={selectedId}
            onSelectPart={setSelectedId}
          />
        </StudioTabBoundary>
      )}
    </div>
  );
}

export default ColonyDrawingStudio;
