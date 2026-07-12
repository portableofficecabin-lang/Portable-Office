import { Building2, CheckCircle2, Wrench, ShieldCheck, Truck, Users, Leaf, HardHat, LayoutGrid, Ruler, PaintBucket, ClipboardCheck, Phone, ChevronRight, Bath, Factory, GraduationCap, Heart, ShoppingBag, Home, Zap, Calendar, IndianRupee, Settings, Hammer, Lightbulb, TrendingUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TechnicalSpecsPreset } from "./TechnicalSpecsPreset";

export function PortaCabinContent() {
  return (
    <div className="space-y-16">
      {/* Hero Introduction */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-accent rounded-full" />
          <span className="text-accent font-semibold uppercase tracking-wider text-sm">Complete Guide 2025</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
          Porta Cabin: Portable Cabins, Container Offices & Modular Buildings
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          If you're looking for a fast, cost-effective way to set up offices, accommodation, or utility spaces at your project site, a porta cabin might be exactly what you need. A modular cabin is a prefabricated, customizable, and easy-to-assemble structure made with steel frameworks and insulated panels, offering versatility for site offices, accommodations, and infrastructure with features like quick installation, durability, and compliance with safety standards.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          This guide covers everything from pricing and specifications to installation timelines and industry applications across India.
        </p>

        {/* Key Benefits Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Quick Installation", desc: "1–7 days depending on size" },
            { icon: IndianRupee, title: "Cost-Effective", desc: "30–40% cheaper than traditional" },
            { icon: Building2, title: "Reusable & Relocatable", desc: "Move across multiple project sites" },
            { icon: Leaf, title: "Eco-Friendly", desc: "70–80% less construction waste" },
          ].map((benefit) => (
            <div key={benefit.title} className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center hover:border-accent/30 transition-colors">
              <benefit.icon className="h-8 w-8 text-accent mx-auto mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-1">{benefit.title}</h4>
              <p className="text-xs text-muted-foreground">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Overview */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Zap className="h-7 w-7 text-accent" />
          Quick Overview of Porta Cabins in India
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          A porta cabin is a steel-framed, insulated, factory-manufactured modular structure designed for quick assembly, easy transportation, and reuse across multiple sites. These prefabricated units arrive ready to use, eliminating the lengthy timelines associated with traditional construction.
        </p>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Key Uses in 2025:</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {[
            "Construction site offices and project management rooms",
            "Labour quarters and dormitory-style accommodation",
            "Security guard cabins and entrance checkpoints",
            "Container offices for corporate and industrial use",
            "Container homes for farmhouses and remote locations",
            "Portable toilets and sanitary blocks",
            "Prefab classrooms and training centres",
            "Rooftop cabins, cafés, and canteens",
          ].map((use) => (
            <div key={use} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Portable Office Cabin manufactures and supplies porta cabins with a pan India delivery network, serving both B2B clients (contractors, developers, institutions, corporates, government departments) and B2C customers (individual plot owners, farmhouse developers, rooftop room requirements).
        </p>

        {/* 2025 Pricing Reference */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">2025 Pricing Reference:</h3>
          <div className="space-y-3">
            {[
              { label: "Per sq.ft. cost", value: "Approx ₹1,050–₹2,500 depending on specifications" },
              { label: "Small guard cabins", value: "Starting near ₹90,000–₹1,20,000" },
              { label: "Larger office & accommodation units", value: "₹1.8 lakh to ₹12 lakh+ based on size and finish" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <IndianRupee className="h-4 w-4 text-accent shrink-0 mt-1" />
                <div>
                  <span className="font-semibold text-foreground text-sm">{item.label}: </span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Cabins are delivered ready-to-use or in knock-down form and can be installed in 1–7 days depending on size and site readiness. Most standard units become operational within a week of delivery.
          </p>
        </div>
      </section>

      {/* What is a Porta Cabin */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-accent" />
          What is a Porta Cabin? (Definition, Lifespan & Components)
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            A porta cabin is a portable, prefabricated building constructed using MS steel structural frames and insulated sandwich panels made from PUF (Polyurethane Foam), EPS (Expanded Polystyrene), or Rockwool materials. These modular cabins are engineered for durability, typically offering 15–25 years of service life when fabricated with quality materials and maintained properly in Indian conditions.
          </p>
          <p>
            Unlike conventional brick-and-mortar structures, porta cabins are manufactured in controlled factory environments where precision engineering ensures consistent quality. The completed units are then transported to site by truck and lifted into position using cranes or hydra equipment. Smaller modules can be placed using simpler manual methods.
          </p>
        </div>

        <h3 className="font-display text-lg font-semibold text-foreground mt-8 mb-4">Core Components of a Standard Porta Cabin:</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Structural frame (MS steel sections with anti-rust coating)",
            "Wall panels (insulated PUF/EPS/Rockwool sandwich panels)",
            "Roofing system (sloped PPGI sheets or insulated panels)",
            "Flooring (marine plywood with vinyl/laminate finish)",
            "Doors (powder-coated steel or flush doors)",
            "Windows (aluminium or uPVC frames with MS grills)",
            "Electrical wiring (MCB-protected circuits, lights, switches, sockets)",
            "Plumbing provisions (where applicable for toilets, kitchens)",
            "Insulation layers (thermal and acoustic performance)",
            "Exterior coating (weather-resistant paint/PPGI finish)",
          ].map((comp) => (
            <div key={comp} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{comp}</span>
            </div>
          ))}
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mt-8">
          <h3 className="font-display font-bold text-foreground mb-3">Terminology Clarification for the Indian Market:</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The terms "porta cabin," "portable cabin," "container office," and "prefab building" are often used interchangeably, though they have subtle differences. Porta cabin typically refers to purpose-built modular units, while container office usually means a structure based on shipping container dimensions or repurposed containers. Prefab building is a broader category covering all factory-made structures. Portable Office Cabin offers all these variants under one roof, ensuring customers find the right solution regardless of terminology preferences.
          </p>
        </div>
      </section>

      {/* Advantages */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-accent" />
          Advantages of Porta Cabins Over Traditional Construction
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          When compared to conventional brick-and-mortar construction, porta cabins deliver significant advantages in cost, speed, and flexibility. Industry data suggests porta cabins are typically 30–40% cheaper and 60–70% faster to deploy than traditional buildings for comparable use cases in 2025 India.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Zap,
              title: "Speed of Installation",
              desc: "Typical timelines range from 1–3 days for small cabins to 7–15 days for larger blocks. A standard 20ft × 10ft site office can be delivered and installed in under a week.",
            },
            {
              icon: IndianRupee,
              title: "Cost Savings",
              desc: "Per sq.ft. cost of ₹1,050–₹2,500 compares favourably against civil construction costs in metros where traditional builds often exceed ₹3,000–₹4,000 per sq.ft.",
            },
            {
              icon: Truck,
              title: "Flexibility & Mobility",
              desc: "Cabins can be relocated between sites, stacked vertically for multi-storey configurations, extended with additional modules, and reused across multiple projects.",
            },
            {
              icon: ShieldCheck,
              title: "Comfort & Performance",
              desc: "Thermal insulation maintains comfortable indoor temperatures. Options include AC, false ceilings, LED lighting, and leak-proof roofing for heavy rain regions.",
            },
            {
              icon: Leaf,
              title: "Sustainability Benefits",
              desc: "Recyclable steel frames, 70–80% less construction waste, reduced on-site dust and noise. Components can be refurbished or recycled at end of life.",
            },
            {
              icon: Settings,
              title: "Reduced Site Disruption",
              desc: "Manufacturing happens off-site—minimal disruption to ongoing operations. Valuable for schools, hospitals, or active industrial plants.",
            },
          ].map((adv) => (
            <div key={adv.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="bg-accent/10 rounded-lg p-2.5 inline-block mb-3">
                <adv.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{adv.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{adv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Types of Porta Cabins */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <LayoutGrid className="h-7 w-7 text-accent" />
          Types of Porta Cabins Offered by Portable Office Cabin
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Portable Office Cabin manufactures a comprehensive range of porta cabins and container-based structures designed for offices, housing, security, sanitation, and commercial applications. Each product line can be customized to suit specific project requirements.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              icon: Building2,
              title: "Portable Office Cabins",
              desc: "Available in 10×8 ft, 20×10 ft, 30×10 ft, and 40×10 ft with doors, windows, electrical fittings, insulation, and flooring. 2025 pricing from ₹1.5 lakh for basic 10×8 ft to ₹8 lakh+ for fully furnished 40×10 ft offices.",
            },
            {
              icon: Factory,
              title: "Container Offices",
              desc: "Re-engineered ISO shipping container dimensions or container-style cabins with insulated panels, corporate-grade interiors, meeting rooms, and branding options. Built for long lifespan usage.",
            },
            {
              icon: Users,
              title: "Prefab Labour Accommodation",
              desc: "Dormitory-style layouts with bunk beds, common washrooms, ventilation, and recreation areas. Designed for 20–200+ workers with per-bed costing structures for budget planning.",
            },
            {
              icon: ShieldCheck,
              title: "Portable Security Cabins",
              desc: "Compact guard cabins in 4×4 ft, 4×6 ft, and 6×6 ft sizes using MS steel and PUF panels. Features include glass panels, service counters, fan, light, and wiring. From ₹90,000–₹1,50,000.",
            },
            {
              icon: Bath,
              title: "Portable Toilets & Sanitary Blocks",
              desc: "Single, twin, and multi-seat toilet cabins with Indian/Western WCs, overhead tanks, and waste connections. For construction sites, events, and remote locations.",
            },
            {
              icon: Home,
              title: "Container Homes & Prefab Villas",
              desc: "1BHK and 2BHK container homes with bedrooms, kitchen, toilet, and deck options. Popular for farmhouses, hill stations, and remote sites. Modern living standards maintained.",
            },
            {
              icon: HardHat,
              title: "Rooftop Porta Cabins & Sheds",
              desc: "Lightweight cabins for RCC building rooftops. Used as extra rooms, staff quarters, cafés, or canteens. Account for structural load limitations and waterproofing.",
            },
            {
              icon: Lightbulb,
              title: "Special Application Cabins",
              desc: "Soundproof cabins, portable classrooms, site laboratories, canteens, prefab cafés, and PEB-supported large halls integrating porta modules for warehousing or events.",
            },
          ].map((type) => (
            <div key={type.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-accent/10 rounded-lg p-2.5 shrink-0">
                  <type.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{type.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Specifications */}
      <TechnicalSpecsPreset />


      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Factory className="h-7 w-7 text-accent" />
          Applications Across Industries & Use Cases
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Indian sectors including construction, infrastructure, education, healthcare, manufacturing, oil & gas, mining, retail, and hospitality are widely adopting porta cabins in 2025 for their speed, cost efficiency, and functionality advantages.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: HardHat, title: "Construction & Infrastructure", desc: "Site offices, store rooms, drawing offices, labour camps, and safety induction rooms on highway projects, metro rail corridors, refinery expansions, and power plant sites." },
            { icon: Factory, title: "Corporate & Industrial", desc: "Container offices, training rooms, control cabins, security blocks, parking booths, and utility enclosures within manufacturing plants and corporate campuses." },
            { icon: GraduationCap, title: "Education & Training", desc: "Portable classrooms, laboratories, computer labs, staff rooms, and temporary hostels for schools, colleges, and coaching institutes." },
            { icon: Heart, title: "Healthcare", desc: "Portable clinics, sample collection cabins, vaccination centres, and doctor consultation rooms. Equipped with medical-grade finishes and HVAC systems." },
            { icon: ShoppingBag, title: "Retail, Café & Hospitality", desc: "Container cafés, food kiosks, ticket counters, check-in booths, and small retail outlets at malls, petrol pumps, tourist sites, and event venues." },
            { icon: Home, title: "Residential & Recreational", desc: "Container homes for farmhouses, hill stations, and remote sites. Staff quarters and rooftop rooms on existing buildings." },
            { icon: Building2, title: "Government & Public Sector", desc: "Disaster relief shelters, rural health centres, police outposts, e-governance kiosks, and election booths where speed and mobility matter most." },
          ].map((app) => (
            <div key={app.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <app.icon className="h-6 w-6 text-accent mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-2">{app.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{app.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customization Options */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <PaintBucket className="h-7 w-7 text-accent" />
          Customization Options for Porta Cabins
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            One of the standout features of modern porta cabins is their remarkable flexibility in customization. Manufacturers understand that every project has unique requirements, so they offer a wide range of options to ensure each cabin is perfectly suited to its intended use. Clients can select from various sizes, layouts, and configurations, tailoring everything from the number of rooms to the placement of doors and windows.
          </p>
          <p>
            Advanced features such as insulated wall panels, high-quality electrical fittings, and integrated plumbing systems can be specified to enhance comfort and functionality. Materials can be chosen to match the desired level of durability, aesthetics, and budget—ranging from sturdy steel to composite panels designed for superior insulation.
          </p>
          <p>
            For sites exposed to heavy rain or extreme temperatures, cabins can be engineered with additional weatherproofing and climate control features. This level of customization ensures that whether you need a compact guard cabin, a spacious site office, or a fully equipped classroom, you can discover a solution that is precisely customized to your project requirements and industry standards.
          </p>
        </div>
      </section>

      {/* Pricing Guide */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <IndianRupee className="h-7 w-7 text-accent" />
          Porta Cabin Pricing in India (2025 Reference Guide)
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Final porta cabin pricing depends on size, specification level, interior finishes, delivery location, and installation complexity. Standard insulated porta cabins typically cost approx ₹1,050–₹2,500 per sq.ft. in 2025 across most Indian cities.
        </p>

        {/* Small Cabin Pricing */}
        <h3 className="font-display text-xl font-semibold text-foreground mb-4">Small Cabin Examples:</h3>
        <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Cabin Type</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Size</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Approx Price Range</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: "Security cabin (basic)", size: "4×4 ft", price: "₹90,000–₹1,10,000" },
                { type: "Security cabin (standard)", size: "4×6 ft", price: "₹1,00,000–₹1,30,000" },
                { type: "Guard room (premium)", size: "6×6 ft", price: "₹1,20,000–₹1,60,000" },
              ].map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground text-sm">{row.type}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{row.size}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm font-semibold">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-6 py-3 text-xs text-muted-foreground bg-muted/20">Inclusions typically cover window, counter, fan, light, and basic wiring.</p>
        </div>

        {/* Office Cabin Pricing */}
        <h3 className="font-display text-xl font-semibold text-foreground mb-4">Office Cabin Examples:</h3>
        <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Cabin Size</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Bare Shell</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Fully Finished (with AC, furniture)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { size: "10×8 ft", bare: "₹1,50,000–₹2,00,000", full: "₹2,50,000–₹3,50,000" },
                { size: "20×10 ft", bare: "₹2,50,000–₹3,50,000", full: "₹4,50,000–₹6,00,000" },
                { size: "30×10 ft", bare: "₹3,50,000–₹5,00,000", full: "₹6,00,000–₹8,50,000" },
                { size: "40×10 ft", bare: "₹5,00,000–₹7,00,000", full: "₹8,00,000–₹12,00,000+" },
              ].map((row, i) => (
                <tr key={row.size} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground text-sm">{row.size}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{row.bare}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm font-semibold">{row.full}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Factors Affecting Price */}
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Factors Affecting Price:</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Insulation type (EPS vs PUF vs Rockwool)",
            "Panel thickness (40mm vs 50mm vs 60mm)",
            "Window and door specifications",
            "Electrical load requirements",
            "Plumbing complexity",
            "Interior finishes and furniture",
            "Delivery distance and site accessibility",
          ].map((factor) => (
            <div key={factor} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{factor}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 leading-relaxed">
          Contact Portable Office Cabin for same-day estimates and layout drawings based on your specific capacity, layout, and functional needs.
        </p>
      </section>

      {/* Installation & Delivery */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Calendar className="h-7 w-7 text-accent" />
          Installation, Delivery & Project Timeline
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Portable Office Cabin follows a streamlined end-to-end process covering design, approval, fabrication, dispatch, on-site installation, utility connections, and handover.
        </p>

        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Typical Timelines:</h3>
        <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Phase</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Duration</th>
              </tr>
            </thead>
            <tbody>
              {[
                { phase: "Design and approval", duration: "2–5 days" },
                { phase: "Manufacturing", duration: "7–20 days (size dependent)" },
                { phase: "Transport", duration: "1–5 days (distance dependent)" },
                { phase: "Installation", duration: "1–3 days (small units), 7–10 days (multi-unit)" },
              ].map((row, i) => (
                <tr key={row.phase} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground text-sm">{row.phase}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <h3 className="font-display text-lg font-semibold text-foreground">Site Requirements:</h3>
          <p>Installation requires level ground or a prepared PCC/RCC foundation depending on cabin size and permanence. Crane or hydra access is necessary for larger modules. Power and water availability support installation and occupancy.</p>
          
          <h3 className="font-display text-lg font-semibold text-foreground mt-6">Transport & Logistics:</h3>
          <p>Cabins are transported using trucks and trailers sized for unit dimensions. Height and width constraints sometimes require modules to be split for shipping and reassembled on site. Our logistics team coordinates permits and route planning for oversized loads.</p>

          <h3 className="font-display text-lg font-semibold text-foreground mt-6">Handover & Training:</h3>
          <p>Customers receive guidance on basic maintenance requirements, warranty terms, and do's and don'ts for moving or modifying cabins. Documentation covers specifications, electrical layouts, and recommended service intervals.</p>
        </div>
      </section>

      {/* Durability & Maintenance */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Wrench className="h-7 w-7 text-accent" />
          Durability, Maintenance & Sustainability
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          With quality materials and proper care, porta cabins deliver 15–25 years of dependable service life in Indian conditions. Regular maintenance extends lifespan and maintains appearance standards.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: "Structural Durability",
              desc: "Steel frames resist wind loads, seismic forces, and transport stress. Anti-rust coatings protect against corrosion, with periodic repainting every 3–4 years for exteriors.",
            },
            {
              title: "Roof & Panel Maintenance",
              desc: "Annual pre-monsoon inspections for sealant integrity, screw tightness, gutter condition, and joint waterproofing. Early attention prevents leaks and corrosion.",
            },
            {
              title: "Electrical & Plumbing",
              desc: "Wiring inspection every 2–3 years for safety. Plumbing checks every 1–2 years for proper function and hygiene in toilet and kitchen installations.",
            },
            {
              title: "Sustainability Advantages",
              desc: "Lower embodied carbon vs repeated brick construction. 70–80% less construction waste. Steel frames fully recyclable. Cabins can be upgraded and repurposed throughout lifespan.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case Studies */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-accent" />
          Case Studies: Porta Cabins in Action
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <HardHat className="h-5 w-5 text-accent" />
              Infrastructure Project Deployment
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A leading construction company deployed customized site offices and guard cabins on a major infrastructure project. The cabins were installed quickly, providing durable and comfortable spaces for staff and security personnel. Easy relocation allowed the company to adapt as the project progressed, saving both time and costs compared to traditional construction.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" />
              School Classroom Expansion
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A growing school facing urgent classroom shortages opted for modular porta cabins. New classrooms were added within weeks with proper insulation, electrical fittings, and modern interiors, creating a safe and inviting learning environment. A durable, long-lasting solution that supported expansion without delays or expenses of permanent construction.
            </p>
          </div>
        </div>
      </section>

      {/* Future Trends */}
      <section className="bg-accent/5 border border-accent/20 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-accent" />
          Future of Porta Cabins: Trends & Innovations for 2025 and Beyond
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The future of porta cabins in India is bright, with manufacturers embracing new trends and technologies. Sustainable materials are becoming increasingly popular, reducing environmental impact while maintaining strength and durability. Advanced insulation technologies are being integrated to enhance energy efficiency and comfort.
          </p>
          <p>
            Smart features—such as automated lighting, climate control, and integrated security systems—are transforming portable offices, guard cabins, and luxury accommodations into high-tech, user-friendly spaces. The continued rise of modular construction is driving faster assembly, greater scalability, and more cost-effective solutions.
          </p>
          <p>
            As these trends take hold, porta cabins are set to become even more versatile, efficient, and high-quality—remaining at the forefront of India's construction and infrastructure landscape.
          </p>
        </div>
      </section>

      {/* Why Choose Us */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-accent" />
          Why Choose Portable Office Cabin as Your Porta Cabin Partner
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: "Design Capability", desc: "In-house CAD layouts, 3D visualizations, and BIS/NBC compliance. Every design accounts for specific site conditions." },
            { title: "Comprehensive Range", desc: "From small security cabins to multi-storey container offices, labour colonies, portable toilets, prefab classrooms, and PEB-backed warehouses." },
            { title: "Quality & Safety", desc: "Certified steel, branded panels, strict welding checks, safe electrical practices, and fire-safety considerations in all layouts." },
            { title: "Customisation & Branding", desc: "Corporate colours, logo applications, glass façades, luxury finishes, and plug-and-play HVAC and IT infrastructure." },
            { title: "Delivery Capability", desc: "Experience with construction firms, institutions, industrial clients, and government departments. Scalable production capacity." },
            { title: "After-Sales Support", desc: "Installation supervision, relocation needs, repairs, modifications, and expansion planning. Relationship extends beyond delivery." },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-foreground text-sm mb-2">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          FAQs on Porta Cabins (2025)
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Common questions from project managers, purchase teams, and individual buyers evaluating porta cabins in India.
        </p>
        <Accordion type="single" collapsible className="space-y-3">
          {[
            {
              q: "What is a porta cabin?",
              a: "A porta cabin is a portable, factory-manufactured modular structure built using steel frames and insulated panels. These units offer quick installation, easy relocation between sites, and can be customized for offices, accommodation, security, sanitation, and commercial applications.",
            },
            {
              q: "How long does a porta cabin last?",
              a: "With proper fabrication and maintenance, porta cabins typically last 15–25 years. Factors influencing lifespan include installation location, usage intensity, climate exposure, and adherence to recommended maintenance schedules.",
            },
            {
              q: "What sizes are available?",
              a: "Standard sizes include 10×8 ft, 20×8 ft, 20×10 ft, 30×10 ft, and 40×10 ft single units. Fully custom dimensions and layouts are possible through modular combination or bespoke fabrication to match specific specifications.",
            },
            {
              q: "Can porta cabins be shifted to another location?",
              a: "Yes, relocation is a core advantage. The process involves disconnecting utilities, securing internal fixtures, arranging crane access at both locations, and planning transport routes. Most cabins can be relocated within 2–5 days depending on distance and logistics.",
            },
            {
              q: "Do porta cabins require government approvals?",
              a: "Requirements vary by location and usage. Temporary, small units on private land sometimes need simpler approvals, while permanent installations or units with utility connections may require local authority consent. Check with your local municipal body for guidance.",
            },
            {
              q: "Are porta cabins suitable for summer and winter?",
              a: "Yes, when properly specified. PUF, EPS, or Rockwool insulation maintains comfortable temperatures. Ventilation options, AC provisions for heat management, and heating equipment for cold regions ensure year-round comfort across Indian climate zones.",
            },
            {
              q: "How soon can Portable Office Cabin deliver?",
              a: "Standard models typically ship within 7–20 days after design approval. Urgent requirements can be discussed case-by-case, with expedited manufacturing available for priority projects. Lead times depend on cabin size, specifications, and current production schedules.",
            },
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6">
              <AccordionTrigger className="text-foreground font-semibold text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-accent text-white rounded-2xl p-8 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
          Ready to Get Started with Your Porta Cabin?
        </h2>
        <p className="text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
          Whether you need a single guard cabin or a complete labour colony, share your requirements with us. Provide your layout preferences, capacity needs, and location details to receive a tailored design, exact pricing, and realistic project timeline.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:+919731897976" className="inline-flex items-center justify-center gap-2 bg-white text-accent font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-colors">
            <Phone className="h-5 w-5" />
            Call Now
          </a>
          <a href="/contact" className="inline-flex items-center justify-center gap-2 border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors">
            Request a Quote
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
