import Link from "next/link";
import {
  Ruler, Layers, HardHat, ClipboardList, ShieldCheck, MapPin,
  Phone, MessageCircle, ChevronRight, CheckCircle2, Building2, Hammer,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";

/**
 * CONSTRUCTION INDIVIDUAL BUILDING — the narrative body of the product page.
 *
 * This is a CIVIL CONSTRUCTION SERVICE, not a manufactured unit: an RCC house built on the
 * customer's own plot. That makes it different in kind from everything else in the catalogue, and
 * the copy below is written accordingly — it never implies a factory-built unit is being shipped.
 *
 * ── WHAT THIS COPY DELIBERATELY DOES NOT SAY ────────────────────────────────────────────────────
 * Every sentence here is either (a) a general, checkable fact about how an RCC individual house is
 * built, or (b) a statement about this company that is already verified elsewhere in the codebase
 * (COMPANY in src/lib/company.ts). It carries NO:
 *   • rate per sq ft or any ₹ figure — the owner prices this per sq ft after a site visit, and the
 *     band has not been supplied. A number invented here would contradict the quotation.
 *   • completion timeline in weeks or months — that depends on plot, approvals and scope.
 *   • warranty term — not supplied.
 *   • named service-area list — not supplied; the page says where the company is based instead.
 *   • project counts, ratings or superlatives.
 * When the owner supplies those figures, add them here — do not let a copy edit introduce them.
 *
 * The FAQ answers below are rendered VISIBLY on the page and are the same strings passed to
 * generateFAQSchema, which is the only condition under which FAQPage markup is legitimate.
 */

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%20want%20to%20build%20an%20individual%20house%20and%20need%20a%20quotation",
};

export const CONSTRUCTION_INDIVIDUAL_BUILDING_FAQS: { question: string; answer: string }[] = [
  {
    question: "What does construction individual building mean?",
    answer:
      "It means building one house on one plot, for one owner — as opposed to an apartment block or a row of identical units. The structure is cast in reinforced cement concrete on your own land: footings, columns, beams and slabs, with block masonry walls between them. Because it is built for a single owner, the layout, room sizes, floor count and finishes are decided by you rather than by a builder selling flats.",
  },
  {
    question: "How many floors can you build — G+1, G+2, G+3 or more?",
    answer:
      "An RCC frame can be designed for G+1 up to G+5 and beyond. What decides the number in practice is not the frame but your local building rules: the permitted floor area ratio, the setbacks your plot must leave on each side, the height limit for the road width your plot faces, and the soil's bearing capacity. Those are checked before the structural design is fixed, because a frame designed for G+2 cannot simply carry two more floors later unless it was designed for them from the start.",
  },
  {
    question: "What size plot do I need — is 40x30 enough?",
    answer:
      "A 40 ft by 30 ft plot is 1,200 sq ft of land. After the setbacks your local authority requires on each side, the footprint you can actually build on is smaller. Multiply that footprint by the number of floors to get built-up area: a G+2 on a 1,200 sq ft plot gives roughly 3,600 sq ft gross before setbacks are deducted. Whether that suits you depends on how many bedrooms, bathrooms and parking spaces you need, which is exactly what the planning stage settles.",
  },
  {
    question: "How is the cost of house construction worked out?",
    answer:
      "It is quoted per square foot of built-up area, and the rate moves with the specification — the grade of concrete and steel, wall thickness, the flooring, the joinery, the sanitaryware and the electrical fit-out. A bare-shell rate and a fully finished rate are different numbers for the same house. We quote after seeing the plot and agreeing the specification, so the figure reflects your actual build rather than an average.",
  },
  {
    question: "Do you handle drawings and approvals, or do I arrange those?",
    answer:
      "Tell us which you want. Some owners arrive with sanctioned drawings from their own architect and need only the construction. Others want the design, the structural drawings and the approval drawings prepared as part of the job. Both are normal; the scope is written into the quotation so there is no ambiguity later about who is responsible for what.",
  },
  {
    question: "Can you build on a plot outside your own city?",
    answer:
      "Civil construction needs supervision on site, so distance matters in a way it does not for a factory-built cabin. We manufacture at our Tamil Nadu works near Hosur and have an office in Electronic City, Bengaluru. Tell us where your plot is and we will say plainly whether we can supervise it properly — an honest no is better than a badly supervised build.",
  },
  {
    question: "How is this different from your prefab and portable buildings?",
    answer:
      "Completely different construction. A prefab home or portable cabin is built in our factory from steel framing and insulated panels, then delivered and installed — fast, relocatable, and priced per unit. An individual building is cast in concrete on your plot, is permanent, and is priced per square foot. If speed and relocation matter more than permanence, look at our prefab homes instead; if you are building a family house to keep, this is the right route.",
  },
];

function SectionHeading({
  id, icon: Icon, children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="scroll-mt-28 flex items-center gap-3 font-display text-2xl sm:text-3xl font-bold mb-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber/10 text-amber shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      {children}
    </h2>
  );
}

/** One stage of the build, numbered because the sequence genuinely is ordered. */
const STAGES: { title: string; body: string }[] = [
  {
    title: "Site visit and measurement",
    body:
      "We walk the plot, measure it against your documents, note the road level, the direction it faces and where services enter. Anything that will affect the design — a slope, a neighbouring wall, a drain — is recorded now rather than discovered later.",
  },
  {
    title: "Design and structural drawings",
    body:
      "Floor plans are settled first, then the elevation, then the structural drawings that the frame is actually built from: footing layout, column schedule, beam layout and slab reinforcement. Nothing is cast before the drawing for it exists.",
  },
  {
    title: "Approvals",
    body:
      "Drawings are prepared to the format your local authority requires and submitted for sanction. Setbacks, floor area ratio and height limits are respected at design stage, because a design that ignores them simply comes back.",
  },
  {
    title: "Foundation",
    body:
      "Excavation to the depth the soil requires, then a lean concrete bed, footings cast to the reinforcement schedule, and columns started off them. The foundation is set out from the same grid the structural drawings use, so the frame above lands where it was designed to.",
  },
  {
    title: "RCC frame and slabs",
    body:
      "Columns, plinth beams, floor beams and slabs are cast floor by floor. Each pour is shuttered, reinforced to the bar bending schedule and cured before the next stage loads it.",
  },
  {
    title: "Masonry, plaster and roofing",
    body:
      "Block walls are raised between the frame, then internal and external plaster. The roof slab is waterproofed and given falls so water leaves the building rather than standing on it.",
  },
  {
    title: "Services — electrical and plumbing",
    body:
      "Conduits and pipework are laid in before finishes close the walls. Points are positioned against your furniture layout, not a generic template, because moving a socket after tiling is expensive.",
  },
  {
    title: "Flooring, joinery and finishes",
    body:
      "Flooring, doors, windows, painting, sanitaryware and fittings, in the sequence that avoids damaging what is already done.",
  },
  {
    title: "Handover",
    body:
      "Snagging list agreed and cleared, services tested, and the house handed over with the drawings that describe what was actually built.",
  },
];

export function ConstructionIndividualBuildingContent() {
  return (
    <div className="space-y-16">
      {/* ─────────────────────────────────────────────────────── what it is ───────────── */}
      <section>
        <SectionHeading id="overview" icon={Building2}>
          Individual house construction, built on your plot
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            An individual building is a single house on a single plot, built for the person who will
            live in it. That sounds obvious until you compare it with buying a flat: here the room
            sizes, the number of floors, where the staircase sits and what the front of the house
            looks like are all decisions you make, not decisions handed to you.
          </p>
          <p>
            The structure is reinforced cement concrete — a frame of footings, columns, beams and
            slabs, with masonry walls filling between them. It is permanent construction, cast in
            place on your land, and it is designed around your plot rather than adapted to it.
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <OptimizedImage
            src="/images/products/construction-individual-building-front-elevation.webp"
            alt="Front elevation of a modern G+2 individual house built in RCC, with white render, timber-clad panels, balconies and covered car parking"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── floors ───────────────── */}
      <section>
        <SectionHeading id="floors" icon={Layers}>
          G+1, G+2, G+3, G+4 and G+5 — how the floor count is decided
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            &ldquo;G+2&rdquo; means a ground floor plus two floors above it. The RCC frame can be
            designed for any of these, but the number you are allowed to build is set by your local
            authority, not by the structure:
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ["G+1", "Ground plus one. Common on smaller plots, or where the owner wants one family floor and one to let."],
            ["G+2", "Ground plus two. The usual choice for a family house with parking below and living space above."],
            ["G+3", "Ground plus three. Often parking and a shop or office at ground with residential floors over."],
            ["G+4 and G+5", "Taller frames, subject to the height limit for your road width and to fire access rules."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border p-5">
              <div className="font-display font-bold text-lg">{k}</div>
              <p className="mt-1 text-sm text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-amber/30 bg-amber/5 p-5 text-sm text-muted-foreground">
          <p className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-amber" />
            <span>
              A frame designed for G+2 cannot simply take two more floors later. If you intend to add
              floors in future, say so at design stage — the columns and footings are sized for the
              final height, not the first phase.
            </span>
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <OptimizedImage
            src="/images/products/construction-individual-building-street-view.webp"
            alt="Corner street view of a completed G+2 individual building showing the full front and side elevations and covered parking bays"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── sizes ────────────────── */}
      <section>
        <SectionHeading id="sizes" icon={Ruler}>
          Plot size, setbacks and built-up area
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            Plot size and built-up area are not the same number, and confusing them is the most
            common reason a design disappoints. Your plot area is the land you own. Your footprint is
            what is left after the setbacks your local authority requires on each side. Built-up area
            is that footprint multiplied by the number of floors.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm sm:text-base">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Plot</th>
                <th className="px-4 py-3 font-semibold">Plot area</th>
                <th className="px-4 py-3 font-semibold">Gross built-up before setbacks</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["40 ft × 30 ft", "1,200 sq ft", "G+1 ≈ 2,400 sq ft · G+2 ≈ 3,600 sq ft"],
                ["30 ft × 40 ft", "1,200 sq ft", "Same area, different frontage — changes the layout, not the maths"],
                ["30 ft × 50 ft", "1,500 sq ft", "G+2 ≈ 4,500 sq ft"],
                ["60 ft × 40 ft", "2,400 sq ft", "G+2 ≈ 7,200 sq ft"],
              ].map(([plot, area, built]) => (
                <tr key={plot} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{plot}</td>
                  <td className="px-4 py-3">{area}</td>
                  <td className="px-4 py-3 text-muted-foreground">{built}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          These are the arithmetic of plot area × floors. The buildable figure for your plot is lower
          once setbacks are applied, and is confirmed at the design stage against your local rules.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────── process ──────────────── */}
      <section>
        <SectionHeading id="process" icon={HardHat}>
          How the build runs, stage by stage
        </SectionHeading>
        <ol className="space-y-4">
          {STAGES.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-xl border border-border p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <OptimizedImage
            src="/images/products/construction-individual-building-entrance-hall.webp"
            alt="Interior entrance hall of a finished individual house with a timber staircase, open-plan living and dining beyond, and polished floor"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── specification ────────── */}
      <section>
        <SectionHeading id="specification" icon={ClipboardList}>
          What goes into the specification
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            The specification is what the rate per square foot is attached to. Two houses of the same
            size can differ substantially in cost because of what is written here, so it is agreed in
            writing before work starts:
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ["Structure", "Concrete grade, steel grade and the reinforcement schedule the frame is built to."],
            ["Walls", "Block type and wall thickness, internal and external."],
            ["Roof", "Slab thickness, waterproofing and the falls that drain it."],
            ["Flooring", "Tile, granite or another finish, per room."],
            ["Doors and windows", "Frame material, shutter type and glazing."],
            ["Electrical", "Wiring, points per room, distribution board and earthing."],
            ["Plumbing", "Pipework, sanitaryware and fittings."],
            ["Finishes", "Plaster, putty, primer and paint, inside and out."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border p-5">
              <div className="font-display font-bold">{k}</div>
              <p className="mt-1 text-sm text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <OptimizedImage
            src="/images/products/construction-individual-building-living-room.webp"
            alt="Finished living room in an individual house with timber feature wall, linear fireplace and full-height glazing to the car porch"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── cost ─────────────────── */}
      <section>
        <SectionHeading id="cost" icon={Hammer}>
          How house construction cost is quoted
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            Individual house construction is quoted per square foot of built-up area. The rate is not
            one number — it moves with the specification above. A bare-shell build and a fully
            finished house are different rates for the same floor plan, and a quotation that does not
            say which one it is describing is not much use to you.
          </p>
          <p>
            We quote after the site visit and after the specification is agreed, so the figure
            reflects your plot and your finish level rather than an average taken from someone else&rsquo;s
            project. Ask for the specification alongside the rate — the two only mean something
            together.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── where ────────────────── */}
      <section>
        <SectionHeading id="where" icon={MapPin}>
          Where we work
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            Civil construction has to be supervised on site, which makes distance a real constraint —
            unlike a factory-built cabin that is simply delivered. We manufacture at our works in
            Tamil Nadu near Hosur, about 40 km from Bengaluru, and keep an office in Electronic City,
            Bengaluru.
          </p>
          <p>
            Tell us where your plot is and we will tell you plainly whether we can supervise it
            properly. A straight answer is more useful to you than a yes that turns into an absent
            site engineer.
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <OptimizedImage
            src="/images/products/construction-individual-building-side-elevation.webp"
            alt="Three-quarter view of a modern individual building showing balconies, timber cladding and the covered parking bay at ground level"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ────────────────────────────────────────────── contractor + concept tool ─────── */}
      <section>
        <SectionHeading id="contractor" icon={HardHat}>
          Appointing the contractor
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            This page describes the building. The decision that sits alongside it is the contract —
            labour only or material and labour, construction only or design and approvals included —
            and how the quotation is put together against a written specification.
          </p>
        </div>
        <Link
          href="/products/home-construction/building-construction-contractor"
          className="mt-6 flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/5 p-5 transition-colors hover:border-amber/60"
        >
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-amber" aria-hidden="true" />
          <span>
            <span className="font-display font-bold">Building Construction Contractor in Bangalore</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Contract models compared, the quality checks at each stage, what drives cost and time,
              the areas we cover, and how the site visit and quotation actually work.
            </span>
          </span>
        </Link>
      </section>

      {/* ─────────────────────────────────────────────────────── related ──────────────── */}
      <section>
        <SectionHeading id="related" icon={ShieldCheck}>
          If a permanent build is not what you need
        </SectionHeading>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            An RCC house is permanent, and it takes as long as permanent construction takes. If speed
            or relocation matters more, the factory-built side of our business is probably the better
            fit:
          </p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["/products/category/prefab-homes", "Prefab homes", "Steel-framed houses built in our factory and installed on site"],
            ["/products/category/prefab-building", "Prefab buildings", "Panel-built structures made to your plan"],
            ["/products/category/portable-cabins", "Portable cabins", "Relocatable site offices, bunkhouses and stores"],
            ["/products/category/container-offices", "Container offices", "Finished workspaces built from containers"],
            ["/products/labour-colony", "Labour colony", "Worker accommodation for project sites"],
            ["/products/category/security-cabins", "Security cabins", "Guard posts and gate cabins"],
          ].map(([href, name, blurb]) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-amber/50 hover:bg-amber/5"
              >
                <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
                <span>
                  <span className="font-display font-bold">{name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ─────────────────────────────────────────────────────── FAQ ──────────────────── */}
      <section>
        <SectionHeading id="faq" icon={ClipboardList}>
          Questions people ask before they build
        </SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {CONSTRUCTION_INDIVIDUAL_BUILDING_FAQS.map((f, i) => (
            <AccordionItem key={f.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                <h3>{f.question}</h3>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {/* Legitimate only because every answer above is rendered visibly on this same page. */}
        <JsonLd data={generateFAQSchema(CONSTRUCTION_INDIVIDUAL_BUILDING_FAQS)} />
      </section>

      {/* ─────────────────────────────────────────────────────── CTA ──────────────────── */}
      <section className="rounded-2xl border border-amber/30 bg-amber/5 p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold">
          Send us your plot details for a quotation
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Plot size, the floors you want and the finish level you have in mind are enough to start.
          We will come back with what is buildable on your plot and what it will cost per square foot
          at that specification.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`tel:${CONTACT.tel}`}
            className="inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Phone className="h-5 w-5" /> {CONTACT.telDisplay}
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp us
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold transition-colors hover:bg-muted"
          >
            Enquiry form <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
