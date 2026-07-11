"use client";

import { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Building2, Download, Printer, Save, Trash2, Users, LayoutGrid, Layers,
  Zap, Droplets, Package, FileText, DoorOpen, Bath, BedDouble,
  Home, ShieldCheck, HardHat, FilePlus2, Copy, UserSearch, Sheet as SheetIcon, MapPin, Eye, Ruler,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NumberInput } from "@/components/admin/NumberInput";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { LabourColonyDrawings } from "@/components/admin/LabourColonyDrawings";
import { RoomFloorPlan } from "@/components/admin/labour-colony/RoomFloorPlan";
import { CivilWorkTab } from "@/components/admin/labour-colony/CivilWorkTab";
import { ConstructionDrawingTab } from "@/components/admin/labour-colony/ConstructionDrawingTab";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportToExcel, formatINR } from "@/lib/exportUtils";
import {
  calculateLabourColony,
  type LabourColonyConfig,
  type LabourColonyResult,
  type PanelType,
  type FloorCount,
} from "@/lib/quotation/labourColony";
import {
  LENGTH_UNITS, formatLen, unitSuffix, unitStep, toUnit, fromUnit, toFeetInches, fromFeetInches,
  type LengthUnit,
} from "@/lib/quotation/units";
import { buildRoomFloorPlan } from "@/lib/quotation/roomFloorPlan";
import {
  calculateCivilWork,
  DEFAULT_CIVIL_CONFIG,
  type CivilWorkConfig,
  type CivilContext,
  type CivilWorkResult,
} from "@/lib/quotation/labourColonyCivil";
import {
  defaultProjectMeta,
  newId,
  projectTitle,
  LABOUR_COLONY_TYPES,
  type ProjectMeta,
  type LabourColonyProject,
  type LabourColonyType,
  type SaleOrRental,
} from "@/lib/quotation/labourColonyProject";
import {
  listProjects,
  saveProject as storeSave,
  deleteProject as storeDelete,
  loadCustomers,
  loadPartyShipTo,
  type ColonyCustomer,
} from "@/lib/quotation/labourColonyStore";

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
  staircasePosition: "both",
  panelType: "PUF",
  panelThicknessMm: 50,
  wastagePercent: 5,
  facilities: { toilet: true, bunkBeds: true, diningKitchen: true, officeSecurity: true },
};

type SizeMode = "capacity" | "rooms";

const n = (x: number) => (Number.isFinite(x) ? x.toLocaleString("en-IN") : "—");
const floorsLabel = (f: FloorCount) => (f === 1 ? "Ground floor" : f === 2 ? "G+1" : "G+2");

function buildCivilCtx(result: LabourColonyResult): CivilContext {
  return {
    footprintLengthM: result.area.footprintLengthM,
    footprintWidthM: result.area.footprintWidthM,
    builtUpSqm: result.area.builtUpTotalSqm,
    floors: result.config.floors,
    wcCount: result.occupancy.wc,
    bathCount: result.occupancy.baths,
    totalCapacity: result.occupancy.totalCapacity,
    diningKitchen: result.config.facilities.diningKitchen,
  };
}

export default function LabourColonyQuotation() {
  const [tab, setTab] = useState("project");
  const [config, setConfig] = useState<LabourColonyConfig>(DEFAULT_CONFIG);
  const [civil, setCivil] = useState<CivilWorkConfig>(DEFAULT_CIVIL_CONFIG);
  const [meta, setMetaState] = useState<ProjectMeta>(defaultProjectMeta());
  const [sizeMode, setSizeMode] = useState<SizeMode>("capacity");
  const [projectId, setProjectId] = useState<string>(() => newId());

  const [projects, setProjects] = useState<LabourColonyProject[]>([]);
  const [remoteAvailable, setRemoteAvailable] = useState(false);
  const [customers, setCustomers] = useState<ColonyCustomer[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    listProjects().then(({ projects, remoteAvailable }) => {
      setProjects(projects);
      setRemoteAvailable(remoteAvailable);
    });
    loadCustomers().then(setCustomers);
  }, []);

  const setNum = (key: keyof LabourColonyConfig) => (e: { target: { value: string } }) =>
    setConfig((c) => ({ ...c, [key]: Number(e.target.value) || 0 }));
  const setStr = (key: keyof LabourColonyConfig) => (e: { target: { value: string } }) =>
    setConfig((c) => ({ ...c, [key]: e.target.value }));
  const setFac = (key: keyof LabourColonyConfig["facilities"]) => (checked: boolean) =>
    setConfig((c) => ({ ...c, facilities: { ...c.facilities, [key]: checked } }));
  const setMeta = (p: Partial<ProjectMeta>) => setMetaState((m) => ({ ...m, ...p }));

  const unit: LengthUnit = config.lengthUnit ?? "ftin";
  const setUnit = (u: LengthUnit) => setConfig((c) => ({ ...c, lengthUnit: u }));
  const fmtLen = (m: number) => formatLen(m, unit);
  const setLenM = (key: keyof LabourColonyConfig) => (m: number) => setConfig((c) => ({ ...c, [key]: m }));

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
        sizeMode === "capacity" ? { ...config, totalRooms: undefined } : { ...config, capacity: undefined };
      return calculateLabourColony(cfg);
    } catch {
      return null;
    }
  }, [config, sizeMode, valid]);

  const colonyGeom = useMemo(() => (result ? buildRoomFloorPlan(result, config.floorPlan, 0) : null), [result, config.floorPlan]);

  const civilCtx = useMemo<CivilContext | null>(() => (result ? buildCivilCtx(result) : null), [result]);
  const civilResult = useMemo<CivilWorkResult | null>(
    () => (civilCtx && civil.enabled ? calculateCivilWork(civil, civilCtx) : null),
    [civil, civilCtx],
  );

  /* ---------- persistence ---------- */
  const buildProject = (): LabourColonyProject => {
    const now = new Date().toISOString();
    const existing = projects.find((p) => p.id === projectId);
    return {
      id: projectId,
      projectNumber: existing?.projectNumber,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      meta: { ...meta, projectName: config.projectName || "", location: config.location || "" },
      config,
      civil,
      quotationId: existing?.quotationId,
      salesOrderId: existing?.salesOrderId,
      enquiryId: existing?.enquiryId,
    };
  };

  const refreshList = async () => {
    const { projects, remoteAvailable } = await listProjects();
    setProjects(projects);
    setRemoteAvailable(remoteAvailable);
  };

  const save = async () => {
    const proj = buildProject();
    const { remote } = await storeSave(proj);
    await refreshList();
    toast({
      title: "Project saved",
      description: remote ? "Synced to database." : "Saved locally (database not available yet).",
    });
  };

  const loadProject = (p: LabourColonyProject) => {
    setProjectId(p.id);
    setConfig(p.config);
    setCivil(p.civil ?? DEFAULT_CIVIL_CONFIG);
    setMetaState(p.meta ?? defaultProjectMeta());
    setSizeMode(p.config.totalRooms ? "rooms" : "capacity");
    setTab("project");
    toast({ title: "Project loaded", description: projectTitle(p) });
  };

  const duplicateProject = async (p: LabourColonyProject) => {
    const now = new Date().toISOString();
    const copy: LabourColonyProject = {
      ...p,
      id: newId(),
      projectNumber: undefined,
      createdAt: now,
      updatedAt: now,
      meta: { ...p.meta, projectName: `${projectTitle(p)} (copy)`, status: "draft" },
      quotationId: undefined,
      salesOrderId: undefined,
      enquiryId: undefined,
    };
    await storeSave(copy);
    await refreshList();
    toast({ title: "Project duplicated", description: copy.meta.projectName });
  };

  const removeProject = async (id: string) => {
    await storeDelete(id);
    await refreshList();
    if (id === projectId) newProject();
  };

  const newProject = () => {
    setProjectId(newId());
    setConfig(DEFAULT_CONFIG);
    setCivil(DEFAULT_CIVIL_CONFIG);
    setMetaState(defaultProjectMeta());
    setSizeMode("capacity");
    setTab("project");
  };

  const pickCustomer = async (c: ColonyCustomer) => {
    const billing = c.address || "";
    setMeta({
      customerName: c.name,
      mobile: c.mobile,
      email: c.email || "",
      partyId: c.source === "parties" ? c.id : undefined,
      billingAddress: billing,
      // provisional: mirror billing until we fetch a dedicated ship-to
      shippingAddress: billing,
    });
    if (!config.location && (c.city || c.address)) setConfig((cc) => ({ ...cc, location: c.address || c.city || "" }));
    setCustomerOpen(false);
    toast({ title: "Customer selected", description: c.name });
    // pull the customer's default ship-to address (party_addresses), if any
    if (c.source === "parties") {
      const shipTo = await loadPartyShipTo(c.id);
      if (shipTo) setMetaState((m) => ({ ...m, shippingAddress: shipTo, shippingSameAsBilling: false }));
    }
  };

  const exportPdf = () => {
    if (!result) {
      toast({ title: "Nothing to export", description: "Complete the structure inputs first.", variant: "destructive" });
      return;
    }
    exportColonyPdf(result, civilResult, meta);
    toast({ title: "PDF exported" });
  };

  const exportCivilBoq = () => {
    if (!civilResult) {
      toast({ title: "Civil work is off", description: "Enable civil work to export its BOQ.", variant: "destructive" });
      return;
    }
    const rows = civilResult.boq.map((r) => ({
      "#": r.sl, Head: r.head, Item: r.item, Spec: r.spec, Unit: r.unit,
      Qty: r.quantity, Rate: r.rate, Amount: r.amount,
    }));
    exportToExcel(rows, `civil-boq-${(config.projectName || "labour-colony").replace(/\s+/g, "-").toLowerCase()}`, "Civil BOQ");
    toast({ title: "Civil BOQ exported" });
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 60);
    return customers
      .filter((c) => `${c.name} ${c.mobile} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q))
      .slice(0, 60);
  }, [customers, customerSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prefab Labour Colony Calculator"
        description="Project details, accommodation, civil work, drawings, BOQ & quotation for a prefab labour colony — integrated with customers and the quotation system."
        badge={<Badge variant="outline" className="font-mono">{remoteAvailable ? "DB synced" : "Local"}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={newProject} className="gap-2"><FilePlus2 className="h-4 w-4" /> New</Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!result} className="gap-2"><Eye className="h-4 w-4" /> Preview</Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={save} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
            <Button onClick={exportPdf} disabled={!result} className="gap-2 bg-gradient-to-r from-amber to-amber-light text-white border-0"><Download className="h-4 w-4" /> Export PDF</Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="flex-wrap h-auto justify-start">
            <TabsTrigger value="project" className="gap-1.5"><Building2 className="h-4 w-4" /> Project</TabsTrigger>
            <TabsTrigger value="structure" className="gap-1.5"><LayoutGrid className="h-4 w-4" /> Structure &amp; Drawings</TabsTrigger>
            <TabsTrigger value="civil" className="gap-1.5"><HardHat className="h-4 w-4" /> Civil Work</TabsTrigger>
            <TabsTrigger value="drawing" className="gap-1.5"><Ruler className="h-4 w-4" /> Construction Drawing</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-4 w-4" /> Reports &amp; Saved</TabsTrigger>
          </TabsList>
        </div>

        {/* ============ PROJECT DETAILS (§1) ============ */}
        <TabsContent value="project" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminCard>
              <AdminCardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-amber" /> Project details</h3>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCustomerOpen(true)}><UserSearch className="h-4 w-4" /> Pick customer</Button>
                </div>
                <Field label="Project name"><Input value={config.projectName || ""} onChange={setStr("projectName")} placeholder="e.g. ABC Infra labour camp" /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Customer name"><Input value={meta.customerName} onChange={(e) => setMeta({ customerName: e.target.value })} placeholder="Customer / company" /></Field>
                  <Field label="Mobile number"><Input value={meta.mobile} onChange={(e) => setMeta({ mobile: e.target.value })} placeholder="10-digit mobile" /></Field>
                  <Field label="Email address"><Input value={meta.email} onChange={(e) => setMeta({ email: e.target.value })} placeholder="name@example.com" /></Field>
                  <Field label="Project location"><Input value={config.location || ""} onChange={setStr("location")} placeholder="Site location / city" /></Field>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-amber" /> Address</h4>
                  <Field label="Billing address">
                    <Textarea
                      value={meta.billingAddress}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMetaState((m) => ({ ...m, billingAddress: v, shippingAddress: m.shippingSameAsBilling ? v : m.shippingAddress }));
                      }}
                      placeholder="Customer billing address"
                      rows={2}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={meta.shippingSameAsBilling}
                      onCheckedChange={(v) => setMetaState((m) => ({ ...m, shippingSameAsBilling: v, shippingAddress: v ? m.billingAddress : m.shippingAddress }))}
                    />
                    <span className="text-muted-foreground">Shipping / delivery address same as billing</span>
                  </label>
                  <Field label="Shipping / site delivery address">
                    <Textarea
                      value={meta.shippingSameAsBilling ? meta.billingAddress : meta.shippingAddress}
                      onChange={(e) => setMeta({ shippingAddress: e.target.value })}
                      disabled={meta.shippingSameAsBilling}
                      placeholder="Delivery / site address for the labour colony"
                      rows={2}
                    />
                  </Field>
                </div>

                {meta.partyId && <p className="text-xs text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Linked to existing customer record</p>}
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2"><Users className="h-4 w-4 text-amber" /> Requirement</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Labour-colony type">
                    <Select value={meta.colonyType} onValueChange={(v) => setMeta({ colonyType: v as LabourColonyType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LABOUR_COLONY_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Sale or rental">
                    <Select value={meta.saleOrRental} onValueChange={(v) => setMeta({ saleOrRental: v as SaleOrRental })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="sale">Sale</SelectItem><SelectItem value="rental">Rental</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field label="Number of workers">
                    <NumberInput value={meta.workers} onChange={(e) => {
                      const w = Number(e.target.value) || 0;
                      setMeta({ workers: w });
                      if (sizeMode === "capacity") setConfig((c) => ({ ...c, capacity: w }));
                    }} />
                  </Field>
                  <Field label="Number of floors">
                    <Select value={String(config.floors)} onValueChange={(v) => setConfig((c) => ({ ...c, floors: Number(v) as FloorCount }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Ground floor</SelectItem>
                        <SelectItem value="2">G+1</SelectItem>
                        <SelectItem value="3">G+2</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Required duration (months)"><NumberInput value={meta.durationMonths} onChange={(e) => setMeta({ durationMonths: Number(e.target.value) || 0 })} /></Field>
                </div>
                <Field label="Requirement notes"><Textarea value={meta.requirementNotes} onChange={(e) => setMeta({ requirementNotes: e.target.value })} placeholder="Site conditions, timelines, special requirements…" rows={3} /></Field>
              </AdminCardContent>
            </AdminCard>
          </div>
        </TabsContent>

        {/* ============ STRUCTURE & DRAWINGS (existing engine) ============ */}
        <TabsContent value="structure" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* INPUTS */}
            <AdminCard className="lg:col-span-1">
              <AdminCardContent className="space-y-5">
                <div className="space-y-4">
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
                    <div className="space-y-2"><Label>Required capacity (persons)</Label><NumberInput value={config.capacity ?? 0} onChange={setNum("capacity")} /></div>
                  ) : (
                    <div className="space-y-2"><Label>Total rooms</Label><NumberInput value={config.totalRooms ?? 0} onChange={setNum("totalRooms")} /></div>
                  )}
                  <div className="space-y-2"><Label>Persons per room</Label><NumberInput value={config.personsPerRoom} onChange={setNum("personsPerRoom")} /></div>
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
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-amber" /> Room &amp; panel</h3>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-amber" />
                      <Select value={unit} onValueChange={(v) => setUnit(v as LengthUnit)}>
                        <SelectTrigger className="h-8 w-[9.5rem] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{LENGTH_UNITS.map((u) => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Length</Label><UnitNumber m={config.roomLength} unit={unit} onChangeM={setLenM("roomLength")} /></div>
                    <div className="space-y-1"><Label className="text-xs">Width</Label><UnitNumber m={config.roomWidth} unit={unit} onChangeM={setLenM("roomWidth")} /></div>
                    <div className="space-y-1"><Label className="text-xs">Height</Label><UnitNumber m={config.roomHeight} unit={unit} onChangeM={setLenM("roomHeight")} /></div>
                  </div>
                  <div className="space-y-2"><Label>Corridor width</Label><UnitNumber m={config.corridorWidth} unit={unit} onChangeM={setLenM("corridorWidth")} /></div>
                  <div className="space-y-2">
                    <Label>Corridor position (shift to any side)</Label>
                    <Select value={config.corridorPosition ?? "center"} onValueChange={(v) => setConfig((c) => ({ ...c, corridorPosition: v as LabourColonyConfig["corridorPosition"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both sides — upper + lower (veranda)</SelectItem>
                        <SelectItem value="center">Center (double-loaded corridor)</SelectItem>
                        <SelectItem value="top">Upper side only</SelectItem>
                        <SelectItem value="bottom">Lower side only</SelectItem>
                        <SelectItem value="left">Left side</SelectItem>
                        <SelectItem value="right">Right side</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Staircase position</Label>
                    <Select value={config.staircasePosition ?? "both"} onValueChange={(v) => setConfig((c) => ({ ...c, staircasePosition: v as LabourColonyConfig["staircasePosition"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both ends (left + right)</SelectItem>
                        <SelectItem value="left">Left side</SelectItem>
                        <SelectItem value="right">Right side</SelectItem>
                        <SelectItem value="top">Upper side</SelectItem>
                        <SelectItem value="bottom">Lower side</SelectItem>
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
                  <div className="space-y-2"><Label>Wastage (%)</Label><NumberInput value={config.wastagePercent} onChange={setNum("wastagePercent")} /></div>
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

            {/* RESULTS */}
            <div className="lg:col-span-2 space-y-6">
              {!result ? (
                <AdminCard><AdminCardContent className="py-16 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  Enter capacity and room dimensions to see the calculation.
                </AdminCardContent></AdminCard>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Tile label="Capacity" value={`${n(result.occupancy.totalCapacity)} persons`} />
                    <Tile label="Rooms" value={`${n(result.occupancy.rooms)} (${floorsLabel(result.config.floors)})`} />
                    <Tile label="Built-up" value={`${n(result.area.builtUpTotalSqm)} sqm`} sub={`${n(result.area.builtUpTotalSqft)} sqft`} />
                    <Tile label="Approx weight" value={`${n(result.weight.totalTonnes)} t`} />
                  </div>

                  <Section title="Drawings — Top View & Elevations" icon={LayoutGrid}>
                    <LabourColonyDrawings result={result} unit={unit} />
                  </Section>

                  <Section title="Room-wise Floor Plan (doors, windows, verandas & staircase)" icon={DoorOpen}>
                    <RoomFloorPlan
                      result={result}
                      floorPlan={config.floorPlan}
                      onChange={(fp) => setConfig((c) => ({ ...c, floorPlan: fp }))}
                      unit={unit}
                      onUnitChange={setUnit}
                    />
                  </Section>

                  <Section title="1. Area" icon={LayoutGrid}>
                    <KV rows={[
                      ["Room size", `${fmtLen(result.config.roomLength)} × ${fmtLen(result.config.roomWidth)} = ${n(result.area.roomAreaSqm)} sqm`],
                      ...(colonyGeom ? [
                        ["Total colony length", fmtLen(colonyGeom.totalLengthM)] as [string, string],
                        ["Total colony width", fmtLen(colonyGeom.totalWidthM)] as [string, string],
                      ] : []),
                      ["Rooms total area", `${n(result.area.roomsAreaSqm)} sqm`],
                      ["Toilet block", `${n(result.area.toiletBlockSqm)} sqm`],
                      ["Dining + kitchen", `${n(result.area.diningKitchenSqm)} sqm`],
                      ["Office / security", `${n(result.area.officeSecuritySqm)} sqm`],
                      ["Corridor / passage", `${n(result.area.corridorSqm)} sqm`],
                      ["Staircase + walkway", `${n(result.area.staircaseWalkwaySqm)} sqm`],
                      ["Footprint / floor", `${fmtLen(result.area.footprintLengthM)} × ${fmtLen(result.area.footprintWidthM)}`],
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
        </TabsContent>

        {/* ============ CIVIL WORK (§6) ============ */}
        <TabsContent value="civil" className="mt-6">
          {civilCtx ? (
            <CivilWorkTab config={civil} onChange={setCivil} ctx={civilCtx} />
          ) : (
            <AdminCard><AdminCardContent className="py-16 text-center text-muted-foreground">
              <HardHat className="h-10 w-10 mx-auto mb-3 opacity-40" />
              Complete the Structure tab (capacity + room size) to size the civil work.
            </AdminCardContent></AdminCard>
          )}
        </TabsContent>

        {/* ============ CONSTRUCTION DRAWING (§6/§7) ============ */}
        <TabsContent value="drawing" className="mt-6">
          {result && civilResult ? (
            <ConstructionDrawingTab config={config} rooms={result.occupancy.rooms} floors={config.floors} civil={civilResult} />
          ) : (
            <AdminCard><AdminCardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              Complete the Structure tab (capacity + room size) and keep Civil Work enabled to generate the construction drawing.
            </AdminCardContent></AdminCard>
          )}
        </TabsContent>

        {/* ============ REPORTS & SAVED (§10) ============ */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          <AdminCard>
            <AdminCardContent>
              <h3 className="font-display font-bold flex items-center gap-2 mb-4"><FileText className="h-4 w-4 text-amber" /> Reports &amp; export</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={save} className="gap-2"><Save className="h-4 w-4" /> Save project</Button>
                <Button variant="outline" onClick={newProject} className="gap-2"><FilePlus2 className="h-4 w-4" /> New project</Button>
                <Button variant="outline" onClick={exportPdf} disabled={!result} className="gap-2"><Download className="h-4 w-4" /> Download PDF (with civil BOQ)</Button>
                <Button variant="outline" onClick={exportCivilBoq} disabled={!civilResult} className="gap-2"><SheetIcon className="h-4 w-4" /> Civil BOQ → Excel</Button>
                <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
              </div>
              {civilResult && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Tile label="Civil work total" value={formatINR(civilResult.totalCost)} />
                  <Tile label="Concrete" value={`${civilResult.totalConcreteCum} cum`} />
                  <Tile label="Reinforcement" value={`${civilResult.totalSteelKg} kg`} />
                  <Tile label="Footings" value={`${civilResult.foundation.footingCount} nos`} />
                </div>
              )}
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent>
              <h3 className="font-display font-bold mb-3">Saved projects {remoteAvailable ? <span className="text-xs font-normal text-emerald-600">· database</span> : <span className="text-xs font-normal text-muted-foreground">· local only</span>}</h3>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No saved projects yet. Fill in the details and click <strong>Save project</strong>.</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => (
                    <div key={p.id} className={cn("flex items-center justify-between gap-3 p-3 rounded-xl border hover:bg-muted/40", p.id === projectId && "border-amber/50 bg-amber/5")}>
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {projectTitle(p)}
                          {p.projectNumber && <Badge variant="outline" className="font-mono text-[10px]">{p.projectNumber}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.meta?.customerName || "—"} · {p.config?.floors ? floorsLabel(p.config.floors) : ""} · {new Date(p.updatedAt).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => loadProject(p)}>Edit</Button>
                        <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicateProject(p)}><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" title="Delete" onClick={() => removeProject(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>
      </Tabs>

      {/* customer picker */}
      {/* ---------------- 2D LAYOUT PREVIEW ---------------- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-amber" /> Labour Colony — 2D Layout Preview</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="font-display font-bold text-base">{config.projectName || meta.projectName || "Untitled labour colony"}</div>
                <div className="text-muted-foreground">
                  {meta.customerName ? `${meta.customerName} · ` : ""}{config.location || meta.location || "—"}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                  <span><b>Capacity:</b> {n(result.occupancy.totalCapacity)} persons</span>
                  <span><b>Rooms:</b> {n(result.occupancy.rooms)} ({floorsLabel(result.config.floors)})</span>
                  <span><b>Built-up:</b> {n(result.area.builtUpTotalSqm)} sqm</span>
                  {colonyGeom && <span><b>Total colony:</b> {fmtLen(colonyGeom.totalLengthM)} × {fmtLen(colonyGeom.totalWidthM)}</span>}
                  <span><b>Corridor:</b> {result.config.corridorPosition ?? "center"} · {fmtLen(result.config.corridorWidth)}</span>
                </div>
              </div>
              <LabourColonyDrawings result={result} unit={unit} />
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Enter capacity and room dimensions to preview the layout.</div>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
            <Button onClick={exportPdf} disabled={!result} className="gap-2 bg-gradient-to-r from-amber to-amber-light text-white border-0"><Download className="h-4 w-4" /> Download PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Select an existing customer</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Search name / mobile / company / email" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
          <div className="max-h-80 overflow-y-auto space-y-1 -mr-2 pr-2">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No matching customers. Close and enter details manually.</p>
            ) : (
              filteredCustomers.map((c) => (
                <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                  <div className="font-medium text-sm flex items-center gap-2">{c.name}{c.source === "parties" && <Badge variant="outline" className="text-[10px]">record</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{[c.mobile, c.company, c.city].filter(Boolean).join(" · ") || "—"}</div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- small presentational helpers ---------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

/** Unit-aware length input: stores/returns METRES, displays & accepts the selected unit
 *  (two boxes for feet-inches, one box + suffix otherwise). */
function UnitNumber({ m, unit, onChangeM, min = 0 }: { m: number; unit: LengthUnit; onChangeM: (m: number) => void; min?: number }) {
  if (unit === "ftin") {
    const { ft, inch } = toFeetInches(m);
    return (
      <div className="flex items-center gap-1">
        <NumberInput value={ft} onChange={(e) => onChangeM(Math.max(min, fromFeetInches(parseInt(e.target.value, 10) || 0, inch)))} className="text-center" />
        <span className="text-[10px] text-muted-foreground">ft</span>
        <NumberInput value={inch} onChange={(e) => onChangeM(Math.max(min, fromFeetInches(ft, parseInt(e.target.value, 10) || 0)))} className="text-center" />
        <span className="text-[10px] text-muted-foreground">in</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <NumberInput value={toUnit(m, unit)} step={unitStep(unit)}
        onChange={(e) => { const v = parseFloat(e.target.value); onChangeM(Math.max(min, fromUnit(Number.isFinite(v) ? v : 0, unit))); }} />
      <span className="w-6 text-[10px] text-muted-foreground">{unitSuffix(unit)}</span>
    </div>
  );
}
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
function exportColonyPdf(result: LabourColonyResult, civil: CivilWorkResult | null, meta: ProjectMeta) {
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
  doc.text("Prefabricated Labour Colony — Estimate, BOQ & Civil Work", margin, 108);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const today = new Date().toLocaleDateString("en-IN");
  const proj = result.config.projectName || "—";
  const loc = result.config.location || "—";
  doc.text(`Project: ${proj}    Location: ${loc}    Date: ${today}`, margin, 124);

  let y = 138;
  if (meta.customerName) {
    doc.text(`Customer: ${meta.customerName}${meta.mobile ? "  |  " + meta.mobile : ""}${meta.email ? "  |  " + meta.email : ""}`, margin, y);
    y += 13;
  }
  const shipAddr = meta.shippingSameAsBilling ? meta.billingAddress : meta.shippingAddress;
  if (meta.billingAddress) {
    const lines = doc.splitTextToSize(`Billing: ${meta.billingAddress}`, W - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 11 + 1;
  }
  if (shipAddr) {
    const lines = doc.splitTextToSize(`Ship to: ${shipAddr}`, W - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 11 + 1;
  }
  y += 6;

  const kv = (rows: [string, string | number][]) => rows.map(([k, v]) => [k, String(v)]);
  const tbl = (body: (string | number)[][], head?: string[]) => {
    autoTable(doc, {
      startY: y,
      head: head ? [head] : undefined,
      body: body as any,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    // @ts-ignore - lastAutoTable is added by the plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 16;
  };
  const heading = (t: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(t, margin, y);
    y += 6;
  };

  heading("1. Area");
  tbl(kv([
    ["Total built-up", `${n(result.area.builtUpTotalSqm)} sqm (${n(result.area.builtUpTotalSqft)} sqft)`],
    ["Rooms area", `${n(result.area.roomsAreaSqm)} sqm`],
    ["Toilet block", `${n(result.area.toiletBlockSqm)} sqm`],
    ["Dining + kitchen", `${n(result.area.diningKitchenSqm)} sqm`],
    ["Office / security", `${n(result.area.officeSecuritySqm)} sqm`],
    ["Corridor", `${n(result.area.corridorSqm)} sqm`],
    ["Roof area", `${n(result.area.roofActualSqm)} sqm`],
  ]));

  heading("2. Occupancy & sanitation");
  tbl(kv([
    ["Capacity", `${n(result.occupancy.totalCapacity)} persons (${result.occupancy.rooms} rooms x ${result.occupancy.personsPerRoom})`],
    ["Bunk beds", `${n(result.occupancy.bunkBedsTotal)}`],
    ["WC / Urinals / Baths / Basins", `${result.occupancy.wc} / ${result.occupancy.urinals} / ${result.occupancy.baths} / ${result.occupancy.washBasins}`],
  ]));

  heading("3. Structural steel");
  tbl(result.structural.items.map((it) => [it.item, it.lengthM ? `${n(it.lengthM)} m` : it.qty ? `${it.qty} no` : it.areaSqm ? `${n(it.areaSqm)} sqm` : "—", `${n(it.weightKg)} kg`])
    .concat([["TOTAL STEEL", `${result.structural.modules} modules`, `${n(result.structural.totalSteelKg)} kg`]]), ["Item", "Length/Qty", "Weight"]);

  heading("4. Panels / 5. Flooring / 6. Openings");
  tbl(kv([
    [`${result.panels.thicknessMm}mm ${result.panels.panelType} panel`, `${n(result.panels.totalWithWastageSqm)} sqm`],
    ["Cement board / Vinyl", `${n(result.flooring.cementBoardSqm)} / ${n(result.flooring.vinylSqm)} sqm`],
    ["Doors / Windows / Ventilators", `${result.openings.doors} / ${result.openings.windows} / ${result.openings.ventilators}`],
  ]));

  heading("7. Electrical / 8. Plumbing");
  tbl(kv([
    ["Lights / Fans / Sockets", `${result.electrical.lights} / ${result.electrical.fans} / ${result.electrical.sockets}`],
    ["Demand load", `${result.electrical.demandLoadKW} kW, main ${result.electrical.recommendedMainMCBamp} A`],
    ["CPVC / PVC waste", `${n(result.plumbing.cpvcPipeM)} m / ${n(result.plumbing.pvcWastePipeM)} m`],
    ["WC / Urinal / Basin / Shower", `${result.plumbing.wc} / ${result.plumbing.urinals} / ${result.plumbing.washBasins} / ${result.plumbing.showers}`],
  ]));

  heading("9. Material BOQ");
  tbl(result.boq.map((r) => [r.sl, r.item, r.specification, r.unit, n(r.quantity), r.remarks]),
    ["#", "Item", "Specification", "Unit", "Qty", "Remarks"]);

  if (civil && civil.enabled) {
    heading("10. Civil Work — cost summary");
    tbl([
      ["Site preparation", formatINR(civil.sitePrep.cost)],
      ["Foundation", formatINR(civil.foundation.cost)],
      ["Flooring & plinth", formatINR(civil.flooringPlinth.cost)],
      ["Drainage & sewage", formatINR(civil.drainage.cost)],
      ["Water supply", formatINR(civil.waterSupply.cost)],
      ["Electrical civil", formatINR(civil.electricalCivil.cost)],
      ["External development", formatINR(civil.externalDev.cost)],
      ["GRAND CIVIL TOTAL", formatINR(civil.totalCost)],
    ], ["Civil sub-head", "Amount"]);

    heading("Civil-Work BOQ");
    tbl(civil.boq.map((r) => [r.sl, r.item, r.spec, r.unit, n(r.quantity), formatINR(r.rate), formatINR(r.amount)]),
      ["#", "Item", "Spec", "Unit", "Qty", "Rate", "Amount"]);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    civil.warnings.forEach((wtext) => {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40; }
      const lines = doc.splitTextToSize("Note: " + wtext, W - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 9 + 2;
    });
  }

  heading("Assumptions");
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
