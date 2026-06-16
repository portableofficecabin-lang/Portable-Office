import { CheckCircle, Factory, Truck, Shield, Thermometer, Recycle, Building, MapPin, Wrench } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import narsapuraYard from "@/assets/products/shipping-container-narsapura-yard.webp";
import narsapuraSite from "@/assets/products/shipping-container-narsapura-site.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  { icon: Truck, title: "7–15 Day Delivery", desc: "Fast dispatch from our Bengaluru fabrication facility to Narsapura Industrial Area" },
  { icon: Factory, title: "KIADB Plot Ready", desc: "Customized for KIADB plot specifications with minimal site preparation on PCC pads" },
  { icon: Shield, title: "Corten Steel Build", desc: "350 MPa yield strength with anti-corrosive epoxy paint for Kolar's climate" },
  { icon: Thermometer, title: "Climate Resistant", desc: "Handles 37°C summer peaks and heavy monsoon rains better than temporary alternatives" },
  { icon: Recycle, title: "70% Lower Carbon", desc: "Container reuse cuts embodied carbon versus new RCC builds; solar-ready rooftops" },
  { icon: Building, title: "30–50% Cost Savings", desc: "Lower investment compared to permanent RCC structures for industrial operations" },
  { icon: MapPin, title: "Narsapura & Beyond", desc: "Coverage across Vemgal, Malur, Hoskote, and the NH-75 industrial corridor" },
  { icon: Wrench, title: "End-to-End Service", desc: "Design, fabrication, delivery, installation, and post-installation support" },
];

const containerTypes = [
  ["20 ft Dry Container", "6.06m × 2.44m × 2.59m", "160 sq ft usable", "Storage, compact offices"],
  ["40 ft Dry Container", "12.19m × 2.44m × 2.59m", "320 sq ft usable", "Large storage, multi-room setups"],
  ["40 ft High Cube", "12.19m × 2.44m × 2.90m", "9'6\" ceiling height", "Vertical racking, tall equipment"],
  ["Reefer Container", "20/40 ft", "-20°C to +20°C", "Pharma cold chain, food processing"],
  ["Open-Top / Flat-Rack", "Various", "Custom", "Oversized machinery, die-sets"],
  ["Custom Modified", "10–40 ft", "Partitioned layouts", "Office + storage combos, roller shutters"],
];

const pricingRows = [
  ["New 20 ft container", "₹2,00,000 – ₹2,80,000"],
  ["New 40 ft container", "₹3,50,000 – ₹4,80,000"],
  ["Used 20 ft (CSC recertified)", "₹95,000 – ₹1,50,000"],
  ["Used 40 ft (CSC recertified)", "₹1,50,000 – ₹2,20,000"],
  ["Refurbished conversion (20 ft)", "₹1,40,000 – ₹2,00,000"],
  ["Container office fit-out (20 ft)", "₹2,50,000 – ₹3,50,000"],
];

const industries = [
  "Automotive & auto-ancillary units (Honda, Volvo, Lumax corridor)",
  "Engineering & fabrication units along NH-75",
  "FMCG, e-commerce & warehouse operators",
  "Construction firms during plant expansion",
  "Educational & training institutes",
  "Logistics parks matching IndoSpace specifications",
];

const solutions = [
  "Storage containers — raw materials, finished goods, engineering parts",
  "Container offices — admin blocks with full electrical fit-outs",
  "Portable cabins — single or multi-room project management layouts",
  "Prefab labour colonies — multi-bed dormitories with sanitary facilities",
  "Container homes — staff housing for plant personnel",
  "Container cafés & canteens — hygiene-standard food courts",
  "Portable toilets — Indian/Western WC with septic connectivity",
  "Security cabins — 10 ft guard rooms with 360° view windows",
  "Rooftop shed integrations — solar-ready configurations",
];

const faqs = [
  { q: "What shipping container sizes are available for Narsapura Industrial Area?", a: "We supply 10 ft, 20 ft, 40 ft GP, and 40 ft High Cube containers — both new and used. Custom-built units with partitions, roller shutters, and PUF insulation are also available for KIADB plots." },
  { q: "How quickly can you deliver containers to Narsapura?", a: "Bare containers dispatch within 7–10 working days from our Bengaluru facility. Customized container offices and fitted units take 10–15 working days depending on scope." },
  { q: "Do you supply used shipping containers for Narsapura factories?", a: "Yes. We stock CSC-recertified used containers that are rust-treated and repainted. Used 20 ft units start around ₹95,000 and offer 10–15 years of extended service life for storage and utility applications." },
  { q: "Can containers be relocated within Narsapura or to other industrial areas?", a: "Absolutely. Containers retain 80% material value and can be shifted within the same campus or relocated to Malur, Hoskote, or other KIADB zones as operations grow." },
  { q: "What foundation is needed for container placement on KIADB plots?", a: "Simple PCC pads or concrete blocks at the four corners are sufficient. No deep foundations or extensive site preparation is required, enabling rapid deployment." },
  { q: "Do you provide container offices with AC and electrical fit-outs?", a: "Yes. Our container offices include PUF/Rockwool insulation, UPVC windows, LED lighting, split AC provisions, IS 732-compliant wiring, and modular workstation layouts." },
  { q: "What industries do you serve in the Narsapura cluster?", a: "We serve automotive OEMs, engineering firms, FMCG warehouses, logistics operators, construction companies, and educational institutes across Narsapura, Vemgal, Malur, and Hoskote." },
  { q: "How do I get a quote for shipping containers in Narsapura?", a: "Contact Portable Office Cabin via phone, email, or our website form. Share your site location, intended use, required sizes, expected delivery date, and any special features needed. We typically respond within 24 hours." },
];

export function ShippingContainerNarsapuraContent() {
  return (
    <div className="space-y-16">
      {/* Hero Images */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OptimizedImage
            src={resolveImageUrl(narsapuraYard)}
            alt="Stacked 20 ft and 40 ft shipping containers at Narsapura Industrial Area yard near NH-75 Kolar by Portable Office Cabin"
            title="Shipping container yard at Narsapura Industrial Area — storage and office containers by Portable Office Cabin"
            productName="Shipping Container in Narsapura Industrial"
            aspectRatio="16/9"
          />
          <OptimizedImage
            src={resolveImageUrl(narsapuraSite)}
            alt="Container office cabins with LED lighting at KIADB Narsapura construction site with workers in safety vests by Portable Office Cabin"
            title="Container site offices at Narsapura KIADB plot — prefabricated modular cabins by Portable Office Cabin"
            productName="Shipping Container in Narsapura Industrial"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Introduction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Shipping Container Solutions for Narsapura Industrial Area
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Narsapura Industrial Area, located approximately 55 kilometres east of Bengaluru along NH-75, has emerged as a critical hub for logistics, manufacturing, and warehousing in Karnataka. With major players like Honda's largest two-wheeler plant, Volvo, and Lumax operating in this KIADB-notified zone, the demand for flexible infrastructure solutions continues to grow rapidly.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Portable Office Cabin supplies and customizes shipping containers for factories, warehouses, and project sites across Narsapura Industrial Area and surrounding clusters including Vemgal, Malur, and Hoskote. Whether you need storage for raw materials, container offices for OEM administration, worker accommodation, or temporary site facilities during plant construction, our shipping container products serve as practical alternatives to traditional RCC structures.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Contact Portable Office Cabin directly — a trusted manufacturer who understands your industrial requirements — for fast delivery from our Bengaluru fabrication facility within 7–15 working days, customization for KIADB plot specifications, and end-to-end services from design to installation.
        </p>
      </section>

      {/* Highlights Grid */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Why Shipping Containers for Narsapura Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((h, i) => (
            <div key={i} className="border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
              <h.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{h.title}</h3>
              <p className="text-sm text-muted-foreground">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products & Solutions */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Our Container Products & Modular Solutions</h2>
        <p className="text-muted-foreground mb-4">
          Portable Office Cabin manufactures and supplies new and converted ISO shipping containers from 10 ft to 40 ft, customized specifically for industrial use in Narsapura.
        </p>
        <ul className="space-y-2">
          {solutions.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{s}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4">
          Customers in Narsapura commonly request 20 ft containers (160 sq ft usable) for tight KIADB plots and 40 ft units (320 sq ft) for large warehouse operations. All units arrive fully finished, ready for on-site power and water hookups.
        </p>
      </section>

      {/* Container Types Table */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Types of Shipping Containers Available</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3 text-left font-semibold">Container Type</th>
                <th className="border border-border p-3 text-left font-semibold">Dimensions</th>
                <th className="border border-border p-3 text-left font-semibold">Capacity / Feature</th>
                <th className="border border-border p-3 text-left font-semibold">Best For</th>
              </tr>
            </thead>
            <tbody>
              {containerTypes.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-border p-3 text-muted-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Container Offices Section */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Container Offices & Site Infrastructure</h2>
        <p className="text-muted-foreground mb-4">
          Industrial plots in Narsapura utilize container offices and portable cabins during plant construction phases, often retaining them as permanent admin or utility blocks afterward.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Container Office Specifications</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• GI C-channel framework (75×50×2mm studs)</li>
              <li>• PUF panels (50–100mm) or Rockwool insulation</li>
              <li>• Moisture-resistant MDF or PVC wall paneling</li>
              <li>• Vinyl or laminate flooring over marine plywood</li>
              <li>• UPVC windows and powder-coated MS doors</li>
              <li>• LED lighting and IS 732-compliant wiring</li>
              <li>• Split AC provisions (1.5–2 ton)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Common Narsapura Layouts</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 20 ft single cabin (100–150 sq ft) — project manager offices</li>
              <li>• 40 ft multi-room office (2–3 partitions) — engineering rooms</li>
              <li>• 40 ft site office with attached meeting room</li>
              <li>• 10 ft security cabins with 360° view windows</li>
              <li>• Stackable double-storey setups via twistlock fittings</li>
              <li>• Labour dormitories (8–12 bunks) with sanitary blocks</li>
              <li>• Prefab canteen units with SS counters and ventilation</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Fabrication & Customization */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Design, Fabrication & Customization</h2>
        <p className="text-muted-foreground mb-4">
          Portable Office Cabin handles design, engineering, fabrication, painting, and on-site installation from our prefabrication facility in Karnataka.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Materials & Build Quality</h3>
            <p className="text-sm text-muted-foreground">Corten steel (350 MPa yield strength), anti-corrosive epoxy paints, Rockwool/PUF insulation (thermal conductivity 0.02 W/mK), fire-resistant panels conforming to BS 476 Class 1.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Customization Options</h3>
            <p className="text-sm text-muted-foreground">Doors, windows, internal partitions, mezzanine racks (up to 30% floor addition), electrical points, data cabling, AC cut-outs, rooftop integrations, and company branding.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">KIADB Plot Design Support</h3>
            <p className="text-sm text-muted-foreground">Layout planning according to KIADB plot dimensions, vehicle circulation paths, and utility connection points for efficient yard management.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Sustainability</h3>
            <p className="text-sm text-muted-foreground">Container reuse cuts embodied carbon by 70% versus new builds. Solar-ready rooftop configurations available for ESG-compliant operations.</p>
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Indicative Pricing — Narsapura 2026</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3 text-left font-semibold">Configuration</th>
                <th className="border border-border p-3 text-left font-semibold">Price Range (Ex-Works)</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                  <td className="border border-border p-3 text-muted-foreground">{row[0]}</td>
                  <td className="border border-border p-3 text-muted-foreground font-medium">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">* Prices are indicative ex-works; GST & transport extra. Volume discounts available for large Narsapura campus orders.</p>
      </section>

      {/* Industries Served */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Industries We Serve in Narsapura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {industries.map((ind, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{ind}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery & Installation */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Delivery, Installation & Relocation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Delivery & Placement</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Truck trailer delivery from Bengaluru to Narsapura (55 km)</li>
              <li>• Hydra/crane unloading with safe lifting point alignment</li>
              <li>• Simple PCC pad or concrete block foundation</li>
              <li>• Coordination for 3-phase electrical, plumbing, and drainage</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Relocation Support</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Shift containers within campus or to Malur, Hoskote</li>
              <li>• Retain 80% material value during relocation</li>
              <li>• Bare containers: same-day to 48 hours placement</li>
              <li>• Fitted container offices: 2–4 weeks turnaround</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Service Area Coverage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {["Narsapura Industrial Area", "Vemgal Industrial Area", "Malur", "Hoskote", "Kolar", "KIADB Narsapura", "Bengaluru East", "NH-75 Corridor"].map((area, i) => (
            <div key={i} className="bg-primary/10 rounded-lg p-3 text-center">
              <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
              <span className="text-sm font-medium text-foreground">{area}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Get a Quote for Shipping Containers in Narsapura
        </h2>
        <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
          Share your site location, intended use, required sizes, expected delivery date, and any special features. We provide site visits for large or complex setups across Narsapura, Vemgal, Malur, and Hoskote.
        </p>
        <p className="text-sm text-muted-foreground">
          Contact Portable Office Cabin today — initial consultation → layout suggestion → itemized quotation → fabrication → delivery and installation.
        </p>
      </section>
    </div>
  );
}
