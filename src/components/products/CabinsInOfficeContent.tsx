import Link from "next/link";
import { CheckCircle, ArrowRight, Phone, Building, Lightbulb, Shield, Volume2, Layout, Paintbrush } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import cabinsModern from "@/assets/products/cabins-in-office-modern.webp";
import cabinsBooths from "@/assets/products/cabins-in-office-booths.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const cabinTypes = [
  ["Single-manager cabin", "8–12 m²", "1–3", "One-on-ones, focused work"],
  ["Team cabin", "12–18 m²", "2–4", "Sensitive projects"],
  ["Phone/focus booth", "1–2 m²", "1", "Calls, quick tasks"],
  ["Meeting cabin", "4–12 m²", "2–6", "Video calls, stand-ups"],
  ["Executive cabin", "18+ m²", "1–4", "Leadership, lounge meetings"],
];

const pricingRows = [
  ["Basic", "Standard aluminium, single-glazed", "₹80,000–₹1,50,000"],
  ["Standard", "Double-glazing, integrated LEDs", "₹1,50,000–₹3,00,000"],
  ["Premium", "Branded acoustics, smart tech, biophilic elements", "₹3,00,000–₹5,00,000+"],
];

const faqs = [
  {
    q: "What are office cabins used for?",
    a: "Office cabins serve as enclosed spaces within open-plan offices for managers, deep-focus tasks, meetings, confidential calls, and video conferencing. They solve noise and privacy challenges in modern workplaces."
  },
  {
    q: "How long does it take to install modular office cabins?",
    a: "4–6 single cabins can be installed over one weekend in a 5,000 ft² office. A 20-cabin cluster typically takes 2–3 weeks. Most fabrication happens off-site, minimizing disruption to ongoing operations."
  },
  {
    q: "What materials are used in modern office cabins?",
    a: "Common materials include powder-coated aluminium frames, laminated or tempered glass (clear, frosted, or tinted), modular gypsum or PUF insulated panels, and LVT or carpet flooring. Double-glazed glass provides 30–40 dB sound reduction."
  },
  {
    q: "How much do office cabins cost in India?",
    a: "Basic cabins with standard aluminium and single glazing range from ₹80,000–₹1,50,000. Standard cabins with double-glazing and integrated LEDs cost ₹1,50,000–₹3,00,000. Premium cabins with smart tech and biophilic elements start at ₹3,00,000+."
  },
  {
    q: "Can office cabins be relocated?",
    a: "Yes, modular office cabins are designed for disassembly and relocation. This makes them ideal for leased spaces where structures may need to be moved. Reconfiguration costs are significantly lower than demolishing brick walls."
  },
  {
    q: "What is the right cabin mix for my office?",
    a: "A general guideline: 1 manager cabin per 12–15 staff, 1 meeting cabin per 20 staff, and 1 phone booth per 8–10 employees. Conduct a 2–4 week usage study to optimize based on actual needs."
  },
  {
    q: "Are prefab office cabins weather-resistant?",
    a: "Yes. Built with steel frames and insulated panels (PUF or EPS), prefab offices withstand heavy rainfall, strong winds, and extreme temperatures. With proper maintenance, they last 15–20+ years."
  },
  {
    q: "Can small businesses benefit from modular offices?",
    a: "Absolutely. Modular offices offer small businesses a cost-effective way to create professional workspaces quickly. They can be customized for any requirement and easily expanded or relocated as the business grows."
  },
];

export function CabinsInOfficeContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Cabins in Office: Modern Modular Workspaces for 2026
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Cabins in office settings have transformed dramatically over the past three decades. What once meant bulky wooden partitions and fixed manager rooms now refers to sleek, prefabricated office structures built with glass-and-steel modular systems that can be assembled in a short time. We are proud to deliver high-quality, reliable prefab office solutions, backed by years of experience and a strong dedication to quality.
            </p>
            <p>
              This guide covers what office cabins are, why companies in 2026 use them, and how to design and install them quickly to support hybrid work and productivity goals.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cabinsModern)}
            alt="Modern glass-walled modular office cabin with aluminium frame and ergonomic workspace in corporate office India"
            className="rounded-xl shadow-lg"
            aspectRatio="16/10"
            productName="Cabins in Office"
          />
        </div>
      </section>

      {/* What Are Office Cabins */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">What Are Office Cabins?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Office cabins are prefabricated or built-in enclosed spaces within open-plan offices. Companies use them for managers, deep-focus tasks, meetings, and confidential calls. A prefab office cabin can be fully enclosed with floor-to-ceiling glass or semi-enclosed using half partitions with acoustic panels.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Cabin Type</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Area</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Occupants</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {cabinTypes.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="border border-border px-4 py-3 font-medium text-foreground">{row[0]}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row[1]}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row[2]}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Key Features of Modern Office Cabins</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Volume2, title: "Acoustic Performance", items: ["30–40 dB sound reduction with double-glazed glass", "Acoustic ceiling tiles and sealed partitions", "Prevention of sound flanking through floors and ceilings"] },
            { icon: Paintbrush, title: "Materials & Construction", items: ["Powder-coated aluminium frames in slim profiles", "Laminated or tempered glass (clear, frosted, tinted)", "Modular gypsum or PUF insulated panels"] },
            { icon: Lightbulb, title: "Integrated Services", items: ["LED lighting with motion sensors at 3000K", "Floor/skirting trunking for power and data", "Concealed HVAC diffusers for ventilation"] },
            { icon: Layout, title: "Ergonomic Elements", items: ["Adjustable desks and durable task chairs", "Under-desk storage and cable management", "Optimized for 60–90 min deep work sessions"] },
            { icon: Shield, title: "Safety & Compliance", items: ["Fire-rated doors and panels where needed", "Emergency lighting provisions", "Ventilation per local building codes"] },
            { icon: Building, title: "Modularity", items: ["Factory fabrication, minimal on-site disruption", "Relocatable and reconfigurable", "Scalable from 4 booths to 20+ cabin clusters"] },
          ].map((feature, i) => (
            <div key={i} className="bg-background rounded-lg p-5 border">
              <feature.icon className="w-6 h-6 text-accent mb-3" />
              <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
              <ul className="space-y-1">
                {feature.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Types of Office Cabins */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Types of Office Cabins</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Most offices mix several cabin types rather than relying on a single format:</p>
            <ul className="space-y-3">
              {[
                { label: "Manager/leadership cabins", desc: "Glass-front design with optional blinds, small meeting table for 3–4 people" },
                { label: "Shared team cabins", desc: "Enclosed rooms for 4–8 employees, typically 15–25 m²" },
                { label: "Meeting cabins", desc: "Enclosed pods sized for 2–6 people, suitable for video calls" },
                { label: "Focus/phone booths", desc: "Single-person acoustic cabins with stool, worktop, power and data" },
                { label: "Executive cabins", desc: "Larger structures with premium finishes, lounge seating, and personal storage" },
              ].map((type, i) => (
                <li key={i} className="text-sm">
                  <strong className="text-foreground">{type.label}:</strong> {type.desc}
                </li>
              ))}
            </ul>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cabinsBooths)}
            alt="Row of modern glass phone booths and focus pods in corporate office corridor India"
            className="rounded-xl shadow-lg"
            aspectRatio="16/10"
            productName="Office Phone Booths"
          />
        </div>
      </section>

      {/* Design & Planning */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Design & Planning: How to Lay Out Office Cabins</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Planning checklist:</h4>
            <ul className="space-y-2">
              {[
                "Calculate total floor area in m² and team size",
                "Determine remote vs in-office ratio (typically 40–60% in-office for hybrid)",
                "Count daily calls and meetings to establish cabin requirements",
                "Position cabins along building core to preserve natural light",
                "Maintain minimum 1.2 m corridor widths per local code",
                "Leave soft zones for future expansion",
                "Coordinate with MEP systems — HVAC diffusers, sprinklers, floor boxes",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Materials used in office cabins:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Framing:</strong> Aluminium (slim, modular); steel for heavy-duty; powder-coat in white, black, grey</li>
              <li><strong className="text-foreground">Glass:</strong> Clear, frosted, or tinted; double-glazed for acoustics; frosted bands for privacy</li>
              <li><strong className="text-foreground">Solid walls:</strong> Gypsum board, PUF/EPS panels, or MDF laminate for premium finishes</li>
              <li><strong className="text-foreground">Flooring:</strong> Office carpet or LVT extended into cabins for consistency</li>
              <li><strong className="text-foreground">Hardware:</strong> Soft-close doors, floor springs, acoustic drop seals, minimalist handles</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Prefab Office Solutions */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Prefab Office Solutions</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Prefab office solutions have revolutionized the way businesses approach workspace creation. Prefabricated office buildings are engineered to be cost effective and efficient, allowing companies to create modern offices tailored to their specific needs in a remarkably short time. Modular office systems allow you to scale operations as your team grows, with custom designs available for different sizes and configurations.
          </p>
          <p>
            Ideal for construction sites, startups, and businesses seeking either temporary or permanent offices, prefab office solutions offer unmatched flexibility. These structures can be designed and built to fit your requirements — from a small portable office to a larger, multi-story complex.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {[
              { title: "Weather Resistance", desc: "Steel frames and PUF/EPS insulated panels withstand heavy rainfall, strong winds, and extreme temperatures. 15–20+ year lifespan with proper maintenance." },
              { title: "Customization", desc: "From layout and design to materials and finishes — integrated washrooms, kitchens, meeting rooms. Fully self-contained workspaces matching brand identity." },
              { title: "Small Business Ready", desc: "Fast installation, minimal disruption. Easily relocated or expanded as business grows. Energy-efficient systems and eco-friendly materials available." },
            ].map((card, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-5 border">
                <h4 className="font-semibold text-foreground mb-2">{card.title}</h4>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Benefits of Having Cabins in an Office</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Productivity Gains", desc: "Fewer call disruptions; 20–30% higher focus in enclosed zones for tasks requiring 60–90 minutes of deep work" },
            { title: "Privacy & Confidentiality", desc: "Suitable for HR meetings, performance reviews, client negotiations, and legal discussions" },
            { title: "Hybrid Work Support", desc: "Dedicated video conferencing space with stable acoustics and lighting for remote collaboration" },
            { title: "Employee Well-being", desc: "Reduced noise fatigue; ability to step away for focused work without leaving the office" },
            { title: "Fast Installation", desc: "Office cabins set up and adapted quickly — minimal disruption to business operations" },
            { title: "Cost-Effective Flexibility", desc: "Easier to reconfigure than permanent brick walls; avoid demolition costs 2–3x higher" },
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Applications of Modular Workspaces</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Modular workspaces offer versatile solutions across industries. On construction sites, they provide essential temporary or permanent spaces for site managers, engineers, and project teams. Beyond construction, they serve education, healthcare, and government sectors needing quick additional offices or specialized facilities. They're also ideal for events, festivals, conferences, and exhibitions.
          </p>
          <p>
            Modular workspaces can also serve as home extensions or protective enclosures. Their ability to be relocated, reused, and reconfigured makes them a sustainable and practical choice for businesses seeking flexible workspace solutions.
          </p>
        </div>
      </section>

      {/* Challenges */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Challenges & Considerations</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Natural Light Blockage", desc: "Avoid lining cabins along window facades; use full-height clear glass instead of solid walls" },
            { title: "Ventilation", desc: "Each enclosed cabin needs 6–10 air changes per hour; coordinate with HVAC experts" },
            { title: "Acoustic Leakage", desc: "Sound flanking through unsealed ceilings and floors; ensure full-perimeter seals during installation" },
            { title: "Compliance", desc: "Verify doors, exit routes, and fire sprinklers meet local building and fire codes post-installation" },
          ].map((item, i) => (
            <div key={i} className="bg-background rounded-lg p-4 border">
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Installation Process */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Installation Process & Timelines</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Typical process:</h4>
            <ol className="space-y-2">
              {[
                "Site survey and measurements",
                "Design approval with the client's team",
                "Factory fabrication of components",
                "On-site assembly",
                "IT and power integration",
                "Inspection and handover",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Timeline examples:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">4–6 single cabins:</strong> Installed over one weekend in a 5,000 ft² office</li>
              <li><strong className="text-foreground">20-cabin cluster:</strong> Completed in 2–3 weeks</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 italic">
              Example: A mid-size consulting firm in India upgraded to 12 prefabricated office cabins without shutting down operations — the team installed cabins floor-by-floor during evenings.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Cost Factors for Office Cabins</h2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Tier</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Specifications</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Cost Range (INR)</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="border border-border px-4 py-3 font-medium text-foreground">{row[0]}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row[1]}</td>
                  <td className="border border-border px-4 py-3 font-semibold text-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Cost breakdown:</strong> Partition system, doors & glass (40–50%), electrical & data integration (15–20%), furniture & ergonomics (20–25%), optional acoustic upgrades.
          Long-term savings come from easier reconfiguration — avoiding demolition costs that run 2–3x higher for brick walls.
        </p>
      </section>

      {/* Design Trends */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Design Trends for Office Cabins in 2024–2026</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Transparent Privacy", desc: "Clear glass with acoustic films and subtle frosting lines" },
            { title: "Biophilic Elements", desc: "Planters, vertical gardens, timber textures within and around cabins" },
            { title: "Technology Integration", desc: "Built-in screens, occupancy sensors, booking apps, cable raceways" },
            { title: "Soft Aesthetics", desc: "Natural materials, warm 3000K lighting, no 'boxy' corporate feel" },
          ].map((trend, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4 border">
              <h4 className="font-semibold text-foreground text-sm mb-1">{trend.title}</h4>
              <p className="text-xs text-muted-foreground">{trend.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Choose */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">How to Choose the Right Cabin Mix</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <ul className="space-y-2">
              {[
                "Conduct a 2–4 week usage study tracking quiet space, call, and meeting needs",
                "Map requirements: 1 manager cabin per 12–15 staff, 1 meeting cabin per 20 staff, 1 phone booth per 8–10 employees",
                "Involve HR and team leaders to understand culture and work patterns",
                "Pilot-test a small number of cabins and adjust based on real usage analytics",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <h4 className="font-semibold text-foreground text-sm mb-2">Real-world example:</h4>
            <p className="text-xs text-muted-foreground">
              A fintech startup downsized from 10 large cabins to 6 smaller ones plus 8 phone pods after tracking actual usage — boosting utilization by 25% and freeing up portable workspaces for project teams.
            </p>
          </div>
        </div>
      </section>

      {/* Future */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Future of Office Cabins</h2>
        <p className="text-muted-foreground leading-relaxed">
          Office cabins will remain central as companies refine hybrid policies through 2026 and beyond. Emerging concepts include demountable cabins that can be relocated floor-to-floor, climate-controlled focus pods for Indian summers, and cabins designed for VR/AR collaboration. Data-driven design is rising — sensors now report cabin occupancy, air quality, and noise levels to optimise layouts over time. Sustainability drives the manufacture of cabins with recyclable aluminium, low-VOC panels, and modular components that support reuse after office moves.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-accent/10 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Ready to Create Your Modern Office Workspace?</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Start with a pilot of 4–6 cabins and refine your approach. Contact our facilities experts to discuss your requirements and get a customized quote.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
          >
            Request a Quote <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+919731897976"
            className="inline-flex items-center gap-2 border border-accent text-accent px-6 py-3 rounded-lg font-semibold hover:bg-accent/5 transition-colors"
          >
            <Phone className="w-4 h-4" /> +91-9731897976
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions About Office Cabins</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
