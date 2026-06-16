import Link from "next/link";
import { CheckCircle, Building2, Truck, Shield, Wrench, Leaf, Palette, HardHat, Factory, GraduationCap, Landmark, ShoppingBag, Phone, Users, Lock, Wifi, Clock, DollarSign, Hammer, Eye, Thermometer, Paintbrush } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export function ContainerOfficeGenericContent() {
  return (
    <div className="space-y-16">
      {/* Intro Section */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Container Office: Modern Workspace Solutions by Portable Office Cabin
        </h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            The way businesses approach workspace infrastructure has shifted dramatically. Traditional brick-and-mortar construction no longer fits the timeline or budget requirements of fast-moving projects. Enter the container office—a solution that delivers functional, professional workspaces in a fraction of the time and cost of conventional buildings.
          </p>
          <p>
            Across India, from metro construction sites in Mumbai to logistics parks in Gujarat, container offices have become the preferred choice for organizations that need to move fast without compromising on quality. At Portable Office Cabin, we've designed, manufactured, and installed hundreds of these modular workspaces for clients who understand that time is money.
          </p>
        </div>
      </section>

      {/* What is a Container Office */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          What is a Container Office?
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            A container office is an office space constructed from ISO shipping containers or purpose-built portable containers, engineered specifically for workspace functionality. These structures transform robust steel frames into fully equipped offices complete with electrical systems, climate control, furniture, and modern finishes.
          </p>
          <p>
            Portable Office Cabin designs, manufactures, and installs container offices across India for both temporary and permanent use. Our solutions serve construction companies needing rapid site offices, corporations requiring additional workspace, educational institutions setting up administrative blocks, and government departments coordinating field operations.
          </p>
          <p>
            Standard sizes include 20 ft and 40 ft containers, with customized multi-container complexes available for larger requirements. Common applications range from compact site offices and sales offices to corporate extensions and project command centres.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {[
            "Speed of setup: Deployable in days rather than months",
            "Cost-efficiency: Significantly lower capital expenditure",
            "Portability: Relocate to new sites when projects move",
            "Reduced material wastage: Factory-controlled fabrication minimizes on-site waste",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 bg-muted/50 rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mt-8">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Real Project Example:</strong> We delivered a project site office for a metro rail contractor in Mumbai in 2023—a fully fitted 40 ft container office was operational within 12 days of order confirmation. Similarly, a real estate developer in Pune used our container offices as sales galleries, impressing clients with modern aesthetics while maintaining complete flexibility to relocate as the project phases progressed.
          </p>
        </div>
      </section>

      {/* Key Benefits */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Key Benefits of Container Offices
        </h2>
        <p className="text-muted-foreground mb-8">
          Choosing a container office over traditional construction isn't just about convenience—it's a strategic business decision backed by tangible advantages across cost, time, sustainability, and operational flexibility.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: DollarSign,
              title: "Cost Savings vs Traditional Construction",
              desc: "Container offices typically prove 20–30% more economical while delivering comparable functionality. Savings come from reduced material costs, minimal foundation requirements, and significantly lower labour expenses due to factory-based fabrication.",
            },
            {
              icon: Clock,
              title: "Rapid Deployment Timelines",
              desc: "A standard 20 ft container office can be set up within 7–10 days from order confirmation—including fabrication, delivery, and on-site installation. Even a small permanent structure would require months of construction activity.",
            },
            {
              icon: Truck,
              title: "Mobility and Reusability",
              desc: "The same container office that serves a highway project in Rajasthan can be relocated to a power plant site in Madhya Pradesh. This reusability reduces long-term CAPEX dramatically, turning sunk costs into redeployable assets.",
            },
            {
              icon: Leaf,
              title: "Sustainability Advantages",
              desc: "Container offices reuse steel structures, reduce site disturbance, and can integrate energy-efficient features like solar panels, LED lighting, and high-performance insulation to minimize operational energy consumption.",
            },
            {
              icon: Shield,
              title: "Durability and Safety",
              desc: "All-steel frames provide wind resistance, weather protection, and structural integrity suitable for the diverse Indian climate—from coastal humidity to desert heat to monsoon conditions.",
            },
            {
              icon: Users,
              title: "Versatile Customer Profiles",
              desc: "Project developers, EPC contractors, logistics parks, educational institutions, and government departments all benefit from workspace that moves with their needs.",
            },
          ].map((benefit) => (
            <div key={benefit.title} className="bg-muted/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <benefit.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Designs & Ideas */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Popular Container Office Designs & Ideas
        </h2>
        <p className="text-muted-foreground mb-8">
          Container offices offer remarkable design flexibility despite working within standardized dimensions. Here are specific configurations we regularly deliver to clients across various sectors:
        </p>
        <div className="space-y-6">
          {[
            {
              title: "Single 20 ft Compact Site Office",
              desc: "Features 2 workstations, a small meeting corner, and wall-mounted storage—ideal for small construction sites where a supervisor and site engineer need functional workspace without excessive footprint.",
            },
            {
              title: "40 ft Executive Container Office",
              desc: "Includes a partitioned manager's cabin, open-plan workstation area accommodating 4–6 staff, split AC units, and an attached washroom—suitable for project managers who need to host client meetings while maintaining daily operations.",
            },
            {
              title: "Multi-Container Stacked Office Complex",
              desc: "A G+1 container office block we completed for an industrial park in Gujarat in 2022 featured an external staircase, balcony access, and interconnected upper and lower floors—delivering 640+ square feet of usable office space with minimal ground footprint.",
            },
            {
              title: "Glass Façade Container Office",
              desc: "Designed for sales galleries and marketing offices at real estate projects, these units feature large aluminium-framed glass panels that create bright, inviting spaces while maintaining the structural advantages of container construction.",
            },
            {
              title: "Combined Office and Conference Room",
              desc: "A 40 ft unit configured with an 8–10 seater meeting table, projector mount, acoustic wall panels, and a separate work area—perfect for teams that need presentation capabilities alongside regular workspace.",
            },
            {
              title: "Hybrid Office with Attached Pantry",
              desc: "Container office connected to a prefab pantry and canteen module, creating a self-contained workspace cluster for large labour camps or remote project sites where staff welfare facilities are essential.",
            },
            {
              title: "Rooftop Container Offices",
              desc: "Installed on existing industrial sheds or building terraces where ground-level space is limited—we've deployed these solutions for manufacturing units in Chennai and logistics facilities in Delhi NCR where vertical expansion made more sense than acquiring additional land.",
            },
          ].map((design) => (
            <div key={design.title} className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{design.title}</h3>
              <p className="text-muted-foreground">{design.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interior Planning */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Interior Planning, Windows & Office Fit-Out
        </h2>
        <p className="text-muted-foreground mb-8">
          Effective interior planning transforms a steel box into a productive workspace. At Portable Office Cabin, we approach container office interiors with the same rigour applied to permanent office design.
        </p>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="layout">
            <AccordionTrigger className="text-lg font-semibold">Internal Layout Planning</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Internal layout planning begins with understanding workflow requirements. Within a container footprint, we zone spaces for reception areas, workstations, private cabins, meeting corners, storage, and server or equipment corners. The key is maximizing usable area while maintaining comfortable circulation paths—something that requires experience with container dimensions and practical workspace design.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="finishes">
            <AccordionTrigger className="text-lg font-semibold">Standard Interior Finishes</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Standard interior finishes include insulated sandwich panels for walls and ceilings (providing both thermal performance and clean aesthetics), vinyl or laminate flooring for durability and easy maintenance, and modular false ceilings that conceal electrical and HVAC components while enabling easy access for maintenance.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="furniture">
            <AccordionTrigger className="text-lg font-semibold">Ergonomic Office Furniture</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Ergonomic office furniture must account for container width constraints. We offer built-in workstations that optimize desk space, filing cabinets designed for container floor plans, wall-mounted shelves that free up floor area, and custom-made conference tables sized precisely for container interiors without creating cramped meeting spaces.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="electrical">
            <AccordionTrigger className="text-lg font-semibold">Electrical & Data Planning</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Electrical and data planning requires careful attention in container offices. Our installations include concealed copper wiring, adequate power outlets positioned for practical workstation layouts, LED lighting for energy efficiency, and dedicated provisions for LAN connections, Wi-Fi routers, and CCTV points. All electrical work uses MCB distribution boards and proper earthing systems.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="hvac">
            <AccordionTrigger className="text-lg font-semibold">HVAC & Comfort Considerations</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                HVAC and comfort considerations are critical for Indian climates. We size split AC units based on container volume and expected occupancy, install ventilation fans for air circulation, specify double-glazed windows where required for thermal performance, and use appropriate insulation to reduce heat gain during summer months. The goal is maintaining comfortable working temperatures without excessive energy consumption.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="branding">
            <AccordionTrigger className="text-lg font-semibold">Branding & Signage Integration</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Branding and signage integration allows container offices to represent your organization professionally. External paint schemes can match corporate colours, vinyl graphics and logos can be applied to container exteriors, and name boards and safety signage can be integrated into the overall design rather than appearing as afterthoughts.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Sustainability */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Sustainability in Container Office Solutions
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Container offices are rapidly gaining traction across India as a sustainable alternative to traditional construction. By repurposing containers for office use, businesses significantly reduce the demand for new building materials and minimize construction waste. This approach not only conserves resources but also supports eco-friendly business practices that are increasingly important in today's market.
          </p>
          <p>
            One of the key sustainability features of container offices is their ability to maximize access to natural light and ventilation. With strategically placed windows, these offices reduce reliance on artificial lighting and air conditioning, leading to lower energy consumption. Many container offices are also fitted with advanced air filters and energy-efficient systems, further decreasing their environmental impact.
          </p>
          <p>
            For companies looking to sort through their sustainability objectives, container offices offer a practical solution. They allow organizations to meet workspace needs while aligning with green building standards and reducing their overall carbon footprint. In India, where environmental regulations and corporate responsibility are becoming more prominent, container offices provide a clear path to achieving sustainability goals without compromising on functionality or comfort.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Leaf, label: "Reduced construction waste" },
            { icon: Eye, label: "Maximized natural light & ventilation" },
            { icon: Thermometer, label: "Energy-efficient insulation & HVAC" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-xl p-4">
              <item.icon className="h-5 w-5 text-accent shrink-0" />
              <span className="text-foreground font-medium text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Security and Safety */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Security and Safety Features
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Security and safety are top priorities for any workspace, and container offices are designed to meet these needs with robust, modern solutions. Each office can be equipped with secure doors and permission-based access control systems, ensuring that only authorized personnel can enter sensitive areas. This level of access management is especially valuable for project sites and corporate environments where security is paramount.
          </p>
          <p>
            When you purchase a container office for sale from Portable Office Cabin, safety features are integrated from the outset. These may include fire suppression systems, emergency exits, and structurally reinforced designs that withstand harsh weather and environmental conditions. The all-steel construction not only provides durability but also enhances the overall safety of the workspace.
          </p>
          <p>
            For added peace of mind, container offices can be fitted with advanced security systems such as CCTV cameras, motion detectors, and alarm systems. These features help monitor activity and deter unauthorized access, creating a secure and productive environment for your team.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {[
            "Secure doors with multi-point locking systems",
            "Permission-based access control integration",
            "Fire suppression systems & emergency exits",
            "CCTV cameras, motion detectors & alarm systems",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 bg-muted/50 rounded-xl p-4">
              <Lock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Integration */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Technology and Infrastructure Integration
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Modern businesses require workspaces that keep pace with technological advancements, and container offices are perfectly suited for this demand. The modular design of containers allows for seamless integration of high-speed internet, telecommunications, and advanced office infrastructure. Whether you need a fully equipped data center, a server room, or collaborative workspaces, container offices can be customized to support your technology needs.
          </p>
          <p>
            State-of-the-art audiovisual equipment can be installed for meetings, presentations, and remote collaboration, making these offices ideal for dynamic, tech-driven teams. The flexibility of containers also enables open floor plans and innovative layouts that foster teamwork and creativity.
          </p>
          <p>
            By choosing container offices, businesses in India can create a modern, connected workspace that adapts to evolving technological requirements. This ensures employees have the tools and infrastructure they need to work efficiently, no matter where the office is located.
          </p>
        </div>
      </section>

      {/* Applications Across Sectors */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Applications of Container Offices Across Sectors
        </h2>
        <p className="text-muted-foreground mb-8">
          Container offices serve diverse sectors across India, each with specific requirements that our modular approach addresses effectively.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: HardHat,
              title: "Construction & Infrastructure",
              desc: "Site offices for road, metro, bridge, and power projects requiring rapid deployment, durability, and eventual relocation. In 2021, we delivered a 40 ft site office for a highway contractor in Rajasthan that served three different project locations over two years.",
            },
            {
              icon: Factory,
              title: "Industrial & Logistics",
              desc: "Admin blocks, weighbridge control rooms, security checkpoints, and visitor management offices. SEZs, warehouses, and logistics parks benefit from adding administrative capacity without permanent construction.",
            },
            {
              icon: GraduationCap,
              title: "Education & Training",
              desc: "Temporary academic offices, counselling cabins, examination control rooms, and training centres. Set up functional administrative space during campus expansion without disrupting ongoing academic activities.",
            },
            {
              icon: Building2,
              title: "Corporate & IT",
              desc: "Additional modular workspace, project war rooms for specific client engagements, and remote office pods for teams working near client facilities. Professional finish that doesn't compromise corporate image.",
            },
            {
              icon: Landmark,
              title: "Government & Public Sector",
              desc: "Disaster relief coordination offices, command centres for large-scale operations, and temporary administrative cabins during public events, elections, or census activities. Rapid deployment within days.",
            },
            {
              icon: ShoppingBag,
              title: "Retail & Hospitality",
              desc: "Sales kiosks, booking counters, reception modules, and administrative spaces integrated with container cafés. Real estate developers deploy container offices as sale galleries that can relocate as project phases complete.",
            },
          ].map((sector) => (
            <div key={sector.title} className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <sector.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{sector.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm">{sector.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Overview */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          How We Design & Deliver Container Offices (Process Overview)
        </h2>
        <p className="text-muted-foreground mb-8">
          Understanding our process helps clients plan their projects effectively and ensures smooth execution from initial enquiry to final handover.
        </p>

        <div className="space-y-6">
          {[
            {
              step: "01",
              title: "Client Consultation",
              desc: "Our team conducts a requirement study covering intended use, occupancy numbers, site conditions, MEP needs, and timeline expectations. This phase typically completes within 2–3 working days after enquiry.",
            },
            {
              step: "02",
              title: "Design & Costing",
              desc: "We produce 2D layout drawings showing furniture placement, basic 3D views for visualization, and detailed BOQ submissions covering all materials, fixtures, and installation costs. Turnaround within 5–7 days.",
            },
            {
              step: "03",
              title: "Engineering & Fabrication",
              desc: "Factory-controlled fabrication includes steel cutting and framing, welding, panel installation, door and window fittings, flooring, electrical rough-in, and painting. Eliminates weather delays and enables parallel work streams.",
            },
            {
              step: "04",
              title: "Quality Checks",
              desc: "Structural inspection verifies frame integrity, electrical testing confirms safe systems, water leakage testing ensures weatherproofing, and finishing inspection catches cosmetic issues before dispatch.",
            },
            {
              step: "05",
              title: "Logistics & Installation",
              desc: "Transportation by trailer, craning or placement using appropriate equipment, and on-site connections for power, water, and drainage. Most single-container installations complete within 1–3 days.",
            },
            {
              step: "06",
              title: "Optional Services",
              desc: "Plumbing for attached toilet blocks, data cabling, furniture supply, rooftop shed integration, and post-installation maintenance support for clients who want ongoing care.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-6 items-start">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <span className="font-display text-xl font-bold text-accent">{item.step}</span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-1">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Specifications */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Technical Specifications & Materials for Office Container
        </h2>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="sizes">
            <AccordionTrigger className="text-lg font-semibold">Container Sizes</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Container sizes follow standard dimensions—20' x 8' and 40' x 8' being most common—with custom widths available using fabricated frames for specific requirements. Average internal clear height ranges from 8–8.5 ft, providing comfortable workspace proportions for standard office activities.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="structural">
            <AccordionTrigger className="text-lg font-semibold">Structural Materials</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Structural materials include high-tensile steel frames designed for repeated transport and installation cycles, C and Z purlins where applicable for roof and wall support, and either marine-grade shipping containers or fabricated container bodies depending on specification requirements and budget parameters.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="insulation">
            <AccordionTrigger className="text-lg font-semibold">Wall & Roof Insulation</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Wall and roof insulation systems use PUF (Polyurethane Foam) or EPS (Expanded Polystyrene) sandwich panels, with rockwool specified where fire performance ratings are required. Exterior steel sheeting typically ranges from 0.4mm to 0.6mm thickness depending on application demands and expected service conditions.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="doors-windows">
            <AccordionTrigger className="text-lg font-semibold">Door & Window Options</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Door and window options include powder-coated aluminium or uPVC windows with clear or tinted glass selections, providing natural light while managing solar heat gain. Heavy-duty steel doors serve as entrance points, with options for glazed doors where visibility and aesthetics are priorities.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="electrical-specs">
            <AccordionTrigger className="text-lg font-semibold">Electrical Specifications</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Electrical specifications encompass copper wiring throughout, MCB distribution boards for circuit protection, proper earthing systems for safety compliance, and provisions for inverter, UPS, or DG backup integration. Power outlet placement follows workstation layouts to minimize extension cord usage.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="compliance">
            <AccordionTrigger className="text-lg font-semibold">Compliance Considerations</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Compliance considerations include design calculations for wind loads appropriate to installation location, fire-safety features using fire-retardant materials where requested, and structural engineering suitable for stacking configurations. While containers don't require elaborate foundations, we specify appropriate base preparations for stability and levelness.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Maintenance */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Maintenance and Repair Considerations
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            One of the advantages of container offices is their durable construction, which allows them to withstand the rigors of various environments with minimal upkeep. However, regular maintenance is essential to ensure these offices remain safe, secure, and fully functional over time. Routine inspections should be conducted to check the integrity of the containers, the condition of doors and windows, and the performance of electrical and HVAC systems.
          </p>
          <p>
            Access to replacement parts and accessories is straightforward, making repairs and upgrades hassle-free. Businesses should also consider the cost and availability of maintenance services when investing in a container office, as well as the permission required for any structural modifications or enhancements.
          </p>
          <p>
            By staying proactive with maintenance and repairs, organizations can extend the lifespan of their container offices and ensure they continue to provide a productive workspace. This approach not only protects your investment but also guarantees that your office remains compliant with safety standards and ready to meet your evolving business needs.
          </p>
        </div>
      </section>

      {/* Cost, Timelines & ROI */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Cost, Timelines & ROI Considerations in India
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Business decision-makers need practical information to evaluate container office investments against alternatives.
          </p>
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground mt-8 mb-4">Cost Drivers</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            "Size selection (20 ft vs 40 ft, single vs multi-container)",
            "Level of interior finishing (basic vs executive grade)",
            "HVAC capacity and brand selection",
            "Furniture specifications (built-in vs loose furniture)",
            "Plumbing requirements (dry office vs attached washroom)",
            "Custom structural changes such as stacking or interconnection",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </div>
          ))}
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground mb-4">Average Delivery Timelines</h3>
        <div className="bg-card rounded-xl shadow-card overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Configuration</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Typical Timeline</th>
              </tr>
            </thead>
            <tbody>
              {[
                { config: "Standard 20 ft cabin", timeline: "2–3 weeks" },
                { config: "Fitted 40 ft office", timeline: "3–4 weeks" },
                { config: "Multi-container complex", timeline: "4–6 weeks" },
                { config: "Large custom projects", timeline: "Based on scope" },
              ].map((row, index) => (
                <tr key={row.config} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{row.config}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">ROI Advantages</h3>
          <p className="text-muted-foreground">
            Reusability across multiple project cycles transforms container offices from expenses into assets. Faster deployment means earlier project commencement, reducing carrying costs on land and improving overall project returns. Residual value remains substantial—well-maintained container offices retain utility for years. Portable Office Cabin offers design optimizations to reduce life-cycle costs, including energy-efficient materials, easy-to-maintain finishes, and modular designs that allow future modifications without complete rebuilds.
          </p>
        </div>
      </section>

      {/* Related Modular Solutions */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Related Modular Solutions from Portable Office Cabin
        </h2>
        <p className="text-muted-foreground mb-8">
          Container offices often form part of larger site infrastructure ecosystems. Understanding related solutions helps clients plan comprehensive deployments.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Prefab labour colonies for workforce accommodation",
            "Portable security guard rooms and gatehouses",
            "PEB (pre-engineered building) structures for warehouses",
            "Container homes and container cafés",
            "Rooftop sheds for thermal comfort",
            "Portable toilets and prefab canteens",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 bg-muted/50 rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Get Started */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          How to Get Started with a Container Office Project
        </h2>
        <div className="space-y-4 text-muted-foreground mb-8">
          <p>Moving from interest to implementation requires straightforward preparation. Here's how to initiate your container office project effectively.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Define Your Requirements</h3>
            <ul className="space-y-2">
              {[
                "Number of users and their roles",
                "Functions needed (admin, meetings, storage, server room)",
                "Expected duration of use at current location",
                "Likelihood and timeline for relocation",
                "Integration with existing facilities",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Prepare Site Information</h3>
            <ul className="space-y-2">
              {[
                "Available ground area for container placement",
                "Access routes for trailers and cranes",
                "Proximity and capacity of power connections",
                "Water and drainage availability",
                "Local permission requirements",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
                  <span className="text-muted-foreground text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-accent/10 rounded-xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-foreground mb-4">
            Ready to Start Your Container Office Project?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Contact Portable Office Cabin today to discuss your container office requirements and receive a customized design consultation. Our team delivers turnkey solutions—from initial concept through installation and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="accent" size="lg" asChild>
              <Link href="/contact">
                <Phone className="mr-2 h-5 w-5" />
                Get a Free Quote
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="tel:+919731897976">
                <Phone className="mr-2 h-5 w-5" />
                Call: +91 97318 97976
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
