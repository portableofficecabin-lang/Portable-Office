"use client";

import Link from "next/link";
import { CITY_PAGES } from "@/data/cityPages";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { motion } from "@/components/ui/static-motion";
import {
  MapPin,
  Truck,
  Clock,
  Phone,
  ShoppingCart,
  CheckCircle2,
  ChevronRight,
  Factory,
} from "lucide-react";
import {
  SHIPPING_ZONES,
  deliveryEstimate,
  DISPATCH_WORKING_DAYS,
} from "@/data/shippingZones";
import { formatINR } from "@/lib/pricing/gst";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

/**
 * The city list mirrors the `areaServed` set the site already declares in its
 * LocalBusiness / Product structured data (src/lib/seo/structured-data.ts) — the page and
 * the schema must claim the same coverage, never more.
 */
const MAJOR_CITIES = [
  { city: "Bengaluru", state: "Karnataka", note: "~40 km from our factory — fastest delivery and installation" },
  { city: "Hosur", state: "Tamil Nadu", note: "Factory belt — local-zone delivery" },
  { city: "Krishnagiri", state: "Tamil Nadu", note: "Factory belt — local-zone delivery" },
  { city: "Chennai", state: "Tamil Nadu", note: "Port city — container stock dispatched fast" },
  { city: "Coimbatore", state: "Tamil Nadu", note: "2–4 day transit from our factory" },
  { city: "Hyderabad", state: "Telangana", note: "South-zone transport" },
  { city: "Mumbai", state: "Maharashtra", note: "Pan-India zone delivery" },
  { city: "Pune", state: "Maharashtra", note: "Pan-India zone delivery" },
  { city: "Ahmedabad", state: "Gujarat", note: "Pan-India zone delivery" },
  { city: "Delhi NCR", state: "Delhi", note: "Pan-India zone delivery" },
  { city: "Kolkata", state: "West Bengal", note: "Pan-India zone delivery" },
  { city: "Kochi", state: "Kerala", note: "South-zone transport" },
];

/** Live local landing pages — each links to a real purchasable product page. */
const LOCAL_PAGES = [
  { name: "Koramangala, Bengaluru", href: "/products/shipping-container-in-kormangala" },
  { name: "Peenya Industrial Area, Bengaluru", href: "/products/shipping-container-in-peenya-industrial" },
  { name: "Narsapura KIADB, Kolar", href: "/products/shipping-container-in-narsapura-industrial" },
  { name: "Krishnagiri, Tamil Nadu", href: "/products/shipping-container-in-krishnagiri" },
  { name: "SIPCOT Industrial Estates, Tamil Nadu", href: "/products/shipping-container-in-sipcot" },
  { name: "Chennai, Tamil Nadu", href: "/products/shipping-container-in-chennai" },
  { name: "Bangalore Offers & Stock", href: "/promotions/shipping-container-in-bangalore" },
];

export default function CitiesWeServe() {
  return (
    <Layout>
      <PageHero
        eyebrow="Pan-India Delivery"
        title="Cities We Serve"
        description="Portable cabins, container offices and prefab structures manufactured near Bengaluru and delivered across India — with transport calculated upfront by your delivery pincode, before you pay."
      />

      <div className="container-custom py-14 lg:py-20 space-y-16 lg:space-y-20">
        {/* Factories + how coverage works */}
        <section aria-labelledby="coverage-heading">
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: Factory,
                title: "Made near Bengaluru",
                desc: "Our units are fabricated in-house at our Tamil Nadu factory on the Hosur–Krishnagiri belt, barely 40 km from Bengaluru, then transported to your site by road.",
              },
              {
                icon: Truck,
                title: "Every serviceable pincode",
                desc: "Enter your 6-digit pincode at checkout and the exact transport charge and delivery window are shown before payment — no surprises.",
              },
              {
                icon: Clock,
                title: `Dispatch in ${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`,
                desc: "Manufacturing and quality checks happen first; transit time then depends on your zone below.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="card-premium p-6 sm:p-8"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <h2 id={i === 0 ? "coverage-heading" : undefined} className="font-display text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Major cities grid */}
        <section aria-labelledby="cities-heading">
          <h2 id="cities-heading" className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Major Cities We Deliver To
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            These are our most-served cities — but delivery is not limited to this list. If your
            site has road access and a serviceable pincode, we can reach it.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MAJOR_CITIES.map((c, i) => (
              <motion.div
                key={c.city}
                custom={i % 4}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="bg-card border border-border/50 rounded-xl p-5 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                  <h3 className="font-semibold text-foreground">{c.city}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{c.state}</p>
                <p className="text-xs text-muted-foreground mt-2">{c.note}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Delivery zones — same source of truth as checkout and /shipping */}
        <section aria-labelledby="zones-heading">
          <h2 id="zones-heading" className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Delivery Zones & Transport Charges
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Transport is a flat zone rate, resolved from your delivery pincode — the same figures
            the checkout charges. Full details on the{" "}
            <Link href="/shipping" className="text-accent underline underline-offset-4 font-medium">
              Shipping &amp; Delivery
            </Link>{" "}
            page.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SHIPPING_ZONES.map((zone, i) => {
              const eta = deliveryEstimate(zone);
              return (
                <motion.div
                  key={zone.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp}
                  className="card-premium p-6"
                >
                  <h3 className="font-semibold text-foreground mb-2">{zone.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{zone.description}</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                      <span className="text-foreground font-medium">
                        {zone.rate === 0 ? "Free delivery" : `${formatINR(zone.rate)} transport`}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">
                        {eta.min}–{eta.max} days incl. dispatch
                      </span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Local landing pages */}
        <section aria-labelledby="local-heading">
          <h2 id="local-heading" className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Buy in Your Area
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Dedicated pages for the areas we serve most, each with a fixed-price container you can
            order online.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LOCAL_PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="flex items-center justify-between gap-3 bg-card border border-border/50 rounded-xl px-5 py-4 hover:border-accent/40 hover:bg-accent/5 transition-colors group"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <MapPin className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                  <span className="font-medium text-foreground truncate">{p.name}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* What's included everywhere */}
        <section aria-labelledby="included-heading" className="card-premium p-6 sm:p-10">
          <h2 id="included-heading" className="font-display text-2xl font-bold text-foreground mb-6">
            The Same Service, Every City
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "Fixed GST-inclusive product prices — identical online and on delivery",
              "Transport charge and delivery window shown before payment",
              "Secure online payment via UPI, cards and net banking",
              "Crane/unloading coordination guidance for your site",
              "Installation support available as an optional add-on",
              "Pan-India dispatch from our Tamil Nadu factory near Hosur",
            ].map((item) => (
              <p key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </section>

        {/* Local area guides — one landing page per location or local service (data-driven,
            src/data/cityPages.ts). Originally all industrial hubs; the list now also carries
            city-wide service pages such as villa construction in Bangalore, which is why the
            copy below says "locations and services" rather than "industrial hubs". */}
        {CITY_PAGES.length > 0 && (
          <section aria-label="Local area guides" className="mb-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 text-center">
              Local Area Guides
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-center">
              Detailed guides for the locations and services we cover most — what we deliver, sizes,
              options and answers for your area.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {CITY_PAGES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cities-we-serve/${c.slug}`}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-muted"
                >
                  {c.listTitle ?? c.metaTitle}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section aria-label="Order or contact us" className="text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to Order in Your City?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Browse fixed-price products and check your pincode at checkout — or talk to our team
            about a custom requirement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="accent" size="lg" asChild>
              <Link href="/products">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Browse Products
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={`tel:${primaryPhone.e164}`}>
                <Phone className="mr-2 h-5 w-5" />
                Call {primaryPhone.display}
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppGlyph className="mr-2 h-5 w-5" />
                WhatsApp Us
              </a>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
