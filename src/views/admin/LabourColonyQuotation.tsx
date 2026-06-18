"use client";

import { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Building2, Download, Printer, Save, Trash2, Users, LayoutGrid, Layers,
  Zap, Droplets, Package, FileText, DoorOpen, Bath, BedDouble,
  Home, ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/admin/NumberInput";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { LabourColonyDrawings } from "@/components/admin/LabourColonyDrawings";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  calculateLabourColony,
  type LabourColonyConfig,
  type LabourColonyResult,
  type PanelType,
  type FloorCount,
} from "@/lib/quotation/labourColony";

const COMPANY = {
  name: "PORTABLE OFFICE CABIN",
  address: "Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post, Shoolagiri, Krishnagiri, Tamil Nadu 635117",
  phone: "9019910931 / 9731897976",
  gst: "33FVKPK6238Q1ZT",
  website: "portableofficecabin.com",
};

const DEFAULT_CONFIG: LabourColonyConfig = {
  projectName: "",
  location: "",
  personsPerRoom: 8,
  capacity: 100,
  totalRooms: undefined,
  floors: 2,
  roomLength: 6,
  roomWidth: 3,
  roomHeight: 2.7,
  corridorWidth: 1.5,
  corridorPosition: "center",
  panelType: "PUF",
  panelThicknessMm: 50,
  wastagePercent: 5,
  facilities: { toilet: true, bunkBeds: true, diningKitchen: true, officeSecurity: true },
};

type SizeMode = "capacity" | "rooms";

interface SavedColony {
  id: string;
  name: string;
  createdAt: string;
  config: LabourColonyConfig;
}

const STORAGE_KEY = "poc_labour_colony_v1";
const loadSaved = (): SavedColony[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const persistSaved = (list: SavedColony[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

const n = (x: number) => (Number.isFinite(x) ? x.toLocaleString("en-IN") : "—");
const floorsLabel = (f: FloorCount) => (f === 1 ? "Ground floor" : f === 2 ? "G+1" : "G+2");

export default function LabourColonyQuotation() {
  const [config, setConfig] = useState<LabourColonyConfig>(DEFAULT_CONFIG);
  const [sizeMode, setSizeMode] = useState<SizeMode>("capacity");
  const [saved, setSaved] = useState<SavedColony[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const setNum = (key: keyof LabourColonyConfig) => (e: { target: { value: string } }) =>
    setConfig((c) => ({ ...c, [key]: Number(e.target.value) || 0 }));
  const setStr = (key: keyof LabourColonyConfig) => (e: { target: { value: string } }) =>
    setConfig((c) => ({ ...c, [key]: e.target.value }));
  const setFac = (key: keyof LabourColonyConfig["facilities"]) => (checked: boolean) =>
    setConfig((c) => ({ ...c, facilities: { ...c.facilities, [key]: checked } }));

  const valid =
    config.personsPerRoom > 0 &&
    config.roomLength > 0 &&
    config.roomWidth > 0 &&
    config.roomHeight > 0 &&
    ((sizeMode === "capacity" && (config.capacity || 0) > 0) ||
      (sizeMode === "rooms" && (config.totalRooms || 0) > 0));

  const result = useMemo<LabourColonyResult | null>(() => {
    if (!valid) return null;
    try {
      const cfg: LabourColonyConfig =
        sizeMode === "capacity"
          ? { ...config, totalRooms: undefined }
          : { ...config, capacity: undefined };
      return calculateLabourColony(cfg);
    } catch {
      return null;
    }
  }, [config, sizeMode, valid]);

  const save = () => {
    const name =
      (config.projectName || "").trim() ||
      `${floorsLabel(config.floors)} colony — ${result?.occupancy.totalCapacity ?? 0} persons`;
    const entry: SavedColony = {
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      name,
      createdAt: new Date().toISOString(),
      config,
    };
    const next = [entry, ...saved];
    setSaved(next);
    persistSaved(next);
    toast({ title: "Estimate saved", description: name });
  };
  const loadOne = (s: SavedColony) => {
    setConfig(s.config);
    setSizeMode(s.config.totalRooms ? "rooms" : "capacity");
    toast({ title: "Loaded", description: s.name });
  };
  const removeOne = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    persistSaved(next);
  };

  const exportPdf = () => {
    if (!result) return;
    exportColonyPdf(result);
    toast({ title: "PDF exported" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labour Colony Calculator"
        description="Customizable prefab labour colony layout & material calculation — area, occupancy, structure, panels, electrical, plumbing & BOQ."
        badge={<Badge variant="outline" className="font-mono">Quotation Pro</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={save} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
            <Button onClick={exportPdf} disabled={!result} className="gap-2 bg-gradient-to-r from-amber to-amber-light text-white border-0"><Download className="h-4 w-4" /> Export PDF</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------- INPUTS ---------------- */}
        <AdminCard className="lg:col-span-1">
          <AdminCardContent className="space-y-5">
            <h3 className="font-display font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-amber" /> Project</h3>
            <div className="space-y-2">
              <Label>Project name</Label>
              <Input value={config.projectName || ""} onChange={setStr("projectName")} placeholder="e.g. ABC Infra labour camp" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={config.location || ""} onChange={setStr("location")} placeholder="Site location" />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-display font-bold flex items-center gap-2"><Users className="h-4 w-4 text-amber" /> Capacity</h3>
              <div className="space-y-2">
                <Label>Size by</Label>
                <Select value={sizeMode} onValueChange={(v) => setSizeMode(v as SizeMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capacity">Total persons</SelectItem>
                    <SelectItem value="rooms">Number of rooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sizeMode === "capacity" ? (
                <div className="space-y-2">
                  <Label>Required capacity (persons)</Label>
                  <NumberInput value={config.capacity ?? 0} onChange={setNum("capacity")} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Total rooms</Label>
                  <NumberInput value={config.totalRooms ?? 0} onChange={setNum("totalRooms")} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Persons per room</Label>
                <NumberInput value={config.personsPerRoom} onChange={setNum("personsPerRoom")} />
              </div>
              <div className="space-y-2">
                <Label>Number of floors</Label>
                <Select value={String(config.floors)} onValueChange={(v) => setConfig((c) => ({ ...c, floors: Number(v) as FloorCount }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ground floor</SelectItem>
                    <SelectItem value="2">G+1</SelectItem>
                    <SelectItem value="3">G+2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-display font-bold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-amber" /> Room & panel</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-xs">Length (m)</Label><NumberInput value={config.roomLength} onChange={setNum("roomLength")} /></div>
                <div className="space-y-1"><Label className="text-xs">Width (m)</Label><NumberInput value={config.roomWidth} onChange={setNum("roomWidth")} /></div>
                <div className="space-y-1"><Label className="text-xs">Height (m)</Label><NumberInput value={config.roomHeight} onChange={setNum("roomHeight")} /></div>
              </div>
              <div className="space-y-2">
                <Label>Corridor width (m)</Label>
                <NumberInput value={config.corridorWidth} onChange={setNum("corridorWidth")} />
              </div>
              <div className="space-y-2">
                <Label>Corridor position (shift to any side)</Label>
                <Select value={config.corridorPosition ?? "center"} onValueChange={(v) => setConfig((c) => ({ ...c, corridorPosition: v as LabourColonyConfig["corridorPosition"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center (double-loaded)</SelectItem>
                    <SelectItem value="top">Top side</SelectItem>
                    <SelectItem value="bottom">Bottom side</SelectItem>
                    <SelectItem value="left">Left side</SelectItem>
                    <SelectItem value="right">Right side</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Panel type</Label>
                  <Select value={config.panelType} onValueChange={(v) => setConfig((c) => ({ ...c, panelType: v as PanelType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUF">PUF</SelectItem>
                      <SelectItem value="EPS">EPS</SelectItem>
                      <SelectItem value="GI">GI sheet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Thickness (mm)</Label><NumberInput value={config.panelThicknessMm} onChange={setNum("panelThicknessMm")} /></div>
              </div>
              <div className="space-y-2">
                <Label>Wastage (%)</Label>
                <NumberInput value={config.wastagePercent} onChange={setNum("wastagePercent")} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-display font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-amber" /> Facilities</h3>
              <FacilityToggle icon={Bath} label="Toilet & bath block" checked={config.facilities.toilet} onChange={setFac("toilet")} />
              <FacilityToggle icon={BedDouble} label="Bunk beds" checked={config.facilities.bunkBeds} onChange={setFac("bunkBeds")} />
              <FacilityToggle icon={Home} label="Dining + Kitchen" checked={config.facilities.diningKitchen} onChange={setFac("diningKitchen")} />
              <FacilityToggle icon={ShieldCheck} label="Office / Security" checked={config.facilities.officeSecurity} onChange={setFac("officeSecurity")} />
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* ---------------- RESULTS ---------------- */}
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <AdminCard><AdminCardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              Enter capacity and room dimensions to see the calculation.
            </AdminCardContent></AdminCard>
          ) : (
            <>
              {/* Summary tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="Capacity" value={`${n(result.occupancy.totalCapacity)} persons`} />
                <Tile label="Rooms" value={`${n(result.occupancy.rooms)} (${floorsLabel(result.config.floors)})`} />
                <Tile label="Built-up" value={`${n(result.area.builtUpTotalSqm)} sqm`} sub={`${n(result.area.builtUpTotalSqft)} sqft`} />
                <Tile label="Approx weight" value={`${n(result.weight.totalTonnes)} t`} />
              </div>

              <Section title="Drawings — Top View & Elevations" icon={LayoutGrid}>
                <LabourColonyDrawings result={result} />
              </Section>

              <Section title="1. Area" icon={LayoutGrid}>
                <KV rows={[
                  ["Room size", `${result.config.roomLength} x ${result.config.roomWidth} m = ${n(result.area.roomAreaSqm)} sqm`],
                  ["Rooms total area", `${n(result.area.roomsAreaSqm)} sqm`],
                  ["Toilet block", `${n(result.area.toiletBlockSqm)} sqm`],
                  ["Dining + kitchen", `${n(result.area.diningKitchenSqm)} sqm`],
                  ["Office / security", `${n(result.area.officeSecuritySqm)} sqm`],
                  ["Corridor / passage", `${n(result.area.corridorSqm)} sqm`],
                  ["Staircase + walkway", `${n(result.area.staircaseWalkwaySqm)} sqm`],
                  ["Footprint / floor", `${result.area.footprintLengthM} x ${result.area.footprintWidthM} m`],
                  ["Roof area (sloped)", `${n(result.area.roofActualSqm)} sqm`],
                  ["Total built-up", `${n(result.area.builtUpTotalSqm)} sqm (${n(result.area.builtUpTotalSqft)} sqft)`],
                ]} />
              </Section>

              <Section title="2. Occupancy & sanitation" icon={Users}>
                <KV rows={[
                  ["Persons per room", n(result.occupancy.personsPerRoom)],
                  ["Total rooms", n(result.occupancy.rooms)],
                  ["Total bed capacity", `${n(result.occupancy.totalCapacity)} persons`],
                  ["Bunk beds", `${n(result.occupancy.bunkBedsTotal)} (${result.occupancy.bunkBedsPerRoom}/room)`],
                  ["Ventilation / room", `${n(result.occupancy.ventilationAreaPerRoomSqm)} sqm openable`],
                  ["WC required", n(result.occupancy.wc)],
                  ["Urinals", n(result.occupancy.urinals)],
                  ["Baths / showers", n(result.occupancy.baths)],
                  ["Wash basins", n(result.occupancy.washBasins)],
                ]} />
              </Section>

              <Section title="3. Structural steel" icon={Package}>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2">Item</th><th>Length/Qty</th><th className="text-right">Weight (kg)</th>
                  </tr></thead>
                  <tbody>
                    {result.structural.items.map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{it.item}</td>
                        <td className="text-muted-foreground">{it.lengthM ? `${n(it.lengthM)} m` : it.qty ? `${it.qty} no` : it.areaSqm ? `${n(it.areaSqm)} sqm` : "—"}</td>
                        <td className="text-right tabular-nums">{n(it.weightKg)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold"><td className="py-2">Total steel</td><td>{result.structural.modules} modules</td><td className="text-right tabular-nums">{n(result.structural.totalSteelKg)}</td></tr>
                  </tbody>
                </table>
              </Section>

              <Section title={`4. Panels (${result.panels.thicknessMm} mm ${result.panels.panelType})`} icon={Layers}>
                <KV rows={[
                  ["Wall panel", `${n(result.panels.wallSqm)} sqm`],
                  ["Roof panel", `${n(result.panels.roofSqm)} sqm`],
                  ["Partition panel", `${n(result.panels.partitionSqm)} sqm`],
                  ["Wastage", `${result.panels.wastagePercent}%`],
                  ["Total panel", `${n(result.panels.totalWithWastageSqm)} sqm (${n(result.panels.totalWithWastageSqft)} sqft)`],
                ]} />
              </Section>

              <Section title="5. Flooring" icon={Layers}>
                <KV rows={[
                  ["Cement / bison board", `${n(result.flooring.cementBoardSqm)} sqm`],
                  ["Vinyl flooring", `${n(result.flooring.vinylSqm)} sqm`],
                  ["Skirting", `${n(result.flooring.skirtingM)} m`],
                ]} />
              </Section>

              <Section title="6. Doors & windows" icon={DoorOpen}>
                <KV rows={[
                  ["Doors", `${n(result.openings.doors)} (${result.openings.doorSize})`],
                  ["Windows", `${n(result.openings.windows)} (${result.openings.windowSize})`],
                  ["Ventilators", n(result.openings.ventilators)],
                  ["Grills", n(result.openings.grills)],
                ]} />
              </Section>

              <Section title="7. Electrical load" icon={Zap}>
                <KV rows={[
                  ["LED light points", n(result.electrical.lights)],
                  ["Fan points", n(result.electrical.fans)],
                  ["Socket points", n(result.electrical.sockets)],
                  ["Connected load", `${n(result.electrical.connectedLoadW)} W`],
                  ["Demand load", `${result.electrical.demandLoadKW} kW`],
                  ["Main MCB", `${result.electrical.recommendedMainMCBamp} A`],
                  ["Distribution boards", n(result.electrical.distributionBoards)],
                  ["Wiring", result.electrical.recommendedWire],
                  ["Earth pits", n(result.electrical.earthPits)],
                ]} />
              </Section>

              <Section title="8. Plumbing" icon={Droplets}>
                <KV rows={[
                  ["CPVC supply pipe", `${n(result.plumbing.cpvcPipeM)} m`],
                  ["PVC waste pipe", `${n(result.plumbing.pvcWastePipeM)} m`],
                  ["Floor traps", n(result.plumbing.floorTraps)],
                  ["Angle cocks", n(result.plumbing.angleCocks)],
                  ["Taps", n(result.plumbing.taps)],
                  ["EWC / Indian WC", n(result.plumbing.wc)],
                  ["Urinals", n(result.plumbing.urinals)],
                  ["Wash basins", n(result.plumbing.washBasins)],
                  ["Showers", n(result.plumbing.showers)],
                  ["Health faucets", n(result.plumbing.healthFaucets)],
                  ["Flush tanks", n(result.plumbing.flushTanks)],
                  ["Septic / drainage points", n(result.plumbing.septicConnectionPoints)],
                ]} />
              </Section>

              <Section title="9. BOQ / Material list" icon={FileText}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-2 pr-2">#</th><th className="pr-2">Item</th><th className="pr-2">Spec</th><th className="pr-2">Unit</th><th className="text-right pr-2">Qty</th><th>Remarks</th>
                    </tr></thead>
                    <tbody>
                      {result.boq.map((r) => (
                        <tr key={r.sl} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-muted-foreground">{r.sl}</td>
                          <td className="pr-2 font-medium">{r.item}</td>
                          <td className="pr-2 text-muted-foreground text-xs">{r.specification}</td>
                          <td className="pr-2">{r.unit}</td>
                          <td className="text-right pr-2 tabular-nums">{n(r.quantity)}</td>
                          <td className="text-muted-foreground text-xs">{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Weight & assumptions" icon={Package}>
                <KV rows={[
                  ["Steel", `${n(result.weight.steelKg)} kg`],
                  ["Panels", `${n(result.weight.panelKg)} kg`],
                  ["Bunk beds", `${n(result.weight.bunkBedKg)} kg`],
                  ["Doors / windows", `${n(result.weight.openingsKg)} kg`],
                  ["Boards / misc", `${n(result.weight.miscKg)} kg`],
                  ["Total approx weight", `${n(result.weight.totalKg)} kg (${result.weight.totalTonnes} t)`],
                ]} />
                <ul className="mt-4 space-y-1 text-xs text-muted-foreground list-disc pl-5">
                  {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </Section>
            </>
          )}
        </div>
      </div>

      {/* ---------------- SAVED ---------------- */}
      {saved.length > 0 && (
        <AdminCard>
          <AdminCardContent>
            <h3 className="font-display font-bold mb-3">Saved estimates</h3>
            <div className="space-y-2">
              {saved.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => loadOne(s)}>Load</Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeOne(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </AdminCardContent>
        </AdminCard>
      )}
    </div>
  );
}

/* ---------------- small presentational helpers ---------------- */
function FacilityToggle({ icon: Icon, label, checked, onChange }: { icon: any; label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors", checked ? "border-amber/40 bg-amber/5" : "border-border")}>
      <span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-amber" /> {label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-lg leading-tight mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <AdminCard>
      <AdminCardContent>
        <h3 className="font-display font-bold flex items-center gap-2 mb-4"><Icon className="h-4 w-4 text-amber" /> {title}</h3>
        {children}
      </AdminCardContent>
    </AdminCard>
  );
}
function KV({ rows }: { rows: [string, string | number][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-2 text-muted-foreground w-1/2">{k}</td>
            <td className="py-2 font-medium">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------- PDF export ---------------- */
function exportColonyPdf(result: LabourColonyResult) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(COMPANY.name, margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(COMPANY.address, W - margin * 2), margin, 60);
  doc.text(`GST: ${COMPANY.gst}   |   ${COMPANY.phone}   |   ${COMPANY.website}`, margin, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Prefabricated Labour Colony — Material Calculation & BOQ", margin, 108);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const today = new Date().toLocaleDateString("en-IN");
  const proj = result.config.projectName || "—";
  const loc = result.config.location || "—";
  doc.text(`Project: ${proj}    Location: ${loc}    Date: ${today}`, margin, 124);

  const kv = (rows: [string, string | number][]) => rows.map(([k, v]) => [k, String(v)]);
  let y = 138;
  const tbl = (title: string, body: (string | number)[][], head?: string[]) => {
    autoTable(doc, {
      startY: y,
      head: head ? [head] : undefined,
      body: body as any,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      margin: { left: margin, right: margin },
      didDrawPage: () => {},
      // section title
      willDrawPage: () => {},
    });
    // @ts-ignore - lastAutoTable is added by the plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
  };

  const heading = (t: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(t, margin, y);
    y += 6;
  };

  heading("1. Area");
  tbl("", kv([
    ["Total built-up", `${n(result.area.builtUpTotalSqm)} sqm (${n(result.area.builtUpTotalSqft)} sqft)`],
    ["Rooms area", `${n(result.area.roomsAreaSqm)} sqm`],
    ["Toilet block", `${n(result.area.toiletBlockSqm)} sqm`],
    ["Dining + kitchen", `${n(result.area.diningKitchenSqm)} sqm`],
    ["Office / security", `${n(result.area.officeSecuritySqm)} sqm`],
    ["Corridor", `${n(result.area.corridorSqm)} sqm`],
    ["Staircase + walkway", `${n(result.area.staircaseWalkwaySqm)} sqm`],
    ["Roof area", `${n(result.area.roofActualSqm)} sqm`],
  ]));

  heading("2. Occupancy & sanitation");
  tbl("", kv([
    ["Capacity", `${n(result.occupancy.totalCapacity)} persons (${result.occupancy.rooms} rooms x ${result.occupancy.personsPerRoom})`],
    ["Bunk beds", `${n(result.occupancy.bunkBedsTotal)}`],
    ["WC / Urinals / Baths / Basins", `${result.occupancy.wc} / ${result.occupancy.urinals} / ${result.occupancy.baths} / ${result.occupancy.washBasins}`],
  ]));

  heading("3. Structural steel");
  tbl("", result.structural.items.map((it) => [it.item, it.lengthM ? `${n(it.lengthM)} m` : it.qty ? `${it.qty} no` : it.areaSqm ? `${n(it.areaSqm)} sqm` : "—", `${n(it.weightKg)} kg`])
    .concat([["TOTAL STEEL", `${result.structural.modules} modules`, `${n(result.structural.totalSteelKg)} kg`]]), ["Item", "Length/Qty", "Weight"]);

  heading("4. Panels / 5. Flooring");
  tbl("", kv([
    [`${result.panels.thicknessMm}mm ${result.panels.panelType} panel`, `${n(result.panels.totalWithWastageSqm)} sqm (${n(result.panels.totalWithWastageSqft)} sqft)`],
    ["Cement board / Vinyl", `${n(result.flooring.cementBoardSqm)} / ${n(result.flooring.vinylSqm)} sqm`],
    ["Skirting", `${n(result.flooring.skirtingM)} m`],
  ]));

  heading("6. Doors & windows / 7. Electrical");
  tbl("", kv([
    ["Doors / Windows / Ventilators", `${result.openings.doors} / ${result.openings.windows} / ${result.openings.ventilators}`],
    ["Lights / Fans / Sockets", `${result.electrical.lights} / ${result.electrical.fans} / ${result.electrical.sockets}`],
    ["Demand load", `${result.electrical.demandLoadKW} kW, main ${result.electrical.recommendedMainMCBamp} A, ${result.electrical.distributionBoards} DB`],
    ["Wiring", result.electrical.recommendedWire],
  ]));

  heading("8. Plumbing");
  tbl("", kv([
    ["CPVC / PVC waste", `${n(result.plumbing.cpvcPipeM)} m / ${n(result.plumbing.pvcWastePipeM)} m`],
    ["WC / Urinal / Basin / Shower", `${result.plumbing.wc} / ${result.plumbing.urinals} / ${result.plumbing.washBasins} / ${result.plumbing.showers}`],
    ["Floor traps / Angle cocks / Taps", `${result.plumbing.floorTraps} / ${result.plumbing.angleCocks} / ${result.plumbing.taps}`],
  ]));

  heading("9. BOQ");
  tbl("", result.boq.map((r) => [r.sl, r.item, r.specification, r.unit, n(r.quantity), r.remarks]),
    ["#", "Item", "Specification", "Unit", "Qty", "Remarks"]);

  heading("Weight & assumptions");
  tbl("", kv([["Total approx weight", `${n(result.weight.totalKg)} kg (${result.weight.totalTonnes} t)`]]));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  result.assumptions.forEach((a) => {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40; }
    const lines = doc.splitTextToSize("• " + a, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 9 + 2;
  });

  doc.save(`labour-colony-${(result.config.projectName || "estimate").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
