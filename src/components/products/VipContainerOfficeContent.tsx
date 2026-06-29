import Link from "next/link";
import {
  Snowflake, Sparkles, Lightbulb, PanelsTopLeft, Sofa, Bath, Brush,
  ShieldCheck, HardHat, Building2, Megaphone, Factory, PartyPopper,
  CheckCircle2, Phone, MessageCircle, ChevronRight, Truck, IndianRupee,
  ClipboardList, CalendarCheck, PackageCheck, Headset,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";

// Single source of truth for the page's images and FAQ — also consumed by the
// route (app/(site)/products/vip-container-office/page.tsx) for the OG image and
// the FAQPage JSON-LD, so the on-page accordion and the schema never drift.
const IMG_DIR = "/images/products/vip-container-office";
export const VIP_HERO_IMAGE = `${IMG_DIR}/vip-container-office.webp`;

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  whatsapp: "https://wa.me/919731897976?text=Hi%2C%20I%27m%20interested%20in%20a%20VIP%20container%20office",
  email: "sales@portableofficecabin.com",
};

export const VIP_FAQS: { question: string; answer: string }[] = [
  {
    question: "What is a VIP container office?",
    answer:
      "A VIP container office is a premium, fully finished portable office cabin with high-grade insulation, modern interiors, air conditioning, large glass windows, and optional executive furniture — built for client meetings, sales lounges, and leadership offices.",
  },
  {
    question: "Is the VIP container office available for rent or only for sale?",
    answer:
      "Both. You can buy a VIP container office outright or rent one on flexible monthly terms across India.",
  },
  {
    question: "How much does a VIP container office cost in India?",
    answer:
      "Price depends on size, finish, furnishing, add-ons, and whether you buy or rent. We provide a free, transparent, itemised quote for your specific requirement.",
  },
  {
    question: "Is the VIP container office air-conditioned?",
    answer:
      "Yes. Split air conditioning is fitted as standard, along with insulation for year-round comfort.",
  },
  {
    question: "Can the VIP container office be customised?",
    answer:
      "Absolutely. We offer custom sizes, interior finishes, washroom and pantry attachments, partitions, furniture, and brand wrapping.",
  },
  {
    question: "Do you deliver across India?",
    answer:
      "Yes, we provide delivery and installation across India. Transport cost is calculated based on your site's distance from our facility.",
  },
  {
    question: "How quickly can it be set up?",
    answer:
      "Once your order is confirmed, units are typically delivered and made operational within a few days, depending on customisation and location.",
  },
];

// Small, reusable presentational bits keep the long page readable & consistent.
function SectionHeading({ id, icon: Icon, children }: { id: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
      <Icon className="h-7 w-7 text-accent shrink-0" />
      {children}
    </h2>
  );
}

function QuoteCta({ label = "Get a Free Quote" }: { label?: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-colors">
        {label}
        <ChevronRight className="h-4 w-4" />
      </Link>
      <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-accent text-accent font-semibold px-6 py-3 rounded-full hover:bg-accent/10 transition-colors">
        <MessageCircle className="h-4 w-4" />
        Call / WhatsApp Us
      </a>
    </div>
  );
}

const FEATURES = [
  { icon: ShieldCheck, title: "High-grade thermal insulation", desc: "PUF or rockwool sandwich panels for year-round comfort." },
  { icon: Sparkles, title: "Premium interiors", desc: "Laminated wall panelling, vinyl or wooden flooring, and a false ceiling with concealed lighting." },
  { icon: Snowflake, title: "Climate control", desc: "Split air conditioning fitted as standard." },
  { icon: Lightbulb, title: "Modern lighting & power", desc: "Ambient LED lighting and ample power points." },
  { icon: PanelsTopLeft, title: "Glass façade / large windows", desc: "Natural light and a contemporary, high-end look." },
  { icon: Sofa, title: "Executive furniture options", desc: "Desks, conference table, cabinets, and seating." },
  { icon: Bath, title: "Attached washroom & pantry", desc: "Self-contained configurations available on request." },
  { icon: Brush, title: "Branding-ready exterior", desc: "Wrapped or painted in your company colours." },
];

const USE_CASES = [
  { icon: HardHat, title: "Construction & infrastructure", desc: "Premium project offices for directors and client visits." },
  { icon: Building2, title: "Real estate", desc: "On-site booking offices and sales lounges that close deals." },
  { icon: Sparkles, title: "Corporate & startups", desc: "Modern meeting rooms and executive cabins." },
  { icon: Megaphone, title: "Marketing & exhibitions", desc: "Branded display units and hospitality lounges." },
  { icon: Factory, title: "Manufacturing", desc: "Executive administrative offices within plant premises." },
  { icon: PartyPopper, title: "Events", desc: "VIP hospitality, organiser, and registration offices." },
];

const COMPARISON = [
  { aspect: "Purpose", standard: "Basic site admin & shelter", vip: "Client-facing & executive use" },
  { aspect: "Insulation", standard: "Basic", vip: "High-grade PUF / rockwool" },
  { aspect: "Interiors", standard: "Functional", vip: "Premium finish & false ceiling" },
  { aspect: "Climate control", standard: "AC-ready", vip: "Split AC fitted" },
  { aspect: "Windows", standard: "Standard", vip: "Large glass / glass façade" },
  { aspect: "Furniture", standard: "Optional / basic", vip: "Executive options included" },
  { aspect: "Look & feel", standard: "Utilitarian", vip: "Modern & professional" },
];

const SPECS = [
  { feature: "Structure", spec: "Heavy-gauge steel frame, corrosion-resistant" },
  { feature: "Wall panels", spec: "Insulated PUF / rockwool sandwich panels" },
  { feature: "Flooring", spec: "Anti-skid vinyl or laminated wooden finish" },
  { feature: "Ceiling", spec: "False ceiling with concealed LED lighting" },
  { feature: "Climate control", spec: "Split AC fitted as standard" },
  { feature: "Windows & doors", spec: "Glass façade / sliding glass windows, secure door" },
  { feature: "Sizes", spec: "20 ft, 40 ft & custom dimensions" },
  { feature: "Add-ons", spec: "Washroom, pantry, partitions, furniture, branding" },
];

const PRICE_FACTORS = [
  "Size and layout — larger and multi-room units cost more",
  "Level of finish and furnishing — premium interiors, AC, and furniture",
  "Sale or rental — buy outright or hire on a flexible monthly basis",
  "Add-ons — washrooms, pantries, partitions, and custom branding",
  "Delivery distance — transport and installation to your site location",
];

const PROCESS = [
  { icon: ClipboardList, title: "Tell us your requirement", desc: "Location, size, finish level, and whether you want to buy or rent." },
  { icon: IndianRupee, title: "Get a free quote", desc: "We recommend the right unit and send transparent pricing." },
  { icon: CalendarCheck, title: "Confirm & schedule", desc: "Approve the quote and pick your delivery date." },
  { icon: Truck, title: "Delivery & installation", desc: "We transport, place, and set up the unit at your site." },
  { icon: PackageCheck, title: "Move in & work", desc: "Your VIP container office is ready from day one." },
  { icon: Headset, title: "Support", desc: "Servicing during the term and pickup when you're done (for rentals)." },
];

const WHY_US = [
  "Premium build quality — executive finish, insulation, and AC as standard",
  "Sale & rental options — flexible terms to suit your project",
  "Pan-India delivery — units transported and installed across the country",
  "Full customisation — sizes, layouts, furniture, washrooms, and branding",
  "Transparent pricing — clear quotes with no hidden costs",
  "End-to-end service — design, delivery, installation, and support handled for you",
];

const TOC = [
  { id: "what-is", label: "What is it" },
  { id: "features", label: "Features" },
  { id: "uses", label: "Where it's used" },
  { id: "vs-standard", label: "VIP vs standard" },
  { id: "specifications", label: "Specifications" },
  { id: "price", label: "Price" },
  { id: "buy-or-rent", label: "Buy or rent" },
  { id: "process", label: "Process" },
  { id: "why-us", label: "Why us" },
  { id: "faq", label: "FAQ" },
];

export function VipContainerOfficeContent() {
  return (
    <div className="space-y-16">
      {/* On-this-page quick nav — easy reading / jump-to-section */}
      <nav aria-label="On this page" className="rounded-2xl border border-border bg-card/50 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</span>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-accent hover:underline">{t.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* What is it */}
      <section>
        <SectionHeading id="what-is" icon={Sparkles}>What Is a VIP Container Office?</SectionHeading>
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A <strong className="text-foreground">VIP container office</strong> is a premium grade of portable office cabin built on a durable steel frame and finished to executive standards. Unlike a basic site cabin meant only for shelter and storage, a VIP container office is engineered for comfort and presentation — high-grade insulation, modern interiors, climate control, and large glass windows that flood the space with natural light.
            </p>
            <p>
              Because it&apos;s prefabricated and modular, a VIP container office can be transported on a truck, placed on almost any flat surface, and relocated when your needs change. It gives you the polish of a permanent office with the flexibility of a portable one.
            </p>
          </div>
          <OptimizedImage
            src={`${IMG_DIR}/vip-container-office-exterior.webp`}
            alt="Premium VIP container office exterior with glass façade in India"
            aspectRatio="3/2"
            geoTag={false}
            className="rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Features */}
      <section>
        <SectionHeading id="features" icon={Sparkles}>Features of Our VIP Container Office</SectionHeading>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Every VIP container office is built to a premium specification and can be customised to your brand and requirements:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <f.icon className="h-7 w-7 text-accent mb-3" />
              <h3 className="font-semibold text-foreground text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <QuoteCta label="Enquire About a VIP Container Office" />
        </div>
      </section>

      {/* Where used */}
      <section>
        <SectionHeading id="uses" icon={Building2}>Where a VIP Container Office Is Used</SectionHeading>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          A VIP container office is the right choice anywhere presentation matters as much as function:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((u) => (
            <div key={u.title} className="flex items-start gap-3 bg-card border border-border rounded-xl p-5">
              <div className="bg-accent/10 rounded-lg p-2.5 shrink-0">
                <u.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{u.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Exterior gallery */}
      <section aria-label="VIP container office gallery" className="grid sm:grid-cols-2 gap-5">
        <figure className="space-y-2">
          <OptimizedImage
            src={`${IMG_DIR}/vip-container-office-side.webp`}
            alt="Side view of VIP container office with premium grey finish in India"
            aspectRatio="3/2"
            geoTag={false}
            className="rounded-2xl shadow-lg"
          />
          <figcaption className="text-xs text-muted-foreground text-center italic">Clean, professional exterior — branding-ready in your company colours</figcaption>
        </figure>
        <figure className="space-y-2">
          <OptimizedImage
            src={`${IMG_DIR}/vip-container-office-entrance.webp`}
            alt="VIP container office entrance with executive door and glass façade in India"
            aspectRatio="3/2"
            geoTag={false}
            className="rounded-2xl shadow-lg"
          />
          <figcaption className="text-xs text-muted-foreground text-center italic">Executive entrance with secure door and full-height glazing</figcaption>
        </figure>
      </section>

      {/* Comparison */}
      <section>
        <SectionHeading id="vs-standard" icon={CheckCircle2}>VIP Container Office vs. Standard Site Cabin</SectionHeading>
        <div className="overflow-x-auto bg-card rounded-xl shadow-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10 text-left">
                <th className="px-5 py-3 font-semibold text-foreground">Aspect</th>
                <th className="px-5 py-3 font-semibold text-foreground">Standard Site Cabin</th>
                <th className="px-5 py-3 font-semibold text-foreground">VIP Container Office</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.aspect} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-5 py-3 font-medium text-foreground">{row.aspect}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row.standard}</td>
                  <td className="px-5 py-3 text-foreground">{row.vip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Specifications */}
      <section>
        <SectionHeading id="specifications" icon={ClipboardList}>Key Specifications</SectionHeading>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          While every unit can be tailored, our VIP container offices typically feature:
        </p>
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="overflow-x-auto bg-card rounded-xl shadow-card border border-border">
            <table className="w-full text-sm">
              <tbody>
                {SPECS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <td className="px-5 py-3 font-medium text-foreground w-2/5">{row.feature}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OptimizedImage
            src={`${IMG_DIR}/vip-container-office-interior.webp`}
            alt="Furnished VIP container office interior with AC, desk and executive seating"
            aspectRatio="3/2"
            geoTag={false}
            className="rounded-2xl shadow-lg"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Specifications are indicative and can be tailored to your project requirements.
        </p>
      </section>

      {/* Price */}
      <section className="bg-muted/30 rounded-2xl p-6 lg:p-8">
        <SectionHeading id="price" icon={IndianRupee}>VIP Container Office Price — What Affects the Cost?</SectionHeading>
        <p className="text-muted-foreground mb-5 leading-relaxed">
          The price of a VIP container office in India depends on a few key factors:
        </p>
        <ul className="space-y-3 mb-6">
          {PRICE_FACTORS.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mb-5 leading-relaxed">
          Because every project is different, we provide a transparent, itemised quote with no hidden charges. Request your free, no-obligation quote and we&apos;ll respond promptly with the best price for your requirement.
        </p>
        <QuoteCta label="Request Your Free Quote" />
      </section>

      {/* Buy or rent */}
      <section>
        <SectionHeading id="buy-or-rent" icon={Building2}>Buy or Rent — Your Choice</SectionHeading>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">Buy a VIP container office</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose to <Link href="/products/category/container-offices" className="text-accent hover:underline">buy</Link> if you need a long-term, permanent workspace and want full ownership of a premium asset.
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">Rent a VIP container office</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Prefer to <Link href="/rental-service" className="text-accent hover:underline">rent</Link>? Get flexible monthly terms with no large upfront cost — we handle delivery, setup, maintenance, and pickup.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Either way, you get the same premium build quality and end-to-end service.</p>
      </section>

      {/* Process */}
      <section>
        <SectionHeading id="process" icon={ClipboardList}>Our Simple Process</SectionHeading>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROCESS.map((step, i) => (
            <div key={step.title} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-accent text-white rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-sm">{i + 1}</span>
                <step.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-accent/5 border border-accent/15 rounded-2xl p-6 lg:p-8">
        <SectionHeading id="why-us" icon={ShieldCheck}>Why Choose Portable Office Cabin?</SectionHeading>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {WHY_US.map((w) => (
            <div key={w} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{w}</span>
            </div>
          ))}
        </div>
        <QuoteCta label="Get Started — Request a Quote" />
        <p className="mt-4 text-sm text-muted-foreground">
          New to portable workspaces? Explore our <Link href="/" className="text-accent hover:underline">portable office cabin</Link> range or browse all <Link href="/products/category/container-offices" className="text-accent hover:underline">container offices</Link>.
        </p>
      </section>

      {/* FAQ */}
      <section>
        <SectionHeading id="faq" icon={CheckCircle2}>Frequently Asked Questions</SectionHeading>
        <Accordion type="multiple" className="space-y-3">
          {VIP_FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6">
              <AccordionTrigger className="text-foreground font-semibold hover:text-accent text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer CTA */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary text-primary-foreground rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Ready for Your VIP Container Office?</h2>
        <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-7">
          Get a fully furnished, air-conditioned, premium workspace delivered to your site — for sale or on rent — without the cost and delay of construction. Portable Office Cabin builds VIP container offices that make the right impression.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-full hover:bg-white/90 transition-colors">
            Request a Free Quote
          </Link>
          <a href={`tel:${CONTACT.tel}`} className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            <Phone className="h-4 w-4" /> Call {CONTACT.telDisplay}
          </a>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        <p className="mt-5 text-sm text-primary-foreground/70">
          ✉ <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a> · 🌐 portableofficecabin.com
        </p>
      </section>
    </div>
  );
}
