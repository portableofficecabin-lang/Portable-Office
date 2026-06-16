import { Building2, CheckCircle2, Wrench, ShieldCheck, Truck, Users, Leaf, HardHat, LayoutGrid, Ruler, PaintBucket, ClipboardCheck, Phone, ChevronRight, Bath, Factory, GraduationCap, Heart, ShoppingBag, Home } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import portableCabinSiteOffice from "@/assets/content/portable-cabin-site-office.jpg";
import portableCabinInterior from "@/assets/content/portable-cabin-interior.jpg";
import portableCabinAccommodation from "@/assets/content/portable-cabin-accommodation.jpg";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export function PortableCabinContent() {
  return (
    <div className="space-y-16">
      {/* Hero Introduction */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-accent rounded-full" />
          <span className="text-accent font-semibold uppercase tracking-wider text-sm">Complete Guide</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
          Portable Cabin: The Complete Buyer's Guide
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          A portable cabin is a prefabricated, relocatable structure manufactured off-site and delivered ready for use at your location. Since around 2020, businesses across India and the Middle East have rapidly adopted these structures for their speed, flexibility, and cost efficiency. Whether you need a site office, worker accommodation, portable toilet, security cabin, or storage unit, portable cabins offer a practical alternative to traditional construction.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          This guide is written from the perspective of a manufacturer and supplier of portable cabins. The focus here is on practical buying guidance—what to look for, how to choose the right type, and what questions to ask before placing an order.
        </p>

        {/* Key Benefits Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Quick Installation", desc: "Often within 1–3 days of delivery" },
            { icon: Building2, title: "Reusable", desc: "Across multiple projects over many years" },
            { icon: Wrench, title: "Minimal Civil Work", desc: "No heavy foundations required at site" },
            { icon: ShieldCheck, title: "Easy Relocation", desc: "Move using crane or hydra effortlessly" },
          ].map((benefit) => (
            <div key={benefit.title} className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center hover:border-accent/30 transition-colors">
              <benefit.icon className="h-8 w-8 text-accent mx-auto mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-1">{benefit.title}</h4>
              <p className="text-xs text-muted-foreground">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Site Office Image */}
      <section>
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <OptimizedImage
            src={resolveImageUrl(portableCabinSiteOffice)}
            alt="Modern portable cabin site office installed at construction site in India"
            aspectRatio="3/2"
            className="rounded-2xl"
          />
        </div>
        <p className="text-sm text-muted-foreground text-center mt-3 italic">
          A ready-to-use portable cabin site office at an active construction site
        </p>
      </section>

      {/* Types of Portable Cabins */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <LayoutGrid className="h-7 w-7 text-accent" />
          Types of Portable Cabins and Porta Cabin
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Portable cabins come in different materials and configurations depending on your usage, budget, and site conditions. Understanding the options helps you match the right cabin to your specific needs.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              title: "MS (Mild Steel) Portable Cabins",
              desc: "Built with a welded steel frame and walls in a mild steel built type construction. High strength and durability make these ideal for site offices, worker accommodation, and storage at construction sites. Most common and cost-effective option for standard applications.",
              icon: HardHat,
            },
            {
              title: "GI (Galvanized Iron) Portable Cabins",
              desc: "The GI built type offers better corrosion resistance than plain MS. Suitable for coastal or high-humidity locations like Mumbai, Kochi, or Chennai where rust is a concern.",
              icon: ShieldCheck,
            },
            {
              title: "Office Cabins",
              desc: "Feature insulated walls, windows, doors, electrical wiring, LED lights, and provision for AC installation. Available in sizes like 10x20 ft, 10x30 ft, or 12x40 ft depending on occupancy requirements.",
              icon: Building2,
            },
            {
              title: "Portable Toilet Cabins",
              desc: "Include integrated WC, urinals, washbasin, and plumbing connections for water inlet and waste outlet. Some units come with bio-digester tanks for remote locations without sewage access.",
              icon: Bath,
            },
            {
              title: "Security Cabins & Guard Rooms",
              desc: "Compact units (e.g., 4x4 ft, 4x6 ft) with 3-side glazing for visibility. Include small desk space, fan, and light points. Perfect for factory gates, residential complexes, and project entry points.",
              icon: ShieldCheck,
            },
            {
              title: "Modular & Combined Units",
              desc: "Single cabins can be combined to create larger spaces like training halls, classrooms, or multi-bay offices with multiple compartments. Steel built type construction allows for safe stacking and expansion.",
              icon: LayoutGrid,
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

      {/* Key Features & Benefits */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <CheckCircle2 className="h-7 w-7 text-accent" />
          Key Features and Benefits
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Buyers typically compare portable cabins with traditional brick-and-mortar structures on three factors: speed, cost, and flexibility. Here's how portable cabins perform on each.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div>
            <OptimizedImage
              src={resolveImageUrl(portableCabinInterior)}
              alt="Interior of modern portable cabin office with AC, desks and LED lighting"
              aspectRatio="3/2"
              className="rounded-xl"
            />
            <p className="text-sm text-muted-foreground text-center mt-3 italic">
              Fully equipped portable cabin interior with AC and workstations
            </p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Speed of Deployment", value: "A standard 20 ft office cabin can be delivered and placed on a level surface in under 24–72 hours from order confirmation." },
              { label: "Portability", value: "Cabins can be lifted by crane or hydra and transported on trucks—suitable for construction sites, mining areas, highway projects, and temporary events." },
              { label: "Reusability & Long Life", value: "Quality MS or GI cabins can last 10–15 years with proper maintenance. Repainting every 3–5 years keeps them in excellent condition." },
              { label: "Minimal Site Preparation", value: "Most sites only require simple PCC blocks or ISMB support beams instead of full foundations." },
              { label: "Safety & Durability", value: "Insulated panels provide better temperature control. Strong frames withstand wind loads and rough handling during shifting." },
              { label: "Eco-Friendly", value: "Reduced construction debris, lower water usage compared to masonry, and the ability to reuse across multiple projects." },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-sm">{item.label}: </span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Benefits Banner */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
          <h3 className="font-display font-bold text-lg text-foreground mb-4 text-center">Top 5 Benefits at a Glance</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {["Speed", "Flexibility", "Cost Control", "Reusability", "Comfort"].map((b) => (
              <span key={b} className="bg-accent text-white px-5 py-2 rounded-full text-sm font-semibold">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Factory className="h-7 w-7 text-accent" />
          Applications of Portable Cabins
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          From 2020–2025, use of portable cabins has grown strongly across infrastructure, education, and industrial sectors. The industry has seen significant adoption in both manufacturing and service environments.
        </p>

        <div className="rounded-2xl overflow-hidden shadow-lg mb-8">
          <OptimizedImage
            src={resolveImageUrl(portableCabinAccommodation)}
            alt="Large-scale portable cabin deployment at construction project site in India"
            aspectRatio="3/2"
            className="rounded-2xl"
          />
          <p className="text-sm text-muted-foreground text-center mt-3 italic">
            Large-scale portable cabin deployment for worker accommodation
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: HardHat, title: "Construction & Infrastructure", desc: "Site offices, engineer cabins, QS/billing rooms, meeting rooms, and store rooms. Every major construction company now maintains a fleet." },
            { icon: Factory, title: "Industrial & Factory", desc: "Weighbridge cabins, security cabins at entry gates, quality control labs, and temporary workshops. Common in SEZs and logistics parks." },
            { icon: GraduationCap, title: "Education & Training", desc: "Modular classrooms, training rooms, and exam controller cabins used by schools and institutes during expansion or renovation." },
            { icon: Heart, title: "Healthcare & Emergency", desc: "Temporary clinics, vaccination booths, and isolation cabins. Hospitals still use them for overflow accommodation." },
            { icon: ShoppingBag, title: "Commercial Use", desc: "Ticket counters, portable shops, kiosks, and small site-based sales offices in real estate or automobile sectors." },
            { icon: Home, title: "Residential & Accommodation", desc: "Worker accommodation blocks, supervisor staying cabins, pantry and dining cabins at remote project locations. Essential for oil & gas, mining, and highway projects." },
          ].map((app) => (
            <div key={app.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <app.icon className="h-6 w-6 text-accent mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-2">{app.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{app.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sanitation Solutions */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Bath className="h-7 w-7 text-accent" />
          Sanitation Solutions for Portable Cabins
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            When it comes to outfitting portable cabins for use on construction sites, remote offices, or temporary accommodations, sanitation is a top priority. Portable toilets, designed in a prefab shape and constructed from durable materials like mild steel (MS) or galvanized iron (GI), offer a practical and hygienic solution that integrates seamlessly with your existing porta cabin setup.
          </p>
          <p>
            For businesses operating in dynamic industries, providing reliable sanitation facilities is essential for employee well-being and operational efficiency. Whether your company requires a single portable toilet for a compact office cabin or multiple compartments for a larger workforce, these solutions can be customized in size and type to match your specific needs.
          </p>
          <p>
            One of the key advantages is flexibility. Since these units are portable and modular by nature, they typically do not require special permission for installation, allowing you to respond quickly to changing site requirements. The steel built type—whether MS or GI—ensures long-lasting performance, even in challenging weather conditions.
          </p>
          <p>
            Leading manufacturers offer a range of options, from single-compartment units to multi-bay portable toilets, all designed for easy integration with office cabins, security cabins, or storage rooms. By choosing the right sanitation setup, you ensure that your portable cabins remain functional, compliant, and comfortable for all users.
          </p>
        </div>
      </section>

      {/* Materials, Sizes, Customization */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Ruler className="h-7 w-7 text-accent" />
          Materials, Sizes, and Customization
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Choosing the right material and size has a direct impact on lifespan, comfort, and cost. Here's what to consider.
        </p>

        <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Aspect</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Materials", value: "MS vs GI depends on location and budget. Typical sheet thicknesses: 1.2–1.6 mm external, 0.6–0.8 mm inner. Insulation: PUF, EPS, rockwool panels." },
                { label: "Frame & Structure", value: "Square or rectangular hollow sections (50x50 mm, 80x40 mm) with proper anti-rust treatment and primer." },
                { label: "Standard Sizes", value: "8x20 ft, 10x20 ft, 10x30 ft, 12x40 ft. Custom lengths possible depending on transport regulations." },
                { label: "Interiors", value: "Vinyl flooring, marine plywood with vinyl overlay, modular furniture, partition walls, false ceiling, factory-fitted electrical points." },
                { label: "Openings & Fittings", value: "Steel doors, aluminum/uPVC windows, protective grills, external canopies, and AC cut-outs." },
                { label: "Customization", value: "Corporate colors, logo branding, conference room or workstation layouts. Full flexibility before delivery." },
              ].map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground w-1/4 text-sm">{row.label}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Buying Guide */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-accent" />
          Buying Guide: How to Choose the Right Portable Cabin
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          This checklist helps first-time buyers avoid common mistakes and hidden costs. Use it before finalizing your quote with any manufacturer.
        </p>

        <div className="space-y-4">
          {[
            { step: "1", title: "Define Purpose & Occupancy", desc: "Calculate total users, type of use (office, storage, accommodation), and required amenities (toilets, pantry, AC) before finalizing size." },
            { step: "2", title: "Check Material Specifications", desc: "Verify MS/GI thickness, insulation type, quality of paint, and flooring materials in the quotation. Ask for written confirmation." },
            { step: "3", title: "Verify Structural Design", desc: "Ask for details of base frame, lifting points, and load-bearing capacity—especially important for stacking or rooftop installation." },
            { step: "4", title: "Assess Supplier Credibility", desc: "Check years of operation, past projects, client references, and certifications. Don't choose based on lowest price alone." },
            { step: "5", title: "Logistics & Installation", desc: "Confirm transport charges, crane availability, site access constraints, and estimated delivery timeline in writing before placing order." },
            { step: "6", title: "After-Sales & Warranty", desc: "Confirm warranty period for leakage and structural defects. Check availability of repair or relocation support." },
            { step: "7", title: "Pricing Transparency", desc: "Get itemized quotations showing ex-works price, GST, transport, unloading, and installation charges separately." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="bg-accent text-white rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-sm">
                {item.step}
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-accent/5 border border-accent/15 rounded-2xl p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <PaintBucket className="h-7 w-7 text-accent" />
          Why Choose Our Portable Cabins
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          We are a dedicated portable cabin manufacturer and supplier focused on delivering quality structures that serve you for years, not months.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: "Experience", desc: "Multiple years of hands-on history in designing, fabricating, and installing MS and GI portable cabins across different states." },
            { title: "Manufacturing Capability", desc: "In-house fabrication, welding, painting, and quality-check processes ensure consistent cabin quality." },
            { title: "Product Range", desc: "Office cabins, toilet cabins, accommodation units, security cabins, and customized modular units in all sizes." },
            { title: "Quality & Safety Focus", desc: "Branded raw materials, tested electrical components, proper earthing, and attention to ventilation and insulation." },
            { title: "Competitive Pricing", desc: "We focus on long-term value—durability and lower maintenance—rather than just the cheapest upfront rate." },
            { title: "Full Service Support", desc: "Support from enquiry stage to delivery, on-site installation guidance, and assistance in future relocation." },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-xl p-5 border border-border">
              <h4 className="font-semibold text-foreground mb-2 text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordions for remaining sections */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion type="multiple" className="space-y-3">
          <AccordionItem value="eco-friendly" className="bg-card border border-border rounded-xl px-6">
            <AccordionTrigger className="text-foreground font-semibold hover:text-accent">
              <span className="flex items-center gap-3">
                <Leaf className="h-5 w-5 text-accent" />
                Eco-Friendly Portable Cabin Options
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
              As sustainability becomes a priority, eco-friendly portable cabin options are increasingly in demand across India. Our range includes cabins crafted with recyclable materials that help reduce environmental impact and waste. These units are designed with energy-efficient insulation, natural ventilation options, and provisions for solar-powered lighting. The reduced construction debris, lower water usage compared to masonry, and ability to reuse across multiple projects make portable cabins an inherently greener choice. For off-grid locations, we offer solar panel integration and rainwater harvesting attachments.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="safety" className="bg-card border border-border rounded-xl px-6">
            <AccordionTrigger className="text-foreground font-semibold hover:text-accent">
              <span className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-accent" />
                Safety and Security Features
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
              Safety and security are paramount considerations. Our portable cabins are built with robust, rust-proof materials and stable structures to ensure user safety in all conditions. Each unit is equipped with lockable steel doors for privacy and security, while proper ventilation maintains a safe environment. Integrated lighting and clearly marked light points enhance visibility in low-light conditions. Strong MS or GI frames withstand wind loads and rough handling during shifting. All electrical components are properly earthed, and insulation materials meet fire-safety standards.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="installation" className="bg-card border border-border rounded-xl px-6">
            <AccordionTrigger className="text-foreground font-semibold hover:text-accent">
              <span className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-accent" />
                Installation and Maintenance Guide
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
              Proper installation begins with selecting a level surface, securely positioning the unit using crane or hydra, and connecting electrical and plumbing lines. Most sites only require simple PCC blocks or ISMB support beams—no full foundation needed. Routine maintenance involves periodic exterior repainting every 3–5 years, checking door and window seals, servicing electrical connections, and ensuring drainage around the cabin base. Scheduled inspections help identify any issues early, ensuring that the cabin remains in optimal working condition for 10–15 years.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="regulations" className="bg-card border border-border rounded-xl px-6">
            <AccordionTrigger className="text-foreground font-semibold hover:text-accent">
              <span className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-accent" />
                Regulations and Compliance
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
              All our products are manufactured in accordance with relevant Indian standards, ensuring proper structural safety, electrical safety, and fire resistance. We adhere to quality benchmarks such as ISO 9001:2015, guaranteeing that our portable cabins meet rigorous safety and performance criteria. For government tenders and corporate projects, we provide complete documentation including test certificates, material specifications, and compliance reports.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-accent text-white rounded-2xl p-8 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-white/85 max-w-2xl mx-auto mb-6">
          Share your layout, required size, and site location details with us to receive a customized quotation and technical suggestion. We're here to help you find the right porta cabin for your project needs.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="tel:+919731897976" className="inline-flex items-center gap-2 bg-white text-accent font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors">
            <Phone className="h-4 w-4" />
            Call Us Now
          </a>
          <a href="/contact" className="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            Request a Quote
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
