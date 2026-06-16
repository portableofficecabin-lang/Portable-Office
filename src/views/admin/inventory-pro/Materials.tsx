"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Search, Edit, Trash2, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATERIAL_CATEGORIES, UNITS } from "./types";
import { exportToExcel } from "@/lib/exportUtils";

const empty = {
  name: "", category: "MS Tube", size: "", thickness: "", brand: "",
  unit: "Nos", opening_stock: 0, min_stock_alert: 0, safety_stock: 0, purchase_rate: 0,
  hsn_code: "", gst_percent: 18, sku: "", description: "", material_type: "inward",
};

export default function MaterialsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [inwardSums, setInwardSums] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [m, s, inw] = await Promise.all([
      supabase.from("materials").select("*").order("name"),
      supabase.from("material_stock").select("material_id, current_stock"),
      supabase.from("stock_inward_items").select("material_id, quantity"),
    ]);
    setItems(m.data || []);
    setStocks(s.data || []);
    const sums: Record<string, number> = {};
    (inw.data || []).forEach((r: any) => { sums[r.material_id] = (sums[r.material_id] || 0) + Number(r.quantity || 0); });
    setInwardSums(sums);
    setLoading(false);
  }

  function totalStock(id: string) {
    return stocks.filter((x) => x.material_id === id).reduce((sum, x) => sum + Number(x.current_stock), 0);
  }

  function openNew() { setEditId(null); setForm(empty); setOpen(true); }
  function openEdit(it: any) {
    setEditId(it.id);
    setForm({ ...empty, ...it });
    setOpen(true);
  }

  async function save() {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = {
      name: form.name, category: form.category, size: form.size || null,
      thickness: form.thickness || null, brand: form.brand || null, unit: form.unit,
      opening_stock: Number(form.opening_stock), min_stock_alert: Number(form.min_stock_alert),
      safety_stock: Number(form.safety_stock || 0),
      purchase_rate: Number(form.purchase_rate), hsn_code: form.hsn_code || null,
      gst_percent: Number(form.gst_percent), sku: form.sku || null, description: form.description || null,
      material_type: form.material_type || "inward",
    };
    const res = editId
      ? await supabase.from("materials").update(payload).eq("id", editId)
      : await supabase.from("materials").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this material?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    load();
  }

  const filtered = items.filter((i) => {
    if (cat !== "all" && i.category !== cat) return false;
    const q = search.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q);
  });

  function exportXlsx() {
    exportToExcel(
      filtered.map((m) => ({
        Name: m.name, Category: m.category, Size: m.size || "", Thickness: m.thickness || "",
        Brand: m.brand || "", Unit: m.unit, "Current Stock": totalStock(m.id),
        "Min Alert": m.min_stock_alert, "Purchase Rate": m.purchase_rate,
        HSN: m.hsn_code || "", "GST %": m.gst_percent, SKU: m.sku || "",
      })),
      "materials"
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, SKU, brand..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MATERIAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXlsx}><Download className="h-4 w-4 mr-2" />Excel</Button>
          <Button onClick={openNew} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg"><Plus className="h-4 w-4 mr-2" />Add Material</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Size / Thickness</th>
                <th className="text-left p-3">Brand</th>
                <th className="text-center p-3">Permanent</th>
                <th className="text-center p-3">Inward</th>
                <th className="text-center p-3">Current</th>
                <th className="text-center p-3">Safety</th>
                <th className="text-right p-3">Rate (excl. GST)</th>
                <th className="text-center p-3">GST %</th>
                <th className="text-right p-3">Rate (incl. GST)</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const stock = totalStock(m.id);
                const safety = Number(m.safety_stock || 0);
                const low = stock <= safety || stock <= Number(m.min_stock_alert);
                const rate = Number(m.purchase_rate) || 0;
                const gstPct = Number(m.gst_percent) || 0;
                const rateIncl = rate * (1 + gstPct / 100);
                const inward = inwardSums[m.id] || 0;
                const permanent = Number(m.opening_stock || 0);
                return (
                  <tr key={m.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{m.name} {m.sku && <span className="text-xs text-muted-foreground">({m.sku})</span>}</td>
                    <td className="p-3">{m.material_type === "permanent_factory" ? <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Permanent Factory</Badge> : <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Inward</Badge>}</td>
                    <td className="p-3"><Badge variant="outline">{m.category}</Badge></td>
                    <td className="p-3 text-muted-foreground text-xs">{[m.size, m.thickness].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.brand || "—"}</td>
                    <td className="p-3 text-center text-slate-700">{permanent} {m.unit}</td>
                    <td className="p-3 text-center text-blue-600 font-medium">{inward} {m.unit}</td>
                    <td className={`p-3 text-center font-bold ${low ? "text-rose-600" : "text-emerald-600"}`}>{stock} {m.unit}</td>
                    <td className="p-3 text-center text-amber-600">{safety} {m.unit}</td>
                    <td className="p-3 text-right">₹{rate.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center"><Badge variant="outline">{gstPct}%</Badge></td>
                    <td className="p-3 text-right font-semibold">₹{rateIncl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">No materials found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Material</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Material Type *">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, material_type: "inward" })} className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition ${form.material_type === "inward" ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border hover:bg-muted"}`}>Inward</button>
                <button type="button" onClick={() => setForm({ ...form, material_type: "permanent_factory" })} className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition ${form.material_type === "permanent_factory" ? "bg-purple-600 text-white border-purple-600" : "bg-background border-border hover:bg-muted"}`}>Permanent Factory Use</button>
              </div>
            </Field>
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Size"><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 40x40 mm" /></Field>
            <Field label="Thickness"><Input value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} placeholder="e.g. 2 mm" /></Field>
            <Field label="Brand"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="Unit">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Permanent / Opening Stock"><NumberInput  value={form.opening_stock} onChange={(e) => setForm({ ...form, opening_stock: e.target.value })} /></Field>
            <Field label="Safety Stock (manual min level)"><NumberInput  value={form.safety_stock} onChange={(e) => setForm({ ...form, safety_stock: e.target.value })} /></Field>
            <Field label="Min Stock Alert"><NumberInput  value={form.min_stock_alert} onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })} /></Field>
            <Field label="Purchase Rate (₹) — excl. GST"><NumberInput  value={form.purchase_rate} onChange={(e) => setForm({ ...form, purchase_rate: e.target.value })} /></Field>
            <Field label="GST %">
              <Select value={String(form.gst_percent)} onValueChange={(v) => setForm({ ...form, gst_percent: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 5, 12, 18, 28].map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rate incl. GST (auto)">
              <Input readOnly value={`₹${(Number(form.purchase_rate || 0) * (1 + Number(form.gst_percent || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} className="bg-muted" />
            </Field>
            <Field label="HSN Code"><Input value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} /></Field>
            <Field label="SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editId ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}
