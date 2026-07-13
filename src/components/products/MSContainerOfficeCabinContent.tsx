import msContainerOfficeCabinMain from "@/assets/products/ms-container-office-cabin-main.webp";
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
  Fuel,
  GraduationCap,
  HardHat,
  Palette,
  Shield,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";

const quickHighlights = [
  "Ready-to-use office delivery with flooring and basic electricals included",
  "Weather-resistant construction for monsoons, heat, and industrial conditions",
  "Custom layouts for site offices, petrol bunks, schools, and admin blocks",
  "Pan-India transport with hydra crane unloading and fast installation",
];

// Size reference only. The price of the unit sold on this page is the single figure shown
// in the header above (inclusive of 18% GST) — no ranges are published here, so the page,
// the cart and the Merchant Center feed can never disagree.
const sizeRows = [
  ["6' x 6' x 8.5'", "Security post / small office"],
  ["20' x 10' x 8.6'", "Standard office for 4–6 staff"],
  ["10' x 20' x 8.6'", "School or site office cabin"],
  ["10' x 40' x 8.6'", "Large office for 10–12 staff"],
];

const technicalSpecs = [
  "Frame: Heavy-duty MS sections using ISMB / ISMC profiles with full welding at joints",
  "Walls: MS or GI corrugated sheets with 40–60 mm PUF, Rockwool, or EPS insulation",
  "Roof: Sloped double-skin roof with insulation and waterproof coating",
  "Floor: MS chequered plate base with 18 mm marine plywood and vinyl or laminate top layer",
  "Openings: Powder-coated steel or aluminium windows with safety grills and secure doors",
  "Electrical: Concealed copper wiring, MCB board, LED lighting, sockets, and AC points",
  "Finish: Epoxy primer with enamel or PU top coat for corrosion and UV resistance",
];

const customizations = [
  {
    title: "Layout planning",
    description:
      "Single open office layouts, manager cabins, meeting rooms, reception counters, and compartmentalized admin blocks based on your headcount and workflow.",
  },
  {
    title: "Attached utility zones",
    description:
      "Pantries, toilets, washrooms, storage rooms, server corners, and support spaces can be integrated into the same cabin for remote sites.",
  },
  {
    title: "Interior upgrades",
    description:
      "Laminate wall panelling, false ceilings, modular furniture, data cabling, UPS points, premium lighting, and branded reception counters.",
  },
  {
    title: "Exterior branding",
    description:
      "Corporate colour schemes, logo graphics, signage, reflective stickers, and site-specific branding for contractors, schools, and fuel stations.",
  },
];

const applications = [
  { icon: HardHat, title: "Construction sites", description: "Project offices, engineer cabins, billing rooms, planning hubs, and field coordination spaces." },
  { icon: Factory, title: "Industrial & warehouse", description: "Admin blocks, dispatch offices, QC rooms, monitoring cabins, and utility offices inside plants and logistics hubs." },
  { icon: Fuel, title: "Petrol bunks", description: "Billing counters, manager rooms, staff rest areas, and compact supervision cabins." },
  { icon: GraduationCap, title: "Schools & colleges", description: "Temporary admin offices, principal rooms, and expansion-phase classrooms or support blocks." },
  { icon: Building2, title: "Government projects", description: "Road, metro, railway, irrigation, and field-office deployments with rapid on-site commissioning." },
  { icon: Warehouse, title: "Labour camps", description: "Integrated office blocks paired with accommodation, toilets, storage, and support cabins." },
];

const comparisons = [
  {
    title: "MS vs GI portable office cabins",
    description:
      "GI cabins provide better inherent corrosion resistance, but MS container office cabins offer stronger heavy-duty construction and better resilience for rough handling and repeated relocation.",
  },
  {
    title: "MS vs PUF movable office cabins",
    description:
      "PUF-focused cabins excel in thermal performance, especially in very hot regions, while MS container office cabins remain the practical choice when structural strength and site durability matter most.",
  },
  {
    title: "MS vs ACP portable cabins",
    description:
      "ACP cabins look more premium for corporate-facing sites, but MS cabins are preferred for industrial yards, security-sensitive areas, and multi-shift construction environments.",
  },
];

const faqs = [
  {
    question: "How fast can an MS container office cabin be delivered?",
    answer:
      "Standard sizes usually take 7–15 working days depending on current production load and delivery location. Larger custom layouts or multi-cabin complexes may take 20–30 days.",
  },
  {
    question: "Can the cabin be shifted to another project site later?",
    answer:
      "Yes. The cabins are designed for lifting, transport, and repeat installation using hydra cranes and trailers, which makes them ideal for rotating project sites.",
  },
  {
    question: "What is included in the price shown on this page?",
    answer:
      "The price shown above is inclusive of 18% GST and covers flooring, standard electrical wiring, LED lights, ceiling fans, and standard windows and doors. Transport and optional installation are added at checkout based on your delivery pincode. Premium interiors, attached toilets, and ACs are optional extras quoted separately.",
  },
  {
    question: "Are these cabins suitable for hot and rainy Indian climates?",
    answer:
      "Yes. Proper insulation, sloped waterproof roofing, anti-corrosive coatings, and sealed openings make them suitable for monsoons, high summer temperatures, and industrial environments.",
  },
];

export function MSContainerOfficeCabinContent() {
  return (
    <div className="space-y-16">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-5">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            MS Container Office Cabin
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            When project timelines are tight and mobility matters, an MS container office cabin gives you a ready-to-use workspace that can be deployed in days rather than weeks. Businesses across India choose these mild steel office cabins for structural strength, weather resistance, and easy relocation.
          </p>
          <p className="text-muted-foreground">
            Portable Office Cabin manufactures and supplies MS container office cabins across Chennai, Mumbai, Bengaluru, Ahmedabad, and Delhi NCR. Whether you need a compact 10’x10’ site cabin or a 40’x10’ project office with meeting space, the layout can be tailored to your operational needs.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickHighlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(msContainerOfficeCabinMain)}
            alt="MS container office cabin installed at a construction project site in India"
            title="MS Container Office Cabin"
            productName="MS Container Office Cabin"
            aspectRatio="4/3"
            className="rounded-2xl"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Quick Overview of MS Container Office Cabins
        </h2>
        <p className="text-muted-foreground">
          This unit is sold at the single price shown above, inclusive of 18% GST. Transport and optional installation are calculated at checkout from your delivery pincode, so what you see is what you pay.
        </p>
        <p className="text-muted-foreground">
          Unlike repurposed shipping containers, these cabins are purpose-built from new MS sections, designed specifically for office use with insulation, ventilation, flooring, and electrical readiness built into the fabrication process.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Standard Sizes & Configurations
        </h2>
        <div className="overflow-hidden rounded-xl bg-card shadow-card">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Size</th>
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
        <p className="text-sm italic text-muted-foreground">
          * Sizes are the standard configurations we build. The unit listed on this page is priced at the amount shown above, inclusive of 18% GST. Other sizes and custom layouts are quoted separately — talk to our team.
        </p>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Key Features & Technical Specifications
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {technicalSpecs.map((spec) => (
            <div key={spec} className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-muted-foreground">{spec}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-muted-foreground">
          The 40–60 mm insulation thickness commonly used in these cabins helps lower cooling loads and improves comfort for office staff working long hours in demanding Indian climates.
        </p>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Customisation Options in MS Container Office Cabins
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {customizations.map((item) => (
            <div key={item.title} className="rounded-xl bg-card p-6 shadow-card">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Palette className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          Applications of MS Container Office Cabins
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((item) => (
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
            Advantages of Choosing MS Container Office Cabins
          </h2>
          <p className="text-muted-foreground">
            Compared with conventional RCC site offices, MS office cabins install in 1–2 days, require simpler foundations, and move with your project. That means faster mobilisation, better cost control, and an asset you can reuse instead of abandoning at the end of a project.
          </p>
          <div className="space-y-3">
            {[
              "Quick deployment with power and water hookup after placement",
              "Mobility and repeated reuse across shifting workfronts",
              "Predictable cost per piece or per sq ft",
              "All-weather performance for heat, rain, and coastal humidity",
              "Reduced material wastage and high recyclability of steel",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            MS Container Office Cabin vs Other Portable Cabin Types
          </h2>
          {comparisons.map((item) => (
            <div key={item.title} className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Manufacturing, Delivery & Relocation
          </h2>
          <p className="text-muted-foreground">
            The build process typically covers design finalization, MS frame fabrication, insulation and panel fixing, electrical and plumbing integration, interior finishing, and final quality checks before dispatch.
          </p>
          <div className="space-y-3">
            {[
              "Standard delivery timelines of 7–15 working days for common layouts",
              "Flatbed truck transport with hydra crane unloading at site",
              "Level ground or PCC support blocks recommended before arrival",
              "Operational within hours once connections are completed",
              "Designed for repeat shifting across project cycles",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-muted/50 p-6">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            How to Choose the Right Cabin
          </h2>
          <div className="mt-4 space-y-3 text-muted-foreground">
            <p>Define the purpose first: admin office, control room, petrol bunk cabin, school office, security room, or multi-function site office.</p>
            <p>Then align the layout with headcount, climate, mobility needs, attached facilities, and budget approach.</p>
            <p>A 10’x15’ cabin suits 4–5 staff, while a 10’x30’ configuration can handle 10–12 occupants with furniture and support space.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
          FAQs
        </h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
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
    </div>
  );
}
