"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LowStockAlertsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.from("materials").select("*").order("name"),
      supabase.from("material_stock").select("material_id, current_stock, factory_id, factories(name)"),
    ]);
    const stocks = s.data || [];
    const matStocks = new Map<string, { total: number; perFactory: { name: string; qty: number }[] }>();
    stocks.forEach((x: any) => {
      const cur = matStocks.get(x.material_id) || { total: 0, perFactory: [] };
      cur.total += Number(x.current_stock);
      cur.perFactory.push({ name: x.factories?.name || "—", qty: Number(x.current_stock) });
      matStocks.set(x.material_id, cur);
    });
    const result = (m.data || []).map((mat: any) => {
      const st = matStocks.get(mat.id) || { total: 0, perFactory: [] };
      return { ...mat, total_stock: st.total, perFactory: st.perFactory };
    }).filter((x: any) => x.total_stock <= Number(x.min_stock_alert)).sort((a: any, b: any) => a.total_stock - b.total_stock);
    setItems(result);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl p-5 shadow-lg flex items-center gap-4">
        <AlertTriangle className="h-10 w-10" />
        <div>
          <div className="text-xs uppercase opacity-80">Low Stock Alerts</div>
          <div className="text-3xl font-bold">{items.length} item(s) below minimum</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="text-emerald-600 font-semibold text-lg">✓ All stocks healthy</div>
          <div className="text-sm text-muted-foreground mt-1">No materials below minimum threshold</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((m) => (
            <div key={m.id} className="bg-card border-l-4 border-rose-500 border-y border-r border-border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold">{m.name}</h3>
                  <Badge variant="outline" className="mt-1">{m.category}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-rose-600">{m.total_stock}</div>
                  <div className="text-xs text-muted-foreground">of min {m.min_stock_alert} {m.unit}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mt-3 pt-3 border-t">
                {m.perFactory.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between"><span>{f.name}</span><b>{f.qty} {m.unit}</b></div>
                ))}
              </div>
              <Button asChild size="sm" className="mt-3 w-full" variant="outline">
                <a href="/admin/inventory-pro/purchase-orders"><ShoppingCart className="h-3 w-3 mr-1" />Create PO</a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
