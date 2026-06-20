import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Calendar, ChevronRight, CheckCircle, Clock, Shield, IndianRupee, Wrench, Building2, Users, Factory, Truck, HardHat } from "lucide-react";
import labourShedSteelFrame from "@/assets/blog/labour-shed-steel-frame-construction.webp";
import prefabLabourColonyAerial from "@/assets/blog/prefab-labour-colony-aerial-view.webp";
import modularLabourCamp from "@/assets/blog/modular-labour-accommodation-camp.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many workers can be accommodated in a typical prefabricated labour shed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Capacity scales modularly based on project requirements. Individual dormitory rooms commonly house 8–12 workers depending on layout and bed configuration. These standardized rooms combine to create colonies accommodating 50, 100, 300, or even 1,000+ workers through repeated dormitory blocks."
      }
    },
    {
      "@type": "Question",
      name: "What is the usual lifespan of a prefab labour shed structure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Steel-frame prefabricated labour sheds with quality panels can serve 8–15 years or more with proper maintenance. Regular painting protects exterior surfaces. Sealant checks prevent water infiltration. Minor repairs address wear from daily use."
      }
    },
    {
      "@type": "Question",
      name: "Do prefabricated labour sheds require building approvals or permissions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Approval requirements vary by jurisdiction. Many municipalities and industrial townships require layout drawings, fire-safety clearances, and documentation demonstrating compliance with basic welfare provisions—even for temporary camps."
      }
    },
    {
      "@type": "Question",
      name: "Can prefab labour sheds include amenities like kitchens, canteens, and first‑aid rooms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Labour colonies readily integrate specialized prefab units for comprehensive site facilities including kitchen blocks, dining halls, first-aid rooms, store rooms, and office cabins—all as prefabricated units."
      }
    },
    {
      "@type": "Question",
      name: "What information is needed to get a quotation for a labour shed project?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Accurate quotations require worker headcount, usage period, site details, specification level, required facilities, and target timeline. Once shared, Portable Office Cabin develops a concept layout with per-square-foot rates and delivery schedules."
      }
    }
  ]
};

const articleStructuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Labour Shed Prefabricated Structures – Complete Guide",
  description: "Comprehensive guide on prefabricated labour sheds for construction sites in India. Learn about design, benefits, installation, and customization options.",
  image: "https://portableofficecabin.com/blog/labour-shed-steel-frame-construction.png",
  author: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    url: "https://portableofficecabin.com",
    sameAs: [
      "https://www.linkedin.com/company/portable-office-cabin",
      "https://www.facebook.com/portableofficecabin",
      "https://www.indiamart.com/portable-office-cabin/"
    ]
  },
  publisher: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    logo: { "@type": "ImageObject", url: "https://portableofficecabin.com/logo.jpeg" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-9731897976",
      contactType: "sales",
      areaServed: "IN"
    }
  },
  datePublished: "2025-01-15",
  dateModified: "2026-02-27",
  mainEntityOfPage: "https://portableofficecabin.com/blog/labour-shed-prefabricated-structures"
};

export default function LabourShedPrefabricatedStructures() {
  return (
    <Layout>
      <JsonLd data={[faqStructuredData, articleStructuredData]} />

      {/* Breadcrumb */}
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Labour Shed Prefabricated Structures</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/products" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            View Our Products
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
            Labour Shed Prefabricated Structures
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-3xl">
            Factory-made, quickly installed worker accommodations for Indian construction and infrastructure projects — installed in 10–30 days.
          </p>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="py-12 bg-accent/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card rounded-xl border p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-accent" />
              Key Takeaways
            </h2>
            <ul className="space-y-4">
              {[
                "Prefabricated labour sheds are factory-made, quickly installed worker accommodations widely used on Indian construction and infrastructure projects since around 2010.",
                "Portable Office Cabin designs and manufactures complete prefab labour colonies—including sleeping blocks, toilets, canteens, and first-aid rooms—that can be installed in 10–30 days depending on capacity.",
                "Contractors benefit from 40–60% faster deployment compared to traditional brick structures, predictable per-square-foot pricing, reusability across multiple sites, and built-in compliance with basic welfare norms and IS codes.",
                "Labour sheds are constructed using durable PUF/EPS insulated panels and galvanized steel frames, engineered for Indian climates ranging from 45°C heat to heavy monsoon rains, with 8–15+ years of service life.",
                "Portable Office Cabin serves both B2B clients and government tenders across India, offering comprehensive prefab building solutions including labour accommodation, site offices, container toilets, and complete modular building projects."
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <article className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">

            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Introduction to Labour Shed Prefabricated Structures</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Labour shed prefabricated structures have transformed how construction companies approach worker accommodation on large-scale projects. These modular, factory-built dormitory and amenity blocks arrive at project sites ready for quick installation, eliminating weeks of on-site masonry work and enabling contractors to house their workforce faster than ever before.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The demand for prefabricated labour sheds has grown significantly across India since the early 2010s. Heavy infrastructure projects—highways connecting major cities, metro rail networks in urban centers, sprawling industrial parks, and massive residential townships—all require thousands of workers who need safe, temporary accommodation close to the building site. Traditional construction methods simply cannot keep pace with the rapid mobilization timelines these projects demand. Prefabricated buildings are often more cost-effective than traditional construction due to reduced labor and material waste.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Portable Office Cabin operates as an India-based manufacturer and supplier specializing in prefab labour colonies, container offices, and portable toilets. The company serves both private developers undertaking commercial buildings and retail spaces, as well as government EPC contractors executing public infrastructure works. This practical, project-focused approach has made prefabricated solutions the go-to choice for construction industry professionals seeking reliable worker housing.
              </p>
              <div className="bg-accent/10 p-6 rounded-xl border border-accent/30 my-6">
                <p className="text-muted-foreground leading-relaxed">
                  <Link href="/" className="text-accent font-bold hover:underline">Portable Office Cabin</Link> is a trusted manufacturer and supplier of high-quality portable cabins, container offices, and prefab modular structures in India. The company delivers modern, durable, and cost-effective workspace solutions designed to meet the evolving needs of construction sites, industrial projects, commercial developments, and institutional facilities. With a strong focus on quality materials, smart design, and timely delivery, Portable Office Cabin helps businesses create functional spaces quickly and efficiently.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed italic bg-secondary/50 p-4 rounded-lg border-l-4 border-accent">
                The quality of prefabricated buildings is often higher due to controlled manufacturing environments.
              </p>

              {/* Image 1 - Steel frame construction */}
              <figure className="my-8">
                <OptimizedImage
                  src={resolveImageUrl(labourShedSteelFrame)}
                  alt="Galvanized steel frame construction for prefabricated labour shed at industrial project site in India"
                  productName="Labour Shed Steel Frame Construction"
                  aspectRatio="video"
                  className="rounded-xl"
                />
                <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
                  Galvanized steel frame erection for a prefabricated labour shed — factory-manufactured components enable rapid on-site assembly
                </figcaption>
              </figure>
            </section>

            {/* What Are Prefabricated Labour Sheds */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">What Are Prefabricated Labour Sheds?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Prefabricated labour sheds represent a fundamental shift in how worker accommodation is constructed. Rather than building structures brick-by-brick on site, these modular buildings are manufactured off site in a controlled environment, then transported and assembled on site using bolted connections and standardized components.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The core elements of any prefabricated shed include steel frames that form the structural skeleton, insulated wall panels providing thermal comfort and durability, roof panels engineered for weather resistance, plus doors, windows, and internal partitions. All these prefabricated components are precision-manufactured in a factory setting before being shipped to the project location.
              </p>

              <div className="bg-secondary/50 rounded-xl p-6 my-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Typical Configurations Include:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "6–12 bed dormitory rooms",
                    "Double-storey bunk blocks",
                    "Dining halls for communal meals",
                    "Recreation rooms",
                    "Toilet and bathroom facilities",
                    "Supervisor cabins"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed mb-4">
                The difference between prefab labour sheds and traditional masonry labour camps becomes clear when examining the construction process. Masonry camps require weeks of foundation work, material sourcing, skilled bricklayers, curing time, and finishing—all happening sequentially on site. Prefabricated structures flip this model: while foundation work proceeds at the building site, wall panels and steel frames are simultaneously manufactured at the factory. When components arrive, assembly takes days rather than weeks.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Delivery happens in two primary formats. <strong>Knocked-down (KD) panel kits</strong> contain all structural elements, panels, and fasteners packed flat for efficient transport by truck. Alternatively, <strong>converted shipping containers</strong> arrive as near-complete units requiring minimal on-site work. Both formats enable delivery to remote locations across states like Maharashtra, Gujarat, Karnataka, and NCR.
              </p>

              {/* Image 2 - Aerial view of labour colony */}
              <figure className="my-8">
                <OptimizedImage
                  src={resolveImageUrl(prefabLabourColonyAerial)}
                  alt="Aerial view of prefabricated labour colony with modular worker accommodation units at construction site in India"
                  productName="Prefab Labour Colony Aerial View"
                  aspectRatio="video"
                  className="rounded-xl"
                />
                <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
                  Aerial view of a fully deployed prefabricated labour colony — modular dormitory blocks arranged for efficient site operations
                </figcaption>
              </figure>
            </section>

            {/* Core Benefits */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Core Benefits of Prefabricated Labour Sheds</h2>

              {/* Benefit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                  { icon: Clock, title: "40–60% Faster Deployment", desc: "Parallel work streams cut installation from 45–60 days to 10–15 days for a 100-worker camp." },
                  { icon: IndianRupee, title: "Predictable Pricing", desc: "Per-square-foot rates enable accurate budgeting. 20–30% less material wastage than traditional methods." },
                  { icon: Shield, title: "Quality Assurance", desc: "Factory-controlled manufacturing ensures consistent quality impossible to achieve on outdoor sites." },
                  { icon: Wrench, title: "Flexible & Reusable", desc: "Modular design supports expansion, reconfiguration, and relocation across multiple project sites." }
                ].map((item, i) => (
                  <div key={i} className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
                    <item.icon className="h-8 w-8 text-accent mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">Time Savings Through Parallel Work Streams</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Off-site fabrication fundamentally changes project scheduling. While traditional brick construction requires sequential steps—pour foundation, cure, lay bricks, cure again, plaster, finish—prefab construction enables parallel work streams. The factory manufactures panels and frames while site teams prepare foundations. This overlap cuts deployment time dramatically.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Consider a practical example: installing a 100-worker camp using prefab methods typically requires 10–15 days from foundation completion to move-in readiness. The same capacity using traditional brick construction demands 45–60 days minimum, often extending longer due to weather delays or material shortages.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Cost Effectiveness and Budget Predictability</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Labour costs on construction sites represent one of the largest variable expenses. Prefabricated structures slash these costs by shifting most work to the factory, where skilled professionals work with proper tools and equipment. Fewer workers are needed on site, and those present focus on assembly rather than complex construction tasks.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Material wastage drops significantly when components are manufactured in controlled environments. Factory production allows precise cutting and efficient use of raw materials, reducing the scrap that accumulates with traditional field construction. Many contractors report 20–30% reductions in material wastage compared to brick-built alternatives.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Quality Assurance and Worker Comfort</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Factory manufacturing enables quality assurance processes impossible to replicate on construction sites. Every panel passes inspection before shipping. Welds receive proper verification. Finishes meet consistent standards. The result: structures that arrive at site matching specifications exactly.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Worker comfort improves substantially with prefab accommodation. PUF and EPS insulated panels provide superior thermal insulation compared to single-skin brick walls, creating a more comfortable environment even in extreme temperatures. Better acoustic insulation means quieter rest periods.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Safety and Compliance Advantages</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Modern prefab labour sheds incorporate safety features that align with regulatory requirements and audit expectations. Fire-rated panel options provide enhanced protection. Electrical systems route through proper conduits rather than improvised site wiring. Clear circulation corridors facilitate emergency evacuation.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Flexibility and Scalability</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Project manpower rarely stays constant. Initial earthwork phases might require 100 workers, peak structural work demands 500, and finishing phases scale back down. Prefab labour sheds accommodate this reality through modular design that supports expansion and reconfiguration.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Adding capacity means ordering additional modules. Reducing capacity involves dismantling and storing units for future use—or relocating them to other sites entirely. Multi-storey configurations (G+1 or G+2 stacking) maximize worker capacity when plot area is constrained.
              </p>
            </section>

            {/* Design & Construction Features */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Design & Construction Features of Portable Office Cabin Labour Sheds</h2>

              <h3 className="text-xl font-semibold text-foreground mb-3">Structural System and Framework</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The foundation of every Portable Office Cabin labour shed is a galvanized steel framework designed for strength and longevity. Galvanization provides crucial protection against corrosion—essential given India's humid monsoon conditions and coastal project environments. Bolted connections enable quick installation while maintaining structural integrity, and the entire frame system is engineered to meet wind load and seismic requirements applicable across Indian zones.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Panel Options and Insulation</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wall and roof panels represent critical elements determining both comfort and durability. Portable Office Cabin offers EPS (expanded polystyrene) and PUF (polyurethane foam) insulated sandwich panels as primary options. Both provide excellent thermal insulation—essential for maintaining a comfortable living space when external temperatures reach 45°C or plunge during winter nights in northern India. Pre-coated GI sheets form the exterior and interior faces, with color-coated options available.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The insulation layer serves multiple purposes beyond temperature control. It dampens external noise from ongoing construction activities, contributing to better rest for workers. It also resists moisture penetration, preventing mold and degradation issues common in poorly-constructed site accommodation.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Interior Planning and Layout</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Interior layouts balance worker comfort against space efficiency. Dormitory rooms typically feature bunk bed arrangements optimized for target occupancy—whether 6, 8, 10, or 12 workers per room. Circulation corridors provide clear pathways compliant with fire safety requirements, and internal partitions create separation between sleeping areas, storage zones, and common spaces.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Building Services Integration</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Electrical systems in prefab labour sheds receive proper engineering rather than the improvised wiring common in ad-hoc camps. Distribution boards serve defined zones, LED lighting provides energy efficiency, and ceiling fans ensure air circulation in warm conditions. Plumbing lines connect to water supply systems and drain to septic tanks or STPs depending on project scale.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Durability Features for Indian Conditions</h3>
              <p className="text-muted-foreground leading-relaxed">
                Anti-corrosion coatings protect exposed metal components from rust, particularly important in coastal areas. Waterproof roofing details and properly engineered guttering handle monsoon rains. Flooring options range from cement fibre boards to vinyl or tile finishes depending on budget and project duration. All options prioritize longevity and weather-resistant performance.
              </p>
            </section>

            {/* Applications */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Applications of Prefabricated Labour Sheds</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { icon: HardHat, title: "Infrastructure Projects", desc: "Highways, metro rail, bridges, airports — mobile accommodation that relocates as work fronts advance." },
                  { icon: Factory, title: "Industrial Plants", desc: "Steel plants, cement factories, automotive facilities — meeting corporate safety and quality standards." },
                  { icon: Building2, title: "Residential & Commercial", desc: "Large housing projects and commercial developments with scalable workforce accommodation." }
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/50 rounded-xl p-6 text-center">
                    <item.icon className="h-10 w-10 text-accent mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">Complete Site Solutions</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Consider a typical 300–500 worker camp for a highway construction package. The complete solution extends far beyond dormitory rooms. Kitchen facilities prepare meals for the entire workforce. Dining halls provide covered eating space. First-aid rooms address medical needs. Store rooms secure tools and equipment. Supervisor cabins house site management.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Portable Office Cabin supplies all these elements as prefabricated units, creating integrated camps where every function—from sleeping to eating to working—operates from purpose-designed modular structures.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Beyond Construction Workers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Prefab accommodation serves diverse populations beyond construction laborers. Staff housing for project engineers and managers often utilizes enhanced-specification prefab units. Driver rest rooms at logistics facilities provide comfortable break spaces. Seasonal migrant workers in agro-processing or warehouse operations benefit from temporary housing that can be deployed during peak seasons.
              </p>

              {/* Image 3 - Modular labour accommodation camp */}
              <figure className="my-8">
                <OptimizedImage
                  src={resolveImageUrl(modularLabourCamp)}
                  alt="Multi-storey modular labour accommodation camp with prefabricated worker housing units at infrastructure project site in India"
                  productName="Modular Labour Accommodation Camp"
                  aspectRatio="video"
                  className="rounded-xl"
                />
                <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
                  Multi-storey prefabricated labour camp — scalable modular accommodation for large infrastructure projects
                </figcaption>
              </figure>
            </section>

            {/* Customization Options */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Customization Options</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Portable Office Cabin approaches each project as a unique challenge requiring tailored solutions. Rather than offering a one-size-fits-all layout, the company customizes designs based on manpower requirements, site constraints, climate conditions, and specific safety requirements.
              </p>

              <div className="space-y-6">
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Layout Configuration</h3>
                  <p className="text-muted-foreground text-sm">Single-row, double-row, or G+1 stacking arrangements. Separate blocks for families and single workers with appropriate privacy. Dedicated kitchen, dining, and recreation areas.</p>
                </div>
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Specification Variations</h3>
                  <p className="text-muted-foreground text-sm">Basic to premium finishes. Variable wall thickness for insulation needs. Single-slope or double-slope roofing. Cement fibre, vinyl, or tile flooring options.</p>
                </div>
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Climate-Specific Engineering</h3>
                  <p className="text-muted-foreground text-sm">Hot regions: extended roof overhangs, ridge ventilators. Heavy-rain zones: steeper pitches, enhanced guttering. Coastal: superior anti-corrosion coatings. Cold regions: enhanced insulation, double-glazed windows.</p>
                </div>
                <div className="border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Branding & Compliance</h3>
                  <p className="text-muted-foreground text-sm">Company branding, safety signage, fire-fighting points, CCTV provisions, and first-aid stations for audit compliance with corporate and PSU standards.</p>
                </div>
              </div>
            </section>

            {/* Installation & Timelines */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Installation, Relocation & Project Timelines</h2>

              <div className="bg-card rounded-xl border p-6 md:p-8 mb-8 shadow-sm">
                <h3 className="text-xl font-semibold text-foreground mb-6">Indicative Installation Timelines</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { workers: "50 Workers", days: "5–7 Days", icon: "🏗️" },
                    { workers: "200 Workers", days: "10–15 Days", icon: "🏘️" },
                    { workers: "500+ Workers", days: "3–5 Weeks", icon: "🏙️" }
                  ].map((item, i) => (
                    <div key={i} className="bg-secondary rounded-xl p-6 text-center border border-border hover:shadow-md transition-shadow">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <div className="text-2xl font-bold text-accent mb-1">{item.days}</div>
                      <div className="text-sm font-medium text-muted-foreground">{item.workers}</div>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">Pre-Installation Planning</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Successful installations begin with thorough site surveys. Teams assess ground conditions, access routes for delivery vehicles, available utilities, and specific site constraints. Foundation preparation proceeds based on site conditions—from simple compacted earth to concrete plinths for longer installations.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">On-Site Assembly Process</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Assembly proceeds rapidly once components arrive. Bolted connections eliminate welding delays and enable work with basic hand tools. Small erection teams—often just 6–10 workers—handle most configurations without requiring heavy equipment. The lightweight nature of prefab components means assembly causes minimal disruption to ongoing construction work.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">Relocation Capability</h3>
              <p className="text-muted-foreground leading-relaxed">
                Relocation represents a key advantage. When project phases complete or work fronts advance, structures can be dismantled rather than demolished. Bolted connections reverse easily. Panels stack for transport. At new sites, the same components re-erect with only local foundation preparation and minor replacements—delivering significant cost savings across multi-site contractors.
              </p>
            </section>

            {/* Why Choose */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Why Choose Portable Office Cabin?</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Users, title: "Experience Since 2010s", desc: "Diverse portfolio across construction, industrial, and government projects." },
                  { icon: Factory, title: "End-to-End Capability", desc: "In-house design, manufacturing, logistics, installation, and after-sales support." },
                  { icon: Shield, title: "Quality & Sustainability", desc: "Durable steel structures, recyclable materials, waste reduction through precise manufacturing." },
                  { icon: Truck, title: "Versatile Product Range", desc: "Portable cabins, security rooms, PEB structures, canteens, container homes, toilets — all from one source." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-xl">
                    <item.icon className="h-8 w-8 text-accent shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Construction Process */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Construction Process of Prefabricated Labour Sheds</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The construction process is designed to maximize efficiency, durability, and adaptability. It begins with a detailed design phase using advanced CAD software, where the specific requirements—layout, shape, and capacity—are mapped out and optimized for both functionality and comfort.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Once the design is finalized, manufacturing takes place in a controlled factory environment. High-quality raw materials such as metal, concrete, and wood are used to construct the core components. Each component—walls, roof panels, doors, and windows—is precision-engineered to meet exact project specifications.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                After manufacturing, prefabricated components are carefully transported to the construction site. Thanks to their modular format, these elements can be moved efficiently, even to remote locations. On-site, skilled workers assemble the structure using bolted connections and standardized methods, allowing for quick installation and significantly reducing overall construction time.
              </p>
            </section>

            {/* FAQ Section */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {[
                  {
                    q: "How many workers can be accommodated in a typical prefabricated labour shed?",
                    a: "Capacity scales modularly based on project requirements. Individual dormitory rooms commonly house 8–12 workers depending on layout and bed configuration. These standardized rooms combine to create colonies accommodating 50, 100, 300, or even 1,000+ workers through repeated dormitory blocks. Portable Office Cabin designs colonies based on detailed headcount briefs from clients."
                  },
                  {
                    q: "What is the usual lifespan of a prefab labour shed structure?",
                    a: "Steel-frame prefabricated labour sheds with quality panels can serve 8–15 years or more with proper maintenance. Regular painting protects exterior surfaces. Sealant checks prevent water infiltration. Actual service life varies depending on environment—coastal areas accelerate corrosion, while projects typically use structures for 2–5 years before relocating."
                  },
                  {
                    q: "Do prefabricated labour sheds require building approvals or permissions?",
                    a: "Approval requirements vary by jurisdiction. Many municipalities require layout drawings, fire-safety clearances, and documentation demonstrating compliance with basic welfare provisions. Portable Office Cabin supplies standard drawings and technical details to support clients in obtaining necessary permissions."
                  },
                  {
                    q: "Can prefab labour sheds include amenities like kitchens, canteens, and first‑aid rooms?",
                    a: "Absolutely. Labour colonies readily integrate specialized prefab units for comprehensive site facilities. Kitchen blocks include cooking equipment provisions, exhaust ventilation, and fire suppression. Dining halls provide covered space with proper seating. First-aid rooms feature wash basins, examination areas, and power points for medical equipment."
                  },
                  {
                    q: "What information is needed to get a quotation?",
                    a: "Accurate quotations require: worker headcount and breakdown by category, usage period in months/years, site details (location, access, plot size), specification level (basic/standard/premium), required facilities (dormitories, toilets, kitchen, dining, offices, first-aid), and target timeline. Portable Office Cabin then develops a concept layout with per-square-foot rates."
                  }
                ].map((faq, i) => (
                  <div key={i} className="border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Conclusion */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Conclusion and Future Outlook</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Prefabricated labour sheds have emerged as a cost-effective, durable, and highly adaptable solution for accommodating workers across a wide range of industrial projects. Their quick installation, robust construction, and extensive customization options make them a preferred alternative to traditional construction methods. As the construction industry continues to evolve, the demand for these innovative solutions is set to rise.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Looking ahead, advancements in technology and design are expected to further elevate the functionality, durability, and visual appeal of prefabricated labour sheds. With increasing emphasis on compliance, sustainability, and cost effectiveness, these structures are poised to become the go-to choice for construction companies seeking reliable, long-lasting solutions.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                For any project requiring rapid deployment, superior durability, and flexible expansion, prefabricated labour sheds from trusted manufacturers like Portable Office Cabin remain the benchmark for quality and performance in the modern construction landscape.
              </p>
            </section>

          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Need a Labour Shed for Your Project?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Get a free consultation and customized quotation from our prefab experts. We serve projects across India with 10–30 day installation timelines.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/contact">
                <Phone className="mr-2 h-5 w-5" />
                Get Free Quote
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/book-appointment">
                <Calendar className="mr-2 h-5 w-5" />
                Book Consultation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-12 bg-secondary/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-xl font-bold text-foreground mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "Portable Cabins", slug: "portable-cabin" },
              { name: "Container Offices", slug: "container-office" },
              { name: "Porta Cabins", slug: "porta-cabin" },
              { name: "Site Office Containers", slug: "standard-site-office-container" },
              { name: "Portable Toilets", slug: "portable-toilet-cabin" },
              { name: "Security Cabins", slug: "security-cabin" }
            ].map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="flex items-center gap-2 p-3 bg-card border rounded-lg hover:border-accent hover:shadow-sm transition-all text-foreground font-medium text-sm"
              >
                <ChevronRight className="h-4 w-4 text-accent" />
                {product.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
