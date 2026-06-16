"use client";

import { useEffect, useMemo, useState } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { motion } from "framer-motion";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import {
  Plus, Search, Loader2, Edit, Trash2, IndianRupee, ShieldCheck, Truck,
  Calendar, MapPin, Phone, ArrowDownToLine, FileText, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const blank = {
  asset_id: "", party_id: "", customer_name: "", customer_phone: "", customer_email: "",
  site_address: "", dispatch_date: new Date().toISOString().slice(0, 10),
  expected_return_date: "", monthly_rate: 0, deposit_amount: 0, deposit_status: "held",
  deposit_refunded_amount: 0, deposit_refund_date: "", actual_return_date: "",
  damage_notes: "", damage_charges: 0, status: "active", notes: "",
};

export default function AdminRentalContracts() {
  const [rows, setRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [assetDialog, setAssetDialog] = useState(false);
  const [assetForm, setAssetForm] = useState<any>({ cabin_id: "", cabin_type: "Portable Office Cabin", size: "", monthly_rent: 0, current_location: "", status: "available", notes: "" });
  const [partyDialog, setPartyDialog] = useState(false);
  const [partyForm, setPartyForm] = useState<any>({ name: "", company: "", phone: "", email: "", city: "", state: "", billing_address: "", gstin: "", party_type: "customer" });

  async function saveParty() {
    if (!partyForm.name?.trim()) return toast({ title: "Party name required", variant: "destructive" });
    const sb = supabase as any;
    const { data, error } = await sb.from("parties").insert(partyForm).select().single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Party / Client saved" });
    setParties(p => [...p, data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    setForm((f: any) => ({ ...f, party_id: data.id, customer_name: data.name || f.customer_name, customer_phone: data.phone || f.customer_phone, customer_email: data.email || f.customer_email }));
    setPartyDialog(false);
    setPartyForm({ name: "", company: "", phone: "", email: "", city: "", state: "", billing_address: "", gstin: "", party_type: "customer" });
  }

  async function saveAsset() {
    if (!assetForm.cabin_id?.trim()) return toast({ title: "Cabin ID required", variant: "destructive" });
    if (!assetForm.cabin_type?.trim()) return toast({ title: "Type required", variant: "destructive" });
    const sb = supabase as any;
    const { data, error } = await sb.from("rental_assets").insert(assetForm).select().single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Cabin added to inventory" });
    setAssets(a => [...a, data]);
    setForm((f: any) => ({ ...f, asset_id: data.id, monthly_rate: f.monthly_rate || data.monthly_rent || 0 }));
    setAssetDialog(false);
    setAssetForm({ cabin_id: "", cabin_type: "Portable Office Cabin", size: "", monthly_rent: 0, current_location: "", status: "available", notes: "" });
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const [r, a, p] = await Promise.all([
      sb.from("rental_assignments").select("*, rental_assets(cabin_id, cabin_type, size)").order("created_at", { ascending: false }),
      sb.from("rental_assets").select("*"),
      sb.from("parties").select("id,name,company,phone,email").order("name"),
    ]);
    setRows(r.data || []); setAssets(a.data || []); setParties(p.data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (tab === "active" && r.status !== "active") return false;
      if (tab === "returned" && r.status !== "returned") return false;
      if (!q) return true;
      return (r.customer_name || "").toLowerCase().includes(q) ||
        (r.customer_phone || "").includes(q) ||
        (r.rental_assets?.cabin_id || "").toLowerCase().includes(q) ||
        (r.site_address || "").toLowerCase().includes(q);
    });
  }, [rows, search, tab]);

  const stats = useMemo(() => {
    const active = rows.filter(r => r.status === "active");
    const totalDeposit = active.reduce((s, r) => s + Number(r.deposit_amount || 0) - Number(r.deposit_refunded_amount || 0), 0);
    const monthlyRevenue = active.reduce((s, r) => s + Number(r.monthly_rate || 0), 0);
    return { active: active.length, totalDeposit, monthlyRevenue, total: rows.length };
  }, [rows]);

  function setPartyAutofill(party_id: string) {
    const p = parties.find(x => x.id === party_id);
    if (p) {
      setForm((f: any) => ({ ...f, party_id, customer_name: p.name || f.customer_name, customer_phone: p.phone || f.customer_phone, customer_email: p.email || f.customer_email }));
    } else {
      setForm((f: any) => ({ ...f, party_id }));
    }
  }

  async function save() {
    if (!form.customer_name?.trim()) return toast({ title: "Customer name required", variant: "destructive" });
    if (!form.asset_id) return toast({ title: "Select cabin/container", variant: "destructive" });
    const sb = supabase as any;
    const payload: any = { ...form };
    ["expected_return_date", "actual_return_date", "deposit_refund_date"].forEach(k => { if (!payload[k]) payload[k] = null; });
    if (!payload.party_id) payload.party_id = null;
    delete payload.rental_assets;
    if (form.id) {
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const { error } = await sb.from("rental_assignments").update(payload).eq("id", form.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await sb.from("rental_assignments").insert(payload);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      // mark cabin as rented
      await sb.from("rental_assets").update({ status: "rented", current_location: form.site_address }).eq("id", form.asset_id);
    }
    toast({ title: "Saved" });
    setDialog(false); setForm(blank); load();
  }

  async function markReturned(row: any) {
    const refund = Number(prompt(`Deposit collected: ${inr(row.deposit_amount)}.\nEnter REFUND amount (₹) — leave 0 if forfeited:`, String(row.deposit_amount || 0)) || 0);
    const damage = Number(prompt("Damage charges (₹) — 0 if none:", "0") || 0);
    const damage_notes = damage > 0 ? prompt("Damage description:") || "" : "";
    const today = new Date().toISOString().slice(0, 10);
    const dep_status = refund >= row.deposit_amount ? "refunded" : refund > 0 ? "partial" : "forfeited";
    const sb = supabase as any;
    await sb.from("rental_assignments").update({
      status: "returned", actual_return_date: today,
      deposit_refunded_amount: refund, deposit_refund_date: refund > 0 ? today : null,
      deposit_status: dep_status, damage_charges: damage, damage_notes,
    }).eq("id", row.id);
    if (row.asset_id) await sb.from("rental_assets").update({ status: "available", current_location: null }).eq("id", row.asset_id);
    toast({ title: "Marked returned" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this rental contract?")) return;
    const { error } = await (supabase as any).from("rental_assignments").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  }

  function exportList(kind: "pdf" | "excel") {
    const data = filtered.map(r => ({
      Customer: r.customer_name,
      Phone: r.customer_phone || "",
      Cabin: r.rental_assets?.cabin_id || "",
      Type: r.rental_assets?.cabin_type || "",
      Site: r.site_address || "",
      Dispatched: r.dispatch_date ? format(new Date(r.dispatch_date), "dd/MM/yyyy") : "",
      "Return Due": r.expected_return_date ? format(new Date(r.expected_return_date), "dd/MM/yyyy") : "",
      "Monthly Rate": Number(r.monthly_rate || 0),
      Deposit: Number(r.deposit_amount || 0),
      "Deposit Status": r.deposit_status || "held",
      Status: r.status,
    }));
    const filename = `rental_contracts_${Date.now()}`;
    if (kind === "excel") exportToExcel(data, filename);
    else exportToPDF("Rental Contracts", Object.keys(data[0] || {}), data.map(d => Object.values(d)), filename);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental Contracts"
        description="Client-wise cabin/container rental tracking with security deposit & return management"
        badge={<span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold">{rows.length} contracts</span>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill icon={Truck} label="Active Rentals" value={String(stats.active)} className="from-amber-500 to-orange-600" />
        <StatPill icon={ShieldCheck} label="Deposit Held" value={inr(stats.totalDeposit)} className="from-emerald-500 to-emerald-700" />
        <StatPill icon={IndianRupee} label="Monthly Revenue" value={inr(stats.monthlyRevenue)} className="from-blue-500 to-indigo-600" />
        <StatPill icon={FileText} label="Total Contracts" value={String(stats.total)} className="from-slate-700 to-slate-900" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search by client, cabin ID, phone, site..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl border-2" />
        </div>
        <Button variant="outline" onClick={() => exportList("excel")}><Download className="h-4 w-4 mr-1" />Excel</Button>
        <Button variant="outline" onClick={() => exportList("pdf")}><Download className="h-4 w-4 mr-1" />PDF</Button>
        <Button onClick={() => { setForm({ ...blank, dispatch_date: new Date().toISOString().slice(0, 10) }); setDialog(true); }} className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="h-5 w-5 mr-2" /> New Rental Contract
        </Button>
      </div>

      <AdminCard>
        <AdminCardHeader>Contracts</AdminCardHeader>
        <AdminCardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 max-w-md">
              <TabsTrigger value="active">Active ({rows.filter(r => r.status === "active").length})</TabsTrigger>
              <TabsTrigger value="returned">Returned ({rows.filter(r => r.status === "returned").length})</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="pt-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No contracts. Click "New Rental Contract" to add.</p>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Client</TableHead>
                        <TableHead>Cabin / Container</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Dispatched</TableHead>
                        <TableHead>Return Due</TableHead>
                        <TableHead className="text-right">Monthly</TableHead>
                        <TableHead className="text-right">Deposit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(r => {
                        const overdue = r.status === "active" && r.expected_return_date && new Date(r.expected_return_date) < new Date();
                        const months = r.dispatch_date ? Math.max(1, differenceInMonths(r.actual_return_date ? new Date(r.actual_return_date) : new Date(), new Date(r.dispatch_date)) || 1) : 0;
                        const depHeld = Number(r.deposit_amount || 0) - Number(r.deposit_refunded_amount || 0);
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="font-semibold">{r.customer_name}</div>
                              {r.customer_phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{r.customer_phone}</div>}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{r.rental_assets?.cabin_id || "—"}</div>
                              <div className="text-xs text-muted-foreground">{r.rental_assets?.cabin_type} {r.rental_assets?.size && `· ${r.rental_assets.size}`}</div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{r.site_address || "—"}</TableCell>
                            <TableCell className="text-xs">{r.dispatch_date ? format(new Date(r.dispatch_date), "dd MMM yy") : "—"}<div className="text-muted-foreground">{months}mo</div></TableCell>
                            <TableCell className="text-xs">
                              {r.expected_return_date ? format(new Date(r.expected_return_date), "dd MMM yy") : "—"}
                              {overdue && <Badge variant="destructive" className="ml-1 text-[10px]">Overdue</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{inr(r.monthly_rate || 0)}</TableCell>
                            <TableCell className="text-right">
                              <div className="font-semibold">{inr(r.deposit_amount || 0)}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {r.status === "returned"
                                  ? r.deposit_status === "refunded" ? "Refunded" : r.deposit_status === "partial" ? `Refunded ${inr(r.deposit_refunded_amount)}` : "Forfeited"
                                  : `Held: ${inr(depHeld)}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.status === "active" ? "default" : "outline"} className={cn(r.status === "active" && "bg-emerald-500")}>{r.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {r.status === "active" && (
                                  <Button size="sm" variant="outline" onClick={() => markReturned(r)} title="Mark as returned & process deposit">
                                    <ArrowDownToLine className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => { setForm(r); setDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </AdminCardContent>
      </AdminCard>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Rental Contract</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link to Party / Client (optional)">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={form.party_id || "__none"} onValueChange={v => setPartyAutofill(v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                      <SelectContent className="z-[100] bg-popover">
                        <SelectItem value="__none">— Walk-in / Manual entry —</SelectItem>
                        {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPartyDialog(true)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </Field>
              <Field label="Cabin / Container *">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={form.asset_id} onValueChange={v => {
                      const a = assets.find(x => x.id === v);
                      setForm({ ...form, asset_id: v, monthly_rate: form.monthly_rate || a?.monthly_rent || 0 });
                    }}>
                      <SelectTrigger><SelectValue placeholder={assets.length === 0 ? "No cabins yet — add one" : "Select cabin"} /></SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto z-[100] bg-popover">
                        {assets.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground">No cabins found. Click "+ Add" to create one.</div>
                        ) : assets.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.cabin_id} — {a.cabin_type}{a.size ? ` (${a.size})` : ""}
                            {a.status && a.status !== "available" ? ` [${a.status}]` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAssetDialog(true)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Customer Name *"><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></Field>
              <Field label="Phone"><Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} /></Field>
            </div>

            <Field label="Site Address"><Textarea rows={2} value={form.site_address} onChange={e => setForm({ ...form, site_address: e.target.value })} /></Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Dispatch Date"><Input type="date" value={form.dispatch_date || ""} onChange={e => setForm({ ...form, dispatch_date: e.target.value })} /></Field>
              <Field label="Expected Return"><Input type="date" value={form.expected_return_date || ""} onChange={e => setForm({ ...form, expected_return_date: e.target.value })} /></Field>
              <Field label="Monthly Rate (₹)"><NumberInput  value={form.monthly_rate} onChange={e => setForm({ ...form, monthly_rate: Number(e.target.value) })} /></Field>
            </div>

            {/* Security Deposit Block */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900 p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Security Deposit (Returnable)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Deposit Collected (₹)"><NumberInput  value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: Number(e.target.value) })} /></Field>
                <Field label="Deposit Status">
                  <Select value={form.deposit_status} onValueChange={v => setForm({ ...form, deposit_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="held">Held (with us)</SelectItem>
                      <SelectItem value="partial">Partially Refunded</SelectItem>
                      <SelectItem value="refunded">Fully Refunded</SelectItem>
                      <SelectItem value="forfeited">Forfeited</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Refunded Amount (₹)"><NumberInput  value={form.deposit_refunded_amount} onChange={e => setForm({ ...form, deposit_refunded_amount: Number(e.target.value) })} /></Field>
                <Field label="Refund Date"><Input type="date" value={form.deposit_refund_date || ""} onChange={e => setForm({ ...form, deposit_refund_date: e.target.value })} /></Field>
                <Field label="Damage Charges (₹)"><NumberInput  value={form.damage_charges} onChange={e => setForm({ ...form, damage_charges: Number(e.target.value) })} /></Field>
                <Field label="Contract Status">
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Damage / Return Notes"><Textarea rows={2} value={form.damage_notes || ""} onChange={e => setForm({ ...form, damage_notes: e.target.value })} /></Field>
            </div>

            <Field label="Internal Notes"><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">Save Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Cabin Dialog */}
      <Dialog open={assetDialog} onOpenChange={setAssetDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add New Cabin / Container to Inventory</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cabin ID *">
                <Input placeholder="e.g. CAB-001" value={assetForm.cabin_id} onChange={e => setAssetForm({ ...assetForm, cabin_id: e.target.value })} />
              </Field>
              <Field label="Type *">
                <Select value={assetForm.cabin_type} onValueChange={v => setAssetForm({ ...assetForm, cabin_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    <SelectItem value="Portable Office Cabin">Portable Office Cabin</SelectItem>
                    <SelectItem value="Security Cabin">Security Cabin</SelectItem>
                    <SelectItem value="Shipping Storage Container">Shipping Storage Container</SelectItem>
                    <SelectItem value="Labour Camp">Labour Camp</SelectItem>
                    <SelectItem value="Bath Cabin">Bath Cabin</SelectItem>
                    <SelectItem value="Marketing Office">Marketing Office</SelectItem>
                    <SelectItem value="Portable Toilet">Portable Toilet</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Size"><Input placeholder="e.g. 10x8 ft" value={assetForm.size} onChange={e => setAssetForm({ ...assetForm, size: e.target.value })} /></Field>
              <Field label="Monthly Rent (₹)"><NumberInput  value={assetForm.monthly_rent} onChange={e => setAssetForm({ ...assetForm, monthly_rent: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Current Location"><Input placeholder="e.g. Factory Yard - Peenya, Bangalore" value={assetForm.current_location} onChange={e => setAssetForm({ ...assetForm, current_location: e.target.value })} /></Field>
            <Field label="Notes"><Textarea rows={2} value={assetForm.notes} onChange={e => setAssetForm({ ...assetForm, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialog(false)}>Cancel</Button>
            <Button onClick={saveAsset} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">Save & Select</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Party / Client Dialog */}
      <Dialog open={partyDialog} onOpenChange={setPartyDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add New Party / Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *"><Input value={partyForm.name} onChange={e => setPartyForm({ ...partyForm, name: e.target.value })} /></Field>
              <Field label="Company"><Input value={partyForm.company} onChange={e => setPartyForm({ ...partyForm, company: e.target.value })} /></Field>
              <Field label="Phone"><Input value={partyForm.phone} onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={partyForm.email} onChange={e => setPartyForm({ ...partyForm, email: e.target.value })} /></Field>
              <Field label="City"><Input value={partyForm.city} onChange={e => setPartyForm({ ...partyForm, city: e.target.value })} /></Field>
              <Field label="State"><Input value={partyForm.state} onChange={e => setPartyForm({ ...partyForm, state: e.target.value })} /></Field>
              <Field label="GSTIN"><Input value={partyForm.gstin} onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value })} /></Field>
              <Field label="Type">
                <Select value={partyForm.party_type} onValueChange={v => setPartyForm({ ...partyForm, party_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Billing Address"><Textarea rows={2} value={partyForm.billing_address} onChange={e => setPartyForm({ ...partyForm, billing_address: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartyDialog(false)}>Cancel</Button>
            <Button onClick={saveParty} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">Save & Select</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>{children}</div>;
}

function StatPill({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className={cn("rounded-2xl p-4 text-white shadow-md bg-gradient-to-br", className)}>
      <div className="flex items-center gap-2 text-xs opacity-90 mb-1"><Icon className="h-4 w-4" />{label}</div>
      <div className="font-bold text-xl">{value}</div>
    </motion.div>
  );
}
