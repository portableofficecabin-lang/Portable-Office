"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Phone,
  Zap,
  Lightbulb,
  Wind,
  Bath,
  Layers,
  ThermometerSun,
  PaintBucket,
  Wrench,
  Shield,
  Clock,
  IndianRupee,
  Headphones,
  Building2,
  LayoutGrid,
  Bolt,
  Container,
} from "lucide-react";

import projectsHeroBg from "@/assets/projects/projects-hero-bg.webp";
import portaCabin1 from "@/assets/projects/porta-cabin-project-1.jpg";
import portaCabin2 from "@/assets/projects/porta-cabin-project-2.jpg";
import portaCabin3 from "@/assets/projects/porta-cabin-project-3.jpg";
import container1 from "@/assets/projects/container-project-1.jpg";
import container2 from "@/assets/projects/container-project-2.jpg";
import prefab1 from "@/assets/projects/prefab-project-1.webp";
import prefab2 from "@/assets/projects/prefab-project-2.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// ── PORTA CABIN DATA ──
const portaCabinFeatures = [
  { icon: LayoutGrid, text: "Single & multi-cabin layouts" },
  { icon: Zap, text: "Integrated electrical & lighting" },
  { icon: Wind, text: "Ventilation & insulation" },
  { icon: Bath, text: "Optional toilet & pantry modules" },
];
const portaCabinApps = ["Site Offices", "Engineer Cabins", "Meeting Rooms", "Supervisor Rooms"];
const portaCabinImages = [
  { src: resolveImageUrl(portaCabin1), label: "Site Office Cabin" },
  { src: resolveImageUrl(portaCabin2), label: "Multi-Unit Complex" },
  { src: resolveImageUrl(portaCabin3), label: "Interior Workspace" },
];

// ── CONTAINER DATA ──
const containerFeatures = [
  { icon: ThermometerSun, text: "Insulated walls & ceiling" },
  { icon: PaintBucket, text: "False ceiling & premium flooring" },
  { icon: Bolt, text: "Electrical & plumbing integration" },
  { icon: Wind, text: "AC provision" },
];
const containerApps = ["Office Cabins", "Control Rooms", "Security Cabins", "Storage Units"];
const containerImages = [
  { src: resolveImageUrl(container1), label: "Container Office" },
  { src: resolveImageUrl(container2), label: "Security Cabin" },
];

// ── PREFAB DATA ──
const prefabFeatures = [
  { icon: Layers, text: "PUF / GI / ACP panel structures" },
  { icon: Building2, text: "Single-floor & multi-floor systems" },
  { icon: Zap, text: "Fast installation" },
  { icon: Wrench, text: "Low maintenance" },
];
const prefabApps = ["Labour Accommodation", "Office Complexes", "Canteens", "Dormitories"];
const prefabShowcase = [
  { src: resolveImageUrl(prefab1), title: "Multi-Story Labour Camp", desc: "Modular accommodation for 500+ workers with integrated facilities." },
  { src: resolveImageUrl(prefab2), title: "Prefab Canteen & Office", desc: "PUF panel structure with premium interiors, delivered in 20 days." },
];

// ── WHY CHOOSE US ──
const whyChoose = [
  { icon: Container, title: "Custom-Built Solutions", desc: "Every structure tailored to your exact project requirements." },
  { icon: Shield, title: "Premium Materials", desc: "GI, ACP, PUF panels — built to last decades, not months." },
  { icon: Clock, title: "On-Time Delivery", desc: "Precision manufacturing with 7–30 day turnarounds." },
  { icon: IndianRupee, title: "Competitive Pricing", desc: "Factory-direct pricing with no middlemen." },
  { icon: Headphones, title: "After-Sales Support", desc: "Dedicated team for warranty, repairs & modifications." },
];

export default function Projects() {
  return (
    <Layout>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${projectsHeroBg})` }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsla(222,47%,6%,0.88) 0%, hsla(222,35%,18%,0.82) 100%)" }} />
        {/* animated accent line */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-accent"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />

        <div className="container-custom relative z-10 py-24">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} custom={0} className="inline-block text-accent font-semibold tracking-widest uppercase text-sm mb-4">
              Portfolio
            </motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6">
              Our <span className="text-gradient">Projects</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-xl text-white/70 font-medium mb-4 max-w-2xl">
              Smart Portable & Prefab Spaces. Built for the Future.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="text-white/50 max-w-xl leading-relaxed">
              Innovation meets precision engineering. Every structure is custom-designed, factory-built with premium materials, and delivered on schedule — anywhere in Karnataka & Tamil Nadu.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ PORTA CABIN ═══════════════ */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <SectionHeader
            label="01"
            title="Porta Cabin & Site Office Projects"
            description="From single-unit site offices to linked multi-cabin complexes — engineered for comfort, durability, and rapid deployment on any terrain."
          />

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            {/* Features & Apps */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <h4 className="font-display font-bold text-lg text-foreground mb-6">Key Features</h4>
              <div className="space-y-4">
                {portaCabinFeatures.map((f, i) => (
                  <motion.div key={f.text} variants={fadeUp} custom={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{f.text}</span>
                  </motion.div>
                ))}
              </div>
              <h4 className="font-display font-bold text-lg text-foreground mt-10 mb-4">Applications</h4>
              <div className="flex flex-wrap gap-2">
                {portaCabinApps.map((a) => (
                  <span key={a} className="px-4 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground bg-muted/50">
                    {a}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Masonry grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="col-span-2 group relative overflow-hidden rounded-2xl"
              >
                <img src={portaCabinImages[0].src} alt={portaCabinImages[0].label} className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                  <span className="text-white font-display font-bold">{portaCabinImages[0].label}</span>
                </div>
              </motion.div>
              {portaCabinImages.slice(1).map((img, i) => (
                <motion.div
                  key={img.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img src={resolveImageUrl(img.src)} alt={img.label} className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white font-display font-semibold text-sm">{img.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTAINER OFFICE ═══════════════ */}
      <section className="section-padding bg-background relative overflow-hidden">
        {/* Subtle geometric accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-custom relative z-10">
          <SectionHeader
            label="02"
            title="Container Office & Modified Container Projects"
            description="Industrial-grade shipping containers transformed into fully functional workspaces — insulated, wired, and finished to premium standards."
          />

          {/* Bento-style grid layout */}
          <div className="grid lg:grid-cols-12 gap-5 mt-14">
            {/* Large featured image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7 group relative overflow-hidden rounded-3xl aspect-[4/3] lg:aspect-auto lg:min-h-[420px]"
            >
              <img src={containerImages[0].src} alt={containerImages[0].label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 md:p-8">
                <span className="inline-block px-3 py-1 rounded-full bg-accent/90 text-white text-xs font-bold tracking-wider uppercase mb-3">Featured</span>
                <h3 className="text-white font-display font-bold text-2xl md:text-3xl">{containerImages[0].label}</h3>
              </div>
            </motion.div>

            {/* Right column — stacked cards */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Second image */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="group relative overflow-hidden rounded-3xl aspect-video"
              >
                <img src={containerImages[1].src} alt={containerImages[1].label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <h3 className="text-white font-display font-bold text-xl">{containerImages[1].label}</h3>
                </div>
              </motion.div>

              {/* Applications tags card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="rounded-3xl bg-muted/50 border border-border/50 p-6 flex-1"
              >
                <h4 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-widest mb-4">Applications</h4>
                <div className="flex flex-wrap gap-2">
                  {containerApps.map((a) => (
                    <span key={a} className="px-4 py-2 rounded-full border border-border text-sm font-semibold text-foreground bg-background shadow-sm">
                      {a}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Features row — horizontal cards */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5"
          >
            {containerFeatures.map((f, i) => (
              <motion.div
                key={f.text}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl bg-muted/30 border border-border/50 p-5 hover:border-accent/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-foreground font-medium text-sm leading-snug">{f.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ PREFAB ═══════════════ */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <SectionHeader
            label="03"
            title="Prefab & Modular Buildings"
            description="Large-scale modular structures for labour camps, office complexes, and institutional facilities — assembled on-site in record time with minimal waste."
          />

          <div className="grid md:grid-cols-2 gap-12 mt-12 mb-16">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <h4 className="font-display font-bold text-lg text-foreground mb-6">Key Features</h4>
              <div className="space-y-4">
                {prefabFeatures.map((f, i) => (
                  <motion.div key={f.text} variants={fadeUp} custom={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{f.text}</span>
                  </motion.div>
                ))}
              </div>
              <h4 className="font-display font-bold text-lg text-foreground mt-10 mb-4">Applications</h4>
              <div className="flex flex-wrap gap-2">
                {prefabApps.map((a) => (
                  <span key={a} className="px-4 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground bg-muted/50">
                    {a}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Showcase cards */}
            <div className="space-y-6">
              {prefabShowcase.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img src={resolveImageUrl(item.src)} alt={item.title} className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105" />
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-6 px-6">
                     <h4 className="text-white font-display font-bold text-2xl mb-2 drop-shadow-lg">{item.title}</h4>
                     <p className="text-white/90 text-sm font-medium leading-relaxed drop-shadow-md bg-black/30 backdrop-blur-sm inline-block px-3 py-1.5 rounded-lg">{item.desc}</p>
                   </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY CHOOSE US ═══════════════ */}
      <section className="section-padding bg-muted/30">
        <div className="container-custom">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.span variants={fadeUp} custom={0} className="text-accent font-semibold tracking-widest uppercase text-sm">
              Our Promise
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-2">
              Why Choose Us
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6"
          >
            {whyChoose.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h4 className="font-display font-bold text-foreground mb-2">{item.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(32 95% 52% / 0.4) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container-custom relative z-10 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl sm:text-5xl font-bold text-white mb-4"
          >
            Let's Build Your <span className="text-gradient">Space</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-xl mx-auto mb-10"
          >
            Tell us your requirement and get a customized solution — designed, manufactured, and delivered to your site.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="hero" size="xl" asChild>
              <Link href="/contact">
                Get a Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline-light" size="xl" asChild>
              <a href="tel:+919731897976">
                <Phone className="mr-2 h-5 w-5" />
                Contact Us
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

// ── Reusable section header ──
function SectionHeader({ label, title, description, light = false }: { label: string; title: string; description: string; light?: boolean }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
      <motion.span variants={fadeUp} custom={0} className={`font-display font-bold text-5xl ${light ? "text-white/10" : "text-muted/80"}`}>
        {label}
      </motion.span>
      <motion.h2 variants={fadeUp} custom={1} className={`font-display text-3xl sm:text-4xl font-bold mt-2 mb-4 ${light ? "text-white" : "text-foreground"}`}>
        {title}
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className={`max-w-2xl leading-relaxed ${light ? "text-white/60" : "text-muted-foreground"}`}>
        {description}
      </motion.p>
    </motion.div>
  );
}
