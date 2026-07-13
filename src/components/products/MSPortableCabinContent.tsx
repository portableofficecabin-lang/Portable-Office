import Link from "next/link";
import {
  Bath,
  BedDouble,
  Blend,
  Building,
  CheckCircle,
  DoorOpen,
  Factory,
  Flame,
  GraduationCap,
  HardHat,
  Home,
  IndianRupee,
  Layers3,
  Paintbrush,
  Phone,
  ShieldCheck,
  Store,
  TentTree,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const advantages = [
  "Speed: Ready-to-use cabins arrive at your site, eliminating months of construction time",
  "Portability: Relocate the same cabin multiple times across project sites",
  "Durability: 15–20+ year lifespan with basic maintenance",
  "Customisation: Interior layouts, finishes and services tailored to your requirements",
  "Cost efficiency: Lower capital expenditure compared to permanent structures",
];

const materialComparison = [
  {
    title: "MS (Mild Steel) cabins",
    description:
      "Strongest and most cost-effective option for most applications. Best for heavy-duty use, frequent relocation and rough site conditions. Requires periodic repainting for corrosion protection.",
  },
  {
    title: "GI (Galvanised Iron) cabins",
    description:
      "Pre-coated zinc layer improves corrosion resistance and reduces repainting needs. Better for coastal and high-humidity locations, usually at a slightly higher cost.",
  },
  {
    title: "FRP cabins",
    description:
      "Lightweight and corrosion resistant. Best suited for portable toilets and compact kiosks where structural demands are lower than office or accommodation cabins.",
  },
];

const buildSystem = [
  "Structural frame: MS C-channel or RHS tubes forming the primary skeleton",
  "Wall panels: 1–2 mm MS sheets externally with 30–50 mm insulated core",
  "Roof construction: Sloping or flat MS roof panels with insulation and waterproof membrane",
  "Doors and windows: Steel or aluminium section doors with aluminium sliding windows and tinted glass",
  "Flooring: 18 mm cement board or plywood with vinyl or epoxy finish",
  "Services: Pre-wired electrical points, LED lighting, AC provision, and plumbing where required",
];

const keyFeatures = [
  {
    icon: Paintbrush,
    title: "Weather and environmental resistance",
    description:
      "Epoxy zinc phosphate primer with PU top coat helps MS cabins withstand monsoon rain, summer heat, dust, and everyday job-site wear across most Indian regions.",
  },
  {
    icon: Wrench,
    title: "Durability and lifespan",
    description:
      "A well-maintained mild steel portable cabin typically delivers 15–20+ years of service and tolerates repeated relocation without structural compromise.",
  },
  {
    icon: Blend,
    title: "Aesthetic and functional flexibility",
    description:
      "Choose custom colours, ACP cladding, tinted glazing, branded graphics, interior upgrades, and layout changes to suit office, security, or accommodation use.",
  },
  {
    icon: Flame,
    title: "Operational essentials",
    description:
      "Insulation, sound reduction, secure entry, ventilation, concealed electrical systems, and optional fire-safety treatments make cabins practical for real daily use.",
  },
];

const sizeExamples = [
  {
    size: "8’ x 20’ x 8.5’",
    area: "160 sq ft",
    use: "2–4 person site office, QC room, or compact meeting space",
  },
  {
    size: "10’ x 20’ x 8.5’",
    area: "200 sq ft",
    use: "Project manager office for 4–6 people with AC provision and optional attached toilet",
  },
  {
    size: "20’ x 10’ x 8.5’",
    area: "200 sq ft",
    use: "Luxury office or premium staff accommodation cabin",
  },
  {
    size: "40’ x 10’ x 8.5’",
    area: "400 sq ft",
    use: "Large office, training room, or bunk house for 8–12 workers",
  },
];

const technicalSpecs = [
  ["Frame material", "MS C-channel 75x40 mm or RHS 50x50x3 mm"],
  ["Wall panels", "MS sheet (1.5–2 mm) + 50 mm PUF/glass wool insulation"],
  ["Roof type", "Sloping MS roof with 50 mm insulation and EPDM waterproofing"],
  ["Flooring", "18 mm cement board + 2 mm vinyl sheet"],
  ["Windows", "Aluminium sliding 3’ x 4’ with tinted glass"],
  ["Door", "MS flush door 3’ x 7’ with hardware"],
  ["Electrical", "6–10 points per 200 sq ft, MCB board, LED lights"],
  ["Paint system", "Epoxy zinc phosphate primer + PU top coat"],
];

const cabinTypes = [
  { icon: Building, title: "MS Portable Office Cabin", desc: "For construction sites, temporary offices, project management centres, and sales offices." },
  { icon: HardHat, title: "MS Portable Site Office Cabin", desc: "Rugged layouts for infrastructure and construction environments with durable finishes." },
  { icon: BedDouble, title: "Staff & Labour Accommodation Cabin", desc: "Bunk houses and worker housing layouts with ventilation and utility planning." },
  { icon: ShieldCheck, title: "Security / Guard Cabin", desc: "Compact visibility-focused units for gates, entrances, and checkpoint operations." },
  { icon: Bath, title: "Portable Toilets & Washroom Blocks", desc: "Single-unit to multi-seater sanitation cabins with plumbing integration." },
  { icon: GraduationCap, title: "Classroom & Training Cabins", desc: "Portable education and training spaces with lighting, ventilation, and acoustic comfort." },
  { icon: Store, title: "Shop, Kiosk & Café Cabins", desc: "Retail, pantry, ticket counter, and food-service cabins with custom fronts." },
  { icon: Home, title: "Rooftop Shed Cabins", desc: "Lightweight office or storage solutions designed for terrace installation." },
];

// Size reference only — no price column. The cabin sold on this page has one fixed,
// GST-inclusive price (shown in the header above), so publishing ranges beside it would
// contradict the cart, the JSON-LD offer and the Merchant Center feed.
const cabinTypeRows = [
  ["Basic security cabin", "4’ x 4’"],
  ["Standard security cabin", "6’ x 6’"],
  ["Basic office cabin", "8’ x 10’"],
  ["Standard office cabin", "10’ x 20’"],
  ["Enhanced office cabin", "10’ x 30’"],
  ["Large staff / bunk cabin", "40’ x 10’"],
];

const industries = [
  { icon: HardHat, title: "Construction & Infrastructure", desc: "Site offices, labour colonies, QC labs, and equipment shelters." },
  { icon: Factory, title: "Manufacturing & Warehousing", desc: "Security cabins, temporary admin offices, canteens, and visitor points." },
  { icon: GraduationCap, title: "Education", desc: "Portable classrooms, exam centres, training rooms, and admin cabins." },
  { icon: TentTree, title: "Healthcare & Emergency", desc: "Temporary clinics, vaccination booths, waiting zones, and triage cabins." },
  { icon: Store, title: "Retail & Food Service", desc: "Portable shops, cafés, kiosks, and ticket counters." },
  { icon: Warehouse, title: "Government, Utilities & Remote Ops", desc: "Checkpoint cabins, field offices, crew accommodation, and maintenance shelters." },
];

const faqs = [
  {
    q: "What is an MS portable cabin?",
    a: "An MS portable cabin is a factory-built relocatable structure made with a mild steel frame and insulated wall and roof systems. It is transported to site ready for quick installation and immediate use.",
  },
  {
    q: "How long does an MS portable cabin last?",
    a: "With quality fabrication and periodic repainting, most MS portable cabins deliver 15–20+ years of service, even when shifted between multiple sites over their lifespan.",
  },
  {
    q: "What sizes are commonly available?",
    a: "Common sizes include 8x20 ft, 10x20 ft, 10x30 ft, and 40x10 ft. Custom lengths and widths are also possible depending on transport limitations and use case.",
  },
  {
    q: "Are MS cabins better than GI or FRP cabins?",
    a: "MS cabins are usually the strongest and most cost-effective for offices, security cabins, and accommodation. GI is better for corrosion-prone locations, while FRP suits lightweight toilet or kiosk use cases.",
  },
  {
    q: "How fast can installation happen on site?",
    a: "Most single cabins can be placed and made operational the same day they arrive, provided the site is level and service connection points are ready.",
  },
  {
    q: "What information is needed for an accurate quote?",
    a: "You should share required size, quantity, usage type, occupancy, site location, timeline, duration of use, and any special needs like attached toilets, premium finishes, or extra insulation.",
  },
];

export function MSPortableCabinContent() {
  return (
    <div className="space-y-14">
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-accent" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Portable Cabins</span>
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            MS Portable Cabins: Complete Guide to Mild Steel Portable Cabins in India (2024–2025)
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The Indian construction and infrastructure sector adopted MS portable cabins because they solve a real problem fast: creating durable offices, accommodation, security points, classrooms, and sanitation blocks without waiting months for conventional construction.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Portable Office Cabin, established in 2014, manufactures and supplies MS portable cabins, container offices, and prefab buildings for both B2B and B2C requirements across India. This guide explains what an MS portable cabin is, typical sizes, major applications, and how MS compares with GI, FRP, and shipping container conversions.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {advantages.map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
              <CheckCircle className="mb-2 h-5 w-5 text-accent" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">What is an MS Portable Cabin?</h2>
        <p className="leading-relaxed text-muted-foreground">
          An MS portable cabin is a relocatable prefabricated structure built with a mild steel frame, insulated wall and roof systems, factory-finished interiors, and ready-to-connect services. It offers the right balance of strength, fabrication ease, portability, and cost-efficiency for Indian construction, industrial, educational, and commercial projects.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {materialComparison.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-secondary p-5">
              <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">How the build system typically works</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {buildSystem.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Key Features of MS Portable Cabins</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {keyFeatures.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-3">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Thermal insulation: 25–50 mm glass wool or rock wool",
            "Sound reduction for office and classroom comfort",
            "Steel doors with secure locking hardware",
            "Concealed wiring with modular switches and MCB boards",
          ].map((item) => (
            <div key={item} className="rounded-xl bg-accent/5 p-4 text-sm font-medium text-foreground">{item}</div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">MS Portable Cabin Specifications (Standard Sizes & Materials)</h2>
        <p className="leading-relaxed text-muted-foreground">
          Portable Office Cabin typically offers dimensions that balance usable floor area with transport practicality. Standard lengths usually include 8 ft, 10 ft, 20 ft, 30 ft, and 40 ft, with widths of 8 ft or 10 ft and an overall height close to 8.5 ft.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {sizeExamples.map((item) => (
            <div key={item.size} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">{item.size}</h3>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{item.area}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.use}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              {technicalSpecs.map(([label, value], index) => (
                <tr key={label} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-5 py-4 font-medium text-foreground">{label}</td>
                  <td className="px-5 py-4 text-muted-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Types of MS Portable Cabins Offered</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cabinTypes.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <item.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-border bg-secondary p-6 md:p-8">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">MS Portable Cabins vs Other Materials</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">MS vs GI</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              MS cabins are usually 15–20% more economical than GI versions for similar layouts. GI performs better in coastal and high-humidity conditions, while MS remains the practical value choice for most inland projects.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">MS vs FRP</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              FRP is lighter and corrosion resistant, but it does not match the structural strength and impact resistance of mild steel for offices, security cabins, and accommodation blocks.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">MS vs container conversion</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Converted shipping containers are strong but width-limited. Purpose-built MS cabins allow more layout freedom, easier window placement, and 10 ft width options for more usable interiors.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Design, Customisation and Interior Options</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Layers3 className="mb-3 h-5 w-5 text-accent" />
            <h3 className="mb-2 font-semibold text-foreground">Layout customisation</h3>
            <p className="text-sm text-muted-foreground">Partitions, attached toilets, pantry zones, meeting rooms, storage areas, and multi-cabin combinations.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <DoorOpen className="mb-3 h-5 w-5 text-accent" />
            <h3 className="mb-2 font-semibold text-foreground">Service integration</h3>
            <p className="text-sm text-muted-foreground">Higher electrical loads, data cabling, AC drain routing, extra insulation, and upgraded glazing for climate and use-case performance.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Paintbrush className="mb-3 h-5 w-5 text-accent" />
            <h3 className="mb-2 font-semibold text-foreground">Exterior branding</h3>
            <p className="text-sm text-muted-foreground">Corporate colours, signage, ACP façades, glass fronts, canopies, and custom graphic finishes for retail or executive presentation.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <IndianRupee className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Price & Standard Cabin Types</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          The MS portable cabin listed on this page is sold at the single price shown at the top, inclusive of 18% GST. Transport and optional installation are calculated at checkout from your delivery pincode. The table below is a size reference for the standard cabin types we build — other sizes and finishes are made to order and quoted separately.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Cabin type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Size</th>
              </tr>
            </thead>
            <tbody>
              {cabinTypeRows.map(([type, size], index) => (
                <tr key={type} className={index % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="px-5 py-4 font-medium text-foreground">{type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Installation, Transport and Site Requirements</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Level, compacted ground or simple concrete block supports",
            "Truck access with checked turning radius and overhead clearance",
            "Electrical, water, and sewage points ready before delivery",
            "Crane or hydra access for unloading and positioning",
            "Most single units can be installed and made operational the same day",
            "Integral lifting points allow repeated relocation across sites",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Industries and Applications Using MS Portable Cabins</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <item.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Why Choose Portable Office Cabin?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "In-house design and fabrication for better quality control",
            "Strong material and component standards across fabrication, insulation, and electrical systems",
            "Custom engineering support for complex layouts and multi-cabin projects",
            "Single-source execution from design through delivery and installation guidance",
            "Support for single-unit requirements and full labour colony deployments",
            "Pan-India supply approach for construction, education, corporate, and government buyers",
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm text-muted-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How to Get a Quotation or Technical Consultation</h2>
        <p className="leading-relaxed text-muted-foreground">
          For an accurate quotation, share the required size, quantity, usage, occupancy, site location, project timeline, expected duration of use, and any special requirements such as toilets, extra insulation, premium finishes, or branding. That helps the team recommend the right cabin specification instead of a generic estimate.
        </p>
        <div className="rounded-2xl bg-accent/10 p-6">
          <h3 className="mb-3 font-semibold text-foreground">Best information to share upfront</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Required dimensions and quantity",
              "Usage: office, security, accommodation, toilet, or classroom",
              "City / district for delivery",
              "Expected installation date",
              "Temporary or semi-permanent project duration",
              "Budget range and finish expectations",
            ].map((item) => (
              <div key={item} className="flex gap-2 text-sm text-foreground">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.q} value={`ms-portable-faq-${index}`}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-3xl bg-accent/10 p-8 text-center md:p-10">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Get the Best Quote for Your MS Portable Cabin</h2>
        <p className="mx-auto mb-6 max-w-3xl text-muted-foreground">
          Share your layout, size, location, and timeline to get a tailored proposal for office cabins, security cabins, accommodation blocks, toilet cabins, or complete labour colony setups.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/contact" className="inline-flex items-center justify-center rounded-lg bg-accent px-8 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent/90">
            Request a Quote
          </Link>
          <a href="tel:+919731897976" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-8 py-3 font-semibold text-foreground transition-colors hover:bg-muted">
            <Phone className="h-4 w-4" />
            Call Us Now
          </a>
        </div>
      </section>
    </div>
  );
}
