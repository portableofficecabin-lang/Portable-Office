"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Shield, ChevronRight, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

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

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <SEOHead
        title="Privacy Policy — Portable Office Cabin"
        description="Read the privacy policy of Portable Office Cabin. Learn how we collect, use, and protect your personal information when you use our website or services."
        keywords="privacy policy, data protection, portable cabin privacy, personal data policy India"
        canonicalUrl="https://portableofficecabin.com/privacy-policy"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16 md:py-20">
        <div className="container-custom text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Your Privacy <span className="text-accent">Matters to Us</span>
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              We are committed to protecting your personal information and being transparent about how we handle it.
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
            <span className="text-foreground font-medium">Privacy Policy</span>
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
            At Portable Office Cabin, we take your privacy seriously. This policy explains what personal information we collect, why we collect it, and how we keep it safe. By using our website or engaging with our services, you agree to the practices described here.
          </p>

          <Section title="1. Information We Collect" index={0}>
            <p>When you interact with us — whether you browse our website, request a quote, or place an order — we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Personal details:</strong> Your name, email address, phone number, and company name.</li>
              <li><strong>Project details:</strong> Site location, product requirements, and any specifications you share with us.</li>
              <li><strong>Payment information:</strong> Bank transfer details or payment references (we do not store full card numbers).</li>
              <li><strong>Technical data:</strong> Your IP address, browser type, device information, and pages visited on our website.</li>
              <li><strong>Communication records:</strong> Emails, WhatsApp messages, and call records related to your enquiry or order.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information" index={1}>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Respond to your enquiries and provide accurate quotations.</li>
              <li>Process and fulfil your orders, including manufacturing, delivery, and installation.</li>
              <li>Communicate updates about your order status, delivery schedules, and after-sales support.</li>
              <li>Improve our website, products, and customer service based on usage patterns.</li>
              <li>Send occasional updates about new products or offers — only if you have opted in.</li>
              <li>Comply with legal and regulatory requirements under Indian law.</li>
            </ul>
          </Section>

          <Section title="3. Cookies & Tracking" index={2}>
            <p>Our website uses cookies and similar tracking technologies to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Remember your preferences and improve your browsing experience.</li>
              <li>Analyse website traffic and user behaviour to make our site better.</li>
              <li>Support marketing campaigns through platforms like Google Ads and Meta.</li>
            </ul>
            <p className="mt-3">You can manage or disable cookies through your browser settings at any time. Please note that disabling cookies may affect certain features of our website.</p>
          </Section>

          <Section title="4. Data Protection & Security" index={3}>
            <p>We implement reasonable technical and organisational measures to protect your personal data against unauthorised access, alteration, or loss. These include:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Encrypted data transmission (SSL/TLS) across our website.</li>
              <li>Restricted access to personal data — only authorised team members can view it.</li>
              <li>Secure storage of payment references and order records.</li>
            </ul>
            <p className="mt-3">While we take every precaution, no method of data transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </Section>

          <Section title="5. Third-Party Sharing" index={4}>
            <p>We do not sell or rent your personal information to anyone. We may share limited data with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Logistics partners:</strong> To coordinate delivery and installation at your site.</li>
              <li><strong>Payment processors:</strong> To process transactions securely.</li>
              <li><strong>Analytics providers:</strong> Such as Google Analytics, to help us understand website usage.</li>
              <li><strong>Legal authorities:</strong> If required by law or to protect our rights.</li>
            </ul>
          </Section>

          <Section title="6. Your Rights" index={5}>
            <p>As a user, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Request access to the personal data we hold about you.</li>
              <li>Ask us to correct any inaccurate or incomplete information.</li>
              <li>Request deletion of your data, subject to legal and contractual obligations.</li>
              <li>Opt out of marketing communications at any time.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, simply reach out to us using the contact details below.</p>
          </Section>

          <Section title="7. Data Retention" index={6}>
            <p>We retain your personal information only for as long as it is needed to fulfil the purposes described in this policy — or as required by applicable Indian laws. Once the data is no longer necessary, we securely delete or anonymise it.</p>
          </Section>

          <Section title="8. Children's Privacy" index={7}>
            <p>Our website and services are not intended for individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.</p>
          </Section>

          <Section title="9. Changes to This Policy" index={8}>
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Any updates will be posted on this page with a revised "Last updated" date. We encourage you to review this policy periodically.</p>
          </Section>

          <Section title="10. Governing Law" index={9}>
            <p>This Privacy Policy is governed by the laws of India. Any disputes arising from or related to this policy shall be subject to the exclusive jurisdiction of the courts in Krishnagiri, Tamil Nadu, India.</p>
          </Section>

          <Section title="11. Contact Us" index={10}>
            <p>If you have any questions or concerns about our privacy practices, feel free to reach out:</p>
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
                <a href="mailto:admin@portableofficecabin.com" className="hover:text-accent">admin@portableofficecabin.com</a>
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
