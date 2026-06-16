"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ShieldAlert, ShieldCheck, Plus, Search, Download,
  FileText, Trash2, Save, ChevronLeft, Package, TrendingUp, CheckCircle2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberInput } from "@/components/admin/NumberInput";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Structural / Steel",
  "Waterproofing & Finishing",
  "Electrical – Wiring",
  "Electrical – Fixtures",
  "Modular Plates & Switches",
] as const;

const PRESET_MATERIALS: { category: string; name: string; unit: string }[] = [
  { category: "Structural / Steel", name: "Pipe tube (MS)", unit: "ft" },
  { category: "Structural / Steel", name: "Channel (MS)", unit: "ft" },
  { category: "Structural / Steel", name: "Sheet (MS)", unit: "pcs" },
  { category: "Structural / Steel", name: "Welding rod", unit: "kg" },
  { category: "Waterproofing & Finishing", name: "Waterproofing paste", unit: "kg" },
  { category: "Waterproofing & Finishing", name: "Primer", unit: "ltr" },
  { category: "Waterproofing & Finishing", name: "Paint", unit: "ltr" },
  { category: "Electrical – Wiring", name: "Wire 1.5 sq mm", unit: "mtr" },
  { category: "Electrical – Wiring", name: "Wire 2.5 sq mm", unit: "mtr" },
  { category: "Electrical – Wiring", name: "Wire 4 sq mm", unit: "mtr" },
  { category: "Electrical – Wiring", name: "Wiring conduit pipe with fitting", unit: "mtr" },
  { category: "Electrical – Fixtures", name: "Fan (ceiling)", unit: "nos" },
  { category: "Electrical – Fixtures", name: "Light (LED/tube)", unit: "nos" },
  { category: "Electrical – Fixtures", name: "Bulkhead light", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Modular plate 8M", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Modular plate 6.3M", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Switch 5A", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Socket 5A", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Switch 20A", unit: "nos" },
  { category: "Modular Plates & Switches", name: "Socket 20A", unit: "nos" },
];

interface Settings { id: string; theft_detection_enabled: boolean; warning_threshold_percent: number; alert_threshold_percent: number; }
interface Invoice { id: string; invoice_number: string; invoice_date: string; supplier_name: string | null; notes: string | null; status: string; created_at: string; }
interface Material { id: string; invoice_id: string | null; category: string; name: string; unit: string; ordered: number; received: number; used: number; }

type Severity = "ok" | "warning" | "alert";

function getSeverity(m: Material, s: Settings | null): Severity {
  if (!s || !s.theft_detection_enabled || !m.ordered) return "ok";
  const shortPct = ((m.ordered - m.received) / m.ordered) * 100;
  if (shortPct > s.alert_threshold_percent) return "alert";
  if (shortPct > s.warning_threshold_percent) return "warning";
  return "ok";
}

const sevRow = { ok: "", warning: "bg-yellow-50 dark:bg-yellow-950/20", alert: "bg-red-50 dark:bg-red-950/20" };
const sevBadge = {
  ok: <Badge className="bg-emerald-500 hover:bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>,
  warning: <Badge className="bg-yellow-500 hover:bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>,
  alert: <Badge className="bg-red-500 hover:bg-red-500"><ShieldAlert className="w-3 h-3 mr-1" />Alert</Badge>,
};

export default function FactoryInvoiceTracker() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);

  // search/filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "alert" | "warning" | "ok">("all");

  // new invoice dialog
  const [newInvOpen, setNewInvOpen] = useState(false);
  const [newInv, setNewInv] = useState({ invoice_number: "", invoice_date: new Date().toISOString().slice(0, 10), supplier_name: "", notes: "" });

  // add custom material dialog
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [newMat, setNewMat] = useState({ category: CATEGORIES[0] as string, name: "", unit: "nos" });

  async function loadAll() {
    setLoading(true);
    const [s, i, m] = await Promise.all([
      supabase.from("factory_tracker_settings").select("*").limit(1).maybeSingle(),
      supabase.from("factory_invoices").select("*").order("invoice_date", { ascending: false }),
      supabase.from("factory_invoice_materials").select("*").order("created_at"),
    ]);
    if (s.data) setSettings(s.data as any);
    setInvoices((i.data || []) as any);
    setMaterials((m.data || []) as any);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  async function updateSettings(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("factory_tracker_settings").update(patch).eq("id", settings.id);
  }

  async function createInvoice() {
    if (!newInv.invoice_number) { toast({ title: "Invoice number required", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("factory_invoices").insert({
      invoice_number: newInv.invoice_number,
      invoice_date: newInv.invoice_date,
      supplier_name: newInv.supplier_name || null,
      notes: newInv.notes || null,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // seed preset materials
    const rows = PRESET_MATERIALS.map((p) => ({ invoice_id: data.id, ...p, ordered: 0, received: 0, used: 0 }));
    await supabase.from("factory_invoice_materials").insert(rows);
    toast({ title: "Invoice created" });
    setNewInvOpen(false);
    setNewInv({ invoice_number: "", invoice_date: new Date().toISOString().slice(0, 10), supplier_name: "", notes: "" });
    await loadAll();
    setOpenInvoice(data as any);
    setTab("invoice-detail");
  }

  async function deleteInvoice(id: string) {
    if (!confirm("Delete this invoice and all its materials?")) return;
    await supabase.from("factory_invoices").delete().eq("id", id);
    toast({ title: "Deleted" });
    if (openInvoice?.id === id) setOpenInvoice(null);
    loadAll();
  }

  async function setInvoiceStatus(id: string, status: string) {
    await supabase.from("factory_invoices").update({ status }).eq("id", id);
    loadAll();
  }

  async function updateMaterial(id: string, patch: Partial<Material>) {
    setMaterials((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    await supabase.from("factory_invoice_materials").update(patch).eq("id", id);
  }

  async function deleteMaterial(id: string) {
    setMaterials((arr) => arr.filter((m) => m.id !== id));
    await supabase.from("factory_invoice_materials").delete().eq("id", id);
  }

  async function addCustomMaterial(invoiceId: string | null) {
    if (!newMat.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("factory_invoice_materials").insert({
      invoice_id: invoiceId, category: newMat.category, name: newMat.name, unit: newMat.unit, ordered: 0, received: 0, used: 0,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMaterials((arr) => [...arr, data as any]);
    setAddMatOpen(false);
    setNewMat({ category: CATEGORIES[0], name: "", unit: "nos" });
  }

  // Dashboard stats — across all materials
  const stats = useMemo(() => {
    let totalOrdered = 0, totalReceived = 0, alerts = 0, warnings = 0, ok = 0;
    for (const m of materials) {
      totalOrdered += Number(m.ordered) || 0;
      totalReceived += Number(m.received) || 0;
      const sev = getSeverity(m, settings);
      if (sev === "alert") alerts++;
      else if (sev === "warning") warnings++;
      else ok++;
    }
    return { totalItems: materials.length, totalOrdered, totalReceived, alerts, warnings, ok };
  }, [materials, settings]);

  const chartData = useMemo(() => {
    return CATEGORIES.map((c) => {
      const items = materials.filter((m) => m.category === c);
      return {
        category: c.length > 18 ? c.slice(0, 16) + "…" : c,
        Ordered: items.reduce((s, m) => s + (Number(m.ordered) || 0), 0),
        Received: items.reduce((s, m) => s + (Number(m.received) || 0), 0),
      };
    });
  }, [materials]);

  function exportCSV(rows: Material[]) {
    const header = ["Category", "Material", "Unit", "Ordered", "Received", "Used", "Balance", "Variance"];
    const lines = [header.join(",")];
    for (const m of rows) {
      const balance = Number(m.received) - Number(m.used);
      const variance = Number(m.received) - Number(m.ordered);
      const cells = [m.category, m.name, m.unit, m.ordered, m.received, m.used, balance, variance].map((v) =>
        `"${String(v ?? "").replace(/"/g, '""')}"`
      );
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `factory-materials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Filtered view for register
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (search && !`${m.name} ${m.category}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter !== "all") {
        const sev = getSeverity(m, settings);
        if (sev !== filter) return false;
      }
      return true;
    });
  }, [materials, search, filter, settings]);

  // Group register by category
  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of filteredMaterials) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return Array.from(map.entries());
  }, [filteredMaterials]);

  const detailMaterials = openInvoice ? materials.filter((m) => m.invoice_id === openInvoice.id) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Factory Invoice Tracker</h1>
          <p className="text-muted-foreground">Invoice → Delivery → Consumption with theft detection</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
          {settings?.theft_detection_enabled ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <div className="text-sm font-semibold">Theft Detection: {settings?.theft_detection_enabled ? "ON" : "OFF"}</div>
            <div className="text-xs text-muted-foreground">Warn &gt;{settings?.warning_threshold_percent}% • Alert &gt;{settings?.alert_threshold_percent}%</div>
          </div>
          <Switch
            checked={!!settings?.theft_detection_enabled}
            onCheckedChange={(v) => updateSettings({ theft_detection_enabled: v })}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {openInvoice && <TabsTrigger value="invoice-detail">Invoice: {openInvoice.invoice_number}</TabsTrigger>}
          <TabsTrigger value="register">Materials Register</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <StatBox label="Total Items" value={stats.totalItems} icon={Package} color="text-primary" />
            <StatBox label="Total Ordered" value={stats.totalOrdered.toLocaleString()} icon={TrendingUp} color="text-blue-500" />
            <StatBox label="Total Received" value={stats.totalReceived.toLocaleString()} icon={TrendingUp} color="text-indigo-500" />
            <StatBox label="Alerts" value={stats.alerts} icon={ShieldAlert} color="text-red-500" />
            <StatBox label="Warnings" value={stats.warnings} icon={AlertTriangle} color="text-yellow-500" />
            <StatBox label="OK" value={stats.ok} icon={CheckCircle2} color="text-emerald-500" />
          </div>
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Ordered vs Received by Category</h3>
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Ordered" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Received" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* INVOICES LIST */}
        <TabsContent value="invoices" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg">All Invoices ({invoices.length})</h3>
            <Button onClick={() => setNewInvOpen(true)}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices yet. Create your first invoice.</TableCell></TableRow>
                )}
                {invoices.map((inv) => {
                  const items = materials.filter((m) => m.invoice_id === inv.id);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.supplier_name || "—"}</TableCell>
                      <TableCell>{items.length}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "verified" ? "default" : "secondary"}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setOpenInvoice(inv); setTab("invoice-detail"); }}>Open</Button>
                        <Button size="sm" variant="outline" onClick={() => setInvoiceStatus(inv.id, inv.status === "verified" ? "pending" : "verified")}>
                          {inv.status === "verified" ? "Mark Pending" : "Verify"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* INVOICE DETAIL */}
        {openInvoice && (
          <TabsContent value="invoice-detail" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setTab("invoices")}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCSV(detailMaterials)}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
                <Button size="sm" onClick={() => setAddMatOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Material</Button>
              </div>
            </div>
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-muted-foreground">Invoice #</div><div className="font-semibold">{openInvoice.invoice_number}</div></div>
                <div><div className="text-muted-foreground">Date</div><div className="font-semibold">{new Date(openInvoice.invoice_date).toLocaleDateString()}</div></div>
                <div><div className="text-muted-foreground">Supplier</div><div className="font-semibold">{openInvoice.supplier_name || "—"}</div></div>
                <div><div className="text-muted-foreground">Status</div><Badge>{openInvoice.status}</Badge></div>
              </div>
              {openInvoice.notes && <div className="mt-3 text-sm text-muted-foreground border-t pt-3">{openInvoice.notes}</div>}
            </Card>
            <MaterialsTable materials={detailMaterials} settings={settings} onChange={updateMaterial} onDelete={deleteMaterial} />
          </TabsContent>
        )}

        {/* MATERIALS REGISTER */}
        <TabsContent value="register" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search material or category…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="alert">Alerts only</SelectItem>
                  <SelectItem value="warning">Warnings only</SelectItem>
                  <SelectItem value="ok">OK only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportCSV(filteredMaterials)}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
              <Button onClick={() => setAddMatOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Material</Button>
            </div>
          </div>
          {grouped.length === 0 && <Card className="p-12 text-center text-muted-foreground">No materials match your filter.</Card>}
          {grouped.map(([cat, rows]) => (
            <Card key={cat} className="overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 font-semibold text-sm border-b">{cat} ({rows.length})</div>
              <MaterialsTable materials={rows} settings={settings} onChange={updateMaterial} onDelete={deleteMaterial} hideCategory />
            </Card>
          ))}
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-6">
          <Card className="p-6 max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Theft Detection</Label>
                <p className="text-sm text-muted-foreground">Highlight rows where received quantity falls short of ordered</p>
              </div>
              <Switch checked={!!settings?.theft_detection_enabled} onCheckedChange={(v) => updateSettings({ theft_detection_enabled: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warning threshold (% shortfall)</Label>
                <NumberInput value={settings?.warning_threshold_percent ?? 10} onChange={(e) => updateSettings({ warning_threshold_percent: Number(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground mt-1">Yellow when shortfall &gt; this %</p>
              </div>
              <div>
                <Label>Alert threshold (% shortfall)</Label>
                <NumberInput value={settings?.alert_threshold_percent ?? 25} onChange={(e) => updateSettings({ alert_threshold_percent: Number(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground mt-1">Red when shortfall &gt; this %</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={newInvOpen} onOpenChange={setNewInvOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice Number *</Label><Input value={newInv.invoice_number} onChange={(e) => setNewInv({ ...newInv, invoice_number: e.target.value })} placeholder="INV-001" /></div>
            <div><Label>Date</Label><Input type="date" value={newInv.invoice_date} onChange={(e) => setNewInv({ ...newInv, invoice_date: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={newInv.supplier_name} onChange={(e) => setNewInv({ ...newInv, supplier_name: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={newInv.notes} onChange={(e) => setNewInv({ ...newInv, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">All preset materials will be auto-added to this invoice.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInvOpen(false)}>Cancel</Button>
            <Button onClick={createInvoice}><Save className="w-4 h-4 mr-2" />Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={addMatOpen} onOpenChange={setAddMatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={newMat.category} onValueChange={(v) => setNewMat({ ...newMat, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Material Name *</Label><Input value={newMat.name} onChange={(e) => setNewMat({ ...newMat, name: e.target.value })} /></div>
            <div><Label>Unit</Label><Input value={newMat.unit} onChange={(e) => setNewMat({ ...newMat, unit: e.target.value })} placeholder="nos / kg / mtr" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMatOpen(false)}>Cancel</Button>
            <Button onClick={() => addCustomMaterial(openInvoice?.id || null)}><Save className="w-4 h-4 mr-2" />Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function MaterialsTable({
  materials, settings, onChange, onDelete, hideCategory,
}: {
  materials: Material[]; settings: Settings | null;
  onChange: (id: string, patch: Partial<Material>) => void;
  onDelete: (id: string) => void;
  hideCategory?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {!hideCategory && <TableHead>Category</TableHead>}
          <TableHead>Material</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Ordered</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Used</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Variance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.map((m) => {
          const sev = getSeverity(m, settings);
          const balance = Number(m.received) - Number(m.used);
          const variance = Number(m.received) - Number(m.ordered);
          return (
            <TableRow key={m.id} className={settings?.theft_detection_enabled ? sevRow[sev] : ""}>
              {!hideCategory && <TableCell className="text-xs text-muted-foreground">{m.category}</TableCell>}
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell className="text-muted-foreground">{m.unit}</TableCell>
              <TableCell><NumberInput value={m.ordered} onChange={(e) => onChange(m.id, { ordered: Number(e.target.value) || 0 })} className="w-24" /></TableCell>
              <TableCell><NumberInput value={m.received} onChange={(e) => onChange(m.id, { received: Number(e.target.value) || 0 })} className="w-24" /></TableCell>
              <TableCell><NumberInput value={m.used} onChange={(e) => onChange(m.id, { used: Number(e.target.value) || 0 })} className="w-24" /></TableCell>
              <TableCell className="font-semibold">{balance}</TableCell>
              <TableCell className={cn("font-semibold", variance < 0 ? "text-red-600" : "text-emerald-600")}>{variance > 0 ? `+${variance}` : variance}</TableCell>
              <TableCell>{settings?.theft_detection_enabled ? sevBadge[sev] : <Badge variant="outline">—</Badge>}</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={() => onDelete(m.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
