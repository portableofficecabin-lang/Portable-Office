import shippingContainerYard from "@/assets/products/shipping-container-for-sale-yard.webp";
import shippingContainerLift from "@/assets/products/shipping-container-for-sale-lift.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BadgeIndianRupee, CheckCircle2, MapPin, Package, Settings, ShieldCheck, Truck, Wrench } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { FixedPriceCallout, type FixedOffer } from "./FixedPriceCallout";

const highlights = [
  {
    icon: Package,
    title: "20 ft & 40 ft ready stock",
    description: "Standard ISO containers available for immediate dispatch across major Indian cities.",
  },
  {
    icon: Truck,
    title: "Pan-India delivery",
    description: "Professional lift-and-shift handling for sites, factories, campuses, and warehouses.",
  },
  {
    icon: Settings,
    title: "Custom conversion options",
    description: "From basic storage boxes to insulated offices, cafés, labour blocks, and security cabins.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Budget-friendly grades",
    description: "Choose used, one-trip, or fully converted containers based on project life and finish expectations.",
  },
];

const saleTypes = [
  {
    title: "20 ft GP (General Purpose) containers",
    description:
      "Approximately 6.06 m long with around 33 cubic metres of internal volume. Ideal for compact storage, small site offices, equipment rooms, and secure back-of-house uses.",
  },
  {
    title: "40 ft GP containers",
    description:
      "At 12.19 m in length, these provide roughly 67 cubic metres of internal space for bulk storage, workshop setups, and larger office conversions.",
  },
  {
    title: "40 ft HC (High Cube) containers",
    description:
      "The additional height improves ceiling comfort for offices, container cafés, lofted layouts, and upgraded modular building projects.",
  },
  {
    title: "Specialized formats on request",
    description:
      "Reefer, open-top, and side-opening containers are available for temperature-sensitive goods, oversized loads, and industry-specific access needs.",
  },
];

const usedVsNew = [
  {
    title: "Used containers",
    points: [
      "Excellent value for storage and budget-led conversions",
      "Often 20–40% cheaper than new units of similar size",
      "Inspected for structural integrity, floor condition, and door operation",
    ],
  },
  {
    title: "New or one-trip containers",
    points: [
      "Recommended for premium offices, cafés, and client-facing projects",
      "Cleaner appearance with fewer cosmetic marks",
      "Better suited for long-term architectural applications and branded finishes",
    ],
  },
];

const pricingRows = [
  ["20 ft used container (storage grade)", "₹1,40,000 – ₹1,80,000"],
  ["40 ft used container (storage grade)", "₹2,40,000 – ₹3,20,000"],
  ["Fully converted 20 ft office cabin", "₹2,00,000 – ₹2,80,000"],
  ["Fully converted 40 ft office or accommodation unit", "₹3,50,000 – ₹4,50,000+"],
];

const specRows = [
  ["20 ft GP", "6.06 m", "2.44 m", "2.59 m", "Up to 28 tonnes", "~2,200 kg"],
  ["40 ft GP", "12.19 m", "2.44 m", "2.59 m", "Up to 28 tonnes", "~3,700 kg"],
  ["40 ft HC", "12.19 m", "2.44 m", "2.90 m", "Up to 28 tonnes", "~3,900 kg"],
];

const modularUses = [
  "Container offices for site engineers, foremen, and project managers",
  "Labour accommodation blocks integrated with portable toilets and dining areas",
  "Container homes and cafés with insulation, windows, doors, and finished interiors",
  "Security booths, workshops, storage rooms, and portable support structures",
  "Retail pop-ups, training centres, and relocatable business infrastructure",
];

const buyingChecklist = [
  "Inspect doors, locking gear, and rubber gaskets for smooth operation and proper sealing.",
  "Check corner posts, floor crossmembers, side walls, and timber flooring for major corrosion or damage.",
  "Confirm the unit is wind-and-water tight and review the CSC plate where relevant.",
  "Choose between 20 ft, 40 ft, and high cube based on site access, internal space, and future expansion.",
  "Account for transport, crane handling, foundation blocks, and dense-city permit requirements.",
  "Confirm whether the container is suitable for welding, cut-outs, insulation, and structural reinforcement.",
];

const whyChoose = [
  "In-house fabrication for container offices, labour colonies, prefab buildings, and modular support units",
  "Capability to integrate containers with PEB structures, rooftop sheds, and modular toilet systems",
  "QC checks, pre-dispatch photo/video updates, and transparent scope definition",
  "Support for design, customization, relocation, expansion, and after-sales service",
];

const cityCoverage = ["Mumbai", "Chennai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Ahmedabad"];

/**
 * `offer` is present when the CURRENT product page is purchasable (passed in by
 * ProductDetailServer from isPurchasable()). Every generic ₹ figure in this guide — the 2024
 * indicative pricing table (₹1,40,000 … ₹4,50,000+) and the "prices are indicative" FAQ — renders
 * ONLY when `offer` is absent, i.e. on quotation-only pages where an indicative range cannot be
 * mistaken for a chargeable price. On a purchasable page the one number shown is the real offer —
 * a range beside a fixed checkout price is the landing-page contradiction that got the Merchant
 * Center account suspended.
 */
export function ShippingContainerForSaleContent({ offer }: { offer?: FixedOffer }) {
  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="grid gap-5 md:grid-cols-2">
          <OptimizedImage
            src={resolveImageUrl(shippingContainerYard)}
            alt="Shipping containers stacked in a logistics yard for sale in India by Portable Office Cabin"
            productName="Shipping Container for Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
          <OptimizedImage
            src={resolveImageUrl(shippingContainerLift)}
            alt="Shipping container being loaded by crane for delivery to project site by Portable Office Cabin"
            productName="Shipping Container for Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
        </div>

        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Sale Guide</span>
          </div>
          <h2 className="mb-5 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Shipping Container for Sale Across India
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
            Looking for a reliable shipping container for sale in India? Portable Office Cabin supplies new and used shipping containers for storage,
            site offices, and modular buildings across major cities including Mumbai, Chennai, Delhi, Bengaluru, Pune, Hyderabad, and Ahmedabad.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Whether you need a basic storage container or a fully converted office cabin, our team delivers turnkey solutions with dispatch,
            delivery, installation, and customization support matched to your project requirements.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <item.icon className="mb-3 h-7 w-7 text-accent" />
              <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Affordable shipping containers for sale across India</h3>
          <p className="mb-5 leading-relaxed text-muted-foreground">
            Portable Office Cabin is a supplier and manufacturer of ISO-grade containers designed for both storage and prefabricated building
            applications. We support construction firms, industrial plants, educational institutions, and businesses with immediate availability,
            professional logistics, and fit-out capability.
          </p>
          <div className="space-y-3">
            {[
              "20 ft and 40 ft containers in stock for immediate dispatch",
              "Delivery and installation support for sites, factories, and campuses",
              "Multiple grades including cargo-grade, one-trip, and fully converted units",
              "Custom conversions for offices, homes, cafés, labour blocks, and security cabins",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Cities we serve</h3>
          <div className="mb-5 flex flex-wrap gap-2">
            {cityCoverage.map((city) => (
              <span key={city} className="rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {city}
              </span>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <h4 className="font-semibold text-foreground">Pan-India coverage</h4>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Our depot network and transport partners support deliveries to major metros and tier-2 cities, helping keep freight costs competitive
              while maintaining reliable scheduling for industrial and construction projects.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Types of shipping containers for sale</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {saleTypes.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h4 className="mb-2 font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {usedVsNew.map((column) => (
          <div key={column.title} className="rounded-3xl border border-border bg-card p-8">
            <h3 className="mb-5 font-display text-2xl font-bold text-foreground">{column.title}</h3>
            <div className="space-y-3">
              {column.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{point}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="mb-2 font-display text-2xl font-bold text-foreground">
            {offer ? "Standard sizes, specifications & price" : "Standard sizes, specifications, and typical pricing in 2024"}
          </h3>
          {!offer && (
            <p className="text-muted-foreground">
              Exact prices vary with steel rates, transport distance, condition, and customization, but these figures provide realistic planning references.
            </p>
          )}
        </div>

        {offer ? (
          /* Purchasable SKU: the 2024 indicative range table is replaced by the one real figure —
             a "₹1,40,000 – ₹1,80,000" row beside a fixed checkout price is exactly the
             landing-page contradiction the offer prop exists to prevent. */
          <FixedPriceCallout offer={offer} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/10">
                  <th className="px-5 py-4 text-left font-semibold text-foreground">Container Type</th>
                  <th className="px-5 py-4 text-left font-semibold text-foreground">Indicative Pricing (2024)</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map(([type, price], index) => (
                  <tr key={type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-5 py-4 text-foreground">{type}</td>
                    <td className="px-5 py-4 text-muted-foreground">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Size</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">External Length</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">External Width</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">External Height</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Approx. Payload</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Approx. Tare Weight</th>
              </tr>
            </thead>
            <tbody>
              {specRows.map(([size, length, width, height, payload, tare], index) => (
                <tr key={size} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium text-foreground">{size}</td>
                  <td className="px-4 py-3 text-muted-foreground">{length}</td>
                  <td className="px-4 py-3 text-muted-foreground">{width}</td>
                  <td className="px-4 py-3 text-muted-foreground">{height}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payload}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          {offer
            ? /* Purchasable SKU: "prices are indicative and subject to final confirmation" would
                 contradict the fixed, GST-inclusive amount charged at checkout. */
              "Specifications above are standard ISO reference figures. Transport and installation are calculated separately by delivery pincode at checkout."
            : "All prices are indicative and subject to final confirmation. Detailed quotations include specifications, delivery charges, and taxes."}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Shipping containers for modular offices, homes, and site infrastructure</h3>
          <div className="space-y-3">
            {modularUses.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Buying checklist: how to choose the right unit</h3>
          <div className="space-y-3">
            {buyingChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Why buy from Portable Office Cabin?</h3>
          <div className="space-y-3">
            {whyChoose.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">How to get a quote</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>Share your city, exact site location, required size, quantity, and intended use such as storage, office, accommodation, café, or labour colony.</p>
            <p>We then prepare a technical and commercial proposal covering unit grade, customization scope, price, delivery timeline, and dispatch plan.</p>
            <p>For larger requirements, we can support site discussions, layout planning, and reference walkthroughs of similar completed projects.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="w-full">
          {/* The indicative-pricing FAQ renders only on quotation-only pages — on a purchasable
              page "prices are indicative references only" would sit beside, and contradict, the
              fixed offer price shown above. */}
          {!offer && (
            <AccordionItem value="pricing">
              <AccordionTrigger>Are the listed container prices final?</AccordionTrigger>
              <AccordionContent>
                No. Prices are indicative references only and vary by container grade, age, condition, city of delivery, transport distance, and requested modifications.
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="delivery">
            <AccordionTrigger>Do you handle delivery and installation?</AccordionTrigger>
            <AccordionContent>
              Yes. We arrange transport, unloading, lift-and-shift handling, and installation support for project sites, factories, campuses, and commercial premises.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="conversion">
            <AccordionTrigger>Can you convert containers into offices or accommodation?</AccordionTrigger>
            <AccordionContent>
              Yes. We build container offices, labour accommodation units, cafés, storage rooms, security cabins, and other modular facilities using shipping containers as structural shells.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
