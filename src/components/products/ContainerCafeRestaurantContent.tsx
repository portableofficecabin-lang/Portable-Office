import Link from "next/link";
import {
  Sparkles, LayoutGrid, Table2, Wrench, ThermometerSun, ClipboardList, Scale, Users, IndianRupee,
  HelpCircle, Phone, MessageCircle, Mail, MapPin, ChevronRight, CheckCircle2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { OptimizedImage } from "@/components/OptimizedImage";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { COMPANY, formatAddress } from "@/lib/company";

// Long-form content for the Container Cafe & Restaurant (products.ts id 47, QUOTE ONLY), served at
// /products/container-cafe-restaurant. The product template (ProductDetailServer) renders the H1,
// the hero copy, the gallery, the quote box, specifications and key features; this component adds
// the remaining sections of the owner's "Container Cafe & Restaurant · Product page content"
// document (17 Oct 2026), in its order and with its headings.
//
// Wording follows the document. Where it stated something as a standard inclusion or a promise
// the owner had not yet confirmed (insulation as standard, design visuals in the customer's
// colours, factory visits, appliance sourcing, who connects utilities on site), the sentence has
// been made quotation-dependent — see the PR description for each original line.
//
// It carries NO ₹ figure: the product has no confirmed price, and the price section names only
// what moves the quotation. Every image is an AI-generated render and every caption says so.

const WHATSAPP_URL = `${COMPANY.whatsapp.url}?text=${encodeURIComponent(
  "Hi, I'd like a quote for a container cafe",
)}`;

const CONTAINER_CAFE_FAQS: { question: string; answer: string }[] = [
  {
    question: "Do I need permission to run a cafe from a container?",
    answer:
      "Yes, the same as any food business. You'll need FSSAI registration or a licence, a local trade licence, and permission to use the land commercially. Rules vary from place to place, so it's best to check with your local authority early. We can share drawings and specifications for your applications.",
  },
  {
    question: "Do you use real shipping containers?",
    answer:
      "We can work with refurbished shipping containers or build a new container-style structure. Used containers have that authentic look and are a good way to reuse steel. New builds give you more freedom on size and fewer dents to deal with. We'll walk you through both before you decide.",
  },
  {
    question: "How long does it take to build?",
    answer:
      "It depends on the size, the number of containers and how detailed the interiors are. A single kiosk comes together much faster than a two-storey restaurant. You'll get a firm timeline along with your quote.",
  },
  {
    question: "Can I move the cafe to a new location later?",
    answer:
      "Yes. The utilities are disconnected, the container is craned onto a trailer, and it's set up again at the new site. Very few businesses can pack up their entire premises like that.",
  },
  {
    question: "What kind of foundation does it need?",
    answer:
      "Usually no deep foundation. A level concrete plinth or a set of pedestals is usually enough, with water, drainage and power brought to the right points. The exact base depends on your site and the design, and we share the base drawing well in advance.",
  },
  {
    question: "Can we have seating on the roof?",
    answer:
      "Yes, with a reinforced roof, a proper staircase and safety railings. We'll check the structure and the load before we confirm the design.",
  },
  {
    question: "Will the container rust?",
    answer:
      "Not if it's prepared and painted properly. We treat the steel and use exterior-grade paint. Washing it down now and then and touching up scratches keeps it looking fresh for years.",
  },
  {
    question: "Do you supply kitchen equipment too?",
    answer:
      "We build the counters, exhaust, plumbing and power for your equipment, as set out in your quotation. If you'd like help sourcing appliances, ask us when you request your quote, or we can plan around the exact sizes from your own supplier.",
  },
];

const WHY = [
  ["You open sooner.", "The cafe is built off-site while your plot is being prepared, so both jobs happen at the same time instead of one after the other."],
  ["Your money goes further.", "There's no heavy civil work and no ripping out a previous tenant's interiors. More of your budget goes into equipment, marketing and getting through the first few slow months."],
  ["Your cafe isn't stuck in one place.", "If the lease ends, the area changes or a better spot comes up, the whole cafe can be lifted onto a trailer and moved."],
  ["The building does your marketing.", "A bright container with big glass windows and a deck is hard to walk past. People remember “the container cafe” and tell their friends to meet there."],
  ["It works where buildings are hard to put up.", "Highway plots, farm land, resort lawns, college campuses, tech park courtyards. Anywhere a permanent structure would be slow or expensive to build."],
] as const;

const FORMATS = [
  {
    title: "Takeaway Kiosk",
    text: "A single 10 or 20 ft container with a large serving window and a top-hinged awning that doubles as shade for your customers. It's perfect for coffee, chai, juices, shawarma, momos or ice cream. Small footprint, quick service, low running costs.",
  },
  {
    title: "Dine-In Cafe",
    text: "A 20 or 40 ft container with seating inside, wide glass panels or sliding doors along one side, and a compact kitchen at one end. Add an outdoor deck and you've roughly doubled your seating without adding another container.",
  },
  {
    title: "Container Restaurant with a Full Kitchen",
    text: "Two or more containers joined together. One becomes a proper working kitchen with an exhaust hood, stainless steel counters and a wash area, and the other becomes the dining room. We can cut out the walls between them to create one open space.",
  },
  {
    title: "Two-Storey and Rooftop Cafes",
    text: "Stack containers for a tall, eye-catching look, or turn the roof of a single container into a seating deck with a staircase and safety railings. The rooftop tables tend to fill up first, especially in the evenings. Both need a structural check of the loads before we confirm the design.",
  },
  {
    title: "Food Court Clusters",
    text: "Several kiosks arranged around a shared seating area. This works well for event venues, open spaces, highway food stops and campuses where people want a few options in one place.",
  },
] as const;

const SIZES = [
  ["10 ft", "10 x 8 ft", "Coffee or chai kiosk, ice cream counter, juice bar"],
  ["20 ft", "20 x 8 ft", "Takeaway cafe with a small counter and a few stools"],
  ["40 ft", "40 x 8 ft", "Cafe with a compact kitchen and indoor seating"],
  ["2 x 40 ft, side by side", "40 x 16 ft", "Restaurant with a separate kitchen and dining area"],
  ["Stacked units", "Two floors", "Signature cafe with upper-floor or rooftop seating"],
] as const;

const BUILD = [
  ["Structure", "A steel container body with every cut-out reinforced by a steel frame, plus anti-rust treatment and exterior-grade paint."],
  ["Insulation", "Insulated walls and roof to keep the heat out, finished with a clean inner wall."],
  ["Openings", "Serving windows with gas-strut awnings, glass sliding doors, fixed or fold-out glazing, and rolling shutters for security."],
  ["Kitchen", "Stainless steel counters, an exhaust hood and duct, a sink with water inlet and drain, plus space and power for fridges, ovens and coffee machines."],
  ["Electricals", "Concealed wiring, separate heavy-load circuits for appliances, a distribution board with MCBs, and lighting inside and for your signage."],
  ["Interiors", "Wall cladding, wooden or vinyl flooring, a false ceiling, built-in counters, bar tables and menu boards."],
  ["Exterior", "Your brand colours, vinyl wraps, LED signage, wooden cladding, pergolas, decks, planters and rooftop railings."],
  ["Safety", "Mounting points for fire extinguishers, proper earthing, and space planned for a gas line installed by a certified gas vendor."],
] as const;

const PROCESS = [
  ["Tell us about your cafe.", "What you'll serve, how many people you'd like to seat, where it's going and the budget you're working with. A rough sketch or a few reference photos help a lot."],
  ["Layout and design.", "We draw up the layout, covering the counter, kitchen, seating and windows, and agree the exterior colours and branding with you. Changes are easy at this stage, so take your time."],
  ["Fabrication and fit-out.", "We build the container at our unit. We cut and frame the openings, insulate, wire, plumb and finish the interiors to the agreed specification."],
  ["Site preparation.", "While we build, you get the base ready: a level plinth or concrete pedestals, with water, drainage and power points where the drawing shows them. We'll send you the exact measurements."],
  ["Delivery and setup.", "The cafe arrives on a trailer and is craned into place. Transport, crane placement, utility connections, anchoring and final setup are carried out as agreed in your approved quotation, and depend on your site conditions. Once everything is tested and handed over, it's your menu and your customers."],
] as const;

const COMPARISON = [
  ["Time to open", "Built off-site while you prepare the site", "Months of civil and interior work on site"],
  ["Upfront cost", "Usually lower, with no demolition or heavy civil work", "Deposit, civil work and interiors add up quickly"],
  ["If the lease ends", "Lift it and move it", "Interiors usually stay behind"],
  ["Visibility", "Stands out on its own", "Depends on the building and frontage"],
  ["Licences", "FSSAI, trade licence and local permissions", "The same"],
] as const;

const linkClass = "text-accent underline-offset-4 hover:underline font-medium";

function SectionHeading({ id, icon: Icon, children }: { id: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
      <Icon className="h-7 w-7 text-accent shrink-0" aria-hidden="true" />
      {children}
    </h2>
  );
}

/** A render with a visible caption. Every image on this page is AI-generated, and the caption
 *  begins by saying so — the gallery note alone is not enough once the reader has scrolled. */
function RenderFigure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl border border-border/60">
        <OptimizedImage
          src={src}
          alt={alt}
          aspectRatio="3/2"
          sizes="(max-width: 896px) 100vw, 896px"
          geoTag={false}
          className="w-full"
        />
      </div>
      <figcaption className="mt-2.5 text-sm text-muted-foreground italic">{caption}</figcaption>
    </figure>
  );
}

export function ContainerCafeRestaurantContent() {
  const [primaryPhone, secondPhone] = COMPANY.phones;
  return (
    <section className="max-w-4xl" aria-label="Container cafe and restaurant — full guide">
      <JsonLd data={generateFAQSchema(CONTAINER_CAFE_FAQS)} />

      {/* ------------------------------------------------ why containers ------------------- */}
      <div>
        <SectionHeading id="why-container-cafe" icon={Sparkles}>Why So Many New Cafes Are Starting in Containers</SectionHeading>
        <ul className="space-y-4">
          {WHY.map(([lead, rest]) => (
            <li key={lead} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{lead}</strong> {rest}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------ formats -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="formats" icon={LayoutGrid}>Container Cafe Formats We Build</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-card/50 p-5">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      <RenderFigure
        src="/images/products/container-cafe-restaurant/container-cafe-restaurant-front-exterior.webp"
        alt="Illustrative render of a two-storey container cafe concept with a glass-fronted upper container on steel columns"
        caption="Illustrative render, not a completed project: a two-storey concept with a glass-fronted dining container on steel columns above a ground-floor cafe. Stacked designs are confirmed only after a structural check."
      />

      {/* ------------------------------------------------ sizes ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="sizes" icon={Table2}>Sizes and What Fits Inside</SectionHeading>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm sm:text-base">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">Container</th>
                <th scope="col" className="px-4 py-3 font-semibold">Approx. footprint</th>
                <th scope="col" className="px-4 py-3 font-semibold">Works well as</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map(([container, footprint, use]) => (
                <tr key={container} className="border-t border-border/60">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{container}</th>
                  <td className="px-4 py-3 text-muted-foreground">{footprint}</td>
                  <td className="px-4 py-3 text-muted-foreground">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Taller &ldquo;high cube&rdquo; containers give you about a foot of extra headroom. That helps a lot
          once the false ceiling, lights and exhaust duct go in.
        </p>
      </div>

      {/* ------------------------------------------------ what goes in --------------------- */}
      <div className="mt-12">
        <SectionHeading id="what-goes-in" icon={Wrench}>What Goes Into Your Container Cafe</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          These are the parts we can build into your cafe. Your itemised quotation lists exactly which
          ones are included.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {BUILD.map(([title, text]) => (
            <div key={title} className="rounded-xl border border-border/60 border-l-4 border-l-accent bg-card/50 p-4">
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4 text-foreground leading-relaxed">
          We plan the kitchen around your menu. A coffee bar needs very different power and plumbing from a
          kitchen that&apos;s running a tandoor and two fryers.
        </p>
      </div>

      <RenderFigure
        src="/images/products/container-cafe-restaurant/container-cafe-restaurant-kitchen.webp"
        alt="Illustrative render of a container kitchen with stainless steel counters, exhaust hood and a garden-facing window"
        caption="Illustrative render, not a completed project: a container kitchen with stainless steel counters, an exhaust hood, a sink and space for appliances."
      />

      {/* ------------------------------------------------ heat ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="heat" icon={ThermometerSun}>Let&apos;s Talk About the Heat</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            It&apos;s the first thing everyone asks about, and it&apos;s a fair question. A bare steel container
            sitting in the sun gets hot, fast. Add a kitchen, a coffee machine and a lunchtime crowd, and it
            can get uncomfortable.
          </p>
          <p>
            That&apos;s why we treat insulation as part of the plan, not an afterthought. We recommend insulated
            walls and roof, windows placed for cross-ventilation, and a proper kitchen exhaust that pulls heat
            out instead of letting it build up. Your quotation spells out exactly what&apos;s included.
            We&apos;ll also help you choose the right AC size for the space, so you&apos;re not overpaying on
            electricity or sweating through peak hours. A pergola or shade sail over the deck makes a big
            difference too.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ process -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="process" icon={ClipboardList}>How We Build Your Container Cafe</SectionHeading>
        <ol className="space-y-4">
          {PROCESS.map(([lead, rest], i) => (
            <li key={lead} className="flex gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{lead}</strong> {rest}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <RenderFigure
        src="/images/products/container-cafe-restaurant/container-cafe-restaurant-aerial.webp"
        alt="Illustrative render of a stacked container cafe concept seen from above, with a lawn and outdoor seating"
        caption="Illustrative render, not a completed project: the stacked concept from above, with a deck, outdoor seating and a lawn."
      />

      {/* ------------------------------------------------ vs a shop ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="container-cafe-vs-shop" icon={Scale}>Container Cafe or a Regular Shop?</SectionHeading>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm sm:text-base">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Comparison</span></th>
                <th scope="col" className="px-4 py-3 font-semibold">Container cafe</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rented shop fit-out</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([row, container, shop]) => (
                <tr key={row} className="border-t border-border/60">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{row}</th>
                  <td className="px-4 py-3 text-muted-foreground">{container}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          To be fair, a container isn&apos;t the right answer for every location. On a busy high street with a
          good shop available, a regular fit-out might suit you better. But for open plots, short leases, and
          anywhere you want a cafe people talk about, a container is hard to beat.
        </p>
      </div>

      {/* ------------------------------------------------ who it suits --------------------- */}
      <div className="mt-12">
        <SectionHeading id="who-its-for" icon={Users}>Who a Container Cafe Works For</SectionHeading>
        <ul className="space-y-2.5">
          {[
            "First-time owners who want to start without a huge fit-out bill",
            "Established brands testing a new area before signing a long lease",
            "Resorts, farm stays and weekend getaways",
            "College and corporate campuses",
            "Highway food stops and petrol bunks",
            "Event venues, flea markets and food festivals",
          ].map((t) => (
            <li key={t} className="flex gap-3 text-muted-foreground leading-relaxed">
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
          <li className="flex gap-3 text-muted-foreground leading-relaxed">
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Real estate projects that want a cafe near the{" "}
              <Link href="/products/marketing-office" className={linkClass}>sales office</Link> or clubhouse
            </span>
          </li>
        </ul>
      </div>

      <RenderFigure
        src="/images/products/container-cafe-restaurant/container-cafe-restaurant-dining-interior.webp"
        alt="Illustrative render of the upper-floor dining room in a container restaurant concept, with full-height glazing"
        caption="Illustrative render, not a completed project: the upper-floor dining room of the two-storey concept, with full-height glazing on the garden side."
      />

      {/* ------------------------------------------------ price ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="price" icon={IndianRupee}>What Shapes the Price</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Every container cafe is built to order, so the price depends on what you&apos;re building. The main
          things that move it are:
        </p>
        <ul className="space-y-2.5">
          <li className="flex gap-3 text-muted-foreground leading-relaxed">
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            The number and size of containers
          </li>
          <li className="flex gap-3 text-muted-foreground leading-relaxed">
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              A{" "}
              <Link href="/products/used-shipping-container-for-sale" className={linkClass}>
                refurbished shipping container
              </Link>{" "}
              or a new container-style build
            </span>
          </li>
          {[
            "The kitchen setup, including counters, exhaust, plumbing and gas line provision",
            "Interiors, AC and lighting",
            "Glass work, awnings and shutters",
            "Exterior branding, decks, pergolas and rooftop seating",
            "Transport and crane to your site",
          ].map((t) => (
            <li key={t} className="flex gap-3 text-muted-foreground leading-relaxed">
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Tell us your format and your budget, and we&apos;ll show you what&apos;s possible at that number,
          with an itemised quote so nothing is hidden.
        </p>
      </div>

      {/* ------------------------------------------------ FAQs ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="faqs" icon={HelpCircle}>Questions People Ask Before Starting a Container Cafe</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {CONTAINER_CAFE_FAQS.map((f, i) => (
            <AccordionItem key={f.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ------------------------------------------------ CTA ------------------------------ */}
      <div className="mt-12 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
        <h2 id="get-a-quote" className="scroll-mt-24 font-display text-2xl font-bold text-foreground mb-2">
          Got a Cafe Idea? Let&apos;s Build It in a Container
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Tell us what you&apos;ll serve, where the cafe is going and a rough budget. We&apos;ll come back with
          a layout idea and a clear, itemised quote.
        </p>
        <dl className="mb-6 space-y-3 text-sm sm:text-base">
          <div className="flex gap-3">
            <dt className="shrink-0"><Phone className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" /><span className="sr-only">Call or WhatsApp</span></dt>
            <dd className="text-muted-foreground">
              <span className="font-medium text-foreground">Call / WhatsApp:</span>{" "}
              <a href={`tel:${primaryPhone.e164}`} className={`${linkClass} whitespace-nowrap`}>{primaryPhone.display}</a>
              {secondPhone && (
                <>
                  {" "}· Call:{" "}
                  <a href={`tel:${secondPhone.e164}`} className={`${linkClass} whitespace-nowrap`}>{secondPhone.display}</a>
                </>
              )}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="shrink-0"><Mail className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" /><span className="sr-only">Email</span></dt>
            <dd className="text-muted-foreground break-words">
              <span className="font-medium text-foreground">Email:</span>{" "}
              <a href={`mailto:${COMPANY.email.sales}`} className={linkClass}>{COMPANY.email.sales}</a>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="shrink-0"><MapPin className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" /><span className="sr-only">Office and factory</span></dt>
            <dd className="text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Office:</span>{" "}
                {formatAddress(COMPANY.addresses.bangaloreOffice)}
              </p>
              <p>
                <span className="font-medium text-foreground">Factory:</span>{" "}
                {formatAddress(COMPANY.addresses.tamilNaduFactory)}
              </p>
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Request a Quotation <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={`tel:${primaryPhone.e164}`}
            className="inline-flex items-center gap-2 rounded-lg border border-accent px-5 py-2.5 font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <Phone className="h-4 w-4" aria-hidden="true" /> Call Now
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  );
}
