import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import {
  CreditCard,
  ChevronRight,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentMethods } from "@/components/PaymentMethods";
import { GST_PERCENT_LABEL, formatINR } from "@/lib/pricing/gst";
import { INSTALLATION } from "@/data/shippingZones";

// Server Component (no "use client") — the full policy text is in the initial HTML
// so Google Merchant Center and crawlers can read it without executing JS.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground leading-relaxed">{children}</span>
    </li>
  );
}

export default function PaymentPolicyPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16 md:py-20">
        <div className="container-custom text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <CreditCard className="h-4 w-4" />
            Payment Policy
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            How Payment <span className="text-accent">Works</span>
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Standard products can be bought and paid for online, securely. Custom, made-to-order builds follow the quotation route — here is exactly what you pay and how you pay it.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-3 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Payment Policy</span>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <p className="text-muted-foreground leading-relaxed mb-10">
            <strong>Last updated:</strong> July 2026
          </p>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Portable Office Cabin sells in two ways. Our <strong>standard, fixed-price products</strong> can be bought
            and paid for directly on this website — the price you see is the price you pay. Our{" "}
            <strong>made-to-order, custom and project builds</strong> are not sold online: those follow the quotation
            route, where the price is agreed in writing first. This policy explains both, including what is included in
            a price, which payment methods we accept, and how invoicing works.
          </p>

          {/* Online payment IS accepted — this site now takes full payment for fixed-price products. */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-2">Online Payment Is Accepted</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For standard, fixed-price products you can complete your purchase on this website.{" "}
                  <strong>Full payment is taken at checkout</strong> by UPI, credit or debit card, or net banking,
                  processed securely by <strong>Razorpay</strong>. We never see or store your card or bank credentials.
                  Custom and made-to-order builds are quoted separately — see section 6 below.
                </p>
              </div>
            </div>
          </div>

          <PaymentMethods variant="checkout" className="mb-10" />

          <Section title="1. Prices Shown on This Website">
            <ul className="space-y-3">
              <Bullet>Prices displayed for standard, purchasable products are <strong>final and inclusive of {GST_PERCENT_LABEL} GST</strong>. The price on the product page is the price in the cart, at checkout and on the invoice.</Bullet>
              <Bullet>Transport is added by delivery zone and installation is an optional extra — both are shown to you at checkout, before you pay (see section 3).</Bullet>
              <Bullet>Products shown as <strong>&ldquo;Request a Quote&rdquo;</strong> are made-to-order or project builds and are not sold online. Any price shown against them is indicative, and the payable amount is confirmed in a written quotation.</Bullet>
            </ul>
          </Section>

          <Section title="2. GST Is Included in the Displayed Price">
            <ul className="space-y-3">
              <Bullet>Displayed product prices <strong>include {GST_PERCENT_LABEL} GST</strong>. There is no tax added on top at checkout.</Bullet>
              <Bullet>A <strong>GST tax invoice is issued for every order</strong>, showing the taxable value and the GST component separately.</Bullet>
              <Bullet>Our GSTIN is <span className="font-mono tracking-wide text-foreground">33FVKPK6238Q1ZT</span> — see section 7.</Bullet>
            </ul>
          </Section>

          <Section title="3. Delivery, Transport & Installation Charges">
            <ul className="space-y-3">
              <Bullet><strong>Free delivery within ~50 km</strong> of our facility (Zone 1) — this is genuinely honoured and no transport charge applies.</Bullet>
              <Bullet><strong>Beyond that</strong>, transport is charged by <strong>delivery zone</strong>, worked out from your pincode. The exact amount appears in your order total at checkout, before payment.</Bullet>
              <Bullet><strong>On-site installation is optional</strong> and charged separately at {formatINR(INSTALLATION.rate)} — it is never bundled into the transport charge. You choose whether to add it at checkout.</Bullet>
              <Bullet>Transport and installation charges also <strong>include {GST_PERCENT_LABEL} GST</strong>.</Bullet>
            </ul>
            <p className="mt-3">
              The full zone table, rates and delivery timelines are on our{" "}
              <Link href="/shipping" className="text-accent hover:underline">Shipping &amp; Delivery Policy</Link>.
            </p>
          </Section>

          <Section title="4. Accepted Payment Methods (Online Orders)">
            <p>At checkout, payment is processed securely by <strong>Razorpay</strong>. We accept:</p>
            <ul className="space-y-3 mt-3">
              <Bullet><strong>UPI</strong> — GPay, PhonePe, Paytm, BHIM and any other UPI app.</Bullet>
              <Bullet><strong>Credit &amp; debit cards</strong> — all major Indian and international cards.</Bullet>
              <Bullet><strong>Net banking</strong> — all major Indian banks.</Bullet>
            </ul>
            <p className="mt-3">
              Card and bank details are entered on Razorpay&rsquo;s secure, PCI-DSS compliant gateway. They are never
              stored on this website.
            </p>
          </Section>

          <Section title="5. Full Payment at Checkout">
            <ul className="space-y-3">
              <Bullet>Products bought online are sold on a <strong>full-payment basis</strong>. The complete amount — product, transport and installation if you selected it — is paid at checkout.</Bullet>
              <Bullet>There is <strong>no advance or token payment</strong> for online orders; you pay once, at the listed price, and the order is confirmed.</Bullet>
              <Bullet>Manufacturing and dispatch timelines begin only once the order is confirmed and payment has been received.</Bullet>
            </ul>
            <p className="mt-3">
              Cancellations, returns and refunds are governed by our{" "}
              <Link href="/refund-policy" className="text-accent hover:underline">Return, Refund &amp; Cancellation Policy</Link>.
            </p>
          </Section>

          <Section title="6. Custom & Made-to-Order Builds (Quotation Route)">
            <p>
              Customised units, bespoke sizes and project builds are <strong>not sold online</strong>. They follow our
              quotation process, and the terms below apply to those orders only:
            </p>
            <ul className="space-y-3 mt-3">
              <Bullet>The payable amount is confirmed in a <strong>written quotation</strong>. Nothing is binding until that quotation is issued and approved.</Bullet>
              <Bullet>A <strong>40–50% advance</strong> is required before manufacturing begins. The advance confirms your order and reserves your production slot.</Bullet>
              <Bullet>The <strong>balance is payable as set out in your quotation</strong> — the exact schedule is confirmed there, not on this website.</Bullet>
              <Bullet>For quoted orders we accept <strong>bank transfer (NEFT / RTGS / IMPS), UPI, cheque and demand draft</strong>. Our bank and UPI details are shared with you on the quotation and the invoice.</Bullet>
            </ul>
            <p className="mt-3">
              See also our{" "}
              <Link href="/custom-product-policy" className="text-accent hover:underline">Customised Product Policy</Link>{" "}
              and our{" "}
              <Link href="/refund-policy" className="text-accent hover:underline">Return, Refund &amp; Cancellation Policy</Link>.
            </p>
          </Section>

          <Section title="7. GST Tax Invoice">
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    A <strong>GST tax invoice is issued for every order</strong>, showing the taxable value and the GST charged separately.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>GSTIN:</strong> <span className="font-mono tracking-wide text-foreground">33FVKPK6238Q1ZT</span>
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Customer service */}
          <div className="bg-muted/50 border border-border rounded-2xl p-8 mt-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Customer Service</h2>
            </div>
            <p className="text-muted-foreground mb-5">
              Questions about pricing, GST, transport charges or payment terms? Talk to us before you confirm anything — we respond within 24 hours.
            </p>
            <ul className="text-muted-foreground leading-relaxed space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>
                  Email:{" "}
                  <a href="mailto:sales@portableofficecabin.com" className="text-accent hover:underline">sales@portableofficecabin.com</a>{" "}
                  (or{" "}
                  <a href="mailto:portableofficecabin@gmail.com" className="text-accent hover:underline">portableofficecabin@gmail.com</a>)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>
                  Phone:{" "}
                  <a href="tel:+919731897976" className="text-accent hover:underline">+91 97318 97976</a>{" "}
                  /{" "}
                  <a href="tel:+919019910931" className="text-accent hover:underline">+91 90199 10931</a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>
                  WhatsApp:{" "}
                  <a href="https://wa.me/919731897976" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">+91 97318 97976</a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>
                  Business hours: Monday – Saturday, 7:00 AM – 10:00 PM; Sunday, 10:00 AM – 7:00 PM. We respond to all enquiries within 24 hours.
                </span>
              </li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="accent" size="lg" asChild>
                <Link href="/contact">
                  <Phone className="mr-2 h-5 w-5" />
                  Contact Us
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://wa.me/919731897976" target="_blank" rel="noopener noreferrer">
                  WhatsApp Us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
