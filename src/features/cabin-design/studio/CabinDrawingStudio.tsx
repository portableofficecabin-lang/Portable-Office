"use client";

/**
 * CABIN DRAWING STUDIO — the admin panel that hosts the whole upgrade (spec §1–§8).
 *
 * One additive surface mounted under the calculator (behind adminTools). It builds the shared model
 * once from the live CabinConfig and drives, from that single source of truth:
 *   • the 2D engineering sheet set (+ drawing-set PDF export with a CAD title block),
 *   • the interactive 3D model + exploded assembly animation,
 *   • the component inspector (click a part in 2D or 3D — selection is shared),
 *   • save / re-open of designs (localStorage-first, best-effort Supabase),
 *   • a Customer ⇄ Engineering view-mode switch.
 *
 * Dynamically imported (ssr:false) by CabinCalculator, and the heavy 3D island is further lazy so
 * three.js only loads when the 3D tab is opened. Nothing existing is modified.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Boxes, FileBarChart, FolderOpen, Layers, Loader2, Ruler, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinDrawingMeta, CabinModel, CabinPart, ViewMode } from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { buildCabinModel } from "@/features/cabin-design/model/cabinModel";
import { boqForPart } from "@/features/cabin-design/inspector/boqLink";
import { ComponentInspector } from "@/features/cabin-design/inspector/ComponentInspector";
import { EngineeringSheets } from "@/features/cabin-design/drawing/EngineeringSheets";
import { DrawingSetSheet } from "@/features/cabin-design/export/DrawingSetSheet";
import { ManufacturingReport } from "@/features/cabin-design/export/ManufacturingReport";
import { ReportBar } from "@/features/cabin-design/export/ReportBar";
import {
  deleteDesign, listDesigns, newDesignId, saveDesign, type CabinDesignRecord,
} from "@/lib/quotation/cabinDesignStore";

const Cabin3DLoader = dynamic(() => import("@/features/cabin-design/viewer3d/Cabin3DLoader"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading 3D viewer…
    </div>
  ),
});

export interface CabinDrawingStudioProps {
  config: CabinConfig;
  /** Restore a saved design's config into the calculator. */
  onLoadConfig?: (config: CabinConfig) => void;
  /** Live estimate total, stored with a saved design for the list. */
  estimateTotal?: number;
  /** Live priced BOQ (lifted from CabinBoqPanel) — powers the inspector + reports (spec §2/§5). */
  boqResult?: BoqResult | null;
}

export function CabinDrawingStudio({ config, onLoadConfig, estimateTotal, boqResult }: CabinDrawingStudioProps) {
  // Geometry key excludes BOQ pricing (overrides/rates/charges) so a Material Master rate change
  // recomputes the BOQ WITHOUT rebuilding the model geometry (spec §5 + §8). Norms + boqOptions,
  // which DO change the frame, stay in the key.
  const geomKey = useMemo(
    () => JSON.stringify({ ...config, boq: config.boq ? { norms: config.boq.norms } : undefined }),
    [config],
  );
  // Rebuild geometry only when the geometry key changes. A ref cache keyed on geomKey lets this memo
  // honestly depend on `config` (satisfying exhaustive-deps with no rule suppression) while returning
  // the SAME model object when only pricing changed — so a Material Master rate change never rebuilds
  // geometry (spec §5 + §8).
  const modelCache = useRef<{ key: string; model: CabinModel } | null>(null);
  const model = useMemo(() => {
    if (modelCache.current && modelCache.current.key === geomKey) return modelCache.current.model;
    const built = buildCabinModel(config);
    modelCache.current = { key: geomKey, model: built };
    return built;
  }, [config, geomKey]);

  const boqLookup = useCallback((part: CabinPart) => boqForPart(part, boqResult), [boqResult]);

  const [viewMode, setViewMode] = useState<ViewMode>("engineering");
  const [tab, setTab] = useState<"2d" | "3d" | "reports">("2d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPart = selectedId ? model.parts.find((p) => p.id === selectedId) ?? null : null;

  // drawing register (title block)
  const [customerName, setCustomerName] = useState("");
  const [drawnBy, setDrawnBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })); }, []);

  const [designs, setDesigns] = useState<CabinDesignRecord[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designNumber, setDesignNumber] = useState<string | undefined>(undefined);

  const refreshList = useCallback(async () => {
    const { designs } = await listDesigns();
    setDesigns(designs);
  }, []);
  useEffect(() => { void refreshList(); }, [refreshList]);

  const drawingMeta: CabinDrawingMeta = useMemo(() => ({
    projectName: model.meta.title,
    customerName: customerName || undefined,
    drawingNumber: designNumber ?? "CBN-DWG-001",
    revision: "R0",
    date: today,
    scale: "NTS",
    drawnBy: drawnBy || undefined,
    checkedBy: checkedBy || undefined,
    approvedBy: approvedBy || undefined,
  }), [model.meta.title, customerName, designNumber, today, drawnBy, checkedBy, approvedBy]);

  const onSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const record: CabinDesignRecord = {
        id: newDesignId(),
        createdAt: now,
        updatedAt: now,
        meta: {
          title: model.meta.title,
          productId: config.productId,
          customerName: customerName || undefined,
          status: "draft",
          totalAmount: estimateTotal,
        },
        config,
        drawingMeta,
      };
      const { remote } = await saveDesign(record);
      await refreshList();
      toast({ title: "Design saved", description: remote ? "Saved for the team." : "Saved on this device (Supabase table not applied yet)." });
    } finally {
      setSaving(false);
    }
  };

  const onLoad = (d: CabinDesignRecord) => {
    onLoadConfig?.(d.config);
    setDesignNumber(d.designNumber);
    setCustomerName(d.meta.customerName ?? "");
    toast({ title: "Design loaded", description: `${d.meta.title}${d.designNumber ? ` · ${d.designNumber}` : ""}` });
  };
  const onDelete = async (d: CabinDesignRecord) => {
    await deleteDesign(d.id);
    await refreshList();
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-accent" />
          <div>
            <h3 className="text-lg font-bold leading-tight">Drawings, 3D &amp; Exploded View</h3>
            <p className="text-xs text-muted-foreground">Every view is generated from the live calculator dimensions — {model.meta.title}, {model.meta.rooms} room(s), {model.meta.roofType} roof.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* mode toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["engineering", "customer"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium", viewMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}>
                {m === "engineering" ? <Ruler className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {m === "engineering" ? "Engineering" : "Customer"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSaved((v) => !v)}>
            <FolderOpen className="h-3.5 w-3.5" /> Saved ({designs.length})
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save design
          </Button>
        </div>
      </div>

      {/* saved designs */}
      {showSaved && (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          {designs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved designs yet. Use “Save design” to store the current cabin.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {designs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{d.meta.title}{d.designNumber ? ` · ${d.designNumber}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{d.meta.customerName || "—"} · {new Date(d.updatedAt).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => onLoad(d)}>Load</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onDelete(d)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* tabs */}
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {([["2d", "2D Engineering"], ["3d", "3D & Exploded"], ["reports", "Reports & Manufacturing"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium", tab === id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}>
            {id === "2d" ? <Layers className="h-3.5 w-3.5" /> : id === "3d" ? <Boxes className="h-3.5 w-3.5" /> : <FileBarChart className="h-3.5 w-3.5" />} {label}
          </button>
        ))}
      </div>

      {tab === "2d" ? (
        <div className="space-y-3">
          {/* title-block details */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Customer", value: customerName, set: setCustomerName },
              { label: "Drawn by", value: drawnBy, set: setDrawnBy },
              { label: "Checked by", value: checkedBy, set: setCheckedBy },
              { label: "Approved by", value: approvedBy, set: setApprovedBy },
            ].map((f) => (
              <label key={f.label} className="text-xs text-muted-foreground">
                {f.label}
                <input value={f.value} onChange={(e) => f.set(e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" placeholder="—" />
              </label>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
            <DrawingSetSheet meta={drawingMeta}>
              <EngineeringSheets model={model} config={config} viewMode={viewMode} boqResult={boqResult} selectedId={selectedId} onSelect={setSelectedId} />
            </DrawingSetSheet>
            <div className="space-y-3">
              <ComponentInspector part={selectedPart} boq={selectedPart ? boqLookup(selectedPart) : null} onClose={() => setSelectedId(null)} />
              {boqResult && (
                <div className="rounded-xl border border-border bg-background p-3 text-sm">
                  <div className="mb-1 font-semibold">Material summary</div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Total weight</span><span className="font-medium">{boqResult.totals.totalWeightKg.toFixed(0)} kg ({boqResult.totals.totalTonnes.toFixed(2)} t)</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Material cost</span><span className="font-medium">₹ {Math.round(boqResult.totals.materialAmount).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Grand total</span><span className="font-medium">₹ {Math.round(boqResult.totals.grandTotal).toLocaleString("en-IN")}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">Live from the Material BOQ panel below. Sale price is set by the estimate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : tab === "3d" ? (
        <Cabin3DLoader model={model} viewMode={viewMode} boqLookup={boqLookup} selectedId={selectedId} onSelectPart={setSelectedId} />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold">Reports (live from the Material BOQ)</div>
            <ReportBar boqResult={boqResult} title={model.meta.title} />
            <p className="mt-2 text-xs text-muted-foreground">
              Engineering &amp; customer drawing PDFs are on the 2D tab (they follow the {viewMode} view-mode toggle).
              The 3D image export is on the 3D tab.
            </p>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">Manufacturing outputs</div>
            <div className="light rounded-xl border border-border p-4" style={{ background: "#ffffff" }}>
              <ManufacturingReport boqResult={boqResult} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
