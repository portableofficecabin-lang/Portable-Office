/**
 * BUILDING CONSTRUCTION CONTRACTOR IN BANGALORE — the service page body. SERVER COMPONENT.
 *
 * Sits under the Home Construction category, beside the Construction Individual Building product
 * (POC-CIB-RCC). That product page explains WHAT an RCC individual house is; this page answers a
 * different query — someone looking for a CONTRACTOR in Bangalore — and covers the contracting
 * side: scope models, coordination, quality gates, coverage, quotation. The two cross-link and
 * deliberately do not repeat each other's copy.
 *
 * ── WHAT THIS COPY DELIBERATELY DOES NOT SAY ────────────────────────────────────────────────
 * Every claim below is either (a) a checkable general fact about how building construction works
 * and is approved in Bangalore, or (b) a fact about this company already verified in
 * src/lib/company.ts. Following the precedent set by ConstructionIndividualBuildingContent.tsx
 * and the villa city page, it carries NO:
 *   • rate per sq ft or any ₹ figure — the owner prices after a site visit, and no band has been
 *     supplied. A number here would contradict the quotation the customer receives.
 *   • completion timeline in weeks or months.
 *   • warranty or defect-liability term — none supplied.
 *   • project count, client count, founding year or rating — the site's existing claims on these
 *     contradict each other and COMPANY records none.
 *   • named material brands, which would need a trademark disclaimer.
 *   • licence or empanelment claim beyond the registrations in COMPANY (GSTIN, Udyam, ISO 9001).
 * When the owner supplies those figures, add them here — do not let a copy edit introduce them.
 *
 * The FAQ answers are rendered VISIBLY on this page and are the same strings the page passes to
 * generateFAQSchema, which is the only condition under which FAQPage markup is legitimate.
 *
 * MANUFACTURING LOCATION: the works are in Tamil Nadu near Hosur; Bangalore is an OFFICE
 * (Electronic City). Nothing here says "we manufacture in Bangalore" — see the note on
 * locationStripText in src/lib/site-navigation.ts.
 */

import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Compass,
  HardHat,
  Home,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import { COMPANY } from "@/lib/company";

const IMAGE_BASE = "/images/products/building-construction-contractor";

const CONTACT = {
  tel: COMPANY.phones[0].e164,
  telDisplay: COMPANY.phones[0].display,
  whatsapp: `${COMPANY.whatsapp.url}?text=${encodeURIComponent(
    "Hi, I need a building construction contractor in Bangalore. Please send me a quotation.",
  )}`,
};

/* ------------------------------------------------------------------ *
 * FAQ — rendered visibly below AND passed to FAQPage schema
 * ------------------------------------------------------------------ */

export const BUILDING_CONSTRUCTION_CONTRACTOR_FAQS: { question: string; answer: string }[] = [
  {
    question: "What does a building construction contractor actually do?",
    answer:
      "A contractor takes responsibility for turning drawings into a finished building: setting out on site, arranging labour and materials, sequencing the trades so each one works on ground the previous one has left ready, supervising the work against the drawings, and handing over a building that matches what was agreed. On a labour contract that responsibility covers workmanship and site management, with materials bought by you. On a material-and-labour contract it covers procurement as well, so one party is answerable for both what was built and what it was built from.",
  },
  {
    question: "What is the difference between a labour contract and a material-and-labour contract?",
    answer:
      "On a labour contract you buy the cement, steel, blocks, sand, aggregate and finishes yourself and pay us for the workmanship and site management. You control brand and grade at every stage and see every bill; you also carry the ordering, the storage and the wastage. On a material-and-labour contract — often called a turnkey or item-rate contract — everything is quoted together against an agreed specification, so you have one price and one party answerable for both. Owners who want control over specification usually choose the first; owners who want a single point of responsibility usually choose the second.",
  },
  {
    question: "How is the cost of building construction in Bangalore worked out?",
    answer:
      "It is quoted per square foot of built-up area against a written specification, and the rate moves with that specification — the grade of concrete and steel, wall thickness, the flooring, the joinery, the sanitaryware and the electrical fit-out. A bare-shell rate and a fully finished rate are different numbers for the same floor plan, and a rate quoted without the specification attached does not tell you anything. We quote after seeing the plot and agreeing the specification, so the figure describes your build rather than an average. Ask any contractor for the rate and the specification together; either one alone is not comparable with anyone else's.",
  },
  {
    question: "Do you handle the plan sanction and approvals, or do I arrange them?",
    answer:
      "Tell us which you want, and it goes into the quotation either way. Some owners arrive with sanctioned drawings from their own architect and need only the construction. Others want the design, the structural drawings and the approval drawings prepared as part of the job. In Bangalore, plan sanction for most individual plots runs through the local planning authority for the area your plot falls in — BBMP, the BDA, a town or city municipal council, or the relevant planning authority where the plot sits outside those limits — and the drawings must respect that authority's setback, floor area ratio and height rules before they are submitted. Which authority applies to your plot is settled at the start, because it changes what can be built on it.",
  },
  {
    question: "Which parts of Bangalore do you work in?",
    answer:
      "Civil construction has to be supervised on site, which makes distance a real constraint in a way it is not for a factory-built cabin that is simply delivered. Our Karnataka office is in Electronic City, Bengaluru, and our manufacturing works are in Tamil Nadu near Hosur. Tell us where your plot is and we will say plainly whether we can supervise it properly. An honest no is more useful to you than a yes that turns into an absent site engineer.",
  },
  {
    question: "How do you keep quality consistent through the build?",
    answer:
      "By checking the things that cannot be inspected later, at the moment they can still be inspected. Reinforcement is checked against the bar bending schedule before a pour, not after. Concrete is placed, compacted and cured rather than merely poured. Levels and setting out are verified from the same grid the structural drawings use, so the frame lands where it was designed to. Wet areas are tested before they are tiled. Electrical and plumbing points are positioned against your furniture layout before the walls close. None of this is exotic — it is ordinary practice done in the right order, which is what actually separates one build from another.",
  },
  {
    question: "How long does an individual house take to build?",
    answer:
      "That depends on the plot, the approvals, the floor count, the specification and the weather, and it is settled in writing for your project rather than quoted as a general figure. What we can tell you is what drives it: approvals before work can start, foundation depth once the soil is known, the curing time each floor needs before the next one loads it — which is fixed by the concrete, not by effort — and the length of the finishing trades, which is set by how much joinery, tiling and painting your specification contains. Anyone who gives you a completion date before seeing the plot is guessing.",
  },
  {
    question: "Can I see what my house will look like before I commit?",
    answer:
      "Yes. Floor plans and an elevation are prepared and agreed before anything is cast, and they are the drawings the build is actually set out from — so what you approve on paper is what gets built. If you want to see it more vividly than a plan allows, say so at design stage and we will discuss what visualisation is worth preparing for your project. Whatever is produced, the binding description of your house is always the signed drawings and the written specification, not a picture.",
  },
];

/* ------------------------------------------------------------------ *
 * Data blocks
 * ------------------------------------------------------------------ */

const SERVICES: { title: string; body: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    title: "Residential building construction",
    body:
      "Houses and small residential blocks built in reinforced cement concrete on your own plot — footings, columns, beams and slabs cast in place, with block masonry walls between them.",
    icon: Home,
  },
  {
    title: "Individual house construction",
    body:
      "One house, one plot, one owner. Room sizes, floor count, staircase position and the look of the front are decisions you make at design stage rather than decisions handed to you.",
    icon: Building2,
  },
  {
    title: "Villa construction",
    body:
      "Larger individual houses where the elevation, the landscape edge and the interior specification carry as much weight as the structure. Setbacks and parking are planned before the first line is drawn.",
    icon: Compass,
  },
  {
    title: "Turnkey construction",
    body:
      "Design, drawings, approvals, structure, services and finishing under one contract, so there is one party answerable for the whole building rather than a chain of separate trades.",
    icon: ClipboardCheck,
  },
  {
    title: "Labour-contract construction",
    body:
      "You buy the materials and control brand and grade; we provide the workmanship, the supervision and the site management. Every bill stays with you.",
    icon: HardHat,
  },
  {
    title: "Material-and-labour construction",
    body:
      "Materials and workmanship quoted together against an agreed written specification — one rate, one responsibility, and no argument later about who supplied what.",
    icon: Layers,
  },
  {
    title: "Renovation and extension",
    body:
      "Adding a floor, extending at the rear, reworking a layout or refinishing an existing house. Additional floors depend entirely on what the existing frame was designed to carry, which is checked before anything is promised.",
    icon: Wrench,
  },
  {
    title: "Structural, architectural, MEP and finishing coordination",
    body:
      "The part owners feel most and see least: making sure the beam layout does not fight the false ceiling, the plumbing shaft has somewhere to go, and the switchboards land where the furniture actually is.",
    icon: Ruler,
  },
];

const PROCESS: { title: string; body: string }[] = [
  {
    title: "Site visit and measurement",
    body:
      "We walk the plot, measure it against your documents, and note the road level, the direction it faces, the slope, the neighbouring walls and where water, power and drainage enter. Anything that will affect the design is recorded now rather than discovered during excavation.",
  },
  {
    title: "Requirement and specification discussion",
    body:
      "How many bedrooms, how many floors, how much parking, and to what finish level. This conversation is what the rate is eventually attached to, so it happens before any number is quoted.",
  },
  {
    title: "Quotation against a written scope",
    body:
      "A rate per square foot of built-up area, stated alongside the specification it covers and the scope it includes — construction only, or design and approvals as well. Both parts are in writing.",
  },
  {
    title: "Design and structural drawings",
    body:
      "Floor plans first, then the elevation, then the structural drawings the frame is actually built from: footing layout, column schedule, beam layout and slab reinforcement. Nothing is cast before the drawing for it exists.",
  },
  {
    title: "Approvals",
    body:
      "Drawings prepared to the format your planning authority requires and submitted for sanction. Setbacks, floor area ratio and height limits are respected at design stage, because a design that ignores them comes back.",
  },
  {
    title: "Foundation and RCC frame",
    body:
      "Excavation to the depth the soil requires, lean concrete, footings cast to the reinforcement schedule, then columns, plinth beams, floor beams and slabs cast floor by floor. Each pour is shuttered, checked against the bar bending schedule and cured before the next stage loads it.",
  },
  {
    title: "Masonry, plaster and waterproofing",
    body:
      "Block walls raised between the frame, internal and external plaster, and a roof slab waterproofed and given falls so water leaves the building instead of standing on it.",
  },
  {
    title: "Services — electrical and plumbing",
    body:
      "Conduits and pipework laid in before finishes close the walls, with points positioned against your furniture layout rather than a generic template. Moving a socket after tiling is expensive and looks it.",
  },
  {
    title: "Finishing trades",
    body:
      "Flooring, doors, windows, painting, sanitaryware and fittings, sequenced so nothing already finished is damaged by what comes after it.",
  },
  {
    title: "Snagging and handover",
    body:
      "A snag list agreed and cleared, services tested, and the house handed over with the drawings that describe what was actually built — not the drawings it started from.",
  },
];

const QUALITY_GATES: { stage: string; check: string }[] = [
  ["Setting out", "Plot corners, setbacks and the column grid verified against the sanctioned drawing before excavation."],
  ["Foundation", "Excavation depth and bearing strata confirmed; footing reinforcement checked against the schedule before concrete."],
  ["Columns and beams", "Bar diameter, spacing, laps and cover checked at every level; shuttering checked for line, level and plumb."],
  ["Slabs", "Reinforcement, spacer cover and conduit positions inspected before the pour; curing maintained after it."],
  ["Masonry", "Wall thickness, line and plumb; openings set out from the drawing rather than eyeballed on site."],
  ["Waterproofing", "Wet areas and the roof slab tested by ponding before tiling or screeding closes them."],
  ["Services", "Conduit and pipe routes recorded before plastering, so a future repair does not start with guesswork."],
  ["Finishes", "Level, alignment and joint checks on flooring and joinery; paint checked in daylight, not under a bulb."],
].map(([stage, check]) => ({ stage, check }));

const COST_FACTORS: { factor: string; body: string }[] = [
  {
    factor: "Built-up area",
    body: "The dominant driver. Plot area, the setbacks your authority requires and the number of floors together decide it — plot area alone does not.",
  },
  {
    factor: "Floor count",
    body: "A frame designed for G+2 cannot simply take two more floors later. Say at design stage if you intend to extend, because the footings and columns are sized for the final height.",
  },
  {
    factor: "Soil and foundation depth",
    body: "What is under the plot decides how deep you dig and how much concrete goes below ground before anything visible begins.",
  },
  {
    factor: "Structural specification",
    body: "Concrete grade, steel grade and the reinforcement schedule the frame is built to.",
  },
  {
    factor: "Finish level",
    body: "Flooring, joinery, sanitaryware, electrical fit-out and paint system. This is the widest spread between two otherwise identical houses.",
  },
  {
    factor: "Site access",
    body: "A narrow approach, no space to stack material or a plot a mixer cannot reach all add cost that has nothing to do with the building itself.",
  },
  {
    factor: "Scope of contract",
    body: "Construction only, or design, drawings and approvals included. Both are normal; the quotation says which one it is describing.",
  },
];

const AREAS = [
  "Electronic City",
  "Bommasandra",
  "Chandapura",
  "Anekal",
  "Attibele",
  "Jigani",
  "Sarjapur Road",
  "HSR Layout",
  "Bannerghatta Road",
  "Hosur Road",
  "Whitefield",
  "Hoskote",
];

/* ------------------------------------------------------------------ *
 * Layout helpers
 * ------------------------------------------------------------------ */

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
    <h2
      id={id}
      className="scroll-mt-28 flex items-center gap-3 font-display text-2xl font-bold sm:text-3xl"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ *
 * The page body
 * ------------------------------------------------------------------ */

export function BuildingConstructionContractorContent() {
  return (
    <div className="space-y-16">
      {/* ───────────────────────────────────────────────────── what we do ─────────── */}
      <section>
        <SectionHeading id="overview" icon={Building2}>
          Building construction, contracted properly
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            Choosing a building construction contractor is mostly a decision about who carries
            responsibility. Drawings describe a building; a contractor is the party that has to make
            the drawings real on an actual plot, with actual soil, an actual road width and an
            actual set of local rules — and answer for the result.
          </p>
          <p>
            We build in reinforced cement concrete: a frame of footings, columns, beams and slabs
            cast in place, with block masonry walls between them. It is permanent construction,
            designed around your plot rather than adapted to it. That is a different business from
            the factory-built side of this company, and this page is about the civil side.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className="rounded-xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-foreground">{service.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <figure className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <OptimizedImage
              src={`${IMAGE_BASE}/building-construction-contractor-bangalore-living-hall.webp`}
              alt="Finished ground-floor living and dining hall of an individual house, with terrazzo flooring, a slatted timber ceiling with cove lighting, a timber-panelled feature wall and an open staircase beyond"
              aspectRatio="4/3"
              objectFit="cover"
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            An interior at handover stage. Flooring, ceiling treatment, lighting and joinery are all
            specification decisions taken long before this point — which is why the specification is
            agreed in writing before work starts.
          </figcaption>
        </figure>
      </section>

      {/* ───────────────────────────────────────────────── contract models ────────── */}
      <section>
        <SectionHeading id="contract-models" icon={ClipboardList}>
          Labour contract, or material and labour?
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            This is the first real decision, and it changes everything downstream — the quotation
            format, who holds the bills, and who is answerable when something is not right.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[38rem] text-sm">
            <caption className="sr-only">
              Comparison of labour-contract and material-and-labour construction
            </caption>
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">
                  &nbsp;
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Labour contract
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Material and labour
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Who buys materials", "You do", "We do, to the agreed specification"],
                ["Control over brand and grade", "Complete — you choose every item", "Fixed by the specification, agreed before work starts"],
                ["Who is answerable for the result", "Workmanship is ours; material performance is yours", "One party for both"],
                ["Quotation basis", "Rate for workmanship and site management", "Single rate per sq ft covering both"],
                ["Your time commitment", "Higher — ordering, storage and wastage sit with you", "Lower — one point of contact"],
                ["Best when", "You want control and have time to give it", "You want one price and one responsibility"],
              ].map(([label, a, b]) => (
                <tr key={label} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                    {label}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{a}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Neither is better in the abstract. What matters is that the quotation states which one it
          is describing, because a labour rate and a material-and-labour rate are not comparable
          numbers and comparing them is how owners end up with a surprise.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────── process ──────────── */}
      <section>
        <SectionHeading id="process" icon={HardHat}>
          How the build runs, stage by stage
        </SectionHeading>
        <ol className="mt-6 space-y-4">
          {PROCESS.map((stage, i) => (
            <li key={stage.title} className="flex gap-4 rounded-xl border border-border p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display font-bold text-foreground">{stage.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <figure className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <OptimizedImage
              src={`${IMAGE_BASE}/building-construction-contractor-bangalore-staircase.webp`}
              alt="Internal staircase in a completed individual house, with timber treads on concrete, a glass balustrade with timber handrail and a slatted timber soffit carrying recessed linear lighting"
              aspectRatio="4/3"
              objectFit="cover"
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            A staircase is where structure, joinery, lighting and finishing all have to agree. Its
            rise and going are fixed at structural stage, months before anyone sees a tread — which
            is why coordination between the trades is a stage in its own right rather than an
            afterthought.
          </figcaption>
        </figure>
      </section>

      {/* ─────────────────────────────────────────────────────── quality ─────────── */}
      <section>
        <SectionHeading id="quality" icon={ShieldCheck}>
          Quality control — checking what cannot be checked later
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            Almost everything that decides whether a building lasts is invisible by the time the
            building is finished. Reinforcement disappears into concrete. Conduit disappears into
            plaster. Waterproofing disappears under tiles. So quality control is not an inspection at
            the end; it is a set of checks that each have exactly one moment when they are possible.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Quality-control checks by construction stage</caption>
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Stage
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  What is checked, and when
                </th>
              </tr>
            </thead>
            <tbody>
              {QUALITY_GATES.map((row) => (
                <tr key={row.stage} className="border-t border-border align-top">
                  <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">
                    {row.stage}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{row.check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/5 p-5 text-sm leading-relaxed text-muted-foreground">
          Portable Office Cabin operates a quality management system certified to ISO 9001:2015
          (certificate no. {COMPANY.isoCertificate}), and is registered under GSTIN{" "}
          {COMPANY.gstin} and Udyam {COMPANY.udyam}. Those are the registrations we hold; we do not
          claim any others.
        </p>
      </section>

      {/* ────────────────────────────────────────────── materials & workmanship ──── */}
      <section>
        <SectionHeading id="materials" icon={Layers}>
          Materials and workmanship
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            The specification is what a rate per square foot is attached to. Two houses of identical
            floor area can differ substantially in cost purely because of what is written in it, so
            it is agreed in writing before work starts and it lists, at minimum:
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ["Structure", "Concrete grade, steel grade and the reinforcement schedule the frame is built to."],
            ["Walls", "Block type and wall thickness, internal and external."],
            ["Roof", "Slab thickness, waterproofing system and the falls that drain it."],
            ["Flooring", "Finish per room — the single largest swing in a finishing budget."],
            ["Doors and windows", "Frame material, shutter type, glazing and ironmongery."],
            ["Electrical", "Wiring, points per room, distribution board and earthing."],
            ["Plumbing", "Pipework, sanitaryware and fittings."],
            ["Finishes", "Plaster, putty, primer and paint system, inside and out."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border p-5">
              <h3 className="font-display font-bold text-foreground">{k}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>

        <figure className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <OptimizedImage
              src={`${IMAGE_BASE}/building-construction-contractor-bangalore-kitchen.webp`}
              alt="Completed kitchen in an individual house, with a laminate and stone counter run, wall units, built-in oven housing, terrazzo flooring continuing from the hall and a rear door to the utility yard"
              aspectRatio="4/3"
              objectFit="cover"
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            A kitchen is the clearest example of why services are set out before walls close: the
            water inlet, the drain, the chimney duct and every socket here were fixed at conduit
            stage, against this exact counter layout.
          </figcaption>
        </figure>
      </section>

      {/* ────────────────────────────────────────────────────── cost & time ──────── */}
      <section>
        <SectionHeading id="cost" icon={Coins}>
          What decides cost, and what decides time
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            We do not publish a rate per square foot, and you should be sceptical of one that is
            published without a specification beside it. The rate is quoted after the site visit and
            after the specification is agreed, because those two things are what the number
            describes. Here is what moves it:
          </p>
        </div>
        <dl className="mt-6 space-y-3">
          {COST_FACTORS.map((item) => (
            <div key={item.factor} className="rounded-xl border border-border p-5">
              <dt className="font-display font-bold text-foreground">{item.factor}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>

        <div className="prose prose-lg mt-8 max-w-none text-muted-foreground">
          <h3 className="font-display text-xl font-bold text-foreground">Timeline factors</h3>
          <p>
            Programme is set by the same kind of facts. Approvals have to land before work starts.
            Foundation depth is decided by the soil, not by the schedule. Each floor's concrete needs
            its curing time before the next one loads it — that period is fixed by the material and
            cannot be compressed by adding people. And the finishing trades take as long as the
            specification makes them: a house with extensive joinery and stone simply has more work
            in it than one without.
          </p>
          <p>
            A realistic programme is issued for your project once the drawings and specification are
            settled. A completion date offered before the plot has been seen is not a programme; it
            is a sales figure.
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── areas ────────── */}
      <section>
        <SectionHeading id="coverage" icon={MapPin}>
          Where we work in Bangalore
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            Our Karnataka office is at {COMPANY.addresses.bangaloreOffice.locality.split(",")[0]},
            Bengaluru {COMPANY.addresses.bangaloreOffice.postalCode}, and our manufacturing works are
            in Tamil Nadu near Hosur. Civil work needs supervision on site, so the plots we can
            genuinely serve are the ones a site engineer can reach regularly — which in practice
            means south and south-east Bengaluru and the corridor toward Hosur, and other areas on
            enquiry.
          </p>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <li
              key={area}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              {area}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Not on the list? Tell us where the plot is and we will give you a straight answer about
          whether we can supervise it properly. That is more useful to you than a yes we cannot
          staff.
        </p>

        <figure className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <OptimizedImage
              src={`${IMAGE_BASE}/building-construction-contractor-bangalore-pantry-dining.webp`}
              alt="Open pantry unit with internal lighting beside the dining area of an individual house, looking through to the kitchen and the staircase, with terrazzo flooring throughout"
              aspectRatio="4/3"
              objectFit="cover"
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            Storage, circulation and sightlines are layout decisions, not finishing decisions. They
            are settled on the floor plan, which is why the plan is agreed before the elevation.
          </figcaption>
        </figure>
      </section>

      {/* ──────────────────────────────────────────────── site visit & quote ─────── */}
      <section>
        <SectionHeading id="quotation" icon={ClipboardCheck}>
          Site inspection and the quotation process
        </SectionHeading>
        <div className="prose prose-lg mt-5 max-w-none text-muted-foreground">
          <p>
            Bring the plot documents and any drawings you already have. If you have none, that is
            normal and the design stage starts from your requirements instead.
          </p>
        </div>
        <ol className="mt-6 space-y-3">
          {[
            "Tell us the plot location and size, the floors you want and the finish level you have in mind. That is enough to start.",
            "We visit the plot, measure it, and check the road, the levels, the setbacks and how services reach it.",
            "We agree the scope in writing — construction only, or design, drawings and approvals as well — and the specification the rate will be attached to.",
            "You receive a quotation stating the rate per square foot of built-up area, the specification it covers and what is excluded.",
            "If it works for you, drawings are prepared and submitted for sanction, and the programme is issued against the sanctioned design.",
          ].map((step, i) => (
            <li key={step} className="flex gap-3 rounded-xl border border-border p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-xs font-bold text-amber">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ──────────────────────────────────────────────────────── related ────────── */}
      <section>
        <SectionHeading id="related" icon={Compass}>
          Related services
        </SectionHeading>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            [
              "/products/construction-individual-building",
              "Construction Individual Building",
              "The product page for RCC individual house construction — plot sizes, floor counts and what goes into the specification",
            ],
            [
              "/products/category/home-construction",
              "Home Construction",
              "Everything in this category, including build-to-plan homes",
            ],
            [
              "/cities-we-serve/villa-construction-company-bangalore",
              "Villa construction in Bangalore",
              "The villa-specific page: what we build, how an RCC villa is built, and areas served",
            ],
            [
              "/products/category/prefab-homes",
              "Prefab homes",
              "Steel-framed houses built in our factory and installed on site — faster, and relocatable",
            ],
            [
              "/products/category/prefab-building",
              "Prefab buildings",
              "Panel-built structures made to your plan when permanence is not the priority",
            ],
            [
              "/products/category/portable-cabins",
              "Portable cabins",
              "Site offices and stores for the build itself, bought or hired",
            ],
          ].map(([href, name, blurb]) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col rounded-xl border border-border p-4 transition-colors hover:border-amber/50 hover:bg-amber/5"
              >
                <span className="font-display font-bold text-foreground">{name}</span>
                <span className="mt-1 text-sm text-muted-foreground">{blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ────────────────────────────────────────────────────────────── FAQ ──────── */}
      <section>
        <SectionHeading id="faq" icon={ClipboardList}>
          Questions owners ask before they appoint a contractor
        </SectionHeading>
        <Accordion type="single" collapsible className="mt-6 w-full">
          {BUILDING_CONSTRUCTION_CONTRACTOR_FAQS.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                <h3>{faq.question}</h3>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ────────────────────────────────────────────────────────────── CTA ──────── */}
      <section id="quote" className="scroll-mt-28 rounded-2xl border border-amber/30 bg-amber/5 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Request a detailed quotation
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Plot size, the floors you want and the finish level you have in mind are enough to start.
          We come back with what is buildable on your plot and what it costs per square foot at that
          specification — with the specification attached, so the number means something.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`tel:${CONTACT.tel}`}
            className="inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> {CONTACT.telDisplay}
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp us
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
          >
            Request building construction quotation
          </Link>
          <Link
            href="/book-appointment"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
          >
            Schedule a site visit
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {COMPANY.businessHours.weekdays.display} · {COMPANY.businessHours.sunday.display} ·
          Enquiries answered {COMPANY.responseTime.toLowerCase()}.
        </p>
      </section>
    </div>
  );
}
