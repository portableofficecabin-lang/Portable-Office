"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Package, AlertTriangle, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  stock_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
}

export default function AdminInventory() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sku,category,stock_quantity,low_stock_threshold,in_stock")
      .order("name");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setProducts((data as ProductRow[]) || []);
    setIsLoading(false);
  };

  const adjustStock = async (p: ProductRow, delta: number) => {
    const newQty = Math.max(0, p.stock_quantity + delta);
    setUpdating(p.id);
    const { error } = await supabase.from("products").update({ stock_quantity: newQty }).eq("id", p.id);
    if (!error) {
      await supabase.from("inventory_movements").insert({
        product_id: p.id,
        movement_type: delta > 0 ? "in" : "out",
        quantity: Math.abs(delta),
        reason: "Manual adjustment",
      });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, stock_quantity: newQty } : x));
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setUpdating(null);
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const lowStock = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);
  const totalUnits = products.reduce((s, p) => s + p.stock_quantity, 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Track stock levels and low-stock alerts" />

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={Package} label="Total SKUs" value={String(products.length)} />
        <Kpi icon={Package} label="Total Units" value={String(totalUnits)} />
        <Kpi icon={AlertTriangle} label="Low Stock" value={String(lowStock.length)} highlight={lowStock.length > 0} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 mb-2">
            <AlertTriangle className="h-5 w-5" /> Low-stock alerts
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} className="bg-white text-amber-800 border border-amber-300">
                {p.name} — {p.stock_quantity} left
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, category..." className="pl-11 h-12 rounded-xl border-2" />
      </div>

      <AdminCard delay={0.1}>
        <AdminCardHeader>{filtered.length} products</AdminCardHeader>
        <AdminCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-3 px-2">Product</th>
                  <th className="text-left py-3 px-2">SKU</th>
                  <th className="text-left py-3 px-2">Category</th>
                  <th className="text-center py-3 px-2">Stock</th>
                  <th className="text-center py-3 px-2">Threshold</th>
                  <th className="text-right py-3 px-2">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{p.name}</td>
                      <td className="py-3 px-2 font-mono text-xs">{p.sku || "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{p.category}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={cn("font-bold text-base", low ? "text-rose-600" : "text-emerald-600")}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-muted-foreground">{p.low_stock_threshold}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => adjustStock(p, -1)} disabled={updating === p.id || p.stock_quantity === 0}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => adjustStock(p, 1)} disabled={updating === p.id}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => adjustStock(p, 10)} disabled={updating === p.id}>
                            +10
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("p-5 rounded-2xl border shadow-sm", highlight ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20" : "bg-card border-border")}>
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground mb-2">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
