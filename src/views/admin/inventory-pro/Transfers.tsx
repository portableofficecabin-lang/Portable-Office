"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type Line = { material_id: string; quantity: number };

export default function TransfersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ from_factory_id: "", to_factory_id: "", vehicle_number: "", driver_name: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [t, f, m, s] = await Promise.all([
      supabase.from("stock_transfers").select("*, from:factories!from_factory_id(name), to:factories!to_factory_id(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*"),
      supabase.from("materials").select("id, name, unit"),
      supabase.from("material_stock").select("material_id, factory_id, current_stock"),
    ]);
    setItems(t.data || []); setFactories(f.data || []); setMaterials(m.data || []); setStocks(s.data || []);
    setLoading(false);
  }

  function stockFor(matId: string, factId: string) {
    return stocks.find((x) => x.material_id === matId && x.factory_id === factId)?.current_stock || 0;
  }

  async function save() {
    if (!form.from_factory_id || !form.to_factory_id) { toast({ title: "Select both factories", variant: "destructive" }); return; }
    if (form.from_factory_id === form.to_factory_id) { toast({ title: "Different factories required", variant: "destructive" }); return; }
    const valid = lines.filter((l) => l.material_id && l.quantity > 0);
    if (valid.length === 0) { toast({ title: "Add items", variant: "destructive" }); return; }

    for (const l of valid) {
      if (stockFor(l.material_id, form.from_factory_id) < l.quantity) {
        toast({ title: "Insufficient stock", variant: "destructive" }); return;
      }
    }

    const { data: tr, error } = await supabase.from("stock_transfers").insert({ ...form, status: "completed" }).select().single();
    if (error || !tr) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    await supabase.from("stock_transfer_items").insert(valid.map((l) => ({ transfer_id: tr.id, ...l })));
    for (const l of valid) {
      await supabase.rpc("adjust_material_stock", { _material_id: l.material_id, _factory_id: form.from_factory_id, _delta: -l.quantity });
      await supabase.rpc("adjust_material_stock", { _material_id: l.material_id, _factory_id: form.to_factory_id, _delta: l.quantity });
    }
    toast({ title: "Transfer completed", description: tr.transfer_number });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ from_factory_id: "", to_factory_id: "", vehicle_number: "", driver_name: "", notes: "" }); setLines([{ material_id: "", quantity: 0 }]); setOpen(true); }} className="bg-gradient-to-r from-slate-900 to-slate-700">
          <Plus className="h-4 w-4 mr-2" />New Transfer
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">Transfer #</th><th className="text-left p-3">Date</th><th className="text-left p-3">From → To</th><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Driver</th><th className="text-center p-3">Status</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{it.transfer_number}</td>
                <td className="p-3 text-xs">{format(new Date(it.created_at), "dd MMM yyyy")}</td>
                <td className="p-3 flex items-center gap-2">{it.from?.name} <ArrowRight className="h-3 w-3" /> {it.to?.name}</td>
                <td className="p-3">{it.vehicle_number || "—"}</td>
                <td className="p-3">{it.driver_name || "—"}</td>
                <td className="p-3 text-center"><Badge>{it.status}</Badge></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transfers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From Factory *</Label>
              <Select value={form.from_factory_id} onValueChange={(v) => setForm({ ...form, from_factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>To Factory *</Label>
              <Select value={form.to_factory_id} onValueChange={(v) => setForm({ ...form, to_factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
            <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Items</h4>
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { material_id: "", quantity: 0 }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <Select value={l.material_id} onValueChange={(v) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, material_id: v } : x))}>
                      <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                      <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">Avail: {form.from_factory_id ? stockFor(l.material_id, form.from_factory_id) : 0}</div>
                  <NumberInput className="col-span-3"  placeholder="Qty" value={l.quantity || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
                  <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Transfer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
