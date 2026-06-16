import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Ship, Shield, Box, Truck, Thermometer, Building2, Users, Coffee, Lock, Wrench, Globe, CheckCircle2, ArrowRight } from "lucide-react";
import cargoShippingMain from "@/assets/products/cargo-shipping-container-main.webp";
import cargoShippingPort from "@/assets/products/cargo-shipping-container-port.webp";
import cargoShippingYard from "@/assets/products/cargo-shipping-container-yard.webp";
import cargoShippingWorkers from "@/assets/products/cargo-shipping-container-workers.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const containerSizes = [
  { size: "20 ft GP", external: "6.058 × 2.438 × 2.591 m", volume: "~33 m³ (1 TEU)", tare: "2,200 kg", payload: "28,280 kg" },
  { size: "40 ft GP", external: "12.192 × 2.438 × 2.591 m", volume: "~67 m³ (2 TEU)", tare: "3,800 kg", payload: "28,700 kg" },
  { size: "40 ft HC", external: "12.192 × 2.438 × 2.896 m", volume: "~76 m³", tare: "4,800 kg", payload: "27,700 kg" },
];

const containerTypes = [
  { icon: Box, title: "Dry Storage (GP)", desc: "Standard corrugated steel for general cargo — consumer goods, textiles, machinery, electronics" },
  { icon: Ship, title: "High Cube", desc: "30 cm extra height for bulky cargo or conversion projects needing ceiling clearance" },
  { icon: Thermometer, title: "Reefer (Refrigerated)", desc: "Temperature control from -30°C to +30°C for perishables, pharmaceuticals, vaccines" },
  { icon: Truck, title: "Open Top", desc: "Tarpaulin covers for tall project cargo — timber, machinery, steel coils requiring crane loading" },
  { icon: Shield, title: "Flat Rack", desc: "Collapsible or fixed ends for oversized loads — turbines, vehicles, heavy machinery up to 60 tons" },
  { icon: Lock, title: "Tank Container", desc: "Stainless steel tanks for liquid cargo — chemicals, food-grade liquids, gases (21,000–26,000 L)" },
];

const conditionGrades = [
  { grade: "One-trip (New)", desc: "Single voyage from factory", bestFor: "High-end conversions, homes" },
  { grade: "Cargo-worthy (CW)", desc: "Certified for international shipping", bestFor: "Continued freight use" },
  { grade: "Wind-and-water-tight (WWT)", desc: "Structurally sound, no longer CSC certified", bestFor: "Modular buildings, storage" },
  { grade: "As-is", desc: "May have damage or rust", bestFor: "Budget storage only" },
];

const faqs = [
  { q: "What are the most common container sizes?", a: "The 20 ft (33 m³, 1 TEU) and 40 ft (67 m³, 2 TEU) containers dominate global trade. The 40 ft High Cube (76 m³) provides extra height for bulky cargo or conversion projects." },
  { q: "How long does a cargo shipping container last?", a: "In active shipping, containers typically serve 10–15 years and travel approximately 500,000 km. Converted to buildings with proper maintenance—repainting every 5–7 years, floor recoating, rust treatment—they can last 25–50 years." },
  { q: "What maintenance do containers require?", a: "Shipping containers need CSC re-inspection every 30 months. Building conversions require periodic exterior repainting (marine-grade paint), floor surface maintenance, and seal checks on doors and windows." },
  { q: "Can containers be stacked safely on-site?", a: "Yes. Shipping containers stack up to 9 high on ships using twistlocks. For building applications, properly engineered foundations and connections allow 3–6 level stacking depending on structural analysis." },
  { q: "What approvals are needed for container buildings in India?", a: "Container structures require local building permissions from the municipal corporation or panchayat. NBC Part 4 mandates 2-hour fire rating for certain occupancy types. Electrical installations must comply with IS 1642 standards." },
  { q: "How do you make containers comfortable in hot climates?", a: "Insulation is critical—100 mm PIR panels achieve U-values of 0.25 W/m²K. Additional strategies include green roofs, shading canopies, evaporative coolers (achieving 15–20°C drops), and light-coloured exterior finishes to reduce solar gain." },
  { q: "How quickly can Portable Office Cabin deliver a container office?", a: "Standard container offices and portable cabins take 2–4 weeks from order confirmation. Complex multi-unit configurations or customized interiors may require 4–6 weeks depending on specifications." },
];

export function CargoShippingContainerContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          Cargo Shipping Container: Types, Sizes, Uses & Modular Conversions
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              The cargo shipping container is one of the most transformative inventions in the history of global trade. On April 23, 1956, Malcolm McLean's SS Ideal X departed Newark, New Jersey, carrying 58 aluminum truck bodies—the earliest commercial shipping containers—bound for Houston, Texas. That single voyage slashed loading costs from $5.86 per ton to just 16 cents and set the stage for a logistics revolution.
            </p>
            <p>
              By 1968–1970, the International Organization for Standardization (ISO) had established standards under ISO 668 for dimensions and ISO 6346 for identification codes. Today, over 90% of non-bulk cargo worldwide moves in these standardized steel boxes, predominantly 20-foot and 40-foot units stacked aboard massive vessels and hauled across continents by rail and truck.
            </p>
            <p>
              At Portable Office Cabin, we work with ISO containers for both freight purposes and prefabricated conversions—transforming these rugged structures into offices, homes, labour colonies, and site facilities across India.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-md">
            <OptimizedImage
              src={resolveImageUrl(cargoShippingMain)}
              alt="Cargo shipping container at Indian port yard — 20ft ISO container with Corten steel construction by Portable Office Cabin"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Quick Answer */}
      <section className="bg-accent/5 rounded-2xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-accent" />
          Quick Answer: Choosing the Right Cargo Shipping Container
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { need: "General cargo (textiles, machinery, consumer goods)", rec: "20 ft or 40 ft dry storage containers" },
            { need: "Perishable goods (food, pharmaceuticals, flowers)", rec: "Refrigerated containers (-30°C to +30°C)" },
            { need: "Oversized or heavy goods (turbines, vehicles)", rec: "Flat rack or open top containers" },
            { need: "Liquid or chemical shipment", rec: "Tank containers with stainless steel linings" },
            { need: "On-site office space", rec: "Converted 20 ft or 40 ft with insulation and MEP" },
            { need: "Labour housing near project sites", rec: "Prefab container accommodation in 40 ft HC units" },
          ].map((item, i) => (
            <div key={i} className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-foreground">{item.need}</p>
              <p className="text-sm text-accent mt-1 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> {item.rec}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Standard containers share an 8 ft (2.44 m) width. Heights are either 8 ft 6 in (2.59 m) for standard units or 9 ft 6 in (2.89 m) for high cube containers. Payload limits typically reach 28–30 tons, though Indian road regulations under the Motor Vehicles Act cap axle loads at 10–12 tons per axle.
        </p>
      </section>

      {/* What Is a Cargo Shipping Container */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">What Is a Cargo Shipping Container?</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            A cargo shipping container—also called an intermodal container or ISO container—is a standardized, stackable steel box engineered for seamless transfer between ship, rail, and truck without unloading the cargo inside. Approximately 95% of the global container fleet complies with ISO standards, ensuring compatibility at ports from Mumbai to Rotterdam.
          </p>
          <p>
            The structure relies on corrugated steel sidewalls (typically 2–4 mm thick corten weathering steel that forms a protective rust patina), plywood or steel floors rated for 7.5–9 tons per square meter, and double doors with multi-point locking bars. Every container carries a CSC plate (International Convention for Safe Containers) showing maximum gross weight, stacking limit, racking strength, and manufacture date.
          </p>
          <p>
            Typical payloads include manufactured goods shipped through Indian ports like Nhava Sheva (JNPT), Mundra, and Chennai. For example, a 40 ft high cube might carry 20–25 tons of automotive parts from Mumbai to Rotterdam, secured with lashing and braced internally, traveling over 12,000 km in 25–30 days without exposure to the elements.
          </p>
        </div>
      </section>

      {/* Brief History */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Brief History of Cargo Containers & Containerization</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Before standardization, international shipping relied on break bulk cargo—varied crates, barrels, and sacks loaded by hand. A single vessel could take days to load, with high damage and theft rates.
            </p>
            <p>
              The commercial breakthrough came in 1955–1956 when trucking magnate Malcolm McLean partnered with engineer Keith Tantlinger to design 8 ft wide × 8 ft high corrugated steel boxes with twistlock fittings. The SS Ideal X voyage in April 1956 carried 58 such containers.
            </p>
            <p>
              ISO 668 arrived in 1968, defining 20 ft and 40 ft as standard lengths. The 1972 International Convention for Safe Containers (CSC) mandated safety approval plates. Loading times dropped from 100+ hours to under 24 hours, and handling costs fell by a factor of 30.
            </p>
            <p>
              Today, containers underpin over 90% of non-bulk global trade and have found new life as modular buildings—a development Portable Office Cabin leverages across India.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-md">
            <OptimizedImage
              src={resolveImageUrl(cargoShippingWorkers)}
              alt="Cargo shipping containers stacked at Indian port with workers inspecting — intermodal freight operations by Portable Office Cabin"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Standard Sizes */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Standard Sizes & Specifications</h2>
        <p className="text-muted-foreground mb-6">
          Most cargo containers follow ISO 668 and CSC rules, ensuring interoperability at every port, rail terminal, and trucking depot worldwide.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-3 text-left text-sm font-semibold">Size</th>
                <th className="p-3 text-left text-sm font-semibold">External Dimensions</th>
                <th className="p-3 text-left text-sm font-semibold">Volume</th>
                <th className="p-3 text-left text-sm font-semibold">Tare Weight</th>
                <th className="p-3 text-left text-sm font-semibold">Max Payload</th>
              </tr>
            </thead>
            <tbody>
              {containerSizes.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                  <td className="p-3 text-sm font-medium text-foreground">{row.size}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.external}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.volume}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.tare}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.payload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Key Structural Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Eight ISO corner castings (215 × 215 × 178 mm) allow stacking up to 9 high</li>
              <li>• Forklift pockets on 20 ft bases enable easy loading</li>
              <li>• Floor load ratings reach 7.1 tons/m² uniformly</li>
              <li>• High Cube extra headroom ideal for insulation and ceiling finishes</li>
            </ul>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Weight Specifications</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Tare weight: 2,200 kg (20 ft) to 4,800 kg (40 ft HC)</li>
              <li>• Max gross weight: 30,480 kg (20 ft) to 32,500 kg (40 ft HC)</li>
              <li>• Indian road regulations may impose lower limits per axle config</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Container Types */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Main Types of Cargo Shipping Containers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {containerTypes.map((type, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <type.icon className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
              <p className="text-sm text-muted-foreground">{type.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3 text-muted-foreground text-sm">
          <p><strong className="text-foreground">Side-open containers:</strong> Full-wall access via sliding doors enables easy loading and unloading of palletized goods.</p>
          <p><strong className="text-foreground">Half-height & bulk containers:</strong> Shorter walls (4'3"–4'10") for dense materials — coal, ore, aggregates.</p>
          <p><strong className="text-foreground">Regional variations:</strong> European 45 ft pallet-wide High Cubes, North American 48/53 ft units, Japanese compact 12 ft units for local rail.</p>
        </div>
      </section>

      {/* Port/Yard Image */}
      <section>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl overflow-hidden shadow-md">
            <OptimizedImage
              src={resolveImageUrl(cargoShippingPort)}
              alt="40ft cargo shipping container at Indian port terminal — ISO standard Corten steel unit for freight and modular conversion by Portable Office Cabin"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="rounded-xl overflow-hidden shadow-md">
            <OptimizedImage
              src={resolveImageUrl(cargoShippingYard)}
              alt="Cargo shipping containers stacked at container yard with reefer units and gantry cranes — industrial logistics infrastructure in India"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Safety & Standards */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Securing, Safety & International Standards</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Safety standards matter because containers endure extreme conditions: stacked up to 11 high on vessels, vibrating across long distances on rail, and bouncing over rough roads on trucks.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" /> CSC Certification
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Maximum gross weight (e.g., 30,480 kg)</li>
                <li>• Transverse racking strength (30–50 kN)</li>
                <li>• Stacking weight per corner (up to 865 kN)</li>
                <li>• Re-inspection every 30 months</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent" /> Security Measures
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Bolt seals and high-security locks</li>
                <li>• GPS-enabled reefer monitoring</li>
                <li>• Lashing rods and turnbuckles (2–10 ton SWL)</li>
                <li>• Indian Customs X-ray and radiation scanning at JNPT</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* From Cargo to Modular Buildings */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">From Cargo Shipping Containers to Modular Buildings</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Since the 1990s, surplus "wind-and-water-tight" containers—those past their 10–15 year sea life—have been repurposed into buildings. What began as creative reuse has evolved into purpose-built modular construction.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {[
              "Wind resistance exceeding 200 km/h",
              "Structural lifespan of 30+ years",
              "Stackability up to 6–9 levels",
              "50–70% faster deployment",
              "Minimal foundation requirements",
              "Factory-controlled fabrication quality",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-accent/5 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <p>
            Portable Office Cabin specializes in converting ISO cargo containers and fabricating container-like modules for clients across India. All conversions comply with NBC 2016 building codes and relevant fire safety standards. We mitigate thermal bridging through spray foam or PIR insulation systems, achieving R-values exceeding 20 for comfortable interiors.
          </p>
        </div>
      </section>

      {/* Container Offices */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Container Offices & Site Facilities</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Container offices are fully equipped, relocatable workspaces built from 20 ft and 40 ft cargo containers. They provide immediate infrastructure for construction sites, industrial operations, and temporary project needs.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" /> Typical Configurations
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>20 ft (15–20 m²):</strong> Site engineer office with desk, AC, optional toilet</li>
                <li>• <strong>40 ft (30–35 m²):</strong> 8–10 workstations with central aisle</li>
                <li>• <strong>Double-stacked:</strong> Two-level offices with internal stairs (60+ m²)</li>
              </ul>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-accent" /> Standard Features
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• 50–100 mm PU foam insulation (R-20+)</li>
                <li>• 2–5 ton split AC units</li>
                <li>• 36W/m² LED lighting & Cat6 LAN cabling</li>
                <li>• Grilled windows, MCB distribution boards</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Labour Colonies */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Prefab Labour Colonies & Worker Accommodation</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Labour colonies built from cargo containers offer the fastest way to house large workforces near project sites. Portable Office Cabin delivers complete accommodation solutions for road, metro rail, industrial plant, and warehousing projects across India.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-3 text-left text-sm font-semibold">Factor</th>
                  <th className="p-3 text-left text-sm font-semibold">Container Colony</th>
                  <th className="p-3 text-left text-sm font-semibold">Traditional Masonry</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Deployment time", "4–6 weeks", "3–6 months"],
                  ["Cost savings", "40–60% lower", "Baseline"],
                  ["Relocation", "Crane and flatbed", "Demolition required"],
                  ["End-of-project waste", "Near zero", "Significant debris"],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                    <td className="p-3 text-sm font-medium text-foreground">{row[0]}</td>
                    <td className="p-3 text-sm text-accent font-medium">{row[1]}</td>
                    <td className="p-3 text-sm text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Container Homes, Cafés */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Container Homes, Cafés & Rooftop Conversions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <Building2 className="h-7 w-7 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Container Homes</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Studio to 2BHK layouts (20–40 ft HC)</li>
              <li>• 100 mm PIR insulation (U-value 0.25)</li>
              <li>• UPVC double-glazed windows</li>
              <li>• Farmhouses, holiday homes, staff quarters</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <Coffee className="h-7 w-7 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Container Cafés</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 10 ft kiosks to 40 ft HC full-scale cafés</li>
              <li>• Kitchen zone + serving counter</li>
              <li>• Food-grade finishes & ventilation</li>
              <li>• Corporate campuses, highways, colleges</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <Globe className="h-7 w-7 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Rooftop Conversions</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Lightweight units (5–7 tons) crane-lifted</li>
              <li>• Min 300 mm RCC slab requirement</li>
              <li>• Lounges, meeting rooms, cafeterias</li>
              <li>• No major civil work needed</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Security, Toilets, Utility */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Security Cabins, Toilets & Utility Modules</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Security Guard Cabins", items: ["Windows on 3 sides for 270° visibility", "Counter desk for visitor registration", "Fan or 1.5 ton AC provision", "Factory gates, toll plazas, parking lots"] },
            { title: "Portable Toilet Blocks", items: ["Single or multi-stall (2–6 units)", "Integrated 500–1,000 L water tank", "Bio-digester or septic options", "Construction sites, outdoor events"] },
            { title: "Specialised Modules", items: ["First-aid rooms and medical bays", "Tool storage and workshops", "Power control rooms", "Ticket booths and kiosks"] },
          ].map((section, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {section.items.map((item, j) => (
                  <li key={j}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Benefits of Using Cargo Containers & Modular Solutions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "50–70% faster deployment than conventional construction",
            "Fixed factory pricing eliminates site-based cost overruns",
            "10–20 workers versus 50+ for equivalent masonry",
            "5–10 deployment cycles for quality units",
            "300 MPa steel withstands extreme conditions",
            "95% recycled steel content in many containers",
            "80% reduction in construction waste vs traditional building",
            "Fits standard flatbed trucks, rail wagons, and vessels",
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-2 bg-accent/5 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Condition Grades */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Container Condition Grades</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-3 text-left text-sm font-semibold">Grade</th>
                <th className="p-3 text-left text-sm font-semibold">Description</th>
                <th className="p-3 text-left text-sm font-semibold">Best For</th>
              </tr>
            </thead>
            <tbody>
              {conditionGrades.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                  <td className="p-3 text-sm font-medium text-foreground">{row.grade}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.desc}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Supply Chain */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Global Supply Chain & Container Availability (2020–Present)</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The COVID-19 pandemic starting in early 2020 disrupted global shipping schedules dramatically. Container queues at Los Angeles/Long Beach saw 100+ ships at anchor; 40 ft HC freight rates jumped from $1,500 pre-pandemic to $10,000+ per FEU in 2021.
          </p>
          <p>
            By 2023, conditions stabilized with rates settling to $2,000–$3,000 per FEU. Portable Office Cabin addresses supply chain variability by working with both containerized modules and fabricated-to-spec prefab systems—ensuring project timelines remain achievable regardless of market conditions.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">Work with Portable Office Cabin</h2>
        <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
          Whether you need to ship goods across oceans or build a complete site facility, the cargo shipping container offers proven versatility. Share your project requirements for a tailored container or prefab proposal.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="tel:+919731897976" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            📞 Call +91-9731897976
          </a>
          <a href="https://wa.me/919731897976" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors">
            💬 WhatsApp Us
          </a>
        </div>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
              <AccordionTrigger className="text-left text-foreground font-medium py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
