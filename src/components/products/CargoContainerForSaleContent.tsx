import cargoContainerMain from "@/assets/products/cargo-container-for-sale-main.webp";
import cargoContainerInspection from "@/assets/products/cargo-container-for-sale-inspection.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BadgeIndianRupee, Building2, CheckCircle2, Container, Home, PackageCheck, Truck, Warehouse } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const overviewStats = [
  {
    icon: Container,
    title: "Stocked formats",
    description: "10 ft fabricated, 20 ft GP, 30 ft custom, 40 ft GP, 40 ft HC, and reefer containers on request.",
  },
  {
    icon: BadgeIndianRupee,
    title: "2025–2026 pricing",
    description: "Used cargo-worthy units start around ₹1,25,000 for 20 ft and scale by size, grade, and yard location.",
  },
  {
    icon: Truck,
    title: "Pan-India supply",
    description: "Dispatch support from major ports and inland depots including Nhava Sheva, Mundra, Chennai, and project cities.",
  },
  {
    icon: Building2,
    title: "Conversion capability",
    description: "Single-vendor delivery for container sourcing, fabrication, interiors, utilities, transport, and installation.",
  },
];

const containerTypes = [
  {
    title: "20 ft GP",
    description: "Approx. 20 ft × 8 ft × 8 ft 6 in externally with around 33 m³ internal capacity. Best for storage, transport, and standard conversions.",
  },
  {
    title: "40 ft GP",
    description: "Approx. 40 ft × 8 ft × 8 ft 6 in externally with around 67 m³ volume. Suited for larger cargo, equipment, and roomy office layouts.",
  },
  {
    title: "40 ft HC",
    description: "Approx. 40 ft × 8 ft × 9 ft 6 in externally with around 76 m³ volume. Ideal where extra internal height improves comfort and fit-out flexibility.",
  },
  {
    title: "10 ft & 30 ft custom",
    description: "Fabricated cut-down or modified units for restricted sites, compact storage, and tailored space planning requirements.",
  },
  {
    title: "20/40 ft reefer",
    description: "Temperature-controlled reefers for perishables, pharmaceuticals, and other climate-sensitive operations.",
  },
  {
    title: "20 ft HC on request",
    description: "Less common but available for buyers who need extra headroom in a shorter footprint.",
  },
];

const conditionGrades = [
  "One-trip (almost new): minimal wear, straight walls, premium for visible corporate or commercial conversions",
  "Cargo-Worthy (CW): structurally sound and survey-friendly for sea shipping and transport use",
  "Wind & Water Tight (WWT): weatherproof choice for storage and static site deployment",
  "As-Is: inspection-based purchase for budget-sensitive buyers who can accept current condition",
];

const technicalSpecs = [
  {
    type: "20 ft GP",
    dimensions: "20' × 8' × 8'6” external | approx. 19'4” × 7'9” × 7'10” internal",
    weight: "Tare 2,100–2,400 kg | payload approx. 24,000–28,000 kg",
    capacity: "33 m³ | approx. 1,165 cu ft | fits 11 EUR pallets",
  },
  {
    type: "40 ft GP",
    dimensions: "40' × 8' × 8'6” external | approx. 39'5” × 7'9” × 7'10” internal",
    weight: "Tare 3,600–4,000 kg | payload approx. 26,500–28,500 kg",
    capacity: "67 m³ | approx. 2,390 cu ft | fits 25 EUR pallets",
  },
  {
    type: "40 ft HC",
    dimensions: "40' × 8' × 9'6” external | approx. 39'5” × 7'9” × 8'10” internal",
    weight: "Tare 3,900–4,200 kg | payload approx. 28,000–28,500 kg",
    capacity: "76 m³ | approx. 2,700 cu ft | extra height suits offices, homes, and detailed fit-outs",
  },
];

const priceRows = [
  ["20 ft used cargo-worthy", "₹1,25,000–₹1,80,000"],
  ["40 ft GP used cargo-worthy", "₹2,45,000–₹3,60,000"],
  ["40 ft HC used cargo-worthy", "₹2,70,000–₹3,90,000"],
  ["10 ft fabricated cut-down", "₹1,00,000–₹1,40,000"],
  ["Basic 20 ft converted site office", "₹2,40,000–₹3,20,000"],
];

const comparisonRows = [
  ["20 ft GP", "₹2,40,000–₹2,80,000", "₹1,30,000–₹1,80,000"],
  ["40 ft GP", "₹3,80,000–₹4,50,000", "₹2,45,000–₹3,60,000"],
  ["40 ft HC", "₹4,20,000–₹5,00,000", "₹2,70,000–₹3,90,000"],
];

const applications = [
  "Site storage containers for tools, documents, materials, DG sets, and equipment",
  "Portable container offices with insulation, wiring, AC provision, windows, and furniture",
  "Container homes and farmhouses with plumbing, kitchens, bathrooms, and facade treatment",
  "Labour colonies and staff accommodation built from combined 20 ft and 40 ft units",
  "Container cafés, restaurants, canteens, rooftop cabins, and branded retail spaces",
  "Portable toilets and sanitation blocks for projects, events, and public use",
];

const buyerChecklist = [
  "Define whether the unit is for export shipping, domestic transport, storage, office conversion, home use, or utility space.",
  "Match size to site access, internal volume needs, and turning radius for trailers and cranes.",
  "Request the manufacturing year, photos of all six sides, roof condition, floor condition, and door-seal details.",
  "Verify CSC validity when the container will be used for multi-modal cargo movement.",
  "Plan foundations, support blocks, unloading method, and overhead clearance before dispatch.",
  "For conversions, share layout sketches early so openings, framing, insulation, and MEP routing are optimized.",
];

const commercialModels = {
  buy: [
    "Long-term use planned for 3+ years",
    "Static storage or permanent office installation",
    "Container homes, farmhouses, and repeat internal deployment",
    "Full ownership preferred over recurring payments",
  ],
  rent: [
    "Short-term sites, event storage, and temporary exhibitions",
    "Project offices where capex must stay low",
    "Concept testing before full purchase",
    "No resale or disposal burden after the project ends",
  ],
  lease: [
    "Multi-year corporate or institutional projects",
    "Predictable monthly operating costs",
    "Flexibility to upgrade or return at term end",
    "Potential tax advantages from lease treatment",
  ],
};

const rentalRows = [
  ["20 ft used container", "₹6,000–₹10,000 / month"],
  ["40 ft used container", "₹10,000–₹16,000 / month"],
  ["20 ft converted office cabin", "₹12,000–₹18,000 / month"],
];

const strengths = [
  "End-to-end delivery from sourcing and survey support to fabrication, interiors, MEP, transport, and installation",
  "Proven container projects across Maharashtra, Gujarat, Karnataka, Tamil Nadu, and other industrial regions",
  "In-house treatment, repair, structural modifications, and weather-protection finishing",
  "Support for construction, education, government, logistics, industrial, and residential applications",
  "Reusable container-based construction with lower embodied carbon than many conventional approaches",
];

export function CargoContainerForSaleContent() {
  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="grid gap-5 md:grid-cols-[1.35fr_0.95fr]">
          <OptimizedImage
            src={resolveImageUrl(cargoContainerMain)}
            alt="Cargo containers stacked in a port yard for sale by Portable Office Cabin"
            productName="Cargo Container For Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
          <OptimizedImage
            src={resolveImageUrl(cargoContainerInspection)}
            alt="Cargo container interior inspection for structural condition and flooring quality"
            productName="Cargo Container For Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
        </div>

        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Cargo Container Guide</span>
          </div>
          <h2 className="mb-5 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Cargo Container For Sale – Buy, Rent & Convert In India
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
            Looking for a cargo container for sale in India? Whether you need robust storage, efficient transportation,
            or a modular building solution, cargo containers offer unmatched versatility for businesses across the country.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Portable Office Cabin supplies new and used cargo containers pan-India and converts plain containers into
            offices, homes, cafés, labour camps, and prefab buildings—giving you one point of contact from sourcing to final installation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <item.icon className="mb-3 h-7 w-7 text-accent" />
              <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Quick overview: cargo containers for sale in 2026</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>We commonly stock 10 ft fabricated containers, 20 ft GP, 30 ft custom units, 40 ft GP, and 40 ft high cube containers, with reefer options available on request.</p>
            <p>Typical 2025–2026 ex-yard cargo-worthy price ranges start from approximately ₹1,25,000 for 20 ft, ₹2,45,000 for 40 ft GP, and ₹2,70,000 for 40 ft HC units.</p>
            <p>Final commercials vary based on age, condition grade, and pickup location such as Nhava Sheva, Mundra, Chennai, or inland cities.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Designed for buyers like</h3>
          <div className="space-y-3">
            {[
              "Construction contractors and project developers",
              "Factories and industrial facilities",
              "Schools, colleges, and educational institutions",
              "Warehouse operators and logistics companies",
              "SMEs needing extra operational space",
              "Government departments requiring temporary or permanent structures",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Types of cargo containers for sale in India</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {containerTypes.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h4 className="mb-2 font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-border bg-card p-8">
          <h4 className="mb-4 font-display text-xl font-bold text-foreground">Construction materials & condition grades</h4>
          <p className="mb-5 text-muted-foreground">
            Containers are built from Corten steel with marine-grade plywood or chequered steel flooring, secure double doors,
            locking bars, ventilation, and optional side-door modifications for specialized use.
          </p>
          <div className="space-y-3">
            {conditionGrades.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="mb-2 font-display text-2xl font-bold text-foreground">Standard sizes & technical specifications</h3>
          <p className="text-muted-foreground">
            All ISO containers follow CSC safety conventions and can support sea, rail, and road transport when supplied in cargo-worthy condition.
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Dimensions</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Weight</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {technicalSpecs.map((row, index) => (
                <tr key={row.type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 font-medium text-foreground">{row.type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.dimensions}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.weight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Portable Office Cabin can share technical drawings, load data, and layout input for engineering approvals and site planning.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">New vs used cargo containers</h3>
          <div className="space-y-3">
            {[
              "New or one-trip units give straighter walls, fewer dents, better cosmetics, longer service life, and stronger resale value.",
              "Used units reduce upfront cost significantly and work well for storage, labour rooms, internal factory use, and budget conversions.",
              "Typical used container age in India ranges from 8–18 years depending on source and grade.",
              "For export cargo or premium public-facing builds, IICL or better-condition units are usually the smarter choice.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Price comparison example</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Container Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">New / One-Trip</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Used Cargo-Worthy</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([type, newPrice, usedPrice], index) => (
                  <tr key={type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground">{type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{newPrice}</td>
                    <td className="px-4 py-3 text-muted-foreground">{usedPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Exact quotes remain subject to current inspection results and supply location.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Cargo containers for storage, offices, homes & more</h3>
          <div className="space-y-3">
            {applications.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Home className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Real-world delivery examples</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>40 ft container office block supplied for a metro rail contractor in Mumbai and deployed within 12 days of order confirmation.</p>
            <p>20 ft site office cabins installed for a solar plant project in Rajasthan with heat- and dust-ready detailing.</p>
            <p>Multi-storey labour colony using 48 container units delivered for a highway project in Karnataka.</p>
            <p>PEB shed integration available above container clusters for large covered workspaces and warehouse-style layouts.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="mb-2 font-display text-2xl font-bold text-foreground">Cargo container pricing in India (2025–2026 guide)</h3>
          <p className="text-muted-foreground">
            Market pricing moves with steel rates, container releases, freight demand, customization scope, and inland logistics.
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Container Type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Price Range (₹)</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map(([type, price], index) => (
                <tr key={type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 text-foreground">{type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h4 className="mb-4 font-display text-xl font-bold text-foreground">Key factors affecting price</h4>
            <div className="space-y-3">
              {[
                "Age and year built",
                "Condition grade: IICL, CW, WWT, or as-is",
                "Port pickup versus inland delivery location",
                "Current freight market surplus or shortage",
                "Windows, doors, insulation, electrical, plumbing, and interior upgrades",
                "Bulk quantity or project-package ordering",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <BadgeIndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8">
            <h4 className="mb-4 font-display text-xl font-bold text-foreground">What B2B buyers should request</h4>
            <div className="space-y-3">
              {[
                "Container base price",
                "GST and statutory commercial terms",
                "Transport charges to site",
                "Crane or hydra unloading costs",
                "Installation scope for converted units",
                "Interior fit-out specifications and exclusions",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Warehouse className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">When to buy</h3>
          <div className="space-y-3">
            {commercialModels.buy.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">When to rent</h3>
          <div className="space-y-3">
            {commercialModels.rent.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">When to lease</h3>
          <div className="space-y-3">
            {commercialModels.lease.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Indicative rental rates</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Container Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Monthly Rental (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rentalRows.map(([type, rent], index) => (
                  <tr key={type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground">{type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{rent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Typical rentals carry 6–12 month lock-ins, 2–3 months security deposit, and separate transport charges.</p>
        </div>
        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">How to choose the right cargo container</h3>
          <div className="space-y-3">
            {buyerChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Why buy from Portable Office Cabin</h3>
          <div className="space-y-3">
            {strengths.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Safety, compliance & sustainability</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>Electrical work is aligned with IS standards, with earthing, protected circuits, and fire-safe material choices where required.</p>
            <p>Engineered support structures can be provided for stacked container layouts, labour colonies, and container-based office clusters.</p>
            <p>Reusing shipping containers cuts embodied carbon, reduces concrete dependency, and supports lower-waste modular construction.</p>
            <p>Tell us your size, quantity, location, purpose, and timeline, and we will recommend the right buy, rent, or conversion model.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="sizes">
            <AccordionTrigger>Which cargo container sizes are most commonly available?</AccordionTrigger>
            <AccordionContent>
              The most common stock formats are 20 ft GP, 40 ft GP, and 40 ft high cube. We also support 10 ft fabricated units, 30 ft customs, and reefers on request.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="conversion">
            <AccordionTrigger>Can a cargo container be converted into an office or home?</AccordionTrigger>
            <AccordionContent>
              Yes. We convert cargo containers into offices, homes, cafés, labour accommodation, toilets, rooftop cabins, and other modular structures with insulation, electrical, plumbing, and interior finishes.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="used">
            <AccordionTrigger>Should I buy new or used cargo containers?</AccordionTrigger>
            <AccordionContent>
              New units work best for premium visible projects and export use, while used cargo-worthy or WWT containers are cost-effective for storage, internal operations, and budget-friendly modular builds.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="rent">
            <AccordionTrigger>Do you offer cargo containers on rent or lease?</AccordionTrigger>
            <AccordionContent>
              Yes. Short-term rental, long-term lease, and outright purchase models are available depending on project duration, location, quantity, and intended use.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="delivery">
            <AccordionTrigger>Do you handle transport and unloading across India?</AccordionTrigger>
            <AccordionContent>
              Yes. We coordinate trailer transport, crane or hydra unloading, placement, and installation support for both plain and converted containers across India.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="reefer">
            <AccordionTrigger>Can you supply reefer containers for temperature-sensitive goods?</AccordionTrigger>
            <AccordionContent>
              Yes. Reefer containers can be arranged for perishables, pharma, and other temperature-controlled applications based on size and location requirements.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
