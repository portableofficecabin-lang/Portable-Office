"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { DateField } from "./DateField";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["pending", "in_progress", "ready_for_dispatch", "dispatched", "completed", "cancelled"];
const PRODUCT_TYPES = ["Office Cabin", "Security Cabin", "Labour Cabin", "Toilet Cabin", "Container Office", "MS Cabin", "Custom"];

export default function WorkOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    project_name: "", client_name: "", client_phone: "", factory_id: "",
    product_type: "Office Cabin", quantity: 1, size: "", specifications: "",
    start_date: "", target_date: "", priority: "medium", status: "pending",
    assigned_supervisor: "", notes: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [w, f] = await Promise.all([
      (supabase as any).from("work_orders").select("*, factories(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*").eq("is_active", true),
    ]);
    setItems(w.data || []); setFactories(f.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      project_name: "", client_name: "", client_phone: "",
      factory_id: factories[0]?.id || "",
      product_type: "Office Cabin", quantity: 1, size: "", specifications: "",
      start_date: "", target_date: "", priority: "medium", status: "pending",
      assigned_supervisor: "", notes: "",
    });
    setOpen(true);
  }

  function openEdit(it: any) {
    setEditing(it);
    setForm({ ...it, start_date: it.start_date || "", target_date: it.target_date || "" });
    setOpen(true);
  }

  async function save() {
    if (!form.project_name) { toast({ title: "Project name required", variant: "destructive" }); return; }
    const payload = {
      ...form,
      factory_id: form.factory_id || null,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      quantity: Number(form.quantity) || 1,
    };
    delete (payload as any).factories;
    const res = editing
      ? await (supabase as any).from("work_orders").update(payload).eq("id", editing.id)
      : await (supabase as any).from("work_orders").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Work Order updated" : "Work Order created" });
    setOpen(false); load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-5 shadow-lg flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <div className="text-xs uppercase opacity-80">Total Work Orders</div>
            <div className="text-3xl font-bold">{items.length}</div>
          </div>
        </div>
        <Button onClick={openNew} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New Work Order
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">WO #</th>
              <th className="text-left p-3">Project / Client</th>
              <th className="text-left p-3">Product</th>
              <th className="text-center p-3">Qty</th>
              <th className="text-left p-3">Factory</th>
              <th className="text-left p-3">Target</th>
              <th className="text-center p-3">Priority</th>
              <th className="text-center p-3">Status</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{it.wo_number}</td>
                <td className="p-3">
                  <div className="font-medium">{it.project_name}</div>
                  <div className="text-xs text-muted-foreground">{it.client_name || "—"}</div>
                </td>
                <td className="p-3">{it.product_type}</td>
                <td className="p-3 text-center font-bold">{it.quantity}</td>
                <td className="p-3 text-xs">{it.factories?.name || "—"}</td>
                <td className="p-3 text-xs">{it.target_date ? format(new Date(it.target_date), "dd MMM yyyy") : "—"}</td>
                <td className="p-3 text-center">
                  <Badge variant={it.priority === "urgent" ? "destructive" : it.priority === "high" ? "default" : "outline"}>{it.priority}</Badge>
                </td>
                <td className="p-3 text-center">
                  <Badge variant={it.status === "ready_for_dispatch" ? "default" : "outline"} className={it.status === "ready_for_dispatch" ? "bg-emerald-600" : ""}>
                    {it.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(it)}><Eye className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No work orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.wo_number}` : "New Work Order"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Project Name *</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
            <div><Label>Client Name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Client Phone</Label><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></div>
            <div><Label>Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Product Type</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><NumberInput  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 10x8 ft" /></div>
            <div><Label>Start Date</Label><DateField value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} /></div>
            <div><Label>Target Date</Label><DateField value={form.target_date} onChange={(v) => setForm({ ...form, target_date: v })} /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Supervisor</Label><Input value={form.assigned_supervisor} onChange={(e) => setForm({ ...form, assigned_supervisor: e.target.value })} /></div>
            <div className="col-span-3"><Label>Specifications</Label><Textarea value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })} /></div>
            <div className="col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
