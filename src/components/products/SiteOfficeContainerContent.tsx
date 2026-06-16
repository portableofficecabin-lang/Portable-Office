import { Building2, CheckCircle2, Wrench, ShieldCheck, Truck, Users, Factory, GraduationCap, HardHat, LayoutGrid, Ruler, PaintBucket, ClipboardCheck, Phone, ChevronRight, Zap, Package, Settings, Shield, Thermometer, MapPin, Calendar, IndianRupee, ArrowRightLeft, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function SiteOfficeContainerContent() {
  return (
    <div className="space-y-16">
      {/* Hero Introduction */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-accent rounded-full" />
          <span className="text-accent font-semibold uppercase tracking-wider text-sm">Complete Guide</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
          Office in Container – Portable Office Container Solutions in India
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          Since around 2018, Indian businesses across construction, infrastructure, oil and gas, and education sectors have increasingly turned to the office in container as a practical workspace solution. These steel structures—converted from standard shipping containers—deliver fully functional offices that can be deployed rapidly, relocated easily, and customized to meet specific project requirements.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          We specialize in designing and supplying ready-to-use office containers in standard ISO sizes (20 ft, 30 ft, 40 ft), each customized for Indian climate conditions including extreme heat, humidity, and coastal corrosion. Whether you're setting up a site office for a highway project or a temporary training facility, container offices offer a compelling alternative to traditional construction.
        </p>

        {/* Key Highlights */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, title: "Ready to Use", desc: "Complete electrical and interior fit-out upon delivery" },
            { icon: Truck, title: "Movable", desc: "Relocate between project locations using standard transport" },
            { icon: Settings, title: "Fully Customizable", desc: "Layouts, finishes, and branding tailored to you" },
            { icon: IndianRupee, title: "Cost-Effective", desc: "60-70% lower setup time vs. brick-and-mortar" },
          ].map((item) => (
            <div key={item.title} className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center hover:border-accent/30 transition-colors">
              <item.icon className="h-8 w-8 text-accent mx-auto mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground leading-relaxed mt-6">
          Container offices serve multiple purposes: site offices for contractors, project management hubs, sales offices, training rooms, and small branch offices for businesses operating on leased land.
        </p>
      </section>

      {/* Why Choose */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Why Choose an Office in a Container?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The decision to use a portable office container comes down to practical advantages that directly impact project timelines and budgets. Speed of deployment, mobility between sites, lower capital expenditure, reusability across multiple projects, and compliance with temporary structure requirements make container offices the preferred choice for project-based operations.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Calendar, title: "Quick Installation", desc: "5-7 days after order confirmation" },
            { icon: ArrowRightLeft, title: "Easy Relocation", desc: "Minimal disassembly between project sites" },
            { icon: IndianRupee, title: "Predictable Cost", desc: "Per sq ft pricing with no hidden civil work expenses" },
            { icon: Building2, title: "Minimal Foundation", desc: "Simple concrete blocks suffice" },
            { icon: ShieldCheck, title: "Factory-Built Quality", desc: "Better quality control under controlled conditions" },
            { icon: Package, title: "Reusable", desc: "Across 3-5 projects with proper maintenance" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <item.icon className="h-6 w-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Comparison */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 bg-accent/10 border-b border-border">
            <h3 className="font-semibold text-foreground">Timeline Comparison</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Office Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Typical Size</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Setup Time</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-muted/30">
                <td className="px-6 py-3 text-sm text-foreground">Container office</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">20-40 m²</td>
                <td className="px-6 py-3 text-sm text-accent font-semibold">1-3 weeks</td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-sm text-foreground">Conventional construction</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">20-40 m²</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">2-4 months</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground leading-relaxed mt-6">
          This makes container offices particularly suitable for Indian metro and Tier-2 cities where land is often leased short-term. Projects in Mumbai, Chennai, Bengaluru, and Hyderabad increasingly use container offices because structures must remain temporary yet robust enough for daily professional use.
        </p>
      </section>

      {/* Sizes and Specifications */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Standard Office Container Sizes and Specifications
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          We build on both new and cargo-worthy second hand containers, using standard outer dimensions while fully customizing interiors to client requirements. The nature of modular construction allows us to offer multiple size options that fit different team sizes and usage application scenarios.
        </p>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold text-foreground text-lg">Available Size Options</h3>
          {[
            "20 ft × 8 ft × 8.5 ft (approx. 160 sq ft) – Ideal for 4-6 workstations, compact site supervision",
            "20 ft × 10 ft × 8.5 ft (approx. 200 sq ft) – Suitable for 6-8 people, small project teams",
            "30 ft × 8 ft × 8.5 ft (approx. 240 sq ft) – Meeting room plus workstation combination",
            "40 ft × 8 ft × 8.6 ft (approx. 320 sq ft) – Full project office with manager cabin and conference area",
            "Custom combinations (e.g., 20 ft × 15 ft × 8.6 ft) – Created by joining multiple modules side-by-side",
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold text-foreground text-lg">Structural Specifications</h3>
          {[
            "Corten steel shell for corrosion resistance",
            "MS framing for internal structure",
            "Insulation options: PUF (40-50mm) or rockwool for fire resistance",
            "Marine-grade plywood flooring",
            "External PU paint suitable for coastal regions like Chennai and Mumbai",
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </div>
          ))}
        </div>

        {/* Size Comparison Table */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 bg-accent/10 border-b border-border">
            <h3 className="font-semibold text-foreground">Size Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Floor Area</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Typical Occupancy</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Best For</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: "20 ft standard", area: "160 sq ft", occ: "4-6 persons", best: "Site supervision, security" },
                  { size: "20 ft wide", area: "200 sq ft", occ: "6-8 persons", best: "Small project teams" },
                  { size: "30 ft", area: "240 sq ft", occ: "8-10 persons", best: "Combined office + meeting" },
                  { size: "40 ft", area: "320 sq ft", occ: "10-15 persons", best: "Full project headquarters" },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{row.size}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{row.area}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{row.occ}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Types of Office Containers */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Types of Office Containers We Offer
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          We design multiple configurations depending on your requirement, from single cabins to multi-room offices with partitions and integrated toilets. Each built type is engineered for specific use cases, ensuring you get exactly what your project demands.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              title: "Standard Portable Office Container",
              desc: "Fully finished interiors with vinyl flooring, modular electrical wiring, LED lighting, and optional basic furniture. This configuration suits quick site setup where teams need functional workspace within days of project commencement.",
            },
            {
              title: "Site Office Container",
              desc: "Rugged design specifically for construction sites and infrastructure projects. Includes provision for extra storage racks, notice boards, site documentation shelves, and reinforced flooring to handle heavy foot traffic and equipment.",
            },
            {
              title: "Furnished Executive Office Container",
              desc: "Upgraded finishes including false ceiling, split AC, executive desk, visitor seating, and premium flooring. Designed for client meetings on project locations where professional appearance matters.",
            },
            {
              title: "Modular Office Block (Joined Containers)",
              desc: "Two or more 20-ft or 40-ft containers joined side-by-side or end-to-end create larger halls, conference rooms, or departmental offices. Internal walls are removed where structurally feasible, creating open-plan spaces up to 600+ sq ft.",
            },
            {
              title: "Mobile Office with Toilet and Pantry",
              desc: "Integrated Indian/Western toilet, handwash basin, small pantry counter, overhead water tank, and complete plumbing. Ideal for remote sites where shared facilities are unavailable—think solar farms, mining locations, or highway construction in rural areas.",
            },
          ].map((type, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 hover:border-accent/30 transition-colors">
              <h3 className="font-semibold text-foreground text-lg mb-3">{type.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features and Interior Fit-Out */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Key Features and Interior Fit-Out Options
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Every office container is supplied ready-to-plug-in, with all basic services completed at our manufacturing facility. This factory-finished approach ensures consistent quality and reduces on-site work to simple utility connections.
        </p>

        <div className="space-y-8">
          {/* Structural Features */}
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Core Structural Features
            </h3>
            <div className="space-y-2">
              {[
                "Wall and roof insulation: 40-50mm PUF or rockwool panels for noise and heat reduction in 40+°C Indian summers",
                "Doors: Secure main door with industrial lock, optional glazed door for executive versions",
                "Windows: Powder-coated aluminum windows with safety grills and mosquito mesh",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Electrical */}
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Electrical Fit-Outs
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                "MCB panel with adequate circuit capacity",
                "Concealed wiring with ISI-marked cables",
                "Socket points (5A and 15A) at workstation locations",
                "LED light points with switches",
                "AC provision with dedicated MCB",
                "External inlet for generator or mains connection",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flooring */}
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <PaintBucket className="h-5 w-5 text-accent" />
              Flooring and Interiors
            </h3>
            <div className="space-y-2">
              {[
                "Marine ply base with heavy-duty vinyl or laminate finish",
                "Interior wall panels: laminated boards or pre-painted GI sheets for easy cleaning",
                "Ceiling: pre-painted GI or gypsum board false ceiling",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Upgrades */}
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              Optional Upgrades
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                "Air conditioning: Window AC (1.5 ton) or split AC (1-2 ton based on size)",
                "Furniture packages: Workstations, ergonomic chairs, storage units, file cabinets",
                "IT readiness: Conduits for LAN cables, provision for Wi-Fi routers and network switches",
                "Branding: Exterior paint in company colors with logo application",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mt-6">
          These products are factory-tested before dispatch, ensuring clients receive offices that work from day one.
        </p>
      </section>

      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Applications of Office in Container Across Sectors
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Container offices are used widely across India, from metro cities to remote project locations like mines, solar farms, and highway construction zones. The portability and self-contained nature of these units make them ideal wherever temporary yet professional workspace is required.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: HardHat,
              title: "Construction & Infrastructure",
              items: [
                "Site offices for metro rail projects in Delhi, Mumbai, Chennai, Bengaluru",
                "Project management hubs for highway and bridge construction",
                "Engineering offices at power plant construction sites",
                "Contractor coordination centers for large residential developments",
              ],
            },
            {
              icon: Factory,
              title: "Industrial Plants & Factories",
              items: [
                "Maintenance supervisor offices within factory premises",
                "Security and access control cabins",
                "Training rooms for skill development programs",
                "Quality control documentation centers",
              ],
            },
            {
              icon: GraduationCap,
              title: "Education & Training",
              items: [
                "Temporary classrooms during school renovation",
                "Exam control rooms for competitive examinations",
                "Skill development labs in ITI and vocational centers",
              ],
            },
            {
              icon: Users,
              title: "Events, Government & NGOs",
              items: [
                "Ticket counters and visitor registration offices",
                "Command and control rooms for event management",
                "Disaster relief administration offices",
                "Vaccination centers and mobile health units",
                "Field offices for survey and census operations",
              ],
            },
          ].map((sector) => (
            <div key={sector.title} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <sector.icon className="h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{sector.title}</h3>
              </div>
              <ul className="space-y-2">
                {sector.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground leading-relaxed mt-6">
          Many clients deploy container offices for project durations of 6-24 months, after which the same containers are shifted to the next site—maximizing return on investment across multiple projects.
        </p>
      </section>

      {/* Pricing Guide */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Pricing Guide and Cost Factors in 2025
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Container office cost in India is typically quoted per square foot or per unit, with rates varying based on specifications, steel prices, and current market conditions. As a manufacturer engaged in this field for years, we emphasize transparent pricing with itemized quotations.
        </p>

        {/* Pricing Table */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden mb-8">
          <div className="px-6 py-4 bg-accent/10 border-b border-border">
            <h3 className="font-semibold text-foreground">Indicative Price Ranges (2025)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Configuration</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Approximate Range</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { config: "Basic 20 ft office (unfurnished)", price: "₹2.5-3.5 lakh" },
                  { config: "Standard 20 ft with AC and basic furniture", price: "₹3.5-4.5 lakh" },
                  { config: "Furnished 40 ft executive office", price: "₹6-8 lakh" },
                  { config: "20 ft with integrated toilet and pantry", price: "₹4.5-6 lakh" },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <td className="px-6 py-3 text-sm text-foreground">{row.config}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-accent">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6 italic">
          Note: These are indicative ranges. Please wait for a formal quotation based on your specific requirements.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Main Cost Drivers</h3>
            <div className="space-y-2">
              {[
                "Size: 20 ft vs. 30 ft vs. 40 ft containers",
                "Container condition: Fresh/new vs. cargo-worthy used",
                "Insulation type: Standard PUF vs. fire-rated rockwool",
                "Interior finishing level: Basic vinyl vs. premium laminate",
                "Inclusions: Toilet, pantry, AC, furniture, electrical capacity",
                "Special requirements: IT infrastructure, CCTV provision, access control",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Additional Costs (Quoted Separately)</h3>
            <div className="space-y-2">
              {[
                "Transport from manufacturing yard to project site",
                "Crane charges for unloading and placement",
                "Foundation preparation if site requires leveling",
                "Electrical connection from site supply to container",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <IndianRupee className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mt-6">
          We encourage clients to request minimum order quantity and complete specifications when seeking quotes. This helps us provide accurate pricing with layout drawings and detailed bill of quantities.
        </p>
      </section>

      {/* Delivery, Installation, and Relocation */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Delivery, Installation, and Relocation Process
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          The complete lifecycle of a container office—from design approval through fabrication, delivery, installation, and eventual relocation—follows a structured process that minimizes surprises and ensures smooth handover.
        </p>

        {/* Timeline Steps */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { step: "1", title: "Design Finalization", desc: "2-3 days for layout approval and specification confirmation" },
            { step: "2", title: "Fabrication & Fit-Out", desc: "7-15 working days depending on complexity and customization" },
            { step: "3", title: "Transport & Placement", desc: "1-3 days based on location and site access" },
          ].map((item) => (
            <div key={item.step} className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center mx-auto mb-3 text-lg">
                {item.step}
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-2">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Site Requirements</h3>
            <div className="space-y-2">
              {[
                "Level ground (minor grading acceptable)",
                "Simple foundation: concrete blocks or MS channel frame",
                "Access road suitable for 20-ft or 40-ft trailer",
                "Clear space for crane operation (typically 40-ft radius)",
                "Electrical supply point within 50 meters",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Installation Steps</h3>
            <div className="space-y-2">
              {[
                "Container arrives on trailer at designated time",
                "Crane lifts and positions unit on prepared foundation",
                "Leveling and anchoring completed (if required)",
                "Electrical connection to site supply or DG set",
                "AC installation and testing (if not pre-installed)",
                "Brief handover and operational demonstration",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-accent font-semibold text-sm shrink-0 w-5">{idx + 1}.</span>
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-accent" />
            Relocation Process
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            When your project concludes, the same container can move to your next site:
          </p>
          <div className="space-y-2">
            {[
              "Disconnect electrical and plumbing utilities",
              "Remove any site-specific anchoring",
              "Lift container using crane onto transport trailer",
              "Transport to new location",
              "Re-install following standard placement procedure",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-accent font-semibold text-sm shrink-0 w-5">{idx + 1}.</span>
                <span className="text-muted-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-4">
            With proper handling, containers withstand multiple relocations with minimal wear—making them a deal that delivers value across years of use.
          </p>
        </div>
      </section>

      {/* Customization, Compliance */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Customization, Compliance, and Quality Standards
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Our focus on safety, durability, and compliance with applicable Indian norms guides every container office we design. As a manufacturer offering products in this field, we maintain strict quality control throughout fabrication.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Compliance & Safety</h3>
            <div className="space-y-2">
              {[
                "Electrical components: ISI-marked cables, branded MCBs (Havells, Schneider, or equivalent)",
                "Structural calculations for wind load resistance (designed for Indian coastal and high-wind zones)",
                "Fire-safe material options: rockwool insulation, fire-rated interior panels on request",
                "Earthing provision as per IE Rules",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Customization Capabilities</h3>
            <div className="space-y-2">
              {[
                "Custom partition layouts with manager cabins, meeting rooms, workstation bays",
                "Height modifications (high-cube options) where structurally feasible",
                "Additional window and door openings based on layout requirements",
                "Integration of CCTV, access control systems, and fire alarm panels",
                "Exterior branding with company colors and logos",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Settings className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-accent/5 border border-accent/15 rounded-xl p-6">
          <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-accent" />
            Factory Quality Checks Before Dispatch
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "Leak test (rain simulation for roof and wall joints)",
              "Electrical continuity and load testing",
              "Door and window alignment verification",
              "Interior finish inspection",
              "Photographic documentation provided to client",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Choose */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          How to Choose the Right Office Container for Your Project
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Selecting the right container office requires matching specifications to your actual operational needs. This section serves as a practical checklist for project managers and facility teams evaluating options.
        </p>

        <div className="grid sm:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Key Decision Factors</h3>
            <div className="space-y-2">
              {[
                "Occupancy: How many people will use the space at peak? Allow 15-20 sq ft per person",
                "Duration: Short-term (under 12 months) vs. multi-year deployment affects finishing choices",
                "Climate: High heat zones need better insulation; coastal areas need enhanced corrosion protection",
                "Utilities: Confirm power availability (single phase vs. three phase) and water supply",
                "Purpose: Internal team workspace vs. client-facing meeting space affects finish quality",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-4">Practical Tips</h3>
            <div className="space-y-2">
              {[
                "Sketch a rough layout showing door, window, desk placement, and toilet (if needed)",
                "Share this layout with your enquiry—it reduces design iterations significantly",
                "Plan for growth: if your team might expand, select modular sizes that can be joined later",
                "Consider future relocation: standard sizes (20 ft, 40 ft) are easier to transport",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Ruler className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            Questions to Answer Before Requesting a Quote
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "What is the maximum number of simultaneous occupants?",
              "Do you need a private cabin or meeting room?",
              "Is toilet/pantry required, or are shared facilities available nearby?",
              "What is your expected deployment duration?",
              "Will the container need to relocate during its useful life?",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-accent font-semibold text-sm shrink-0">{idx + 1}.</span>
                <span className="text-muted-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Frequently Asked Questions About Office in Container
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            {
              q: "How long does an office container last with regular maintenance in Indian conditions?",
              a: "With proper maintenance—annual touch-up painting, AC servicing, and electrical checks—a quality container office lasts 15-20 years. Units deployed in coastal areas benefit from additional anti-corrosion treatment every 3-4 years.",
            },
            {
              q: "Can a container office be stacked to create G+1 structures?",
              a: "Yes, containers can be stacked with proper structural reinforcement and engineering assessment. This is common for larger site setups requiring reception on ground floor and offices above. Stacking requires certified corner castings and professional installation.",
            },
            {
              q: "Is special government approval needed for using container offices on rented land?",
              a: "Container offices typically qualify as temporary structures and may not require building permission in many states. However, requirements vary by location and land use classification. Check with local municipal authorities for your specific site.",
            },
            {
              q: "How is temperature controlled inside during peak summer?",
              a: "We install 40-50mm PUF insulation on walls and roof, reducing heat transfer significantly. Combined with appropriately sized AC (1.5 ton for 20 ft, 2 ton for 40 ft), interior temperatures remain comfortable even when external temperatures exceed 45°C.",
            },
            {
              q: "Can we move the container after one project to another city?",
              a: "Absolutely. This is one of the primary advantages. Containers are designed for transport on standard trailers. A 20 ft unit can travel anywhere in India accessible by road, with crane placement at the destination site.",
            },
            {
              q: "What warranty is provided on structure, leakage, and interiors?",
              a: "We offer 12-month warranty on structural integrity, waterproofing, and electrical systems. Interiors (flooring, panels, doors) carry 6-month warranty against manufacturing defects. Extended warranty options are available.",
            },
            {
              q: "Are second hand containers as reliable as new ones?",
              a: "Cargo-worthy used containers offer excellent value when properly refurbished. We inspect, repair, and treat used containers to match new-unit durability. The cost savings (20-30% lower) make them attractive for budget-conscious projects without compromising quality.",
            },
            {
              q: "Can furniture be included in the container office package?",
              a: "Yes, we offer furniture packages including workstations, chairs, storage cabinets, and file racks. Clients can specify requirements, and furniture is installed before dispatch—so the office arrives ready for immediate use.",
            },
          ].map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-left text-foreground hover:text-accent">
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
      <section>
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Get a Quote for Your Office in Container
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto">
            Whether you need a compact 20 ft site office or a full 40 ft project headquarters with conference room and toilet, the right solution starts with understanding your specific requirements. We work with clients across India, offering design support, transparent pricing, and reliable delivery timelines.
          </p>
          <div className="text-left max-w-lg mx-auto mb-8">
            <h3 className="font-semibold text-foreground mb-3">Information to include in your enquiry:</h3>
            <div className="space-y-2">
              {[
                "Project location and tentative delivery date",
                "Required size (20 ft, 30 ft, 40 ft, or custom) and approximate team size",
                "Need for toilet, pantry, AC, or furniture",
                "Interior layout preferences (open plan, partitioned, private cabin)",
                "Expected duration of use and possibility of future relocation",
                "Any branding or special finish requirements",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            We respond with layout options, itemized costing, and realistic lead times—providing additional information that helps you compare container offices against conventional construction before making your final decision.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+919731897976"
              className="inline-flex items-center justify-center gap-2 bg-accent text-white font-semibold px-8 py-3 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call Us Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
