import Link from "next/link";
import {
  Zap, Sparkles, LayoutGrid, Table2, Recycle, IndianRupee, Users2,
  ClipboardList, Phone, MessageCircle, ChevronRight, CheckCircle2, Ruler,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";

// Rich narrative content for the Marketing Office PRODUCT page (owner-approved copy).
// The product template (ProductDetailServer) already renders the image gallery, the
// price box, specifications and key features — this component adds the story sections,
// the sizes table, the buy-vs-rent split, the process, and an FAQ with FAQPage JSON-LD.
// PRICED (Aug 2026): ₹84,00,000 incl. GST via productCommerce.ts (basePrice 7118644) —
// the template renders the figure and Buy Now/Add to Cart. This copy still carries NO
// ₹ figure of its own, so the commerce source of truth can never be contradicted here.

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%27m%20launching%20a%20project%20and%20need%20a%20marketing%20office",
};

export const MARKETING_OFFICE_FAQS: { question: string; answer: string }[] = [
  {
    question: "How fast can a marketing office be at my site?",
    answer:
      "A stock unit with standard finish, under a week. A branded sales gallery built to your layout, usually 2 to 4 weeks. Either way, weeks — not the months a built office takes.",
  },
  {
    question: "Will customers know it's a container?",
    answer:
      "From inside, no — false ceiling, tiled floor and panelled walls see to that. From outside, only if you want the industrial look, which some brands deliberately do. A glass front and full branding wrap read as a modern sales pavilion.",
  },
  {
    question: "Can you match our project branding exactly?",
    answer:
      "Yes. Send the creative and brand colours; the exterior is painted or vinyl-wrapped to it, and interior display walls are sized for your renders and plans.",
  },
  {
    question: "What about power and AC at a bare site?",
    answer:
      "The cabin is wired and AC-ready; it runs off a temporary connection or a genset. Tell us your power situation and we'll spec the load honestly.",
  },
  {
    question: "Do we need any civil work?",
    answer:
      "Firm, level ground is enough. On loose soil, a few concrete pedestals — we'll specify them before delivery.",
  },
  {
    question: "Can it move to our next project?",
    answer:
      "That's the point. Lift, transport, re-wrap in the next project's branding, relaunch. The structure is built to make that trip many times.",
  },
  {
    question: "Is a washroom really necessary?",
    answer:
      "If site visits run longer than twenty minutes and families come with children — yes. It's the difference between a visit that gets cut short and one that ends at the negotiation table.",
  },
  {
    question: "How does payment work?",
    answer:
      "Advance on order confirmation, balance before dispatch. Rentals are monthly against a refundable deposit.",
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

export function MarketingOfficeContent() {
  return (
    <section className="max-w-4xl" aria-label="Marketing office containers — full guide">
      <JsonLd data={generateFAQSchema(MARKETING_OFFICE_FAQS)} />

      {/* ------------------------------------------------ the hook ------------------------- */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Marketing Office Containers That Sell Before the Project Does
        </h2>
        <p>
          Every project has an awkward first year. The land is ready, the approvals are in, the
          brochures are printed — but the thing you&apos;re selling doesn&apos;t exist yet. All a customer can
          see is a hoarding and an empty site. The marketing office is what stands in that gap, and
          for a while, it <em className="text-foreground not-italic font-medium">is</em> the project.
        </p>
        <p>
          Which is why a leaky shed with a plastic table does real damage. A buyer who&apos;s about to
          commit forty lakhs — or four crores — reads everything at the site as a preview of what
          you&apos;ll deliver. The office they walk into is the first square foot of your project they
          ever stand inside.
        </p>
        <p>
          We build marketing offices out of container modules and deliver them finished. Insulated,
          air-conditioned, tile-floored, lit properly, wrapped in your project branding inside and
          out. It arrives on a trailer, gets set down in a morning, and your sales team is closing in
          it the same week your hoarding goes up.
        </p>
      </div>

      <Figure
        src="/images/products/marketing-office-main.webp"
        alt="Marketing Office container pavilion with glass front, timber-slat canopy band and branded exterior"
        caption="A container marketing office set down and handed over — canopy roof, clean lines, ready for your branding and your first walk-in."
      />

      {/* ------------------------------------------------ speed --------------------------- */}
      <div className="mt-12">
        <SectionHeading id="speed" icon={Zap}>Fast Matters More Here Than Anywhere</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            A site office for engineers can wait a month without costing much. A marketing office
            can&apos;t. Every week it isn&apos;t standing is a week of launch enquiries with nowhere to land —
            and launch-window enquiries are the cheapest, warmest leads your project will ever get.
          </p>
          <p>
            That&apos;s the argument for containers over civil construction, in one line: a built
            marketing office takes three to four months of masonry, plastering, wiring and finishing
            on your most visible corner. Ours is fabricated off-site while your team works on the
            launch, and lands finished. Stock units go out in days. Fully custom builds take two to
            four weeks.
          </p>
          <p className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-foreground">
            The maths is blunt. If your marketing office opens two months earlier and books even two
            units in that time, it has paid for itself several times over.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ built to impress ----------------- */}
      <div className="mt-12">
        <SectionHeading id="impress" icon={Sparkles}>Built to Impress, Not Just to Stand</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          A marketing office has a different job from every other cabin we make. A site office has
          to survive. A marketing office has to persuade. So the specification starts from the
          customer&apos;s chair, not from the steel.
        </p>
        <ul className="space-y-4">
          {[
            ["Cool the moment they enter.", "Insulated PUF or rockwool panels, a canopy roof that keeps direct sun off the cabin entirely, and split AC as standard. A buyer who's comfortable stays longer, and a buyer who stays longer asks about payment plans."],
            ["Finished like an interior, not a container.", "False ceiling with recessed lighting, vitrified tile or laminate wood flooring, glass partition for the manager's cabin, and wall panels ready to carry your renders and floor plans. Nobody should be able to tell from the inside that they're in a container."],
            ["Branded outside, end to end.", "The exterior is painted or vinyl-wrapped in your project's colours and creative. From the road, it's not a cabin — it's your first hoarding you can walk into."],
            ["A glass front if you want one.", "Full-height glazing on the entry face changes the entire read of the unit. It's the single upgrade that makes visitors stop treating it as temporary."],
          ].map(([lead, rest]) => (
            <li key={lead} className="flex gap-3 text-muted-foreground leading-relaxed">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <span><strong className="text-foreground">{lead}</strong> {rest}</span>
            </li>
          ))}
        </ul>
        <Figure
          src="/images/products/marketing-office-interior.webp"
          alt="Marketing office interior with panelled walls, display lighting and seating area"
          caption="Inside — insulated panel walls, tiled floor, lighting placed for display walls rather than desks. Add the model table and it's a sales gallery."
        />
      </div>

      {/* ------------------------------------------------ layouts -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="layouts" icon={LayoutGrid}>Layouts That Match How You Sell</SectionHeading>
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Single-module sales office — 20 or 40 ft</h3>
            <p className="text-muted-foreground leading-relaxed">
              Reception desk, seating for two or three families, a display wall for the master plan,
              and a closing corner with a little privacy. The right size for a plotted development or
              a single-tower launch.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Sales gallery — two or three modules joined</h3>
            <p className="text-muted-foreground leading-relaxed">
              An open gallery for the scale model and renders, a discussion area, a private closing
              cabin, a pantry and a washroom. This is the configuration most apartment projects take,
              and joined properly, the floor reads as one seamless space.
            </p>
          </div>
        </div>
        <Figure
          src="/images/products/marketing-office-gallery-hall.webp"
          alt="Open double-height sales gallery floor inside a joined-module marketing office"
          caption="Modules joined into one open gallery floor. From the end, the join line is the only clue there were ever two units."
        />
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Double-storey — gallery below, office above</h3>
            <p className="text-muted-foreground leading-relaxed">
              Stack a second module and the sales team, CRM desk and back office move upstairs,
              leaving the whole ground floor to customers. Same footprint, twice the function —
              useful when the marketing office has to sit on a corner you&apos;d rather keep small.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Add-ons that earn their keep</h3>
            <ul className="space-y-2">
              {[
                "Attached or standalone washroom — non-negotiable if families visit, and they do",
                "Pantry counter for the tea that every serious negotiation in this country runs on",
                "Covered deck or pergola at the entry, which doubles as a waiting area on busy weekends",
                "Security cabin at the site gate, matched to the same branding",
                "CCTV wiring, networking points and a server corner for your CRM setup",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-muted-foreground leading-relaxed">
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ sizes table ---------------------- */}
      <div className="mt-12">
        <SectionHeading id="sizes" icon={Table2}>Sizes at a Glance</SectionHeading>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm sm:text-base">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Configuration</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
                <th className="px-4 py-3 font-semibold">Comfortable for</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["40 ft × 65 ft compound — as listed", "The complete launch-ready sales gallery this page prices", "Launch-weekend crowds, several families in parallel"],
                ["20 ft single", "Plotted layouts, early-stage presence", "Reception + 1 family at a time"],
                ["40 ft single", "Single-tower or villa project", "Reception + 2–3 families"],
                ["2–3 joined", "Full sales gallery with model area", "Walk-in weekend crowds"],
                ["Stacked", "Gallery + back office on one footprint", "Sales team upstairs, buyers below"],
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
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Standard on every marketing unit:</strong> insulated
          panels, canopy roof, split AC provision, false ceiling, vitrified tile or laminate floor,
          concealed wiring with ample points for displays and screens, LED lighting, external
          floodlights, lockable doors and a fire extinguisher point. Branding, glass front,
          partitions, furniture and washrooms are specified per project.
        </p>
        {/* Product child cross-link — the prefab build lives at the nested URL under this page. */}
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
          <p className="text-foreground leading-relaxed">
            <strong>Need more width than a container gives?</strong> When the scale model needs
            walking-around room and Saturday footfall means six families at once, see our{" "}
            <Link
              href="/products/marketing-office/prefab-marketing-office"
              className="text-accent font-semibold underline-offset-4 hover:underline"
            >
              Prefab Marketing Office
            </Link>
            {" "}— a clear-span sales gallery built to your floor plan, assembled on site in days.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ reuse ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="reuse" icon={Recycle}>When the Project Sells Out, the Office Moves On</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            This is the part civil construction can never answer. A built marketing office ends its
            life as debris — you pay to put it up, then you pay to tear it down, then you hand over a
            corner plot that spent three years as a sales office.
          </p>
          <p>
            A container marketing office gets lifted onto a trailer and goes to your next launch.
            Re-wrap the exterior in the new project&apos;s branding and it starts again. Developers
            running multiple projects effectively buy one office and launch with it four or five
            times. That&apos;s when the economics stop being a comparison and start being unfair.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ buy or rent ---------------------- */}
      <div className="mt-12">
        <SectionHeading id="buy-or-rent" icon={IndianRupee}>Buy or Rent</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-2">One project on the books?</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Rent it for the sales period, and we take it back when you hit sold out. Monthly
              payment, delivery and collection handled.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-2">A pipeline of projects?</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Buy it. Between launches it can even stand at your head office as a meeting annexe
              rather than sitting idle.
            </p>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Tell us your sales timeline and we&apos;ll put both figures in front of you. If renting is
          cheaper for your case, we&apos;ll say so.
        </p>
      </div>

      {/* ------------------------------------------------ who ------------------------------ */}
      <div className="mt-12">
        <SectionHeading id="who" icon={Users2}>Who Takes These</SectionHeading>
        <p className="text-muted-foreground leading-relaxed">
          Real estate developers and plotted-layout promoters, most of all. But the same unit,
          re-specified, works as a two-wheeler or car sales outpost, a bank or NBFC loan mela
          counter, an exhibition and event office, a franchise enquiry centre on a highway, or a
          temporary showroom while the permanent one is being fitted out. If the job is{" "}
          <em className="text-foreground not-italic font-medium">look good, open fast, move later</em>{" "}
          — it&apos;s the same cabin underneath.
        </p>
      </div>

      {/* ------------------------------------------------ process -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="process" icon={ClipboardList}>From Call to First Customer</SectionHeading>
        <ol className="space-y-3">
          {[
            ["Tell us the project.", "What you're selling, expected footfall, and where the office will stand."],
            ["We send a layout and a price.", "Itemised, usually inside 24 hours."],
            ["Your branding goes on the drawing.", "You approve the exterior creative and interior finish before fabrication."],
            ["We build and inspect it.", "At our workshop, checked before it moves."],
            ["It lands on site.", "Trailer to your gate, crane down, levelled, connected."],
            ["Handover.", "Keys to your sales head, usually within a morning of arrival."],
          ].map(([lead, rest], i) => (
            <li key={lead} className="flex gap-4 text-muted-foreground leading-relaxed">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
                {i + 1}
              </span>
              <span><strong className="text-foreground">{lead}</strong> {rest}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ------------------------------------------------ FAQs ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="faqs" icon={Ruler}>Questions Developers Ask Us</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {MARKETING_OFFICE_FAQS.map((f, i) => (
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
          Launching Soon? Start With the Office
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Tell us the project, the footfall you expect, and the date your hoarding goes up.
          You&apos;ll have a layout and a clear price inside a day.
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
