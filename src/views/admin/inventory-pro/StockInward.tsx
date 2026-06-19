"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type LineItem = { material_id: string; quantity: number; rate: number; gst_percent: number; qc_passed: boolean };

export default function StockInwardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ factory_id: "", supplier_id: "", invoice_number: "", invoice_date: formatDateSafe(new Date(), "yyyy-MM-dd"), vehicle_number: "", qc_status: "approved", notes: "" });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "", gst_number: "", address: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [a, f, s, m] = await Promise.all([
      supabase.from("stock_inwards").select("*, factories(name, code), suppliers(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*").eq("is_active", true),
      supabase.from("suppliers").select("id, name"),
      supabase.from("materials").select("id, name, unit, purchase_rate, category"),
    ]);
    setItems(a.data || []); setFactories(f.data || []); setSuppliers(s.data || []); setMaterials(m.data || []);
    setLoading(false);
  }

  function openNew() {
    setForm({ factory_id: factories[0]?.id || "", supplier_id: "", invoice_number: "", invoice_date: formatDateSafe(new Date(), "yyyy-MM-dd"), vehicle_number: "", qc_status: "approved", notes: "" });
    setLines([{ material_id: "", quantity: 0, rate: 0, gst_percent: 18, qc_passed: true }]);
    setOpen(true);
  }

  async function save() {
    if (!form.factory_id) { toast({ title: "Select factory", variant: "destructive" }); return; }
    const valid = lines.filter((l) => l.material_id && l.quantity > 0);
    if (valid.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }

    const total = valid.reduce((s, l) => s + l.quantity * l.rate * (1 + (l.gst_percent || 0) / 100), 0);
    const { data: inward, error } = await supabase.from("stock_inwards").insert({
      factory_id: form.factory_id, supplier_id: form.supplier_id || null,
      invoice_number: form.invoice_number || null, invoice_date: form.invoice_date || null,
      vehicle_number: form.vehicle_number || null, qc_status: form.qc_status,
      total_amount: total, notes: form.notes || null,
    }).select().single();
    if (error || !inward) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    const itemsPayload = valid.map((l) => ({
      inward_id: inward.id, material_id: l.material_id, quantity: l.quantity,
      rate: l.rate, amount: l.quantity * l.rate, qc_passed: l.qc_passed,
    }));
    await supabase.from("stock_inward_items").insert(itemsPayload);

    // Update stock for QC-passed items
    for (const l of valid) {
      if (l.qc_passed && form.qc_status === "approved") {
        await supabase.rpc("adjust_material_stock", { _material_id: l.material_id, _factory_id: form.factory_id, _delta: l.quantity });
        await supabase.from("inventory_movements").insert({
          product_id: l.material_id, movement_type: "in", quantity: l.quantity,
          reason: `Inward ${inward.inward_number}`, reference: inward.inward_number,
        });
      }
    }
    toast({ title: "Stock inward recorded", description: inward.inward_number });
    setOpen(false); load();
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((p) => p.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg"><Plus className="h-4 w-4 mr-2" />New Inward</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Inward #</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Factory</th>
              <th className="text-left p-3">Supplier</th>
              <th className="text-left p-3">Invoice</th>
              <th className="text-center p-3">QC</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{it.inward_number}</td>
                <td className="p-3 text-xs">{it.invoice_date ? formatDateSafe(new Date(it.invoice_date), "dd MMM yyyy") : "—"}</td>
                <td className="p-3">{it.factories?.name}</td>
                <td className="p-3">{it.suppliers?.name || "—"}</td>
                <td className="p-3 text-xs">{it.invoice_number || "—"}</td>
                <td className="p-3 text-center">
                  <Badge variant={it.qc_status === "approved" ? "default" : it.qc_status === "rejected" ? "destructive" : "outline"}>{it.qc_status}</Badge>
                </td>
                <td className="p-3 text-right font-semibold">₹{Number(it.total_amount || 0).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => setViewing(it)}><Eye className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No inwards yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Inward</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Factory *</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Supplier</Label>
              <Select value={form.supplier_id || "none"} onValueChange={(v) => {
                if (v === "__add__") { setSupplierOpen(true); return; }
                setForm({ ...form, supplier_id: v === "none" ? "" : v });
              }}>
                <SelectTrigger><SelectValue placeholder="Select or add supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  <SelectItem value="__add__" className="text-emerald-600 font-semibold">+ Add New Supplier</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>QC Status</Label>
              <Select value={form.qc_status} onValueChange={(v) => setForm({ ...form, qc_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
            <div><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Items</h4>
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { material_id: "", quantity: 0, rate: 0, gst_percent: 18, qc_passed: true }])}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 items-center text-xs uppercase text-muted-foreground px-1">
                <div className="col-span-4">Material</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-2 text-center">Rate (excl GST)</div>
                <div className="col-span-1 text-center">GST %</div>
                <div className="col-span-1 text-right">GST Amt</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>
              {lines.map((l, i) => {
                const mat = materials.find((m) => m.id === l.material_id);
                const sub = (l.quantity || 0) * (l.rate || 0);
                const gstAmt = sub * (l.gst_percent || 0) / 100;
                const total = sub + gstAmt;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Select value={l.material_id} onValueChange={(v) => {
                        const m = materials.find((x) => x.id === v);
                        updateLine(i, { material_id: v, rate: m?.purchase_rate || 0, gst_percent: m?.gst_percent ?? 18 });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                        <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.category})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <NumberInput className="col-span-1"  placeholder="Qty" value={l.quantity || ""} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                    <div className="col-span-1 text-xs text-muted-foreground">{mat?.unit || ""}</div>
                    <NumberInput className="col-span-2"  placeholder="Rate" value={l.rate || ""} onChange={(e) => updateLine(i, { rate: Number(e.target.value) })} />
                    <div className="col-span-1">
                      <Select value={String(l.gst_percent ?? 18)} onValueChange={(v) => updateLine(i, { gst_percent: Number(v) })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{[0, 5, 12, 18, 28].map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 text-xs text-right text-muted-foreground">₹{gstAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                    <div className="col-span-1 text-xs text-right font-semibold">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                    <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>
                );
              })}
            </div>
            {(() => {
              const sub = lines.reduce((s, l) => s + (l.quantity || 0) * (l.rate || 0), 0);
              const gst = lines.reduce((s, l) => s + (l.quantity || 0) * (l.rate || 0) * (l.gst_percent || 0) / 100, 0);
              return (
                <div className="text-right mt-3 space-y-1 text-sm">
                  <div>Subtotal: <span className="font-semibold">₹{sub.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
                  <div>GST: <span className="font-semibold">₹{gst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
                  <div className="font-bold text-base">Grand Total: ₹{(sub + gst).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                </div>
              );
            })()}
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save Inward</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Inward {viewing?.inward_number}</DialogTitle></DialogHeader>
          {viewing && <InwardDetail id={viewing.id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>GSTIN</Label><Input value={newSupplier.gst_number} onChange={(e) => setNewSupplier({ ...newSupplier, gst_number: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!newSupplier.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
              const { data, error } = await supabase.from("suppliers").insert(newSupplier).select().single();
              if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
              setSuppliers((p) => [...p, { id: data.id, name: data.name }]);
              setForm((f: any) => ({ ...f, supplier_id: data.id }));
              setNewSupplier({ name: "", phone: "", email: "", gst_number: "", address: "" });
              setSupplierOpen(false);
              toast({ title: "Supplier added" });
            }}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InwardDetail({ id }: { id: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("stock_inward_items").select("*, materials(name, unit)").eq("inward_id", id).then((r) => setItems(r.data || []));
  }, [id]);
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted text-xs uppercase"><tr><th className="text-left p-2">Material</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Amount</th></tr></thead>
      <tbody>{items.map((it) => (
        <tr key={it.id} className="border-b">
          <td className="p-2">{it.materials?.name}</td>
          <td className="p-2 text-right">{it.quantity} {it.materials?.unit}</td>
          <td className="p-2 text-right">₹{Number(it.rate).toLocaleString("en-IN")}</td>
          <td className="p-2 text-right font-semibold">₹{Number(it.amount).toLocaleString("en-IN")}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}
