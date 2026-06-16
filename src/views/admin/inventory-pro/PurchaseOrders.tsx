"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type Line = { material_id: string; quantity: number; rate: number };

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ supplier_id: "", factory_id: "", po_date: format(new Date(), "yyyy-MM-dd"), expected_delivery_date: "", status: "pending", notes: "", terms: "" });
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [p, f, s, m, st] = await Promise.all([
      supabase.from("purchase_orders").select("*, suppliers(name), factories(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*"),
      supabase.from("suppliers").select("id, name"),
      supabase.from("materials").select("id, name, unit, purchase_rate, min_stock_alert, gst_percent, supplier_id"),
      supabase.from("material_stock").select("material_id, current_stock"),
    ]);
    setItems(p.data || []); setFactories(f.data || []); setSuppliers(s.data || []); setMaterials(m.data || []);

    // Compute auto-recommendations
    const totals = new Map<string, number>();
    (st.data || []).forEach((x: any) => totals.set(x.material_id, (totals.get(x.material_id) || 0) + Number(x.current_stock)));
    const rec = (m.data || []).filter((mat: any) => (totals.get(mat.id) || 0) <= Number(mat.min_stock_alert)).map((mat: any) => ({
      ...mat, current: totals.get(mat.id) || 0, suggested: Math.max(Number(mat.min_stock_alert) * 2, 10),
    }));
    setRecommendations(rec);
    setLoading(false);
  }

  async function save() {
    const valid = lines.filter((l) => l.material_id && l.quantity > 0);
    if (valid.length === 0) { toast({ title: "Add items", variant: "destructive" }); return; }
    const subtotal = valid.reduce((s, l) => s + l.quantity * l.rate, 0);
    const gst = valid.reduce((s, l) => {
      const m = materials.find((x) => x.id === l.material_id);
      return s + (l.quantity * l.rate * Number(m?.gst_percent || 18) / 100);
    }, 0);
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      supplier_id: form.supplier_id || null, factory_id: form.factory_id || null,
      po_date: form.po_date, expected_delivery_date: form.expected_delivery_date || null,
      status: form.status, subtotal, gst_amount: gst, total_amount: subtotal + gst,
      notes: form.notes || null, terms: form.terms || null,
    }).select().single();
    if (error || !po) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
    await supabase.from("purchase_order_items").insert(valid.map((l) => ({ po_id: po.id, ...l, amount: l.quantity * l.rate })));
    toast({ title: "PO created", description: po.po_number });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      {recommendations.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">🤖 Auto Purchase Recommendations ({recommendations.length})</h4>
          <div className="flex flex-wrap gap-2">
            {recommendations.slice(0, 8).map((r) => (
              <Badge key={r.id} variant="outline" className="bg-white">
                {r.name}: have <b>{r.current}</b>, suggest <b>{r.suggested}</b> {r.unit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { setForm({ supplier_id: "", factory_id: "", po_date: format(new Date(), "yyyy-MM-dd"), expected_delivery_date: "", status: "pending", notes: "", terms: "" }); setLines([{ material_id: "", quantity: 0, rate: 0 }]); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New PO
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">PO #</th><th className="text-left p-3">Date</th><th className="text-left p-3">Supplier</th><th className="text-left p-3">Factory</th><th className="text-left p-3">Expected</th><th className="text-center p-3">Status</th><th className="text-right p-3">Total</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{it.po_number}</td>
                <td className="p-3 text-xs">{format(new Date(it.po_date), "dd MMM yyyy")}</td>
                <td className="p-3">{it.suppliers?.name || "—"}</td>
                <td className="p-3">{it.factories?.name || "—"}</td>
                <td className="p-3 text-xs">{it.expected_delivery_date ? format(new Date(it.expected_delivery_date), "dd MMM") : "—"}</td>
                <td className="p-3 text-center"><Badge variant={it.status === "received" ? "default" : "outline"}>{it.status}</Badge></td>
                <td className="p-3 text-right font-semibold">₹{Number(it.total_amount).toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No POs yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Deliver To Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>PO Date</Label><Input type="date" value={form.po_date} onChange={(e) => setForm({ ...form, po_date: e.target.value })} /></div>
            <div><Label>Expected Delivery</Label><Input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Items</h4>
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { material_id: "", quantity: 0, rate: 0 }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <Select value={l.material_id} onValueChange={(v) => {
                      const m = materials.find((x) => x.id === v);
                      setLines((p) => p.map((x, idx) => idx === i ? { ...x, material_id: v, rate: m?.purchase_rate || 0 } : x));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                      <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <NumberInput className="col-span-2"  placeholder="Qty" value={l.quantity || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
                  <NumberInput className="col-span-2"  placeholder="Rate" value={l.rate || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, rate: Number(e.target.value) } : x))} />
                  <div className="col-span-1 text-xs text-right">₹{(l.quantity * l.rate).toLocaleString("en-IN")}</div>
                  <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>
            <div className="text-right mt-3 font-bold">Subtotal: ₹{lines.reduce((s, l) => s + l.quantity * l.rate, 0).toLocaleString("en-IN")}</div>
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Create PO</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
