"use client";

import { useEffect, useState, Fragment } from "react";
import { Plus, Loader2, Edit, Trash2, ArrowLeftRight, Search, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/admin/NumberInput";
import { format } from "date-fns";

export default function MachineryPage() {
  return (
    <Tabs defaultValue="machinery" className="space-y-4">
      <TabsList className="bg-card border border-border">
        <TabsTrigger value="machinery">Machinery</TabsTrigger>
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="contractors">Contractors</TabsTrigger>
        <TabsTrigger value="handovers">Handover Register</TabsTrigger>
      </TabsList>
      <TabsContent value="machinery"><MachineryList /></TabsContent>
      <TabsContent value="sections"><SectionsList /></TabsContent>
      <TabsContent value="contractors"><ContractorsList /></TabsContent>
      <TabsContent value="handovers"><HandoverList /></TabsContent>
    </Tabs>
  );
}

/* -------- Sections -------- */
function SectionsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("machinery_sections").select("*").order("name");
    setItems(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const res = editId
      ? await supabase.from("machinery_sections").update(form).eq("id", editId)
      : await supabase.from("machinery_sections").insert(form);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpen(false); setEditId(null); setForm({ name: "", description: "" }); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete section?")) return;
    await supabase.from("machinery_sections").delete().eq("id", id); load();
  }

  if (loading) return <Loader />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); setForm({ name: "", description: "" }); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600">
          <Plus className="h-4 w-4 mr-2" />Add Section
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Description</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-muted-foreground">{s.description || "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditId(s.id); setForm({ name: s.name, description: s.description || "" }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No sections yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Section</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welding, Carpentry, Electrical" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editId ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------- Contractors -------- */
const emptyContractor = { name: "", company: "", phone: "", email: "", address: "", gstin: "", notes: "" };
function ContractorsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyContractor);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("contractors").select("*").order("name");
    setItems(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const res = editId
      ? await supabase.from("contractors").update(form).eq("id", editId)
      : await supabase.from("contractors").insert(form);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpen(false); setEditId(null); setForm(emptyContractor); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete contractor?")) return;
    await supabase.from("contractors").delete().eq("id", id); load();
  }
  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || (i.company || "").toLowerCase().includes(q) || (i.phone || "").includes(q);
  });

  if (loading) return <Loader />;
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search contractor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyContractor); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600">
          <Plus className="h-4 w-4 mr-2" />Add Contractor
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">GSTIN</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.company || "—"}</td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3 text-xs">{c.email || "—"}</td>
                <td className="p-3 font-mono text-xs">{c.gstin || "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setForm({ ...emptyContractor, ...c }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No contractors yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Contractor</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editId ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------- Machinery -------- */
const emptyMachine = { name: "", code: "", section_id: "", brand: "", model: "", serial_number: "", total_quantity: 1, available_quantity: 1, status: "available", purchase_date: "", purchase_value: 0, notes: "" };
function MachineryList() {
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyMachine);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [handovers, setHandovers] = useState<Record<string, any[]>>({});

  async function load() {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.from("machinery").select("*, machinery_sections(name)").order("name"),
      supabase.from("machinery_sections").select("*").order("name"),
    ]);
    setItems(m.data || []); setSections(s.data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = {
      ...form,
      section_id: form.section_id || null,
      purchase_date: form.purchase_date || null,
      total_quantity: Number(form.total_quantity || 0),
      available_quantity: Number(form.available_quantity || 0),
      purchase_value: Number(form.purchase_value || 0),
    };
    const res = editId
      ? await supabase.from("machinery").update(payload).eq("id", editId)
      : await supabase.from("machinery").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Updated" : "Created" });
    setOpen(false); setEditId(null); setForm(emptyMachine); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete machinery?")) return;
    await supabase.from("machinery").delete().eq("id", id); load();
  }

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q);
  });

  async function toggleExpand(id: string) {
    const willOpen = !expanded[id];
    setExpanded((p) => ({ ...p, [id]: willOpen }));
    if (willOpen && !handovers[id]) {
      const { data } = await supabase.from("machinery_handovers")
        .select("*, contractors(name, company), machinery_sections(name)")
        .eq("machinery_id", id)
        .order("created_at", { ascending: false });
      setHandovers((p) => ({ ...p, [id]: data || [] }));
    }
  }

  if (loading) return <Loader />;
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search machinery..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyMachine); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600">
          <Plus className="h-4 w-4 mr-2" />Add Machinery
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="w-10 p-3"></th>
              <th className="text-left p-3">Name / Code</th>
              <th className="text-left p-3">Section</th>
              <th className="text-left p-3">Brand / Model</th>
              <th className="text-left p-3">Serial No</th>
              <th className="text-center p-3">Total</th>
              <th className="text-center p-3">Available</th>
              <th className="text-center p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const isOpen = !!expanded[m.id];
              const rows = handovers[m.id] || [];
              return (
                <Fragment key={m.id}>
                  <tr key={m.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleExpand(m.id)}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </td>
                    <td className="p-3 font-medium">{m.name}{m.code && <span className="ml-2 text-xs text-muted-foreground font-mono">({m.code})</span>}</td>
                    <td className="p-3"><Badge variant="outline">{m.machinery_sections?.name || "—"}</Badge></td>
                    <td className="p-3 text-muted-foreground">{[m.brand, m.model].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="p-3 font-mono text-xs">{m.serial_number || "—"}</td>
                    <td className="p-3 text-center">{m.total_quantity}</td>
                    <td className={`p-3 text-center font-bold ${Number(m.available_quantity) > 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.available_quantity}</td>
                    <td className="p-3 text-center"><Badge variant={m.status === "available" ? "default" : m.status === "issued" ? "outline" : "destructive"}>{m.status}</Badge></td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(m.id)} title="Details"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditId(m.id); setForm({ ...emptyMachine, ...m, section_id: m.section_id || "" }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/20 border-b">
                      <td colSpan={9} className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                          <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium">{m.brand || "—"}</span></div>
                          <div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{m.model || "—"}</span></div>
                          <div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{m.serial_number || "—"}</span></div>
                          <div><span className="text-muted-foreground">Purchase Date:</span> <span className="font-medium">{m.purchase_date ? format(new Date(m.purchase_date), "dd MMM yyyy") : "—"}</span></div>
                          <div><span className="text-muted-foreground">Purchase Value:</span> <span className="font-medium">₹{Number(m.purchase_value || 0).toLocaleString("en-IN")}</span></div>
                          <div className="col-span-2 md:col-span-3"><span className="text-muted-foreground">Notes:</span> <span>{m.notes || "—"}</span></div>
                        </div>
                        <div className="font-semibold text-sm mb-2">Handover History ({rows.length})</div>
                        {rows.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic">No handover records for this machinery.</div>
                        ) : (
                          <table className="w-full text-xs bg-background rounded">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-2">Issue Date</th>
                                <th className="text-left p-2">Contractor</th>
                                <th className="text-center p-2">Qty</th>
                                <th className="text-left p-2">Site</th>
                                <th className="text-center p-2">Status</th>
                                <th className="text-left p-2">Return</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((h: any) => (
                                <tr key={h.id} className="border-t">
                                  <td className="p-2">{h.issue_date ? format(new Date(h.issue_date), "dd MMM yyyy") : "—"}</td>
                                  <td className="p-2">{h.contractors?.name}{h.contractors?.company && <div className="text-muted-foreground">{h.contractors.company}</div>}</td>
                                  <td className="p-2 text-center font-semibold">{h.quantity}</td>
                                  <td className="p-2">{h.site_location || "—"}</td>
                                  <td className="p-2 text-center"><Badge variant={h.status === "returned" ? "default" : "outline"}>{h.status}</Badge></td>
                                  <td className="p-2">{h.return_date ? format(new Date(h.return_date), "dd MMM yyyy") : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No machinery yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Machinery</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. MIG Welding Machine" /></div>
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MIG-001" /></div>
            <div><Label>Section</Label>
              <Select value={form.section_id || "none"} onValueChange={(v) => setForm({ ...form, section_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="under_repair">Under Repair</SelectItem>
                  <SelectItem value="scrapped">Scrapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><Label>Total Quantity</Label><NumberInput value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} /></div>
            <div><Label>Available Quantity</Label><NumberInput value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} /></div>
            <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date || ""} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><Label>Purchase Value (₹)</Label><NumberInput value={form.purchase_value} onChange={(e) => setForm({ ...form, purchase_value: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editId ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------- Handovers -------- */
const emptyHandover = {
  machinery_id: "", contractor_id: "", section_id: "", quantity: 1,
  issue_date: format(new Date(), "yyyy-MM-dd"), expected_return_date: "", return_date: "",
  condition_out: "", condition_in: "", site_location: "", status: "issued",
  issued_by_name: "", received_by_name: "", notes: "",
};
function HandoverList() {
  const [items, setItems] = useState<any[]>([]);
  const [machinery, setMachinery] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyHandover);

  async function load() {
    setLoading(true);
    const [h, m, c, s] = await Promise.all([
      supabase.from("machinery_handovers").select("*, machinery(name, code), contractors(name, company), machinery_sections(name)").order("created_at", { ascending: false }),
      supabase.from("machinery").select("*"),
      supabase.from("contractors").select("*").eq("is_active", true).order("name"),
      supabase.from("machinery_sections").select("*").order("name"),
    ]);
    setItems(h.data || []); setMachinery(m.data || []); setContractors(c.data || []); setSections(s.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function adjustMachineAvailable(machineryId: string, delta: number) {
    const m = machinery.find((x) => x.id === machineryId);
    if (!m) return;
    await supabase.from("machinery").update({
      available_quantity: Math.max(0, Number(m.available_quantity) + delta),
      status: Number(m.available_quantity) + delta <= 0 ? "issued" : "available",
    }).eq("id", machineryId);
  }

  async function save() {
    if (!form.machinery_id || !form.contractor_id) { toast({ title: "Machinery and contractor required", variant: "destructive" }); return; }
    const payload = {
      ...form,
      section_id: form.section_id || null,
      expected_return_date: form.expected_return_date || null,
      return_date: form.return_date || null,
      quantity: Number(form.quantity || 1),
    };
    const res = editId
      ? await supabase.from("machinery_handovers").update(payload).eq("id", editId)
      : await supabase.from("machinery_handovers").insert(payload);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    if (!editId) await adjustMachineAvailable(form.machinery_id, -Number(form.quantity || 1));
    toast({ title: editId ? "Updated" : "Issued" });
    setOpen(false); setEditId(null); setForm(emptyHandover); load();
  }

  async function markReturned(h: any) {
    const condition = prompt("Return condition (e.g. Good / Damaged):") || "";
    await supabase.from("machinery_handovers").update({
      status: "returned", return_date: format(new Date(), "yyyy-MM-dd"), condition_in: condition,
    }).eq("id", h.id);
    await adjustMachineAvailable(h.machinery_id, Number(h.quantity || 1));
    toast({ title: "Marked returned" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete handover record?")) return;
    await supabase.from("machinery_handovers").delete().eq("id", id); load();
  }

  if (loading) return <Loader />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); setForm(emptyHandover); setOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600">
          <ArrowLeftRight className="h-4 w-4 mr-2" />New Handover
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Issue Date</th>
              <th className="text-left p-3">Machinery</th>
              <th className="text-left p-3">Contractor</th>
              <th className="text-left p-3">Section</th>
              <th className="text-center p-3">Qty</th>
              <th className="text-left p-3">Site</th>
              <th className="text-center p-3">Status</th>
              <th className="text-left p-3">Return</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((h) => (
              <tr key={h.id} className="border-b hover:bg-muted/30">
                <td className="p-3 text-xs">{h.issue_date ? format(new Date(h.issue_date), "dd MMM yyyy") : "—"}</td>
                <td className="p-3 font-medium">{h.machinery?.name}{h.machinery?.code && <span className="ml-1 text-xs text-muted-foreground">({h.machinery.code})</span>}</td>
                <td className="p-3">{h.contractors?.name}{h.contractors?.company && <div className="text-xs text-muted-foreground">{h.contractors.company}</div>}</td>
                <td className="p-3"><Badge variant="outline">{h.machinery_sections?.name || "—"}</Badge></td>
                <td className="p-3 text-center font-semibold">{h.quantity}</td>
                <td className="p-3 text-xs">{h.site_location || "—"}</td>
                <td className="p-3 text-center"><Badge variant={h.status === "returned" ? "default" : h.status === "issued" ? "outline" : "destructive"}>{h.status}</Badge></td>
                <td className="p-3 text-xs">{h.return_date ? format(new Date(h.return_date), "dd MMM yyyy") : (h.expected_return_date ? `Exp ${format(new Date(h.expected_return_date), "dd MMM")}` : "—")}</td>
                <td className="p-3 text-right">
                  {h.status !== "returned" && <Button size="sm" variant="outline" onClick={() => markReturned(h)}>Mark Returned</Button>}
                  <Button size="sm" variant="ghost" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No handovers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Machinery Handover</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Machinery *</Label>
              <Select value={form.machinery_id} onValueChange={(v) => {
                const mc = machinery.find((x) => x.id === v);
                setForm({ ...form, machinery_id: v, section_id: mc?.section_id || form.section_id });
              }}>
                <SelectTrigger><SelectValue placeholder="Select machinery" /></SelectTrigger>
                <SelectContent>{machinery.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} {m.code ? `(${m.code})` : ""} — Avail: {m.available_quantity}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Contractor *</Label>
              <Select value={form.contractor_id} onValueChange={(v) => setForm({ ...form, contractor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select contractor" /></SelectTrigger>
                <SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label>
              <Select value={form.section_id || "none"} onValueChange={(v) => setForm({ ...form, section_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><NumberInput value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div><Label>Expected Return Date</Label><Input type="date" value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Site Location</Label><Input value={form.site_location} onChange={(e) => setForm({ ...form, site_location: e.target.value })} placeholder="Project / Site address" /></div>
            <div><Label>Condition (Out)</Label><Input value={form.condition_out} onChange={(e) => setForm({ ...form, condition_out: e.target.value })} placeholder="e.g. Good, Working" /></div>
            <div><Label>Issued By</Label><Input value={form.issued_by_name} onChange={(e) => setForm({ ...form, issued_by_name: e.target.value })} /></div>
            <div><Label>Received By (Contractor side)</Label><Input value={form.received_by_name} onChange={(e) => setForm({ ...form, received_by_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Issue</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Loader() { return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>; }
