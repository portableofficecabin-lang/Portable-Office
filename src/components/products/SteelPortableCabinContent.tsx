import Link from "next/link";
import {
  Ruler, Truck, ShieldCheck, Layers3, IndianRupee, Building2,
  ClipboardList, Phone, MessageCircle, ChevronRight, CheckCircle2, Wrench, HardHat,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";
import { BuyNowCTA } from "@/components/products/BuyNowCTA";

/**
 * Rich narrative content for the STEEL PORTABLE CABIN (products.ts id 46, SKU POC-PC-STEEL),
 * served at /products/steel-portable-cabin.
 *
 * The product template (ProductDetailServer) already renders the gallery, the price box, the
 * Specifications table and the key-features list. This component adds the owner's narrative:
 * why steel, the build walk-through, the size table, what drives the price, applications, the
 * steel-vs-container-vs-PUF comparison, site preparation, and an FAQ with FAQPage JSON-LD.
 *
 * ── THREE DEVIATIONS FROM THE SUPPLIED COPY, AND WHY ────────────────────────────────────────
 *
 * 1. NO RUPEE FIGURE ANYWHERE IN THIS COPY. The supplied draft stated "starts at Rs 5,19,200
 *    including 18% GST" in prose. That number is correct — sellPrice(440000) = 519200 — but a
 *    second, hand-typed price beside the live price box is exactly the drift that gets a
 *    Merchant offer disapproved, and "starts at" reads as a price range on a fixed-price
 *    offer. The price section below points at the one figure the template renders instead.
 *
 * 2. NO FOUNDING YEAR. The draft said "manufacturing since 2014". Four pages on this site
 *    have historically claimed 2010, 2014, 2020 and 2022, and src/lib/company.ts records no
 *    founding year at all — so, as with the Construction Individual Building page, this one
 *    states none. Add it here the day the owner confirms the year.
 *
 * 3. NO HOSKOTE FACTORY. The draft said "two plants near Hosur (Tamil Nadu) and Hoskote
 *    (Bengaluru)". The Hoskote works was retired from public display on 2026-08-09 (see the
 *    @deprecated note on COMPANY.addresses.karnatakaFactory); the Karnataka presence is the
 *    Electronic City office. The wording below matches the approved line already used in the
 *    site FAQ: manufacturing at the Tamil Nadu factory in Kamandoddi near Hosur, with a
 *    Bangalore office in Electronic City.
 *
 * ISO 9001:2015 and MSME/Udyam are kept — both are recorded in company.ts.
 */

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  telAlt: "+919019910931",
  telAltDisplay: "+91 90199 10931",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%27d%20like%20a%20quote%20for%20a%20steel%20portable%20cabin",
};

/** Size reference only — deliberately no price column. The cabin sold on this page has ONE
 *  fixed GST-inclusive price (the 20 x 10 ft build, shown in the price box above); publishing
 *  figures against the other sizes would contradict the cart, the JSON-LD offer and the feed. */
const SIZES: { size: string; area: string; use: string; priced?: boolean }[] = [
  { size: "10 × 8 × 8.5 ft", area: "80 sq ft", use: "Security cabin, ticket counter, small store" },
  { size: "20 × 8 × 8.5 ft", area: "160 sq ft", use: "2–4 person site office" },
  { size: "20 × 10 × 8.5 ft", area: "200 sq ft", use: "4–6 person manager’s office or meeting room", priced: true },
  { size: "30 × 10 × 8.5 ft", area: "300 sq ft", use: "Office with attached pantry or toilet" },
  { size: "40 × 10 × 8.5 ft", area: "400 sq ft", use: "8–12 person bunkhouse or open-plan office" },
];

const WHY_STEEL = [
  {
    icon: ShieldCheck,
    title: "It survives the site",
    body:
      "A steel cabin does not care about monsoon rain, dust, a forklift brushing past it, or being lifted by a crane for the fourth time. With a proper primer and topcoat, the frame and walls last 15 to 20 years or more on basic maintenance.",
  },
  {
    icon: Truck,
    title: "It moves with your projects",
    body:
      "When one site finishes, the cabin goes on a truck to the next one. Plenty of our customers have moved the same cabin four or five times over a decade. You are buying an asset, not a temporary arrangement.",
  },
  {
    icon: ClipboardList,
    title: "It is fast and predictable",
    body:
      "Because everything is done in the factory there are no site delays, no waiting for masons and no surprises in the bill. You get a fixed price, a fixed delivery window and a cabin that looks exactly like the one you approved.",
  },
];

const BUILD_NOTES: [string, string][] = [
  [
    "The frame carries everything",
    "Welded MS C-channel (75 × 40 mm) or RHS (50 × 50 × 3 mm) with galvanised C and Z purlins. It is one rigid welded box, which is what lets the cabin be craned off a trailer repeatedly without racking.",
  ],
  [
    "The walls do the temperature work",
    "1.5–2 mm MS sheet outside, 30–50 mm of glass wool or rock wool, then an interior finish sheet. The insulation is the difference between a steel box and a room you can air-condition.",
  ],
  [
    "The roof sheds water instead of holding it",
    "A sloping insulated MS roof with EPDM waterproofing. Flat roofs pond, and ponding is where leaks and rust start.",
  ],
  [
    "The floor takes site boots",
    "An 18 mm cement board base with a 2 mm vinyl finish — mops clean, does not dust up, and does not flex under a filing cabinet.",
  ],
  [
    "Openings are standard sections, not specials",
    "Aluminium sliding windows at 3 × 4 ft with tinted glass (mosquito mesh on request) and an MS flush door at 3 × 7 ft with lock, handle and stopper. Standard sizes mean spares are available anywhere in India.",
  ],
  [
    "Electricals arrive done",
    "6–10 points per 200 sq ft, concealed wiring, an MCB board, LED lights and modular switches. You connect one incoming line.",
  ],
  [
    "Paint is the whole corrosion story",
    "Epoxy zinc phosphate primer under a PU topcoat, in your colour. Skipping the primer is how a cheap cabin ends up rusting in its second monsoon.",
  ],
];

const APPLICATIONS = [
  "Construction site offices and labour colonies",
  "Security and guard posts at factory gates and gated communities",
  "Staff accommodation and bunkhouses",
  "Portable classrooms and training rooms",
  "Retail kiosks and food counters",
  "First-aid rooms and health booths",
  "Checkpoints for government departments and remote operations",
];

const RELATED = [
  {
    href: "/products/ms-portable-cabin",
    label: "MS Portable Cabin",
    note: "Our standard mild steel build, ready to order online",
  },
  {
    /* The material-selection hub (added 2026-09-05). It sells nothing — it explains MS vs GI vs
       PPGI vs container-grade and routes back here and to the MS page. */
    href: "/products/metal-portable-cabin",
    label: "Metal Portable Cabin",
    note: "Compare MS, galvanised and colour-coated skins before you choose",
  },
  {
    href: "/products/steel-portable-office-container",
    label: "Steel Portable Office Container",
    note: "Container-grade structure, stackable and spreader-liftable",
  },
  {
    href: "/products/guard-security-cabin",
    label: "Guard Security Cabin",
    note: "Compact gate and checkpoint cabins with all-round visibility",
  },
  {
    href: "/products/portable-cabin-40ft-bunkhouse",
    label: "Portable Cabin 40ft Bunkhouse",
    note: "40 ft accommodation block for 8–12 workers",
  },
];

const WARRANTY_QUESTION = "Is there a warranty?";

// Not exported: nothing outside this file consumes it, and a non-component export here
// trips the react-refresh/only-export-components lint rule.
const STEEL_PORTABLE_CABIN_FAQS: { question: string; answer: string }[] = [
  {
    question: "How long does a steel portable cabin last?",
    answer:
      "With the epoxy zinc phosphate primer and PU topcoat we use, 15 to 20 years is normal. Repaint every few years and keep the roof drains clear and it will go longer.",
  },
  {
    question: "Does it get hot inside?",
    answer:
      "A bare steel box would. Ours carry 30–50 mm of glass wool or rock wool insulation in the walls and roof, which keeps the inside noticeably cooler and makes air conditioning effective. For all-day AC use we recommend the PUF panel version.",
  },
  {
    question: "Can I move it later?",
    answer:
      "Yes — that is the whole point. The cabin is a single rigid unit with lifting points at the corners. A crane or hydra lifts it onto a trailer and it goes to the next site.",
  },
  {
    question: "Can you add a toilet or a partition?",
    answer:
      "Yes. Attached toilets, pantries, partition walls, extra doors and windows, false ceilings, AC points and inverter wiring are all common additions, and so is stacking a second unit as a G+1.",
  },
  {
    question: "What about rain and rust?",
    answer:
      "The roof slopes and is waterproofed with EPDM, and every steel surface gets epoxy zinc phosphate primer before the topcoat. Rust is a sign of a cheap cabin with no primer — not something you should see on ours.",
  },
  {
    question: WARRANTY_QUESTION,
    answer:
      "Yes. The terms are set out in full on our Warranty page, and our team is a phone call away for any service need.",
  },
  {
    question: "Do you deliver outside Tamil Nadu and Karnataka?",
    answer:
      "We deliver pan-India. Freight is calculated from your delivery pincode and shown before you confirm the order, so you see the full landed cost before you pay.",
  },
  {
    question: "What do I need ready on site before delivery?",
    answer:
      "Very little. A level base — compacted ground, a PCC bed or concrete blocks at the corners — truck access for a 20 or 40 ft trailer, and a clear spot for the crane or hydra to set the cabin down. Then connect a single power line. Water and drainage apply only if you have chosen an attached toilet or pantry.",
  },
];

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
      <Icon className="h-7 w-7 text-accent shrink-0" />
      {children}
    </h2>
  );
}

function Figure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl border border-border/60">
        <OptimizedImage src={src} alt={alt} aspectRatio="4/3" className="w-full" />
      </div>
      <figcaption className="mt-2.5 text-sm text-muted-foreground italic">{caption}</figcaption>
    </figure>
  );
}

export function SteelPortableCabinContent() {
  return (
    <section className="max-w-4xl" aria-label="Steel portable cabin — full guide">
      <JsonLd data={generateFAQSchema(STEEL_PORTABLE_CABIN_FAQS)} />

      {/* ------------------------------------------------ the hook ------------------------- */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          A Site Office That Arrives Finished
        </h2>
        <p>
          If you have ever waited three months for a brick-and-mortar site office, you already know
          why steel portable cabins exist. We build the whole cabin in our factory — frame, walls,
          roof, floor, wiring, doors and windows — then load it onto a truck and place it on your
          site. Most of our customers are working inside it the same day it arrives.
        </p>
        <p>
          Portable Office Cabin manufactures steel cabins at our Tamil Nadu factory in Kamandoddi,
          near Hosur, with a Bangalore office in Electronic City for sales and support. We are
          GST-registered and MSME registered, and we have supplied everything from a single
          guard cabin to full labour colonies for infrastructure projects. This page covers what
          goes into our steel cabins, the sizes we keep ready, what drives the price, and how to
          decide whether steel is the right choice for you.
        </p>
      </div>

      <Figure
        src="/images/products/steel-portable-cabin/steel-portable-cabin-front.webp"
        alt="Steel portable cabin front elevation with insulated walls, grilled sliding windows and a flush entrance door"
        caption="The front elevation of a 20 × 10 ft steel portable cabin — welded MS frame, insulated profiled walls, grilled sliding windows and a lockable flush door."
      />

      {/* ------------------------------------------------ why steel ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="why-steel" icon={ShieldCheck}>Why Choose a Steel Portable Cabin</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-6">
          There are three reasons people keep coming back to steel.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {WHY_STEEL.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 inline-flex rounded-lg bg-accent/10 p-2.5">
                <item.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ the build ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="build" icon={Wrench}>What Goes Into the Cabin</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          We get asked &ldquo;what steel do you use?&rdquo; a lot. The full component list is in the
          specification table above; here is why each part is what it is.
        </p>
        <ul className="space-y-4">
          {BUILD_NOTES.map(([title, body]) => (
            <li key={title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground leading-relaxed">
                <strong className="font-semibold text-foreground">{title}.</strong> {body}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Every cabin is checked for square, weld quality, wiring and water-tightness before it
          leaves the factory.
        </p>
      </div>

      <Figure
        src="/images/products/steel-portable-cabin/steel-portable-cabin-interior-office.webp"
        alt="Interior of a steel portable cabin fitted out as a site office with desks, storage and LED lighting"
        caption="The same cabin inside — insulated lined walls, vinyl flooring, concealed wiring and LED lighting, handed over ready to occupy."
      />

      {/* ------------------------------------------------ sizes ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="sizes" icon={Ruler}>Sizes We Keep Ready</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          These are the sizes we build most often, so they ship fastest. Anything else is built to
          order. The 20 × 10 ft build is the one priced on this page.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Size (L × W × H)</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Floor area</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Works well as</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((row, index) => (
                <tr key={row.size} className={index % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">
                    {row.size}
                    {row.priced && (
                      <span className="ml-2 align-middle rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        Priced here
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{row.area}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Need something different — a partitioned office, an attached toilet block, a G+1 stacked
          unit? Tell us what you need and we will draw it up.
        </p>
      </div>

      {/* ------------------------------------------------ price ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="price" icon={IndianRupee}>What the Price Covers</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The steel cabin listed on this page is sold at the single price shown at the top of the
          page, inclusive of 18% GST. That price covers the frame, insulated walls and roof,
          flooring, one door, two windows and the full electrical fit-out of the 20 × 10 ft build.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Transport is calculated from your delivery pincode at checkout. On-site installation and
          positioning — levelling the base, placing the unit and handover, with crane or hydra
          charges included for a standard single-unit placement — is a separate optional line item
          you can add there. Both are shown before you pay. Other sizes and specifications are
          quoted separately: what moves the figure is size, sheet thickness, insulation thickness,
          the number of doors and windows, and extras such as AC provision, a false ceiling or an
          attached toilet.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Send us your size and location and we will usually come back with a drawing and a fixed
          quote the same working day. You can also order the standard build directly online with
          UPI, cards or net banking, secured by Razorpay.
        </p>
      </div>

      {/* ------------------------------------------------ applications --------------------- */}
      <div className="mt-12">
        <SectionHeading id="applications" icon={HardHat}>Where Steel Portable Cabins Are Used</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Our steel cabins are working right now as:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPLICATIONS.map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          If your use case is not on this list, it probably still works — the cabin is a steel shell
          that we fit out to suit whatever you are doing inside it.
        </p>
      </div>

      <Figure
        src="/images/products/steel-portable-cabin/steel-portable-cabin-ventilated-unit.webp"
        alt="Steel portable cabin in a two-tone site finish with louvred ventilation windows and a steel flush door"
        caption="The same shell in a plainer site finish — louvred ventilation instead of glazing, for stores, plant rooms and worker accommodation."
      />

      {/* ------------------------------------------------ comparison ----------------------- */}
      <div className="mt-12">
        <SectionHeading id="comparison" icon={Layers3}>Steel Cabin, Container Office or PUF Cabin?</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          This is the question we help customers with most, so here is the honest comparison. We
          build all three, so none of this is a pitch for one against another.
        </p>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">Steel portable cabin — this page</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A purpose-built welded MS frame with insulated steel walls. Best value for offices,
              security cabins and accommodation where you want proper insulation without paying
              container prices, and the easiest of the three to customise — any door, window or
              partition layout you like, and 10 ft widths a container module cannot give you. Our{" "}
              <Link href="/products/ms-portable-cabin" className="font-medium text-accent underline-offset-4 hover:underline">
                MS portable cabin
              </Link>{" "}
              page covers the same build from the material side.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">Steel office container</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Container-form units on an ISMC/RHS structural steel frame, clad in 1.2–1.6 mm MS or
              galvanised sheet with 40–60 mm insulation, in 10, 20, 30 and 40 ft lengths. Choose it
              when you want the container footprint and finish, or when you need to stack — it is
              built for G+1 and G+2 configurations with a staircase. The layout is more constrained
              by the container module than a purpose-built cabin. See the{" "}
              <Link href="/products/steel-portable-office-container" className="font-medium text-accent underline-offset-4 hover:underline">
                steel portable office container
              </Link>{" "}
              page.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">PUF panel cabin</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The same steel frame, but the walls are factory-made PUF sandwich panels. The best
              choice if the room will be air-conditioned all day — a clinic, a control room, an
              executive office through a Chennai summer — because a sealed foam core holds
              temperature in a way sheet-and-wool walls do not. Our{" "}
              <Link href="/products/portable-cabin/materials-ms-vs-puf" className="font-medium text-accent underline-offset-4 hover:underline">
                MS sheet vs PUF panel comparison
              </Link>{" "}
              goes through it in detail.
            </p>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Not sure? Send us a photo of the site and a line about how the cabin will be used, and we
          will tell you which one we would buy.
        </p>
      </div>

      {/* ------------------------------------------------ site prep ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="site" icon={Truck}>What You Need on Site Before Delivery</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Very little. A level base — compacted ground, a PCC bed or concrete blocks at the corners
          — is enough. We need truck access for a 20 or 40 ft trailer and a clear spot for the crane
          or hydra to set the cabin down. Once placed, you connect a single power line and the cabin
          is ready. Water and drainage connections apply only if you have chosen an attached toilet
          or pantry.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          We deliver across India. Dispatch from the factory is 7 to 15 working days depending on
          size and customisation; door to door, allow 7 to 21 working days once transit to your
          pincode is added. Freight is calculated from that pincode at checkout.
        </p>
      </div>

      {/* ------------------------------------------------ FAQ ------------------------------ */}
      <div className="mt-12">
        <SectionHeading id="faq" icon={ClipboardList}>Frequently Asked Questions</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {STEEL_PORTABLE_CABIN_FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`steel-portable-cabin-faq-${index}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {faq.answer}
                {faq.question === WARRANTY_QUESTION && (
                  <>
                    {" "}
                    <Link href="/warranty" className="font-medium text-accent underline-offset-4 hover:underline">
                      Read the warranty terms
                    </Link>
                    .
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ------------------------------------------------ related -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="related" icon={Building2}>Related Products</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {RELATED.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/50 hover:bg-muted/40"
            >
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
              <span>
                <span className="block font-semibold text-foreground">{item.label}</span>
                <span className="block text-sm text-muted-foreground">{item.note}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ CTA ------------------------------ */}
      <div className="mt-12 rounded-3xl bg-accent/10 p-6 md:p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Talk to Us</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Send us your size, location and what the cabin is for, and we will come back with a drawing
          and a fixed quote — usually the same working day. Or order the standard build online and we
          will schedule the dispatch.
        </p>
        <BuyNowCTA productId="46" />
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`tel:${CONTACT.tel}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="h-4 w-4" />
            {CONTACT.telDisplay}
          </a>
          <a
            href={`tel:${CONTACT.telAlt}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="h-4 w-4" />
            {CONTACT.telAltDisplay}
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Monday to Saturday, 7 AM to 10 PM. MSME registered, with
          manufacturing at our Tamil Nadu factory in Kamandoddi, near Hosur.
        </p>
      </div>
    </section>
  );
}
