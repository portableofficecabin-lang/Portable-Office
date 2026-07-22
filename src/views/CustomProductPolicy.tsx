import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import {
  Ruler,
  ChevronRight,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function CustomProductPolicyPage() {
  return (
    <Layout>
      {/* Hero */}
      <PageHero
        size="compact"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
            Customised Products
          </span>
        }
        title={<>Customised Product <span className="text-accent">Policy</span></>}
        description="Almost everything we make is built to your specification, not taken off a shelf. Here is what that means for pricing, timelines and cancellations."
      />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-3 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Customised Product Policy</span>
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
            Portable Office Cabin sells in two ways. Our <strong>standard, fixed-configuration products</strong> can be bought and paid for online at a fixed, GST-inclusive price — <strong>this policy does not apply to those</strong>; they follow our{" "}
            <Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link>. This page covers our <strong>customised, bespoke and project builds</strong> — the portable cabins, container offices, prefab homes, labour colonies and modular structures that are <strong>manufactured to order</strong> against the size, layout and specification you choose. It explains how those customised orders are priced, produced and cancelled.
          </p>

          {/* Made to order notice */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Ruler className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-2">Manufactured to Order (Customised Builds)</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Customised units are <strong>manufactured to order</strong> to the customer's selected size, layout and specification. They are <strong>not stocked finished goods</strong> — each unit is built for one customer and generally cannot be repurposed for another. (Our standard, fixed-price products are also built after you order, but at a fixed published price and are bought and paid for online — see our{" "}
                  <Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link>.)
                </p>
              </div>
            </div>
          </div>

          <Section title="1. Pricing of Customised Products">
            <ul className="space-y-3">
              <Bullet>For a <strong>customised</strong> unit — where you choose a non-standard size, layout or fit-out — any price shown on a product page is an <strong>indicative starting price</strong>, because the unit is built to your specification. (A standard, fixed-price product instead shows a final, GST-inclusive price you can pay online.)</Bullet>
              <Bullet>The exact price of a customised unit depends on <strong>size, specification, fit-out and delivery location</strong>.</Bullet>
              <Bullet>For customised units the exact price is <strong>confirmed in a written quotation</strong>. Indicative figures shown for them are before GST, transport beyond the 50 km free zone, and optional installation.</Bullet>
            </ul>
            <p className="mt-3">
              See our{" "}
              <Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link>{" "}
              for what is and is not included in a price, and how payment is made.
            </p>
          </Section>

          <Section title="2. Every Customised Order Begins With a Quotation">
            <ul className="space-y-3">
              <Bullet>Customised, bespoke and project builds <strong>are not sold through the online checkout</strong> — a made-to-brief unit has no single fixed price, so it begins with a quotation instead. (Standard, fixed-price products <em>can</em> be bought and paid for online — see our <Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link>.)</Bullet>
              <Bullet><strong>Every customised order begins with a quotation.</strong> You send us a quote request with the configuration you want; we respond with a written quotation covering price, GST, transport and installation.</Bullet>
              <Bullet>A customised order is confirmed only when you approve that quotation and the advance payment is received.</Bullet>
            </ul>
          </Section>

          <Section title="3. Manufacturing & Delivery Timeline">
            <ul className="space-y-3">
              <Bullet><strong>Dispatch:</strong> typically <strong>7–15 working days</strong> after order confirmation and advance payment.</Bullet>
              <Bullet><strong>Transit:</strong> a further <strong>1–5 days</strong>, depending on your location.</Bullet>
              <Bullet>Timelines start only after the order is confirmed and the advance is received — not from the date of enquiry.</Bullet>
            </ul>
            <p className="mt-3">
              Full delivery coverage, transport charges and installation details are set out in our{" "}
              <Link href="/shipping" className="text-accent hover:underline">Shipping &amp; Delivery Policy</Link>.
            </p>
          </Section>

          {/* Cancellation / no returns */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Cancellation & Returns of Custom-Made Products</h2>
                <ul className="text-muted-foreground leading-relaxed space-y-3 mt-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <span>Cancellation is <strong>free within 48 hours</strong> of order confirmation — but only if manufacturing has not started.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <span>After that, <strong>charges apply based on the work completed</strong>. Custom-made products <strong>may not be cancelled without charge once manufacturing has begun</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <span>Custom-made products are <strong>not returnable once manufactured</strong>.</span>
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  The complete cancellation and refund rules — including how damaged or defective products are handled — are set out in our{" "}
                  <Link href="/refund-policy" className="text-accent hover:underline">Return, Refund &amp; Cancellation Policy</Link>.
                </p>
              </div>
            </div>
          </div>

          <Section title="5. Confirming Your Specification">
            <div className="bg-muted/50 border border-border rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    Because your unit is built exactly to the approved specification, it is the <strong>customer's responsibility to check and confirm all dimensions and specifications on the approved quotation and drawing</strong> before manufacturing begins.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Please review size, layout, door and window positions, fit-out and finishes carefully. Once you approve the quotation / drawing and manufacturing starts, changes may not be possible without additional charges.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="6. Related Policies">
            <ul className="space-y-3">
              <Bullet><Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link> — prices, GST, accepted payment methods and advance terms.</Bullet>
              <Bullet><Link href="/refund-policy" className="text-accent hover:underline">Return, Refund &amp; Cancellation Policy</Link> — cancellation windows, refunds and defective goods.</Bullet>
              <Bullet><Link href="/shipping" className="text-accent hover:underline">Shipping &amp; Delivery Policy</Link> — free delivery within 50 km, transport beyond 50 km, installation.</Bullet>
              <Bullet><Link href="/warranty" className="text-accent hover:underline">Warranty Policy</Link> — what is covered after your unit is delivered.</Bullet>
            </ul>
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
              Not sure which size or specification you need? Talk to us before you approve anything — we respond within 24 hours.
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
