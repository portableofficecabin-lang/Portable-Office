"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/exportUtils";

export default function FactoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<Record<string, { qty: number; value: number }>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", code: "", location: "", state: "", address: "", is_active: true });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [f, s, m] = await Promise.all([
      supabase.from("factories").select("*").order("name"),
      supabase.from("material_stock").select("factory_id, material_id, current_stock"),
      supabase.from("materials").select("id, purchase_rate"),
    ]);
    setItems(f.data || []);
    const matMap = new Map((m.data || []).map((x: any) => [x.id, Number(x.purchase_rate || 0)]));
    const summary: Record<string, { qty: number; value: number }> = {};
    (s.data || []).forEach((x: any) => {
      summary[x.factory_id] ||= { qty: 0, value: 0 };
      summary[x.factory_id].qty += Number(x.current_stock);
      summary[x.factory_id].value += Number(x.current_stock) * (matMap.get(x.material_id) || 0);
    });
    setStockSummary(summary);
    setLoading(false);
  }

  async function save() {
    if (!form.name || !form.code || !form.location) {
      toast({ title: "Name, Code, Location required", variant: "destructive" }); return;
    }
    const payload = { ...form };
    const res = editId
      ? await supabase.from("factories").update(payload).eq("id", editId)
      : await supabase.from("factories").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); setForm({ name: "", code: "", location: "", state: "", address: "", is_active: true }); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />Add Factory
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg">{f.name}</h3>
                  <Badge>{f.code}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />{f.location}, {f.state}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setEditId(f.id); setForm(f); setOpen(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">Total Units</div>
                <div className="font-bold text-lg">{Math.round(stockSummary[f.id]?.qty || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Stock Value</div>
                <div className="font-bold text-lg">{formatINR(stockSummary[f.id]?.value || 0)}</div>
              </div>
            </div>
            {!f.is_active && <Badge variant="destructive" className="mt-2">Inactive</Badge>}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Factory</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Location *</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
