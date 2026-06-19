"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Hammer, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const DEPARTMENTS = [
  { key: "welding", label: "Welding", color: "bg-orange-500" },
  { key: "painting", label: "Painting", color: "bg-pink-500" },
  { key: "electrical", label: "Electrical", color: "bg-yellow-500" },
  { key: "carpentry", label: "Carpentry", color: "bg-amber-700" },
  { key: "furniture", label: "Furniture Installation", color: "bg-blue-500" },
  { key: "finishing", label: "Final Finishing", color: "bg-emerald-500" },
] as const;

type DeptProgress = Record<string, number>;
const emptyProgress: DeptProgress = { welding: 0, painting: 0, electrical: 0, carpentry: 0, furniture: 0, finishing: 0 };

export default function ProductionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    log_date: formatDateSafe(new Date(), "yyyy-MM-dd"), factory_id: "", product_type: "Office Cabin",
    quantity_produced: 0, shift: "Day", supervisor_name: "", project_name: "", notes: "",
    department_progress: { ...emptyProgress }, workflow_status: "in_progress", is_ready_for_dispatch: false,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [p, f] = await Promise.all([
      supabase.from("production_logs").select("*, factories(name)").order("log_date", { ascending: false }),
      supabase.from("factories").select("*"),
    ]);
    setItems(p.data || []); setFactories(f.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      log_date: formatDateSafe(new Date(), "yyyy-MM-dd"), factory_id: factories[0]?.id || "",
      product_type: "Office Cabin", quantity_produced: 0, shift: "Day",
      supervisor_name: "", project_name: "", notes: "",
      department_progress: { ...emptyProgress }, workflow_status: "in_progress", is_ready_for_dispatch: false,
    });
    setOpen(true);
  }

  function openEdit(it: any) {
    setEditing(it);
    setForm({
      ...it,
      department_progress: { ...emptyProgress, ...(it.department_progress || {}) },
    });
    setOpen(true);
  }

  function overall(progress: DeptProgress) {
    const vals = DEPARTMENTS.map((d) => Number(progress?.[d.key] || 0));
    return Math.round(vals.reduce((a, b) => a + b, 0) / DEPARTMENTS.length);
  }

  async function save() {
    if (!form.factory_id) { toast({ title: "Factory required", variant: "destructive" }); return; }
    const overallPct = overall(form.department_progress);
    const ready = overallPct >= 100;
    const payload: any = {
      log_date: form.log_date, factory_id: form.factory_id, product_type: form.product_type,
      quantity_produced: Number(form.quantity_produced), shift: form.shift,
      supervisor_name: form.supervisor_name || null, project_name: form.project_name || null,
      notes: form.notes || null, department_progress: form.department_progress,
      is_ready_for_dispatch: ready, workflow_status: ready ? "ready_for_dispatch" : "in_progress",
    };
    const res = editing
      ? await (supabase as any).from("production_logs").update(payload).eq("id", editing.id)
      : await (supabase as any).from("production_logs").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    if (ready && !editing?.is_ready_for_dispatch) {
      toast({
        title: "✅ Ready for Dispatch!",
        description: "Kindly inform the client to clear the balance payment before dispatch.",
      });
    } else {
      toast({ title: editing ? "Production updated" : "Production logged" });
    }
    setOpen(false); load();
  }

  const today = formatDateSafe(new Date(), "yyyy-MM-dd");
  const todayCount = items.filter((x) => x.log_date === today).reduce((s, x) => s + Number(x.quantity_produced), 0);
  const readyCount = items.filter((x) => x.is_ready_for_dispatch && x.workflow_status !== "dispatched").length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <Hammer className="h-8 w-8" />
            <div>
              <div className="text-xs uppercase opacity-80">Today's Production</div>
              <div className="text-3xl font-bold">{todayCount} units</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <div className="text-xs uppercase opacity-80">Ready for Dispatch</div>
              <div className="text-3xl font-bold">{readyCount}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button onClick={openNew} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
            <Plus className="h-4 w-4 mr-2" />New Production Log
          </Button>
        </div>
      </div>

      {/* Cards view with workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((it) => {
          const prog: DeptProgress = { ...emptyProgress, ...(it.department_progress || {}) };
          const pct = overall(prog);
          const ready = it.is_ready_for_dispatch || pct >= 100;
          return (
            <div key={it.id} onClick={() => openEdit(it)} className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-lg">{it.project_name || it.product_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateSafe(new Date(it.log_date), "dd MMM yyyy")} • {it.factories?.name} • Qty: {it.quantity_produced}
                  </div>
                </div>
                {ready ? (
                  <Badge className="bg-emerald-600">Ready for Dispatch</Badge>
                ) : (
                  <Badge variant="outline">In Progress</Badge>
                )}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold">Overall Progress</span>
                  <span className="font-bold">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEPARTMENTS.map((d) => (
                  <div key={d.key} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-semibold">{prog[d.key] || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${d.color}`} style={{ width: `${prog[d.key] || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {ready && (
                <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Kindly inform the client to clear the balance payment before dispatch.</span>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="col-span-2 p-8 text-center text-muted-foreground">No production logs</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Production" : "Log Daily Production"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} /></div>
            <div><Label>Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Product Type</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Office Cabin", "Security Cabin", "Labour Cabin", "Toilet Cabin", "Container Office", "MS Cabin"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><NumberInput  value={form.quantity_produced} onChange={(e) => setForm({ ...form, quantity_produced: Number(e.target.value) })} /></div>
            <div><Label>Shift</Label>
              <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Supervisor</Label><Input value={form.supervisor_name} onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Project</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Hammer className="h-4 w-4" />Department-wise Progress
            </h4>
            <div className="space-y-3">
              {DEPARTMENTS.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{d.label}</span>
                    <span className="font-bold">{form.department_progress?.[d.key] || 0}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={form.department_progress?.[d.key] || 0}
                    onChange={(e) => setForm({
                      ...form,
                      department_progress: { ...form.department_progress, [d.key]: Number(e.target.value) },
                    })}
                    className="w-full accent-amber-500"
                  />
                </div>
              ))}
            </div>
            {overall(form.department_progress) >= 100 && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Ready for Dispatch</div>
                  <div className="text-xs">Kindly inform the client to clear the balance payment before dispatch.</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
