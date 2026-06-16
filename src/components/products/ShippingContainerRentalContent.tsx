import Link from "next/link";
import { ArrowRight, Clock3, Container, IndianRupee, ShieldCheck, Truck } from "lucide-react";
import rentalYardImage from "@/assets/products/shipping-container-rental-yard.webp";
import rentalTransportImage from "@/assets/products/shipping-container-rental-transport.webp";
import rentalOfficeImage from "@/assets/products/shipping-container-rental-office.webp";
import rentalSiteOfficeImage from "@/assets/products/shipping-container-rental-site-office.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  {
    icon: Clock3,
    title: "Fast deployment",
    description: "Monthly rentals from 1 month to 5 years with site delivery, pickup, and extension support across India.",
  },
  {
    icon: Truck,
    title: "Pan-India logistics",
    description: "Trailer movement, crane coordination, and site placement support for Mumbai, Pune, Ahmedabad, Delhi NCR, Chennai, Bengaluru, Hyderabad, and beyond.",
  },
  {
    icon: Container,
    title: "Flexible configurations",
    description: "Available as storage containers, offices, labour accommodation, cafés, security cabins, and sanitation-ready modular spaces.",
  },
  {
    icon: ShieldCheck,
    title: "Inspected stock",
    description: "Every rental unit is checked for floor strength, roof integrity, door operation, and weather resistance before dispatch.",
  },
];

const sizeRows = [
  ["10 ft", "Approx. 2.9 m", "Small storage, guard cabins, compact site uses"],
  ["20 ft", "Approx. 6.1 m", "Site storage, container offices, retail kiosks"],
  ["40 ft", "Approx. 12.2 m", "Large storage, dormitory layouts, long material bays"],
  ["40 ft High Cube", "Approx. 12.2 m", "Office conversions, homes, racking, occupied spaces"],
];

const gradeRows = [
  ["New / One-trip", "Premium finish, minimal dents, best for visible retail and corporate sites"],
  ["Cargo-worthy used", "Structurally sound with CSC-ready profile for value-focused industrial use"],
  ["Wind & water tight", "Ideal for static storage where weatherproofing matters more than appearance"],
];

const rentalRows = [
  ["20 ft used storage", "Rs 8,500 – 9,500 / month"],
  ["40 ft / 40 ft HC used storage", "Rs 10,500 – 13,500 / month"],
  ["20 ft fitted container office", "Rs 15,000 – 25,000 / month"],
  ["Labour accommodation", "Custom quote based on headcount and fit-out"],
  ["Container café / canteen", "Custom quote based on kitchen and branding scope"],
];

const steps = [
  "Share your city, site address, size, duration, and intended use.",
  "We recommend the right container type, grade, and modification package.",
  "You receive an itemised quote covering rent, transport, pickup, deposit, and lock-in period.",
  "After approval, we arrange dispatch, crane placement, and installation support.",
  "During rental, we support maintenance queries and extension planning.",
  "At off-hire, we inspect the unit, close out the agreement, and pick it up.",
];

const useCases = [
  "Secure site storage for tools, MEP items, DG spares, and consumables",
  "Container offices with insulation, AC provision, lighting, and furniture",
  "Labour colonies combining dormitories, dining, and sanitation blocks",
  "Security cabins for factory gates, schools, and residential projects",
  "Container cafés, kiosks, canteens, and temporary retail spaces",
  "Classrooms, training rooms, exam centres, and rooftop modular rooms",
];

const faqs = [
  {
    question: "What is the usual minimum rental period?",
    answer:
      "For standard storage containers, the minimum lock-in is typically around 3 months, though final terms depend on city, stock availability, and transport economics.",
  },
  {
    question: "Can you supply fitted offices instead of plain storage containers?",
    answer:
      "Yes. Portable Office Cabin modifies rental containers with insulation, doors, windows, electrical wiring, AC provision, partitions, and furniture depending on your requirement.",
  },
  {
    question: "Do you handle delivery and crane placement?",
    answer:
      "Yes. We coordinate trailer movement and help plan crane or side-loader placement based on access, turning radius, and ground conditions at your site.",
  },
  {
    question: "Are used rental containers safe for Indian project sites?",
    answer:
      "Yes, when properly inspected. Our units are checked for structural strength, floor condition, roof integrity, and door sealing before dispatch.",
  },
  {
    question: "Can I rent now and purchase later?",
    answer:
      "For selected projects, yes. We can structure rent-plus-buy or long-term lease options when the container may become a permanent asset later.",
  },
];

export function ShippingContainerRentalContent() {
  return (
    <div className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
            <Container className="h-4 w-4 text-accent" />
            Shipping Container Rental
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Fast, flexible container rental for storage, offices, and modular site spaces in India
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Portable Office Cabin rents ISO shipping containers across India for storage, site offices, labour accommodation, cafés, security cabins, and prefab modular spaces. We support short projects, long leases, and customised container conversions without forcing buyers into heavy upfront capital spend.
          </p>
          <p className="text-base leading-7 text-muted-foreground">
            Typical 2025 rental benchmarks start around Rs 8,500–9,500 per month for 20 ft used storage containers, while 40 ft and 40 ft High Cube formats generally range from Rs 10,500–13,500 per month depending on city, duration, and configuration.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Rental term</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">1 month–5 years</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Storage rent</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">From Rs 8,500</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Coverage</div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">Pan-India</div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(rentalYardImage)}
            alt="Stacked shipping containers ready for rental supply in India"
            title="Shipping container rental stock yard"
            productName="Shipping Container Rental"
            aspectRatio="4/3"
            className="h-full"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Icon className="h-8 w-8 text-accent" />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-display text-2xl font-bold text-foreground">Types and sizes available for rent</h3>
          <p className="leading-7 text-muted-foreground">
            We rent standard dry containers, High Cube units, and project-specific modified cabins. This covers simple storage demand as well as occupied spaces such as offices, classrooms, and temporary accommodation.
          </p>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Approx. length</th>
                  <th className="px-4 py-3 font-semibold">Typical use</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map(([size, length, use], index) => (
                  <tr key={size} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 font-medium text-foreground">{size}</td>
                    <td className="px-4 py-3 text-muted-foreground">{length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-2xl font-bold text-foreground">Condition grades and what they mean</h3>
          <p className="leading-7 text-muted-foreground">
            Your grade choice changes both appearance and budget. Premium visible projects often prefer new or refurbished stock, while industrial storage users usually choose cargo-worthy or wind-and-water-tight units for better value.
          </p>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              {gradeRows.map(([grade, detail]) => (
                <div key={grade} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-semibold text-foreground">{grade}</h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(rentalTransportImage)}
            alt="Shipping container transported by trailer for rental delivery"
            title="Shipping container rental transport"
            productName="Shipping Container Rental"
            aspectRatio="16/9"
          />
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3 text-foreground">
            <IndianRupee className="h-6 w-6 text-accent" />
            <h3 className="font-display text-2xl font-bold">Indicative 2025 monthly rentals</h3>
          </div>
          <p className="mt-3 leading-7 text-muted-foreground">
            Rental pricing depends on size, condition, duration, city, and fit-out level. We share itemised quotes covering rent, delivery, pickup, deposit, and modifications so clients can compare options clearly.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Container type</th>
                  <th className="px-4 py-3 font-semibold">Monthly rent</th>
                </tr>
              </thead>
              <tbody>
                {rentalRows.map(([type, price], index) => (
                  <tr key={type} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground">{type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li>• One-time transportation and pickup are quoted separately.</li>
            <li>• Crane costs apply where direct side-loader access is not possible.</li>
            <li>• Long-term agreements can qualify for lower effective monthly rates.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">How shipping container rental works</h3>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">Popular rental use cases</h3>
          <div className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
            <ul className="space-y-3">
              {useCases.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <OptimizedImage
              src={resolveImageUrl(rentalOfficeImage)}
              alt="Container office interior prepared for rental deployment"
              title="Fitted shipping container office interior"
              productName="Shipping Container Rental"
              aspectRatio="16/9"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <OptimizedImage
            src={resolveImageUrl(rentalSiteOfficeImage)}
            alt="Shipping container site office installed on a construction project"
            title="Shipping container rental site office"
            productName="Shipping Container Rental"
            aspectRatio="16/9"
          />
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-2xl font-bold text-foreground">Why rent from Portable Office Cabin?</h3>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              We are not only container traders. We source, modify, fit out, transport, and install container-based modular spaces for construction, industrial, institutional, and commercial projects across India.
            </p>
            <p>
              That means one team can handle storage containers, fitted offices, labour accommodation, sanitation blocks, and branded container cafés—while keeping delivery, compliance support, and maintenance aligned to project timelines.
            </p>
            <p>
              For related solutions, explore our <Link href="/products/shipping-container-for-sale" className="font-medium text-accent underline-offset-4 hover:underline">Shipping Container for Sale</Link>, <Link href="/products/cargo-container-for-sale" className="font-medium text-accent underline-offset-4 hover:underline">Cargo Container For Sale</Link>, and <Link href="/rental-service" className="font-medium text-accent underline-offset-4 hover:underline">Rental Service</Link> pages.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-2xl font-bold text-foreground">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="mt-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
