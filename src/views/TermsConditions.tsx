"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { FileText, ChevronRight, Mail, Phone } from "lucide-react";
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

export default function TermsConditionsPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16 md:py-20">
        <div className="container-custom text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <FileText className="h-4 w-4" />
              Terms & Conditions
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Our Terms of <span className="text-accent">Service</span>
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              Please read these terms carefully before placing an order or using our services.
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
            <span className="text-foreground font-medium">Terms & Conditions</span>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <p className="text-muted-foreground leading-relaxed mb-10">
            <strong>Last updated:</strong> 17 July 2026
          </p>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Welcome to Portable Office Cabin. These Terms and Conditions govern your use of our website, products, and services. By placing an order, booking an appointment, or using any part of our website, you agree to be bound by the terms outlined below.
          </p>

          <Section title="1. Acceptance of Terms" index={0}>
            <p>By accessing our website or engaging with us through phone, email, or WhatsApp, you acknowledge that you have read, understood, and agree to these terms. If you do not agree with any part of these terms, please do not use our services.</p>
          </Section>

          <Section title="2. About Our Products & Services" index={1}>
            <p>Portable Office Cabin designs, manufactures, sells, and rents a wide range of portable structures, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Portable cabins and porta cabins</li>
              <li>Container offices and site office containers</li>
              <li>Prefab homes and luxury prefab villas</li>
              <li>Security guard cabins and toll booths</li>
              <li>Portable toilet blocks and bathroom units</li>
              <li>Customised modular structures for various industries</li>
            </ul>
            <p className="mt-3">Product images, dimensions, and specifications shown on our website are for reference purposes. Actual products may vary slightly depending on customisation, material availability, and manufacturing tolerances.</p>
          </Section>

          {/* Two purchase paths, described honestly. This section must always match how the site
              actually behaves: purchasable SKUs (isPurchasable() in the commerce catalog) show a
              fixed GST-inclusive price with Add to Cart and are paid in full online via Razorpay;
              everything else is quotation-only. Claiming "no payment is collected online" while the
              site runs an online checkout is a Merchant Center misrepresentation. */}
          <Section title="3. Pricing & Payment" index={2}>
            <p className="font-semibold text-foreground">Standard products purchased online</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Standard fixed-price products — those showing a price with an Add to Cart or Buy Now option — can be purchased directly on this website.</strong> The price displayed on the product page is the final, GST-inclusive price for the item.</li>
              <li><strong>Full payment for these products is processed online through Razorpay</strong>, our PCI-DSS compliant payment gateway. We accept UPI, credit and debit cards, and net banking through Razorpay.</li>
              <li><strong>GST, transport (calculated by delivery pincode) and optional charges such as installation are displayed at checkout before you pay.</strong> The amount charged is exactly the total shown at checkout — there are no post-payment price revisions for online orders.</li>
              <li>Online orders are confirmed automatically once Razorpay reports a successful payment, and appear in your account with a payment reference.</li>
            </ul>
            <p className="font-semibold text-foreground mt-4">Custom and quotation-only products</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Custom, project-specific and quotation-only products — those showing &ldquo;Request a Quote&rdquo; — require technical confirmation and a written quotation, and cannot be purchased directly online</strong> unless and until they are listed with a fixed price and an online checkout.</li>
              <li>For quotation orders, the quoted price is valid for 15 days from the date of issue unless stated otherwise, and <strong>the binding price is the one stated in that written quotation</strong>.</li>
              <li>Quotation orders may be paid via bank transfer (NEFT/RTGS/IMPS), UPI, cheque, or demand draft. A minimum advance (typically 40–50% of the order value) is required to begin manufacturing, with the balance cleared before or at dispatch/delivery.</li>
              <li>For quotation orders, GST and applicable taxes are charged as per prevailing government rates and shown separately on the tax invoice.</li>
            </ul>
          </Section>

          <Section title="4. Order Process & Confirmation" index={3}>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Online orders</strong> are confirmed automatically on successful full payment through Razorpay at checkout.</li>
              <li><strong>Quotation orders</strong> are confirmed after we receive your advance payment and a signed purchase order or written confirmation (via email or WhatsApp).</li>
              <li>Once confirmed, manufacturing will begin as per the agreed specifications and timeline.</li>
              <li>Any changes to the order after confirmation may result in revised pricing and extended delivery timelines.</li>
            </ul>
          </Section>

          <Section title="5. Order Cancellation" index={4}>
            <ul className="list-disc pl-6 space-y-2">
              <li>Orders can be cancelled within 48 hours of confirmation, provided manufacturing has not yet started. A full refund of the advance will be processed in this case.</li>
              <li>If manufacturing has already begun, cancellation charges will apply based on the work completed and materials consumed.</li>
              <li>Custom-built products made to your specific requirements are non-cancellable once production has started.</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property" index={5}>
            <p>All content on this website — including text, images, logos, product designs, and graphics — is the property of Portable Office Cabin and is protected under Indian intellectual property laws. You may not copy, reproduce, or distribute any content from this site without our prior written consent.</p>
          </Section>

          <Section title="7. Limitation of Liability" index={6}>
            <ul className="list-disc pl-6 space-y-2">
              <li>We make every effort to ensure the accuracy of information on our website. However, we do not guarantee that all content is error-free or up to date at all times.</li>
              <li>Portable Office Cabin shall not be held liable for any indirect, incidental, or consequential damages arising from the use of our products or services beyond the scope of our warranty.</li>
              <li>Our total liability for any claim shall not exceed the total amount paid by the customer for the specific product or service in question.</li>
            </ul>
          </Section>

          <Section title="8. Customer Responsibilities" index={7}>
            <p>As a customer, you are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Providing accurate site measurements, specifications, and project requirements.</li>
              <li>Ensuring the delivery site is accessible and prepared for unloading and installation.</li>
              <li>Obtaining any necessary local permits or approvals for the placement of portable structures.</li>
              <li>Inspecting the product upon delivery and reporting any concerns within 48 hours.</li>
            </ul>
          </Section>

          <Section title="9. Force Majeure" index={8}>
            <p>We shall not be held responsible for delays or failures caused by events beyond our reasonable control — including natural disasters, pandemics, government restrictions, strikes, transportation disruptions, or severe weather conditions.</p>
          </Section>

          <Section title="10. Dispute Resolution" index={9}>
            <p>In case of any dispute, both parties agree to first attempt resolution through direct discussion and mutual negotiation. If a resolution cannot be reached, the matter will be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Krishnagiri, Tamil Nadu, India.</p>
          </Section>

          <Section title="11. Governing Law" index={10}>
            <p>These Terms and Conditions are governed by and interpreted in accordance with the laws of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the courts located in Krishnagiri, Tamil Nadu.</p>
          </Section>

          <Section title="12. Changes to These Terms" index={11}>
            <p>We reserve the right to update or modify these Terms and Conditions at any time without prior notice. Changes will be effective immediately upon posting on this page. We encourage you to review this page regularly.</p>
          </Section>

          <Section title="13. Contact Us" index={12}>
            <p>If you have any questions about these terms, please contact us:</p>
            <div className="mt-4 space-y-3">
              <p className="font-semibold text-foreground">Portable Office Cabin</p>
              <p>Survey No. 222 Door No: 2/149-6 Road 1C, Kamandoddi, Tamil Nadu 635117</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <a href="tel:+919731897976" className="hover:text-accent">+91 9731897976</a>
                <span className="text-border">|</span>
                <a href="tel:+919019910931" className="hover:text-accent">+91 90199 10931</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <a href="mailto:sales@portableofficecabin.com" className="hover:text-accent">sales@portableofficecabin.com</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <a href="mailto:portableofficecabin@gmail.com" className="hover:text-accent">portableofficecabin@gmail.com</a>
              </div>
            </div>
          </Section>
        </div>
      </section>
    </Layout>
  );
}
