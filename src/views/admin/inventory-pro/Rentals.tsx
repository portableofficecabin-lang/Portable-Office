"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { NumberInput } from "@/components/admin/NumberInput";
import { Plus, Loader2, Edit, QrCode, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "qrcode";


export default function RentalsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAsset, setOpenAsset] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ cabin_id: "", cabin_type: "Office Cabin", size: "", monthly_rent: 0, status: "available", current_factory_id: "", current_location: "", notes: "" });

  const [openAssign, setOpenAssign] = useState(false);
  const [assetForAssign, setAssetForAssign] = useState<any | null>(null);
  const [assign, setAssign] = useState<any>({ customer_name: "", customer_phone: "", site_address: "", dispatch_date: formatDateSafe(new Date(), "yyyy-MM-dd"), expected_return_date: "", monthly_rate: 0, deposit_amount: 0, notes: "" });

  const [openMaint, setOpenMaint] = useState(false);
  const [maintAsset, setMaintAsset] = useState<any | null>(null);
  const [maint, setMaint] = useState<any>({ maintenance_type: "service", description: "", cost: 0, performed_by: "" });

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [a, ass, f] = await Promise.all([
      supabase.from("rental_assets").select("*, factories(name)").order("cabin_id"),
      supabase.from("rental_assignments").select("*").eq("status", "active"),
      supabase.from("factories").select("*"),
    ]);
    setAssets(a.data || []); setAssignments(ass.data || []); setFactories(f.data || []);
    setLoading(false);
  }

  async function saveAsset() {
    if (!form.cabin_id || !form.cabin_type) { toast({ title: "Cabin ID & type required", variant: "destructive" }); return; }
    const payload = { ...form, current_factory_id: form.current_factory_id || null };
    // `form` may carry the embedded `factories` join object from load()'s
    // select("*, factories(name)") — it's not a rental_assets column, so PostgREST
    // rejects the write ("Could not find the 'factories' column…"). Strip it.
    delete (payload as any).factories;
    const res = editId ? await supabase.from("rental_assets").update(payload).eq("id", editId) : await supabase.from("rental_assets").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpenAsset(false); load();
  }

  async function dispatch() {
    if (!assetForAssign) return;
    if (!assign.customer_name) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("rental_assignments").insert({ asset_id: assetForAssign.id, ...assign, status: "active" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("rental_assets").update({ status: "rented", current_location: assign.site_address }).eq("id", assetForAssign.id);
    toast({ title: "Dispatched" });
    setOpenAssign(false); load();
  }

  async function returnAsset(asset: any) {
    const damage = prompt("Damage notes (leave empty if none):");
    const charges = damage ? Number(prompt("Damage charges (₹):") || 0) : 0;
    const active = assignments.find((x) => x.asset_id === asset.id);
    if (active) {
      await supabase.from("rental_assignments").update({
        status: "returned", actual_return_date: formatDateSafe(new Date(), "yyyy-MM-dd"),
        damage_notes: damage || null, damage_charges: charges,
      }).eq("id", active.id);
    }
    await supabase.from("rental_assets").update({ status: "available" }).eq("id", asset.id);
    toast({ title: "Returned" }); load();
  }

  async function saveMaint() {
    if (!maintAsset) return;
    const { error } = await supabase.from("rental_maintenance").insert({ asset_id: maintAsset.id, ...maint });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Maintenance logged" });
    setOpenMaint(false); load();
  }

  async function showQR(a: any) {
    const data = JSON.stringify({ type: "rental", cabin_id: a.cabin_id, id: a.id });
    const url = await QRCode.toDataURL(data, { width: 320 });
    setQrUrl(url); setQrLabel(`${a.cabin_id} — ${a.cabin_type}`);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); setForm({ cabin_id: "", cabin_type: "Office Cabin", size: "", monthly_rent: 0, status: "available", current_factory_id: factories[0]?.id || "", current_location: "", notes: "" }); setOpenAsset(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />Add Cabin
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((a) => {
          const active = assignments.find((x) => x.asset_id === a.id);
          return (
            <div key={a.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg">{a.cabin_id}</h3>
                    <Badge variant={a.status === "available" ? "default" : a.status === "rented" ? "outline" : "destructive"}>{a.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{a.cabin_type} {a.size && `• ${a.size}`}</div>
                  <div className="text-xs text-muted-foreground mt-1">{a.current_location || a.factories?.name || "—"}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => showQR(a)}><QrCode className="h-4 w-4" /></Button>
              </div>
              {active && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs space-y-1 mb-3">
                  <div><b>Customer:</b> {active.customer_name}</div>
                  <div><b>Dispatched:</b> {active.dispatch_date && formatDateSafe(new Date(active.dispatch_date), "dd MMM yyyy")}</div>
                  {active.expected_return_date && <div><b>Return Due:</b> {formatDateSafe(new Date(active.expected_return_date), "dd MMM yyyy")}</div>}
                </div>
              )}
              <div className="text-xs text-muted-foreground mb-2">Rent: ₹{Number(a.monthly_rent).toLocaleString("en-IN")}/mo</div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setEditId(a.id); setForm(a); setOpenAsset(true); }}><Edit className="h-3 w-3" /></Button>
                {a.status === "available" && <Button size="sm" onClick={() => { setAssetForAssign(a); setAssign({ ...assign, monthly_rate: a.monthly_rent }); setOpenAssign(true); }}>Dispatch</Button>}
                {a.status === "rented" && <Button size="sm" variant="outline" onClick={() => returnAsset(a)}>Return</Button>}
                <Button size="sm" variant="outline" onClick={() => { setMaintAsset(a); setMaint({ maintenance_type: "service", description: "", cost: 0, performed_by: "" }); setOpenMaint(true); }}><Wrench className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
        {assets.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground">No rental cabins yet</div>}
      </div>

      <Dialog open={openAsset} onOpenChange={setOpenAsset}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Rental Cabin</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cabin ID *</Label><Input value={form.cabin_id} onChange={(e) => setForm({ ...form, cabin_id: e.target.value })} placeholder="e.g. CAB-001" /></div>
            <div><Label>Type *</Label>
              <Select
                value={["Office Cabin","Security Cabin","Labour Cabin","Labour Camp","Toilet Cabin","Bath Cabin","Container Office","Site Office","Shipping Storage Container","Marketing Office","Other"].includes(form.cabin_type) ? form.cabin_type : "Other"}
                onValueChange={(v) => setForm({ ...form, cabin_type: v === "Other" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {[
                    "Office Cabin",
                    "Security Cabin",
                    "Labour Cabin",
                    "Labour Camp",
                    "Toilet Cabin",
                    "Bath Cabin",
                    "Container Office",
                    "Site Office",
                    "Shipping Storage Container",
                    "Marketing Office",
                    "Other",
                  ].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {!["Office Cabin","Security Cabin","Labour Cabin","Labour Camp","Toilet Cabin","Bath Cabin","Container Office","Site Office","Shipping Storage Container","Marketing Office"].includes(form.cabin_type) && (
                <Input
                  className="mt-2"
                  placeholder="Enter custom type (e.g. VIP Cabin, Canteen, Store Room)"
                  value={form.cabin_type}
                  onChange={(e) => setForm({ ...form, cabin_type: e.target.value })}
                />
              )}
            </div>
            <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 10x8 ft" /></div>
            <div><Label>Monthly Rent (₹)</Label><NumberInput  value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Factory</Label>
              <Select value={form.current_factory_id} onValueChange={(v) => setForm({ ...form, current_factory_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Current Location</Label><Input value={form.current_location} onChange={(e) => setForm({ ...form, current_location: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenAsset(false)}>Cancel</Button><Button onClick={saveAsset}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAssign} onOpenChange={setOpenAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispatch Cabin</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer Name *</Label><Input value={assign.customer_name} onChange={(e) => setAssign({ ...assign, customer_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={assign.customer_phone} onChange={(e) => setAssign({ ...assign, customer_phone: e.target.value })} /></div>
            <div><Label>Dispatch Date</Label><Input type="date" value={assign.dispatch_date} onChange={(e) => setAssign({ ...assign, dispatch_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Site Address</Label><Textarea value={assign.site_address} onChange={(e) => setAssign({ ...assign, site_address: e.target.value })} /></div>
            <div><Label>Expected Return</Label><Input type="date" value={assign.expected_return_date} onChange={(e) => setAssign({ ...assign, expected_return_date: e.target.value })} /></div>
            <div><Label>Monthly Rate</Label><NumberInput  value={assign.monthly_rate} onChange={(e) => setAssign({ ...assign, monthly_rate: Number(e.target.value) })} /></div>
            <div><Label>Deposit</Label><NumberInput  value={assign.deposit_amount} onChange={(e) => setAssign({ ...assign, deposit_amount: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenAssign(false)}>Cancel</Button><Button onClick={dispatch}>Dispatch</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openMaint} onOpenChange={setOpenMaint}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Maintenance — {maintAsset?.cabin_id}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={maint.maintenance_type} onValueChange={(v) => setMaint({ ...maint, maintenance_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="paint">Paint</SelectItem>
                  <SelectItem value="damage">Damage Fix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cost (₹)</Label><NumberInput  value={maint.cost} onChange={(e) => setMaint({ ...maint, cost: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={maint.description} onChange={(e) => setMaint({ ...maint, description: e.target.value })} /></div>
            <div className="col-span-2"><Label>Performed By</Label><Input value={maint.performed_by} onChange={(e) => setMaint({ ...maint, performed_by: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenMaint(false)}>Cancel</Button><Button onClick={saveMaint}>Log</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrUrl} onOpenChange={() => setQrUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{qrLabel}</DialogTitle></DialogHeader>
          {qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto" />}
          {qrUrl && <Button onClick={() => { const a = document.createElement("a"); a.href = qrUrl; a.download = `${qrLabel}.png`; a.click(); }}>Download QR</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
