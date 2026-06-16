import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Clock, Shield, Users, Wrench, Leaf, MapPin, CheckCircle2, Home, Truck } from "lucide-react";
import workmenMain from "@/assets/products/workmen-accommodation-main.webp";
import workmenDouble from "@/assets/products/workmen-accommodation-double-storey.webp";
import workmenModular from "@/assets/products/workmen-accommodation-modular.webp";
import workmenSite from "@/assets/products/workmen-accommodation-site.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export const WorkmenAccommodationContent = () => {
  const keyFeatures = [
    { icon: Building2, title: "Steel & PEB Framework", desc: "Designed for wind speeds up to 44 m/s with PUF/EPS sandwich panels and PPGI sheets" },
    { icon: Clock, title: "Rapid Deployment", desc: "100–300 worker camps delivered and installed within 2–4 weeks" },
    { icon: Shield, title: "Fire & Safety Compliant", desc: "Extinguisher points, emergency exits, fire-resistant materials per NBC 2016" },
    { icon: Users, title: "Scalable Capacity", desc: "From 50-bed single-storey to 500-bed double-storey modular colonies" },
    { icon: Wrench, title: "Complete Ecosystem", desc: "Dormitories, kitchens, dining halls, toilets, recreation rooms, security cabins" },
    { icon: Leaf, title: "Sustainable Build", desc: "Recyclable steel, factory-controlled fabrication, solar rooftop integration options" },
  ];

  const benefits = [
    { label: "Time Savings", value: "10,000 sq ft camp installed in 20–30 days vs 3–4 months for RCC" },
    { label: "Cost Optimisation", value: "20–40% savings through lower cost per bed and relocatable structures" },
    { label: "Worker Wellbeing", value: "Better ventilation, lighting, and sanitation reduce absenteeism by 15–20%" },
    { label: "Compliance", value: "Meets client EHS audits, ESG requirements, and third-party inspections" },
    { label: "Sustainability", value: "Recyclable steel, reduced material wastage, solar rooftop integration" },
  ];

  const specRows = [
    ["Structural System", "Steel framework, PEB structures, containerized modules (wind speed up to 44 m/s)"],
    ["Wall/Roof Materials", "PUF/EPS sandwich panels, PPGI sheets, Aerocon panels, insulated roofs"],
    ["Thermal Insulation", "40–60 mm PUF for hot climates and coastal humidity"],
    ["Electrical", "Concealed wiring, LED fittings, ceiling fans, AC provisions in offices"],
    ["Windows/Doors", "Powder-coated steel or UPVC doors, MS/aluminium windows with grills & mosquito mesh"],
    ["Hygiene", "Toilet blocks with Indian/Western WCs, 2,000–10,000 L overhead tanks, septic/STP"],
    ["Fire Safety", "Extinguisher points, emergency exits, fire-resistant materials"],
    ["Flooring", "Cement boards on steel joists, PVC vinyl in dormitories, anti-skid tiles in toilets"],
    ["Corrosion Protection", "275 gsm zinc coating, epoxy primer + PU topcoat for coastal locations"],
    ["Roof Drainage", "PVC gutters (150mm diameter) with flashings for heavy monsoon rainfall"],
  ];

  const accommodationTypes = [
    "Single-storey labour colonies for 50–150 workers at mid-size project sites",
    "Double-storey modular camps for 300–500 beds on land-constrained urban sites",
    "ISO container-frame dormitory units (8–12 beds) for remote highway and solar projects",
    "Dormitory blocks, supervisors' rooms, engineers' container offices",
    "Kitchen-dining halls, recreation rooms, first-aid cabins",
    "Security cabins at entry gates and portable toilet blocks",
  ];

  const sectors = [
    "Building construction and real estate",
    "Roads and highways (NHAI projects)",
    "Metro rail (Mumbai Metro, Delhi Metro extensions)",
    "Refineries and steel plants",
    "Power projects and solar parks in Rajasthan and Gujarat",
    "Mining operations in Odisha and Jharkhand",
  ];

  const cities = [
    "Delhi NCR (Gurugram, Noida, Greater Noida)",
    "Mumbai-Pune belt",
    "Ahmedabad-Vadodara corridor",
    "Chennai & Coimbatore",
    "Bengaluru & Hyderabad",
    "Kolkata, Jaipur, Surat",
  ];

  const faqs = [
    { q: "How quickly can a workmen accommodation camp be installed?", a: "A typical 10,000 sq ft prefabricated labour camp can be installed in 20–30 days, compared to 3–4 months for conventional RCC or brick structures. Portable Office Cabin handles turnkey delivery including foundations, structure erection, utility connections, and furnishings." },
    { q: "What is the capacity range for prefab labour colonies?", a: "We deliver camps ranging from 50-bed single-storey setups for small projects to 500+ bed double-storey modular colonies for large infrastructure, metro rail, and refinery projects. Capacity depends on land availability and layout design." },
    { q: "Can workmen accommodation be relocated to another project site?", a: "Yes. Prefabricated and container-based accommodation is designed for disassembly, transport, and reinstallation. This eliminates demolition waste and preserves your capital investment across multiple projects." },
    { q: "What compliance standards do your labour camps meet?", a: "Our designs comply with BIS standards, NBC 2016 building codes, BOCW Act requirements, and client-specified EHS/ESG guidelines. Proper documentation supports tender submissions and third-party audits on large EPC contracts." },
    { q: "What materials are used for insulation in hot Indian climates?", a: "We use 40–60 mm PUF (Polyurethane Foam) or EPS sandwich panels for thermal insulation, suitable for both hot dry climates like Rajasthan and humid coastal conditions in Mumbai, Chennai, and Mangaluru." },
    { q: "Do you provide complete turnkey solutions including furniture?", a: "Yes. Our turnkey delivery includes bunk beds, mattresses, dining tables, kitchen equipment, sanitary fittings, and all utility connections. We deliver a move-in ready camp with as-built documentation and maintenance guidelines." },
    { q: "What is the typical cost saving compared to traditional construction?", a: "Clients achieve 20–40% savings through lower upfront cost per bed, reduced rework, minimal on-site labour requirements, and the ability to relocate structures to the next project instead of abandoning sunk civil works." },
    { q: "Which regions across India do you serve?", a: "Portable Office Cabin delivers workmen accommodation across 20+ Indian states, including Delhi NCR, Mumbai-Pune, Chennai, Bengaluru, Hyderabad, Ahmedabad, Kolkata, Jaipur, and remote project locations in Odisha, Jharkhand, Rajasthan, and Gujarat." },
  ];

  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-6">
          Prefab Labour Colonies & Portable Camps for Indian Projects
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground">
            <p>
              In the Indian construction and industrial context, workmen accommodation refers to temporary and semi-permanent housing for site workers, technicians, labourers, and support staff. These facilities are essential on construction sites, metro rail developments, highways, refineries, and power projects where a skilled workforce migrates from rural areas and requires on-site living arrangements.
            </p>
            <p>
              Portable Office Cabin designs, manufactures, and installs prefabricated workmen accommodation across India. Typical camps for 100–300 workers are delivered and installed within 2–4 weeks depending on location and layout complexity. Key benefits include quick installation, cost-effective construction, worker retention, and compliance with BIS and labour welfare guidelines.
            </p>
            <p>
              Prefab labour camps provide sleeping quarters, restrooms, kitchens, and communal areas with waste management systems, sanitation facilities, and clean water supplies. These structures are built with sturdy materials and construction techniques to withstand diverse environmental conditions.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden">
            <OptimizedImage
              src={resolveImageUrl(workmenMain)}
              alt="Prefabricated workmen accommodation colony with G+1 modular blocks by Portable Office Cabin in Bengaluru"
              className="rounded-xl"
              aspectRatio="4/3"
            />
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Workmen Accommodation Gallery
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <OptimizedImage src={resolveImageUrl(workmenDouble)} alt="Double-storey prefabricated workmen accommodation block with external staircases in industrial area" className="rounded-xl" aspectRatio="4/3" />
          <OptimizedImage src={resolveImageUrl(workmenModular)} alt="Modular G+1 worker housing colony with balconies and covered walkways at construction site" className="rounded-xl" aspectRatio="4/3" />
          <OptimizedImage src={resolveImageUrl(workmenSite)} alt="Prefab labour colony installation with workers and crane at project site in South India" className="rounded-xl" aspectRatio="4/3" />
        </div>
      </section>

      {/* Labour Accommodation Introduction */}
      <section className="bg-muted/30 rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-4">
          Introduction to Labour Accommodation
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Labour accommodation is a vital component of successful industrial projects, ensuring that workers, technicians, and support staff have access to safe, comfortable, and well-equipped living spaces during their time on site. Prefabricated labour camps and prefab labour hutments have emerged as the preferred solution for both temporary and semi-permanent worker housing in India's fast-paced construction and infrastructure sectors.
          </p>
          <p>
            These structures are engineered with sturdy construction materials and assembled by a skilled workforce, guaranteeing durability and resilience against diverse environmental conditions. The versatile range of prefabricated labour camps available today allows clients to select options that perfectly match their site requirements, workforce size, and project timelines.
          </p>
          <p>
            One of the standout advantages of prefab labour hutments is their quick installation and easy construction, making them ideal for projects with tight deadlines or limited land availability. Their economical nature ensures that clients can provide high-quality accommodation without exceeding budget constraints. Furthermore, these structures can be customized to meet specific requirements, offering flexibility in layout, amenities, and finishes.
          </p>
        </div>
      </section>

      {/* Types of Accommodation */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Types of Workmen Accommodation Solutions
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {accommodationTypes.map((type, i) => (
            <div key={i} className="flex items-start gap-3 bg-card rounded-xl p-4 shadow-card">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4">
          These structures accommodate both short-term (3–12 months) and long-term (1–5 years) deployments with durability designed accordingly.
        </p>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Key Features of Prefabricated Workmen Accommodation
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {keyFeatures.map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <feature.icon className="h-10 w-10 text-accent mb-4" />
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Specifications Table */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Technical Specifications
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-6 py-3 text-left font-semibold">Specification</th>
                <th className="px-6 py-3 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {specRows.map(([label, value], i) => (
                <tr key={label} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{label}</td>
                  <td className="px-6 py-4 text-muted-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-accent/5 rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Benefits of Prefab Workmen Accommodation for Projects
        </h2>
        <div className="space-y-4">
          {benefits.map((benefit) => (
            <div key={benefit.label} className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card">
              <CheckCircle2 className="h-6 w-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">{benefit.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{benefit.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design & Layout */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Design & Layout Considerations for Workmen Colonies
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground">
            <h3 className="font-semibold text-foreground">Zoning Principles</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Separate sleeping areas from cooking/dining zones (minimum 50m)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Position toilets and washing zones away from dormitories</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Locate office/admin blocks near entry gates</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Wide 4–6m internal pathways for worker movement and vehicles</li>
            </ul>
            <h3 className="font-semibold text-foreground mt-4">Bed Density</h3>
            <p>6–12 beds per dormitory with adequate aisle space (4–6 sqm per worker), storage shelves, and personal lockers where feasible.</p>
          </div>
          <div className="space-y-4 text-muted-foreground">
            <h3 className="font-semibold text-foreground">Climate-Responsive Design</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Orient buildings east-west to reduce solar heat gain</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Provide 2–3m verandas for shade</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> Ensure 20% wall openings for cross-ventilation</li>
            </ul>
            <h3 className="font-semibold text-foreground mt-4">Utilities Planning</h3>
            <p>Water supply lines, power cable routing, sloped drainage, septic tanks or STP, and waste-collection points with clear maintenance access.</p>
          </div>
        </div>
      </section>

      {/* Portable Camps for Remote Locations */}
      <section className="bg-muted/30 rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-4">
          Portable Camps for Remote Locations
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Portable camps for remote locations have become an essential solution for industrial projects across India, where access to traditional infrastructure is often limited. These prefabricated labour camps are specifically designed to provide comfortable, durable, and efficient accommodation for workers stationed far from urban centres.
          </p>
          <p>
            One of the standout features is their quick installation and easy construction, allowing clients to rapidly establish a fully functional site even in the most inaccessible areas. The versatile range includes dormitories, kitchens, dining halls, and recreation spaces—all customizable to meet the unique requirements of each project.
          </p>
          <p>
            The labour colony concept is fully integrated into these portable camps, providing comprehensive living solutions including water supply systems, sanitation facilities, and electricity generation. This self-sufficiency is particularly valuable in remote locations where access to basic services may be limited.
          </p>
        </div>
      </section>

      {/* Regions & Sectors */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Workmen Accommodation Across Indian Cities & Sectors
        </h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" /> Key Regions
            </h3>
            <ul className="space-y-2">
              {cities.map((city) => (
                <li key={city} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> {city}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" /> Sector Applications
            </h3>
            <ul className="space-y-2">
              {sectors.map((sector) => (
                <li key={sector} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" /> {sector}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Product Range */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Portable Office Cabin Product Range for Workmen Facilities
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Home, label: "Prefab dormitory blocks & container sleeping units" },
            { icon: Building2, label: "Portable site offices for engineers & managers" },
            { icon: Users, label: "Modular kitchens, dining halls & container cafés" },
            { icon: Shield, label: "Portable toilets & bath blocks (multi-cubicle)" },
            { icon: Wrench, label: "Handwash stations with sewage solutions" },
            { icon: Truck, label: "Security guard rooms & rooftop sheds" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 bg-card rounded-xl p-4 shadow-card border border-border">
              <item.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Project Process */}
      <section className="bg-accent/5 rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Project Process: From Enquiry to Handover
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Requirement Capture", desc: "Workers count, site location, project duration, climatic zone, compliance standards" },
            { step: "2", title: "Concept Layout", desc: "CAD drawings showing dormitories, toilets, kitchen, admin areas with detailed BOQ" },
            { step: "3", title: "Design Finalisation", desc: "Structural checks for wind and seismic loads per Indian standards" },
            { step: "4", title: "Manufacturing", desc: "10–20 days factory lead time depending on camp size" },
            { step: "5", title: "Logistics & Installation", desc: "Transport to site, foundation work, structure erection, utility connections" },
            { step: "6", title: "Handover", desc: "As-built documentation, maintenance guidelines, support contacts" },
          ].map((item) => (
            <div key={item.step} className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-4">
          Regulatory, Safety & Welfare Compliance
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>Many principal contractors insist on minimum welfare standards for labour accommodation backed by Indian labour welfare rules and international EHS guidelines.</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {[
              "Adequate space per worker (3.5–4.5 sqm in dormitories)",
              "Proper ventilation and sanitation ratios (1:15–1:20)",
              "Potable water supply and adequate lighting",
              "Segregated sanitary facilities and safe cooking zones",
              "Emergency exits, assembly points, fire-safety provisions",
              "Non-slip finishes and proper documentation for audits",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose POC */}
      <section className="bg-muted/30 rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-4">
          Why Choose Portable Office Cabin for Workmen Accommodation
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>Portable Office Cabin is a specialised manufacturer and supplier of modular buildings focused on Indian project conditions with over 10 years of experience and cumulative delivery exceeding 1 million sq ft across 20+ states.</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {[
              "In-house design and fabrication from raw material to finished product",
              "Integrated solutions: prefab buildings, container offices, portable toilets, PEB structures",
              "Transparent pricing with predictable timelines",
              "After-sales support for expansion or relocation",
              "Perfect alignment with economical project budgets",
              "Turnkey delivery for both private developers and government/PSU projects",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-1" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl shadow-card border border-border px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-primary rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary-foreground mb-4">
          Plan Worker Housing Early for Optimal Results
        </h2>
        <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-6">
          Prepare your project address, estimated workforce by category, land availability, and desired camp lifespan. Contact Portable Office Cabin today for a detailed proposal for your workmen accommodation needs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/contact" className="inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground px-8 py-3 font-semibold hover:bg-accent/90 transition-colors">
            Request a Proposal
          </a>
          <a href="tel:+919731897976" className="inline-flex items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 px-8 py-3 font-semibold hover:bg-primary-foreground/20 transition-colors">
            Call +91 97318 97976
          </a>
        </div>
      </section>
    </div>
  );
};
