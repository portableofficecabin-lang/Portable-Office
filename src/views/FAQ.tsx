"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { faqCategories } from "@/data/faqs";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Phone,
  MessageCircle,
  HelpCircle,
  Package,
  Paintbrush,
  Factory,
  Truck,
  ShieldCheck,
  CreditCard,
  Headphones,
  LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  HelpCircle,
  Package,
  Paintbrush,
  Factory,
  Truck,
  ShieldCheck,
  CreditCard,
  Headphones,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

export default function FAQPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 z-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block bg-white/15 backdrop-blur-sm text-white/90 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              Got Questions? We've Got Answers
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
              Everything you need to know about our portable cabins, prefab structures, delivery process, and after-sales support — all in one place.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link href="/contact">
                Get a Free Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container-custom max-w-4xl">
          {faqCategories.map((category, catIndex) => {
            const Icon = iconMap[category.icon];
            return (
              <motion.div
                key={category.id}
                custom={catIndex}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                className="mb-14 last:mb-0"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {category.title}
                  </h2>
                </div>

                <Accordion type="single" collapsible className="space-y-3">
                  {category.faqs.map((faq, faqIndex) => (
                    <AccordionItem
                      key={faqIndex}
                      value={`${category.id}-${faqIndex}`}
                      className="border border-border/60 rounded-xl px-5 bg-card/50 hover:bg-card transition-colors data-[state=open]:bg-card data-[state=open]:shadow-sm"
                    >
                      <AccordionTrigger className="text-left text-[15px] font-semibold text-foreground hover:no-underline py-4">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed pb-5">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
              Our team is ready to help. Reach out by phone, WhatsApp, or request a free quote — we'll get back to you quickly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link href="/contact">
                  Request a Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline-light" size="xl" asChild>
                <a href="tel:+919731897976">
                  <Phone className="mr-2 h-5 w-5" />
                  Call Now
                </a>
              </Button>
              <Button variant="outline-light" size="xl" asChild>
                <a
                  href="https://wa.me/919731897976?text=Hello!%20I%20have%20a%20question%20about%20your%20portable%20cabin%20solutions."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
