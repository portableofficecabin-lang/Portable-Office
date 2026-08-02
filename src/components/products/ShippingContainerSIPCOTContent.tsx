import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Truck, IndianRupee, Recycle, Clock, Wrench, MapPin, Building2, Factory, Leaf, Lock, Users, Phone } from "lucide-react";
import sipcotYard from "@/assets/products/shipping-container-sipcot-yard.webp";
import sipcotPort from "@/assets/products/shipping-container-sipcot-port.webp";
import sipcotOpen from "@/assets/products/shipping-container-sipcot-open.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { BuyNowCTA } from "@/components/products/BuyNowCTA";
import { getCommerce } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/** Single source of truth for the on-page price — matches the buy box, cart and Razorpay. */
const sipcotPrice = formatINR(sellPrice(getCommerce("31")!.basePrice));

const highlights = [
  { icon: Factory, title: "Built for SIPCOT Estates", description: "Purpose-designed containers for Sriperumbudur, Oragadam, Hosur, and Gummidipoondi industrial parks" },
  { icon: Clock, title: "7–15 Day Delivery", description: "Factory-to-site delivery across Tamil Nadu SIPCOT locations" },
  { icon: IndianRupee, title: "Buy Online", description: "One fixed GST-inclusive price — order online with secure checkout and delivery" },
  { icon: Truck, title: "Estate-to-Estate Relocation", description: "Move containers between Sriperumbudur, Oragadam, and other SIPCOT estates" },
  { icon: Lock, title: "Industrial Security", description: "Heavy-duty locking systems, CCTV provisions, and weather-resistant doors" },
  { icon: Users, title: "Labour Accommodation", description: "G+1 stacked dormitories with attached toilets, dining, and fire safety provisions" },
  { icon: Wrench, title: "Full Customization", description: "Partitions, restrooms, pantry, data cabling, and corporate branding" },
  { icon: Leaf, title: "ESG Compliant", description: "90% container reuse, solar-ready roofs, and reflective coatings for energy savings" },
];

const containerTypes = [
  { type: "20 ft dry container", use: "Storage, compact offices, security cabins" },
  { type: "40 ft dry container", use: "Larger storage, worker facilities, open-plan offices" },
  { type: "High cube container", use: "Comfortable workspaces with false ceiling and HVAC" },
  { type: "Insulated/modified container", use: "Site offices, accommodation, canteens" },
  { type: "Portable security cabin", use: "Gate complexes and access control points" },
  { type: "Portable toilet units", use: "Construction phases and remote campus areas" },
  { type: "Prefab canteen / café", use: "Staff areas with food-grade surfaces and ventilation" },
];

const sipcotEstates = [
  "SIPCOT Sriperumbudur",
  "SIPCOT Oragadam",
  "SIPCOT Irungattukottai",
  "SIPCOT Gummidipoondi",
  "SIPCOT Ranipet",
  "SIPCOT Hosur",
];

const whyBuy = [
  { factor: "Best for", purchase: "Permanent plant offices, long-term stores, fixed labour colonies" },
  { factor: "Service life", purchase: "20–25 years with proper foundation and maintenance" },
  { factor: "Price", purchase: `${sipcotPrice} incl. GST — buy online` },
  { factor: "Customization", purchase: "Full flexibility" },
  { factor: "Includes", purchase: "Container + delivery" },
];

const faqs = [
  { q: "Which SIPCOT estates do you serve?", a: "We deliver to all major SIPCOT estates including Sriperumbudur, Oragadam, Irungattukottai, Gummidipoondi, Ranipet, and Hosur. Site surveys and proposals are provided within 48–72 hours." },
  { q: "What container sizes are available for SIPCOT projects?", a: "We offer 20 ft, 40 ft standard and high cube containers. Custom lengths and multi-container complexes can be fabricated to your specifications." },
  { q: "Can containers be used as permanent plant offices?", a: "Yes. With proper foundation, insulation, anti-corrosive coatings, and periodic maintenance, containers serve as permanent structures lasting 20–25 years." },
  { q: "How quickly can you deliver to SIPCOT Sriperumbudur?", a: "Standard cabins ship within 7–15 working days. Stock units may be available for faster dispatch — contact us for current availability." },
  { q: "Can I relocate containers between SIPCOT estates?", a: "Absolutely. We provide relocation support via crane and flatbed trailer between estates like Sriperumbudur and Oragadam with scheduled deliveries to minimise production disruption." },
  { q: "What customization options are available?", a: "Full customization including partitions, restrooms, pantry sections, data cabling, extra doors/windows, company branding, and documentation support for plant engineering teams." },
  { q: "Do you supply labour accommodation for SIPCOT factories?", a: "Yes. We design container-based dormitories with bunk houses, attached toilets, bathing areas, dining spaces, G+1 stacking, proper electrical layout, and firefighting provisions." },
];

export function ShippingContainerSIPCOTContent() {
  return (
    <div className="space-y-16">
      {/* Hero Images */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(sipcotYard)}
            alt="40 ft dark blue Corten steel shipping container with lock rods at SIPCOT Sriperumbudur industrial estate by Portable Office Cabin"
            title="Shipping container in SIPCOT Sriperumbudur — 40 ft storage unit by Portable Office Cabin"
            productName="Shipping Container in SIPCOT"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(sipcotPort)}
            alt="Blue 40 ft ISO shipping container at dispatch yard ready for delivery to SIPCOT Oragadam and Gummidipoondi by Portable Office Cabin"
            title="ISO container for SIPCOT industrial parks — dispatched from Tamil Nadu by Portable Office Cabin"
            productName="Shipping Container in SIPCOT"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(sipcotOpen)}
            alt="20 ft blue shipping container with doors open showing marine plywood flooring for SIPCOT Irungattukottai factory storage by Portable Office Cabin"
            title="Open shipping container for SIPCOT factory storage — 20 ft unit with plywood floor by Portable Office Cabin"
            productName="Shipping Container in SIPCOT"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
      </div>

      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Shipping Containers for SIPCOT Industrial Estates
        </h2>
        <p className="text-muted-foreground mb-4">
          SIPCOT industrial estates across Tamil Nadu — including Sriperumbudur, Oragadam, Hosur, and Gummidipoondi — host hundreds of factories requiring fast, flexible infrastructure. Portable Office Cabin manufactures and supplies shipping containers and container-based structures designed specifically for these estates.
        </p>
        <p className="text-muted-foreground mb-4">
          Industries operating here include automotive, electronics, FMCG, logistics, and engineering companies. These businesses constantly need project offices, secure storage for machinery and spare parts, worker accommodation, and security cabins at entry gates. Shipping containers meet these specific needs because they reduce construction time, require minimal land approvals, and can be relocated easily when needed.
        </p>
      </section>

      {/* Why Choose */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Shipping Containers for SIPCOT?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item) => (
            <Card key={item.title} className="border-border">
              <CardContent className="p-5">
                <item.icon className="h-8 w-8 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Container Types */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Types of Container Products for SIPCOT
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Container Type</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Typical Use in SIPCOT</th>
              </tr>
            </thead>
            <tbody>
              {containerTypes.map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.type}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Container Offices */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Container Offices & Site Cabins in SIPCOT
        </h2>
        <p className="text-muted-foreground mb-4">
          Container offices serve as project management hubs, quality labs, and administrative blocks inside SIPCOT estates. Unlike brick building construction, these units offer quick installation and easy relocation.
        </p>
        <ul className="space-y-2 mb-4">
          {[
            "Insulated walls and roof for domestic climate control",
            "UPVC/aluminium windows and LED lighting",
            "Split AC provisions (1.5–2 ton) and vinyl flooring",
            "Built-in workstations as required",
            "Delivery to Sriperumbudur, Gummidipoondi, or Oragadam in 7–15 working days",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Storage */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Storage & Warehouse Shipping Containers
        </h2>
        <p className="text-muted-foreground mb-4">
          SIPCOT units use storage containers for safe, secure on-site storage of raw materials, tools, and finished goods. 20 ft and 40 ft containers work as temporary mini-warehouses with heavy-duty locking systems, weather-resistant doors, ventilation options, and custom branding with company colours.
        </p>
      </section>

      {/* Labour Accommodation */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Prefab Labour Colonies & Worker Accommodation
        </h2>
        <p className="text-muted-foreground mb-4">
          Large factories and EPC contractors in SIPCOT require organised worker accommodation. We design container-based dormitories with:
        </p>
        <ul className="space-y-2">
          {[
            "Bunk houses and prefab labour colonies",
            "Attached toilets, bathing areas, and dining spaces",
            "G+1 stacking options to optimise limited land",
            "Proper electrical layout and firefighting provisions",
            "Hygienic, ventilated designs for easy maintenance",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Users className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Security & Toilets */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Security Cabins, Portable Toilets & Canteens
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardContent className="p-5">
              <Lock className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Security Cabins</h3>
              <p className="text-sm text-muted-foreground">Compact footprint with wide windows, CCTV provisions, fan/AC, durable finish. Quick installation via crane at SIPCOT gate complexes.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <Building2 className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Portable Toilets</h3>
              <p className="text-sm text-muted-foreground">For construction phases and permanent campus areas. Bio-digesters, hand-wash counters, and plumbing coordination included.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <Factory className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Prefab Canteens</h3>
              <p className="text-sm text-muted-foreground">Food-grade surfaces, exhaust, ventilation, seating layouts per specification. Quick commissioning in SIPCOT staff areas.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Buy */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Buy for SIPCOT Projects
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Factor</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Purchase</th>
              </tr>
            </thead>
            <tbody>
              {whyBuy.map((row, i) => (
                <tr key={row.factor} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.factor}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.purchase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Prefer renting instead? See our <Link href="/rental-service" className="text-accent hover:underline">rental service</Link>.
        </p>
      </section>

      {/* Service Areas */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          SIPCOT Estates We Serve
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sipcotEstates.map((estate) => (
            <div key={estate} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <MapPin className="h-5 w-5 text-accent shrink-0" />
              <span className="text-foreground font-medium">{estate}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4">
          Site surveys and proposals are provided within 48–72 hours. We handle estate road navigation, crane placement, and scheduled deliveries to minimise production disruption.
        </p>
      </section>

      {/* Sustainability */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Energy Efficiency & Sustainability
        </h2>
        <ul className="space-y-2">
          {[
            "Reusing shipping containers reduces embodied carbon versus masonry construction",
            "Optional roof insulation and reflective coatings for thermal comfort",
            "Solar-ready roofs for energy savings in SIPCOT estates",
            "Ideal for customers following ESG mandates and sustainability targets",
            "90% container reuse — minimal debris compared to conventional building",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Leaf className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Why Choose Us */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Why Choose Portable Office Cabin for SIPCOT?
        </h2>
        <ul className="space-y-3">
          {[
            "Direct manufacturer with competitive pricing — no middlemen",
            "One fixed GST-inclusive online price with straightforward outright purchase",
            "Fast delivery and installation support across all SIPCOT estates",
            "Full customization to meet plant engineering and corporate standards",
            "Quality assurance: high-grade steel, anti-rust coatings, fire-retardant insulation",
            "Documentation support for plant compliance and safety audits",
          ].map((point) => (
            <li key={point} className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold text-foreground">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 rounded-xl p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Buy Your SIPCOT Shipping Container Online
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Order online at {sipcotPrice} including GST with secure payment and delivery to your SIPCOT estate. Whether you need storage, site offices, labour accommodation, or security cabins — we deliver on time across Sriperumbudur, Oragadam, Irungattukottai, Gummidipoondi, Ranipet, and Hosur. Prefer to talk first? Call us to plan your setup.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <BuyNowCTA productId="31" />
          <a href="tel:+919731897976" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-8 py-3 font-semibold text-foreground transition-colors hover:bg-muted">
            <Phone className="h-4 w-4" />
            Call Us Now
          </a>
        </div>
      </section>
    </div>
  );
}
