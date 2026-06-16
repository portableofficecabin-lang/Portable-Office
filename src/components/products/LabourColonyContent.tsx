import Link from "next/link";
import { Building2, Users, Shield, Wrench, Clock, IndianRupee, Truck, Thermometer, Droplets, Zap, Leaf, HardHat, Phone, MessageSquare, CheckCircle2, Home, LayoutGrid, Layers } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import labourColonyAerial from "@/assets/products/labour-colony-aerial.png";
import labourColonyCamp from "@/assets/products/labour-colony-camp.webp";
import labourColonyG1 from "@/assets/products/labour-colony-g1.webp";
import labourColonyModular from "@/assets/products/labour-colony-modular.webp";
import labourColonySite from "@/assets/products/labour-colony-site.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const pricingRows = [
  ["Economy EPS Panel", "₹350–450/sq ft", "Short-term projects (3–5 years)"],
  ["Standard PUF Panel", "₹650–900/sq ft", "Metro, highway, industrial sites"],
  ["Premium PEB Systems", "₹1,000+/sq ft", "Long-life installations (25+ years)"],
];

const lifespanRows = [
  ["Basic EPS/Sheet", "10–15 years"],
  ["Standard PUF Panel", "15–25 years"],
  ["Premium PEB", "25–40+ years"],
];

const highlights = [
  { icon: Clock, title: "Quick Installation", desc: "50–300 worker camps delivered and installed in 2–4 weeks — 60–70% faster than conventional construction" },
  { icon: IndianRupee, title: "Cost Effective", desc: "20–40% savings versus RCC with recyclable steel structures and relocatable modules" },
  { icon: Users, title: "Scalable Capacity", desc: "From 50-bed single-storey to 500+ bed G+2 configurations with modular expansion" },
  { icon: Shield, title: "Compliance Ready", desc: "Designs aligned with BIS standards, NBC 2016, BOCW Act, and client EHS/ESG audits" },
  { icon: Truck, title: "Pan-India Delivery", desc: "Turnkey installation across 20+ states — Mumbai, Ahmedabad, Hyderabad, Kanpur, and remote sites" },
  { icon: Leaf, title: "Sustainable Build", desc: "Recyclable steel, factory-controlled fabrication, reduced construction waste, and solar-ready rooftops" },
];

const applications = [
  "Metro rail and highway construction packages",
  "Refinery and petrochemical plant expansions",
  "Power plants, steel mills, and cement factories",
  "Large residential townships and industrial parks",
  "Remote mining operations and solar parks",
  "Government infrastructure and PSU tenders",
];

const faqs = [
  { q: "What is a labour colony?", a: "A labour colony is a structured worker accommodation facility deployed near project sites, factories, and infrastructure works. It includes dormitories, kitchens, toilets, dining halls, and recreation spaces designed for large workforces." },
  { q: "How quickly can a prefab labour colony be installed?", a: "Camps for 50–100 workers are typically installed in 2–3 weeks. Large colonies for 500+ workers take 4–8 weeks depending on site preparation and layout complexity." },
  { q: "What materials are used for labour colony construction?", a: "We use mild steel structural frames with PUF/EPS sandwich panels, PPGI sheets, or Aerocon panels for walls and roofs. All materials are corrosion-resistant with anti-rust coatings for coastal and humid locations." },
  { q: "Can labour colonies be relocated to another project site?", a: "Yes. Prefab labour colonies are designed for disassembly and relocation. Modular panels and steel frames can be transported and reinstalled at new sites, retaining 80–90% of material value." },
  { q: "What is the cost of a prefab labour colony?", a: "Costs range from ₹350/sq ft for economy EPS panels to ₹1,000+/sq ft for premium PEB systems. Final pricing depends on capacity, configuration, insulation, and fit-out level. Contact us for a detailed quotation." },
  { q: "What compliance standards do your labour colonies meet?", a: "Our designs comply with BIS standards, NBC 2016, BOCW Act guidelines, and client-specified EHS/ESG audit requirements. We provide documentation for tender submissions and third-party inspections." },
  { q: "Do you provide integrated facilities like kitchens and toilets?", a: "Yes. We deliver complete labour colony ecosystems including dormitories, prefab canteens, portable toilets, kitchens, dining halls, recreation rooms, first-aid cabins, and security cabins." },
  { q: "What is the lifespan of a prefab labour colony?", a: "Economy EPS panels last 10–15 years, standard PUF panels 15–25 years, and premium PEB systems 25–40+ years with proper maintenance including periodic repainting and fastener checks." },
];

export function LabourColonyContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          Labour Colony – Prefabricated Labour Accommodation
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A labour colony is a structured worker accommodation facility deployed near project sites, factories, and infrastructure works. In India's construction industry, housing large workforces efficiently directly impacts project timelines, worker retention, and operational costs.
            </p>
            <p>
              Portable Office Cabin is a leading manufacturer of prefabricated labour colonies, serving construction firms, industrial plants, and government tenders across Mumbai, Thane, Ahmedabad, Hyderabad, Kanpur, and remote project sites. Our modular structures offer quick installation, cost effective pricing per square foot, relocatability, and hygienic living conditions—advantages traditional brick-and-mortar camps cannot match.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(labourColonyAerial)}
            alt="Prefabricated labour colony with G+1 modular dormitory blocks at industrial construction site by Portable Office Cabin"
            className="rounded-xl shadow-lg w-full"
          />
        </div>
      </section>

      {/* Image Gallery */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Labour Colony Gallery</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OptimizedImage src={resolveImageUrl(labourColonyCamp)} alt="Large-scale prefab labour camp with multiple G+1 blocks at highway construction site by Portable Office Cabin" className="rounded-lg shadow-md w-full aspect-square object-cover" />
          <OptimizedImage src={resolveImageUrl(labourColonyG1)} alt="G+1 double-storey labour colony with steel staircase and external corridor at metro rail project by Portable Office Cabin" className="rounded-lg shadow-md w-full aspect-square object-cover" />
          <OptimizedImage src={resolveImageUrl(labourColonyModular)} alt="Modular prefab worker accommodation with blue steel frame and PUF sandwich panels by Portable Office Cabin" className="rounded-lg shadow-md w-full aspect-square object-cover" />
          <OptimizedImage src={resolveImageUrl(labourColonySite)} alt="Active construction site labour colony with overhead water tanks and worker facilities by Portable Office Cabin" className="rounded-lg shadow-md w-full aspect-square object-cover" />
        </div>
      </section>

      {/* Key Highlights */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-8">Why Choose Prefab Labour Colonies?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((h) => (
            <div key={h.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <h.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{h.title}</h3>
              <p className="text-sm text-muted-foreground">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Table */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Labour Colony Pricing Overview (2025–2026)</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Material Type</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Price Range (INR/sq ft)</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{row[0]}</td>
                  <td className="px-6 py-4 text-accent font-semibold">{row[1]}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">* Prices are indicative and vary based on capacity, configuration, insulation, and fit-out level. Contact us for a detailed quotation.</p>
      </section>

      {/* Types of Labour Colonies */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Types of Prefabricated Labour Colonies</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Home className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-foreground">Basic Single-Storey Hutments</h3>
            </div>
            <p className="text-muted-foreground text-sm">EPS or metal sheet sandwich panels for small construction teams, offering economical shelter with sturdy construction. Ideal for 50–150 workers.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-foreground">G+1 and G+2 PUF Panel Colonies</h3>
            </div>
            <p className="text-muted-foreground text-sm">Dense configurations for land-constrained urban sites—common on metro rail and highway projects. Engineered staircases with external corridors for 300–500 beds.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <LayoutGrid className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-foreground">Container-Based Units</h3>
            </div>
            <p className="text-muted-foreground text-sm">20 ft or 40 ft containers converted into dormitories for ultra-fast deployment and easy transport between locations. Ideal for remote highway and solar projects.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-foreground">Integrated Facilities</h3>
            </div>
            <p className="text-muted-foreground text-sm">Supervisor rooms, prefab canteens, portable toilets, first-aid cabins, recreation rooms, and security cabins—all manufactured off site for quick installation.</p>
          </div>
        </div>
      </section>

      {/* Materials & Technical Specifications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Materials & Technical Specifications</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Structural Frames</h4>
                <p className="text-sm text-muted-foreground">Mild steel columns and rafters with nut-bolt connections, or PEB structures—factory fabricated with anti-rust coatings for harsh weather conditions.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Wall Systems</h4>
                <p className="text-sm text-muted-foreground">50–100 mm PUF or EPS sandwich panels, Aerocon panel assemblies, or metal sheets. Standard finishes include off-white and white-blue combinations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Thermometer className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Insulation & Comfort</h4>
                <p className="text-sm text-muted-foreground">EPS, rock wool, or PUF (50–100mm) reducing heat gain. Operable windows, roof vents, and exhaust fans in kitchens for cross-ventilation.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Electrical Systems</h4>
                <p className="text-sm text-muted-foreground">Concealed conduits, LED lighting, distribution boards with earthing, ceiling fans, AC provisions, and backup generator integration.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Droplets className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Plumbing & Sanitation</h4>
                <p className="text-sm text-muted-foreground">Freshwater inlets, 2,000–10,000L storage tanks, Indian/Western WCs, and sewage connections or septic systems.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardHat className="w-5 h-5 text-accent mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Roofing & Flooring</h4>
                <p className="text-sm text-muted-foreground">Sloped steel roofs with PUF/EPS insulation, ridge vents, gutters. Flooring options include cement board with vinyl or raised steel deck—all termite resistant.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lifespan Table */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Durability, Lifespan & Maintenance</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">System Type</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Expected Lifespan</th>
              </tr>
            </thead>
            <tbody>
              {lifespanRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{row[0]}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-sm">Protective measures include anti-rust coatings (275 gsm zinc), proper flashing, and sealants at joints. Maintenance involves periodic repainting every 4–5 years and quarterly fastener checks. After-sales support available for repairs, expansion, and relocation.</p>
      </section>

      {/* Installation Process */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Installation Process & Project Timelines</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Design & Approval", desc: "Requirement capture, CAD layouts, BOQ, and structural checks for wind and seismic loads" },
            { step: "2", title: "Factory Fabrication", desc: "10–20 days manufacturing of steel structures and panels at our facility" },
            { step: "3", title: "Logistics & Foundation", desc: "Transport coordination, on-site RCC pedestal preparation, and services planning" },
            { step: "4", title: "Structure Erection", desc: "Panel installation, staircase fitting, and corridor assembly at the project site" },
            { step: "5", title: "Services Fit-Out", desc: "Electrical, plumbing, furnishings (bunk beds, mattresses), and utility connections" },
            { step: "6", title: "Quality Check & Handover", desc: "Final walkthrough, as-built documentation, maintenance guidelines, and support contacts" },
          ].map((item) => (
            <div key={item.step} className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg mb-3">{item.step}</div>
              <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Applications & Industry Use Cases</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => (
            <div key={app} className="flex items-center gap-3 bg-card rounded-lg p-4 shadow-card border border-border">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
              <span className="text-sm text-foreground">{app}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Sustainability & Safety */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Sustainability, Safety & Compliance</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <Leaf className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Sustainability</h3>
            <p className="text-sm text-muted-foreground">Reduced construction waste, lower site disturbance, recyclable steel, improved energy performance, and potential for solar rooftop integration.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <Shield className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Safety</h3>
            <p className="text-sm text-muted-foreground">Fire-resistant panel options, emergency exits, secure electrical installations meeting industry standards, and non-slip finishes.</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <Droplets className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Hygiene</h3>
            <p className="text-sm text-muted-foreground">Adequate toilets with 1:15–1:20 sanitary ratios, clean drinking water stations, proper drainage, and lighting for safe movement.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-accent/5 rounded-2xl p-8 md:p-12 text-center border border-accent/20">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Ready to Build Your Labour Colony?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Share your location, number of workers, project duration, and preferred materials. Our team will provide a customized layout, technical proposal, and price estimate.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link href="/contact">
              <MessageSquare className="mr-2 h-5 w-5" />
              Get a Free Quote
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="tel:+919731897976">
              <Phone className="mr-2 h-5 w-5" />
              Call +91-9731897976
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
