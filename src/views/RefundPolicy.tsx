"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { RotateCcw, ChevronRight, Mail, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "@/components/ui/static-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

function Section({ title, children, index = 0 }: { title: string; children: React.ReactNode; index?: number }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      className="mb-10"
    >
      <h2 className="font-display text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </motion.div>
  );
}

export default function RefundPolicyPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16 md:py-20">
        <div className="container-custom text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <RotateCcw className="h-4 w-4" />
              Refund & Cancellation
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Refund & Cancellation <span className="text-accent">Policy</span>
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              We believe in transparency. Here's everything you need to know about cancellations, refunds, and what to expect.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-3 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Refund & Cancellation Policy</span>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <p className="text-muted-foreground leading-relaxed mb-10">
            <strong>Last updated:</strong> February 2026
          </p>
          <p className="text-muted-foreground leading-relaxed mb-10">
            At Portable Office Cabin, we understand that plans can change. This policy outlines the rules and conditions around order cancellations, refunds, and how we handle unexpected situations — so you know exactly where you stand.
          </p>

          {/* No Returns Policy Notice */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 mb-10"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-2">No Returns Accepted</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our products are <strong>manufactured to order</strong> — each unit is built against your confirmed order rather than taken from shelf stock. Because a unit is produced specifically for your order, <strong>we do not accept returns</strong> once it has been manufactured and delivered. This applies both to standard fixed-price products bought online and to customised or project builds. Please review all specifications carefully before confirming your order. See our{" "}
                  <Link href="/custom-product-policy" className="text-accent hover:underline">Custom Product Policy</Link> for full details. Damaged or defective units on delivery are handled separately, under the sections below.
                </p>
              </div>
            </div>
          </motion.div>

          <Section title="1. Order Cancellation Rules" index={0}>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Within 48 hours of order confirmation:</strong> You may cancel your order and receive a full refund of any advance payment, provided manufacturing has not yet commenced.</li>
              <li><strong>After 48 hours / manufacturing started:</strong> If production has already begun, the order cannot be fully cancelled. Cancellation charges will apply based on the extent of work completed and materials consumed.</li>
              <li><strong>Custom orders:</strong> Products built to your specific dimensions, design, or layout requirements are non-cancellable once manufacturing has started, as these units cannot be repurposed for other customers.</li>
            </ul>
          </Section>

          <Section title="2. Payment Conditions" index={1}>
            <p className="mb-3">
              There are two ways to order from us, and the payment terms differ. The terms that apply to you are
              the ones for the route you actually used.
            </p>
            <p className="font-semibold text-foreground mb-2">Standard products bought online</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Standard, fixed-price products can be purchased directly on this website. Payment is taken <strong>in full</strong> at checkout — there is no advance, token or part-payment option for online orders.</li>
              <li>We accept UPI, credit and debit cards, and net banking, processed securely by Razorpay. Card details are never stored on this website.</li>
              <li>The amount shown at checkout is the final amount payable. See our <Link href="/payment-policy" className="text-accent hover:underline">Payment Policy</Link>.</li>
            </ul>
            <p className="font-semibold text-foreground mb-2">Custom and made-to-order builds (quotation route)</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Custom units, project builds and rentals are not sold online. They begin with a written quotation.</li>
              <li>A minimum advance of 40–50% of the total order value is required before we begin manufacturing. The advance confirms your order and reserves your production slot.</li>
              <li>The remaining balance must be paid before or at the time of dispatch/delivery. Failure to pay the balance within the agreed timeline may result in the order being put on hold or cancelled, with applicable deductions.</li>
              <li>Payments on the quotation route are accepted by bank transfer (NEFT/RTGS/IMPS), UPI, cheque, or demand draft.</li>
            </ul>
          </Section>

          <Section title="3. Taxes & Transport Charges" index={2}>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Prices shown on product pages are inclusive of 18% GST</strong> — the price you see is the price of the item. GST is shown separately on your tax invoice.</li>
              <li>Transport is charged separately, based on the delivery pincode. It is calculated and shown to you at checkout before payment, and is confirmed in the written quotation on the custom route.</li>
              <li>Delivery is free within a 50 km radius of our facility. Beyond 50 km, transport is charged based on distance. Installation, where required, is an optional charge shown separately.</li>
              <li>Freight or transport charges already incurred on an order that has been dispatched or is in transit are <strong>not refundable</strong>.</li>
            </ul>
          </Section>

          <Section title="4. Refund Eligibility" index={3}>
            <p>You may be eligible for a refund in the following situations:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>The order is cancelled within 48 hours and no manufacturing has begun.</li>
              <li>We are unable to fulfil your order due to production constraints or material unavailability (full refund).</li>
              <li>The delivered product has significant defects that were not caused during unloading or installation at your site.</li>
            </ul>
          </Section>

          <Section title="5. Non-Refundable Scenarios" index={4}>
            <p>Refunds will not be provided in the following cases:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Cancellation of custom-built units after manufacturing has started.</li>
              <li>Freight or transport charges already incurred on an order that has been dispatched or is in transit.</li>
              <li>Delays caused by factors outside our control — such as natural disasters, transportation strikes, government restrictions, or site-related issues on your end.</li>
              <li>Damage caused during unloading, installation, or usage after delivery.</li>
              <li>Minor colour, texture, or dimensional variations that are within standard manufacturing tolerances.</li>
              <li>Rental deposits that have been utilised against rental charges or damages.</li>
            </ul>
          </Section>

          <Section title="6. Refund Processing Time" index={5}>
            <ul className="list-disc pl-6 space-y-2">
              <li>Once a refund is approved, it will be processed within <strong>10–15 business days</strong>.</li>
              <li>Refunds will be credited to the same bank account or payment method used for the original transaction.</li>
              <li>We will notify you via email or phone once the refund has been initiated.</li>
            </ul>
          </Section>

          <Section title="7. Damaged or Defective Products" index={6}>
            <p>If you receive a product that is damaged or has manufacturing defects:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Notify us within <strong>48 hours</strong> of delivery with photographs and a clear description of the issue.</li>
              <li>Our quality team will review the complaint and respond within 3 business days.</li>
              <li>If the damage occurred during transit and is confirmed by our team, we will either repair the unit at no cost, replace the affected components, or offer an appropriate compensation.</li>
              <li>Damage caused after delivery — during unloading, installation, or usage — is not covered under this policy.</li>
            </ul>
          </Section>

          <Section title="8. Rental Cancellations" index={7}>
            <ul className="list-disc pl-6 space-y-2">
              <li>Rental bookings can be cancelled up to 7 days before the scheduled delivery date for a full refund of the security deposit.</li>
              <li>Cancellations within 7 days of delivery may attract a partial deduction from the deposit.</li>
              <li>Early return of rented units will not result in a pro-rata refund of rental charges unless agreed in writing beforehand.</li>
            </ul>
          </Section>

          <Section title="9. How to Request a Cancellation or Refund" index={8}>
            <p>To initiate a cancellation or refund request, contact our customer-service team through any of the following channels:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Email us at <a href="mailto:sales@portableofficecabin.com" className="text-accent hover:underline">sales@portableofficecabin.com</a> with your order details (secondary: <a href="mailto:portableofficecabin@gmail.com" className="text-accent hover:underline">portableofficecabin@gmail.com</a>).</li>
              <li>Call us at <a href="tel:+919731897976" className="text-accent hover:underline">+91 97318 97976</a> or <a href="tel:+919019910931" className="text-accent hover:underline">+91 90199 10931</a>.</li>
              <li>Message us on <a href="https://wa.me/919731897976" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp (+91 97318 97976)</a> with your order reference number.</li>
              <li><strong>Business hours:</strong> Monday – Saturday, 7:00 AM – 10:00 PM; Sunday, 10:00 AM – 7:00 PM.</li>
              <li>We respond to every cancellation or refund request <strong>within 24 hours</strong>.</li>
            </ul>
            <p className="mt-3">Please include your order number, the reason for cancellation, and any supporting documents or photos.</p>
          </Section>

          <Section title="10. Dispute Resolution" index={9}>
            <p>If there is a disagreement regarding a refund or cancellation, both parties agree to resolve the matter through direct discussion first. If that does not lead to a resolution, the dispute will be referred to arbitration under the Arbitration and Conciliation Act, 1996. The seat of arbitration will be Krishnagiri, Tamil Nadu, India.</p>
          </Section>

          <Section title="11. Governing Law" index={10}>
            <p>This Refund & Cancellation Policy is governed by the laws of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the courts in Krishnagiri, Tamil Nadu.</p>
          </Section>

          {/* CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-muted/50 border border-border rounded-2xl p-8 mt-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Have Questions About a Refund?</h2>
            </div>
            <p className="text-muted-foreground mb-6">Our team is here to help. Reach out and we'll guide you through the process — we reply within 24 hours.</p>
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
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
