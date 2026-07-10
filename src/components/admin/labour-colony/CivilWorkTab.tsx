"use client";

import { useMemo } from "react";
import { AlertTriangle, HardHat, Layers3, Droplets, Zap, Trees, Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/admin/NumberInput";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { formatINR } from "@/lib/exportUtils";
import { FoundationPlan } from "./FoundationPlan";
import { PlinthBeamSection } from "./PlinthBeamSection";
import {
  calculateCivilWork,
  FOUNDATION_TYPES,
  RCC_GRADES,
  type CivilWorkConfig,
  type CivilContext,
  type FoundationType,
  type RccGrade,
  type CivilWorkResult,
} from "@/lib/quotation/labourColonyCivil";

export function CivilWorkTab({
  config,
  onChange,
  ctx,
}: {
  config: CivilWorkConfig;
  onChange: (c: CivilWorkConfig) => void;
  ctx: CivilContext;
}) {
  const result = useMemo<CivilWorkResult>(() => calculateCivilWork(config, ctx), [config, ctx]);

  const patch = (p: Partial<CivilWorkConfig>) => onChange({ ...config, ...p });
  const patchF = (p: Partial<CivilWorkConfig["foundation"]>) => onChange({ ...config, foundation: { ...config.foundation, ...p } });
  const patchSP = (p: Partial<CivilWorkConfig["sitePrep"]>) => onChange({ ...config, sitePrep: { ...config.sitePrep, ...p } });
  const num = (v: number | undefined, fallback = 0) => (v === undefined ? fallback : v);
  const foundationNote = FOUNDATION_TYPES.find((t) => t.id === config.foundation.type)?.note ?? "";

  return (
    <div className="space-y-6">
      {/* ---------- INPUTS ---------- */}
      <AdminCard>
        <AdminCardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold flex items-center gap-2"><HardHat className="h-4 w-4 text-amber" /> Civil Work</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Include in project</span>
              <Switch checked={config.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
            </div>
          </div>

          {/* Foundation */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Ruler className="h-4 w-4 text-amber" /> Foundation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Foundation type</Label>
                <Select value={config.foundation.type} onValueChange={(v) => patchF({ type: v as FoundationType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOUNDATION_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RCC grade</Label>
                <Select value={config.foundation.grade} onValueChange={(v) => patchF({ grade: v as RccGrade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RCC_GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{foundationNote}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Footing size (m)"><NumberInput value={num(config.foundation.footingLengthM, result.foundation.section.footingLengthM)} onChange={(e) => patchF({ footingLengthM: Number(e.target.value) || undefined })} /></Field>
              <Field label="Footing depth (m)"><NumberInput value={num(config.foundation.footingDepthM, result.foundation.section.footingDepthM)} onChange={(e) => patchF({ footingDepthM: Number(e.target.value) || undefined })} /></Field>
              <Field label="Pedestal size (m)"><NumberInput value={num(config.foundation.pedestalSizeM, result.foundation.section.pedestalSizeM)} onChange={(e) => patchF({ pedestalSizeM: Number(e.target.value) || undefined })} /></Field>
              <Field label="Pedestal ht (m)"><NumberInput value={num(config.foundation.pedestalHeightM, result.foundation.section.pedestalHeightM)} onChange={(e) => patchF({ pedestalHeightM: Number(e.target.value) || undefined })} /></Field>
              <Field label="Plinth beam W (m)"><NumberInput value={num(config.foundation.plinthBeamWidthM, result.foundation.section.plinthBeamWidthM)} onChange={(e) => patchF({ plinthBeamWidthM: Number(e.target.value) || undefined })} /></Field>
              <Field label="Plinth beam D (m)"><NumberInput value={num(config.foundation.plinthBeamDepthM, result.foundation.section.plinthBeamDepthM)} onChange={(e) => patchF({ plinthBeamDepthM: Number(e.target.value) || undefined })} /></Field>
              <Field label="PCC thk (mm)"><NumberInput value={num(config.foundation.pccThicknessMm, result.foundation.section.pccThicknessMm)} onChange={(e) => patchF({ pccThicknessMm: Number(e.target.value) || undefined })} /></Field>
              <Field label="Column c/c (m)"><NumberInput value={num(config.foundation.columnSpacingM, result.foundation.grid.spacingM)} onChange={(e) => patchF({ columnSpacingM: Number(e.target.value) || undefined })} /></Field>
            </div>
          </div>

          {/* Site prep + raised plinth */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Layers3 className="h-4 w-4 text-amber" /> Site preparation</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Toggle label="Site clearing" checked={!!config.sitePrep.siteClearing} onChange={(v) => patchSP({ siteClearing: v })} />
              <Toggle label="Ground levelling" checked={!!config.sitePrep.groundLevelling} onChange={(v) => patchSP({ groundLevelling: v })} />
              <Toggle label="Soil compaction" checked={!!config.sitePrep.soilCompaction} onChange={(v) => patchSP({ soilCompaction: v })} />
              <Toggle label="Anti-termite" checked={!!config.sitePrep.antiTermite} onChange={(v) => patchSP({ antiTermite: v })} />
              <Toggle label="Slope prep" checked={!!config.sitePrep.groundSlope} onChange={(v) => patchSP({ groundSlope: v })} />
              <Toggle label="Raised plinth" checked={!!config.flooringPlinth.raisedPlinth} onChange={(v) => onChange({ ...config, flooringPlinth: { ...config.flooringPlinth, raisedPlinth: v } })} />
            </div>
          </div>

          {/* Sub-head toggles */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Include sub-heads</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Toggle icon={Droplets} label="Drainage & sewage" checked={config.drainage.enabled} onChange={(v) => onChange({ ...config, drainage: { ...config.drainage, enabled: v } })} />
              <Toggle icon={Droplets} label="Water supply" checked={config.waterSupply.enabled} onChange={(v) => onChange({ ...config, waterSupply: { ...config.waterSupply, enabled: v } })} />
              <Toggle icon={Zap} label="Electrical civil" checked={config.electricalCivil.enabled} onChange={(v) => onChange({ ...config, electricalCivil: { ...config.electricalCivil, enabled: v } })} />
              <Toggle icon={Trees} label="External dev." checked={config.externalDev.enabled} onChange={(v) => onChange({ ...config, externalDev: { ...config.externalDev, enabled: v } })} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={!!config.drainage.stpConnection} onCheckedChange={(v) => onChange({ ...config, drainage: { ...config.drainage, stpConnection: v } })} />
              <span className="text-muted-foreground">Use STP connection instead of septic tank + soak pit</span>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* ---------- WARNING ---------- */}
      {result.warnings.length > 0 && (
        <div className={ctx.floors >= 2 ? "rounded-2xl border border-destructive/40 bg-destructive/5 p-4" : "rounded-2xl border border-amber/40 bg-amber/5 p-4"}>
          <div className="flex gap-3">
            <AlertTriangle className={ctx.floors >= 2 ? "h-5 w-5 text-destructive shrink-0 mt-0.5" : "h-5 w-5 text-amber shrink-0 mt-0.5"} />
            <div className="space-y-1 text-sm">
              {result.warnings.map((w, i) => <p key={i} className={ctx.floors >= 2 ? "text-destructive font-medium" : "text-amber-700"}>{w}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* ---------- DRAWINGS ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FoundationPlan foundation={result.foundation} />
        <PlinthBeamSection foundation={result.foundation} />
      </div>

      {/* ---------- COST SUMMARY ---------- */}
      <AdminCard>
        <AdminCardContent>
          <h3 className="font-display font-bold flex items-center gap-2 mb-4"><HardHat className="h-4 w-4 text-amber" /> Civil cost summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Tile label="Total civil cost" value={formatINR(result.totalCost)} accent />
            <Tile label="Concrete" value={`${result.totalConcreteCum} cum`} />
            <Tile label="Reinforcement" value={`${result.totalSteelKg} kg`} />
            <Tile label="Footings" value={`${result.foundation.footingCount} nos`} />
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[result.sitePrep, result.foundation, result.flooringPlinth, result.drainage, result.waterSupply, result.electricalCivil, result.externalDev]
                .filter((h) => h.cost > 0)
                .map((h) => (
                  <tr key={h.head} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{h.head}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatINR(h.cost)}</td>
                  </tr>
                ))}
              <tr className="font-bold"><td className="py-2">Grand civil total</td><td className="py-2 text-right tabular-nums">{formatINR(result.totalCost)}</td></tr>
            </tbody>
          </table>
        </AdminCardContent>
      </AdminCard>

      {/* ---------- CIVIL BOQ ---------- */}
      <AdminCard>
        <AdminCardContent>
          <h3 className="font-display font-bold flex items-center gap-2 mb-4"><Ruler className="h-4 w-4 text-amber" /> Civil-Work BOQ</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="py-2 pr-2">#</th><th className="pr-2">Item</th><th className="pr-2">Spec</th>
                  <th className="pr-2">Unit</th><th className="text-right pr-2">Qty</th>
                  <th className="text-right pr-2">Rate</th><th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.boq.map((r) => (
                  <tr key={r.sl} className="border-b last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground">{r.sl}</td>
                    <td className="pr-2 font-medium">{r.item}</td>
                    <td className="pr-2 text-muted-foreground text-xs">{r.spec}</td>
                    <td className="pr-2">{r.unit}</td>
                    <td className="text-right pr-2 tabular-nums">{r.quantity.toLocaleString("en-IN")}</td>
                    <td className="text-right pr-2 tabular-nums">{formatINR(r.rate)}</td>
                    <td className="text-right tabular-nums">{formatINR(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* ---------- small helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}
function Toggle({ icon: Icon, label, checked, onChange }: { icon?: any; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer hover:bg-muted/40">
      <span className="flex items-center gap-1.5 text-xs font-medium">{Icon && <Icon className="h-3.5 w-3.5 text-amber" />}{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "bg-amber/5 border-amber/40" : "bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-base leading-tight mt-1">{value}</div>
    </div>
  );
}
