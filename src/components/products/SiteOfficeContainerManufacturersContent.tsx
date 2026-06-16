import Link from "next/link";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Factory,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import exteriorImage from "@/assets/products/site-office-container-manufacturers-exterior.webp";
import interiorImage from "@/assets/products/site-office-container-manufacturers-interior.webp";
import complexImage from "@/assets/products/site-office-container-manufacturers-complex.webp";
import liftImage from "@/assets/products/site-office-container-manufacturers-lift.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const highlights = [
  {
    icon: Briefcase,
    title: "Factory-built workspaces",
    description:
      "Fully equipped site office containers manufactured off-site and delivered ready for immediate deployment.",
  },
  {
    icon: ShieldCheck,
    title: "Built for Indian conditions",
    description:
      "Engineered with insulated wall systems, weather-resistant finishes, and proper electrical safety for harsh site environments.",
  },
  {
    icon: Building2,
    title: "Single to multi-container setups",
    description:
      "From compact 10 ft booths to executive 40 ft offices and joined double-storey site office blocks.",
  },
  {
    icon: Factory,
    title: "Turnkey project support",
    description:
      "Design, fabrication, transport, installation, branding, and after-sales support handled by one team.",
  },
];

const productTypes = [
  "Standard 20 ft site office container for engineers and admin teams",
  "40 ft site office with MD cabin and staff workspace",
  "Double-storey office container blocks for tight project footprints",
  "Modular office container complexes for 30–50 person teams",
  "Site office with attached toilet and self-contained utilities",
  "Office + store combination for documentation and secure tools",
  "Compact 10 ft cabins for ticket counters, sales offices, and booths",
];

const technicalSpecs = [
  ["Frame structure", "IS-grade MS sections, welded bracing, lifting hooks, and handling-ready base frame"],
  ["Exterior cladding", "GI or MS sheets with anti-corrosive primer and PU / powder-coated finish"],
  ["Insulation", "PUF, rock wool, or glass wool sandwich panel systems"],
  ["Flooring", "MS base frame with cement board / marine plywood and vinyl, laminate, or tile finish"],
  ["Roof design", "Leak-proof insulated roof with self-draining slope and flashing details"],
  ["Electrical", "IS-marked copper wiring, MCB DB, LED lights, fan points, AC provision, earthing"],
  ["Lifespan", "Typically 10–20 years with proper maintenance and corrosion protection"],
];

const fitOutOptions = [
  "Pre-laminated board, PVC, ACP, gypsum, or MDF interior finish packages",
  "Factory-fitted split AC provision, exhaust fans, and ceiling fans",
  "Workstations, conference tables, storage cabinets, and reception counters",
  "Glass or solid partitions for MD cabins, meeting rooms, and open work zones",
  "Integrated washrooms, pantry counters, geyser provision, and data cabling",
  "Corporate colours, branded signage, reflective safety stickers, and room IDs",
];

const applications = [
  "Metro rail, NHAI highway, bridge, airport, and flyover construction projects",
  "Warehouse, logistics yard, and industrial park administration offices",
  "Refinery turnaround, mining, oil and gas, and remote infrastructure works",
  "Solar farm and wind project offices with quick relocation requirements",
  "Real estate sales offices and customer-facing experience centres",
  "Government, PSU, smart city, and emergency response coordination sites",
];

const pricingRows = [
  ["Basic 20 ft site office shell", "₹1.8–2.2 lakh"],
  ["Standard 20 ft with full interiors", "₹2.5–3.5 lakh"],
  ["Premium 20 ft executive finish", "₹3.5–4.5 lakh"],
  ["40 ft office with MD cabin + staff cabin", "₹4.0–6.0 lakh"],
  ["Joined container pair / larger office", "₹5.5–8.0 lakh"],
  ["Multi-container complexes", "Custom quote based on scope"],
];

const faqs = [
  {
    question: "Why choose a specialized site office container manufacturer instead of a trader?",
    answer:
      "A manufacturer controls design, steel selection, insulation, electrical work, structural safety, and finishing quality. That gives you better customisation, stronger documentation, and dependable after-sales support.",
  },
  {
    question: "Which insulation options are best for Indian project sites?",
    answer:
      "PUF works well for thermal comfort, rock wool is preferred when fire resistance matters, and glass wool offers a more economical thermal package. The right choice depends on climate, occupancy, and budget.",
  },
  {
    question: "Can these site offices be stacked or relocated later?",
    answer:
      "Yes. Properly engineered site office containers can be designed for crane lifting, transportation, and double-storey configurations, allowing reuse across multiple projects.",
  },
  {
    question: "Do you supply complete site infrastructure beyond the office itself?",
    answer:
      "Yes. Portable Office Cabin also delivers labour accommodation, portable toilets, security cabins, rooftop sheds, canteens, and other modular support infrastructure for integrated site setups.",
  },
  {
    question: "What should buyers confirm before placing the order?",
    answer:
      "Review drawings, insulation type, interior finish scope, electrical load, delivery logistics, warranty terms, and required documentation such as GST invoices or compliance certificates.",
  },
];

export function SiteOfficeContainerManufacturersContent() {
  return (
    <div className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-accent" />
            Site Office Containers
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Site Office Container Manufacturers: complete guide to prefabricated workspace solutions in India
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Site office containers have become the command centres of modern projects—from metro rail corridors and refinery turnarounds to solar farms and real estate launches. They replace slow brick construction with factory-built, portable, climate-ready workspaces that reach site in days.
          </p>
          <p className="text-base leading-7 text-muted-foreground">
            Portable Office Cabin manufactures turnkey site office containers in India for project managers, EPC contractors, developers, industrial clients, and institutional buyers who need secure, relocatable, and professional workspace infrastructure.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Popular sizes</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">10 ft–40 ft</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Deployment speed</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">Days, not months</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Typical lifespan</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">10–20 years</div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(exteriorImage)}
            alt="Site office container installed at an active construction project in India"
            title="Site office container manufacturer project installation"
            productName="Site Office Container Manufacturers"
            aspectRatio="4/3"
            className="h-full"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Icon className="h-8 w-8 text-accent" />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-display text-2xl font-bold text-foreground">Why work with specialized manufacturers?</h3>
          <p className="leading-7 text-muted-foreground">
            There is a major difference between a refurbished storage container from a trader and a purpose-built site office for human occupancy. Specialized manufacturers handle structural calculations, insulation, MEP systems, interior fit-out, and safety-focused detailing from day one.
          </p>
          <ul className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-card">
            {[
              "Engineering aligned to Indian site conditions and local standards",
              "Safer frame construction for transport, lifting, and stacking",
              "Proper fire, wiring, DB, earthing, and AC-load planning",
              "Faster custom layouts, 3D concepts, and factory-controlled quality",
              "Warranty support, spare parts access, and maintenance continuity",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(liftImage)}
            alt="Lifted site office container being placed by crane at a construction site"
            title="Crane placement of prefabricated site office container"
            productName="Site Office Container Manufacturers"
            aspectRatio="16/9"
          />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">Types of site office containers we manufacture</h3>
          <div className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
            <ul className="space-y-3">
              {productTypes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">Interior fit-out and comfort features</h3>
          <div className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
            <ul className="space-y-3">
              {fitOutOptions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <Wrench className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(interiorImage)}
            alt="Interior of a prefabricated site office container with workstations and air conditioning"
            title="Site office container interior fit-out"
            productName="Site Office Container Manufacturers"
            aspectRatio="16/9"
          />
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-2xl font-bold text-foreground">Technical specifications and build quality</h3>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <tbody>
                {technicalSpecs.map(([label, value], index) => (
                  <tr key={label} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 font-medium text-foreground">{label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">Applications across India</h3>
          <div className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
            <ul className="space-y-3">
              {applications.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(complexImage)}
            alt="Multi-container site office complex manufactured for a large project site"
            title="Modular site office container complex"
            productName="Site Office Container Manufacturers"
            aspectRatio="16/9"
          />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-2xl font-bold text-foreground">Pricing overview and cost factors</h3>
          <p className="mt-3 leading-7 text-muted-foreground">
            Site office container pricing depends on size, insulation, interior quality, electrical load, pantry or toilet integration, furniture package, and transport distance.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Configuration</th>
                  <th className="px-4 py-3 font-semibold">Indicative price</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map(([config, price], index) => (
                  <tr key={config} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground">{config}</td>
                    <td className="px-4 py-3 text-muted-foreground">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-2xl font-bold text-foreground">Own vs rent: what suits your project?</h3>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Renting makes sense for short-term projects or standard requirements. Buying becomes more attractive for multi-year projects, custom specifications, branding-heavy setups, or repeated redeployment across sites.
            </p>
            <p>
              If your team is comparing options, also explore our <Link href="/products/construction-site-portable-office" className="font-medium text-accent underline-offset-4 hover:underline">Construction Site Portable Office</Link>, <Link href="/products/container-office" className="font-medium text-accent underline-offset-4 hover:underline">Container Office</Link>, and <Link href="/products/shipping-container-rental" className="font-medium text-accent underline-offset-4 hover:underline">Shipping Container Rental</Link> pages.
            </p>
            <p>
              For complete site infrastructure, we can also combine office cabins with labour accommodation, sanitation blocks, security cabins, and rooftop sheds under one modular delivery plan.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="mt-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
