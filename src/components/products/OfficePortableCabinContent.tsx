import officePortableCabinMain from "@/assets/products/office-portable-cabin-main.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  CheckCircle,
  Factory,
  GraduationCap,
  HardHat,
  Leaf,
  ShieldCheck,
  Stethoscope,
  TrafficCone,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";

const switchReasons = [
  "40–60% cheaper than conventional RCC structures when civil work and approvals are included",
  "Installation completed in 1–3 days for most standard configurations",
  "Fully relocatable across project phases and new sites",
  "Compliant electrical planning with insulation and AC-ready provisions",
  "Designed for demanding Indian site conditions across heat, rain, and dust",
];

const cabinTypes = [
  "Standard MS Office Portable Cabins for site offices and field operations",
  "Container Office Cabins with finished interiors and stronger exterior shell",
  "Manager and Meeting Cabins with enhanced finishes for client-facing spaces",
  "G+1 Office Blocks for larger teams at industrial parks and infrastructure projects",
  "Combo Units combining office + toilet or office + accommodation layouts",
  "Prefab Office Complexes with passages, reception zones, and conference rooms",
];

const featureBlocks = [
  {
    title: "Core build features",
    points: [
      "MS frame built to IS standards with welded joints",
      "PUF or EPS insulated wall and roof panels",
      "Anti-rust primer and paint system for long-term protection",
      "Lifting hooks integrated into frame for crane handling",
    ],
  },
  {
    title: "Integrated utilities",
    points: [
      "Concealed electrical wiring throughout",
      "MCB distribution box for circuit protection",
      "LED light fixtures and 5-amp / 15-amp sockets",
      "Dedicated AC point with outdoor unit bracket",
    ],
  },
  {
    title: "Comfort & performance",
    points: [
      "Thermal insulation suitable for 45°C+ summers",
      "Sound reduction through insulated panel density",
      "Natural light through uPVC or aluminium windows",
      "Design life of 10–15 years with proper maintenance",
    ],
  },
];

const applicationCards = [
  {
    icon: HardHat,
    title: "Construction & infrastructure",
    description: "Project offices, billing counters, planning rooms, coordination cabins, and QC workspaces at active sites.",
  },
  {
    icon: Factory,
    title: "Industrial & warehouses",
    description: "Supervisor rooms, QC labs, weighbridge cabins, security checkpoints, and maintenance offices near operations.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Admin offices, temporary classrooms, exam control rooms, and expansion-phase teaching spaces.",
  },
  {
    icon: Stethoscope,
    title: "Healthcare",
    description: "Consultation rooms, vaccination booths, admin blocks, and emergency support spaces.",
  },
  {
    icon: Building2,
    title: "Corporate & real estate",
    description: "Sales galleries, startup offices, training cabins, and remote branch workspaces in fast-moving projects.",
  },
  {
    icon: TrafficCone,
    title: "Public sector",
    description: "Traffic posts, police cabins, field offices, and project command centres for government operations.",
  },
];

const sizeRows = [
  ["10x8 ft", "Compact single-person office or guard cabin"],
  ["20x8 ft", "Small office for 2–3 people"],
  ["20x10 ft", "Most popular site office with meeting space"],
  ["30x10 ft", "Larger office with manager cabin or meeting zone"],
  ["40x10 ft", "Full office with pantry, conference room, and multiple workstations"],
];

const faqs = [
  {
    question: "What is the typical cost of a 20x10 ft office portable cabin in 2025?",
    answer:
      "Pricing depends on panel type, fit-out level, electrical scope, and transport distance. A standard 20x10 ft MS office cabin usually falls in a project-friendly range, and the best way to price it accurately is to request a quote with your actual requirements.",
  },
  {
    question: "How long does it take to deliver and install an office portable cabin?",
    answer:
      "Most standard designs take about 2–4 weeks for manufacturing after order confirmation, while single-cabin installation is usually completed within 8–24 hours once the cabin reaches site.",
  },
  {
    question: "What kind of foundation is needed?",
    answer:
      "Single-storey office cabins usually need only a level hard surface or simple concrete or brick piers at support points. We provide guidance based on cabin size and site conditions.",
  },
  {
    question: "Can these cabins be used as permanent offices?",
    answer:
      "Yes. Although designed for portability, they also work very well as semi-permanent or permanent offices and can deliver 10–15 years or more of service with regular maintenance.",
  },
  {
    question: "Are office portable cabins suitable for heavy rain and extreme heat?",
    answer:
      "Yes. Insulated panels, sealed joints, and sloped roof construction help the cabins perform reliably during Indian summers, monsoons, and dusty project conditions.",
  },
];

export function OfficePortableCabinContent() {
  return (
    <div className="space-y-16">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Portable Cabins</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Office Portable Cabin – Fast, Flexible Workspaces by Portable Office Cabin
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            An office portable cabin is a prefabricated, self-contained workspace that arrives ready for immediate occupancy. In 2025, Indian businesses, contractors, and institutions are increasingly choosing these modular structures because they work faster, cost less, and move when the project moves.
          </p>
          <p className="text-muted-foreground">
            Portable Office Cabin delivers office cabins across Maharashtra, Gujarat, Karnataka, Tamil Nadu, and Delhi NCR for site offices, factory admin blocks, school offices, training rooms, and project command centres.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {switchReasons.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                <CheckCircle className="mb-2 h-5 w-5 text-accent" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(officePortableCabinMain)}
            alt="Office portable cabin by Portable Office Cabin installed at a live construction site in India"
            title="Office Portable Cabin by Portable Office Cabin"
            productName="Office Portable Cabin"
            aspectRatio="4/3"
            className="rounded-2xl"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Why Office Portable Cabins Are the Fast Track to Workspace in India
        </h2>
        <p className="text-muted-foreground">
          When project timelines are measured in weeks rather than months, waiting for a permanent building simply isn’t practical. Office portable cabins solve urgent space needs by delivering usable workspaces with speed, flexibility, and repeat value.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Typical delivery in 10–20 days from design approval for standard configurations",
            "Installation in 8–24 hours for units such as 20x10 ft office cabins",
            "Up to 60% lower total project cost compared to conventional construction",
            "Little to no complex foundation work for temporary deployment",
            "Built for Indian conditions across heat, rain, industrial dust, and site movement",
            "Same cabin can shift to the next project after current work concludes",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Types of Office Portable Cabins We Manufacture
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {cabinTypes.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-xl bg-card shadow-card">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Standard footprint</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Typical use</th>
              </tr>
            </thead>
            <tbody>
              {sizeRows.map(([size, use], index) => (
                <tr key={size} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{size}</td>
                  <td className="px-6 py-4 text-muted-foreground">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {featureBlocks.map((block) => (
          <div key={block.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">{block.title}</h3>
            <div className="space-y-3">
              {block.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-sm text-muted-foreground">{point}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Construction & Materials
          </h2>
          <p className="text-muted-foreground">
            Structural integrity starts with an IS-standard mild steel frame, welded joints, integrated lifting hooks, and pre-coated exterior sheets with insulated wall and roof systems. Marine plywood flooring and corrosion-resistant hardware improve durability in Indian conditions.
          </p>
          <div className="space-y-3">
            {[
              "0.4–0.5 mm pre-coated steel exterior cladding",
              "40–50 mm PUF or EPS insulation for thermal comfort",
              "18 mm marine plywood substrate with vinyl or cement board finish",
              "Corrosion-resistant fasteners and hardware for long service life",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Utilities, Interiors & MEP Integration
          </h2>
          <p className="text-muted-foreground">
            Cabins can be delivered with concealed wiring, MCB distribution, LED lighting, plug points, AC sockets, false ceilings, partitions, modular furniture, and plumbing provisions for office + toilet combinations.
          </p>
          <div className="space-y-3">
            {[
              "PVC wall panels, laminates, or painted interior finishes",
              "False ceilings with mineral fibre tiles and concealed conduits",
              "Water inlet and drainage provisions for combo units",
              "Support for rooftop solar, inverter systems, and efficient HVAC layouts",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Applications of Office Portable Cabins
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applicationCards.map((item) => (
            <div key={item.title} className="rounded-xl bg-muted/50 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <item.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Process: From Enquiry to Move-In
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p><strong className="text-foreground">Consultation:</strong> Requirements, occupant count, utilities, site access, timeline, and budget are reviewed first.</p>
            <p><strong className="text-foreground">Design & pricing:</strong> Layout drawings, doors, windows, furniture planning, and quote approval are completed before production.</p>
            <p><strong className="text-foreground">Manufacturing:</strong> Cutting, welding, panel fixing, wiring, painting, and quality checks happen in the factory.</p>
            <p><strong className="text-foreground">Delivery & installation:</strong> Trailer transport and crane placement usually make the office usable within one day for single-cabin projects.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Why Choose Portable Office Cabin
          </h2>
          <div className="mt-4 space-y-3">
            {[
              "Dedicated modular workspace manufacturer since 2010",
              "Pan-India delivery with established transport coordination",
              "Custom layouts for construction, education, manufacturing, and public-sector use",
              "After-sales support for maintenance, repair, relocation, and expansion",
              "Strong repeat business from contractors, institutions, and industrial clients",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Frequently Asked Questions About Office Portable Cabins
        </h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`office-portable-cabin-faq-${index}`}>
              <AccordionTrigger className="text-left font-display text-base text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-3xl bg-muted/50 p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Get Your Office Portable Cabin in Place Now
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
          Whether you need a single site office or a multi-cabin complex, Portable Office Cabin can deliver a fast, professional workspace that fits your budget and timeline. Share your project details and get a design suggestion and quotation within 24–48 hours.
        </p>
      </section>
    </div>
  );
}
