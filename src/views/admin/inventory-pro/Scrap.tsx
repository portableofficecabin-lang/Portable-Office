"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ScrapPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ scrap_date: formatDateSafe(new Date(), "yyyy-MM-dd"), factory_id: "", team_name: "", material_name: "", quantity: 0, unit: "kg", rate: 0, buyer_name: "", buyer_phone: "", status: "pending", notes: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [s, f] = await Promise.all([
      supabase.from("scrap_records").select("*, factories(name)").order("scrap_date", { ascending: false }),
      supabase.from("factories").select("*"),
    ]);
    setItems(s.data || []); setFactories(f.data || []);
    setLoading(false);
  }

  async function save() {
    const total = Number(form.quantity) * Number(form.rate);
    const { error } = await supabase.from("scrap_records").insert({ ...form, total_amount: total });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Scrap recorded" });
    setOpen(false); load();
  }

  async function markSold(id: string) {
    await supabase.from("scrap_records").update({ status: "sold" }).eq("id", id);
    load();
  }

  const totalValue = items.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const soldValue = items.filter((x) => x.status === "sold").reduce((s, x) => s + Number(x.total_amount || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
          <Recycle className="h-6 w-6 mb-2" />
          <div className="text-xs uppercase opacity-80">Total Scrap Value</div>
          <div className="text-2xl font-bold">₹{totalValue.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Sold Value</div>
          <div className="text-2xl font-bold text-emerald-600">₹{soldValue.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Pending Value</div>
          <div className="text-2xl font-bold text-amber-600">₹{(totalValue - soldValue).toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setForm({ scrap_date: formatDateSafe(new Date(), "yyyy-MM-dd"), factory_id: factories[0]?.id || "", team_name: "", material_name: "", quantity: 0, unit: "kg", rate: 0, buyer_name: "", buyer_phone: "", status: "pending", notes: "" }); setOpen(true); }} className="bg-gradient-to-r from-yellow-500 to-amber-400 text-white hover:from-yellow-600 hover:to-amber-500 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New Scrap Entry
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Factory</th><th className="text-left p-3">Team</th><th className="text-left p-3">Material</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Rate</th><th className="text-right p-3">Total</th><th className="text-left p-3">Buyer</th><th className="text-center p-3">Status</th><th className="text-right p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 text-xs">{formatDateSafe(new Date(it.scrap_date), "dd MMM yyyy")}</td>
                <td className="p-3">{it.factories?.name || "—"}</td>
                <td className="p-3 font-semibold text-amber-700">{it.team_name || "—"}</td>
                <td className="p-3">{it.material_name}</td>
                <td className="p-3 text-right">{it.quantity} {it.unit}</td>
                <td className="p-3 text-right">₹{Number(it.rate).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right font-bold">₹{Number(it.total_amount).toLocaleString("en-IN")}</td>
                <td className="p-3 text-xs">{it.buyer_name || "—"}</td>
                <td className="p-3 text-center"><Badge variant={it.status === "sold" ? "default" : "outline"}>{it.status}</Badge></td>
                <td className="p-3 text-right">{it.status !== "sold" && <Button size="sm" onClick={() => markSold(it.id)}>Mark Sold</Button>}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No scrap entries</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Scrap Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.scrap_date} onChange={(e) => setForm({ ...form, scrap_date: e.target.value })} /></div>
            <div><Label>Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Team Name (Whose balance scrap) *</Label><Input value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })} placeholder="e.g. Welding Team A, Painting Team" /></div>
            <div className="col-span-2"><Label>Material</Label><Input value={form.material_name} onChange={(e) => setForm({ ...form, material_name: e.target.value })} placeholder="e.g. MS Scrap, GI Scrap" /></div>
            <div><Label>Quantity</Label><NumberInput  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            <div><Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["kg", "ton", "Nos", "Mtr"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Rate (₹)</Label><NumberInput  value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></div>
            <div><Label>Total</Label><Input value={`₹${(Number(form.quantity) * Number(form.rate)).toLocaleString("en-IN")}`} disabled /></div>
            <div><Label>Buyer Name</Label><Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} /></div>
            <div><Label>Buyer Phone</Label><Input value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
