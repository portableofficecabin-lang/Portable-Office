import { Check, Zap, Shield, Settings, Thermometer, RotateCcw, Users, Building2, HardHat, Leaf, ClipboardCheck, Phone, Wrench, Home } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import laborHutmentsAerial from "@/assets/products/labor-hutments-aerial.webp";
import laborHutmentsConstruction from "@/assets/products/labor-hutments-construction.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export function LaborHutmentsContent() {
  const faqs = [
    { q: "How quickly can a 100-person labor camp be installed?", a: "A 100-person camp takes 10–20 days versus 60–90 days for masonry construction. Most fabrication happens off site, and on-site erection begins once materials reach the location." },
    { q: "What does the labor hutment unit on this page cost?", a: "It is sold at the single price shown at the top of this page, inclusive of 18% GST, with transport and optional installation calculated at checkout from your delivery pincode. Larger colonies are sized to the brief — panel thickness, interior furnishings, sanitary provisions, and number of floors all change the build — so those are quoted separately." },
    { q: "Can labor hutments be relocated to another project?", a: "Yes. Hutments can be dismantled and relocated with 90–95% material recovery, unlike fixed buildings requiring demolition. Units are designed for 3–10 project reuses." },
    { q: "What is the service life of prefab labor hutments?", a: "Can be temporary (1–3 years) or semi-permanent (up to 15–20 years) depending on specifications, foundation type, and maintenance practices. Anti-corrosive coatings and galvanized steel ensure long-term durability." },
    { q: "Do you offer G+1 and G+2 configurations?", a: "Yes. Single-story, G+1, and G+2 options are available with staircases, corridors, and balcony walkways to address land availability constraints on urban and remote sites." },
    { q: "What compliance standards do your hutments meet?", a: "Designs adapt for PSU tenders requiring minimum 2.5–3.5 sqm per worker and specified sanitation ratios. Electrical layouts include MCBs, earthing, and optional fire-retardant linings meeting safety regulations." },
    { q: "Can you supply integrated colony packages?", a: "Absolutely. We supply complete solutions including dormitories, canteens, prefabricated kitchens, container cafes, portable toilets, recreation halls, prayer rooms, and security cabins." },
    { q: "What insulation options handle extreme Indian climates?", a: "Wall and roof systems use 30–60mm PUF/EPS cores, reducing indoor temperatures by 10–15°C in peak summers. Higher insulation is available for Rajasthan/Gujarat heat, with gutters for coastal rain." },
  ];

  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Labor Hutments: Prefabricated Worker Accommodation by Portable Office Cabin
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-4">
          Labor hutments serve as temporary and semi-permanent housing for workers at construction sites, infrastructure development projects, and industrial locations across India. From metros like Mumbai, Delhi NCR, Bengaluru, Hyderabad, and Ahmedabad to remote project sites in the Middle East and Africa, these prefabricated structures provide affordable housing for the workforce powering large-scale developments.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Portable Office Cabin manufactures prefabricated labour hutments using insulated sandwich panels and steel structures, delivering move in ready accommodations to any desired location. Our modular approach ensures rapid installation — typically 5–15 days for small colonies — along with significant cost savings versus brick-and-mortar construction, reusability between projects, and improved living standards for labourers.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This article covers: types of hutments and building configurations, design features including insulation, safety, and sanitary fixtures, customization options for specific requirements, specification factors, installation timelines and typical applications.
        </p>
      </section>

      {/* Image Gallery */}
      <section className="grid md:grid-cols-2 gap-6">
        <OptimizedImage
          src={resolveImageUrl(laborHutmentsAerial)}
          alt="Aerial view of prefabricated labor hutment colony with modular accommodation units and workers at construction site by Portable Office Cabin"
          className="rounded-xl w-full h-auto"
        />
        <OptimizedImage
          src={resolveImageUrl(laborHutmentsConstruction)}
          alt="Steel frame construction of prefabricated labor hutment with insulated sandwich panel installation by workers at industrial site"
          className="rounded-xl w-full h-auto"
        />
      </section>

      {/* What Are Prefabricated Labor Hutments */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          What Are Prefabricated Labor Hutments?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Prefabricated labor hutments are modular structures manufactured off site in controlled factory environments using PUF/EPS insulated panels, light-gauge steel frames, and pre-engineered components. These units are then transported to site and assembled using bolt-on installation methods, saving valuable time compared to conventional construction.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Building Types", desc: "Single-story hutments, G+1 (ground plus one), and G+2 labor blocks function as dormitories, dining halls, common toilets, and recreation rooms" },
            { title: "Worker Density", desc: "Designed for 6–12 workers per room with bunk beds, meeting typical Indian site requirements while allowing compliance with government norms" },
            { title: "Service Life", desc: "Can be temporary (1–3 years) or semi-permanent (up to 15–20 years) depending on specifications, foundation type, and maintenance practices" },
            { title: "Compliance", desc: "Layouts can meet client HSE standards or PSU tender requirements specifying minimum 2.5–3.5 sqm per worker" },
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
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Key Features of Portable Office Cabin Labor Hutments
        </h2>
        <p className="text-muted-foreground mb-6">
          Portable Office Cabin focuses on insulation, safety, hygiene, and fast installation as core design principles. Our prefabricated structures use high quality materials engineered for the demanding conditions of construction and industrial environments.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Thermometer, title: "Insulation", desc: "Wall panel and roof systems use 30–60mm PUF/EPS cores, reducing indoor temperatures by 10–15°C in peak summers and cutting HVAC requirements" },
            { icon: Shield, title: "Structural Strength", desc: "Galvanized steel frames provide wind resistance up to 150 km/h and suitability for seismic zones III–IV when properly anchored" },
            { icon: Zap, title: "Safety Compliance", desc: "Electrical layouts include MCBs, earthing, and optional fire-retardant linings meeting safety regulations and local codes" },
            { icon: Settings, title: "Sanitation", desc: "Pre-planned integration of toilets, bathing areas, water tanks, septic systems, and plumbing lines with proper sanitary fittings" },
            { icon: Users, title: "Comfort", desc: "Cross-ventilation, exhaust fans, LED lighting, ceiling fans, provision for split ACs, mosquito mesh, and weather resistant reflective roofing" },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <feature.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advantages Over Conventional */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Advantages Over Conventional Brick-and-Mortar Accommodation
        </h2>
        <p className="text-muted-foreground mb-6">
          Traditional RCC and brick structures constructed off site locations require extensive civil work, longer timelines, and permanent foundations. Prefabricated labor huts offer a cost effective alternative with superior flexibility for projects where workforce scales fluctuate.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Fast Installation", desc: "A 100-person camp takes 10–20 days versus 60–90 days for masonry — critical for reducing project mobilization time" },
            { title: "Cost Efficiency", desc: "Lower foundation needs, controlled fabrication, and reuse across 3–10 projects deliver 20–35% lifecycle savings as a cost effective solution" },
            { title: "Reusability", desc: "Hutments can be dismantled and relocated with 90–95% material recovery, unlike fixed buildings requiring demolition" },
            { title: "Scalability", desc: "Add or remove blocks as workforce size changes during phased EPC contracts for highways, metro rail, or refineries" },
            { title: "Reduced Disruption", desc: "Most fabrication happens off site, minimizing dust, noise, and congestion at the project location" },
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

      {/* Customization Options */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Customization Options for Labor Hutments
        </h2>
        <p className="text-muted-foreground mb-6">
          Portable Office Cabin offers 100% project-based customization, allowing clients across India to tailor layouts, finishes, and services to their specific needs.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Building2, title: "Layout", desc: "Dormitory sizes, aisle widths, attached vs common toilets, male/female block segregation, supervisor rooms, and first-aid facilities" },
            { icon: HardHat, title: "Configuration", desc: "Single-story or G+1/G+2 options with staircases, corridors, and balcony walkways to address land availability constraints" },
            { icon: Home, title: "Interior Fit-Out", desc: "MS powder-coated bunk beds, lockers, internal partitions, wall claddings, false ceilings, and vinyl flooring" },
            { icon: Settings, title: "Integrated Facilities", desc: "Canteens, prefabricated kitchens, container cafes, portable toilets, recreation halls, and prayer rooms" },
            { icon: Thermometer, title: "Climate Add-Ons", desc: "Higher insulation for Rajasthan/Gujarat heat, gutters for coastal rain, and rooftop sheds for open spaces" },
            { icon: Shield, title: "Branding", desc: "Exterior colors matching company themes, safety signage, CCTV, and access control per HSE requirements" },
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
      </section>

      {/* Additional Features and Amenities */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Additional Features and Amenities
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Portable Office Cabin's prefabricated labour hutments are designed to deliver more than just basic shelter — they provide a comprehensive living environment that supports the well-being and productivity of workers on construction sites. Each prefabricated labor hutment comes equipped with essential electrical and sanitary fixtures, ensuring reliable lighting, power supply, and hygienic washroom facilities from day one. Durable bunk beds and practical furnishings are included to maximize space and comfort, while insulated sandwich panels offer superior insulation and ventilation, maintaining a pleasant indoor climate regardless of external weather conditions.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Our prefabricated labour huts are truly move-in ready, minimizing setup time and allowing your workforce to settle in quickly. We understand that every project has unique requirements, so we offer a wide range of additional features that can be tailored to your specific needs — whether it's extra storage, enhanced ventilation, or specialized sanitary fixtures. This flexibility makes our solutions ideal for clients seeking affordable housing that doesn't compromise on quality or convenience.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          By focusing on efficient layouts, robust construction, and thoughtful amenities, we ensure that our prefabricated labour hutments provide a safe, comfortable, and cost-effective environment for workers. This attention to detail not only improves daily living standards but also helps boost morale and productivity across your workforce.
        </p>
      </section>

      {/* Safety, Durability, and Compliance */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Safety, Durability, and Compliance
        </h2>
        <p className="text-muted-foreground mb-6">
          Worker safety and long-term durability are built into every labour hutment we deliver. Our solutions meet the demanding conditions of remote sites while supporting customer compliance requirements.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Durability", desc: "Anti-corrosive coatings and galvanized steel ensure 10–20 year service life with basic maintenance; durable against dust and moisture" },
            { title: "Resistance", desc: "Steel structures perform well in seismic zones; fire-retardant panels available; termite immunity versus timber/masonry" },
            { title: "Weather Protection", desc: "Sloped roof design prevents leakage; insulated panels handle extreme temperatures across states like Rajasthan and Tamil Nadu" },
            { title: "Hygiene", desc: "Proper ventilation, drainage, washable surfaces, and wet/dry zone segregation prevent mold and health risks" },
            { title: "Regulatory Alignment", desc: "Designs adapt for PSU tenders requiring minimum space per occupants and specified sanitation ratios" },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Applications and Configurations */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Applications and Typical Configurations
        </h2>
        <p className="text-muted-foreground mb-6">
          Prefab labour accommodation from Portable Office Cabin serves diverse industries including roads, highways, metro rail, power plants, refineries, logistics parks, and large commercial projects.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { title: "Application Types", desc: "Standalone labor rooms, full colonies with internal roads, combined office-and-accommodation blocks, remote work camps" },
            { title: "Capacity Bands", desc: "50–100 workers for small sites, 200–500 for mid-scale construction, 1,000+ for mega infrastructure development projects" },
            { title: "Integrated Solutions", desc: "Container offices for site management, portable security cabins, prefabricated canteens, and portable toilets" },
            { title: "Example Configurations", desc: "A 250-bed G+1 labour colony for a warehouse project delivered in 3 weeks, or a 400-person camp for a solar park in Rajasthan" },
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

      {/* Price */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Price and What Changes the Specification
        </h2>
        <p className="text-muted-foreground mb-6">
          The labor hutment unit listed on this page is sold at the single price shown at the top, inclusive of 18% GST. Transport and optional installation are calculated at checkout from your delivery pincode. Full colony packages are sized to the brief and quoted separately by our team.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Factor</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground border border-border">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Specification Drivers", "Panel thickness (30mm vs 60mm), floors, interior furnishings, sanitary provisions, foundation"],
                ["Lifecycle Value", "Amortizes to 20–35% savings over 5–10 years through reusability across 3–10 projects"],
                ["Ownership vs Rental", "Prefab ownership offers better control and reuse than renting accommodation near the site"],
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground border border-border">{row[0]}</td>
                  <td className="px-4 py-3 text-muted-foreground border border-border">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Installation Process */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Installation Process and Project Timelines
        </h2>
        <p className="text-muted-foreground mb-6">
          The typical workflow moves from design freeze through delivery and handover, with Portable Office Cabin managing each stage for convenient execution.
        </p>
        <div className="space-y-4">
          {[
            { step: "1. Planning", desc: "Site survey, layout finalization, structural design, and BOQ approval with client (1–3 days)" },
            { step: "2. Fabrication", desc: "Cutting, welding, panel manufacturing, and pre-assembly quality checks at factory (1–3 weeks)" },
            { step: "3. On-Site Erection", desc: "Foundation prep, steel framework, panel fixing, roof installation, doors/windows, plumbing, and electrical works" },
            { step: "4. Testing & Handover", desc: "Electrical and sanitary fixtures testing, finishing, cleaning, and inspection before workers move in" },
          ].map((item) => (
            <div key={item.step} className="bg-card rounded-xl p-5 border border-border">
              <h3 className="font-semibold text-foreground mb-1">{item.step}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-accent/10 rounded-xl p-6 mt-6">
          <p className="text-foreground font-semibold mb-1">Typical Timelines</p>
          <p className="text-muted-foreground text-sm">
            50–80 workers in 1–2 weeks after material reaches site; 200–300 workers in 3–4 weeks; weather and foundation prep can affect schedules.
          </p>
        </div>
      </section>

      {/* Sustainability */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Sustainability and Environmental Benefits
        </h2>
        <p className="text-muted-foreground mb-6">
          Prefabricated hutments support greener construction and ESG goals for developers and contractors working in India's evolving regulatory environment.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Leaf, title: "Reduced Waste", desc: "Controlled factory production generates under 5% material waste versus 15–20% in conventional builds" },
            { icon: Zap, title: "Energy Efficient", desc: "Insulated panels and LED lighting reduce power consumption 25–40%; solar integration possible for lighting and fans" },
            { icon: Building2, title: "Less Site Disturbance", desc: "Smaller on-site footprint, reduced dust and noise, shorter heavy-vehicle movements" },
            { icon: RotateCcw, title: "Reusability", desc: "Multiple project deployments cut repetitive raw material usage and lower embodied carbon over time" },
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

      {/* Experience and Expertise */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Experience and Expertise in Prefabricated Solutions
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          With years of experience serving India's leading construction and infrastructure development projects, Portable Office Cabin has become a trusted name in prefabricated labour hutments and modular building solutions. Our team of experts collaborates closely with clients to understand their specific requirements, ensuring that every prefabricated structure is tailored to the unique demands of each site and industry.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          All our prefabricated labor hutments are constructed off site in controlled environments using high quality materials, which guarantees consistent quality and rapid installation at your desired location. This off-site manufacturing approach not only speeds up project timelines but also minimizes disruption at the construction site, allowing your operations to continue smoothly.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We prioritize compliance with safety regulations and use weather resistant materials to ensure long-term durability, even in challenging environments. Our solutions are designed to be cost effective, supporting your workforce with reliable, comfortable accommodation that stands up to daily use and harsh conditions.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          At Portable Office Cabin, our focus is on delivering high quality, durable prefabricated structures that meet the evolving needs of our clients. From initial consultation to final installation, we work hard to provide exceptional customer service and ensure that every project is completed to the highest standards. Our expertise in prefabricated labour hutments and modular solutions makes us the partner of choice for businesses seeking efficient, tailored, and sustainable accommodation for their workforce across India and beyond.
        </p>
      </section>

      {/* Why Choose Us */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Choose Portable Office Cabin for Labor Hutments
        </h2>
        <p className="text-muted-foreground mb-6">
          Portable Office Cabin has established expertise in prefabricated and modular solutions including labor hutments, container offices, portable toilets, rooftop sheds, and prefab buildings across India.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Experience", desc: "Operating since the early 2010s with projects delivered across multiple Indian states for diverse industries" },
            { title: "End-to-End Capability", desc: "Design, fabrication, transportation, installation, and maintenance support as a single supplier" },
            { title: "Quality and Customization", desc: "Focus on high quality materials, workmanship, and tailored solutions for EPC contractors, developers, and PSU tenders" },
            { title: "Service and Support", desc: "Responsive pre-sales assistance, site visits, and after-sales support for modifications, relocations, or repairs" },
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
          Ready to Discuss Your Workforce Accommodation?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Share your layout requirements or worker strength with our team for a customized prefabricated labor hutments proposal. Contact Portable Office Cabin via phone, email, or the enquiry form at portableofficecabin.com to work hard together on your perfect solution.
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
