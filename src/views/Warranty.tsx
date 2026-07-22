"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import {
  Shield,
  CheckCircle2,
  Phone,
  Wrench,
  Clock,
  ChevronRight,
  CalendarDays,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "@/components/ui/static-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground leading-relaxed">{children}</span>
    </li>
  );
}

export default function WarrantyPage() {
  const warrantyTiers = [
    { material: "MS Cabin", years: "5 Years", desc: "Mild steel structures — ideal for temporary site offices and guard booths." },
    { material: "GI Cabin", years: "15 Years", desc: "Galvanised iron cabins — excellent corrosion resistance for long-term use." },
    { material: "ACP Cabin", years: "20 Years", desc: "Aluminium composite panel cabins — sleek, durable, and weather-resistant." },
    { material: "PUF Panel Cabin", years: "25 Years", desc: "Polyurethane foam panel cabins — top-tier insulation and longevity." },
  ];

  return (
    <Layout>
      {/* Hero */}
      <PageHero
        size="compact"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Warranty & Support
          </span>
        }
        title={<>Built to Last. <span className="text-accent">Backed by Us.</span></>}
        description="Every cabin we build comes with a solid warranty and dedicated after-sales support — because your peace of mind matters."
      />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-3 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Warranty</span>
          </nav>
        </div>
      </section>

      {/* Structural Warranty */}
      <section className="section-padding">
        <div className="container-custom">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 flex items-center gap-3">
              <Shield className="h-7 w-7 text-accent" />
              Structural Warranty
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              Our cabins are engineered for durability. The structural warranty covers the primary framework, walls, and roofing against manufacturing defects.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {warrantyTiers.map((tier, i) => (
              <motion.div
                key={tier.material}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="card-premium p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-lg font-bold text-accent">{tier.years}</span>
                </div>
                <h3 className="font-display font-bold text-foreground mb-2">{tier.material}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tier.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Additional Warranty */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              className="card-premium p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Additional Coverage</h3>
              </div>
              <ul className="space-y-3">
                <Bullet><strong>Electrical components</strong> — 1-year warranty covering wiring, switches, and fixtures.</Bullet>
                <Bullet><strong>Paint & finish</strong> — 6-month warranty against peeling, fading, or bubbling under normal conditions.</Bullet>
                <Bullet>Warranty claims are processed within 7 working days of inspection.</Bullet>
              </ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
              className="card-premium p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Headphones className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">After-Sales Support</h3>
              </div>
              <ul className="space-y-3">
                <Bullet><strong>Customer support 7 days a week</strong> — reach us by phone, email, or WhatsApp, Mon-Sat 7:00 AM - 10:00 PM and Sunday 10:00 AM - 7:00 PM.</Bullet>
                <Bullet><strong>On-site maintenance</strong> — our service team can visit your location for repairs and upkeep.</Bullet>
                <Bullet><strong>Genuine spare parts</strong> — replacement parts are readily available and competitively priced.</Bullet>
              </ul>
            </motion.div>
          </div>

          {/* What's Not Covered */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-muted/50 border border-border rounded-2xl p-8 mb-12"
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Good to Know</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our warranty covers defects in materials and workmanship. To keep things transparent, here are a few things that fall outside warranty coverage:
            </p>
            <ul className="space-y-3">
              <Bullet>Damage caused by natural disasters, accidents, or misuse.</Bullet>
              <Bullet>Normal wear and tear over time.</Bullet>
              <Bullet>Modifications or alterations made without our prior approval.</Bullet>
              <Bullet>Issues arising from improper installation not performed by our team.</Bullet>
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-accent/5 border border-accent/20 rounded-2xl p-8 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">Have a Warranty Question?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Our team is happy to help with any warranty enquiries. Reach out and we'll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" asChild>
                <Link href="/contact">
                  <Phone className="mr-2 h-5 w-5" />
                  Contact Us
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shipping">
                  <Wrench className="mr-2 h-5 w-5" />
                  View Shipping & Delivery
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
