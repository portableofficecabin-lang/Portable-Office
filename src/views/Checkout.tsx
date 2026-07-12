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
import { FileText, Truck } from "lucide-react";

// There is no payment gateway on this site — nothing is ever charged here. Every
// submission is a quote request, so the payment_method written to `orders` is a
// constant (the admin/orders code already understands this value).
const PAYMENT_METHOD = "quote_request";

export default function CheckoutPage() {
  const { items, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      // Create the quote request (stored in the existing `orders` table)
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id,
        order_number: "",
        total_amount: getCartTotal(),
        payment_method: PAYMENT_METHOD,
        payment_status: "pending",
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
        notes: "Quote request submitted",
        created_by: user.id,
      });

      await clearCart();
      toast({
        title: "Quote request received",
        description: `Reference ${order.order_number}. Our team will contact you within 24 hours with final pricing.`,
      });
      router.push("/my-account/orders");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit quote request.", variant: "destructive" });
    }
    setLoading(false);
  };

  if (!user) { router.push("/login"); return null; }
  if (items.length === 0) { router.push("/cart"); return null; }

  return (
    <Layout>
      <SEOHead title="Request a Quote | Portable Office Cabin" description="Submit your quote request and our team will contact you with final pricing." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">Request a Quote</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery site */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-accent" /> Delivery Address
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

                {/* How it works — static, because there is nothing to choose:
                    this form takes no payment, it only raises a quote request. */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" /> How This Works
                  </h2>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">1.</span>
                      <span>This form submits a <strong className="text-foreground font-semibold">quote request</strong> — no payment is taken online.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">2.</span>
                      <span>Our team confirms the final pricing, including GST, transport and installation, and sends you a quotation.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">3.</span>
                      <span>Once you approve the quotation, payment is made by bank transfer (NEFT/RTGS/IMPS), UPI, cheque or demand draft.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">4.</span>
                      <span>A 40–50% advance is required before manufacturing begins.</span>
                    </li>
                  </ul>
                </div>

                {/* Notes */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <Label htmlFor="notes">Requirement Notes (Optional)</Label>
                  <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Any special requirements or customization requests..." className="mt-1.5" rows={3} />
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="bg-card rounded-xl border border-border/50 p-6 sticky top-24">
                  <h2 className="font-display font-semibold text-lg mb-4">Quote Summary</h2>
                  <div className="space-y-3 mb-4">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{item.product?.name} × {item.quantity}</span>
                        <span className="font-medium shrink-0">
                          {item.product?.price ? `₹${(item.product.price * item.quantity).toLocaleString("en-IN")}` : "Price on request"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Indicative Subtotal</span>
                      <span className="text-accent">₹{getCartTotal().toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Indicative starting prices, exclusive of GST. Free delivery within 50 km of our facility; beyond 50 km transport is charged on distance. Installation is charged separately. Your final price is confirmed in your quotation.
                    </p>
                  </div>
                  <Button type="submit" variant="accent" size="lg" className="w-full mt-6" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Quote Request"}
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
