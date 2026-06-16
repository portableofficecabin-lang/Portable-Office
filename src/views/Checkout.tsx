"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { CreditCard, FileText, Truck } from "lucide-react";

export default function CheckoutPage() {
  const { items, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"quote_request" | "online">("quote_request");
  const [form, setForm] = useState({
    address_line1: "", address_line2: "", city: "", state: "", pincode: "", notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id,
        order_number: "",
        total_amount: getCartTotal(),
        payment_method: paymentMethod,
        payment_status: paymentMethod === "quote_request" ? "pending" : "pending",
        shipping_address_line1: form.address_line1,
        shipping_address_line2: form.address_line2,
        shipping_city: form.city,
        shipping_state: form.state,
        shipping_pincode: form.pincode,
        notes: form.notes || null,
      }).select("id, order_number").single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || "Product",
        quantity: item.quantity,
        unit_price: item.product?.price || null,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Add initial status history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "pending" as any,
        notes: "Order placed successfully",
        created_by: user.id,
      });

      await clearCart();
      toast({ title: "Order Placed!", description: `Your order ${order.order_number} has been submitted successfully.` });
      router.push("/my-account/orders");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to place order.", variant: "destructive" });
    }
    setLoading(false);
  };

  if (!user) { router.push("/login"); return null; }
  if (items.length === 0) { router.push("/cart"); return null; }

  return (
    <Layout>
      <SEOHead title="Checkout | Portable Office Cabin" description="Complete your order." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">Checkout</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Shipping */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-accent" /> Shipping Address
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="address_line1">Address Line 1 *</Label>
                      <Input id="address_line1" name="address_line1" value={form.address_line1} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input id="address_line2" name="address_line2" value={form.address_line2} onChange={handleChange} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" name="city" value={form.city} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input id="state" name="state" value={form.state} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input id="pincode" name="pincode" value={form.pincode} onChange={handleChange} required className="mt-1.5" />
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-accent" /> Order Type
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentMethod("quote_request")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === "quote_request" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}>
                      <FileText className="h-6 w-6 text-accent mb-2" />
                      <p className="font-semibold">Request a Quote</p>
                      <p className="text-sm text-muted-foreground">We'll contact you with final pricing</p>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod("online")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === "online" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}>
                      <CreditCard className="h-6 w-6 text-accent mb-2" />
                      <p className="font-semibold">Pay Online</p>
                      <p className="text-sm text-muted-foreground">Secure online payment</p>
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Any special requirements or customization requests..." className="mt-1.5" rows={3} />
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="bg-card rounded-xl border border-border/50 p-6 sticky top-24">
                  <h2 className="font-display font-semibold text-lg mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{item.product?.name} × {item.quantity}</span>
                        <span className="font-medium shrink-0">
                          {item.product?.price ? `₹${(item.product.price * item.quantity).toLocaleString("en-IN")}` : "TBD"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Estimated Total</span>
                      <span className="text-accent">₹{getCartTotal().toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">* GST, transport & installation extra</p>
                  </div>
                  <Button type="submit" variant="accent" size="lg" className="w-full mt-6" disabled={loading}>
                    {loading ? "Placing Order..." : paymentMethod === "quote_request" ? "Submit Quote Request" : "Place Order"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
