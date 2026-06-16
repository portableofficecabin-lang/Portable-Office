"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportToExcel, exportToPDF, formatINR } from "@/lib/exportUtils";
import { format } from "date-fns";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ materials: [], stocks: [], factories: [], outItems: [], inItems: [], pos: [], scrap: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [m, s, f, oi, ii, po, sc] = await Promise.all([
      supabase.from("materials").select("*"),
      supabase.from("material_stock").select("*"),
      supabase.from("factories").select("*"),
      supabase.from("stock_outward_items").select("*, materials(name, unit, category), stock_outwards(outward_number, project_name, created_at, factories(name))"),
      supabase.from("stock_inward_items").select("*, materials(name, unit), stock_inwards(inward_number, created_at, factories(name))"),
      supabase.from("purchase_orders").select("*, suppliers(name)"),
      supabase.from("scrap_records").select("*, factories(name)"),
    ]);
    setData({
      materials: m.data || [], stocks: s.data || [], factories: f.data || [],
      outItems: oi.data || [], inItems: ii.data || [], pos: po.data || [], scrap: sc.data || [],
    });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  const matMap = new Map(data.materials.map((m: any) => [m.id, m]));

  // Consumption report
  const consumption = data.outItems.map((o: any) => ({
    Date: format(new Date(o.stock_outwards?.created_at), "dd MMM yyyy"),
    Outward: o.stock_outwards?.outward_number,
    Factory: o.stock_outwards?.factories?.name,
    Project: o.stock_outwards?.project_name || "—",
    Material: o.materials?.name,
    Category: o.materials?.category,
    Quantity: o.quantity, Wastage: o.wastage, Unit: o.materials?.unit,
    Amount: Number(o.amount),
  }));

  // Stock ledger
  const ledger = [
    ...data.inItems.map((i: any) => ({
      Date: format(new Date(i.stock_inwards?.created_at), "dd MMM yyyy"),
      Type: "INWARD", Reference: i.stock_inwards?.inward_number,
      Factory: i.stock_inwards?.factories?.name, Material: i.materials?.name,
      In: Number(i.quantity), Out: 0, Amount: Number(i.amount),
    })),
    ...data.outItems.map((o: any) => ({
      Date: format(new Date(o.stock_outwards?.created_at), "dd MMM yyyy"),
      Type: "OUTWARD", Reference: o.stock_outwards?.outward_number,
      Factory: o.stock_outwards?.factories?.name, Material: o.materials?.name,
      In: 0, Out: Number(o.quantity) + Number(o.wastage), Amount: Number(o.amount),
    })),
  ].sort((a, b) => b.Date.localeCompare(a.Date));

  // Factory stock report
  const factoryStock = data.factories.flatMap((f: any) =>
    data.stocks.filter((s: any) => s.factory_id === f.id).map((s: any) => {
      const m: any = matMap.get(s.material_id);
      return {
        Factory: f.name, Material: m?.name, Category: m?.category, Brand: m?.brand,
        "Current Stock": Number(s.current_stock), Unit: m?.unit,
        Rate: Number(m?.purchase_rate || 0), Value: Number(s.current_stock) * Number(m?.purchase_rate || 0),
      };
    })
  );

  // Dead stock (no movement in last 90 days)
  const since = Date.now() - 90 * 24 * 3600 * 1000;
  const movedIds = new Set([
    ...data.outItems.filter((x: any) => new Date(x.stock_outwards?.created_at).getTime() > since).map((x: any) => x.material_id),
    ...data.inItems.filter((x: any) => new Date(x.stock_inwards?.created_at).getTime() > since).map((x: any) => x.material_id),
  ]);
  const deadStockMatIds = data.materials.filter((m: any) => !movedIds.has(m.id)).map((m: any) => m.id);
  const deadStock = data.stocks.filter((s: any) => deadStockMatIds.includes(s.material_id) && Number(s.current_stock) > 0).map((s: any) => {
    const m: any = matMap.get(s.material_id);
    const f: any = data.factories.find((x: any) => x.id === s.factory_id);
    return { Factory: f?.name, Material: m?.name, Category: m?.category, Stock: s.current_stock, Unit: m?.unit, Value: Number(s.current_stock) * Number(m?.purchase_rate || 0) };
  });

  // Purchase vs Consumption
  const pvc = Array.from(new Set([...data.inItems.map((x: any) => x.material_id), ...data.outItems.map((x: any) => x.material_id)])).map((id: any) => {
    const m: any = matMap.get(id);
    const purchased = data.inItems.filter((x: any) => x.material_id === id).reduce((s: number, x: any) => s + Number(x.quantity), 0);
    const consumed = data.outItems.filter((x: any) => x.material_id === id).reduce((s: number, x: any) => s + Number(x.quantity) + Number(x.wastage), 0);
    return { Material: m?.name, Category: m?.category, Purchased: purchased, Consumed: consumed, Balance: purchased - consumed, Unit: m?.unit };
  });

  // Scrap report
  const scrapReport = data.scrap.map((s: any) => ({
    Date: format(new Date(s.scrap_date), "dd MMM yyyy"),
    Factory: s.factories?.name, Material: s.material_name, Quantity: s.quantity, Unit: s.unit,
    Rate: Number(s.rate), Total: Number(s.total_amount), Buyer: s.buyer_name || "—", Status: s.status,
  }));

  const reports = [
    { key: "consumption", title: "Material Consumption Report", rows: consumption },
    { key: "ledger", title: "Stock Ledger", rows: ledger },
    { key: "factory", title: "Factory-wise Stock", rows: factoryStock },
    { key: "dead", title: "Dead Stock Report (no movement 90d)", rows: deadStock },
    { key: "pvc", title: "Purchase vs Consumption", rows: pvc },
    { key: "scrap", title: "Scrap Report", rows: scrapReport },
  ];

  return (
    <Tabs defaultValue="consumption">
      <TabsList className="flex-wrap h-auto">
        {reports.map((r) => <TabsTrigger key={r.key} value={r.key}>{r.title.split("(")[0]}</TabsTrigger>)}
      </TabsList>
      {reports.map((r) => (
        <TabsContent key={r.key} value={r.key} className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-amber-500" />{r.title} ({r.rows.length})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportToExcel(r.rows, r.key)}><Download className="h-3 w-3 mr-1" />Excel</Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (r.rows.length === 0) return;
                const cols = Object.keys(r.rows[0]);
                exportToPDF(r.title, cols, r.rows.map((row: any) => cols.map((c) => row[c])), r.key);
              }}><Download className="h-3 w-3 mr-1" />PDF</Button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-x-auto">
            {r.rows.length === 0 ? <div className="p-8 text-center text-muted-foreground">No data</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>{Object.keys(r.rows[0]).map((c) => <th key={c} className="text-left p-3">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {r.rows.slice(0, 100).map((row: any, i: number) => (
                    <tr key={i} className="border-b">
                      {Object.values(row).map((v: any, j: number) => (
                        <td key={j} className="p-2 text-xs">{typeof v === "number" && (Object.keys(row)[j].toLowerCase().includes("amount") || Object.keys(row)[j].toLowerCase().includes("value") || Object.keys(row)[j].toLowerCase().includes("rate") || Object.keys(row)[j].toLowerCase().includes("total")) ? formatINR(v) : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {r.rows.length > 100 && <div className="text-xs text-muted-foreground text-center">Showing first 100 rows. Export for full data.</div>}
        </TabsContent>
      ))}
    </Tabs>
  );
}
