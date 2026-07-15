"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { PaymentMethods } from "@/components/PaymentMethods";
import { computeTotals } from "@/lib/pricing/orderTotals";
import { formatINR, GST_PERCENT_LABEL } from "@/lib/pricing/gst";
import { INSTALLATION, deliveryEstimate } from "@/data/shippingZones";
import { AlertCircle, CheckCircle2, Lock, Truck } from "lucide-react";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

// The subset of the Razorpay Checkout API we use. Typed locally because we deliberately
// do NOT install the razorpay npm package (no install step, no supply-chain dependency).
interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Load checkout.js once, on demand. Resolves false if it cannot load (offline, CSP, adblock). */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Policy links must be reachable from inside the purchase flow — GMC requires it. */
const POLICY_LINKS = [
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/shipping", label: "Shipping & Delivery" },
  { href: "/payment-policy", label: "Payment Policy" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

export default function CheckoutPage() {
  const { items } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wantsInstallation, setWantsInstallation] = useState(false);
  const [form, setForm] = useState({
    address_line1: "", address_line2: "", city: "", state: "", pincode: "", notes: "",
  });

  // The single source of order maths — the very same function the server re-runs before
  // charging. What is rendered below is exactly what Razorpay will be asked for.
  const totals = useMemo(
    () => computeTotals({
      items: items.map((i) => ({ productId: i.product_id, quantity: i.quantity, name: i.product?.name })),
      pincode: form.pincode,
      wantsInstallation,
    }),
    [items, form.pincode, wantsInstallation],
  );

  // The field is already digits-only and capped at 6 by handleChange, so "no zone" means
  // one of exactly two things: still half-typed, or a well-formed pincode we cannot serve.
  // They read very differently to a customer, so never show the same message for both.
  const pincode = form.pincode.trim();
  const pincodeEntered = pincode.length > 0;
  const pincodeIncomplete = pincodeEntered && pincode.length < 6;
  const pincodeUnserviceable = pincode.length === 6 && totals.zone === null;
  const eta = totals.zone ? deliveryEstimate(totals.zone) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Keep the pincode field to digits only, max 6 — it is the key to the whole freight table.
    setForm(prev => ({ ...prev, [name]: name === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value }));
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !totals.payable || loading) return;
    setLoading(true);

    try {
      // 1. The server recomputes the amount from OUR cart rows and creates the Razorpay
      //    order. We deliberately send no prices — only the pincode and the installation flag.
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: form.pincode,
          wantsInstallation,
          address_line1: form.address_line1,
          address_line2: form.address_line2,
          city: form.city,
          state: form.state,
          notes: form.notes,
        }),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || "Could not start the payment.");

      // 2. Razorpay Checkout.
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load the payment gateway. Please disable any ad blocker and try again.");
      }

      const razorpay = new window.Razorpay({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        order_id: created.razorpayOrderId,
        name: "Portable Office Cabin",
        description: `Order ${created.orderNumber}`,
        prefill: { email: user.email ?? "", contact: "" },
        notes: { order_number: created.orderNumber },
        theme: { color: "#0f172a" },
        // 3. Razorpay hands the browser a signature. It proves nothing until the SERVER
        //    verifies it — the order stays `pending` until /verify says otherwise.
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, orderId: created.orderId }),
            });
            const verified = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verified?.error || "Payment could not be verified.");

            toast({
              title: "Payment successful",
              description: `Order ${verified.orderNumber} is confirmed. We will be in touch with your dispatch schedule.`,
            });
            router.push("/my-account/orders");
          } catch (err) {
            toast({
              title: "Payment taken, confirmation pending",
              description: err instanceof Error ? err.message : "Please contact us with your payment reference.",
              variant: "destructive",
            });
            setLoading(false);
          }
        },
        modal: {
          // The customer closed the modal without paying. The order row stays `pending`.
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.on("payment.failed", (response) => {
        toast({
          title: "Payment failed",
          description: response?.error?.description || "Your payment was not completed. You have not been charged.",
          variant: "destructive",
        });
        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      toast({
        title: "Could not start payment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (!user) { router.push("/login"); return null; }
  if (items.length === 0) { router.push("/cart"); return null; }

  return (
    <Layout>
      <SEOHead title="Checkout | Portable Office Cabin" description="Complete your purchase securely." />
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">Checkout</h1>
          <form onSubmit={handlePay}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery address */}
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
                    <div className="sm:col-span-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        required
                        inputMode="numeric"
                        placeholder="6-digit pincode"
                        aria-describedby="pincode-help"
                        className="mt-1.5"
                      />

                      {/* Freight is resolved live from the pincode, so the customer sees the
                          real transport cost BEFORE paying — never a surprise at the end. */}
                      <div id="pincode-help" className="mt-2 text-sm">
                        {!pincodeEntered && (
                          <p className="text-muted-foreground">Enter a pincode to see delivery charges and estimated delivery time.</p>
                        )}
                        {pincodeIncomplete && (
                          <p className="text-muted-foreground flex items-start gap-1.5">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            Enter all 6 digits of your delivery pincode to see your transport charge
                            and delivery window. Payment cannot be taken until we know where the unit
                            is going.
                          </p>
                        )}
                        {pincodeUnserviceable && (
                          <p className="text-destructive flex items-start gap-1.5">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            We could not work out a transport charge for that pincode. Please check it,
                            or <Link href="/contact" className="underline font-semibold">contact us</Link> and
                            we will quote transport for your site.
                          </p>
                        )}
                        {totals.zone && eta && (
                          <p className="text-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                            <span>
                              <strong className="font-semibold">{totals.zone.name}</strong> —{" "}
                              {totals.zone.rate === 0 ? (
                                <span className="text-accent font-semibold">Free delivery (within 50 km)</span>
                              ) : (
                                <span>transport {formatINR(totals.zone.rate)}</span>
                              )}
                              . Estimated delivery {eta.min}–{eta.max} days from payment.
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Installation — a separate, optional line item. Never bundled into freight. */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="installation"
                      checked={wantsInstallation}
                      onCheckedChange={(checked) => setWantsInstallation(checked === true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="installation" className="text-base font-semibold cursor-pointer">
                        Add {INSTALLATION.label} — {formatINR(INSTALLATION.rate)}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{INSTALLATION.description}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Site access, preferred delivery window, contact person on site..." className="mt-1.5" rows={3} />
                </div>

                {/* The methods we genuinely accept, shown BEFORE the customer commits to pay.
                    Rendered from the shared component — the one and only list of payment
                    methods on this site — so the checkout can never drift out of step with
                    the footer, or with what the Razorpay gateway actually takes. */}
                <PaymentMethods variant="checkout" />
              </div>

              {/* Order summary */}
              <div>
                <div className="bg-card rounded-xl border border-border/50 p-6 sticky top-24">
                  <h2 className="font-display font-semibold text-lg mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-4">
                    {totals.lines.map(line => (
                      <div key={line.productId} className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground truncate">{line.name} × {line.quantity}</span>
                        <span className="font-medium shrink-0">{formatINR(line.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items (incl. {GST_PERCENT_LABEL} GST)</span>
                      <span className="font-medium">{formatINR(totals.itemsSubtotal)}</span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">
                        {totals.zone ? `Transport (${totals.zone.name})` : "Transport"}
                      </span>
                      <span className="font-medium shrink-0">
                        {totals.shipping === null
                          ? <span className="text-muted-foreground">Enter pincode</span>
                          : totals.shipping === 0
                            ? <span className="text-accent">Free (within 50 km)</span>
                            : formatINR(totals.shipping)}
                      </span>
                    </div>

                    {totals.installation > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Installation (optional)</span>
                        <span className="font-medium">{formatINR(totals.installation)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border mt-4 pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>TOTAL PAYABLE</span>
                      <span className="text-accent font-display">
                        {totals.shipping === null ? "—" : formatINR(totals.grandTotal)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      All prices include {GST_PERCENT_LABEL} GST. This is the final amount payable.
                    </p>
                    {/* These products are sold at full payment only. There is deliberately no
                        advance / token / part-payment option anywhere in this flow — say so,
                        so nobody arrives at the gateway expecting to pay a deposit. */}
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Full payment only — we do not take booking tokens or part payments on these
                      products.
                    </p>
                  </div>

                  {/* A quote-only product is in the cart (added before CartContext refused
                      them). It has no payable price, so say so plainly instead of leaving a
                      disabled "Pay" button with no explanation. The server refuses it too. */}
                  {totals.skipped.length > 0 && (
                    <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                      <p className="text-xs text-destructive leading-relaxed">
                        Your cart contains a made-to-order product that cannot be bought online.
                        Please <Link href="/cart" className="underline font-semibold">remove it from your cart</Link> and{" "}
                        <Link href="/contact" className="underline font-semibold">request a quote</Link> for it instead.
                      </p>
                    </div>
                  )}

                  {/* Override the accent variant's offset drop-shadow (0 10px 30px -10px …) with a
                      CENTERED glow. The default shadow is pushed 10px down, so on this dark summary
                      card the orange halo bunches under the button and reads as a misaligned layer.
                      Zero vertical offset → an even halo all around the pill.
                      The override is `!`-important: tailwind-merge can't dedupe `shadow-accent`
                      (it reads the theme's `accent` token as a shadow COLOUR, not a box-shadow), so
                      without `!` both shadows would apply and CSS source order would decide. */}
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full mt-6 !shadow-[0_0_24px_0_hsl(32_95%_52%/0.35)] hover:!shadow-[0_0_32px_2px_hsl(32_95%_52%/0.5)]"
                    disabled={loading || !totals.payable}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {loading
                      ? "Processing..."
                      : totals.skipped.length > 0
                        ? "Remove quote-only items to continue"
                        : totals.shipping === null
                          ? "Enter pincode to continue"
                          : `Pay ${formatINR(totals.grandTotal)} securely`}
                  </Button>

                  {/* Do NOT re-list the payment methods here. They are rendered once, from
                      <PaymentMethods />, in the left-hand column above. Two lists drift. */}
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Payment is processed securely by Razorpay. Your card and bank details are never
                    stored on this website.
                  </p>

                  {/* GMC requires the policies to be reachable from within the purchase flow. */}
                  <div className="border-t border-border mt-5 pt-4 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                    {POLICY_LINKS.map(link => (
                      <Link key={link.href} href={link.href} className="text-xs text-muted-foreground hover:text-accent underline underline-offset-2">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
