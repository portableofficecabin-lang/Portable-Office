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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type Line = { material_id: string; quantity: number; wastage: number; rate: number };

export default function StockOutwardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ factory_id: "", project_name: "", purpose: "production", issued_to: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [o, f, m, s] = await Promise.all([
      supabase.from("stock_outwards").select("*, factories(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*").eq("is_active", true),
      supabase.from("materials").select("id, name, unit, category, purchase_rate"),
      supabase.from("material_stock").select("material_id, factory_id, current_stock"),
    ]);
    setItems(o.data || []); setFactories(f.data || []); setMaterials(m.data || []); setStocks(s.data || []);
    setLoading(false);
  }

  function stockFor(matId: string, factId: string) {
    return stocks.find((x) => x.material_id === matId && x.factory_id === factId)?.current_stock || 0;
  }

  async function save() {
    if (!form.factory_id) { toast({ title: "Select factory", variant: "destructive" }); return; }
    const valid = lines.filter((l) => l.material_id && l.quantity > 0);
    if (valid.length === 0) { toast({ title: "Add items", variant: "destructive" }); return; }

    // Validate stock
    for (const l of valid) {
      const total = l.quantity + (l.wastage || 0);
      if (stockFor(l.material_id, form.factory_id) < total) {
        const m = materials.find((x) => x.id === l.material_id);
        toast({ title: "Insufficient stock", description: `${m?.name}: only ${stockFor(l.material_id, form.factory_id)} available`, variant: "destructive" });
        return;
      }
    }

    const { data: out, error } = await supabase.from("stock_outwards").insert({
      factory_id: form.factory_id, project_name: form.project_name || null,
      purpose: form.purpose, issued_to: form.issued_to || null, notes: form.notes || null,
    }).select().single();
    if (error || !out) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    await supabase.from("stock_outward_items").insert(valid.map((l) => ({
      outward_id: out.id, material_id: l.material_id, quantity: l.quantity,
      wastage: l.wastage || 0, rate: l.rate, amount: (l.quantity + (l.wastage || 0)) * l.rate,
    })));

    for (const l of valid) {
      const total = l.quantity + (l.wastage || 0);
      await supabase.rpc("adjust_material_stock", { _material_id: l.material_id, _factory_id: form.factory_id, _delta: -total });
      await supabase.from("inventory_movements").insert({
        product_id: l.material_id, movement_type: "out", quantity: total,
        reason: `Outward ${out.outward_number} — ${form.purpose}`, reference: out.outward_number,
      });
    }

    toast({ title: "Stock issued", description: out.outward_number });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ factory_id: factories[0]?.id || "", project_name: "", purpose: "production", issued_to: "", notes: "" }); setLines([{ material_id: "", quantity: 0, wastage: 0, rate: 0 }]); setOpen(true); }} className="bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New Outward
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Outward #</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Factory</th>
              <th className="text-left p-3">Project</th>
              <th className="text-left p-3">Purpose</th>
              <th className="text-left p-3">Issued To</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{it.outward_number}</td>
                <td className="p-3 text-xs">{format(new Date(it.created_at), "dd MMM yyyy")}</td>
                <td className="p-3">{it.factories?.name}</td>
                <td className="p-3">{it.project_name || "—"}</td>
                <td className="p-3"><Badge variant="outline">{it.purpose}</Badge></td>
                <td className="p-3 text-xs">{it.issued_to || "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No outwards yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Issue Stock</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Factory *</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="project">Project Issue</SelectItem>
                  <SelectItem value="repair">Repair / Maintenance</SelectItem>
                  <SelectItem value="dispatch">Site Dispatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Project / Reference</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Issued To</Label><Input value={form.issued_to} onChange={(e) => setForm({ ...form, issued_to: e.target.value })} placeholder="Person / Site Supervisor" /></div>
            <div className="col-span-3"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Items</h4>
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { material_id: "", quantity: 0, wastage: 0, rate: 0 }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const m = materials.find((x) => x.id === l.material_id);
                const avail = form.factory_id ? stockFor(l.material_id, form.factory_id) : 0;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Select value={l.material_id} onValueChange={(v) => {
                        const mat = materials.find((x) => x.id === v);
                        setLines((p) => p.map((x, idx) => idx === i ? { ...x, material_id: v, rate: mat?.purchase_rate || 0 } : x));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                        <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">Avail: <b>{avail}</b> {m?.unit}</div>
                    <NumberInput className="col-span-2"  placeholder="Qty" value={l.quantity || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
                    <NumberInput className="col-span-2"  placeholder="Wastage" value={l.wastage || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, wastage: Number(e.target.value) } : x))} />
                    <div className="col-span-1 text-xs text-right">₹{((l.quantity + (l.wastage || 0)) * l.rate).toLocaleString("en-IN")}</div>
                    <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Issue Stock</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
