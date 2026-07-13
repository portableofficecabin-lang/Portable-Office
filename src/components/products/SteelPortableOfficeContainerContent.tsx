import Link from "next/link";
import { Building2, Shield, Truck, Wrench, ThermometerSun, Zap, Ruler, Users, IndianRupee, Factory, HardHat, Recycle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import steelContainerInterior from "@/assets/products/steel-portable-office-container-interior.webp";
import steelContainerSite from "@/assets/products/steel-portable-office-container-site.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const sizeRows = [
  ["10' x 15' x 8.5'", "Security posts, compact admin", "2–4 people"],
  ["10' x 20' x 8.6'", "Single cabin, manager + staff", "4–6 people"],
  ["10' x 30' x 10'", "Mid-sized admin block", "6–8 people"],
  ["10' x 40' x 8.6'", "Open-plan office with meeting area", "8–12 people"],
];

const applications = [
  { icon: HardHat, title: "Construction Site Offices", desc: "40 ft site offices on NH projects housing project managers and engineers" },
  { icon: Factory, title: "Industrial Plant Offices", desc: "Admin cabins for logistics yards and warehouse operations with server provisions" },
  { icon: Building2, title: "Temporary Campus Offices", desc: "Schools and colleges using container solutions during expansion phases" },
  { icon: Users, title: "Corporate Sales Offices", desc: "Marketing suites and site booking offices for real estate developers" },
  { icon: Shield, title: "Security Office Containers", desc: "Guard rooms at townships, industrial parks, and toll plazas" },
  { icon: Zap, title: "Control Rooms", desc: "Utility projects — water treatment plants and solar parks with fire-rated panels" },
];

const advantages = [
  { icon: Truck, title: "Speed", desc: "Complete prefabrication in 7–15 days; 1–2 days onsite placement" },
  { icon: IndianRupee, title: "Cost Control", desc: "One fixed, GST-inclusive price for the listed unit — no mid-project overruns" },
  { icon: Recycle, title: "Reusability", desc: "Same units serve 8–10 project cycles, reducing embodied carbon by 40–60%" },
  { icon: ThermometerSun, title: "Durability", desc: "Anti-corrosive coatings handle harsh coastal humidity and industrial environments" },
];

const faqs = [
  { q: "What sizes are available for steel portable office containers?", a: "We manufacture standard sizes from 10 ft to 40 ft lengths with heights ranging from 8.5 ft to 9.5 ft. The most popular configurations are 10'x20' (160 sq ft) for compact offices and 10'x40' (320 sq ft) for open-plan workspaces. Custom sizes are available on request." },
  { q: "How long does delivery and installation take?", a: "Standard cabins ship within 7–15 working days after order confirmation. Onsite placement requires 1–2 days with crane and basic electrical hookup. Larger customized multi-container complexes need 3–6 weeks for fabrication and fit-out." },
  { q: "What insulation options are available for Indian climate conditions?", a: "We offer PUF panels (best thermal performance), EPS panels (cost-effective), glass wool, and rock wool in 40–60 mm thickness. PUF panels carry a 20% premium but deliver superior insulation for extreme heat in North and Central India and humidity in coastal zones." },
  { q: "Can steel containers be stacked for multi-storey offices?", a: "Yes, we design G+1 and G+2 configurations with proper staircase, railing, and structural reinforcement. Stacked containers suit large infrastructure projects and urban sites with limited ground-level space." },
  { q: "What is the expected lifespan of a steel portable office container?", a: "With periodic maintenance including triennial repainting and annual sealant inspection, steel portable office containers offer 10–25 years of service life. Well-maintained units can serve 8–10 project relocation cycles." },
  { q: "How do steel portable offices compare to traditional brick-and-mortar site offices?", a: "Total project time drops from 60–90 days to 14–21 days, translating to faster mobilization and earlier revenue generation. The unit is relocatable rather than written off at the end of the project, and it produces 90% less onsite debris. The container listed on this page is sold at the single price shown above, inclusive of 18% GST." },
  { q: "What customization options are available?", a: "Full customization includes external branding (company colours, logo vinyls, ACP facades), internal partitioning with modular 75 mm panels, reinforced security doors for server rooms, and extensions like verandahs and canopies. Modules can be connected with common doors or weatherproof passages." },
  { q: "What compliance and safety standards do these containers meet?", a: "Our units adhere to IS 800 for structural steel design, IS 732 for electrical installations, and NBC fire safety norms. Pre-dispatch quality checks include ultrasonic weld testing, insulation continuity verification, alignment checks, and simulated rain leakage testing." },
];

export function SteelPortableOfficeContainerContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Steel Portable Office Container – Prefabricated Workspaces for Rapid Deployment</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A steel portable office container is a prefabricated workspace built from structural steel framing and cladding, designed for rapid deployment on construction sites, industrial yards, and urban plots across India. These units evolved from repurposed ISO shipping containers in the early 2000s when infrastructure booms like the Golden Quadrilateral highways demanded quick-deployable site offices. Today, they represent a mature, purpose-built segment of the modular construction industry.
            </p>
            <p>
              Consider the 20-foot steel portable office container commonly deployed on Mumbai metro rail projects — externally measuring approximately 20x8x8.5 feet and yielding about 160 square feet internally. These units serve as manager cabins with partitioned staff areas. On larger NH projects in Maharashtra or industrial parks in Gujarat, 40-foot variants (around 320 square feet) accommodate 6 to 10 workstations plus conference zones, delivered ready-to-use with factory-fitted electricals, insulation, and furniture.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(steelContainerInterior)}
            alt="Steel portable office container interior with workstations and meeting area by Portable Office Cabin"
            title="Modern steel portable office container interior fit-out"
            className="rounded-xl"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Key Benefits */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Key Benefits</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((item) => (
            <div key={item.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <item.icon className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Standard Sizes */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Standard Sizes & Configurations</h2>
        <p className="text-muted-foreground mb-6">Our modular portable office cabin range follows ISO container standards for compatibility with flatbed trailers and crane handling, while maximizing internal usable space.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-card">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-6 py-4 text-left font-semibold">Size (L x W x H)</th>
                <th className="px-6 py-4 text-left font-semibold">Typical Use</th>
                <th className="px-6 py-4 text-left font-semibold">Approx. Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {sizeRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{row[0]}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row[1]}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">We configure containers as single cabins, double cabins, manager's cabin plus staff area, meeting rooms, or open-plan work station layouts. For tight urban plots or large infrastructure projects, we stack containers G+1 or G+2 with proper staircase and railing design.</p>
      </section>

      {/* Layout Examples */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Popular Container Office Layout Examples</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Ruler className="h-6 w-6 text-accent" />
              <h3 className="font-semibold text-foreground">20 ft Compact Office</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 2 workstations (each 4x2 feet)</li>
              <li>• 1 manager desk (6x4 feet)</li>
              <li>• Compact storage racks</li>
              <li>• Wall-mounted split AC unit</li>
              <li>• Suits project engineers and site supervisors</li>
            </ul>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-accent" />
              <h3 className="font-semibold text-foreground">40 ft Team Office</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 6–10 workstations in rows with 3-foot aisles</li>
              <li>• 10x8 foot conference nook seating 6 people</li>
              <li>• Vertical file racks along walls</li>
              <li>• Supports highway, metro, and real estate project teams</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Technical Specifications & Construction Details</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(steelContainerSite)}
            alt="Steel portable office containers stacked at construction site with cranes by Portable Office Cabin"
            title="Multi-storey steel portable office container deployment at construction site"
            className="rounded-xl"
            aspectRatio="16/9"
          />
          <div className="space-y-4">
            <p className="text-muted-foreground">Portable Office Cabin uses structural steel framework constructed from ISMC (Indian Standard Medium Channel) or RHS (Rectangular Hollow Section) for the chassis and walls. The exterior cladding consists of mild steel or galvanized steel sheets in 1.2–1.6 mm thickness.</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Wall Insulation:</strong> PUF, EPS, glass wool, or rock wool in 40–60 mm thickness</li>
              <li><strong className="text-foreground">Floor:</strong> Steel frame base with marine plywood or cement board, topped with vinyl or PVC flooring</li>
              <li><strong className="text-foreground">Roofing:</strong> Insulated panels with slope for rainwater drainage — monsoon-ready</li>
              <li><strong className="text-foreground">Weight:</strong> 2000–2200 kg empty for standard 20 ft units</li>
              <li><strong className="text-foreground">Design Life:</strong> 10–25 years with periodic maintenance</li>
              <li><strong className="text-foreground">Electrical:</strong> Factory-fitted copper wiring, MCB panels, 6–12 LED lights, 15A AC sockets</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Door, Window & Interior Options */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Door, Window & Interior Finish Options</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Doors", items: ["36x80 inch steel doors with mortise locks", "Reinforced 2 mm steel doors for secure storage/cash handling"] },
            { title: "Windows", items: ["Powder-coated aluminium sliding windows (3x4 ft)", "MS grills for security cabin applications"] },
            { title: "Wall Finishes", items: ["Laminated MDF or particle board", "PVC wall panels or gypsum board"] },
            { title: "Ceiling", items: ["Modular false ceiling with 600x600 mm tiles", "Clean professional appearance"] },
            { title: "Flooring", items: ["Vinyl flooring for construction environments", "Acoustic panels for education use"] },
            { title: "Furniture", items: ["Workstations (1200x600 mm)", "Steel storage cabinets, conference tables"] },
          ].map((item) => (
            <div key={item.title} className="bg-muted/30 rounded-xl p-5 border border-border">
              <h3 className="font-semibold text-foreground mb-3">{item.title}</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {item.items.map((i, idx) => <li key={idx}>• {i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Applications of Steel Portable Office Containers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <div key={app.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <app.icon className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">{app.title}</h3>
              <p className="text-sm text-muted-foreground">{app.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6">We extend the same technology to container homes, labour colonies, prefab canteens, container cafés, portable toilets, and rooftop offices — providing complete site infrastructure solutions.</p>
      </section>

      {/* Specialized Solutions */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Specialized Steel Container Solutions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            "Steel portable conference room cabins with AV provisions and 50 dB sound insulation",
            "Container-based training rooms and classrooms with whiteboards and projector mounts",
            "Modular steel control rooms with fire-rated sandwich panels and dedicated server areas",
            "MS portable office units with reinforced security features for cash handling or record storage",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-5 border border-border">
              <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comfort & Productivity */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Comfort & Productivity Features</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <ThermometerSun className="h-8 w-8 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Thermal Comfort</h3>
            <p className="text-sm text-muted-foreground">Insulated walls and roof support 1.5-ton split ACs, maintaining 24–28°C indoors even when exterior temperatures exceed 40°C in North and Central India.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <Shield className="h-8 w-8 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Acoustic Comfort</h3>
            <p className="text-sm text-muted-foreground">Insulation and sealed doors reduce outside noise from construction machinery to 40–50 dB levels suitable for concentrated office work.</p>
          </div>
        </div>
      </section>

      {/* Price */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Price & What Changes the Specification</h2>
        <p className="text-muted-foreground mb-6">
          The steel portable office container listed on this page is sold at the single price shown at the top, inclusive of 18% GST. Transport and optional installation are calculated at checkout from your delivery pincode, so the total is settled before you pay — nothing is added later.
        </p>
        <div className="bg-muted/30 rounded-xl p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Specification changes that make it a made-to-order build (quoted separately)</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li>• Heavier 1.6 mm steel cladding in place of 1.2 mm</li>
            <li>• PUF insulation in place of EPS</li>
            <li>• Premium gypsum finishes and modular furniture</li>
            <li>• Additional AC provisions beyond the standard fit-out</li>
            <li>• Multi-room 40 ft and stacked G+1 / G+2 configurations</li>
            <li>• Non-standard sizes and external branding packages</li>
          </ul>
        </div>
      </section>

      {/* Cost Optimisation Tips */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Cost Optimisation Tips for Buyers</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3"><span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">1</span> Standardize sizes across sites (same 20 ft and 40 ft modules) for reuse and simplified logistics</li>
          <li className="flex items-start gap-3"><span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">2</span> Decide early whether washrooms integrate into the main cabin or remain separate — it changes the build, not just the fit-out</li>
          <li className="flex items-start gap-3"><span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">3</span> Opt for functional, durable interiors instead of decorative finishes for construction environments</li>
          <li className="flex items-start gap-3"><span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">4</span> Plan for future relocation from design stage — include lifting points and modular partitions</li>
          <li className="flex items-start gap-3"><span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">5</span> Consider phased expansion: start with base modules and add units as team size grows</li>
        </ul>
      </section>

      {/* Customization & Modular Expansion */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Customization Options & Modular Expansion</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "External Branding", desc: "Company colours, logo vinyls, and ACP facades for premium sales offices and marketing suites" },
            { title: "Internal Partitioning", desc: "Modular 75 mm panels creating cabins, meeting rooms, reception areas, and storage zones" },
            { title: "Secure Zones", desc: "Reinforced 2 mm steel doors for server rooms, record storage, or cash handling areas" },
            { title: "Extensions", desc: "Verandahs, canopies, and external decks using PEB and light steel structures" },
            { title: "Modular Expansion", desc: "Start with 20 ft module and add more later — connected with common doors or weatherproof passages" },
            { title: "Integration", desc: "Combines with PEB sheds, prefab labour accommodation, portable toilets, and rooftop installations" },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-xl p-5 shadow-card border border-border">
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery & Maintenance */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Delivery, Installation & Maintenance</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground mb-4">Installation Steps</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span> Site leveling and placement of 4–6 concrete blocks or steel supports</li>
              <li className="flex items-start gap-3"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span> Crane lifting (20–50 ton capacity) and positioning</li>
              <li className="flex items-start gap-3"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span> Electrical connection to site supply and plumbing hookup</li>
              <li className="flex items-start gap-3"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</span> Final interior handover with documentation</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-4">Maintenance Guidelines</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>• Periodic repainting every 3–5 years using epoxy primer and polyurethane topcoat</li>
              <li>• Annual inspection of roof sealants, door locks, and window runners</li>
              <li>• Quarterly electrical fitting checks and pest control for extended deployments</li>
              <li>• Timely sealant replacement maintains weather resistance</li>
              <li>• 20+ years serviceable life with routine maintenance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Compliance & Safety */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Compliance, Safety & Quality Assurance</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-muted/30 rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Standards Compliance</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• IS 800 for structural steel design and fabrication</li>
              <li>• IS 732 for electrical installations</li>
              <li>• NBC fire safety norms (1-hour fire rating optional)</li>
            </ul>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Pre-Dispatch Quality Checks</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 100% ultrasonic testing on critical weld joints</li>
              <li>• Insulation continuity verification (gaps under 2 mm)</li>
              <li>• Door and window alignment checks</li>
              <li>• Leakage testing under simulated rain conditions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-primary/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Why Choose Portable Office Cabin</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><Shield className="h-5 w-5 text-accent shrink-0" /> End-to-end capability: Design, manufacturing, transport, installation, and after-sales support</div>
          <div className="flex items-start gap-2"><Building2 className="h-5 w-5 text-accent shrink-0" /> Wide range: Office cabins, container homes, labour colonies, portable toilets, and more</div>
          <div className="flex items-start gap-2"><Users className="h-5 w-5 text-accent shrink-0" /> Scalability: Small single-cabin orders to large container office complexes</div>
          <div className="flex items-start gap-2"><Factory className="h-5 w-5 text-accent shrink-0" /> Track record across Maharashtra, Gujarat, Bengaluru, Hyderabad, and pan-India</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/contact" className="inline-flex items-center px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
            Request a Quote
          </Link>
          <a href="tel:+919731897976" className="inline-flex items-center px-6 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-muted transition-colors">
            Call +91-9731897976
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium text-foreground">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
