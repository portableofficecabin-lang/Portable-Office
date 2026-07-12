"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/SEOHead";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal, isLoading } = useCart();
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <SEOHead title="Quote List | Portable Office Cabin" description="View the products saved to your quote list." />
        <section className="section-padding">
          <div className="container-custom text-center max-w-lg">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-3">Please Sign In</h1>
            <p className="text-muted-foreground mb-6">You need to log in to view your quote list.</p>
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
      <SEOHead title="Quote List | Portable Office Cabin" description="View and manage the products on your quote list." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-accent" /> Your Quote List
          </h1>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              </div>
              <p className="text-muted-foreground">Loading your quote list...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold mb-3">Your quote list is empty</h2>
              <p className="text-muted-foreground mb-6">Browse our products and add the ones you want us to quote.</p>
              <Button variant="accent" asChild><Link href="/products">Browse Products</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-card rounded-xl border border-border/50 p-5 flex items-center gap-5">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.product?.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.product?.name || "Product"}</h3>
                    <p className="text-sm text-muted-foreground">{item.product?.category}</p>
                    {item.product?.price ? (
                      <p className="font-display font-bold text-accent mt-1">₹{item.product.price.toLocaleString("en-IN")}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Price on request</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80 p-2">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}

              <div className="bg-card rounded-xl border border-border/50 p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Indicative Subtotal</span>
                  <span className="font-display text-2xl font-bold text-accent">₹{getCartTotal().toLocaleString("en-IN")}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Indicative starting prices, exclusive of GST. Free delivery within 50 km of our facility; beyond 50 km transport is charged on distance. Installation is charged separately. Your final price is confirmed in your quotation.
                </p>
                <div className="flex gap-3">
                  <Button variant="accent" size="lg" className="flex-1" asChild>
                    <Link href="/checkout">
                      Continue to Quote Request <ArrowRight className="ml-2 h-4 w-4" />
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
