"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import {
  Truck,
  Clock,
  Package,
  Shield,
  MapPin,
  CheckCircle2,
  CalendarDays,
  Phone,
  Wrench,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

function InfoCard({
  icon: Icon,
  title,
  children,
  index = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      className="card-premium p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
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

export default function ShippingDeliveryPage() {
  return (
    <Layout>
      <SEOHead
        title="Delivery & Shipping Policy — Portable Office Cabin"
        description="Read the delivery and shipping policy of Portable Office Cabin. Covers manufacturing lead times, dispatch, transportation, delivery timelines, inspection, and installation."
        keywords="delivery policy, shipping policy, portable cabin delivery, prefab delivery timeline, cabin installation policy India"
        canonicalUrl="https://portableofficecabin.com/shipping"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16 md:py-20">
        <div className="container-custom text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Truck className="h-4 w-4" />
              Shipping & Delivery
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Hassle-Free Delivery, <span className="text-accent">Every Time</span>
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              From our factory floor to your site — we handle everything. Here's exactly what to expect when you order from us.
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
            <span className="text-foreground font-medium">Shipping & Delivery</span>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding">
        <div className="container-custom">
          {/* Delivery Options */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <InfoCard icon={Truck} title="Delivery Options" index={0}>
              <ul className="space-y-3">
                <Bullet>Free standard delivery within a 50 km radius of our facility — no hidden charges.</Bullet>
                <Bullet>Need it faster? Express delivery is available at a small additional cost.</Bullet>
                <Bullet>Professional on-site installation can be arranged upon request.</Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={Clock} title="Delivery Timelines" index={1}>
              <ul className="space-y-3">
                <Bullet><strong>Standard delivery:</strong> 7 – 14 working days after dispatch.</Bullet>
                <Bullet><strong>Express delivery:</strong> 3 – 7 working days after dispatch.</Bullet>
                <Bullet>GPS shipment tracking is provided for every order so you always know where your cabin is.</Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={Package} title="Packaging & Handling" index={2}>
              <ul className="space-y-3">
                <Bullet>Every unit is securely packed using high-quality materials to prevent any transit damage.</Bullet>
                <Bullet>Weather-protected transport ensures your cabin arrives in perfect condition — rain or shine.</Bullet>
                <Bullet>Our damage-free guarantee means any item damaged during shipping is replaced or fully refunded.</Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={MapPin} title="Delivery Coverage" index={3}>
              <ul className="space-y-3">
                <Bullet>We deliver across Karnataka, Tamil Nadu, and neighbouring states.</Bullet>
                <Bullet>Deliveries beyond the 50 km free zone may carry a nominal transport surcharge based on distance.</Bullet>
                <Bullet>For remote or challenging site locations, our logistics team will coordinate the best route.</Bullet>
              </ul>
            </InfoCard>
          </div>

          {/* Expedited Shipping Policy */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-2xl p-8 mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Expedited (Express) Shipping Policy</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-5">
              Need your cabin or container sooner than the standard timeline? We offer an optional Expedited Shipping service for urgent project requirements.
            </p>
            <ul className="space-y-3 mb-5">
              <Bullet><strong>Delivery window:</strong> 3 – 7 working days from dispatch (subject to ready stock or completed manufacturing).</Bullet>
              <Bullet><strong>Availability:</strong> On request only — must be confirmed at the time of order.</Bullet>
              <Bullet><strong>Charges:</strong> Quoted case-by-case based on distance beyond the 50 km free zone, unit size (Small / Medium / Large), and site accessibility (crane or hydra requirement).</Bullet>
              <Bullet><strong>Priority dispatch:</strong> Orders are moved to the front of the production and loading queue wherever feasible.</Bullet>
              <Bullet><strong>Dedicated transport:</strong> A dedicated truck or trailer is assigned instead of consolidated loads, ensuring direct point-to-point delivery.</Bullet>
              <Bullet><strong>Live GPS tracking</strong> and a single point-of-contact coordinator are provided throughout transit.</Bullet>
              <Bullet><strong>Important:</strong> Expedited shipping compresses dispatch and transit time only — it does not reduce the manufacturing lead time for custom-built units.</Bullet>
            </ul>
            <p className="text-sm text-muted-foreground italic">
              To request expedited shipping, mention "Express Delivery" while confirming your order via phone, WhatsApp, or email — our team will share the applicable surcharge before invoicing.
            </p>
          </motion.div>



          {/* Manufacturing & Lead Time */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-accent/5 border border-accent/20 rounded-2xl p-8 mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Manufacturing & Lead Time</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Once your order is confirmed, manufacturing begins immediately. Here's a general idea of timelines:
            </p>
            <ul className="space-y-3">
              <Bullet><strong>Small projects</strong> (security cabins, guard booths): 7 – 14 working days.</Bullet>
              <Bullet><strong>Medium projects</strong> (site offices, portable toilets): 14 – 20 working days.</Bullet>
              <Bullet><strong>Large projects</strong> (prefab homes, container complexes): 20 – 30 working days.</Bullet>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 italic">
              * Actual timelines depend on customisation requirements and material availability.
            </p>
          </motion.div>

          {/* Installation Timeline */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Wrench className="h-6 w-6 text-accent" />
              Installation Process
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Our trained installation crew follows a clear three-step process to get your cabin ready for use — quickly and professionally.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              {[
                {
                  step: "01",
                  title: "Site Preparation",
                  time: "1 – 2 days",
                  desc: "We assess the ground, level the surface, and prepare the foundation for a stable setup.",
                },
                {
                  step: "02",
                  title: "Delivery & Assembly",
                  time: "1 day",
                  desc: "The cabin is transported, positioned using a crane or trailer, and assembled on-site.",
                },
                {
                  step: "03",
                  title: "Final Inspection",
                  time: "Same day",
                  desc: "We perform a complete quality check — electrical, plumbing, doors, windows — before handover.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="card-premium p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <span className="font-display text-xl font-bold text-accent">{item.step}</span>
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-accent font-semibold mb-3">{item.time}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Before You Order */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="bg-muted/50 border border-border rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Before You Place an Order</h2>
            </div>
            <ul className="space-y-3 mb-6">
              <Bullet>Please confirm all product details, dimensions, and customisations before placing your order.</Bullet>
              <Bullet>You can confirm your order through a phone call, email, WhatsApp, or by booking an appointment.</Bullet>
              <Bullet>Delivery timelines begin only after we receive your order confirmation.</Bullet>
              <Bullet>Installation scheduling depends on crew availability and your site readiness.</Bullet>
              <Bullet>Deliveries outside the 50 km free zone may have additional transport charges.</Bullet>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="accent" size="lg" asChild>
                <Link href="/contact">
                  <Phone className="mr-2 h-5 w-5" />
                  Get in Touch
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/book-appointment">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Book an Appointment
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
