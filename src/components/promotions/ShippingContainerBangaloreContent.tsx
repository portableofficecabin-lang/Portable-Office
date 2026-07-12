import Link from "next/link";
import {
  Package, Building2, Users, ShieldCheck, Coffee, CheckCircle2, Ruler, IndianRupee,
  Factory, Wrench, Truck, MapPin, Phone, MessageCircle, ChevronRight, BadgeCheck,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";

const IMG = "/images/products";

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  whatsapp: "https://wa.me/919731897976?text=Hi%2C%20I%27m%20interested%20in%20a%20shipping%20container%20in%20Bangalore",
};

export const SHIPPING_BLR_FAQS: { question: string; answer: string }[] = [
  {
    question: "What is the price of a shipping container in Bangalore?",
    answer:
      "Prices start from ₹1.5 lakh for basic models. A fitted 20ft container office typically costs more depending on insulation, electricals, and interiors. We provide detailed written quotes with no hidden charges.",
  },
  {
    question: "How long does delivery take in Bangalore?",
    answer:
      "Standard units are dispatched within 7–15 working days of order confirmation and receipt of the advance, with transit typically taking 1–5 days. Larger or custom projects take longer. Our Hoskote factory location keeps Bangalore transport times short, and your written quotation confirms the exact timeline.",
  },
  {
    question: "Do you sell both new and used shipping containers?",
    answer:
      "Yes. We manufacture new containers and also supply inspected, refurbished used units. New units suit offices and accommodation; refurbished units are a cost-effective choice for storage.",
  },
  {
    question: "Can a shipping container be used as an office in Bangalore's climate?",
    answer:
      "Yes. With 50mm PUF insulated panels, ventilation, and AC provisioning, container offices stay comfortable year-round. The steel body is weatherproofed for monsoon rain and summer heat.",
  },
  {
    question: "What site preparation is needed before delivery?",
    answer:
      "A level surface — plain compacted ground, paver blocks, or a simple plinth — and clear vehicle access for the trailer and crane. Our team confirms site readiness with you before dispatch.",
  },
  {
    question: "Do I need building permission for a shipping container?",
    answer:
      "Containers are generally treated as movable/temporary structures, but requirements vary by location and use. For permanent commercial use, check with your local authority; we can provide specification documents to support your application.",
  },
  {
    question: "What maintenance does a container need?",
    answer:
      "Very little. We recommend repainting every few years and periodic checks of door seals and fittings. Maintained this way, a container lasts 15–20 years or more, and every unit carries our 10-year structural warranty.",
  },
  {
    question: "Can you deliver outside Bangalore?",
    answer:
      "Yes. We deliver pan-India from our Karnataka and Tamil Nadu factories, including Hosur, Tumakuru, Mysuru, Chennai, and Hyderabad.",
  },
];

function H2({ id, icon: Icon, children }: { id: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
      <Icon className="h-7 w-7 text-accent shrink-0" />
      {children}
    </h2>
  );
}

const USES = [
  { icon: Package, title: "Storage containers", desc: "Weatherproof, lockable storage for tools, materials, inventory, and equipment at construction sites, factories, and warehouses." },
  { icon: Building2, title: "Container offices", desc: "Fully fitted site offices with electrical wiring, lighting, AC points, flooring, and furniture — ready to work from on day one." },
  { icon: Users, title: "Workmen accommodation", desc: "Insulated living units and bunk-bed containers for site staff, as single units or multi-block labour colonies." },
  { icon: ShieldCheck, title: "Security cabins", desc: "Compact guard rooms for gates, parking areas, and industrial premises." },
  { icon: Coffee, title: "Cafés, retail & pop-ups", desc: "Customised container conversions with branding, glass fronts, and interiors for commercial spaces." },
];

const SIZES = [
  ["10 ft", "10 × 8 × 8.5 ft", "~80 sq ft", "Security cabins, small stores"],
  ["20 ft (standard)", "20 × 8 × 8.5 ft", "~160 sq ft", "Site offices, storage, shops"],
  ["20 ft high cube", "20 × 8 × 9.5 ft", "~160 sq ft", "Offices needing extra headroom"],
  ["40 ft (standard)", "40 × 8 × 8.5 ft", "~320 sq ft", "Large offices, warehousing"],
  ["40 ft high cube", "40 × 8 × 9.5 ft", "~320 sq ft", "Accommodation, multi-room units"],
  ["Custom sizes", "Made to order", "As required", "Special site constraints"],
];

const BUILD_SPEC = [
  "Galvanized steel frame and corten/MS steel body for corrosion resistance",
  "IS-grade raw materials throughout",
  "50mm PUF insulated wall and roof panels (optional) for thermal comfort",
  "Weatherproof construction rated for Bangalore's monsoon and summer",
  "Lockable steel doors; windows, ventilation, and electrical fit-outs to order",
];

const PRICES = [
  ["Used/refurbished 20 ft storage container", "₹1.5 – ₹2.5 lakh"],
  ["New 20 ft storage container", "₹2 – ₹3.5 lakh"],
  ["20 ft container office (insulated, fitted)", "₹3 – ₹5 lakh"],
  ["40 ft storage container", "₹3 – ₹5 lakh"],
  ["40 ft container office / accommodation", "₹5 – ₹8 lakh"],
];

const COMPARISON = [
  ["Time to ready", "7–15 working days + transit", "2–3 months"],
  ["Relocatable", "Yes — moves with your project", "No"],
  ["Cost", "From ₹1.5 lakh, fixed quote", "Higher, prone to overruns"],
  ["Site disruption", "Minimal — built off-site", "High — months of on-site work"],
  ["Resale value", "Retains value; can be resold", "None once demolished"],
];

const CUSTOMIZATION = [
  "Layout: partitions, cabins, pantry, and toilet blocks within the container",
  "Doors and windows: steel, glass, or UPVC in any position",
  "Electrical: full wiring, lighting, switchboards, AC provisioning, DB box",
  "Insulation and cladding: 50mm PUF panels, false ceilings, vinyl or wooden flooring",
  "Plumbing: sinks, toilets, and water connections for accommodation units",
  "Branding: company colours, logos, and signage painted or mounted",
];

const DELIVERY_AREAS = ["Whitefield", "Electronic City", "Peenya", "Bommasandra", "Jigani", "Yelahanka", "Devanahalli", "Sarjapur Road", "Hebbal", "Tumakuru Road", "Hosur"];

const WHY_US = [
  "Manufacturer, not middleman — factory-direct pricing from our Hoskote (Karnataka) and Kamandoddi (Tamil Nadu) plants",
  "15+ years of manufacturing experience and 500+ projects delivered across India",
  "10-year structural warranty on every unit",
  "End-to-end service: design, fabrication, delivery, installation, and after-sales support",
  "GST-registered and verified (GSTIN: 33FVKPK6238Q1ZT) with transparent, written quotations",
  "Pan-India delivery if your project moves beyond Bangalore",
];

const STEPS = [
  "Share your requirement — call " + CONTACT.telDisplay + " or send an enquiry with size, use case, and site location.",
  "Get a free written quotation and drawing — we confirm specifications, layout, and pricing, with GST and any transport beyond 50 km listed separately.",
  "Production — your container is fabricated and fitted at our factory; standard units are dispatched within 7–15 working days of order confirmation and advance.",
  "Delivery and installation — we transport, place, and hand over the unit ready for use.",
];

export function ShippingContainerBangaloreContent() {
  return (
    <div className="space-y-16">
      {/* Uses */}
      <section>
        <H2 id="uses" icon={Package}>What Are Shipping Containers Used for in Bangalore?</H2>
        <p className="text-muted-foreground mb-8 leading-relaxed max-w-3xl">
          Bangalore&apos;s construction boom, logistics corridors, and industrial belts create constant demand for secure, relocatable space. Our clients typically use containers for:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {USES.map((u) => (
            <div key={u.title} className="flex items-start gap-3 bg-card border border-border rounded-xl p-5">
              <div className="bg-accent/10 rounded-lg p-2.5 shrink-0"><u.icon className="h-5 w-5 text-accent" /></div>
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{u.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          Because containers are relocatable, they suit Bangalore projects where land is leased or the site will move — you take the structure with you instead of writing off construction costs. Browse our full range of <Link href="/products/category/cargo-storage-shipping-containers" className="text-accent hover:underline">cargo &amp; storage containers</Link> or <Link href="/products/category/container-offices" className="text-accent hover:underline">container offices</Link>.
        </p>
      </section>

      {/* Sizes */}
      <section>
        <H2 id="sizes" icon={Ruler}>Shipping Container Sizes and Specifications</H2>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-3xl">We manufacture and supply containers in all standard sizes, plus custom dimensions for special requirements:</p>
        <div className="overflow-x-auto bg-card rounded-xl shadow-card border border-border mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10 text-left">
                <th className="px-5 py-3 font-semibold text-foreground">Size</th>
                <th className="px-5 py-3 font-semibold text-foreground">External (L × W × H)</th>
                <th className="px-5 py-3 font-semibold text-foreground">Floor Area</th>
                <th className="px-5 py-3 font-semibold text-foreground">Best For</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((row, i) => (
                <tr key={row[0]} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{row[0]}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row[1]}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row[2]}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Standard build specification</h3>
            <ul className="space-y-2.5">
              {BUILD_SPEC.map((s) => (
                <li key={s} className="flex items-start gap-2.5"><CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /><span className="text-sm text-muted-foreground">{s}</span></li>
              ))}
            </ul>
          </div>
          <OptimizedImage src={`${IMG}/shipping-container-stacked.webp`} alt="Stacked storage containers ready for delivery in Bangalore" aspectRatio="3/2" geoTag={false} className="rounded-2xl shadow-lg" />
        </div>
      </section>

      {/* Price */}
      <section className="bg-muted/30 rounded-2xl p-6 lg:p-8">
        <H2 id="price" icon={IndianRupee}>Shipping Container Price in Bangalore</H2>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-3xl">
          Shipping container prices in Bangalore start from ₹1.5 lakh for basic models. Your final price depends on five factors: size (20ft vs 40ft), condition (new build vs refurbished used), insulation, interior fit-out, and delivery distance. Indicative ranges:
        </p>
        <div className="overflow-x-auto bg-card rounded-xl shadow-card border border-border mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10 text-left">
                <th className="px-5 py-3 font-semibold text-foreground">Container Type</th>
                <th className="px-5 py-3 font-semibold text-foreground">Indicative Price Range*</th>
              </tr>
            </thead>
            <tbody>
              {PRICES.map((row, i) => (
                <tr key={row[0]} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-5 py-3 text-foreground">{row[0]}</td>
                  <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground italic mb-5">*Indicative only — final pricing depends on specification and site. <Link href="/contact" className="text-accent hover:underline">Contact us</Link> for a detailed written quote with no hidden charges.</p>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">Because we manufacture at Hoskote rather than trading imported units, you avoid dealer margins and port repositioning charges that inflate prices elsewhere in the market.</p>
      </section>

      {/* New vs Used */}
      <section>
        <H2 id="new-vs-used" icon={BadgeCheck}>New vs Used Shipping Containers: Which Should You Buy?</H2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">New</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">A new (one-trip or factory-built) container costs more upfront but gives you a 15–20+ year service life, clean interiors, and full warranty coverage. It is the right choice for <Link href="/products/category/container-offices" className="text-accent hover:underline">offices</Link>, accommodation, and customer-facing spaces.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">Used / refurbished</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">A refurbished used container costs less and works well for pure storage. Every used unit we supply is inspected, repaired, repainted, and made watertight before delivery. Not sure? Tell us your use case and budget — we recommend the best lifetime value, not the highest invoice.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section>
        <H2 id="vs-construction" icon={CheckCircle2}>Shipping Container vs Conventional Construction</H2>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-3xl">For temporary and semi-permanent needs, a container beats brick-and-mortar construction on almost every measure that matters to Bangalore project teams.</p>
        <div className="overflow-x-auto bg-card rounded-xl shadow-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10 text-left">
                <th className="px-5 py-3 font-semibold text-foreground">Factor</th>
                <th className="px-5 py-3 font-semibold text-foreground">Shipping Container</th>
                <th className="px-5 py-3 font-semibold text-foreground">Conventional Construction</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row[0]} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-5 py-3 font-medium text-foreground">{row[0]}</td>
                  <td className="px-5 py-3 text-foreground">{row[1]}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Industries */}
      <section>
        <H2 id="industries" icon={Factory}>Industries We Serve in Bangalore</H2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <p className="text-muted-foreground leading-relaxed">
            Construction and infrastructure contractors use our containers as site offices, stores, and labour accommodation on metro, road, and real-estate projects. Manufacturers and warehouses in Peenya, Bommasandra, and Jigani use them for overflow storage and security cabins. IT parks and facility managers deploy them as temporary offices during campus expansions. Event companies, retailers, and café operators commission branded conversions. Government agencies and PSUs procure them for site infrastructure — we are GST-registered and experienced with institutional documentation requirements.
          </p>
          <OptimizedImage src={`${IMG}/container-office-interior-meeting.webp`} alt="Container office interior with electrical fit-out, Bangalore" aspectRatio="3/2" geoTag={false} className="rounded-2xl shadow-lg" />
        </div>
      </section>

      {/* Customization */}
      <section>
        <H2 id="customization" icon={Wrench}>Customization Options</H2>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-3xl">Most Bangalore buyers customise their containers. We handle design, fabrication, and fit-out in-house:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CUSTOMIZATION.map((c) => (
            <div key={c} className="flex items-start gap-2.5"><CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /><span className="text-sm text-muted-foreground">{c}</span></div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 leading-relaxed max-w-3xl">Share your floor-plan idea and we&apos;ll send a drawing and quote — or see finished work in our <Link href="/gallery" className="text-accent hover:underline">project gallery</Link>. You can also browse ready models on our <Link href="/products/shipping-container-for-sale" className="text-accent hover:underline">shipping container for sale</Link> page.</p>
      </section>

      {/* Delivery */}
      <section>
        <H2 id="delivery" icon={Truck}>Delivery and Installation Across Bangalore</H2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <OptimizedImage src={`${IMG}/shipping-container-kormangala-crane.webp`} alt="Shipping container being installed by crane at a Bangalore construction site" aspectRatio="3/2" geoTag={false} className="rounded-2xl shadow-lg" />
          <div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Karnataka factory is at Hoskote (Sy. No. 51, Mylapur Post, Mugabala), 30 minutes from Whitefield — so Bangalore deliveries are quick and transport costs stay low. Delivery is by trailer with crane or Hydra placement. You need a reasonably level surface and clear vehicle access; our team confirms site readiness before dispatch. Standard units are dispatched within 7–15 working days of order confirmation, with transit typically taking 1–5 days.
            </p>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_AREAS.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full"><MapPin className="h-3 w-3 text-accent" />{a}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-accent/5 border border-accent/15 rounded-2xl p-6 lg:p-8">
        <H2 id="why-us" icon={ShieldCheck}>Why Buy from Portable Office Cabin?</H2>
        <div className="grid sm:grid-cols-2 gap-3">
          {WHY_US.map((w) => (
            <div key={w} className="flex items-start gap-2.5"><CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /><span className="text-sm text-muted-foreground">{w}</span></div>
          ))}
        </div>
      </section>

      {/* How to order */}
      <section>
        <H2 id="how-to-order" icon={ChevronRight}>How to Order in 4 Simple Steps</H2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <span className="bg-accent text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm mb-3">{i + 1}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <H2 id="faq" icon={CheckCircle2}>Frequently Asked Questions</H2>
        <Accordion type="multiple" className="space-y-3">
          {SHIPPING_BLR_FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6">
              <AccordionTrigger className="text-foreground font-semibold hover:text-accent text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary text-primary-foreground rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Get a Free Quote Today</h2>
        <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-7">
          Planning a shipping container project in Bangalore? Share your size, use case, and location, and we&apos;ll respond with a written quotation and delivery timeline — usually within 24 hours.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-full hover:bg-white/90 transition-colors">Request a Free Quote</Link>
          <a href={`tel:${CONTACT.tel}`} className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition-colors"><Phone className="h-4 w-4" /> {CONTACT.telDisplay}</a>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition-colors"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        </div>
      </section>
    </div>
  );
}
