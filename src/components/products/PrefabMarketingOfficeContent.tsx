import Link from "next/link";
import {
  Ruler, Timer, Sparkles, Table2, Recycle, IndianRupee, Globe2,
  ClipboardList, Phone, MessageCircle, ChevronRight, CheckCircle2, LayoutGrid,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";

// Rich narrative content for the PREFAB Marketing Office — the PRODUCT CHILD of the
// container Marketing Office (products.ts id 44, parentSlug "marketing-office"), served
// at /products/marketing-office/prefab-marketing-office. The product template
// (ProductDetailServer) renders the gallery, price box, specifications and key features;
// this component adds the owner's narrative: why prefab over containers, the assembly
// story, the spec-from-the-customer's-chair section, configurations, relocation, buy vs
// rent, the process and an FAQ with FAQPage JSON-LD.
// PRICED (Aug 2026): ₹1,16,00,000 incl. GST via productCommerce.ts (basePrice
// 9830508.47) — the template renders the figure and Buy Now/Add to Cart. This copy
// carries NO ₹ figure of its own, so the commerce source of truth can never be
// contradicted here.

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%27m%20launching%20a%20project%20and%20need%20a%20prefab%20marketing%20office",
};

export const PREFAB_MARKETING_OFFICE_FAQS: { question: string; answer: string }[] = [
  {
    question: "How is this different from your container marketing office?",
    answer:
      "A container arrives as a finished box and is working the same day — but it's 8 ft wide per module and needs a crane. Prefab is assembled on site over a few days, spans any width as one hall, follows your floor plan exactly, and reaches sites a trailer can't. We build both and we'll tell you plainly which fits your launch.",
  },
  {
    question: "How long does assembly take?",
    answer:
      "A single hall, three to five working days. A full multi-room gallery, about a week to ten days. Fabrication before that is two to four weeks depending on the specification.",
  },
  {
    question: "Does it need a foundation?",
    answer:
      "Not a conventional one. A level plinth or a simple concrete base does it, and we'll specify exactly what's needed for your soil before anything is fabricated.",
  },
  {
    question: "Will it look temporary?",
    answer:
      "Not unless you want it to. Insulated panels, a proper roof line, glass frontage and full branding read as a designed pavilion. Buyers judge what they see, and what they see is a finished building.",
  },
  {
    question: "Can it really be moved?",
    answer:
      "Yes — it unbolts. Dismantling is a few days, and the structure is designed to make the trip several times. Some panels and fasteners get renewed between moves; we're upfront about that in the costing.",
  },
  {
    question: "What about summer heat?",
    answer:
      "Insulated walls and roof, overhangs shading every wall, and AC sized to the actual hall volume. A big glass frontage adds heat load, and we spec the cooling honestly to match it.",
  },
  {
    question: "Can you match our project branding?",
    answer:
      "Send the creative. Exterior paint or vinyl wrap, signage band, interior display walls sized for your renders — all built to it.",
  },
  {
    question: "How does payment work?",
    answer:
      "Advance on order confirmation, balance against delivery and assembly milestones. Rentals are monthly against a refundable deposit.",
  },
];

function SectionHeading({ id, icon: Icon, children }: { id: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
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

export function PrefabMarketingOfficeContent() {
  return (
    <section className="max-w-4xl" aria-label="Prefab marketing office — full guide">
      <JsonLd data={generateFAQSchema(PREFAB_MARKETING_OFFICE_FAQS)} />

      {/* ------------------------------------------------ the hook ------------------------- */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          A Sales Gallery Built to Your Plan, Up in Days
        </h2>
        <p>
          Some launches fit in a container. Plenty don&apos;t. When the master plan needs a table of
          its own, the scale model needs walking-around room, and Saturday footfall means six
          families in the gallery at once, you need width — and width is exactly what a prefab
          structure gives you.
        </p>
        <p>
          A prefab marketing office isn&apos;t a box that arrives on a trailer. It&apos;s a building
          system: insulated wall panels, a steel truss roof, doors, windows and flooring, all
          fabricated in our workshop and assembled on your site in a matter of days. Any footprint,
          any layout, one large open hall or a warren of cabins — the plan is yours, we build to it.
        </p>
        <p>
          And when the project sells out, it doesn&apos;t become demolition debris. The same panels
          unbolt, load onto a truck, and stand up again at your next launch.
        </p>
      </div>

      <Figure
        src="/images/products/prefab-marketing-office-roof-overhangs.webp"
        alt="Prefab marketing office at a project site with pitched truss roof and wide frontage"
        caption="A prefab marketing office assembled on site — insulated panel walls, steel truss roof with wide overhangs, and a frontage sized for real footfall."
      />

      {/* ------------------------------------------------ why prefab ----------------------- */}
      <div className="mt-12">
        <SectionHeading id="why-prefab" icon={LayoutGrid}>Why Prefab, When Containers Exist</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          We build both — this page&apos;s parent is our{" "}
          <Link href="/products/marketing-office" className="text-accent underline-offset-4 hover:underline font-medium">
            container marketing office
          </Link>
          {" "}— so this isn&apos;t a sales pitch for one against the other. It&apos;s the honest split we
          walk customers through every week.
        </p>
        <ul className="space-y-4">
          {[
            ["Width.", "A container is a fixed 8 ft wide, and joining modules gets you multiples of that. A prefab hall spans clear width without internal walls forced on you by the module — 20, 30, 40 ft across as one open gallery. For a scale model with families walking around it, that's the whole game."],
            ["Layout freedom.", "Reception here, model gallery there, two closing cabins, a pantry behind, washrooms attached at the back — drawn on your plan, built to it. You're not composing a floor out of 8-foot strips."],
            ["Ceiling height and light.", "The truss roof gives you height a container can't, and that height is what makes a gallery feel like a pavilion instead of a cabin. Add windows on every wall — where you want them, sized how you want them."],
            ["Access.", "A container needs a crane and room to swing it. Prefab panels come off a truck by hand. If your site is up a narrow approach road, behind a gate a trailer can't turn into, or on a floor a crane can't reach, prefab is often the only answer anyway."],
          ].map(([lead, rest]) => (
            <li key={lead} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{lead}</strong> {rest}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4 text-foreground leading-relaxed">
          Short version: fixed sizes and same-day placement, choose a container. A bigger gallery,
          your own floor plan, or a tight-access site — prefab. Tell us the situation and we&apos;ll
          tell you which, without pushing either.
        </p>
      </div>

      {/* ------------------------------------------------ speed ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="speed" icon={Timer}>Up in Days, Not Months</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The panels, trusses, doors and windows are all made in our workshop while your launch
            campaign is being designed. What happens at your site is assembly, not construction —
            bolting, not bricklaying.
          </p>
          <p>
            A typical single-hall marketing office goes up in three to five working days. A larger
            multi-room gallery, roughly a week to ten days. There&apos;s no curing time, no
            plastering, no painting crew living on your most visible corner for a season. The site
            stays clean, and the office is ready before the hoardings have finished going up along
            the road.
          </p>
        </div>
      </div>

      <Figure
        src="/images/products/prefab-marketing-office-hall-interior.webp"
        alt="Interior of a prefab marketing office with open hall, truss ceiling and tiled floor"
        caption="The clear span inside — no forced walls, one open floor under the truss roof. Model table in the middle, renders on the walls, and room for a crowd."
      />

      {/* ------------------------------------------------ specified ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="spec" icon={Sparkles}>Specified From the Customer&apos;s Chair</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Like everything we build for sales rather than survival, the spec starts with how it
          feels to walk in.
        </p>
        <ul className="space-y-4">
          {[
            ["Cool on arrival.", "PUF or rockwool insulated panels on walls and roof, wide roof overhangs shading the walls, and AC provision sized for the hall — not a token window unit fighting a tin roof."],
            ["Finished like an interior.", "Tiled or laminate flooring, panelled walls ready to carry renders and floor plans, LED lighting placed for display walls, and a false ceiling in the closing cabins where you want the conversation to feel private and settled."],
            ["Branded end to end.", "The exterior takes paint or vinyl in your project's creative. The entry face can carry a portal frame, signage band or full-height glazing — the things that make a temporary building read as a designed one."],
            ["The details that close sales.", "A washroom that families can actually use. A pantry for the tea round. A shaded verandah under the roof overhang where the overflow waits on a launch weekend instead of standing in the sun."],
          ].map(([lead, rest]) => (
            <li key={lead} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <span className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{lead}</strong> {rest}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Figure
        src="/images/products/prefab-marketing-office-exterior-screen.webp"
        alt="Steel truss roof of a prefab marketing office with wide overhangs and floodlights"
        caption="The truss roof with its overhangs — shade for the walls, cover for the verandah, and floodlights for the evening walk-ins."
      />

      {/* ------------------------------------------------ configurations ------------------- */}
      <div className="mt-12">
        <SectionHeading id="configurations" icon={Table2}>Configurations We Build</SectionHeading>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm sm:text-base">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Configuration</th>
                <th className="px-4 py-3 font-semibold">Footprint</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["As listed on this page", "165 ft × 58 ft", "The complete launch-ready compound this page prices"],
                ["Single hall", "~20 × 20 ft up", "Plotted layouts, early-stage launch presence"],
                ["Hall + cabins", "~20 × 40 ft up", "Apartment launches — gallery, closing rooms, pantry"],
                ["Full sales gallery", "~30 × 60 ft up", "Townships and villa projects with weekend crowds"],
                ["Custom plan", "To your drawing", "Anything the architect has already imagined"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium text-foreground">{a}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 mb-3 font-semibold text-foreground">Standard on every build:</p>
        <ul className="space-y-2.5">
          {[
            "Steel structural frame and truss roof, anti-corrosive primer, industrial paint finish",
            "PUF or rockwool insulated sandwich panels, walls and roof",
            "Roof overhangs on all sides, with verandah depth on the entry face if you want it",
            "Tile, vinyl or laminate flooring",
            "Powder-coated aluminium windows with grills and mesh, sized and placed to your plan",
            "Concealed wiring, MCB distribution board, LED lighting, ample switch and socket points for screens and displays",
            "External floodlights along the roof line",
            "AC provision sized to the hall volume",
            "Lockable doors, fire extinguisher points, fire-retardant panel options on request",
          ].map((t) => (
            <li key={t} className="flex gap-3 text-muted-foreground leading-relaxed">
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Washrooms, pantry, false ceilings, glass frontage, partitions, furniture and full
          branding are specified per project.
        </p>
      </div>

      {/* ------------------------------------------------ relocation ----------------------- */}
      <div className="mt-12">
        <SectionHeading id="relocation" icon={Recycle}>Sells Out? Unbolt It and Take It to the Next One</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            A masonry marketing office ends as rubble and a re-levelling bill. A prefab one comes
            apart the way it went together. The panels, trusses and joinery load onto a truck,
            travel to your next site, and stand up again — re-wrapped in the new project&apos;s
            branding.
          </p>
          <p>
            Developers with a pipeline treat the gallery as launch infrastructure, not a
            per-project cost. One structure, four or five launches, and the economics stop being a
            comparison at all.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ buy or rent ---------------------- */}
      <div className="mt-12">
        <SectionHeading id="buy-or-rent" icon={IndianRupee}>Buy or Rent</SectionHeading>
        <p className="text-muted-foreground leading-relaxed">
          One project? Rent it for the sales period and we dismantle and collect when you&apos;re
          sold out. A pipeline? Buy it and relaunch with it for years. Tell us your sales timeline
          and we&apos;ll show you both numbers side by side — and if renting is the cheaper call for
          your case, we&apos;ll say exactly that.
        </p>
      </div>

      {/* ------------------------------------------------ beyond real estate --------------- */}
      <div className="mt-12">
        <SectionHeading id="beyond" icon={Globe2}>Beyond Real Estate</SectionHeading>
        <p className="text-muted-foreground leading-relaxed">
          The same system, re-specified, turns up as exhibition pavilions, election and event
          offices, vehicle sales outposts, bank enquiry centres, temporary showrooms during
          fit-outs, and admission offices for schools and colleges. If the brief is{" "}
          <em className="text-foreground not-italic font-medium">
            look designed, open fast, come apart later
          </em>
          , the answer is usually the same panels.
        </p>
      </div>

      {/* ------------------------------------------------ process -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="process" icon={ClipboardList}>From Drawing to First Walk-In</SectionHeading>
        <ol className="space-y-4">
          {[
            ["Tell us the project.", "What you're selling, expected footfall, the site, and any plan you already have."],
            ["We send a layout and a price.", "Itemised — structure, transport and assembly shown separately — usually inside 24 hours."],
            ["You approve the drawing.", "Layout, finishes and exterior creative, before fabrication starts."],
            ["We fabricate.", "Panels, trusses and joinery made and checked at our workshop."],
            ["We assemble at your site.", "Typically three to ten days depending on size."],
            ["Handover.", "Swept, connected, keys to your sales head."],
          ].map(([lead, rest], i) => (
            <li key={lead} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{lead}</strong> {rest}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ------------------------------------------------ FAQs ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="faqs" icon={Ruler}>Questions We Get</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {PREFAB_MARKETING_OFFICE_FAQS.map((f, i) => (
            <AccordionItem key={f.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ------------------------------------------------ CTA ------------------------------ */}
      <div className="mt-12 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Launching Soon? Send Us the Plan
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-5">
          The project, the expected footfall, and the date the campaign breaks. If you have a
          sketch or a floor plan, send that too. You&apos;ll have a layout and a clear price inside
          a day.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`tel:${CONTACT.tel}`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Phone className="h-4 w-4" /> Call Now
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-accent px-5 py-2.5 font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp Us
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Request a Free Quote <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
