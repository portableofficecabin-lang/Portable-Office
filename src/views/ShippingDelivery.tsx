"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
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
import { motion } from "@/components/ui/static-motion";
import {
  SHIPPING_ZONES,
  deliveryEstimate,
  DISPATCH_WORKING_DAYS,
  INSTALLATION,
} from "@/data/shippingZones";
import { formatINR, GST_PERCENT_LABEL } from "@/lib/pricing/gst";

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
      {/* Hero */}
      <PageHero
        size="compact"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            Shipping & Delivery
          </span>
        }
        title={<>Hassle-Free Delivery, <span className="text-accent">Every Time</span></>}
        description="From our factory floor to your site — we handle everything. Here's exactly what to expect when you order from us."
      />

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
                <Bullet>Standard delivery is <strong>free within a 50 km radius of our facility</strong> (Zone 1) — genuinely free, with no hidden charges.</Bullet>
                <Bullet>Beyond 50 km, transport is charged <strong>by delivery zone</strong>. Enter your pincode at checkout and the exact transport charge is calculated and shown to you before you pay — see the zone table below.</Bullet>
                <Bullet>Unloading (crane or hydra) and on-site installation are <strong>optional and charged separately</strong> at {formatINR(INSTALLATION.rate)} — never bundled into the transport charge.</Bullet>
                <Bullet>Need it faster? Express delivery is available at a small additional cost.</Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={Clock} title="Delivery Timelines" index={1}>
              <ul className="space-y-3">
                <Bullet><strong>Manufacturing &amp; dispatch:</strong> {DISPATCH_WORKING_DAYS.min} – {DISPATCH_WORKING_DAYS.max} working days after order confirmation and payment. Larger or fully customised projects take longer — see Manufacturing &amp; Lead Time below.</Bullet>
                <Bullet><strong>Transit:</strong> additional, and it varies by zone — see the zone table below for the window that applies to your area.</Bullet>
                <Bullet><strong>Express delivery:</strong> available on request at additional cost — see the expedited shipping policy below.</Bullet>
                <Bullet>GPS shipment tracking is provided for every order so you always know where your cabin is.</Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={Package} title="Packaging & Handling" index={2}>
              <ul className="space-y-3">
                <Bullet>Every unit is securely packed using high-quality materials to prevent any transit damage.</Bullet>
                <Bullet>Weather-protected transport ensures your cabin arrives in perfect condition — rain or shine.</Bullet>
                <Bullet>
                  If a unit is damaged in transit, notify us within 48 hours of delivery with photographs. Once our team confirms the damage occurred in transit, we will repair the unit at no cost, replace the affected components, or agree an appropriate compensation, as set out in our{" "}
                  <Link href="/refund-policy" className="text-accent hover:underline">Refund &amp; Cancellation Policy</Link>.
                </Bullet>
              </ul>
            </InfoCard>

            <InfoCard icon={MapPin} title="Delivery Coverage" index={3}>
              <ul className="space-y-3">
                <Bullet>We deliver across Karnataka, Tamil Nadu, and neighbouring states, and to all other serviceable pincodes across India.</Bullet>
                <Bullet>Deliveries beyond the 50 km free zone carry a transport charge set by the delivery zone your pincode falls in.</Bullet>
                <Bullet>For remote or challenging site locations, our logistics team will coordinate the best route.</Bullet>
              </ul>
            </InfoCard>
          </div>

          {/* Delivery timelines & transport by zone.
              Every number below is read from src/data/shippingZones.ts — the same table the
              checkout charges from — so this page can never quote a rate or a timeline that
              disagrees with what the customer is actually billed. */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="mb-12"
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Truck className="h-6 w-6 text-accent" />
              Delivery Timelines &amp; Transport Charges by Zone
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
              Your delivery zone is worked out from your pincode at checkout, and the transport charge
              below is added to your order before you pay — there is nothing to discover later. All
              amounts include {GST_PERCENT_LABEL} GST.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-4 font-display font-bold text-foreground text-sm">Zone</th>
                    <th className="p-4 font-display font-bold text-foreground text-sm">Areas covered</th>
                    <th className="p-4 font-display font-bold text-foreground text-sm">Transport charge</th>
                    <th className="p-4 font-display font-bold text-foreground text-sm">
                      Estimated delivery (dispatch + transit)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SHIPPING_ZONES.map((zone) => {
                    const estimate = deliveryEstimate(zone);
                    return (
                      <tr key={zone.id} className="border-t border-border align-top">
                        <td className="p-4 font-semibold text-foreground text-sm">{zone.name}</td>
                        <td className="p-4 text-muted-foreground text-sm leading-relaxed">
                          {zone.description}
                        </td>
                        <td className="p-4 text-sm font-semibold whitespace-nowrap">
                          {zone.rate === 0 ? (
                            <span className="text-accent">Free (within ~50 km)</span>
                          ) : (
                            <span className="text-foreground">{formatINR(zone.rate)}</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">
                            {estimate.min} – {estimate.max} days
                          </span>
                          <span className="block text-xs mt-1">
                            {DISPATCH_WORKING_DAYS.min} – {DISPATCH_WORKING_DAYS.max} working days
                            dispatch + {zone.transitDaysMin} – {zone.transitDaysMax} days transit
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 mt-6">
              <Bullet>
                <strong>Dispatch:</strong> {DISPATCH_WORKING_DAYS.min} – {DISPATCH_WORKING_DAYS.max}{" "}
                working days after order confirmation and payment.
              </Bullet>
              <Bullet>
                <strong>Transit is additional</strong> and varies by zone — the "Estimated delivery"
                column above is dispatch plus transit for that zone.
              </Bullet>
              <Bullet>
                <strong>Installation is optional</strong> and charged separately at{" "}
                {formatINR(INSTALLATION.rate)} ({INSTALLATION.label.toLowerCase()}) — it is never
                bundled into the transport charge. You choose whether to add it at checkout.
              </Bullet>
              <Bullet>
                All transport and installation amounts shown here <strong>include {GST_PERCENT_LABEL} GST</strong>,
                as do the product prices on this website.
              </Bullet>
            </ul>
          </motion.div>

          {/* Charges & Taxes */}
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-sm text-muted-foreground leading-relaxed mb-12"
          >
            <strong className="text-foreground">Charges &amp; taxes:</strong> Product prices shown on this website
            are <strong>inclusive of {GST_PERCENT_LABEL} GST</strong>. Transport is charged by delivery zone as set out
            above (free within ~50 km), and unloading / on-site installation is an optional extra line item. Both are
            shown to you at checkout, before payment, and a GST tax invoice is issued for every order. Made-to-order and
            custom project builds are not sold online — for those, the binding price is the one stated in your written
            quotation.
          </motion.p>

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
              <Bullet><strong>Delivery window:</strong> 3 – 7 working days for dispatch and delivery (subject to ready stock or completed manufacturing).</Bullet>
              <Bullet><strong>Availability:</strong> On request only — must be confirmed at the time of order.</Bullet>
              <Bullet><strong>Charges:</strong> Quoted case-by-case based on distance beyond the 50 km free zone, unit size (Small / Medium / Large), and site accessibility (crane or hydra requirement).</Bullet>
              <Bullet><strong>Priority dispatch:</strong> Orders are moved to the front of the production and loading queue wherever feasible.</Bullet>
              <Bullet><strong>Dedicated transport:</strong> A dedicated truck or trailer is assigned instead of consolidated loads, ensuring direct point-to-point delivery.</Bullet>
              <Bullet><strong>Live GPS tracking</strong> and a single point-of-contact coordinator are provided throughout transit.</Bullet>
              <Bullet><strong>Important:</strong> Expedited shipping compresses dispatch and transit time only — it does not reduce the manufacturing lead time for custom-built units.</Bullet>
            </ul>
            <p className="text-sm text-muted-foreground italic">
              To request expedited shipping, mention "Express Delivery" while confirming your order via phone, WhatsApp, or email — our team will confirm the applicable surcharge in writing before invoicing.
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
              Manufacturing begins once your order is confirmed and payment is received — full payment at checkout for
              standard products bought online, or the agreed advance for custom, made-to-order projects. Here's a general
              idea of timelines:
            </p>
            <ul className="space-y-3">
              <Bullet><strong>Small projects</strong> (security cabins, guard booths): 7 – 14 working days.</Bullet>
              <Bullet><strong>Medium projects</strong> (site offices, portable toilets): 14 – 20 working days.</Bullet>
              <Bullet><strong>Large projects</strong> (prefab homes, container complexes): 20 – 30 working days.</Bullet>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 italic">
              * Actual timelines depend on customisation requirements and material availability. Transit is additional and
              varies by zone — see the zone table above.
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
              Our trained installation crew follows a clear three-step process to get your cabin ready for use — quickly and professionally. Installation is optional and charged separately at {formatINR(INSTALLATION.rate)}; you choose whether to add it at checkout, and it is never bundled into the transport charge.
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
              <Bullet>Delivery timelines begin only after we receive your order confirmation and payment.</Bullet>
              <Bullet>Installation scheduling depends on crew availability and your site readiness.</Bullet>
              <Bullet>Deliveries beyond the 50 km free zone carry a transport charge set by your delivery zone — it is calculated from your pincode and shown at checkout before you pay.</Bullet>
              <Bullet>Product prices include {GST_PERCENT_LABEL} GST. Unloading and on-site installation are an optional extra ({formatINR(INSTALLATION.rate)}), billed as a separate line item.</Bullet>
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
