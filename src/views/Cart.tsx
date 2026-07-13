"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/SEOHead";
import { computeTotals } from "@/lib/pricing/orderTotals";
import { formatINR, GST_PERCENT_LABEL } from "@/lib/pricing/gst";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, isLoading } = useCart();
  const { user } = useAuth();

  // The SAME function the checkout summary and the server-side Razorpay route use, so
  // the subtotal here is the identical integer the customer is eventually charged.
  // No pincode yet → shipping is null and is quoted at checkout, not guessed at here.
  const totals = useMemo(
    () => computeTotals({ items: items.map((i) => ({ productId: i.product_id, quantity: i.quantity, name: i.product?.name })) }),
    [items],
  );

  // Price every visible row from the SAME priced lines that make up the subtotal above —
  // never from a second source. A row with no line is one computeTotals refused (quote-only),
  // which is exactly what the server will refuse too.
  const lineByProduct = useMemo(
    () => new Map(totals.lines.map((line) => [line.productId, line])),
    [totals.lines],
  );

  if (!user) {
    return (
      <Layout>
        <SEOHead title="Cart | Portable Office Cabin" description="View the products in your cart." />
        <section className="section-padding">
          <div className="container-custom text-center max-w-lg">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-3">Please Sign In</h1>
            <p className="text-muted-foreground mb-6">You need to log in to view your cart.</p>
            <Button variant="accent" size="lg" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="Cart | Portable Office Cabin" description="View and manage the products in your cart." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-accent" /> Your Cart
          </h1>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              </div>
              <p className="text-muted-foreground">Loading your cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold mb-3">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Browse our products and add the ones you want to buy.</p>
              <Button variant="accent" asChild><Link href="/products">Browse Products</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => {
                const line = lineByProduct.get(item.product_id);
                return (
                <div key={item.id} className="bg-card rounded-xl border border-border/50 p-5 flex items-center gap-5">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.product?.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.product?.name || "Product"}</h3>
                    <p className="text-sm text-muted-foreground">{item.product?.category}</p>
                    {line ? (
                      <>
                        <p className="font-display font-bold text-accent mt-1">
                          {formatINR(line.unitPrice)}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            Inclusive of all taxes ({GST_PERCENT_LABEL} GST)
                          </span>
                        </p>
                        {/* Only worth saying when it is not simply the unit price again. */}
                        {line.quantity > 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatINR(line.lineTotal)} for {line.quantity}
                          </p>
                        )}
                      </>
                    ) : (
                      // Should not normally happen — CartContext refuses to add a quote-only
                      // product. Kept as a safety net for rows added before that guard existed.
                      <p className="text-sm text-muted-foreground mt-1">Quote only — please remove and request a quote</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} aria-label="Remove from cart" className="text-destructive hover:text-destructive/80 p-2">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                );
              })}

              <div className="bg-card rounded-xl border border-border/50 p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Subtotal</span>
                  <span className="font-display text-2xl font-bold text-accent">{formatINR(totals.itemsSubtotal)}</span>
                </div>
                {/* Transport is NOT guessed at here. It comes from the pincode zone table at
                    checkout, so the cart never implies a freight figure it cannot honour. */}
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Inclusive of all taxes ({GST_PERCENT_LABEL} GST). Transport and optional on-site
                  installation are calculated at checkout from your delivery pincode, and shown in
                  full before you pay.
                </p>
                <div className="flex gap-3">
                  <Button variant="accent" size="lg" className="flex-1" asChild>
                    <Link href="/checkout">
                      Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/products">Browse More Products</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
