"use client";

/**
 * PUF PANEL BOTTOM LOCKING SYSTEM — the admin configuration tab.
 *
 * The editable front end for the engineering core in
 * `@/features/labour-colony-studio/model/pufLock`. It configures the base plate, the anchor / fixing
 * assembly, the paired C-purlins and the PUF-panel interface, then shows the LIVE consequences:
 * validation issues, the take-off, and the 16-step erection method statement.
 *
 * SINGLE SOURCE OF TRUTH. This component computes NO engineering value of its own. Every number on
 * screen — the pocket clear width, the unit weights, the piece counts, the weld length, the warnings
 * — comes out of `derivePufLock(config.pufLock, ctx)`. In particular the receiving-pocket width is
 * only ever read from `pocketClearGapMm(iface)`; nothing here re-derives it. That is what keeps the
 * tab, the 3D model, the detail sheets and the BOQ schedules from ever disagreeing.
 *
 * PERSISTENCE. The configuration lives at `LabourColonyConfig.pufLock` (optional jsonb — no
 * migration). It is always read back through `resolvePufLockConfig`, which deep-merges a stored
 * (possibly older or partial) config over the shipped defaults, so a project saved before a field
 * existed still loads.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Anchor, Bookmark, CheckCircle2, Grid3x3, Layers3, ListOrdered, Lock, Ruler,
  Save, Trash2, Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/admin/NumberInput";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { PufLockPlateEditor } from "./PufLockPlateEditor";
import type { LabourColonyConfig } from "@/lib/quotation/labourColony";
import {
  assemblyCallout,
  derivePufLock,
  isPanelWall,
  plateUnitWeightKg,
  pocketClearGapMm,
  pufLockMethodSteps,
  purlinKgPerM,
  resolvePufLockConfig,
  PUF_LOCK_DRAWING_NOTES,
  PUF_LOCK_EXPLANATION,
  PUF_PANEL_THICKNESS_OPTIONS,
  type CPurlinOrientation,
  type PufAnchorType,
  type PufLockConfig,
  type PufLockContext,
  type PufPlateLocationMode,
  type PufWeldType,
} from "@/features/labour-colony-studio/model/pufLock";
import { buildPufLockLayoutSummary } from "@/features/labour-colony-studio/reports/pufLockSchedules";

/* ------------------------------------------------------------------ option catalogues ---------- */

const MODE_LABELS: { id: PufPlateLocationMode; label: string; hint: string }[] = [
  {
    id: "auto-beam",
    label: "Automatic — spread along the perimeter plinth beams",
    hint: "The plate quantity is apportioned across the four perimeter runs in proportion to their length, then spaced evenly inside each run, clear of the corner columns.",
  },
  {
    id: "grid-intersection",
    label: "One plate at every grid intersection",
    hint: "One plate per column-grid intersection. This normally clashes with the column base plates and produces more plates than a wall-panel layout needs.",
  },
  {
    id: "panel-joint",
    label: "One plate at every wall-panel joint",
    hint: "Uses the project's wall-panel joint schedule. Falls back to the automatic layout when no joint schedule is supplied.",
  },
  {
    id: "custom-spacing",
    label: "Fixed centre-to-centre spacing",
    hint: "Plates at a constant spacing along every perimeter run. The resulting quantity follows the spacing, not the plate-quantity field.",
  },
  {
    id: "manual",
    label: "Manual — exactly the plates placed in the editor",
    hint: "Nothing is derived. The plate list below is the layout, and it survives every rebuild.",
  },
];

/**
 * The C-purlin sections that already exist in the Material Master, so the rate resolves out of the
 * box (see `seedMaterials.ts`). Web, flange and thickness mirror those seeded sections; the lip is
 * the standard return for a lipped C and, like every other field here, stays editable.
 */
const PURLIN_SECTIONS: {
  materialKey: string;
  designation: string;
  depthMm: number;
  flangeMm: number;
  lipMm: number;
  thicknessMm: number;
}[] = [
  { materialKey: "c-purlin-75x40", designation: "C 75 × 40 × 15 × 2.0 mm", depthMm: 75, flangeMm: 40, lipMm: 15, thicknessMm: 2.0 },
  { materialKey: "c-purlin-100x50", designation: "C 100 × 50 × 20 × 2.0 mm", depthMm: 100, flangeMm: 50, lipMm: 20, thicknessMm: 2.0 },
  { materialKey: "c-purlin-125x50", designation: "C 125 × 50 × 20 × 2.0 mm", depthMm: 125, flangeMm: 50, lipMm: 20, thicknessMm: 2.0 },
  { materialKey: "c-purlin-150x65", designation: "C 150 × 65 × 20 × 2.5 mm", depthMm: 150, flangeMm: 65, lipMm: 20, thicknessMm: 2.5 },
];
const CUSTOM_SECTION = "__custom__";

const ANCHOR_TYPES: { id: PufAnchorType; label: string }[] = [
  { id: "cast-in", label: "Cast-in (set before the pour)" },
  { id: "chemical", label: "Chemical (resin-bonded)" },
  { id: "mechanical", label: "Mechanical expansion" },
];

const ORIENTATIONS: { id: CPurlinOrientation; label: string }[] = [
  { id: "webs-inward", label: "Webs inward — flanges turned away from the panel" },
  { id: "flanges-inward", label: "Flanges inward — narrower bearing on the panel" },
];

const WELD_TYPES: { id: PufWeldType; label: string }[] = [
  { id: "fillet", label: "Fillet" },
  { id: "groove", label: "Groove" },
];

/* ------------------------------------------------------------------ preset store --------------- */

/**
 * PUF-lock presets — a NEW, dedicated localStorage key. Deliberately separate from the BOQ preset
 * store (`poc_boq_presets_v1`) so the two can never overwrite one another.
 *
 * Load is DEFENSIVE, mirroring templateStore.ts: the shipped defaults sit UNDER the stored data via
 * `resolvePufLockConfig`, so a preset saved before a field existed still applies cleanly instead of
 * writing `undefined` into the project.
 */
const PRESETS_KEY = "poc_puf_lock_presets_v1";

interface PufLockPreset {
  id: string;
  name: string;
  updatedAt: string;
  data: PufLockConfig;
}

function loadPresets(): PufLockPreset[] {
  try {
    if (typeof window === "undefined") return [];
    const parsed: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const out: PufLockPreset[] = [];
    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const rec = raw as Record<string, unknown>;
      if (typeof rec.id !== "string" || !rec.id) continue;
      out.push({
        id: rec.id,
        name: typeof rec.name === "string" && rec.name ? rec.name : "Untitled PUF-lock preset",
        updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : "",
        data: resolvePufLockConfig(rec.data as Partial<PufLockConfig> | undefined),
      });
    }
    return out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function savePresets(list: PufLockPreset[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — the project config itself is unaffected */
  }
}

function newPresetId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `pufl-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/* ------------------------------------------------------------------ component ------------------ */

export function PufLockTab({
  config,
  onChange,
  ctx,
}: {
  config: LabourColonyConfig;
  onChange: (c: LabourColonyConfig) => void;
  ctx: PufLockContext;
}) {
  /** The stored configuration, defaults merged in — the base every edit is written on top of. */
  const cfg = useMemo(() => resolvePufLockConfig(config.pufLock), [config.pufLock]);
  /** THE resolved bundle. Every live number on this page comes from here and nowhere else. */
  const derived = useMemo(() => derivePufLock(config.pufLock, ctx), [config.pufLock, ctx]);
  const live = derived.config;
  const t = derived.takeoff;
  const summary = useMemo(() => buildPufLockLayoutSummary(derived), [derived]);
  const steps = useMemo(() => pufLockMethodSteps(derived), [derived]);

  const [presets, setPresets] = useState<PufLockPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetMsg, setPresetMsg] = useState<string | null>(null);

  useEffect(() => setPresets(loadPresets()), []);

  /* ---------------- patch helpers ---------------- */
  const patch = useCallback(
    (p: Partial<PufLockConfig>) => onChange({ ...config, pufLock: { ...cfg, ...p } }),
    [config, cfg, onChange],
  );
  const patchPlate = (p: Partial<PufLockConfig["plate"]>) => patch({ plate: { ...cfg.plate, ...p } });
  const patchAnchor = (p: Partial<PufLockConfig["anchor"]>) => patch({ anchor: { ...cfg.anchor, ...p } });
  const patchPurlin = (p: Partial<PufLockConfig["purlin"]>) => patch({ purlin: { ...cfg.purlin, ...p } });
  const patchIface = (p: Partial<PufLockConfig["iface"]>) => patch({ iface: { ...cfg.iface, ...p } });
  const numOf = (v: string): number => Number(v) || 0;
  /** An override field is "unset" when it is blank / zero — never stored as a real 0 rate. */
  const optNum = (v: string): number | undefined => (Number(v) || 0) > 0 ? Number(v) : undefined;

  // The SAME predicate the core uses to pick the default enabled state, imported rather than
  // re-expressed here — a local copy would drift from the model builder and the BOQ.
  const panelWall = isPanelWall(config.panelType);
  const gridIntersections = ctx.grid.length;

  const sectionValue =
    PURLIN_SECTIONS.find((s) => s.materialKey === live.purlin.materialKey)?.materialKey ?? CUSTOM_SECTION;
  const isCustomSection = sectionValue === CUSTOM_SECTION;

  /** The panel thicknesses offered. The live value is always included even when it is off-catalogue. */
  const thicknessOptions = useMemo(() => {
    const set = [...PUF_PANEL_THICKNESS_OPTIONS] as number[];
    if (!set.includes(live.iface.panelThicknessMm)) set.push(live.iface.panelThicknessMm);
    return set.sort((a, b) => a - b);
  }, [live.iface.panelThicknessMm]);

  /* ---------------- presets ---------------- */
  const suggestedName = useMemo(() => {
    const L = Math.max(0, ctx.body.x1 - ctx.body.x0);
    const W = Math.max(0, ctx.body.y1 - ctx.body.y0);
    return `${t.plates}-Plate Paired C-Purlin PUF Lock — ${L.toFixed(1)} m × ${W.toFixed(1)} m Layout`;
  }, [t.plates, ctx.body]);

  const savePreset = () => {
    const name = (presetName || suggestedName).trim();
    if (!name) return;
    const rec: PufLockPreset = { id: newPresetId(), name, updatedAt: new Date().toISOString(), data: live };
    const next = [rec, ...presets.filter((p) => p.name !== name)];
    setPresets(next);
    savePresets(next);
    setPresetName("");
    setPresetMsg(`Saved “${name}”.`);
  };

  const applyPreset = (id: string) => {
    const rec = presets.find((p) => p.id === id);
    if (!rec) return;
    // resolvePufLockConfig already ran at load time — the defaults are underneath the stored data
    patch(rec.data);
    setPresetMsg(`Applied “${rec.name}” — plate specification, anchors, C-purlins, interface and layout.`);
  };

  const deletePreset = (id: string) => {
    const rec = presets.find((p) => p.id === id);
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
    setPresetMsg(rec ? `Deleted “${rec.name}”.` : null);
  };

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-6">
      {/* ============ A. ENABLE ============ */}
      <AdminCard>
        <AdminCardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display font-bold">
              <Lock className="h-4 w-4 text-amber" /> PUF Panel Bottom Locking System
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Include in project</span>
              <Switch checked={live.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
            </div>
          </div>

          <p className="rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            {PUF_LOCK_EXPLANATION}
          </p>

          {!panelWall && (
            <p className="flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/5 p-3 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The project panel type is “{config.panelType}”. The bottom receiving pocket is designed
              for a PUF / EPS sandwich panel wall — switch the system off if this project has no panel
              wall to capture.
            </p>
          )}

          {live.enabled && (
            <p className="text-xs text-muted-foreground">
              {assemblyCallout(live)} · {t.plates} assemblies · pocket {t.pocketClearGapMm} mm clear for
              a {t.panelThicknessMm} mm panel.
            </p>
          )}
        </AdminCardContent>
      </AdminCard>

      {!live.enabled ? (
        <AdminCard>
          <AdminCardContent className="py-16 text-center text-muted-foreground">
            <Lock className="mx-auto mb-3 h-10 w-10 opacity-40" />
            The PUF panel bottom locking system is switched off. No plates, C-purlins, anchors or weld
            are taken off, and nothing is added to the drawings or the BOQ.
          </AdminCardContent>
        </AdminCard>
      ) : (
        <>
          {/* ============ B + C. QUANTITY & LOCATION MODE ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-5">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Grid3x3 className="h-4 w-4 text-amber" /> Plate quantity &amp; locations
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Total base plates">
                  <NumberInput value={cfg.plateCount} onChange={(e) => patch({ plateCount: Math.max(0, Math.round(numOf(e.target.value))) })} />
                </Field>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Lock quantity</Label>
                  <label className="flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md border border-input px-3">
                    <span className="text-xs text-muted-foreground">Honour exactly</span>
                    <Switch checked={cfg.plateCountLocked} onCheckedChange={(v) => patch({ plateCountLocked: v })} />
                  </label>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Plates placed (live)</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold">
                    {t.plates} · {summary.manualPlates} manual / {summary.autoPlates} auto
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                The column grid has <strong>{gridIntersections} intersection{gridIntersections === 1 ? "" : "s"}</strong>,
                but the plate quantity is independent of it — the plates carry the WALL PANELS, not the
                columns. The reference project uses 12 plates on a grid with 15 intersections. With
                “Lock quantity” on, the automatic layout must hit the quantity above exactly.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Plate location mode">
                  <Select value={cfg.mode} onValueChange={(v) => patch({ mode: v as PufPlateLocationMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODE_LABELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {cfg.mode === "custom-spacing" && (
                  <Field label="Centre-to-centre spacing (m)">
                    <NumberInput step={0.05} value={cfg.spacingM} onChange={(e) => patch({ spacingM: Math.max(0.3, numOf(e.target.value)) })} />
                  </Field>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {MODE_LABELS.find((m) => m.id === cfg.mode)?.hint}
              </p>
            </AdminCardContent>
          </AdminCard>

          {/* ============ PLATE-POSITION EDITOR ============ */}
          <PufLockPlateEditor
            config={cfg}
            positions={derived.positions}
            issues={derived.issues}
            ctx={ctx}
            onChange={(next) => onChange({ ...config, pufLock: next })}
          />

          {/* ============ D. BASE PLATE ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Layers3 className="h-4 w-4 text-amber" /> MS base / anchor plate
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Length along wall (mm)"><NumberInput value={cfg.plate.lengthMm} onChange={(e) => patchPlate({ lengthMm: numOf(e.target.value) })} /></Field>
                <Field label="Width across wall (mm)"><NumberInput value={cfg.plate.widthMm} onChange={(e) => patchPlate({ widthMm: numOf(e.target.value) })} /></Field>
                <Field label="Thickness (mm)"><NumberInput value={cfg.plate.thicknessMm} onChange={(e) => patchPlate({ thicknessMm: numOf(e.target.value) })} /></Field>
                <Field label="Fabrication mark"><Input value={cfg.plate.mark} onChange={(e) => patchPlate({ mark: e.target.value })} /></Field>
                <Field label="Steel grade"><Input value={cfg.plate.grade} onChange={(e) => patchPlate({ grade: e.target.value })} /></Field>
                <Field label="Material"><Input value={cfg.plate.material} onChange={(e) => patchPlate({ material: e.target.value })} /></Field>
                <Field label="Finish / coating"><Input value={cfg.plate.finish} onChange={(e) => patchPlate({ finish: e.target.value })} /></Field>
                <Field label="Material Master key"><Input value={cfg.plate.materialKey} onChange={(e) => patchPlate({ materialKey: e.target.value })} /></Field>
                <Field label="Bolt-hole dia (mm)"><NumberInput value={cfg.plate.boltHoleDiaMm} onChange={(e) => patchPlate({ boltHoleDiaMm: numOf(e.target.value) })} /></Field>
                <Field label="Holes per plate"><NumberInput value={cfg.plate.holeCount} onChange={(e) => patchPlate({ holeCount: Math.max(0, Math.round(numOf(e.target.value))) })} /></Field>
                <Field label="Edge distance (mm)"><NumberInput value={cfg.plate.edgeDistanceMm} onChange={(e) => patchPlate({ edgeDistanceMm: numOf(e.target.value) })} /></Field>
                <Field label="Hole pitch along wall (mm)"><NumberInput value={cfg.plate.holePitchMm} onChange={(e) => patchPlate({ holePitchMm: numOf(e.target.value) })} /></Field>
                <Field label="Hole gauge across wall (mm)"><NumberInput value={cfg.plate.holeGaugeMm} onChange={(e) => patchPlate({ holeGaugeMm: numOf(e.target.value) })} /></Field>
                <Derived label="Unit weight (kg/plate)" value={`${plateUnitWeightKg(live.plate).toFixed(3)} kg`} />
                <Field label="Unit-weight override (kg)">
                  <NumberInput step={0.001} value={cfg.plate.unitWeightKgOverride ?? 0} onChange={(e) => patchPlate({ unitWeightKgOverride: optNum(e.target.value) })} />
                </Field>
                <Field label="Rate override (₹)">
                  <NumberInput value={cfg.plate.rateOverride ?? 0} onChange={(e) => patchPlate({ rateOverride: optNum(e.target.value) })} />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                The unit weight is derived from the plate size less the bolt holes. Leave the overrides
                blank to price and weigh the plate from the <strong>Material Master</strong> — an
                override applies to this project only and takes precedence over the Material Master.
              </p>
            </AdminCardContent>
          </AdminCard>

          {/* ============ E. ANCHOR / FIXING ASSEMBLY ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Anchor className="h-4 w-4 text-amber" /> Anchor / fixing assembly
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Bolt diameter (mm)"><NumberInput value={cfg.anchor.diameterMm} onChange={(e) => patchAnchor({ diameterMm: numOf(e.target.value) })} /></Field>
                <Field label="Bolt length (mm)"><NumberInput value={cfg.anchor.lengthMm} onChange={(e) => patchAnchor({ lengthMm: numOf(e.target.value) })} /></Field>
                <Field label="Bolt grade"><Input value={cfg.anchor.grade} onChange={(e) => patchAnchor({ grade: e.target.value })} /></Field>
                <Field label="Anchor type">
                  <Select value={cfg.anchor.type} onValueChange={(v) => patchAnchor({ type: v as PufAnchorType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ANCHOR_TYPES.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Bolts per plate"><NumberInput value={cfg.anchor.perPlate} onChange={(e) => patchAnchor({ perPlate: Math.max(0, Math.round(numOf(e.target.value))) })} /></Field>
                <Field label="Nuts per bolt"><NumberInput value={cfg.anchor.nutsPerBolt} onChange={(e) => patchAnchor({ nutsPerBolt: Math.max(0, Math.round(numOf(e.target.value))) })} /></Field>
                <Field label="Washers per bolt"><NumberInput value={cfg.anchor.washersPerBolt} onChange={(e) => patchAnchor({ washersPerBolt: Math.max(0, Math.round(numOf(e.target.value))) })} /></Field>
                <Field label="Embedment (mm)"><NumberInput value={cfg.anchor.embedmentMm} onChange={(e) => patchAnchor({ embedmentMm: numOf(e.target.value) })} /></Field>
                <Field label="Projection above nut (mm)"><NumberInput value={cfg.anchor.projectionMm} onChange={(e) => patchAnchor({ projectionMm: numOf(e.target.value) })} /></Field>
                <Field label="Bolt rate override (₹)"><NumberInput value={cfg.anchor.rateOverride ?? 0} onChange={(e) => patchAnchor({ rateOverride: optNum(e.target.value) })} /></Field>
                <Field label="Nut rate override (₹)"><NumberInput value={cfg.anchor.nutRateOverride ?? 0} onChange={(e) => patchAnchor({ nutRateOverride: optNum(e.target.value) })} /></Field>
                <Field label="Washer rate override (₹)"><NumberInput value={cfg.anchor.washerRateOverride ?? 0} onChange={(e) => patchAnchor({ washerRateOverride: optNum(e.target.value) })} /></Field>
              </div>
              <Field label="Tightening note (printed on the fabrication drawing and in the method statement)">
                <Textarea rows={2} value={cfg.anchor.tighteningNote} onChange={(e) => patchAnchor({ tighteningNote: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Derived label="Bolts (total)" value={`${t.bolts} nos`} />
                <Derived label="Nuts (total)" value={`${t.nuts} nos`} />
                <Derived label="Washers (total)" value={`${t.washers} nos`} />
              </div>
              <p className="text-xs text-muted-foreground">
                Rate overrides apply to this project only and take precedence over the Material Master.
                Leave a field blank to price the item from the Material Master.
              </p>
            </AdminCardContent>
          </AdminCard>

          {/* ============ F. PAIRED C-PURLIN ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Wrench className="h-4 w-4 text-amber" /> Paired C-purlin pocket
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Section">
                  <Select
                    value={sectionValue}
                    onValueChange={(v) => {
                      if (v === CUSTOM_SECTION) {
                        patchPurlin({ materialKey: "" });
                        return;
                      }
                      const s = PURLIN_SECTIONS.find((x) => x.materialKey === v);
                      if (!s) return;
                      patchPurlin({
                        materialKey: s.materialKey,
                        designation: s.designation,
                        depthMm: s.depthMm,
                        flangeMm: s.flangeMm,
                        lipMm: s.lipMm,
                        thicknessMm: s.thicknessMm,
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PURLIN_SECTIONS.map((s) => <SelectItem key={s.materialKey} value={s.materialKey}>{s.designation}</SelectItem>)}
                      <SelectItem value={CUSTOM_SECTION}>Custom section…</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Designation shown on the drawing">
                  <Input value={cfg.purlin.designation} onChange={(e) => patchPurlin({ designation: e.target.value })} />
                </Field>
              </div>
              {isCustomSection && (
                <Field label="Material Master key (a key with no priced material leaves the amount blank rather than guessing)">
                  <Input value={cfg.purlin.materialKey} onChange={(e) => patchPurlin({ materialKey: e.target.value })} placeholder="e.g. c-purlin-75x40" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Web depth / upstand (mm)"><NumberInput value={cfg.purlin.depthMm} onChange={(e) => patchPurlin({ depthMm: numOf(e.target.value) })} /></Field>
                <Field label="Flange (mm)"><NumberInput value={cfg.purlin.flangeMm} onChange={(e) => patchPurlin({ flangeMm: numOf(e.target.value) })} /></Field>
                <Field label="Lip return (mm)"><NumberInput value={cfg.purlin.lipMm} onChange={(e) => patchPurlin({ lipMm: numOf(e.target.value) })} /></Field>
                <Field label="Thickness (mm)"><NumberInput step={0.1} value={cfg.purlin.thicknessMm} onChange={(e) => patchPurlin({ thicknessMm: numOf(e.target.value) })} /></Field>
                <Field label="Cut length (mm)"><NumberInput value={cfg.purlin.lengthMm} onChange={(e) => patchPurlin({ lengthMm: numOf(e.target.value) })} /></Field>
                <Field label="Steel grade"><Input value={cfg.purlin.grade} onChange={(e) => patchPurlin({ grade: e.target.value })} /></Field>
                <Field label="Finish / coating"><Input value={cfg.purlin.finish} onChange={(e) => patchPurlin({ finish: e.target.value })} /></Field>
                <Field label="Part mark"><Input value={cfg.purlin.partMark} onChange={(e) => patchPurlin({ partMark: e.target.value })} /></Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Orientation">
                  <Select value={cfg.purlin.orientation} onValueChange={(v) => patchPurlin({ orientation: v as CPurlinOrientation })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIENTATIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Derived label="C-purlins per plate" value={`${live.purlin.perPlate} nos — a PAIR`} />
                <Derived label="Inside clear gap — the receiving pocket" value={`${pocketClearGapMm(live.iface)} mm`} accent />
              </div>
              <p className="text-xs text-muted-foreground">
                The locking system is defined as a <strong>pair</strong> of C-purlins whose two webs
                bound the pocket, so the quantity per plate is fixed at 2 and is not editable. The
                inside clear gap is derived — panel thickness + installation clearance — and is the one
                figure the whole detail turns on; it cannot be typed in anywhere.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Weld type">
                  <Select value={cfg.purlin.weldType} onValueChange={(v) => patchPurlin({ weldType: v as PufWeldType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WELD_TYPES.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Weld size (mm)"><NumberInput value={cfg.purlin.weldSizeMm} onChange={(e) => patchPurlin({ weldSizeMm: numOf(e.target.value) })} /></Field>
                <Field label="Weld run length (mm)"><NumberInput value={cfg.purlin.weldLengthMm} onChange={(e) => patchPurlin({ weldLengthMm: numOf(e.target.value) })} /></Field>
                <Field label="Weld runs per purlin"><NumberInput value={cfg.purlin.weldRunsPerPurlin} onChange={(e) => patchPurlin({ weldRunsPerPurlin: Math.max(0, Math.round(numOf(e.target.value))) })} /></Field>
                <Derived label="Unit weight (kg/m)" value={`${purlinKgPerM(live.purlin).toFixed(3)} kg/m`} />
                <Field label="Unit-weight override (kg/m)">
                  <NumberInput step={0.001} value={cfg.purlin.unitWeightKgPerMOverride ?? 0} onChange={(e) => patchPurlin({ unitWeightKgPerMOverride: optNum(e.target.value) })} />
                </Field>
                <Field label="Rate override (₹)">
                  <NumberInput value={cfg.purlin.rateOverride ?? 0} onChange={(e) => patchPurlin({ rateOverride: optNum(e.target.value) })} />
                </Field>
              </div>
            </AdminCardContent>
          </AdminCard>

          {/* ============ G. PUF-PANEL INTERFACE ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Ruler className="h-4 w-4 text-amber" /> PUF-panel interface
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Panel thickness (mm)">
                  <Select
                    value={String(live.iface.panelThicknessMm)}
                    disabled={cfg.iface.followConfigPanelThickness}
                    onValueChange={(v) => patchIface({ panelThicknessMm: Number(v) || 0 })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {thicknessOptions.map((mm) => <SelectItem key={mm} value={String(mm)}>{mm} mm</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Follow the calculator panel thickness</Label>
                  <label className="flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md border border-input px-3">
                    <span className="text-xs text-muted-foreground">
                      Track the Structure tab ({ctx.configPanelThicknessMm} mm)
                    </span>
                    <Switch
                      checked={cfg.iface.followConfigPanelThickness}
                      onCheckedChange={(v) => patchIface({ followConfigPanelThickness: v, panelThicknessMm: v ? ctx.configPanelThicknessMm : cfg.iface.panelThicknessMm })}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Installation clearance (mm)"><NumberInput value={cfg.iface.installationClearanceMm} onChange={(e) => patchIface({ installationClearanceMm: numOf(e.target.value) })} /></Field>
                <Field label="Max side gap (mm)"><NumberInput value={cfg.iface.maxSideGapMm} onChange={(e) => patchIface({ maxSideGapMm: numOf(e.target.value) })} /></Field>
                <Field label="Insertion depth (mm)"><NumberInput value={cfg.iface.insertionDepthMm} onChange={(e) => patchIface({ insertionDepthMm: numOf(e.target.value) })} /></Field>
                <Field label="Seating depth (mm)"><NumberInput value={cfg.iface.seatingDepthMm} onChange={(e) => patchIface({ seatingDepthMm: numOf(e.target.value) })} /></Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Isolation strip</Label>
                  <label className="flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md border border-input px-3">
                    <span className="text-xs text-muted-foreground">Bed an isolation strip in the pocket</span>
                    <Switch checked={cfg.iface.isolationStrip} onCheckedChange={(v) => patchIface({ isolationStrip: v })} />
                  </label>
                </div>
                <Field label="Isolation-strip material">
                  <Input value={cfg.iface.isolationStripMaterial} disabled={!cfg.iface.isolationStrip} onChange={(e) => patchIface({ isolationStripMaterial: e.target.value })} />
                </Field>
                <Field label="Sealant type"><Input value={cfg.iface.sealantType} onChange={(e) => patchIface({ sealantType: e.target.value })} /></Field>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Mechanical panel fastener</Label>
                  <label className="flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md border border-input px-3">
                    <span className="text-xs text-muted-foreground">Screw through the purlin web into the panel</span>
                    <Switch checked={cfg.iface.fastenerOption} onCheckedChange={(v) => patchIface({ fastenerOption: v })} />
                  </label>
                </div>
                <Field label="Fastener specification">
                  <Input value={cfg.iface.fastenerSpec} disabled={!cfg.iface.fastenerOption} onChange={(e) => patchIface({ fastenerSpec: e.target.value })} />
                </Field>
                <Field label="Panel colour"><Input value={cfg.iface.panelColour} onChange={(e) => patchIface({ panelColour: e.target.value })} /></Field>
                <Field label="Panel finish"><Input value={cfg.iface.panelFinish} onChange={(e) => patchIface({ panelFinish: e.target.value })} /></Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Derived label="Pocket clear width" value={`${t.pocketClearGapMm} mm`} accent />
                <Derived label="Side gap (each side)" value={`${t.sideGapMm} mm`} />
                <Derived label="Max permitted side gap" value={`${live.iface.maxSideGapMm} mm`} />
              </div>
            </AdminCardContent>
          </AdminCard>

          {/* ============ H. VALIDATION ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-3">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <AlertTriangle className="h-4 w-4 text-amber" /> Validation
              </h3>
              {derived.errors.length === 0 && derived.warnings.length === 0 ? (
                <p className="flex items-start gap-2 rounded-xl border border-emerald-400/50 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  No issues. The pocket matches the selected panel thickness, the plate carries the
                  paired C-purlins and the bolts, and every plate sits on a plinth beam inside the grid.
                </p>
              ) : (
                <div className="space-y-2">
                  {derived.errors.map((i, idx) => (
                    <p key={`e-${idx}-${i.code}`} className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{i.message}</span>
                    </p>
                  ))}
                  {derived.warnings.map((i, idx) => (
                    <p key={`w-${idx}-${i.code}`} className="flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/5 p-3 text-sm text-amber-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{i.message}</span>
                    </p>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                {derived.errors.length} error{derived.errors.length === 1 ? "" : "s"} ·{" "}
                {derived.warnings.length} warning{derived.warnings.length === 1 ? "" : "s"}. An error
                means the detail as configured cannot be built; a warning means it can be built but a
                competent engineer would question it.
              </p>
            </AdminCardContent>
          </AdminCard>

          {/* ============ I. TAKE-OFF ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Layers3 className="h-4 w-4 text-amber" /> Live take-off
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Base plates" value={`${t.plates} nos`} />
                <Tile label="C-purlin pieces" value={`${t.purlinPieces} nos`} sub={`${t.purlinTotalLengthM.toFixed(2)} m running`} />
                <Tile label="Anchor bolts" value={`${t.bolts} nos`} />
                <Tile label="Nuts / washers" value={`${t.nuts} / ${t.washers} nos`} />
                <Tile label="Total weld length" value={`${t.weldTotalLengthM.toFixed(2)} m`} sub={`${t.weldRuns} runs · ${live.purlin.weldSizeMm} mm ${live.purlin.weldType}`} />
                <Tile label="Pocket clear width" value={`${t.pocketClearGapMm} mm`} accent />
                <Tile label="Side gap" value={`${t.sideGapMm} mm`} sub={`limit ${live.iface.maxSideGapMm} mm`} />
                <Tile label="Total fabricated steel" value={`${t.totalSteelKg.toFixed(2)} kg`} accent />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Derived label="Plates" value={`${t.plateKg.toFixed(2)} kg`} />
                <Derived label="C-purlins" value={`${t.purlinKg.toFixed(2)} kg`} />
                <Derived label="Bolts + nuts + washers" value={`${(t.boltKg + t.nutKg + t.washerKg).toFixed(2)} kg`} />
                <Derived label="Electrode allowance" value={`${t.electrodeKg.toFixed(2)} kg`} />
                <Derived label="Isolation strip" value={`${t.isolationStripM.toFixed(2)} m`} />
                <Derived label="Sealant" value={`${t.sealantM.toFixed(2)} m`} />
                <Derived label="Panel fasteners" value={`${t.fasteners} nos`} />
                <Derived label="Plate spacing min / avg / max" value={`${summary.minSpacingM.toFixed(2)} / ${summary.avgSpacingM.toFixed(2)} / ${summary.maxSpacingM.toFixed(2)} m`} />
              </div>
            </AdminCardContent>
          </AdminCard>

          {/* ============ J. METHOD STATEMENT ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-3">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <ListOrdered className="h-4 w-4 text-amber" /> Erection method statement — {steps.length} steps
              </h3>
              <ol className="space-y-2">
                {steps.map((s) => (
                  <li key={s.no} className="flex gap-3 rounded-xl border p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-xs font-bold text-amber">
                      {s.no}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{s.title}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </AdminCardContent>
          </AdminCard>

          {/* ============ DRAWING NOTES ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-2">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Ruler className="h-4 w-4 text-amber" /> Standing drawing notes
              </h3>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                {PUF_LOCK_DRAWING_NOTES.map((note, i) => <li key={i}>{note}</li>)}
              </ol>
            </AdminCardContent>
          </AdminCard>

          {/* ============ K. PRESETS ============ */}
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display font-bold">
                  <Bookmark className="h-4 w-4 text-amber" /> PUF-lock presets
                </h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {presets.length} saved · this browser
                </Badge>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[18rem] flex-1 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Preset name</Label>
                  <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder={suggestedName} />
                </div>
                <Button variant="outline" className="gap-2" onClick={savePreset}>
                  <Save className="h-4 w-4" /> Save current configuration
                </Button>
              </div>

              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No presets yet. Save the current plate, anchor, C-purlin, interface and layout
                  settings under a name and re-apply them to any other project.
                </p>
              ) : (
                <div className="space-y-2">
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.data.positions.length || "auto"} plate layout · {p.data.purlin.designation} ·{" "}
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-IN") : "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="outline" onClick={() => applyPreset(p.id)}>Apply</Button>
                        <Button size="icon" variant="ghost" className="text-destructive" title="Delete preset" onClick={() => deletePreset(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {presetMsg && <p className="text-xs text-emerald-600">{presetMsg}</p>}
              <p className="text-[11px] text-muted-foreground">
                Presets are stored in this browser under a dedicated key and are independent of the BOQ
                template store. A preset saved before a field existed still applies cleanly — the
                shipped defaults are merged underneath it on load.
              </p>
            </AdminCardContent>
          </AdminCard>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ small helpers -------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** A read-only value that comes out of the engineering core — never typed in. */
function Derived({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div
        className={
          accent
            ? "flex h-9 items-center rounded-md border border-amber/50 bg-amber/10 px-3 text-sm font-semibold"
            : "flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-2xl border border-amber/40 bg-amber/5 p-3" : "rounded-2xl border bg-card p-3"}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-base font-bold leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
