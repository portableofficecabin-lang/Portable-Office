import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Truck, IndianRupee, Recycle, Clock, Wrench, MapPin, Building2, Factory, Leaf, Lock, Users, Anchor, Home } from "lucide-react";
import chennaiPort from "@/assets/products/shipping-container-chennai-port.webp";
import chennaiOffice from "@/assets/products/shipping-container-chennai-office.webp";
import chennaiYard from "@/assets/products/shipping-container-chennai-yard.webp";
import chennaiWet from "@/assets/products/shipping-container-chennai-wet.webp";
import chennaiDock from "@/assets/products/shipping-container-chennai-dock.webp";
import chennaiStorage from "@/assets/products/shipping-container-chennai-storage.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  { icon: Anchor, title: "Chennai Port Proximity", description: "Fast dispatch within 24–72 hours from yards near Chennai Port, Ennore, and Kattupalli" },
  { icon: Clock, title: "Same-Day to 6 Weeks", description: "Bare containers in 48 hours; fitted offices in 2–4 weeks; full homes in 3–6 weeks" },
  { icon: IndianRupee, title: "Buy or Rent", description: "Used containers from ₹80,000; rentals with delivery, insurance, and pickup included" },
  { icon: Truck, title: "Turnkey Delivery", description: "20–40 ton trailers with Hydra crane placement across North and South Chennai" },
  { icon: Factory, title: "Industrial Coverage", description: "Sriperumbudur, Oragadam, OMR, ECR, Ennore, Kattupalli — all zones served" },
  { icon: Lock, title: "Coastal-Grade Build", description: "Corten steel with marine-grade epoxy coatings (120 microns DFT) for Chennai's salinity" },
  { icon: Home, title: "Homes & Cafés", description: "Container homes along ECR, farm houses near Mahabalipuram, rooftop studios in the city" },
  { icon: Leaf, title: "Eco Friendly", description: "Reuse shipping containers, reduce on-site waste, and lower environmental impact" },
];

const sizeTable = [
  { type: "20 ft GP", dims: "6.06m × 2.44m × 2.59m", volume: "33 m³", bestFor: "General storage, small offices" },
  { type: "40 ft GP", dims: "12.19m × 2.44m × 2.59m", volume: "67 m³", bestFor: "Large storage, multi-room setups" },
  { type: "40 ft HC", dims: "12.19m × 2.44m × 2.90m", volume: "76 m³", bestFor: "Conversions requiring extra height" },
  { type: "10 ft / 8 ft", dims: "Various", volume: "Compact", bestFor: "Security cabins, kiosks" },
];

const grades = [
  { grade: "Cargo-worthy", description: "CSC-certified for sea transport, ideal for transporting goods over long distances" },
  { grade: "Wind & Water Tight (WWT)", description: "Seals intact, recommended for dry storage without leaks" },
  { grade: "One-trip", description: "Near-new condition, best for conversions due to pristine walls and floors" },
];

const officeSpecs = [
  "GI C-channel framework (75×50×2mm studs)",
  "Insulation: PUF panels (50–100mm) or Rockwool for fire resistance",
  "Interior: moisture-resistant MDF or PVC panels",
  "Vinyl or laminate flooring over marine plywood",
  "4–6 LED batten lights, 5–15A power sockets",
  "1.5–2 ton split AC points with MCB/ELCB distribution board",
  "External 32A IP44 inlet for industrial connection",
];

const specializedSolutions = [
  { title: "Container Cafés & Canteens", desc: "SS serving counters, kitchen zoning, exhaust hoods (1500 CFM), ventilation — for IT parks, colleges, and highway outlets along OMR" },
  { title: "Container Laboratories", desc: "HEPA filtration, vibration-damped benches, controlled interiors for QA facilities and testing rooms" },
  { title: "Mobile Workshops", desc: "Workbenches, tool racks, 63A genset hookups, secure storage for port and factory equipment maintenance" },
  { title: "Labour Colonies", desc: "Bunk beds, toilets, communal dining meeting ILO norms — recently supplied 40-man setup near Kattupalli" },
  { title: "Shops & Retail", desc: "Pop-up stores, kiosks, and commercial outlets from repurposed shipping containers" },
];

const techSpecs = [
  { component: "Wall thickness", spec: "1.6–2mm Corten steel" },
  { component: "Flooring", spec: "28mm marine-grade plywood (IS 710 BWR)" },
  { component: "Door hardware", spec: "4–6 locking bars with handles" },
  { component: "Ventilation", spec: "2–4 louvres (0.3 sqm total area)" },
  { component: "Anti-corrosion", spec: "Sandblasting SA2.5 + marine epoxy 120 microns DFT" },
  { component: "Insulation (PUF)", spec: "50–100mm, R-value ~5–7 m²K/W" },
  { component: "Insulation (Rockwool)", spec: "80–100 kg/m³, non-combustible A1 class" },
];

const faqs = [
  { q: "What sizes of shipping containers are available in Chennai?", a: "We supply 10 ft, 20 ft, 40 ft GP and 40 ft HC containers. Custom sizes can be fabricated. The most common lengths are 20 ft and 40 ft, designed for transporting goods over long distances." },
  { q: "How much does a used shipping container cost in Chennai?", a: "Used 20 ft containers start from approximately ₹80,000–₹1,50,000 depending on condition. 40 ft units range from ₹1,45,000–₹2,50,000. One-trip containers cost more but offer near-new condition." },
  { q: "Do you offer container rentals in Chennai?", a: "Yes. Monthly rentals include depreciation and insurance, plus one-time transport/handling and refundable security deposit. Minimum periods are typically 3–6 months with discounts for 12+ month commitments." },
  { q: "Can containers withstand Chennai's coastal climate?", a: "Absolutely. Our containers use ISO-grade Corten steel with corrosion resistance suited to Chennai's coastal salinity. We apply marine-grade epoxy coatings (120 microns DFT) and recommend 1–2m roof overhangs for monsoon protection." },
  { q: "How quickly can you deliver containers in Chennai?", a: "Bare containers dispatch within 24–72 hours. Fitted container offices take 2–4 weeks. Container homes with full interiors require 3–6 weeks from design freeze." },
  { q: "Do I need approvals for container structures in Chennai?", a: "Temporary structure permits (valid 1–3 years, renewable) may be required. Setback requirements are typically 3–5m. We guide clients on CMDA bylaws and Chennai Corporation documentation." },
  { q: "Can you convert containers into homes and cafés?", a: "Yes. We design container homes with partitioned bedrooms, pantry, attached toilets, and large sliding glass windows. Container cafés include SS counters, kitchen zoning, and exhaust hoods." },
  { q: "Which areas in Chennai do you cover?", a: "We cover all of Chennai including OMR, ECR, Ennore, Kattupalli, Sriperumbudur, Oragadam, Mahabalipuram, and surrounding industrial zones. Site visits are available for large or complex setups." },
];

export function ShippingContainerChennaiContent() {
  return (
    <div className="space-y-16">
      {/* Hero Images — 6 images in responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl overflow-hidden col-span-2 lg:col-span-2">
          <OptimizedImage
            src={resolveImageUrl(chennaiPort)}
            alt="Aerial view of Chennai Port with rows of 20 ft and 40 ft shipping containers and gantry cranes at India's eastern maritime gateway by Portable Office Cabin"
            title="Shipping containers at Chennai Port — India's eastern gateway served by Portable Office Cabin"
            productName="Shipping Container in Chennai"
            className="w-full h-auto"
            aspectRatio="16/9"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(chennaiOffice)}
            alt="White 20 ft container office with glass facade and split AC at construction site near Sriperumbudur Chennai by Portable Office Cabin"
            title="Container office at Chennai construction site — turnkey modular workspace by Portable Office Cabin"
            productName="Shipping Container in Chennai"
            className="w-full h-auto"
            aspectRatio="16/9"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(chennaiYard)}
            alt="Blue 20 ft Corten steel shipping container at Chennai storage yard ready for sale by Portable Office Cabin"
            title="Used shipping container for sale in Chennai — 20 ft Corten steel unit by Portable Office Cabin"
            productName="Shipping Container in Chennai"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(chennaiWet)}
            alt="Blue 40 ft shipping container on wet yard surface with lock rods for monsoon-resistant storage in Chennai by Portable Office Cabin"
            title="Weather-resistant 40 ft container in Chennai — monsoon-grade storage by Portable Office Cabin"
            productName="Shipping Container in Chennai"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(chennaiDock)}
            alt="Dark blue 20 ft ISO shipping container at dock with gantry cranes near Ennore Kattupalli Chennai by Portable Office Cabin"
            title="ISO container near Chennai Ennore port — cargo-worthy unit by Portable Office Cabin"
            productName="Shipping Container in Chennai"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
      </div>

      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Shipping Containers in Chennai — Sales, Rentals & Modular Conversions
        </h2>
        <p className="text-muted-foreground mb-4">
          Chennai's position as India's eastern maritime gateway has driven remarkable demand for shipping containers across the region. With Chennai Port achieving a record 1.83 million TEUs by early 2026 and industrial belts like Sriperumbudur and Oragadam expanding rapidly, businesses need reliable storage solutions and modular construction options. IT parks along OMR, construction projects near Ennore, and logistics hubs around Kattupalli all require standardized metal containers for diverse applications.
        </p>
        <p className="text-muted-foreground mb-4">
          Portable Office Cabin supplies shipping containers for storage, offices, and modular buildings across Chennai. We serve both B2B clients — project developers, manufacturers, logistics firms — and B2C customers seeking container homes or farm houses. Our coverage extends to Ennore, Kattupalli, and surrounding industrial zones with quick delivery and turnkey solutions.
        </p>
      </section>

      {/* Highlights */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Choose Shipping Containers in Chennai?
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

      {/* Sizes Table */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Available Sizes & Types
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Type</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">External Dimensions</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Internal Volume</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Best For</th>
              </tr>
            </thead>
            <tbody>
              {sizeTable.map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.type}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.dims}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.volume}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grades */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Container Grades Available
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {grades.map((g) => (
            <Card key={g.grade} className="border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-2">{g.grade}</h3>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Every used container undergoes inspection for Corten steel integrity, door alignment, locking bars, floor condition, and rust treatment before sale. Used 20 ft containers start from approximately ₹80,000 in Chennai.
        </p>
      </section>

      {/* Rentals */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Container Rentals in Chennai — Short-Term & Long-Term
        </h2>
        <p className="text-muted-foreground mb-4">
          Rental containers serve temporary site storage, equipment rooms for metro rail works, seasonal warehousing near Chennai Port, and construction projects along OMR/ECR. Rentals can reduce logistics costs by 20–30% compared to buying for short-term needs.
        </p>
        <ul className="space-y-2 mb-4">
          {[
            "20 ft and 40 ft GP/HC units available",
            "Minimum rental periods: typically 3–6 months",
            "Discounts available for 12+ month commitments",
            "Delivery via flatbed trucks with Hydra crane placement",
            "Optional add-ons: padlock hasps, louvered vents, LED lighting",
            "Pricing: monthly rental + one-time transport/handling + refundable deposit",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <IndianRupee className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Container Offices */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Container Offices & Prefab Site Cabins
        </h2>
        <p className="text-muted-foreground mb-4">
          We convert standard shipping containers into fully finished office cabins for construction sites, corporate backup offices, and industrial plants. These turnkey solutions arrive ready for immediate use, cutting setup time from months to weeks.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Internal Specifications</h3>
            <ul className="space-y-2">
              {officeSpecs.map((spec) => (
                <li key={spec} className="flex items-start gap-2">
                  <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{spec}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Common Chennai Layouts</h3>
            <ul className="space-y-2">
              {[
                "20 ft single cabin (12–15 sqm)",
                "40 ft multi-room office (2–3 partitioned spaces)",
                "40 ft site office with attached meeting room",
                "Stackable double-storey via twistlock corner fittings",
                "Project manager offices and QA/QC labs",
              ].map((layout) => (
                <li key={layout} className="flex items-start gap-2">
                  <Building2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{layout}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Homes & Cafés */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Container Homes, Farm Houses & Rooftop Conversions
        </h2>
        <p className="text-muted-foreground mb-4">
          Shipping containers now serve as residential and leisure spaces across Chennai — farm houses along ECR, weekend homes near Mahabalipuram, and rooftop studios in urban areas. Available in 20×10 ft and 40×10 ft formats with scope for decks, verandahs, pergolas, and roof overhangs.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "70–80% faster", desc: "Installation vs. brick construction" },
            { label: "Full relocatability", desc: "Move via crane to new site" },
            { label: "Lower material waste", desc: "Reuse existing steel containers" },
            { label: "Premium finishes", desc: "Double-glazed low-E glass, SS sinks" },
          ].map((b) => (
            <div key={b.label} className="p-4 bg-muted/30 rounded-lg text-center">
              <div className="font-bold text-foreground mb-1">{b.label}</div>
              <div className="text-sm text-muted-foreground">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Specialized Solutions */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Specialized Container Solutions in Chennai
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specializedSolutions.map((sol) => (
            <Card key={sol.title} className="border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-2">{sol.title}</h3>
                <p className="text-sm text-muted-foreground">{sol.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Technical Specs */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Technical Specifications & Quality Standards
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Component</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Specification</th>
              </tr>
            </thead>
            <tbody>
              {techSpecs.map((row, i) => (
                <tr key={row.component} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.component}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Optional add-ons: HVAC systems, solar panels, security grills, ABC fire extinguishers, and data cabling provisions.
        </p>
      </section>

      {/* Delivery & Installation */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Delivery, Installation & Approvals in Chennai
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Site Survey Process</h3>
            <ul className="space-y-2">
              {[
                "Assess approach roads (minimum 4–6m width)",
                "Confirm crane/Hydra access requirements",
                "Identify placement location and foundation blocks (150mm concrete)",
                "Check gradient (ideal <1:10)",
              ].map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Installation Timelines</h3>
            <ul className="space-y-2">
              {[
                "Bare containers: Same-day to 48 hours",
                "Fitted container offices: 2–4 weeks",
                "Container homes with full interiors: 3–6 weeks",
                "Setback requirements: typically 3–5m",
                "Temporary permits valid 1–3 years (renewable)",
              ].map((timeline) => (
                <li key={timeline} className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{timeline}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Areas We Serve in Chennai
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            "Chennai Port & Harbour",
            "Ennore & Kattupalli",
            "OMR (Old Mahabalipuram Road)",
            "ECR (East Coast Road)",
            "Sriperumbudur",
            "Oragadam",
            "Mahabalipuram",
            "North & South Chennai",
          ].map((area) => (
            <div key={area} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <MapPin className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm text-foreground font-medium">{area}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Why Choose Portable Office Cabin in Chennai?
        </h2>
        <ul className="space-y-3">
          {[
            "In-house design team with CAD capabilities — not a broker or trader",
            "Dedicated fabrication facility with QC protocols and on-time completion",
            "Experience across industrial, educational, and government segments in Chennai",
            "Container offices for major construction firms, prefab school rooms, warehouse offices",
            "Turnkey service including maintenance, relocation support, and future upgrades",
            "Solutions reuse shipping containers, reduce on-site waste, and deliver projects faster",
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

      {/* How to Get a Quote */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          How to Get a Quote
        </h2>
        <p className="text-muted-foreground mb-4">Share these details for a customized quotation within 24 hours:</p>
        <ul className="space-y-2 mb-4">
          {[
            "Intended use (storage, office, home, café, workshop, lab)",
            "Required size (20 ft, 40 ft, HC, or custom)",
            "Buy vs. rent preference and duration",
            "Site location and project timeline",
            "Any specific features or modifications needed",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 rounded-xl p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Ready to Secure Your Shipping Container in Chennai?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Contact Portable Office Cabin today for competitive quotes on sales, rentals, or turnkey container construction. Our team delivers the ideal solution for storage, offices, homes, cafés, and labour accommodation across Chennai, Ennore, Kattupalli, OMR, ECR, Sriperumbudur, and Oragadam.
        </p>
      </section>
    </div>
  );
}
