import { Check, Zap, Shield, Settings, Thermometer, RotateCcw, Building2, HardHat, Users, Leaf, ClipboardCheck, Phone, Home, Box, Wrench } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TechnicalSpecsPreset } from "./TechnicalSpecsPreset";
import { OptimizedImage } from "@/components/OptimizedImage";
import prefabPortaCabinExterior from "@/assets/products/prefab-porta-cabin-exterior.webp";
import prefabPortaCabinBunkhouse from "@/assets/products/prefab-porta-cabin-bunkhouse.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export function PrefabPortaCabinContent() {
  const sizeRows = [
    ["8x10 ft", "80 sq ft", "Security cabin (1–2 guards)"],
    ["10x15 ft", "150 sq ft", "Small office (2–3 persons)"],
    ["10x20 ft", "200 sq ft", "Standard site office (4–6 persons)"],
    ["12x30 ft", "360 sq ft", "Meeting room (8–10 persons)"],
    ["12x40 ft", "480 sq ft", "Dormitory (20–30 persons)"],
    ["20x40 ft", "800 sq ft", "Large office or 2 BHK cottage"],
  ];

  const pricingExamples = [
    ["Basic 10x20 ft site office", "₹1,57,500–₹1,92,500"],
    ["12x40 ft bunkhouse with bunks", "₹7–10 lakhs"],
    ["4x4 ft security cabin", "₹1–1.5 lakhs"],
    ["Premium G+1 labour colony blocks", "₹15–20+ lakhs"],
  ];

  const faqs = [
    {
      q: "How long does delivery take?",
      a: "Standard 10x20 ft office cabins are typically ready in 2–3 weeks from order approval. Custom or larger units may require 3–4 weeks.",
    },
    {
      q: "Can porta cabins be relocated?",
      a: "Yes. Units are designed for 5–10 relocations over their lifespan without structural degradation. The bolted construction enables disassembly and reassembly at new locations.",
    },
    {
      q: "Do I need a permanent foundation?",
      a: "No. Simple PCC blocks or levelled concrete plinths suffice for most applications. Only G+1 structures require engineered foundations.",
    },
    {
      q: "Are these suitable for extreme Indian climates?",
      a: "Absolutely. PUF insulation handles Jaipur's 45°C+ summers by reducing AC loads, while weatherproof construction manages Mumbai's humid monsoons effectively.",
    },
    {
      q: "What customization options are available?",
      a: "Layout partitioning, window and door placement, flooring types, exterior colours, integrated furniture, toilets, and specialized electrical fittings can all be customized to space needs.",
    },
    {
      q: "How do porta cabins compare to shipping containers?",
      a: "Purpose-built porta cabins offer better insulation, more innovative design flexibility, proper ventilation, and stylish finishes. Office containers converted from shipping containers often lack these features.",
    },
  ];

  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Prefab Porta Cabin: Complete Guide to Types, Pricing & Selection in India
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-4">
          Prefab porta cabins have become essential infrastructure across India's booming construction, education, and industrial sectors. These factory-fabricated modular buildings combine steel frameworks with insulated sandwich panels, enabling rapid deployment that traditional construction simply cannot match.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          In 2026, the demand for portable cabins continues to surge. Metro expansions in Delhi and Mumbai, highway projects under Bharatmala, and rural development initiatives all require fast, flexible structures. Whether you need site offices for a 6-month project or semi-permanent labour accommodation for a decade, prefab porta cabins deliver 40–60% cost savings compared to conventional RCC construction.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This guide covers everything procurement teams and project managers need: features, types (from compact security cabins to G+1 labour colonies), realistic 2026 pricing, and how to choose the right prefab porta cabin for your specific requirements.
        </p>
      </section>

      {/* Image Gallery */}
      <section className="grid md:grid-cols-2 gap-6">
        <OptimizedImage
          src={resolveImageUrl(prefabPortaCabinExterior)}
          alt="Modern prefab porta cabin exterior with glass facade and insulated panel cladding by Portable Office Cabin"
          className="rounded-xl w-full h-auto"
        />
        <OptimizedImage
          src={resolveImageUrl(prefabPortaCabinBunkhouse)}
          alt="Interior view of prefab porta cabin bunkhouse dormitory with triple-tier bunk beds for labour accommodation"
          className="rounded-xl w-full h-auto"
        />
      </section>

      {/* What Is a Prefab Porta Cabin */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          What Is a Prefab Porta Cabin?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          A prefab porta cabin is a pre-engineered, factory-fabricated modular structure built from mild steel (MS) framework and insulated panels. Unlike traditional construction requiring months of on-site work, these portable office cabins arrive ready to install or in knock-down form for quick assembly.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Common materials include MS frames using ISMC/ISMB sections, wall panels of PUF (polyurethane foam), EPS, or rockwool sandwich construction at 50–75mm thickness, and cement board or marine plywood flooring finished with vinyl. Roofing typically features insulated panels with proper slopes and gutters for monsoon weather protection.
        </p>

        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Standard Sizes Used Across India</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            { size: "8x10 ft (80 sq ft)", use: "Security cabins and guard rooms" },
            { size: "10x20 ft (200 sq ft)", use: "Site offices and portable office units" },
            { size: "12x40 ft (480 sq ft)", use: "Labour bunkhouses and dormitories" },
            { size: "20x40 ft (800 sq ft)", use: "Large offices and storage units" },
          ].map((item) => (
            <div key={item.size} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">{item.size}</p>
                <p className="text-sm text-muted-foreground">{item.use}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground italic">
          Assembly relies on bolted joints rather than on-site welding. Most installations require only simple concrete plinths or PCC blocks as foundation, allowing completion in 1–2 days.
        </p>
      </section>

      {/* Key Benefits */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-8">
          Key Benefits of Prefab Porta Cabins
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Rapid Deployment", desc: "Installation in hours to 2 days versus months for RCC buildings" },
            { icon: Shield, title: "Cost Effectiveness", desc: "40–60% lower than conventional construction with less waste" },
            { icon: RotateCcw, title: "Relocatable Design", desc: "Units can be shifted 5–10 times over their lifespan without structural degradation" },
            { icon: Thermometer, title: "Energy Efficiency", desc: "PUF insulation reduces AC loads by up to 30% in extreme heat" },
            { icon: Settings, title: "Weather Resistance", desc: "Anti-corrosion coatings and proper drainage handle monsoons" },
            { icon: Leaf, title: "Eco Friendly Construction", desc: "90% recyclable materials, zero construction debris, solar panel compatibility" },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <feature.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6">
          Durability is a key strength. Well-maintained porta cabins achieve 15–25+ years of service life, making them cost effective for both short-term construction sites and longer-term applications.
        </p>
      </section>

      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Applications of Prefab Porta Cabins
        </h2>
        <p className="text-muted-foreground mb-6">
          The same structural system adapts to diverse applications through different interior layouts:
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: HardHat,
              title: "Construction & Infrastructure",
              items: ["Metro rail project offices in Delhi and Mumbai", "Labour colonies for NHAI highway projects", "Material storage units on remote sites"],
            },
            {
              icon: Building2,
              title: "Education & Healthcare",
              items: ["Temporary classrooms in remote villages lacking school buildings", "Mobile clinic cabins with integrated plumbing for rural areas"],
            },
            {
              icon: Home,
              title: "Hospitality & Residential",
              items: ["Farm stay cottages in Himachal Pradesh (320–800 sq ft modules)", "Resort accommodations requiring quick installation", "Portable farm houses for weekend retreats"],
            },
            {
              icon: Box,
              title: "Industrial & Commercial",
              items: ["Factory offices and quality control rooms", "Toll plaza guard cabins across national highways", "Retail kiosks and exhibition structures"],
            },
          ].map((category) => (
            <div key={category.title} className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <category.icon className="h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{category.title}</h3>
              </div>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 italic">
          These modular structures serve temporary accommodation needs lasting 6 months or semi-permanent installations running 10–15 years.
        </p>
      </section>

      {/* Types of Prefab Porta Cabins */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Types of Prefab Porta Cabins
        </h2>
        <p className="text-muted-foreground mb-6">
          Porta cabins come in specialized functional types. Below are the most in-demand models across India, each adaptable as single-storey or G+1 configurations with proper structural design.
        </p>

        <div className="space-y-8">
          {/* Site Office */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Site Office Porta Cabins</h3>
            <p className="text-muted-foreground mb-4">
              Site office cabins serve as project management hubs on construction and industrial sites. Common sizes include 10x20 ft and 12x30 ft units, with larger offices created by joining multiple modules.
            </p>
            <h4 className="font-semibold text-foreground mb-2">Typical Features:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Manager cabin and open workstation area", "Provision for AC, electrical points, and data cabling", "Vinyl flooring and wall panelling for professional appearance", "LED lighting and modular furniture options", "Windows positioned for natural light and ventilation"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3 italic">
              These offices suit project managers, engineering teams, and client meetings throughout project duration.
            </p>
          </div>

          {/* Labour Accommodation */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Labour Accommodation & Bunkhouse Cabins</h3>
            <p className="text-muted-foreground mb-4">
              Bunkhouse porta cabins house 6–40 workers per unit depending on size and bunk configuration. A standard 12x40 ft bunkhouse with triple-tier bunks accommodates 24–30 persons.
            </p>
            <p className="text-muted-foreground">
              G+1 labour colonies combine multiple cabins with central corridors, shared toilet-bathroom blocks, and mess areas. Key features include durable flooring, adequate ventilation, safety exits, and easy-clean surfaces prioritizing hygiene for EPC contractors and corporate clients.
            </p>
          </div>

          {/* Security Cabins */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Security Cabins & Guard Rooms</h3>
            <p className="text-muted-foreground mb-4">
              Compact guard cabins (4x4 ft, 6x6 ft, or 8x6 ft) provide shelter at factory gates, residential societies, parking lots, and toll plazas. Design elements include:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["360-degree window placement for visibility", "Small counter for documentation", "Provision for fan, light, and storage", "Simple foundation allowing quick installation and relocation"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3 italic">
              These cabins suit warehouses, schools, commercial complexes, and any location requiring manned security points.
            </p>
          </div>

          {/* Prefab Toilet */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Prefab Toilet & Sanitation Cabins</h3>
            <p className="text-muted-foreground mb-4">
              Portable toilets address sanitation needs at construction sites, industrial facilities, and events. Options include single WC units, multi-cabin blocks with separate sections for men and women, and combined toilet-shower units.
            </p>
            <p className="text-muted-foreground">
              Standard features cover water tank provisions, plumbing connections, ventilation, and easy-to-clean finishes. These sustainable solutions ensure compliance with sanitation norms for road projects, fairs, and factory expansions.
            </p>
          </div>

          {/* Prefab Homes */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Prefab Homes, Cottages & Farmhouse Cabins</h3>
            <p className="text-muted-foreground mb-4">
              Porta cabins configured as prefab homes appeal to farm owners, homestay operators, and resort developers seeking fast installation without heavy civil work.
            </p>
            <h4 className="font-semibold text-foreground mb-2">Size Examples:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground mb-3">
              {["320 sq ft single-room cottage", "500–600 sq ft 1 BHK module", "700–800 sq ft 2 BHK weekend home"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Interiors include bedrooms, living areas, kitchenettes, attached bathrooms, UPVC windows, and insulation suited for hill or coastal climates — delivering modern living without months of construction.
            </p>
          </div>

          {/* Storage */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Storage, Warehouse & Container-Type Porta Cabins</h3>
            <p className="text-muted-foreground mb-4">
              Steel container-style cabins provide secure storage rooms for tools, materials, and equipment. Unlike shipping containers, these prefab storage units include ventilation, optional insulation, and shelving.
            </p>
            <p className="text-muted-foreground">
              Common sizes (20 ft and 40 ft units) serve material stores and temporary mini-warehouses. Security features include heavy-duty doors, robust locking systems, and corrosion protection for site conditions.
            </p>
          </div>
        </div>
      </section>

      <TechnicalSpecsPreset />


      {/* Sizes & Layout Ideas */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Prefab Porta Cabin Sizes & Layout Ideas
        </h2>
        <p className="text-muted-foreground mb-6">
          Standard footprints and practical layouts for common applications:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Size</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Area</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {sizeRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground border border-border">{row[0]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[1]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Multiple cabins can be joined side-by-side or stacked for larger complexes. Proper window and corridor placement ensures ventilation and natural light — critical for Indian climate functionality.
        </p>
      </section>

      {/* Pricing */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Pricing of Prefab Porta Cabins in India (2026)
        </h2>
        <p className="text-muted-foreground mb-6">
          Final costs depend on size, specifications, interior finishes, and quantity. Based on 2026 market data, expect these ranges:
        </p>
        <div className="bg-accent/10 rounded-xl p-6 mb-6">
          <p className="text-foreground font-semibold text-lg">Price per square foot: ₹900–₹2,000 depending on finish level</p>
        </div>

        <h3 className="font-semibold text-foreground mb-3">Indicative Examples:</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Configuration</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Price Range</th>
              </tr>
            </thead>
            <tbody>
              {pricingExamples.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 text-foreground border border-border">{row[0]}</td>
                  <td className="px-4 py-3 text-accent font-semibold border border-border">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold text-foreground mb-3">Factors Adding Cost:</h3>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          {["Thicker insulation panels", "Branded UPVC windows and doors", "Modular furniture and electrical fittings", "Attached toilets and AC provisions", "Staircases for G+1 structures"].map((item) => (
            <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground mt-4 italic">
          Bulk orders typically reduce per-square-foot pricing by 10–20%. These figures help with initial budgeting before requesting formal quotations.
        </p>
      </section>

      {/* Process */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          How the Prefab Porta Cabin Process Works
        </h2>
        <p className="text-muted-foreground mb-6">
          The entire process from enquiry to handover follows a streamlined workflow designed for efficiency.
        </p>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-lg font-semibold text-foreground mb-3">1. Site Assessment & Preparation</h3>
            <p className="text-muted-foreground mb-3">Before delivery, a quick site evaluation covers:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Access for trucks and crane reach", "Ground level and drainage conditions", "Available electrical and water connections", "Foundation requirements (typically compacted ground with PCC blocks or simple plinth)"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3 italic">
              For semi-permanent installations, check local regulations regarding modular structures.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-lg font-semibold text-foreground mb-3">2. Design, Customisation & Approvals</h3>
            <p className="text-muted-foreground mb-3">
              Clients select cabin type, size, and interior layout based on application and budget. Manufacturers prepare 2D layouts (optionally 3D views) to finalize:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Partition positions and door/window placement", "Toilet locations and furniture arrangement", "Exterior paint colours and logo branding", "Specialized fittings (acoustic panels, extra windows)"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3 italic">
              Once drawings receive approval, manufacturing slots and delivery timelines are confirmed. Leading manufacturers complete this phase within days.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-lg font-semibold text-foreground mb-3">3. Manufacturing, Delivery & Installation</h3>
            <p className="text-muted-foreground mb-3">
              Factory fabrication involves cutting, welding, panel preparation, painting, and pre-fitting doors, windows, and electrical conduits. Quality control checks occur before dispatch.
            </p>
            <p className="text-muted-foreground mb-3">
              Cabins ship as fully built units or knock-down components depending on road access. On-site activities include:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Unloading with crane or hydra", "Positioning on prepared foundation", "Bolting sections together", "Utility connections and final checks"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3 italic">
              Installation typically completes in a few hours to one day for standard cabins, causing minimal disruption to ongoing site work.
            </p>
          </div>
        </div>
      </section>

      {/* Quality & Safety */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Quality, Safety & Performance Considerations
        </h2>
        <p className="text-muted-foreground mb-6">Professional prefab porta cabins meet rigorous standards:</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Structural Safety", desc: "Design for wind loads, proper anchoring, safe stairs and railings for G+1" },
            { title: "Fire Safety", desc: "Fire-rated panels, safe electrical layouts, appropriate insulation materials" },
            { title: "Thermal Performance", desc: "Insulation achieving R-values comparable to brick walls" },
            { title: "Acoustic Comfort", desc: "Rockwool variants offering up to 40dB noise reduction" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 italic">
          Certified premium materials and factory quality control distinguish professional solutions from makeshift structures.
        </p>
      </section>

      {/* Maintenance & Lifespan */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Maintenance & Lifespan of Porta Cabins
        </h2>
        <p className="text-muted-foreground mb-6">
          Well-maintained porta cabins achieve 15–25+ years of service life. Routine maintenance includes:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Checking sealants at joints and windows annually",
            "Repainting exposed steel every 2–5 years",
            "Inspecting roof joints, gutters, and drainage",
            "Servicing electrical and plumbing systems",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Wrench className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4">
          Proper siting (avoiding waterlogging) and basic upkeep significantly extend service life. Older cabins can be refurbished with new paint, panel replacement, and interior upgrades rather than scrapping — delivering ongoing cost savings.
        </p>
      </section>

      {/* How to Choose Supplier */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          How to Choose the Right Prefab Porta Cabin Supplier
        </h2>
        <p className="text-muted-foreground mb-6">
          Evaluating leading manufacturers requires attention to several factors:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Experience", desc: "15+ years in the industry with documented projects" },
            { title: "Capabilities", desc: "In-house design and fabrication versus outsourced work" },
            { title: "Quality Evidence", desc: "Visit existing installations to assess weld quality, panel fitment, and finishes" },
            { title: "Detailed Quotations", desc: "Specifications covering panel thickness, paint system, and inclusions" },
            { title: "Warranty Terms", desc: "Clear coverage for structural elements and finishes" },
            { title: "Deployment Capacity", desc: "Ability to handle large or multi-location projects across India" },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 italic">
          India trust in leading provider credentials comes from verifiable track records and customer satisfaction references.
        </p>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Frequently Asked Questions About Prefab Porta Cabins
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-accent/10 rounded-2xl p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Get Your Prefab Porta Cabin Project Started
        </h2>
        <p className="text-muted-foreground mb-4 max-w-3xl mx-auto">
          Prefab porta cabins deliver what modern architecture and construction projects demand: rapid deployment, relocatable flexibility, significant cost effectiveness, and professional quality. From compact guard cabins to sophisticated G+1 office complexes, these modular structures solve space challenges across industries.
        </p>
        <p className="text-muted-foreground mb-6 max-w-3xl mx-auto">
          Before contacting suppliers, prepare your requirements: purpose, approximate size, location access, timeline, and budget range. This helps leading manufacturers provide accurate quotations and realistic customization options.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/contact" className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-6 py-3 font-semibold hover:bg-accent/90 transition-colors">
            Request a Quote
          </a>
          <a href="tel:+919731897976" className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors">
            <Phone className="h-4 w-4 mr-2" />
            Call Us Now
          </a>
        </div>
      </section>
    </div>
  );
}
