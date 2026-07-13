import { Check, Zap, Shield, Settings, Thermometer, RotateCcw, Users, Building2, HardHat, Leaf, ClipboardCheck, Phone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import labourHutments2 from "@/assets/products/labour-hutments-staff-accommodation-2.webp";
import labourHutments3 from "@/assets/products/labour-hutments-staff-accommodation-3.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export function LabourHutmentsStaffAccommodationContent() {
  // No "cost per bed" row: this page sells one unit at one fixed, GST-inclusive price, and a
  // per-bed range beside it would contradict the cart, the JSON-LD offer and the feed.
  const comparisonRows = [
    ["Installation time", "3–6 weeks", "4–6 months"],
    ["Foundation needs", "Simple plinth", "Full RCC footings"],
    ["Reusability", "3–5 sites over 10 years", "Fixed location"],
    ["Monsoon delays", "Minimal", "Significant"],
  ];

  const layoutRows = [
    ["50 beds", "0.25 acre", "Basic dorms"],
    ["100 beds", "0.4 acre", "G+1 with canteen"],
    ["250 beds", "0.6 acre", "Zoned with recreation"],
    ["500 beds", "1+ acre", "G+2 with STP"],
  ];

  const caseStudies = [
    {
      title: "Maharashtra Metro Project (2023)",
      desc: "250-worker G+1 labour colony completed in 40 days. Included dormitory blocks, canteen, and first-aid centre. Client reported 20% improvement in worker retention versus previous tin shed arrangements.",
    },
    {
      title: "Odisha Steel Plant Expansion (2022)",
      desc: "Mixed prefab labor hutments (180 labour beds + 12 staff units) with integrated canteen. Repeat order placed for phase 2, demonstrating the comfortable and safe stay our units provide.",
    },
    {
      title: "Rajasthan Solar Park (2024)",
      desc: "80-technician container-based temporary housing with enhanced dust seals and heat-proofing. Quick installation enabled project mobilisation 3 weeks ahead of schedule — unlimited possibilities with modular design.",
    },
  ];

  const productComparison = [
    { product: "Labour Hutments", use: "Worker dormitories", diff: "Bunk-optimised, hygiene-focused" },
    { product: "Container Offices", use: "Site administration", diff: "Partition-heavy, furniture-ready" },
    { product: "Portable Toilets", use: "Sanitation", diff: "Standalone FRP units" },
    { product: "PEB Warehouses", use: "Material storage", diff: "Large-span, open layouts" },
  ];

  const faqs = [
    { q: "How quickly can a 100-bed labour colony be installed?", a: "A 100-bed G+1 modular labour hutment colony takes 2–3 weeks factory prep + 10–14 days site installation post civil readiness. Work progresses parallel to main site mobilisation, saving valuable project time." },
    { q: "What does the labour hutment unit on this page cost?", a: "It is sold at the single price shown at the top of this page, inclusive of 18% GST, with transport and optional installation calculated at checkout from your delivery pincode. Full colony packages are sized to the brief — configuration, panel thickness, and amenities all change the build — so those are quoted separately. Either way it is 20–30% cheaper than traditional RCC/brick construction, with the added benefit of reusability across 3–5 project sites." },
    { q: "Can labour hutments be relocated to another project site?", a: "Yes. Bolt-together assembly allows easy dismantling with 80% material recovery for transport and reinstallation at subsequent sites, making them highly cost-effective over multiple project cycles." },
    { q: "What compliance standards do your labour hutments meet?", a: "Our structures comply with BOCW Act requirements, NBC 2016 fire safety and egress norms, IS 456/800/875 structural standards, and client-specific HSE requirements. Complete documentation including drawings, test certificates, and O&M manuals is provided." },
    { q: "Do you offer multi-storey labour accommodation?", a: "Yes, we offer G+1 and G+2 configurations that maximise space on land-scarce urban sites. Multi-storey units use heavy-duty steel framing designed for Zone V earthquake compliance." },
    { q: "What is the design life of prefab labour hutments?", a: "Design life is 10–15+ years with proper maintenance. Steel salvage value of 40–50% at end of life, panels can be individually replaced without full disassembly, and repainting is recommended every 3–5 years." },
    { q: "Can you supply integrated colony packages with canteen and toilets?", a: "Absolutely. We supply complete colony packages including dormitory blocks, staff quarters, prefab canteens (50–200 pax), first-aid centres, portable toilets, and security cabins — all from one location for uniform quality." },
    { q: "What insulation options are available for extreme climates?", a: "Panel thickness ranges from 40–80mm based on climate zone. PUF/EPS core with density 32–40 kg/m³ provides thermal conductivity of 0.022–0.028 W/mK, keeping interiors comfortable from -5°C to 50°C ambient temperatures." },
  ];

  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Prefabricated Labour Hutments & Staff Accommodation by Portable Office Cabin
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-4">
          India's infrastructure push from 2024 to 2026 — driven by Bharatmala, Sagarmala, and metro expansions — demands housing for millions of migrant workers. Prefabricated labour hutments and staff accommodation offer modular, factory-built housing solutions designed for rapid deployment at construction sites, industrial plants, and infrastructure development projects. These structures address a critical gap: without proper facilities, construction companies face 30–40% workforce attrition.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Portable Office Cabin is a manufacturer and supplier of prefabricated labour colonies, portable cabins, and modular staff housing solutions across India. Our systems use insulated sandwich panels, steel frames, PEB structures, container conversions, and plug-and-play MEP fittings. This guide helps buyers compare options, understand technical features, and plan complete labour and staff colony layouts for metro rail projects, highway packages, refineries, mining sites, and large real-estate townships.
        </p>
      </section>

      {/* Image Gallery */}
      <section className="grid md:grid-cols-2 gap-6">
        <OptimizedImage
          src={resolveImageUrl(labourHutments2)}
          alt="G+2 prefabricated labour hutments with external staircase at construction site by Portable Office Cabin"
          className="rounded-xl w-full h-auto"
        />
        <OptimizedImage
          src={resolveImageUrl(labourHutments3)}
          alt="Construction workers walking past numbered portable labour accommodation units at industrial project site"
          className="rounded-xl w-full h-auto"
        />
      </section>

      {/* Why Choose Prefab over Traditional */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Choose Prefabricated Labour Hutments over Traditional Construction?
        </h2>
        <p className="text-muted-foreground mb-6">
          Prefabricated labor hutments deliver measurable advantages over traditional construction methods:
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Factor</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Prefab Hutments</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Traditional RCC/Brick</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground border border-border">{row[0]}</td>
                  <td className="px-4 py-3 text-accent font-semibold border border-border">{row[1]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Key Advantages</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Rapid Deployment", desc: "A G+1 labour colony for 100–300 workers installs in 3–6 weeks versus months for RCC structures" },
            { title: "Cost Effective Solution", desc: "20–30% savings from minimal foundations, no curing time, and reusability across multiple sites" },
            { title: "Easy Relocation", desc: "Dismantling via bolted joints achieves 80% material recovery for subsequent project sites" },
            { title: "Compliance Ready", desc: "Easier adherence to NBC 2016 guidelines for 3.5–4.5 sqm/person floor space and BOCW Act requirements" },
            { title: "Reduced Dependency", desc: "Minimal reliance on local material supply and skilled masons — crucial for remote work sites" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-8">
          Key Features of Portable Office Cabin Labour & Staff Accommodation
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Structural System",
              desc: "Heavy-duty modular steel framing (IS 800 compliant, 3–5mm sections). 40–50mm PUF/EPS insulated panels providing thermal insulation from -5°C to 50°C. GI/PPGI roofing with weather resistant specifications.",
            },
            {
              icon: Settings,
              title: "Interior Finishes",
              desc: "Vinyl/cement board flooring (anti-slip, 2–3mm thick). Washable emulsion walls for minimal maintenance. LED batten lights, ceiling fans, MCB-protected distribution boards.",
            },
            {
              icon: Zap,
              title: "Safety & Comfort",
              desc: "Fire-retardant panel options (BS 476 Class 1). Concealed FRLS wiring in PVC conduits. Cross-ventilation with MS grill windows and mosquito nets. Provisions for air coolers or split ACs in staff blocks.",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <feature.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Types of Accommodation */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Types of Prefabricated Labour & Staff Accommodation Solutions
        </h2>
        <p className="text-muted-foreground mb-6">
          Portable Office Cabin offers flexible design options covering both workers and staff housing needs:
        </p>
        <div className="space-y-4">
          {[
            { icon: Users, title: "Standard Labour Hutments", desc: "Dormitory-style blocks with bunk beds for 8–24 persons per module, shared toilets, common wash areas" },
            { icon: Building2, title: "Staff Accommodation", desc: "1BHK and 2BHK prefab structures for engineers and supervisors with attached toilets and kitchenettes" },
            { icon: HardHat, title: "Container-Based Units", desc: "20ft and 40ft container cabins for quick installation and guaranteed protection" },
            { icon: Building2, title: "Multi-Storey Hutments", desc: "G+1 and G+2 solutions maximising space availability on land-scarce urban sites" },
            { icon: Settings, title: "Support Buildings", desc: "Prefab canteens (50–200 pax), first-aid centres, portable toilets, security cabins" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4 p-5 bg-card rounded-xl border border-border">
              <item.icon className="h-6 w-6 text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 italic">
          All modules interconnect via covered walkways for monsoon-proof circulation, optimising land at 4–6 sqm/person including amenities.
        </p>
      </section>

      {/* Comfort, Safety & Hygiene */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Comfort, Safety & Hygiene Standards
        </h2>
        <p className="text-muted-foreground mb-6">
          Our prefabricated workers accommodation exceeds minimum standards to retain workers and reduce attrition:
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Sleeping Arrangements</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Ergonomic triple bunks (1.8m height, 0.6×2m mattresses)</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />0.9m wide aisle spacing between bunks</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Individual storage provisions and adequate natural light</li>
            </ul>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Sanitation Facilities</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Segregated male/female toilets (1:10 males, 1:5 females per BOCW)</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Exhaust fans (50 CFM/toilet) preventing odour buildup</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Connection provisions for septic tanks or STPs</li>
            </ul>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Worker Safety</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Non-slip chequered plate flooring</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Glow-in-the-dark emergency signage</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Fire extinguishers, smoke detectors, Zone V earthquake compliant</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Design & Layout Planning */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Design, Customization & Layout Planning
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Need Assessment Covers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Bed count and staff/worker ratio (typically 80:20)", "Project duration (6–36 months)", "Climate zone and statutory requirements"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Layout Planning Includes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Zoning for labour quarters, staff blocks, kitchens, dining, recreation", "Proper circulation and emergency egress", "Adequate design for phased occupancy"].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-3">Customization Options</h3>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-8">
          {["Panel thickness (40–80mm based on climate)", "Window sizes, floor finishes, furniture packages", "Vertical expansion provisions (G to G+1/G+2)", "Corporate branding and colour schemes"].map((item) => (
            <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>

        <h3 className="font-semibold text-foreground mb-3">Typical Colony Layouts</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Colony Size</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Land Required</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Configuration</th>
              </tr>
            </thead>
            <tbody>
              {layoutRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 text-foreground border border-border">{row[0]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[1]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Materials & Technical Specs */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Materials & Technical Specifications
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Structural Steel", specs: ["IS 2062 grade (Fy 250 MPa)", "Epoxy primer (80 microns) + PU topcoat (50 microns) for sturdy construction"] },
            { title: "Wall Panels", specs: ["40–60mm EPS/PUF core (density 32–40 kg/m³)", "Thermal conductivity 0.022–0.028 W/mK", "0.4–0.5mm pre-painted GI sheets"] },
            { title: "Electrical", specs: ["Concealed 2.5 sqmm copper wiring", "ISI-marked switches, 6A MCBs", "20 lux minimum lighting levels"] },
            { title: "Plumbing", specs: ["CPVC/uPVC piping", "Standard sanitary fittings (Jaquar/equivalent)", "Hot water line readiness available"] },
          ].map((group) => (
            <div key={group.title} className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-3">{group.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.specs.map((spec) => (
                  <li key={spec} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{spec}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Installation & Timeline */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Speed of Delivery, Installation Process & Project Timelines
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Factory Fabrication (2–4 weeks)</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />CNC panel cutting</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Frame welding and pre-finishing</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Door-window fitting with electrical cutouts</li>
            </ul>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Site Installation (7–21 days)</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Crane-lift module placement</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />Bolt/weld connections</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />MEP final connections</li>
            </ul>
          </div>
        </div>
        <div className="bg-accent/10 rounded-xl p-6">
          <p className="text-foreground font-semibold mb-1">Sample Timeline</p>
          <p className="text-muted-foreground text-sm">
            A 100-bed G+1 modular labour hutment colony: factory prep 2–3 weeks + site install 10–14 days post civil readiness. Work progresses parallel to main site mobilisation, saving valuable time.
          </p>
        </div>
      </section>

      {/* Durability & Lifecycle */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Durability, Maintenance & Lifecycle Costs
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Design Life", value: "10–15+ years with proper maintenance" },
            { label: "Reuse Potential", value: "3–5 project cycles with 40–50% steel salvage value" },
            { label: "Repainting", value: "Every 3–5 years (coastal/industrial areas)" },
            { label: "Panel Replacement", value: "Individual sections replaceable without full disassembly" },
            { label: "Warranty", value: "1–2 years structural, 5 years panels" },
            { label: "AMC", value: "Annual maintenance contracts available for large colonies" },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-lg p-4 border border-border">
              <p className="font-semibold text-foreground text-sm">{item.label}</p>
              <p className="text-muted-foreground text-sm mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sustainability */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Sustainability & Energy Efficiency
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Leaf, title: "Energy Reduction", desc: "Insulated panels cut cooling loads by 25–35%" },
            { icon: Zap, title: "Solar Integration", desc: "Rooftop PV provisions (1kW/100 beds)" },
            { icon: Thermometer, title: "Water Management", desc: "Low-flow fixtures (4–6L flush), rainwater harvesting options" },
            { icon: RotateCcw, title: "Material Efficiency", desc: "90% waste reduction versus conventional construction; 95% steel recyclable" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <item.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Typical Applications & Industry Segments Served
        </h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {[
            "Highway and expressway packages (NH, Bharatmala)",
            "Metro rail corridors and airports",
            "Power plants, refineries, oil & gas installations",
            "Steel and cement plants",
            "Mining operations",
            "Smart city and irrigation projects",
            "Educational campus expansions",
            "Large warehousing and logistics parks",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Case Studies */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Case Examples of Labour & Staff Colonies by Portable Office Cabin
        </h2>
        <div className="space-y-4">
          {caseStudies.map((cs) => (
            <div key={cs.title} className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-2">{cs.title}</h3>
              <p className="text-sm text-muted-foreground">{cs.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison with Other Products */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Comparison with Other Prefab Options
        </h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Primary Use</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Key Difference</th>
              </tr>
            </thead>
            <tbody>
              {productComparison.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground border border-border">{row.product}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row.use}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Benefits of sourcing from one location: uniform quality, faster coordination, consistent aesthetics. Consider integrated site packages combining all elements.
        </p>
      </section>

      {/* Compliance & QA */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Regulatory Compliance, Safety Norms & Quality Assurance
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Standards Compliance</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["BOCW Act requirements for worker housing", "NBC 2016 fire safety and egress norms", "IS 456/800/875 structural standards", "Client-specific HSE requirements"].map((item) => (
                <li key={item} className="flex items-start gap-2"><ClipboardCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Quality Assurance Includes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Raw material inspection and UT testing for welds", "Factory-stage QA with panel fire/load certifications", "Site-stage QC during erection", "Complete documentation: drawings, test certificates, O&M manuals"].map((item) => (
                <li key={item} className="flex items-start gap-2"><ClipboardCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How to Order */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          How to Specify & Order Prefabricated Labour Hutments
        </h2>
        <p className="text-muted-foreground mb-4">
          To receive an expertly designed, customizable quotation, provide:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground mb-6">
          {[
            "Required bed count and bunk configuration (single/double/triple)",
            "Number of floors needed (G, G+1, G+2)",
            "Project duration and expected occupancy date",
            "Site location, climate zone, land availability",
            "Panel thickness preference and MEP load requirements",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground italic">
          Early engagement with our engineering team optimises layouts and reduces costs by 10–15%. Include future expansion or relocation needs in initial discussions to maximise asset utilisation.
        </p>
      </section>

      {/* Why Work With Us */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Work with Portable Office Cabin
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "15+ years of prefabrication experience",
            "In-house design, manufacturing & installation",
            "500+ projects delivered",
            "Enquiry response within 24 hours, with a written quotation for every order",
            "Track record in labour colonies, container offices, PEB structures",
            "Commitment to quality, worker well-being & sustainable construction",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Check className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
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
          Contact Portable Office Cabin
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Ready to discuss your prefabricated labour hutments requirements? Share your project location, required bed count, and preferred timeline. Our engineering team provides preliminary layout suggestions within days of receiving inputs.
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
