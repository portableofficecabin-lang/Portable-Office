"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { Plus, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import jsPDF from "jspdf";
import { addLegalFooter } from "@/lib/pdfFooter";

export default function GatePassPage() {
  const [items, setItems] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ pass_type: "outward", factory_id: "", pass_date: formatDateSafe(new Date(), "yyyy-MM-dd"), vehicle_number: "", driver_name: "", driver_phone: "", destination: "", customer_name: "", purpose: "", status: "pending", notes: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [g, f] = await Promise.all([
      supabase.from("gate_passes").select("*, factories(name)").order("created_at", { ascending: false }),
      supabase.from("factories").select("*"),
    ]);
    setItems(g.data || []); setFactories(f.data || []);
    setLoading(false);
  }

  async function save() {
    const { error } = await supabase.from("gate_passes").insert(form);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gate pass created" });
    setOpen(false); load();
  }

  async function approve(id: string) {
    await supabase.from("gate_passes").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Approved" }); load();
  }

  function printGP(gp: any) {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold").setFontSize(20).text("GATE PASS", 105, 20, { align: "center" });
    doc.setFontSize(12).text(`No: ${gp.gate_pass_number}`, 14, 32);
    doc.text(`Date: ${formatDateSafe(new Date(gp.pass_date), "dd MMM yyyy")}`, 150, 32);
    doc.setFontSize(11).setFont("helvetica", "normal");
    let y = 50;
    [
      ["Type", gp.pass_type?.toUpperCase()],
      ["Factory", gp.factories?.name || "—"],
      ["Vehicle Number", gp.vehicle_number || "—"],
      ["Driver Name", gp.driver_name || "—"],
      ["Driver Phone", gp.driver_phone || "—"],
      ["Destination", gp.destination || "—"],
      ["Customer", gp.customer_name || "—"],
      ["Purpose", gp.purpose || "—"],
      ["Status", gp.status?.toUpperCase()],
    ].forEach(([k, v]) => { doc.text(`${k}:`, 14, y); doc.text(String(v), 70, y); y += 10; });
    doc.text("Authorized Signatory: _____________________", 14, y + 20);
    doc.text("Security Signature: _____________________", 14, y + 35);
    addLegalFooter(doc);
    doc.save(`${gp.gate_pass_number}.pdf`);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ pass_type: "outward", factory_id: factories[0]?.id || "", pass_date: formatDateSafe(new Date(), "yyyy-MM-dd"), vehicle_number: "", driver_name: "", driver_phone: "", destination: "", customer_name: "", purpose: "", status: "pending", notes: "" }); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />New Gate Pass
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">GP #</th><th className="text-left p-3">Date</th><th className="text-left p-3">Type</th><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Driver</th><th className="text-left p-3">Destination</th><th className="text-center p-3">Status</th><th className="text-right p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{it.gate_pass_number}</td>
                <td className="p-3 text-xs">{formatDateSafe(new Date(it.pass_date), "dd MMM yyyy")}</td>
                <td className="p-3"><Badge variant="outline">{it.pass_type}</Badge></td>
                <td className="p-3">{it.vehicle_number || "—"}</td>
                <td className="p-3 text-xs">{it.driver_name || "—"}<br />{it.driver_phone}</td>
                <td className="p-3 text-xs">{it.destination || "—"}</td>
                <td className="p-3 text-center"><Badge variant={it.status === "approved" ? "default" : it.status === "rejected" ? "destructive" : "outline"}>{it.status}</Badge></td>
                <td className="p-3 text-right space-x-1">
                  {it.status === "pending" && <Button size="sm" onClick={() => approve(it.id)}>Approve</Button>}
                  <Button size="sm" variant="outline" onClick={() => printGP(it)}><Printer className="h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No gate passes yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Gate Pass</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.pass_type} onValueChange={(v) => setForm({ ...form, pass_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outward">Outward (Dispatch)</SelectItem>
                  <SelectItem value="inward">Inward (Receipt)</SelectItem>
                  <SelectItem value="returnable">Returnable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Factory</Label>
              <Select value={form.factory_id} onValueChange={(v) => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.pass_date} onChange={(e) => setForm({ ...form, pass_date: e.target.value })} /></div>
            <div><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
            <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
            <div><Label>Driver Phone</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></div>
            <div><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Destination</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
            <div className="col-span-2"><Label>Purpose</Label><Textarea rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
