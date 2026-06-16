"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, ShoppingBag, Factory, TrendingDown, Briefcase, Truck, IndianRupee, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/exportUtils";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface BreakdownRow {
  name: string;
  unit: string;
  rate: number;
  qty: number;
  value: number;
}

export default function InventoryProDashboard() {
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [data, setData] = useState<any>({
    totalStockValue: 0,
    lowStockCount: 0,
    pendingPOCount: 0,
    activeProjects: 0,
    activeRentals: 0,
    factories: [],
    categoryConsumption: [],
    factoryStock: [],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [matsRes, stocksRes, alertsRes, posRes, projsRes, rentalsRes, outRes, factsRes] = await Promise.all([
      supabase.from("materials").select("id, name, purchase_rate, min_stock_alert, category, unit"),
      supabase.from("material_stock").select("material_id, factory_id, current_stock"),
      supabase.from("materials").select("id, name, min_stock_alert"),
      supabase.from("purchase_orders").select("id, total_amount, status").eq("status", "pending"),
      supabase.from("project_allocations").select("id, status").in("status", ["planned", "in_progress"]),
      supabase.from("rental_assignments").select("id").eq("status", "active"),
      supabase.from("stock_outward_items").select("material_id, quantity, amount"),
      supabase.from("factories").select("id, name, code"),
    ]);

    const materials = matsRes.data || [];
    const stocks = stocksRes.data || [];
    const factories = factsRes.data || [];
    const outItems = outRes.data || [];

    let totalValue = 0;
    const matMap = new Map(materials.map((m: any) => [m.id, m]));
    const qtyByMat = new Map<string, number>();
    stocks.forEach((s: any) => {
      const m: any = matMap.get(s.material_id);
      if (m) totalValue += Number(s.current_stock) * Number(m.purchase_rate || 0);
      qtyByMat.set(s.material_id, (qtyByMat.get(s.material_id) || 0) + Number(s.current_stock));
    });

    const rows: BreakdownRow[] = [];
    qtyByMat.forEach((qty, matId) => {
      const m: any = matMap.get(matId);
      if (!m) return;
      const rate = Number(m.purchase_rate || 0);
      rows.push({ name: m.name, unit: m.unit || "Nos", rate, qty, value: qty * rate });
    });
    rows.sort((a, b) => b.value - a.value);
    setBreakdown(rows);

    let lowCount = 0;
    materials.forEach((m: any) => {
      const tot = qtyByMat.get(m.id) || 0;
      if (tot <= Number(m.min_stock_alert || 0)) lowCount++;
    });

    const factoryStock = factories.map((f: any) => {
      let val = 0, qty = 0;
      stocks.filter((s: any) => s.factory_id === f.id).forEach((s: any) => {
        const m: any = matMap.get(s.material_id);
        if (m) {
          val += Number(s.current_stock) * Number(m.purchase_rate || 0);
          qty += Number(s.current_stock);
        }
      });
      return { name: f.name, value: Math.round(val), qty: Math.round(qty) };
    });

    const catMap = new Map<string, number>();
    outItems.forEach((it: any) => {
      const m: any = matMap.get(it.material_id);
      if (m) catMap.set(m.category, (catMap.get(m.category) || 0) + Number(it.amount || 0));
    });
    const categoryConsumption = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    setData({
      totalStockValue: totalValue,
      lowStockCount: lowCount,
      pendingPOCount: posRes.data?.length || 0,
      activeProjects: projsRes.data?.length || 0,
      activeRentals: rentalsRes.data?.length || 0,
      factoryStock,
      categoryConsumption,
    });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  const COLORS = ["#1e3a5f", "#e88226", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#84cc16"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiWithBreakdown
          label="Total Stock Value"
          value={formatINR(data.totalStockValue)}
          rows={breakdown}
          totalValue={data.totalStockValue}
        />
        <Kpi icon={AlertTriangle} label="Low Stock Items" value={String(data.lowStockCount)} accent="from-rose-500 to-rose-700" />
        <Kpi icon={ShoppingBag} label="Pending POs" value={String(data.pendingPOCount)} accent="from-amber-500 to-amber-700" />
        <Kpi icon={Briefcase} label="Active Projects" value={String(data.activeProjects)} accent="from-blue-500 to-blue-700" />
        <Kpi icon={Truck} label="Active Rentals" value={String(data.activeRentals)} accent="from-purple-500 to-purple-700" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Factory className="h-5 w-5 text-amber-500" /> Factory-wise Stock Value
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.factoryStock}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatINR(v)} />
              <Bar dataKey="value" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-amber-500" /> Material Consumption by Category
          </h3>
          {data.categoryConsumption.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              No consumption recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.categoryConsumption} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                  {data.categoryConsumption.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold mt-1">{value}</div>
    </motion.div>
  );
}

function KpiWithBreakdown({ label, value, rows, totalValue }: { label: string; value: string; rows: BreakdownRow[]; totalValue: number }) {
  return (
    <Sheet>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white mb-3">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
        <div className="font-display text-xl font-bold mt-1">{value}</div>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="mt-3 w-full gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50">
            <Eye className="h-3.5 w-3.5" /> View breakdown
          </Button>
        </SheetTrigger>
      </motion.div>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock Value Breakdown</SheetTitle>
          <p className="text-sm text-muted-foreground">Verify how the total <span className="font-semibold text-emerald-700">{formatINR(totalValue)}</span> is calculated. Formula: <code>Qty × Purchase Rate</code> per material, summed.</p>
        </SheetHeader>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="text-left p-2">Material</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Rate (₹)</th>
                <th className="text-right p-2">Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{r.qty.toLocaleString("en-IN")} {r.unit}</td>
                  <td className="p-2 text-right">{r.rate.toLocaleString("en-IN")}</td>
                  <td className="p-2 text-right font-semibold">{formatINR(r.value)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No stock records found.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 font-bold">
                <td className="p-2" colSpan={3}>Grand Total</td>
                <td className="p-2 text-right text-emerald-700">{formatINR(totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Tip: If a value looks too high, check the material's <strong>purchase rate</strong> in Materials. Rates are stored per-unit — entering a per-cabin total instead of per-Nos rate inflates the number.
        </p>
      </SheetContent>
    </Sheet>
  );
}
