"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
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
} from "lucide-react";

const faqCategories = [
  {
    id: "general",
    title: "General Questions",
    icon: HelpCircle,
    faqs: [
      {
        q: "What does Portable Office Cabin manufacture?",
        a: "We design and manufacture a wide range of portable structures — from site office cabins, container offices, and security guard cabins to prefab homes, portable toilets, and luxury villas. Whether you need a compact guard room or a full-scale modular office, we've got you covered.",
      },
      {
        q: "Where are your manufacturing facilities located?",
        a: "Our production units are based in Hosur (Tamil Nadu) and Bangalore (Karnataka). This central location allows us to serve clients across South India quickly, and we regularly ship structures to other parts of the country as well.",
      },
      {
        q: "Which areas do you serve?",
        a: "We primarily serve clients across India, with a strong presence in Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, and Kerala. For large orders, we also deliver to other states. Just get in touch and we'll work out the logistics.",
      },
    ],
  },
  {
    id: "products",
    title: "Products & Customization",
    icon: Package,
    faqs: [
      {
        q: "Can I customize the size and layout of my cabin?",
        a: "Absolutely. Every project is different, and we understand that. You can choose the dimensions, room layout, number of doors and windows, electrical points, and even the exterior finish. Our design team will work with you to make sure the final product fits your exact requirements.",
      },
      {
        q: "What materials do you use for construction?",
        a: "We use high-quality materials including Mild Steel (MS), Galvanized Iron (GI), Aluminium Composite Panels (ACP), and PUF (Polyurethane Foam) insulated panels. The choice of material depends on your budget, climate conditions, and how long you need the structure to last.",
      },
      {
        q: "Are your cabins suitable for permanent use?",
        a: "Yes, many of our structures — especially prefab homes and luxury villas — are built to last for decades. With proper maintenance, they perform just as well as conventional buildings, often at a fraction of the cost and construction time.",
      },
    ],
  },
  {
    id: "design",
    title: "Design & Specifications",
    icon: Paintbrush,
    faqs: [
      {
        q: "Do you provide design consultation before manufacturing?",
        a: "Yes, we offer free design consultations. Our team will visit your site (or discuss remotely), understand your needs, and share detailed layout drawings and 3D visuals before we begin production. No surprises — you'll know exactly what you're getting.",
      },
      {
        q: "Can I add features like AC, plumbing, or insulation?",
        a: "Of course. We can integrate air conditioning provisions, full plumbing for toilets and kitchens, thermal insulation, fire-resistant panels, and even solar panel mounts. Just let us know during the design phase, and we'll build it in.",
      },
    ],
  },
  {
    id: "manufacturing",
    title: "Manufacturing & Delivery",
    icon: Factory,
    faqs: [
      {
        q: "How long does it take to manufacture a cabin?",
        a: "For standard models, production typically takes 7 to 15 working days. Custom or larger projects — like multi-room offices or prefab homes — may take 15 to 30 days depending on the complexity. We'll give you a clear timeline before you confirm your order.",
      },
      {
        q: "Can I visit your factory before placing an order?",
        a: "You're welcome to visit our manufacturing units in Hosur or Bangalore anytime. Seeing our production process firsthand gives you a better sense of the quality and craftsmanship we put into every unit. Just book an appointment and we'll arrange everything.",
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping & Installation",
    icon: Truck,
    faqs: [
      {
        q: "Do you handle delivery and installation?",
        a: "Yes, we take care of everything — from loading and transport to on-site placement and installation. Our experienced crew will set up the structure, connect basic utilities, and make sure everything is in order before handing it over.",
      },
      {
        q: "Is delivery free?",
        a: "We offer free delivery within a 50 km radius of our facility. For locations beyond that, a nominal transport charge applies based on distance and the size of the structure. We'll always share the delivery cost upfront — no hidden charges.",
      },
      {
        q: "Can the cabin be relocated later?",
        a: "That's one of the biggest advantages of portable cabins. Most of our structures are designed to be dismantled and reassembled at a new location. Whether you're moving a site office or shifting a guard cabin, we can help with the relocation.",
      },
    ],
  },
  {
    id: "warranty",
    title: "Warranty & Support",
    icon: ShieldCheck,
    faqs: [
      {
        q: "What kind of warranty do you offer?",
        a: "Our structural warranty depends on the material used — 5 years for MS, 15 years for GI, 20 years for ACP, and 25 years for PUF panel structures. Electrical fittings are covered for 1 year, and paint/finish work for 6 months. Full details are shared with every order.",
      },
      {
        q: "What does the warranty cover?",
        a: "The structural warranty covers defects in materials and workmanship — things like panel warping, welding failures, or leaks caused by manufacturing issues. Normal wear and tear, misuse, or damage from natural disasters aren't covered, but we're always here to help with repairs.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Payment",
    icon: CreditCard,
    faqs: [
      {
        q: "How is pricing determined?",
        a: "Pricing depends on the type of structure, size, materials, and any custom features you need. We provide detailed, transparent quotes — no vague estimates. Once you share your requirements, we'll send a clear breakdown so you know exactly what you're paying for.",
      },
      {
        q: "What are your payment terms?",
        a: "We typically require a 50% advance to begin production, with the remaining 50% due before delivery. For larger projects, we can discuss milestone-based payment plans. We accept bank transfers, UPI, and cheque payments.",
      },
    ],
  },
  {
    id: "after-sales",
    title: "After-Sales Service",
    icon: Headphones,
    faqs: [
      {
        q: "Do you offer maintenance or repair services after delivery?",
        a: "Yes. We provide ongoing maintenance support for all our structures. Whether it's a minor repair, a fresh coat of paint, or replacement of fittings, our service team is just a call away. We also offer annual maintenance contracts for businesses with multiple units.",
      },
      {
        q: "How do I reach your support team?",
        a: "You can call us, send a WhatsApp message, or email us at admin@portableofficecabin.com. Our team typically responds within a few hours on working days. For urgent issues, calling is always the fastest option.",
      },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqCategories.flatMap((cat) =>
    cat.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    }))
  ),
};

export default function FAQPage() {
  return (
    <Layout>
      <SEOHead
        title="FAQ | Portable Office Cabin — Common Questions Answered"
        description="Find answers to frequently asked questions about portable cabins, container offices, prefab homes, customization, delivery, warranty, and pricing from Portable Office Cabin."
        keywords="portable cabin FAQ, prefab home questions, container office delivery, portable cabin warranty, modular building pricing, portable structure customization"
        canonicalUrl="https://portableofficecabin.com/faq"
        structuredData={[
          faqStructuredData,
          generateBreadcrumbSchema([
            { name: "Home", url: "https://portableofficecabin.com" },
            { name: "FAQ", url: "https://portableofficecabin.com/faq" },
          ]),
        ]}
      />

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
            const Icon = category.icon;
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
