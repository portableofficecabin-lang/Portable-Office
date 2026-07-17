import usedShippingContainerMain from "@/assets/products/used-shipping-container-main.webp";
import usedShippingContainerSecond from "@/assets/products/used-shipping-container-second.webp";
import usedShippingContainerThird from "@/assets/products/used-shipping-container-third.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BadgeIndianRupee, CheckCircle2, Container, Hammer, ShieldCheck, Truck, Warehouse } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { FixedPriceCallout, type FixedOffer } from "./FixedPriceCallout";

const highlights = [
  {
    icon: Container,
    title: "20 ft & 40 ft stock",
    description: "Used ISO containers available in standard and high-cube formats for storage and modular conversion.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Buy or rent",
    description: "Suitable for both outright purchase and short-to-medium-term monthly rental requirements.",
  },
  {
    icon: Hammer,
    title: "Conversion ready",
    description: "Can be transformed into site offices, labour rooms, cafés, homes, rooftop rooms, and more.",
  },
  {
    icon: Truck,
    title: "Pan-India logistics",
    description: "Trailer movement, crane handling, and installation support across metros and remote industrial sites.",
  },
];

const sizeCards = [
  {
    title: "20 ft Standard",
    description:
      "Approx. 6.06 m × 2.44 m × 2.59 m. Ideal for compact site offices, security cabins, storage rooms, and prefab kiosks.",
  },
  {
    title: "40 ft Standard",
    description:
      "Approx. 12.19 m × 2.44 m × 2.59 m. Suited for larger storage, multi-workstation offices, classrooms, and labour accommodation.",
  },
  {
    title: "40 ft High-Cube",
    description:
      "Approx. 12.19 m × 2.44 m × 2.89 m. Extra height improves comfort for habitable spaces, false ceilings, and mezzanine-ready layouts.",
  },
];

const gradeCards = [
  {
    title: "Cargo-Worthy (CWO)",
    description:
      "Structurally sound units with valid CSC support, functional doors, and minimal rust—best for long-term deployment and premium conversions.",
  },
  {
    title: "Wind & Watertight (WWT)",
    description:
      "Popular choice for static storage, site offices, and labour rooms with cosmetic wear but no leakage or serious structural compromise.",
  },
  {
    title: "As-Is / Refurbished",
    description:
      "Older units repaired, treated, and repainted for cost-sensitive storage and basic non-critical site applications.",
  },
];

const pricingRows = [
  ["20 ft Used Container (WWT / Cargo-Worthy)", "₹95,000 – ₹1,45,000 ex-yard"],
  ["40 ft Standard Used Container", "₹1,45,000 – ₹2,10,000 ex-yard"],
  ["40 ft High-Cube Premium", "₹15,000 – ₹25,000 above standard height"],
  ["Typical extra costs", "GST, loading, transport, crane/hydra unloading, customization"],
];

const useCases = [
  "Secure storage for tools, spare parts, raw materials, and project equipment",
  "Container offices and site offices with insulation, AC provision, and electrical fit-out",
  "Prefab labour accommodation with bunk beds, attached toilets, and common facilities",
  "Container homes, farmhouses, rooftop rooms, and modular residential shells",
  "Prefab cafés, canteens, portable toilets, guard cabins, ticket counters, and retail shops",
];

const fabricationOptions = [
  "Doors, windows, shutters, and structural cut-outs",
  "PUF, rockwool, or glasswool insulation systems",
  "Wall panelling, flooring, false ceiling, and branded exterior repainting",
  "Electrical wiring, LED lighting, AC points, plumbing, and sanitary fixtures",
  "Multi-container joining, stacking, and modular expansion planning",
];

const selectionChecklist = [
  "Define whether the unit is for storage, office, labour use, café, classroom, or rooftop room.",
  "Review age, rust, flooring, door operation, and overall structural integrity before finalizing.",
  "Choose high-cube containers where ceiling height and occupant comfort matter.",
  "Check approach roads, trailer turning radius, and crane access at the site.",
  "Match insulation, paint grade, and roof protection to local heat, rain, or coastal conditions.",
];

/**
 * `offer` is present when the CURRENT product page is purchasable (passed in by
 * ProductDetailServer from isPurchasable()). The indicative used-container price table
 * (₹95,000 … ₹2,10,000 ex-yard) renders ONLY when `offer` is absent — i.e. on the quote-only page
 * this guide serves today. If this page's product is ever given a confirmed fixed price, the table
 * is automatically replaced by that one real figure, so the page can never publish ranges that
 * contradict its own checkout.
 */
export function UsedShippingContainerForSaleContent({ offer }: { offer?: FixedOffer }) {
  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="grid gap-5 md:grid-cols-3">
          <OptimizedImage
            src={resolveImageUrl(usedShippingContainerMain)}
            alt="Used shipping container converted with large glass openings by Portable Office Cabin"
            productName="Used Shipping Container for Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
          <OptimizedImage
            src={resolveImageUrl(usedShippingContainerSecond)}
            alt="Used shipping containers stacked at port yard by Portable Office Cabin"
            productName="Used Shipping Container for Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
          <OptimizedImage
            src={resolveImageUrl(usedShippingContainerThird)}
            alt="Used blue shipping container on trailer for transport by Portable Office Cabin"
            productName="Used Shipping Container for Sale"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
        </div>

        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Used Container Guide</span>
          </div>
          <h2 className="mb-5 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Used Shipping Container for Sale – Buy, Rent & Convert
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
            Portable Office Cabin supplies and converts used 20 ft and 40 ft shipping containers into practical modular spaces across India—
            from secure storage and site offices to labour colonies, container homes, cafés, rooftop rooms, and portable toilets.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            If you are comparing used shipping container price, rental options, and conversion suitability, this page gives you a practical
            buying guide based on size, grade, condition, and intended project use.
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

      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Standard sizes: 20 ft & 40 ft used shipping containers</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {sizeCards.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h4 className="mb-2 font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Types & grades of used shipping containers</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {gradeCards.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h4 className="mb-2 font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="mb-2 font-display text-2xl font-bold text-foreground">
            {offer ? "Used shipping container price" : "Used shipping container price in India"}
          </h3>
          {!offer && (
            <p className="text-muted-foreground">
              Prices fluctuate with container age, steel rates, grade, and site location, but these indicative numbers provide a practical starting point.
            </p>
          )}
        </div>

        {offer ? (
          /* Purchasable SKU: the indicative range table is replaced by the one real figure — a
             "₹95,000 – ₹1,45,000 ex-yard" row beside a fixed checkout price is exactly the
             landing-page contradiction the offer prop exists to prevent. */
          <FixedPriceCallout offer={offer} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/10">
                  <th className="px-5 py-4 text-left font-semibold text-foreground">Type</th>
                  <th className="px-5 py-4 text-left font-semibold text-foreground">Indicative Price</th>
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

        <p className="text-sm text-muted-foreground">
          Formal quotations include exact container photos, condition reports, fabrication scope, delivery timeline, and all commercial breakups.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Used shipping container on rent vs purchase</h3>
          <div className="space-y-3">
            {[
              "Renting works well for 6–24 month projects, seasonal storage, temporary site offices, and events.",
              "Buying is better for permanent storage, workshops, schools, long-term container homes, and repeated internal use.",
              "Rental terms usually include a security deposit, minimum rental period, and separate transport/loading charges.",
              "We support lift-and-shift logistics for both rental and sale units across India.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Popular uses of used shipping containers</h3>
          <div className="space-y-3">
            {useCases.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Warehouse className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Modification & fabrication options</h3>
          <div className="space-y-3">
            {fabricationOptions.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Hammer className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">How to choose the right used container</h3>
          <div className="space-y-3">
            {selectionChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Delivery, installation & compliance</h3>
          <div className="space-y-4 text-muted-foreground">
            <p>Delivery is handled from the nearest yard by trailer, followed by unloading with crane or hydra and alignment on prepared foundations.</p>
            <p>Typical foundations use precast blocks or RCC pedestals placed under the corner castings and key support points.</p>
            <p>For permanent homes or commercial uses, local approvals, fire safety planning, and site safety coordination should be reviewed in advance.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-5 font-display text-2xl font-bold text-foreground">Why buy from Portable Office Cabin</h3>
          <div className="space-y-3">
            {[
              "Proven experience across construction, infrastructure, education, industrial, and government projects.",
              "In-house design and fabrication for offices, labour accommodation, prefab buildings, portable toilets, and cafés.",
              "Quality checks including anti-rust treatment, leak testing, and electrical safety verification before dispatch.",
              "Pan-India supply network with fast commercial response for urgent requirements.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h3 className="mb-4 font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="rent">
            <AccordionTrigger>Can I rent a used shipping container instead of buying one?</AccordionTrigger>
            <AccordionContent>
              Yes. Rental is available for storage, site office, labour room, and similar short-to-medium-term applications, usually with a minimum hire period.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="grade">
            <AccordionTrigger>Which grade is best for conversion work?</AccordionTrigger>
            <AccordionContent>
              WWT and cargo-worthy units are the usual starting point. For premium offices, cafés, and public-facing builds, better-condition units reduce repair work and improve final finish quality.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="delivery">
            <AccordionTrigger>Do you handle transport and unloading?</AccordionTrigger>
            <AccordionContent>
              Yes. We coordinate trailers, crane or hydra unloading, and installation support based on your site access and project schedule.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="modifications">
            <AccordionTrigger>Can the container be converted into an office or labour room?</AccordionTrigger>
            <AccordionContent>
              Absolutely. We fabricate used containers into site offices, accommodation units, cafés, portable toilets, guard cabins, and other modular structures.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
