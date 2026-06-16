"use client";

import { useEffect, useState } from "react";
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
import { format } from "date-fns";
import { DateField } from "./DateField";

type Line = { material_id: string; planned_quantity: number; rate: number };

export default function ProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ project_name: "", client_name: "", factory_id: "", status: "planned", start_date: "", end_date: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [a, f, m] = await Promise.all([
      supabase.from("project_allocations").select("*, factories(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*").eq("is_active", true),
      supabase.from("materials").select("id, name, unit, purchase_rate"),
    ]);
    setItems(a.data || []); setFactories(f.data || []); setMaterials(m.data || []);
    setLoading(false);
  }

  async function save() {
    if (!form.project_name) { toast({ title: "Project name required", variant: "destructive" }); return; }
    const { data: alloc, error } = await supabase.from("project_allocations").insert({
      project_name: form.project_name, client_name: form.client_name || null,
      factory_id: form.factory_id || null, status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null, notes: form.notes || null,
    }).select().single();
    if (error || !alloc) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    const valid = lines.filter((l) => l.material_id && l.planned_quantity > 0);
    if (valid.length > 0) {
      await supabase.from("project_allocation_items").insert(valid.map((l) => ({ allocation_id: alloc.id, ...l })));
    }
    toast({ title: "Project created" });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ project_name: "", client_name: "", factory_id: "", status: "planned", start_date: "", end_date: "", notes: "" }); setLines([{ material_id: "", planned_quantity: 0, rate: 0 }]); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New Project BOQ
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">Project</th><th className="text-left p-3">Client</th><th className="text-left p-3">Factory</th><th className="text-left p-3">Period</th><th className="text-center p-3">Status</th><th className="text-right p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{it.project_name}</td>
                <td className="p-3">{it.client_name || "—"}</td>
                <td className="p-3">{it.factories?.name || "—"}</td>
                <td className="p-3 text-xs">{it.start_date ? format(new Date(it.start_date), "dd MMM") : "—"} → {it.end_date ? format(new Date(it.end_date), "dd MMM yyyy") : "—"}</td>
                <td className="p-3 text-center"><Badge variant={it.status === "completed" ? "default" : "outline"}>{it.status}</Badge></td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => setViewing(it)}><Eye className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No projects yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Project BOQ</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Project Name *</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
            <div><Label>Client</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start Date</Label><DateField value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} /></div>
            <div><Label>End Date</Label><DateField value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Planned Materials (BOQ)</h4>
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { material_id: "", planned_quantity: 0, rate: 0 }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
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
                  <NumberInput className="col-span-2"  placeholder="Planned Qty" value={l.planned_quantity || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, planned_quantity: Number(e.target.value) } : x))} />
                  <NumberInput className="col-span-3"  placeholder="Rate" value={l.rate || ""} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, rate: Number(e.target.value) } : x))} />
                  <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{viewing?.project_name} — Material Status</DialogTitle></DialogHeader>
          {viewing && <ProjectStatus id={viewing.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectStatus({ id }: { id: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("project_allocation_items").select("*, materials(name, unit)").eq("allocation_id", id).then((r) => setItems(r.data || []));
  }, [id]);
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted text-xs uppercase">
        <tr><th className="text-left p-2">Material</th><th className="text-right p-2">Planned</th><th className="text-right p-2">Issued</th><th className="text-right p-2">Balance</th></tr>
      </thead>
      <tbody>{items.map((it) => {
        const bal = Number(it.planned_quantity) - Number(it.issued_quantity);
        return (
          <tr key={it.id} className="border-b">
            <td className="p-2">{it.materials?.name}</td>
            <td className="p-2 text-right">{it.planned_quantity} {it.materials?.unit}</td>
            <td className="p-2 text-right text-emerald-600">{it.issued_quantity}</td>
            <td className={`p-2 text-right font-bold ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>{bal}</td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}
