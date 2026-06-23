"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Users, Search, Plus, Building2, Phone, Mail, MapPin, X, Loader2,
  FileText, Receipt, Truck, IndianRupee, FolderKanban, Download, Edit, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface Party {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  billing_address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  party_type: string;
  credit_limit: number;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  contact_person?: string | null;
  site_location?: string | null;
}
interface PartyAddress {
  id: string;
  party_id: string;
  label: string;
  consignee_name: string | null;
  company: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  gstin: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const blankParty: Partial<Party> = {
  name: "", company: "", email: "", phone: "", gstin: "", pan: "",
  billing_address: "", city: "", state: "", pincode: "",
  party_type: "customer", credit_limit: 0, opening_balance: 0, notes: "", is_active: true,
  contact_person: "", site_location: "",
};

export default function AdminParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [addresses, setAddresses] = useState<PartyAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Party | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Party>>(blankParty);
  const [addrDialog, setAddrDialog] = useState(false);
  const [addrForm, setAddrForm] = useState<Partial<PartyAddress>>({});

  // Ledger data
  const [quotations, setQuotations] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [outwards, setOutwards] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerProject, setLedgerProject] = useState<string>("all");
  const [entryDialog, setEntryDialog] = useState(false);
  const [entryForm, setEntryForm] = useState<any>({ entry_type: "payment", entry_date: new Date().toISOString().slice(0, 10), debit: 0, credit: 0 });

  useEffect(() => { fetchParties(); }, []);
  useEffect(() => { if (selected) fetchPartyData(selected); }, [selected]);

  const fetchParties = async () => {
    setLoading(true);
    const [p, a] = await Promise.all([
      supabase.from("parties" as any).select("*").order("name"),
      supabase.from("party_addresses" as any).select("*"),
    ]);
    if (p.error) toast({ title: "Error", description: p.error.message, variant: "destructive" });
    setParties((p.data as any) || []);
    setAddresses((a.data as any) || []);
    setLoading(false);
  };

  const fetchPartyData = async (party: Party) => {
    const sb = supabase as any;
    const [q, s, pr, r, o, le] = await Promise.all([
      sb.from("quotations").select("*").eq("party_id", party.id),
      sb.from("sales_orders").select("*").eq("party_id", party.id),
      sb.from("project_allocations").select("*").eq("party_id", party.id),
      sb.from("rental_assignments").select("*").eq("party_id", party.id),
      sb.from("stock_outwards").select("*").eq("party_id", party.id),
      sb.from("ledger_entries").select("*").eq("party_id", party.id),
    ]);
    setQuotations((q.data as any) || []);
    setSalesOrders((s.data as any) || []);
    setProjects((pr.data as any) || []);
    setRentals((r.data as any) || []);
    setOutwards((o.data as any) || []);
    setLedgerEntries((le.data as any) || []);
    setLedgerProject("all");
  };

  const saveLedgerEntry = async () => {
    if (!selected) return;
    const debit = Number(entryForm.debit || 0);
    const credit = Number(entryForm.credit || 0);
    if (debit <= 0 && credit <= 0) {
      toast({ title: "Enter debit or credit amount", variant: "destructive" }); return;
    }
    const payload: any = {
      party_id: selected.id,
      entry_date: entryForm.entry_date,
      entry_type: entryForm.entry_type,
      project_ref: entryForm.project_ref || null,
      reference_number: entryForm.reference_number || null,
      description: entryForm.description || null,
      debit, credit,
      payment_mode: entryForm.payment_mode || null,
      notes: entryForm.notes || null,
    };
    if (entryForm.id) {
      const { error } = await (supabase as any).from("ledger_entries").update(payload).eq("id", entryForm.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await (supabase as any).from("ledger_entries").insert(payload);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    toast({ title: "Ledger entry saved" });
    setEntryDialog(false);
    setEntryForm({ entry_type: "payment", entry_date: new Date().toISOString().slice(0, 10), debit: 0, credit: 0 });
    fetchPartyData(selected);
  };

  const deleteLedgerEntry = async (id: string) => {
    if (!confirm("Delete this ledger entry?")) return;
    const { error } = await (supabase as any).from("ledger_entries").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    if (selected) fetchPartyData(selected);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return parties.filter(p => !q ||
      p.name.toLowerCase().includes(q) ||
      (p.company || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.gstin || "").toLowerCase().includes(q) ||
      (p.site_location || "").toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q));
  }, [parties, search]);

  const partyAddresses = selected ? addresses.filter(a => a.party_id === selected.id) : [];

  // Project list for ledger filter
  const projectOptions = useMemo(() => {
    const items = new Set<string>();
    projects.forEach(p => items.add(p.project_name));
    salesOrders.forEach(s => items.add(s.so_number));
    ledgerEntries.forEach(e => e.project_ref && items.add(e.project_ref));
    return Array.from(items);
  }, [projects, salesOrders, ledgerEntries]);

  const ledgerRows = useMemo(() => {
    const rows: any[] = [];
    salesOrders.forEach(s => {
      if (ledgerProject !== "all" && s.so_number !== ledgerProject) return;
      rows.push({
        date: s.created_at, ref: s.so_number, type: "Sales Order",
        project: s.so_number, debit: Number(s.total_amount || 0), credit: 0, status: s.payment_status,
      });
    });
    rentals.forEach(r => {
      const proj = `Rental ${r.id.slice(0, 6)}`;
      if (ledgerProject !== "all" && proj !== ledgerProject) return;
      rows.push({
        date: r.created_at, ref: r.id.slice(0, 8), type: "Rental",
        project: proj, debit: Number(r.monthly_rate || 0), credit: 0, status: r.status,
      });
    });
    ledgerEntries.forEach(e => {
      if (ledgerProject !== "all" && (e.project_ref || "—") !== ledgerProject) return;
      const typeLabel = e.entry_type === "payment" ? "Payment Received"
        : e.entry_type === "debit_note" ? "Debit Note"
        : e.entry_type === "credit_note" ? "Credit Note"
        : e.entry_type === "advance" ? "Advance" : "Adjustment";
      rows.push({
        id: e.id, manual: true,
        date: e.entry_date, ref: e.reference_number || "—", type: typeLabel,
        project: e.project_ref || "—",
        debit: Number(e.debit || 0), credit: Number(e.credit || 0),
        status: e.payment_mode || "manual",
      });
    });
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesOrders, rentals, ledgerEntries, ledgerProject]);

  const totals = useMemo(() => {
    const debit = ledgerRows.reduce((s, r) => s + r.debit, 0);
    const credit = ledgerRows.reduce((s, r) => s + r.credit, 0);
    const opening = ledgerProject === "all" ? Number(selected?.opening_balance || 0) : 0;
    return { debit, credit, balance: opening + debit - credit, opening };
  }, [ledgerRows, selected, ledgerProject]);

  const saveParty = async () => {
    if (!editing.name?.trim()) {
      toast({ title: "Name required", variant: "destructive" }); return;
    }
    // Duplicate guard for NEW parties: identify a client by mobile / email / GST.
    if (!editing.id) {
      const phone = (editing.phone || "").trim();
      const email = (editing.email || "").trim().toLowerCase();
      const gst = (editing.gstin || "").trim().toUpperCase();
      const dupe = parties.find(p =>
        (phone && (p.phone || "").trim() === phone) ||
        (email && (p.email || "").trim().toLowerCase() === email) ||
        (gst && (p.gstin || "").trim().toUpperCase() === gst)
      );
      if (dupe) {
        toast({ title: "Client already saved", description: `${dupe.name} already exists (matched by mobile / email / GST).`, variant: "destructive" });
        return;
      }
    }
    const payload = { ...editing };
    delete (payload as any).id; delete (payload as any).created_at;
    if (editing.id) {
      const { error } = await supabase.from("parties" as any).update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Party updated" });
    } else {
      const { error } = await supabase.from("parties" as any).insert(payload as any);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Party created" });
    }
    setDialogOpen(false); setEditing(blankParty); fetchParties();
  };

  const deleteParty = async (id: string) => {
    if (!confirm("Delete this party? This cannot be undone.")) return;
    const { error } = await supabase.from("parties" as any).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    if (selected?.id === id) setSelected(null);
    fetchParties();
  };

  const saveAddress = async () => {
    if (!selected || !addrForm.label?.trim()) {
      toast({ title: "Label required", variant: "destructive" }); return;
    }
    // Prevent duplicate site addresses under the same client (match on address line).
    if (!addrForm.id) {
      const normAddr = (addrForm.address_line1 || "").trim().toLowerCase();
      const dupe = addresses.find(a =>
        a.party_id === selected.id && normAddr && (a.address_line1 || "").trim().toLowerCase() === normAddr
      );
      if (dupe) {
        toast({ title: "Shipping address already exists", description: `"${dupe.label}" already has this site address for ${selected.name}.`, variant: "destructive" });
        return;
      }
    }
    const payload: any = { ...addrForm, party_id: selected.id };
    delete payload.id;
    if (addrForm.id) {
      const { error } = await supabase.from("party_addresses" as any).update(payload).eq("id", addrForm.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("party_addresses" as any).insert(payload);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    toast({ title: "Address saved" });
    setAddrDialog(false); setAddrForm({});
    const { data } = await supabase.from("party_addresses" as any).select("*");
    setAddresses((data as any) || []);
  };

  const deleteAddress = async (id: string) => {
    const { error } = await supabase.from("party_addresses" as any).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const exportLedger = (kind: "pdf" | "excel") => {
    if (!selected) return;
    const rows = ledgerRows.map(r => ({
      Date: formatDateSafe(new Date(r.date), "dd/MM/yyyy"),
      Reference: r.ref, Type: r.type, Project: r.project,
      Debit: r.debit, Credit: r.credit, Status: r.status,
    }));
    const title = `Ledger - ${selected.name}${ledgerProject !== "all" ? ` (${ledgerProject})` : ""}`;
    const filename = `ledger_${selected.name.replace(/\s+/g, "_")}_${Date.now()}`;
    if (kind === "excel") exportToExcel(rows, filename);
    else {
      const cols = ["Date", "Reference", "Type", "Project", "Debit", "Credit", "Status"];
      const body = rows.map(r => cols.map(c => (r as any)[c] ?? ""));
      exportToPDF(title, cols, body, filename);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parties / Clients"
        description="Unified client master with multi-project ship-to addresses and project-wise ledger"
        badge={<span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold">{parties.length} parties</span>}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search by name, company, phone, email, GSTIN, project..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl border-2" />
        </div>
        <Button onClick={() => { setEditing(blankParty); setDialogOpen(true); }} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <Plus className="h-5 w-5 mr-2" /> New Party
        </Button>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Party list */}
        <AdminCard>
          <AdminCardHeader>Directory ({filtered.length})</AdminCardHeader>
          <AdminCardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No parties yet. Click "New Party" to add.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2">
                {filtered.map(p => {
                  const addrCount = addresses.filter(a => a.party_id === p.id).length;
                  return (
                    <motion.button key={p.id} whileHover={{ x: 3 }} onClick={() => setSelected(p)}
                      className={cn("w-full text-left border-2 rounded-xl p-3 transition-all",
                        selected?.id === p.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-emerald-300")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.company || p.phone || "—"}</div>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{addrCount} addr</Badge>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        {/* Detail */}
        {selected ? (
          <AdminCard gradient>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-2xl">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.company || "Individual"} · since {formatDateSafe(new Date(selected.created_at), "MMM yyyy")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => deleteParty(selected.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Pill icon={Receipt} label="Quotations" value={String(quotations.length)} />
                <Pill icon={FileText} label="Sales Orders" value={String(salesOrders.length)} />
                <Pill icon={FolderKanban} label="Projects" value={String(projects.length)} />
                <Pill icon={Truck} label="Rentals" value={String(rentals.length)} />
              </div>

              <Tabs defaultValue="info">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="addresses">Ship-To ({partyAddresses.length})</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="ledger">Ledger</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-2 pt-4">
                  {selected.phone && <Row icon={Phone} v={selected.phone} />}
                  {selected.email && <Row icon={Mail} v={selected.email} />}
                  {selected.gstin && <Row icon={Building2} v={`GSTIN: ${selected.gstin}`} />}
                  {selected.billing_address && <Row icon={MapPin} v={[selected.billing_address, selected.city, selected.state, selected.pincode].filter(Boolean).join(", ")} />}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-muted/40"><div className="text-xs text-muted-foreground">Credit Limit</div><div className="font-semibold">{inr(selected.credit_limit)}</div></div>
                    <div className="p-3 rounded-lg bg-muted/40"><div className="text-xs text-muted-foreground">Opening Balance</div><div className="font-semibold">{inr(selected.opening_balance)}</div></div>
                  </div>
                </TabsContent>

                <TabsContent value="addresses" className="pt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setAddrForm({}); setAddrDialog(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Ship-To / Project Address
                    </Button>
                  </div>
                  {partyAddresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No additional addresses. Add multiple project sites or ship-to locations.</p>
                  ) : partyAddresses.map(a => (
                    <div key={a.id} className="p-4 rounded-xl border-2 border-border flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.label}</span>
                          {a.is_default && <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">Default</Badge>}
                        </div>
                        {(a.consignee_name || a.company) && (
                          <div className="text-sm font-medium">
                            {a.consignee_name}{a.consignee_name && a.company ? " · " : ""}{a.company}
                          </div>
                        )}
                        {a.contact_person && <div className="text-sm">{a.contact_person} {a.contact_phone && `· ${a.contact_phone}`}</div>}
                        <div className="text-sm text-muted-foreground">{[a.address_line1, a.city, a.state, a.pincode].filter(Boolean).join(", ") || "—"}</div>
                        {a.gstin && <div className="text-xs text-muted-foreground">GSTIN: {a.gstin}</div>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => { setAddrForm(a); setAddrDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteAddress(a.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="projects" className="pt-4">
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No projects linked yet. Link projects via Inventory → Projects (set party).</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Project</TableHead><TableHead>Status</TableHead>
                        <TableHead>Start</TableHead><TableHead>End</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {projects.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.project_name}</TableCell>
                            <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                            <TableCell>{p.start_date ? formatDateSafe(new Date(p.start_date), "dd/MM/yyyy") : "—"}</TableCell>
                            <TableCell>{p.end_date ? formatDateSafe(new Date(p.end_date), "dd/MM/yyyy") : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="ledger" className="pt-4 space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-muted-foreground mb-1 block">Project-wise Ledger</label>
                      <Select value={ledgerProject} onValueChange={setLedgerProject}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects (Consolidated)</SelectItem>
                          {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 self-end flex-wrap">
                      <Button size="sm" onClick={() => { setEntryForm({ entry_type: "payment", entry_date: new Date().toISOString().slice(0, 10), debit: 0, credit: 0, project_ref: ledgerProject !== "all" ? ledgerProject : "" }); setEntryDialog(true); }} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-1" /> Add Credit / Debit Entry
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportLedger("excel")}><Download className="h-4 w-4 mr-1" />Excel</Button>
                      <Button size="sm" variant="outline" onClick={() => exportLedger("pdf")}><Download className="h-4 w-4 mr-1" />PDF</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SumCard label="Opening" value={inr(totals.opening)} />
                    <SumCard label="Total Debit" value={inr(totals.debit)} className="text-red-600" />
                    <SumCard label="Total Credit" value={inr(totals.credit)} className="text-emerald-600" />
                    <SumCard label="Net Balance" value={inr(totals.balance)} className="font-bold" />
                  </div>

                  <div className="rounded-xl border-2 border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Type</TableHead>
                          <TableHead>Project</TableHead><TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead><TableHead>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerRows.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No ledger entries yet. Click "Add Credit / Debit Entry" to record payments or charges.</TableCell></TableRow>
                        ) : ledgerRows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{formatDateSafe(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="font-medium">{r.ref}</TableCell>
                            <TableCell>{r.type}</TableCell>
                            <TableCell className="text-xs">{r.project}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">{r.debit ? inr(r.debit) : "—"}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">{r.credit ? inr(r.credit) : "—"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{r.status}</Badge></TableCell>
                            <TableCell>{r.manual && (
                              <Button size="sm" variant="ghost" onClick={() => deleteLedgerEntry(r.id)} className="text-destructive h-7 w-7 p-0"><Trash2 className="h-3.5 w-3.5" /></Button>
                            )}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </AdminCard>
        ) : (
          <AdminCard><div className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Select a party to view full details, addresses & ledger</p>
          </div></AdminCard>
        )}
      </div>

      {/* Party Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Edit Party" : "New Party / Client"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *"><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Company"><Input value={editing.company || ""} onChange={e => setEditing({ ...editing, company: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email || ""} onChange={e => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="GSTIN"><Input value={editing.gstin || ""} onChange={e => setEditing({ ...editing, gstin: e.target.value })} /></Field>
            <Field label="PAN"><Input value={editing.pan || ""} onChange={e => setEditing({ ...editing, pan: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={editing.party_type} onValueChange={v => setEditing({ ...editing, party_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Credit Limit"><Input type="number" value={editing.credit_limit || 0} onChange={e => setEditing({ ...editing, credit_limit: Number(e.target.value) })} /></Field>
            <Field label="Opening Balance"><Input type="number" value={editing.opening_balance || 0} onChange={e => setEditing({ ...editing, opening_balance: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Field label="Billing Address"><Textarea rows={2} value={editing.billing_address || ""} onChange={e => setEditing({ ...editing, billing_address: e.target.value })} /></Field></div>
            <Field label="City"><Input value={editing.city || ""} onChange={e => setEditing({ ...editing, city: e.target.value })} /></Field>
            <Field label="State"><Input value={editing.state || ""} onChange={e => setEditing({ ...editing, state: e.target.value })} /></Field>
            <Field label="Pincode"><Input value={editing.pincode || ""} onChange={e => setEditing({ ...editing, pincode: e.target.value })} /></Field>
            <Field label="Contact Person"><Input value={editing.contact_person || ""} onChange={e => setEditing({ ...editing, contact_person: e.target.value })} /></Field>
            <Field label="Site / Project Location"><Input value={editing.site_location || ""} onChange={e => setEditing({ ...editing, site_location: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveParty} className="bg-emerald-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={addrDialog} onOpenChange={setAddrDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{addrForm.id ? "Edit" : "Add"} Ship-To / Project Address</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Label * (e.g., 'Site 1 - Hosur', 'HO Office')"><Input value={addrForm.label || ""} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })} /></Field></div>
            <Field label="Consignee Name"><Input value={addrForm.consignee_name || ""} onChange={e => setAddrForm({ ...addrForm, consignee_name: e.target.value })} placeholder="Receiver name" /></Field>
            <Field label="Consignee Company"><Input value={addrForm.company || ""} onChange={e => setAddrForm({ ...addrForm, company: e.target.value })} /></Field>
            <Field label="Site Contact Person"><Input value={addrForm.contact_person || ""} onChange={e => setAddrForm({ ...addrForm, contact_person: e.target.value })} /></Field>
            <Field label="Site Phone"><Input value={addrForm.contact_phone || ""} onChange={e => setAddrForm({ ...addrForm, contact_phone: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Shipping Address"><Textarea rows={2} value={addrForm.address_line1 || ""} onChange={e => setAddrForm({ ...addrForm, address_line1: e.target.value })} placeholder="Street, area, landmark" /></Field></div>
            <Field label="City"><Input value={addrForm.city || ""} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} /></Field>
            <Field label="State"><Input value={addrForm.state || ""} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} /></Field>
            <Field label="Pincode"><Input value={addrForm.pincode || ""} onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value })} maxLength={6} /></Field>
            <Field label="GSTIN at Ship-To (optional)"><Input value={addrForm.gstin || ""} onChange={e => setAddrForm({ ...addrForm, gstin: e.target.value.toUpperCase() })} /></Field>
            <div className="flex items-center gap-2 mt-6 col-span-2">
              <input type="checkbox" id="is_default" checked={addrForm.is_default || false} onChange={e => setAddrForm({ ...addrForm, is_default: e.target.checked })} />
              <label htmlFor="is_default" className="text-sm">Set as default ship-to address</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddrDialog(false)}>Cancel</Button>
            <Button onClick={saveAddress} className="bg-emerald-600 text-white">Save Address</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Entry Dialog */}
      <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{entryForm.id ? "Edit" : "Add"} Credit / Debit Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Type *">
              <Select value={entryForm.entry_type} onValueChange={v => {
                // Helpful default: payment received => credit; debit_note/advance => debit
                const next: any = { ...entryForm, entry_type: v };
                if (v === "payment" || v === "credit_note") { next.credit = next.credit || next.debit || 0; next.debit = 0; }
                if (v === "debit_note" || v === "advance") { next.debit = next.debit || next.credit || 0; next.credit = 0; }
                setEntryForm(next);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment Received (Credit)</SelectItem>
                  <SelectItem value="advance">Advance from Client (Credit)</SelectItem>
                  <SelectItem value="credit_note">Credit Note (Credit)</SelectItem>
                  <SelectItem value="debit_note">Debit Note / Charge (Debit)</SelectItem>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date *"><Input type="date" value={entryForm.entry_date || ""} onChange={e => setEntryForm({ ...entryForm, entry_date: e.target.value })} /></Field>
            <Field label="Project (optional)">
              <Select value={entryForm.project_ref || "__none"} onValueChange={v => setEntryForm({ ...entryForm, project_ref: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference No. (Receipt/Cheque/UTR)"><Input value={entryForm.reference_number || ""} onChange={e => setEntryForm({ ...entryForm, reference_number: e.target.value })} /></Field>
            <Field label="Debit Amount (₹)"><Input type="number" value={entryForm.debit || 0} onChange={e => setEntryForm({ ...entryForm, debit: Number(e.target.value), credit: 0 })} /></Field>
            <Field label="Credit Amount (₹)"><Input type="number" value={entryForm.credit || 0} onChange={e => setEntryForm({ ...entryForm, credit: Number(e.target.value), debit: 0 })} /></Field>
            <Field label="Payment Mode">
              <Select value={entryForm.payment_mode || "__none"} onValueChange={v => setEntryForm({ ...entryForm, payment_mode: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer / NEFT / RTGS</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="col-span-2"><Field label="Description"><Input value={entryForm.description || ""} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={entryForm.notes || ""} onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialog(false)}>Cancel</Button>
            <Button onClick={saveLedgerEntry} className="bg-emerald-600 text-white">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>{children}</div>;
}
function Pill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
function Row({ icon: Icon, v }: { icon: any; v: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Icon className="h-4 w-4 text-emerald-600" /></div>
      <span className="text-sm font-medium">{v}</span>
    </div>
  );
}
function SumCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="p-3 rounded-xl border-2 border-border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-semibold text-sm mt-1", className)}>{value}</div>
    </div>
  );
}
