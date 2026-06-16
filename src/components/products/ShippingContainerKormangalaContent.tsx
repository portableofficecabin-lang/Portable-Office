import shippingContainerCrane from "@/assets/products/shipping-container-kormangala-crane.webp";
import shippingContainerCafe from "@/assets/products/shipping-container-kormangala-cafe.webp";
import shippingContainerOffice from "@/assets/products/shipping-container-kormangala-office.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Container, Home, ShieldCheck, Truck, Warehouse, Wrench, MapPin } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  { icon: Container, title: "20 ft & 40 ft ISO stock", description: "Standard and high-cube containers available for offices, cafés, storage, and labour accommodation in Koramangala." },
  { icon: MapPin, title: "Koramangala delivery", description: "Same-week delivery for standard units within Koramangala — 1st to 8th Block, HSR Layout, Ejipura, and Domlur." },
  { icon: Home, title: "Homes, cafés & rooftop", description: "Container homes, rooftop cafés, studios, and modular retail structures with PUF insulation and acoustic treatment." },
  { icon: Truck, title: "Rental & purchase", description: "Flexible options — rent from ₹5,000/month or purchase with full customization and relocation freedom." },
];

const containerTypes = [
  { type: "20 ft Standard", dimensions: "20' × 8' × 8.6'", volume: "~33 m³", use: "Compact offices, security, storage" },
  { type: "40 ft Standard", dimensions: "40' × 8' × 8.6'", volume: "~67 m³", use: "Multi-workstation offices, cafés" },
  { type: "High Cube", dimensions: "9.6 ft height", volume: "Extra headroom", use: "Offices & cafés needing false ceilings or HVAC" },
];

const grades = [
  { grade: "Cargo-Worthy", description: "Minor dents, suitable for basic storage and short-term use." },
  { grade: "Wind & Watertight (WWT)", description: "Sealed against elements — ideal for site offices and accommodation." },
  { grade: "Refurbished / One-Trip", description: "Sandblasted and repainted for long-term offices, homes, and cafés." },
  { grade: "Special Types", description: "Open-top, flat rack, and refrigerated reefers on indent for industrial and F&B clients." },
];

const officeSpecs = [
  "Insulated PUF panels (50–100 mm) on walls and roof",
  "UPVC or aluminium sliding windows",
  "Modular workstations for 4–12 people",
  "LED lighting, concealed wiring, vinyl flooring",
  "Split AC provisions (1.5–2 ton capacity)",
  "Conference cabins, manager rooms, server niches, reception & pantries",
];

const lifestyleFeatures = [
  "Container homes: bedroom, kitchenette, toilet, and balcony cutouts for urban plots",
  "Container cafés: serving counters, 20–30 seat layouts, exhaust hoods, branding exteriors",
  "Rooftop structures: office extensions, gyms, studios on existing RCC buildings",
  "75 mm PUF insulation, acoustic treatment up to 40 dB reduction",
  "Weatherproof paints with UV inhibitors and drainage planning",
];

const labourFeatures = [
  "Cross-ventilation via louvered vents",
  "Bunk layouts sleeping 8–12 per 20 ft unit",
  "Industrial PVC flooring and easy-clean wall finishes",
  "Integrated electrical fittings with MCB protection",
  "Security guard cabins, portable toilets with bio-digesters, prefab canteens",
];

const storageFeatures = [
  "Multi-point deadbolt locks (5000N shear rating)",
  "Optional galvanized shelving (200 kg/m² capacity)",
  "Anti-rust epoxy coatings",
  "Basic ventilation and LED lighting",
  "Yard layout planning with driveways and loading clearance",
];

const rentalVsPurchase = [
  ["Factor", "Purchase", "Rental"],
  ["Best for", "Long-term use, customization, relocation", "Short-term projects, events, renovations"],
  ["Duration", "18+ months", "3–36 months"],
  ["Cost (20 ft)", "₹40,000–₹1,00,000 (used)", "₹5,000–₹8,000/month"],
  ["Customization", "Full flexibility", "Limited"],
];

const pricingRows = [
  ["New container (20 ft–40 ft)", "₹1,50,000 – ₹5,00,000"],
  ["Used container (20 ft–40 ft)", "₹50,000 – ₹2,00,000"],
  ["Container office (fitted)", "₹1,80,000 – ₹5,50,000+"],
  ["Container café / home", "₹2,50,000 – ₹8,00,000+"],
  ["Rental (20 ft basic)", "₹5,000 – ₹8,000/month"],
];

const strengths = [
  "Marine-grade steel and PIR insulation for 20-year durability",
  "Experience across site offices, labour colonies, container homes, cafés, guard cabins, and portable toilets",
  "Karnataka-based operations for quicker site visits and after-sales support",
  "Sustainability: 90% container reuse, minimal debris versus brick-and-mortar",
  "Flexibility for homeowners, corporate offices, construction firms, and government bodies",
];

const faqs = [
  { q: "What types of shipping containers are available in Koramangala?", a: "We supply 20 ft, 40 ft, and high-cube containers in cargo-worthy, WWT, and refurbished grades — suitable for offices, cafés, storage, homes, and labour accommodation." },
  { q: "How much does a shipping container cost in Koramangala?", a: "New containers range from ₹1.5–5 lakhs; used containers from ₹50,000–₹2 lakhs. Fitted container offices start around ₹1.8 lakhs. Rental starts at ₹5,000/month for 20 ft units." },
  { q: "Can I rent a shipping container in Koramangala?", a: "Yes. Rental is available for 3–36 month periods, including maintenance. Rental avoids upfront transport costs and pays back versus purchase in 18–24 months at 70% utilization." },
  { q: "Do you deliver to Koramangala's narrow lanes?", a: "Yes. We use 20/32 ft multi-axle trucks and hydra/crane trucks for placement. Our team coordinates timing (9 AM–6 PM) and provides AutoCAD drawings for local approvals." },
  { q: "Can a shipping container be converted into a café or home?", a: "Absolutely. We fabricate container cafés with serving counters, seating for 20–30, exhaust hoods, and branding. Container homes include bedrooms, kitchenettes, toilets, and balcony cutouts." },
  { q: "What permissions are needed for a container in Koramangala?", a: "Commercial cafés, offices, and rooftop containers may require BBMP/BDA approvals. We provide 1:50 scale AutoCAD drawings to support your application." },
  { q: "How quickly can you deliver a container to Koramangala?", a: "Standard in-stock units deliver within 3–7 days. Custom-fitted container offices take 12–20 days including fabrication." },
  { q: "Can containers be placed on rooftops in Koramangala?", a: "Yes, after structural load checks on the existing RCC building. We supply rooftop offices, gyms, studios, and cafés with proper waterproofing and drainage." },
];

export function ShippingContainerKormangalaContent() {
  return (
    <div className="space-y-16">
      {/* Hero images */}
      <section className="space-y-8">
        <div className="grid gap-5 md:grid-cols-3">
          <OptimizedImage src={resolveImageUrl(shippingContainerCrane)} alt="Shipping container being lifted by crane at Koramangala construction site by Portable Office Cabin" productName="Shipping Container in Kormangala" aspectRatio="16/10" className="rounded-3xl border border-border" priority />
          <OptimizedImage src={resolveImageUrl(shippingContainerCafe)} alt="Container café with rooftop seating and string lights in Koramangala Bangalore by Portable Office Cabin" productName="Shipping Container in Kormangala" aspectRatio="16/10" className="rounded-3xl border border-border" priority />
          <OptimizedImage src={resolveImageUrl(shippingContainerOffice)} alt="Modern grey shipping container office with glass sliding doors in Koramangala by Portable Office Cabin" productName="Shipping Container in Kormangala" aspectRatio="16/10" className="rounded-3xl border border-border" priority />
        </div>

        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Koramangala Local Guide</span>
          </div>
          <h2 className="mb-5 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Shipping Container in Koramangala — Office, Café, Home & Storage
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
            Koramangala (560034) has become one of Bengaluru's most dynamic neighbourhoods for startups, IT firms, and retail ventures. With high rental costs averaging ₹100–200 per sq ft and ongoing redevelopment along 80 Feet Road, Inner Ring Road, and nearby Ejipura, HSR Layout, and Domlur, businesses are searching for cost-effective alternatives.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Portable Office Cabin is a Bengaluru-based manufacturer and supplier of prefabricated and modular building solutions. We serve both B2B and B2C customers with new and used containers — from compact storage units to fully fitted container offices, cafés, homes, and rooftop structures.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <item.icon className="mb-3 h-7 w-7 text-accent" />
              <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Container types */}
      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Container sizes available in Koramangala</h3>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Dimensions</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Volume</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {containerTypes.map((item, i) => (
                <tr key={item.type} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 font-medium text-foreground">{item.type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.dimensions}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.volume}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grades */}
      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Container grades & conditions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {grades.map((item) => (
            <div key={item.grade} className="rounded-2xl border border-border bg-card p-6">
              <h4 className="mb-2 font-semibold text-foreground">{item.grade}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Container offices */}
      <section className="rounded-3xl border border-border bg-card p-8">
        <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Container offices in Koramangala</h3>
        <p className="mb-5 text-muted-foreground">
          Container offices address the stress of high commercial rents while providing rapid deployment. Startups near Forum Mall, project sites across Koramangala 1st–8th Block, and sales offices along Sarjapur Road are choosing this route — 50–70% cost savings over traditional construction.
        </p>
        <div className="space-y-3">
          {officeSpecs.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Homes, cafés & rooftop */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Container homes, cafés & rooftop structures</h3>
          <div className="space-y-3">
            {lifestyleFeatures.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Home className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Labour accommodation & site infrastructure</h3>
          <div className="space-y-3">
            {labourFeatures.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Warehouse className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="rounded-3xl border border-border bg-card p-8">
        <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Portable storage & warehousing</h3>
        <p className="mb-5 text-muted-foreground">
          Retailers, e-commerce sellers, and event companies in Koramangala use containers as secure on-site storage — stocking retail inventory in 5th–7th Block shops, storing event equipment, and securing construction materials.
        </p>
        <div className="space-y-3">
          {storageFeatures.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rental vs Purchase */}
      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Rental vs purchase: what suits Koramangala customers?</h3>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                {rentalVsPurchase[0].map((h) => (
                  <th key={h} className="px-5 py-4 text-left font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentalVsPurchase.slice(1).map((row, i) => (
                <tr key={row[0]} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 font-medium text-foreground">{row[0]}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row[1]}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Rental avoids upfront transport costs (₹20,000–₹50,000) and includes maintenance. Purchase pays back in 18–24 months at 70% utilization.
        </p>
      </section>

      {/* Pricing */}
      <section className="space-y-6">
        <div>
          <h3 className="mb-2 font-display text-2xl font-bold text-foreground">Pricing & costs in Koramangala</h3>
          <p className="text-muted-foreground">Prices vary by size, condition, and fit-out level. Here are indicative 2026 benchmarks:</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Indicative Price</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map(([type, price], i) => (
                <tr key={type} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 text-foreground">{type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delivery & Installation */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Delivery & installation in Koramangala</h3>
          <div className="space-y-4 text-muted-foreground">
            <p><strong className="text-foreground">Delivery:</strong> 20/32 ft multi-axle trucks from Bengaluru yards; 3–7 days for in-stock units.</p>
            <p><strong className="text-foreground">Installation:</strong> Hydra or crane trucks; placement on concrete blocks or steel supports; levelling and fit-out checks.</p>
            <p><strong className="text-foreground">Permissions:</strong> Commercial cafés, offices, and rooftop containers may require BBMP/BDA approvals — we provide AutoCAD drawings (1:50 scale).</p>
            <p><strong className="text-foreground">Timing:</strong> Daytime installation (9 AM–6 PM) to comply with noise bylaws.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Why choose Portable Office Cabin</h3>
          <div className="space-y-3">
            {strengths.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & compliance */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Security measures</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>Each container is equipped with high-security locking systems. GPS tracking can be installed for monitoring movement and preventing unauthorized access.</p>
            <p>Strict protocols ensure only authorized personnel access your container — minimizing risk for valuable goods and sensitive items.</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Certification & compliance</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>Containers manufactured in accordance with international ISO standards including ISO 9001:2015 and ISO 39001:2012.</p>
            <p>Clear documentation and guidance provided for project compliance — portable offices, storage units, and site accommodation.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
