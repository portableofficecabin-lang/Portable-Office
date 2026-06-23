"use client";

import { useState, useEffect, useCallback } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { motion } from "framer-motion";
import {
  Loader2, Search, Plus, Trash2, Edit, Eye, FileText, Send,
  CheckCircle, XCircle, Clock, IndianRupee, Download, ArrowRight,
  CalendarDays, Phone, Mail, Building2, MapPin, X, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import { addLegalFooter } from "@/lib/pdfFooter";
import logoImg from "@/assets/logo.webp";
import { imageToPngDataUrl } from "@/lib/pdf/imageToPng";

/* ─── helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtPdf = (n: number) => "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_production: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  dispatched: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

interface LineItem { id?: string; description: string; unit: string; quantity: number; unit_price: number; total_price: number; }

const emptyItem = (): LineItem => ({ description: "", unit: "Nos", quantity: 1, unit_price: 0, total_price: 0 });

/* ============================================================ */
/*                    MAIN COMPONENT                            */
/* ============================================================ */
export default function SalesQuotation() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sales & Quotation" description="Manage enquiries, sales orders, customers & follow-ups" />
      <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
        Note: To create a Quotation, Proforma or Invoice, please use <span className="font-semibold text-foreground">Quotation Pro</span>.
      </div>
      <Tabs defaultValue="sales-orders" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="sales-orders">Sales Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>
        <TabsContent value="enquiries"><EnquiryTab /></TabsContent>
        <TabsContent value="sales-orders"><SalesOrderTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="followups"><FollowUpTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CustomersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("parties").select("*").eq("is_active", true).order("name");
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.company?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.city?.toLowerCase().includes(q);
  });

  if (loading) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved customers / parties..." className="pl-9" />
        </div>
        <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{filtered.length} saved</Badge>
      </div>
      <AdminCard>
        <AdminCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-left py-3 px-2">Company</th>
                  <th className="text-left py-3 px-2">Phone</th>
                  <th className="text-left py-3 px-2">Email</th>
                  <th className="text-left py-3 px-2">City</th>
                  <th className="text-left py-3 px-2">GSTIN</th>
                  <th className="text-left py-3 px-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-2 font-medium">{r.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{r.company || "—"}</td>
                    <td className="py-3 px-2">{r.phone || "—"}</td>
                    <td className="py-3 px-2 text-muted-foreground">{r.email || "—"}</td>
                    <td className="py-3 px-2">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="py-3 px-2 font-mono text-xs">{r.gstin || "—"}</td>
                    <td className="py-3 px-2"><Badge variant="outline">{r.party_type}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No saved customers found. Add them in Quotation Pro or Parties.</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* ============================================================ */
/*                    ENQUIRY TAB                                */
/* ============================================================ */
function EnquiryTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.product_name?.toLowerCase().includes(q);
  });

  if (loading) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search enquiries..." className="pl-9" />
        </div>
        <Badge variant="outline">{filtered.length} enquiries</Badge>
      </div>
      <AdminCard>
        <AdminCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-left py-3 px-2">Email / Phone</th>
                  <th className="text-left py-3 px-2">Product</th>
                  <th className="text-left py-3 px-2">Stage</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 px-2 font-medium">{r.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{r.email}<br/><span className="text-xs">{r.phone}</span></td>
                    <td className="py-3 px-2">{r.product_name || "—"}</td>
                    <td className="py-3 px-2"><Badge className={statusColor[r.pipeline_stage] || ""}>{r.pipeline_stage}</Badge></td>
                    <td className="py-3 px-2"><Badge variant="outline">{r.status}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No enquiries found</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* ============================================================ */
/*                    QUOTATION TAB                              */
/* ============================================================ */
function QuotationTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Prices are exclusive of GST, transportation, and installation charges.");
  const [validityDays, setValidityDays] = useState(15);
  const [gstPercent, setGstPercent] = useState(18);
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from("quotations").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => {
    setEditId(null); setClientName(""); setClientEmail(""); setClientPhone("");
    setClientCompany(""); setClientAddress(""); setSubject(""); setNotes("");
    setTerms("Prices are exclusive of GST, transportation, and installation charges.");
    setValidityDays(15); setGstPercent(18); setItems([emptyItem()]);
  };

  const openEdit = async (row: any) => {
    setEditId(row.id);
    setClientName(row.client_name); setClientEmail(row.client_email || "");
    setClientPhone(row.client_phone || ""); setClientCompany(row.client_company || "");
    setClientAddress(row.client_address || ""); setSubject(row.subject || "");
    setNotes(row.notes || ""); setTerms(row.terms || "");
    setValidityDays(row.validity_days || 15); setGstPercent(row.gst_percent || 18);
    // load items
    const { data } = await supabase.from("quotation_items").select("*").eq("quotation_id", row.id).order("sort_order");
    setItems(data && data.length > 0 ? data.map(i => ({ id: i.id, description: i.description, unit: i.unit || "Nos", quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price })) : [emptyItem()]);
    setShowForm(true);
  };

  const calcTotals = (list: LineItem[]) => {
    const sub = list.reduce((s, i) => s + i.total_price, 0);
    const gst = sub * gstPercent / 100;
    return { subtotal: sub, gst_amount: gst, total_amount: sub + gst };
  };

  const updateItem = (idx: number, field: keyof LineItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      (copy[idx] as any)[field] = val;
      if (field === "quantity" || field === "unit_price") {
        copy[idx].total_price = copy[idx].quantity * copy[idx].unit_price;
      }
      return copy;
    });
  };

  const save = async () => {
    if (!clientName.trim()) { toast({ title: "Client name required", variant: "destructive" }); return; }
    if (items.every(i => !i.description.trim())) { toast({ title: "Add at least one item", variant: "destructive" }); return; }
    const validItems = items.filter(i => i.description.trim());
    const totals = calcTotals(validItems);

    if (editId) {
      await supabase.from("quotations").update({ client_name: clientName, client_email: clientEmail || null, client_phone: clientPhone || null, client_company: clientCompany || null, client_address: clientAddress || null, subject: subject || null, notes: notes || null, terms, validity_days: validityDays, gst_percent: gstPercent, ...totals }).eq("id", editId);
      await supabase.from("quotation_items").delete().eq("quotation_id", editId);
      await supabase.from("quotation_items").insert(validItems.map((it, i) => ({ quotation_id: editId, description: it.description, unit: it.unit, quantity: it.quantity, unit_price: it.unit_price, total_price: it.total_price, sort_order: i })));
    } else {
      const { data: q } = await supabase.from("quotations").insert({ client_name: clientName, client_email: clientEmail || null, client_phone: clientPhone || null, client_company: clientCompany || null, client_address: clientAddress || null, subject: subject || null, notes: notes || null, terms, validity_days: validityDays, gst_percent: gstPercent, ...totals, created_by: user?.id || null }).select().single();
      if (q) {
        await supabase.from("quotation_items").insert(validItems.map((it, i) => ({ quotation_id: q.id, description: it.description, unit: it.unit, quantity: it.quantity, unit_price: it.unit_price, total_price: it.total_price, sort_order: i })));
      }
    }
    toast({ title: editId ? "Quotation updated" : "Quotation created" });
    setShowForm(false); resetForm(); fetchAll();
  };

  const deleteRow = async (id: string) => {
    await supabase.from("quotations").delete().eq("id", id);
    toast({ title: "Quotation deleted" }); fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("quotations").update({ status }).eq("id", id);
    fetchAll();
  };

  const convertToSO = async (q: any) => {
    const { data: qItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
    const { data: so } = await supabase.from("sales_orders").insert({
      quotation_id: q.id, client_name: q.client_name, client_email: q.client_email,
      client_phone: q.client_phone, client_company: q.client_company, client_address: q.client_address,
      subtotal: q.subtotal, gst_percent: q.gst_percent, gst_amount: q.gst_amount, total_amount: q.total_amount,
      notes: q.notes, created_by: user?.id || null,
    }).select().single();
    if (so && qItems) {
      await supabase.from("sales_order_items").insert(qItems.map((it: any, i: number) => ({
        sales_order_id: so.id, description: it.description, unit: it.unit,
        quantity: it.quantity, unit_price: it.unit_price, total_price: it.total_price, sort_order: i,
      })));
    }
    await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);
    toast({ title: "Sales Order created from quotation" }); fetchAll();
  };

  const downloadPdf = async (q: any) => {
    const { data: qItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id).order("sort_order");
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const w = 210;

    // Header
    try {
      const logoData = await imageToPngDataUrl(logoImg, { maxWidth: 220 });
      if (logoData) doc.addImage(logoData, "PNG", 14, 10, 22, 22);
    } catch {}
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("PORTABLE OFFICE CABIN", w / 2, 18, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post", w / 2, 24, { align: "center" });
    doc.text("Shoolagiri, Krishnagiri, Tamil Nadu – 635117 | GST: 33AJHPA8048R1ZS", w / 2, 28, { align: "center" });
    doc.text("Phone: +91 80731 07943 | Email: portableofficecabin@gmail.com", w / 2, 32, { align: "center" });
    doc.setDrawColor(200); doc.line(14, 36, w - 14, 36);

    // Quotation info
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", w / 2, 44, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    let y = 52;
    doc.text(`Quotation No: ${q.quotation_number}`, 14, y);
    doc.text(`Date: ${new Date(q.created_at).toLocaleDateString("en-IN")}`, w - 14, y, { align: "right" });
    y += 6;
    doc.text(`Valid for: ${q.validity_days} days`, w - 14, y, { align: "right" });

    // Client info
    y += 8;
    doc.setFont("helvetica", "bold"); doc.text("To:", 14, y);
    doc.setFont("helvetica", "normal");
    y += 5; doc.text(q.client_name, 14, y);
    if (q.client_company) { y += 4; doc.text(q.client_company, 14, y); }
    if (q.client_address) { y += 4; doc.text(q.client_address, 14, y); }
    if (q.client_phone) { y += 4; doc.text(`Phone: ${q.client_phone}`, 14, y); }
    if (q.client_email) { y += 4; doc.text(`Email: ${q.client_email}`, 14, y); }
    if (q.subject) { y += 6; doc.setFont("helvetica", "bold"); doc.text(`Subject: ${q.subject}`, 14, y); doc.setFont("helvetica", "normal"); }

    // Column positions
    const col = { sno: 16, desc: 30, unit: 110, qty: 130, rate: 148, amt: 175 };
    const descMaxW = col.unit - col.desc - 2; // max width for description text wrapping

    // Table header
    y += 10;
    doc.setFillColor(30, 58, 95); doc.setTextColor(255);
    doc.rect(14, y - 5, w - 28, 8, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("S.No", col.sno, y); doc.text("Description", col.desc, y);
    doc.text("Unit", col.unit, y); doc.text("Qty", col.qty, y);
    doc.text("Rate", col.rate, y); doc.text("Amount", col.amt, y);
    doc.setTextColor(0); doc.setFont("helvetica", "normal");
    y += 8;

    (qItems || []).forEach((item: any, idx: number) => {
      // Wrap description text
      const descLines: string[] = doc.splitTextToSize(item.description || "", descMaxW);
      const rowH = Math.max(descLines.length * 4.5, 6);

      // Page break check
      if (y + rowH > 265) { doc.addPage(); y = 20; }

      // Alternate row background
      if (idx % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(14, y - 4, w - 28, rowH + 2, "F");
      }

      doc.setFontSize(8);
      doc.text(String(idx + 1), col.sno, y);
      doc.text(descLines, col.desc, y);
      doc.text(item.unit || "Nos", col.unit, y);
      doc.text(String(item.quantity), col.qty, y);
      doc.text(fmtPdf(item.unit_price), col.rate, y);
      doc.text(fmtPdf(item.total_price), col.amt, y);
      y += rowH + 3;
    });

    // Totals
    y += 6;
    doc.setDrawColor(200); doc.line(col.rate - 4, y, w - 14, y); y += 8;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", col.rate, y); doc.text(fmtPdf(q.subtotal || 0), w - 16, y, { align: "right" }); y += 6;
    doc.text(`GST (${q.gst_percent}%):`, col.rate, y); doc.text(fmtPdf(q.gst_amount || 0), w - 16, y, { align: "right" }); y += 2;
    doc.line(col.rate - 4, y, w - 14, y); y += 6;
    doc.setFontSize(11);
    doc.text("Total:", col.rate, y); doc.text(fmtPdf(q.total_amount || 0), w - 16, y, { align: "right" });

    // Terms
    if (q.terms) {
      y += 14;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("Terms & Conditions:", 14, y);
      doc.setFont("helvetica", "normal"); y += 6;
      const tLines = doc.splitTextToSize(q.terms, w - 28);
      tLines.forEach((line: string) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(line, 14, y); y += 4.5;
      });
    }

    // Bank Details
    y += 8;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(30, 58, 95);
    doc.rect(14, y - 4, w - 28, 6, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("Bank Details", 16, y);
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    y += 6;
    doc.text(`Account Name: PORTABLE OFFICE CABIN`, 16, y);
    doc.text(`Bank: Axis Bank, THIYAGARASANAPALLI`, w / 2, y); y += 5;
    doc.text(`A/C No: 923020047280667`, 16, y);
    doc.text(`IFSC Code: UTIB0004965`, w / 2, y);

    // Signatory
    y += 18;
    if (y > 260) { doc.addPage(); y = 40; }
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("For PORTABLE OFFICE CABIN", w - 16, y, { align: "right" }); y += 18;
    doc.text("Authorized Signatory", w - 16, y, { align: "right" });

    addLegalFooter(doc);
    doc.save(`${q.quotation_number}.pdf`);
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.client_name?.toLowerCase().includes(q) || r.quotation_number?.toLowerCase().includes(q) || r.client_company?.toLowerCase().includes(q);
  });

  if (loading) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotations..." className="pl-9" />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Quotation
        </Button>
      </div>

      {/* Quotation Form Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Quotation" : "New Quotation"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Client Name *</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} /></div>
              <div><Label>Company</Label><Input value={clientCompany} onChange={e => setClientCompany(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
            </div>

            {/* Line Items */}
            <div>
              <Label className="mb-2 block font-semibold">Line Items</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2 w-20">Unit</th>
                      <th className="text-left p-2 w-20">Qty</th>
                      <th className="text-left p-2 w-28">Rate (₹)</th>
                      <th className="text-right p-2 w-28">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1"><Input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Item description" /></td>
                        <td className="p-1"><Input value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)} /></td>
                        <td className="p-1"><NumberInput  value={it.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} /></td>
                        <td className="p-1"><NumberInput  value={it.unit_price} onChange={e => updateItem(idx, "unit_price", Number(e.target.value))} /></td>
                        <td className="p-1 text-right font-medium">{fmt(it.total_price)}</td>
                        <td className="p-1"><Button size="icon" variant="ghost" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}><X className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="space-y-1 text-sm w-64">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">{fmt(calcTotals(items.filter(i => i.description.trim())).subtotal)}</span></div>
                <div className="flex justify-between items-center gap-2">
                  <span>GST:</span>
                  <div className="flex items-center gap-1"><NumberInput  value={gstPercent} onChange={e => setGstPercent(Number(e.target.value))} className="w-16 h-7 text-xs" /><span className="text-xs">%</span></div>
                  <span className="font-medium">{fmt(calcTotals(items.filter(i => i.description.trim())).gst_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total:</span><span>{fmt(calcTotals(items.filter(i => i.description.trim())).total_amount)}</span></div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Validity (days)</Label><NumberInput  value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} /></div>
            </div>
            <div><Label>Terms & Conditions</Label><Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button onClick={save}>{editId ? "Update" : "Create"} Quotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation List */}
      <AdminCard>
        <AdminCardHeader>{filtered.length} quotations</AdminCardHeader>
        <AdminCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-3 px-2">Quotation #</th>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Client</th>
                  <th className="text-right py-3 px-2">Amount</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-2 font-mono font-medium">{r.quotation_number}</td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 px-2"><div className="font-medium">{r.client_name}</div><div className="text-xs text-muted-foreground">{r.client_company}</div></td>
                    <td className="py-3 px-2 text-right font-semibold">{fmt(r.total_amount || 0)}</td>
                    <td className="py-3 px-2 text-center">
                      <Select value={r.status} onValueChange={v => updateStatus(r.id, v)}>
                        <SelectTrigger className="h-7 w-28 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["draft", "sent", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadPdf(r)} title="PDF"><Download className="h-3.5 w-3.5" /></Button>
                        {r.status !== "accepted" && (
                          <Button size="sm" variant="ghost" onClick={() => convertToSO(r)} title="Convert to Sales Order"><ArrowRight className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRow(r.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No quotations found</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* ============================================================ */
/*                    SALES ORDER TAB                            */
/* ============================================================ */
function SalesOrderTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from("sales_orders").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("sales_orders").update({ status }).eq("id", id);
    fetchAll();
  };

  const updatePayment = async (id: string, payment_status: string) => {
    await supabase.from("sales_orders").update({ payment_status }).eq("id", id);
    fetchAll();
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.client_name?.toLowerCase().includes(q) || r.so_number?.toLowerCase().includes(q);
  });

  if (loading) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales orders..." className="pl-9" />
        </div>
        <Badge variant="outline">{filtered.length} orders</Badge>
      </div>

      <AdminCard>
        <AdminCardHeader>{filtered.length} sales orders</AdminCardHeader>
        <AdminCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-3 px-2">SO #</th>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Client</th>
                  <th className="text-right py-3 px-2">Amount</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-center py-3 px-2">Payment</th>
                  <th className="text-left py-3 px-2">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-2 font-mono font-medium">{r.so_number}</td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 px-2"><div className="font-medium">{r.client_name}</div><div className="text-xs text-muted-foreground">{r.client_company}</div></td>
                    <td className="py-3 px-2 text-right font-semibold">{fmt(r.total_amount || 0)}</td>
                    <td className="py-3 px-2 text-center">
                      <Select value={r.status} onValueChange={v => updateStatus(r.id, v)}>
                        <SelectTrigger className="h-7 w-32 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pending", "confirmed", "in_production", "dispatched", "delivered", "cancelled"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Select value={r.payment_status} onValueChange={v => updatePayment(r.id, v)}>
                        <SelectTrigger className="h-7 w-28 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pending", "partial", "paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No sales orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* ============================================================ */
/*                    FOLLOW-UP TAB                              */
/* ============================================================ */
function FollowUpTab() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [e, a] = await Promise.all([
        supabase.from("enquiries").select("*").not("next_followup_at", "is", null).order("next_followup_at"),
        supabase.from("appointments").select("*").not("next_followup_at", "is", null).order("next_followup_at"),
      ]);
      setEnquiries(e.data || []);
      setAppointments(a.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />;

  const allFollowups = [
    ...enquiries.map(e => ({ type: "Enquiry", name: e.name, contact: e.email, subject: e.product_name || e.subject, date: e.next_followup_at, stage: e.pipeline_stage, id: e.id })),
    ...appointments.map(a => ({ type: "Appointment", name: a.customer_name, contact: a.customer_email, subject: a.service_type, date: a.next_followup_at, stage: a.pipeline_stage, id: a.id })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const today = new Date().toDateString();
  const overdue = allFollowups.filter(f => new Date(f.date) < new Date() && new Date(f.date).toDateString() !== today);
  const todayList = allFollowups.filter(f => new Date(f.date).toDateString() === today);
  const upcoming = allFollowups.filter(f => new Date(f.date) > new Date());

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border bg-rose-50 dark:bg-rose-900/20 border-rose-200">
          <div className="text-xs uppercase font-bold text-rose-600 mb-1">Overdue</div>
          <div className="text-2xl font-display font-bold text-rose-700">{overdue.length}</div>
        </div>
        <div className="p-5 rounded-2xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200">
          <div className="text-xs uppercase font-bold text-amber-600 mb-1">Today</div>
          <div className="text-2xl font-display font-bold text-amber-700">{todayList.length}</div>
        </div>
        <div className="p-5 rounded-2xl border bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <div className="text-xs uppercase font-bold text-blue-600 mb-1">Upcoming</div>
          <div className="text-2xl font-display font-bold text-blue-700">{upcoming.length}</div>
        </div>
      </div>

      {[{ title: "Overdue", list: overdue, color: "text-rose-600" }, { title: "Today", list: todayList, color: "text-amber-600" }, { title: "Upcoming", list: upcoming, color: "text-blue-600" }].map(section => section.list.length > 0 && (
        <AdminCard key={section.title}>
          <AdminCardHeader><span className={section.color}>{section.title}</span> ({section.list.length})</AdminCardHeader>
          <AdminCardContent>
            <div className="space-y-3">
              {section.list.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.type} — {f.subject || "General"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{new Date(f.date).toLocaleDateString("en-IN")}</div>
                    <Badge className={statusColor[f.stage] || ""} variant="outline">{f.stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </AdminCardContent>
        </AdminCard>
      ))}

      {allFollowups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No follow-ups scheduled. Set follow-up dates on enquiries and appointments.</div>
      )}
    </div>
  );
}
