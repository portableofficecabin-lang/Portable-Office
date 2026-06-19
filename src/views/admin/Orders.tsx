"use client";

import { useEffect, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Loader2, Package, Search, FileText, IndianRupee, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
  invoice_number: string | null;
  invoice_generated_at: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  user_id: string;
  created_at: string;
  notes: string | null;
}

const statusOptions = ["pending", "confirmed", "manufacturing", "quality_check", "dispatched", "in_transit", "delivered", "cancelled"];

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data as OrderRow[]) || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast({ title: "Order updated" });
  };

  const generateInvoice = async (order: OrderRow) => {
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const { error } = await supabase
      .from("orders")
      .update({ invoice_number: invoiceNumber, invoice_generated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, invoice_number: invoiceNumber, invoice_generated_at: new Date().toISOString() } : o))
    );

    // Open printable invoice in new window
    const html = renderInvoiceHTML({ ...order, invoice_number: invoiceNumber });
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const ok = !q || o.order_number.toLowerCase().includes(q) || (o.invoice_number || "").toLowerCase().includes(q);
    const sf = statusFilter === "all" || o.status === statusFilter;
    return ok && sf;
  });

  const totals = {
    revenue: orders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    paid: orders.reduce((s, o) => s + Number(o.paid_amount || 0), 0),
    pending: orders.filter((o) => o.status === "pending").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders & Invoices" description="ERP view of all orders, payments and invoices" />

      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard icon={IndianRupee} label="Total Revenue" value={inr(totals.revenue)} />
        <KpiCard icon={Receipt} label="Collected" value={inr(totals.paid)} />
        <KpiCard icon={Package} label="Pending Orders" value={String(totals.pending)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order or invoice number..." className="pl-11 h-12 rounded-xl border-2" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <AdminCard delay={0.1}>
        <AdminCardHeader>{filtered.length} orders</AdminCardHeader>
        <AdminCardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-3 px-2">Order</th>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Location</th>
                    <th className="text-right py-3 px-2">Total</th>
                    <th className="text-right py-3 px-2">Paid</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Invoice</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-muted/40">
                      <td className="py-3 px-2 font-mono font-semibold">{o.order_number}</td>
                      <td className="py-3 px-2 text-muted-foreground">{formatDateSafe(new Date(o.created_at), "MMM d, yyyy")}</td>
                      <td className="py-3 px-2">{[o.shipping_city, o.shipping_state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="py-3 px-2 text-right font-semibold">{inr(Number(o.total_amount || 0))}</td>
                      <td className="py-3 px-2 text-right">{inr(Number(o.paid_amount || 0))}</td>
                      <td className="py-3 px-2">
                        <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                          <SelectTrigger className={cn("h-8 w-32 text-xs font-semibold border-0", statusColors[o.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-2">
                        {o.invoice_number ? (
                          <Badge className="bg-emerald-100 text-emerald-700 font-mono">{o.invoice_number}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => generateInvoice(o)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          {o.invoice_number ? "View" : "Generate"}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground mb-2">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function renderInvoiceHTML(o: OrderRow) {
  return `<!DOCTYPE html><html><head><title>${o.invoice_number}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:780px;margin:40px auto;padding:32px;color:#0f172a}
h1{font-size:32px;margin:0 0 4px}
.muted{color:#64748b}
.row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
table{width:100%;border-collapse:collapse;margin:24px 0}
th,td{text-align:left;padding:12px;border-bottom:1px solid #e2e8f0}
th{background:#f8fafc;text-transform:uppercase;font-size:11px;letter-spacing:0.05em}
.total{background:#fef3c7;font-weight:700}
.brand{color:#f97316;font-weight:700}
@media print{body{margin:0}}
</style></head><body>
<div class="row">
<div><h1 class="brand">Portable Office Cabin</h1><p class="muted">Bengaluru, Karnataka, India</p></div>
<div style="text-align:right"><h2>INVOICE</h2><p><strong>${o.invoice_number}</strong></p><p class="muted">${formatDateSafe(new Date(), "MMM d, yyyy")}</p></div>
</div>
<div class="row">
<div><strong>Bill To</strong><br/><p class="muted">${[o.shipping_city, o.shipping_state].filter(Boolean).join(", ") || "Customer"}</p></div>
<div style="text-align:right"><strong>Order #</strong><br/><p>${o.order_number}</p></div>
</div>
<table>
<thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>
<tr><td>Order ${o.order_number}</td><td style="text-align:right">${inr(Number(o.total_amount || 0))}</td></tr>
<tr><td class="muted">Paid</td><td style="text-align:right">${inr(Number(o.paid_amount || 0))}</td></tr>
<tr class="total"><td>Balance Due</td><td style="text-align:right">${inr(Number(o.total_amount || 0) - Number(o.paid_amount || 0))}</td></tr>
</tbody>
</table>
<p class="muted" style="font-size:12px">Prices exclusive of GST, transport and installation. No returns accepted on custom products.</p>
<button onclick="window.print()" style="margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border:0;border-radius:8px;cursor:pointer">Print / Save PDF</button>
</body></html>`;
}
