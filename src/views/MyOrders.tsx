"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Package, ArrowLeft, Clock, CheckCircle2, Truck, Factory, Search, ShieldCheck, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500 bg-amber-50" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-500 bg-blue-50" },
  manufacturing: { label: "Manufacturing", icon: Factory, color: "text-purple-500 bg-purple-50" },
  quality_check: { label: "Quality Check", icon: ShieldCheck, color: "text-indigo-500 bg-indigo-50" },
  dispatched: { label: "Dispatched", icon: Truck, color: "text-cyan-500 bg-cyan-50" },
  in_transit: { label: "In Transit", icon: Truck, color: "text-orange-500 bg-orange-50" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-500 bg-red-50" },
};

const statusOrder = ["pending", "confirmed", "manufacturing", "quality_check", "dispatched", "in_transit", "delivered"];

interface Order {
  id: string; order_number: string; status: string; total_amount: number | null;
  payment_method: string; payment_status: string; created_at: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number | null }[];
  order_status_history: { id: string; status: string; notes: string | null; created_at: string }[];
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*), order_status_history(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as any) || []);
      setLoading(false);
    };
    fetchOrders();

    // Realtime
    const channel = supabase.channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => fetchOrders())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, router]);

  if (!user) return null;

  return (
    <Layout>
      <SEOHead title="My Orders | Portable Office Cabin" description="Track your orders and view order history." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-accent" /> My Orders
            </h1>
            <Button variant="outline" asChild>
              <Link href="/my-account"><ArrowLeft className="mr-2 h-4 w-4" /> My Account</Link>
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold mb-3">No orders yet</h2>
              <p className="text-muted-foreground mb-6">Start shopping to place your first order.</p>
              <Button variant="accent" asChild><Link href="/products">Browse Products</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                const isExpanded = expanded === order.id;
                return (
                  <div key={order.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold">{order.order_number}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{order.order_items?.length || 0} item(s)
                          {order.total_amount ? ` · ₹${order.total_amount.toLocaleString("en-IN")}` : ""}
                        </p>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-5 pb-5">
                        {/* Items */}
                        <div className="mt-4 space-y-2">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
                              <span>{item.product_name} × {item.quantity}</span>
                              <span className="font-medium">{item.unit_price ? `₹${(item.unit_price * item.quantity).toLocaleString("en-IN")}` : "Quote"}</span>
                            </div>
                          ))}
                        </div>

                        {/* Timeline */}
                        {order.status !== "cancelled" && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-sm mb-4">Order Progress</h4>
                            <div className="flex items-center gap-0">
                              {statusOrder.map((s, i) => {
                                const stepCfg = statusConfig[s];
                                const currentIdx = statusOrder.indexOf(order.status);
                                const isPast = i <= currentIdx;
                                const isCurrent = i === currentIdx;
                                return (
                                  <div key={s} className="flex-1 flex flex-col items-center relative">
                                    {i > 0 && (
                                      <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${isPast ? "bg-accent" : "bg-border"}`} />
                                    )}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10 ${
                                      isCurrent ? "border-accent bg-accent text-accent-foreground" :
                                      isPast ? "border-accent bg-accent/10 text-accent" :
                                      "border-border bg-muted text-muted-foreground"
                                    }`}>
                                      {i + 1}
                                    </div>
                                    <span className={`text-[10px] mt-1.5 text-center leading-tight ${isPast ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                      {stepCfg.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* History */}
                        {order.order_status_history && order.order_status_history.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-sm mb-3">Status Updates</h4>
                            <div className="space-y-2">
                              {[...order.order_status_history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(h => {
                                const hCfg = statusConfig[h.status] || statusConfig.pending;
                                return (
                                  <div key={h.id} className="flex items-start gap-3 text-sm">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${hCfg.color.split(" ")[0].replace("text-", "bg-")}`} />
                                    <div>
                                      <span className="font-medium">{hCfg.label}</span>
                                      {h.notes && <span className="text-muted-foreground"> — {h.notes}</span>}
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(h.created_at).toLocaleString("en-IN")}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
