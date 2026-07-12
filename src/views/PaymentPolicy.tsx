import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import {
  CreditCard,
  ChevronRight,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Receipt,
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
            No payment is taken through this website. Every order is confirmed with a written quotation first — here is exactly what you pay and how you pay it.
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
            Portable Office Cabin manufactures to order. Prices shown on this website are indicative starting prices — the amount you actually pay is confirmed in a written quotation before your order is confirmed. This policy explains what is and is not included in a price, which payment methods we accept, and how invoicing works.
          </p>

          {/* No online payment notice */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-2">No Payment Is Collected on This Website</h2>
                <p className="text-muted-foreground leading-relaxed">
                  This website does not process payments. <strong>We do not accept online card payment</strong>, and there is no checkout or payment gateway here. Everything you add to your list is a <strong>quote request</strong> — our team responds with a written quotation, and payment is made directly to us by bank transfer, UPI, cheque or demand draft once you approve it.
                </p>
              </div>
            </div>
          </div>

          <Section title="1. Prices Shown on This Website">
            <ul className="space-y-3">
              <Bullet>All prices displayed on the website are <strong>indicative starting prices</strong> and are <strong>exclusive of GST</strong>.</Bullet>
              <Bullet>A displayed price is a starting point for a standard configuration. The final price depends on size, specification, fit-out and delivery location.</Bullet>
              <Bullet>The <strong>final payable amount is confirmed in a written quotation</strong> before any order is confirmed. Nothing is binding until that quotation is issued and approved.</Bullet>
            </ul>
          </Section>

          <Section title="2. GST Is Charged Extra">
            <ul className="space-y-3">
              <Bullet>GST is <strong>not included</strong> in the prices displayed on this website.</Bullet>
              <Bullet>GST is charged <strong>extra at the applicable rate</strong> and is shown separately on your tax invoice.</Bullet>
              <Bullet>The GST amount applicable to your order is set out in your written quotation.</Bullet>
            </ul>
          </Section>

          <Section title="3. Delivery, Transport & Installation Charges">
            <ul className="space-y-3">
              <Bullet><strong>Free delivery within 50 km</strong> of our facility — this is genuinely honoured and no transport charge applies.</Bullet>
              <Bullet><strong>Beyond 50 km</strong>, transport / freight is charged based on distance. The applicable amount is quoted to you in writing before you confirm.</Bullet>
              <Bullet><strong>Installation</strong>, if required, is charged separately and is confirmed in the quotation.</Bullet>
            </ul>
            <p className="mt-3">
              For full details of delivery coverage and timelines, see our{" "}
              <Link href="/shipping" className="text-accent hover:underline">Shipping &amp; Delivery Policy</Link>.
            </p>
          </Section>

          <Section title="4. Accepted Payment Methods">
            <p>We accept payment through the following methods only:</p>
            <ul className="space-y-3 mt-3">
              <Bullet><strong>Bank transfer</strong> — NEFT, RTGS or IMPS.</Bullet>
              <Bullet><strong>UPI</strong>.</Bullet>
              <Bullet><strong>Cheque</strong>.</Bullet>
              <Bullet><strong>Demand draft</strong>.</Bullet>
            </ul>
            <p className="mt-3">
              We <strong>do not accept online card payment on this website</strong>, and no payment is taken through the website. Our bank / UPI details are shared with you on the quotation and the invoice.
            </p>
          </Section>

          <Section title="5. Advance Payment & Balance">
            <ul className="space-y-3">
              <Bullet>A <strong>40–50% advance</strong> is required before manufacturing begins. The advance confirms your order and reserves your production slot.</Bullet>
              <Bullet>The <strong>balance is payable as set out in your quotation</strong>. The exact payment schedule is confirmed in that quotation — it is not fixed on this website.</Bullet>
              <Bullet>Manufacturing timelines begin only after the order is confirmed and the advance is received.</Bullet>
            </ul>
            <p className="mt-3">
              Cancellation and refund rules that apply to the advance are set out in our{" "}
              <Link href="/refund-policy" className="text-accent hover:underline">Return, Refund &amp; Cancellation Policy</Link>.
            </p>
          </Section>

          <Section title="6. GST Tax Invoice">
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
