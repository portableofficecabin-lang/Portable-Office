/**
 * RESIDENTIAL BUILDING CONSTRUCTION CONTRACTOR — service page body. SERVER COMPONENT.
 * Canonical URL: /products/home-construction/residential-building-construction-contractor
 *
 * ── THIS IS A SECOND, SEPARATE PAGE. READ THIS BEFORE EDITING EITHER. ───────────────────────
 * A sibling Building Construction Contractor page already exists in the same folder and is NOT
 * touched by this one:
 *     /products/home-construction/building-construction-contractor
 *     src/components/products/BuildingConstructionContractorContent.tsx
 * The owner instructed on 2026-09-06 to leave that page exactly as it is and publish this new
 * copy deck as its own page. The owner then named this one "Residential Building Construction
 * Contractor" and moved it under Home Construction — that word is what separates the two.
 *
 * The two therefore have to stay distinguishable. The division currently is:
 *   THIS page  → RESIDENTIAL intent, Hosur AND Bangalore, plain-spoken owner's deck, the two
 *                contract models, the six-stage process, the "what to ask any contractor"
 *                checklist. H1: "Residential Building Construction Contractor".
 *   SIBLING    → the general contractor query, Bangalore only. Technical depth the deck does not
 *                cover — stage-by-stage quality gates, the written-specification breakdown, cost
 *                and time drivers. H1 is "Building Construction Contractor in Bangalore".
 *
 * DO NOT copy the sibling's quality / materials / cost sections onto this one. They are the only
 * thing keeping the two pages from being duplicates of each other, and they are also why this page
 * links out to it (see RELATED_LINKS) with the anchor "building construction contractor in
 * Bangalore" — that anchor is deliberate and tells search engines which page owns the city query.
 *
 * ── WHAT THIS COPY DELIBERATELY DOES NOT SAY ────────────────────────────────────────────────
 * Same discipline as every other construction page on this site. NO:
 *   • rate per sq ft or any ₹ figure — the owner prices after a site visit and has supplied no
 *     band. A number here would contradict the quotation the customer receives, and would drag a
 *     quote-only service toward Merchant Center eligibility it must not have.
 *   • warranty or defect-liability term — none supplied.
 *   • project count, client count, founding year or rating — COMPANY records none.
 *   • named material brands, which would need a trademark disclaimer.
 *   • licence or empanelment claim beyond the registrations in COMPANY.
 *
 * The FAQ answers are rendered VISIBLY here and are the same strings the page passes to
 * generateFAQSchema, which is the only condition under which FAQPage markup is legitimate.
 *
 * ── PHOTOGRAPHY ─────────────────────────────────────────────────────────────────────────────
 * The five photographs supplied 2026-09-06 show one Mediterranean-style G+1 villa. They are
 * captioned by WHAT THEY SHOW and never by locality — the deck's draft captions ("G+1 house,
 * Bagalur Road, Hosur") would have been a checkable false claim on a commercial page. Do not add a
 * place name to these captions unless the owner confirms the photograph is of that place.
 * These five files are used ONLY here; the sibling keeps its own five.
 *
 * MANUFACTURING LOCATION: the works are in Tamil Nadu near Hosur; Bangalore is an OFFICE
 * (Electronic City). Nothing here says "we manufacture in Bangalore".
 */

import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Factory,
  HardHat,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Wrench,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import { COMPANY } from "@/lib/company";

const IMAGE_BASE = "/images/products/building-construction-contractor";

const CONTACT = {
  primary: COMPANY.phones[0],
  secondary: COMPANY.phones[1],
  email: COMPANY.email.secondary,
  whatsapp: `${COMPANY.whatsapp.url}?text=${encodeURIComponent(
    "Hi, I need a building construction contractor. Please arrange a site visit.",
  )}`,
};

/* ------------------------------------------------------------------ *
 * FAQ — the owner's five questions, rendered visibly below AND passed
 * to FAQPage schema. Kept close to the supplied wording; where a second
 * sentence was added it restates a fact the deck already makes
 * elsewhere in its own body copy (approval authorities, floor loading).
 * ------------------------------------------------------------------ */

export const RESIDENTIAL_BUILDING_CONSTRUCTION_CONTRACTOR_FAQS: { question: string; answer: string }[] = [
  {
    question: "What does construction cost per square foot?",
    answer:
      "It depends on specification, site conditions and design, so any number quoted before seeing your site is guesswork. Tell us the plot size, the number of floors and the finish level you want, and you will get a real estimate. We quote per-square-foot rates in standard, premium and luxury specifications, and what separates them is written down in plain language rather than described as best quality.",
  },
  {
    question: "Do you handle plan approval?",
    answer:
      "Yes. We prepare the drawings and take you through the approval process for your local authority — the BBMP, BDA or panchayat on the Karnataka side, and the DTCP and local town panchayat on the Tamil Nadu side. Which authority applies to your plot is settled at the start, because it changes what can be built on it.",
  },
  {
    question: "How long does a house take?",
    answer:
      "A straightforward G+1 house usually runs several months from foundation to handover, depending on size, weather and how quickly approvals and selections are made. Your agreement will carry a specific date, not a vague promise.",
  },
  {
    question: "Can I buy my own material?",
    answer:
      "Yes, that is the labour contract option. You buy the cement, steel, sand and fittings and control quality yourself, and we bring the masons, bar benders, carpenters, plumbers, electricians and the supervision. Many owners prefer it for the first floor and switch to turnkey later.",
  },
  {
    question: "Will you take a small renovation job?",
    answer:
      "Yes. Extensions, roof work, bathroom rebuilds and old-house renovations are all fine. Not everything has to be a new building. Where an additional floor is involved, what the existing frame was designed to carry is checked before anything is promised.",
  },
];

/* ------------------------------------------------------------------ *
 * Data blocks
 * ------------------------------------------------------------------ */

/** "What we build" — the owner's five categories. */
const BUILD_TYPES: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  wide?: boolean;
}[] = [
  {
    title: "Houses and villas",
    body:
      "Individual homes, duplexes, G+1 and G+2 residences, on your own site. Full construction from foundation to painting, or the structure alone if you plan to finish the interiors yourself.",
    icon: Home,
    wide: true,
  },
  {
    title: "Apartments and residential blocks",
    body:
      "Small apartment buildings and rental blocks for owners who want a steady return from their land.",
    icon: Building2,
  },
  {
    title: "Shops, showrooms and offices",
    body: "Commercial buildings and interior fit-outs, built to open on a date you can advertise.",
    icon: Store,
  },
  {
    title: "Factory sheds and industrial buildings",
    body:
      "RCC and steel-structure sheds, warehouses, compound walls, flooring and utility blocks for the industrial belts around Hosur and the Bangalore outskirts.",
    icon: Factory,
  },
  {
    title: "Renovation and extension",
    body:
      "Adding a floor, rebuilding a roof, extending a kitchen, redoing an old house end to end. Small jobs are welcome; not everything has to be a new building.",
    icon: Wrench,
  },
];

/** The two contract models. `highlight` marks the one most clients choose. */
const CONTRACT_MODELS: {
  name: string;
  lead: string;
  body: string;
  youDo: string[];
  weDo: string[];
  suits: string;
  highlight?: boolean;
}[] = [
  {
    name: "Labour contract",
    lead: "You buy the material. We bring the trades and the supervision.",
    body:
      "You control material purchase and quality; we control execution. Best if you have the time to run purchases and a person to receive material at site.",
    youDo: [
      "Cement, steel, sand and fittings",
      "Brand and grade at every stage",
      "Receiving material at site",
    ],
    weDo: [
      "Masons, bar benders and carpenters",
      "Plumbers and electricians",
      "Site supervision and sequencing",
    ],
    suits: "Owners who want to see every bill and control specification themselves.",
  },
  {
    name: "Turnkey — material and labour",
    lead: "One agreed rate per square foot. One point of responsibility.",
    body:
      "We handle everything at an agreed rate per square foot, including material, labour, supervision and finishing. You get one number, one point of responsibility and far fewer phone calls.",
    youDo: ["Approve the specification", "Approve the drawings", "Pay by completed stage"],
    weDo: [
      "Material procurement and storage",
      "All trades and supervision",
      "Finishing to the agreed specification",
    ],
    suits: "Owners who want a single answerable party. Most of our clients choose this.",
    highlight: true,
  },
];

/** "How a project actually runs" — the owner's six stages. */
const PROCESS: { title: string; body: string }[] = [
  {
    title: "Site visit",
    body:
      "We walk the plot with you, check soil, access, water, power and the neighbouring buildings, and understand what you want to build and what you can spend.",
  },
  {
    title: "Drawings and approvals",
    body:
      "Plan, elevation and structural drawings are prepared, and we guide you through sanction from the BBMP, BDA, panchayat or, on the Tamil Nadu side, DTCP and the local town panchayat.",
  },
  {
    title: "Estimate and agreement",
    body:
      "A detailed estimate with a clear specification list, a completion timeline, and a stage-wise payment schedule. Everything goes into a written agreement before a single load of material arrives.",
  },
  {
    title: "Construction",
    body:
      "Foundation, plinth, columns and slab, brickwork, plastering, electrical and plumbing, flooring, doors and windows, painting. Work happens in a fixed order and you are told what is coming next.",
  },
  {
    title: "Payments by stage",
    body:
      "You pay as each stage is completed, not in advance. That single rule protects you more than any promise we could make.",
  },
  {
    title: "Handover",
    body:
      "Snag list closed, site cleaned, keys handed over, and we stay reachable afterwards for the small things that come up in the first months.",
  },
];

/* "Where we work" — both lists exactly as the owner's deck gives them. */
const TAMIL_NADU_AREAS = [
  "Hosur town",
  "SIPCOT Phase I",
  "SIPCOT Phase II",
  "Bagalur Road",
  "Mathigiri",
  "Zuzuvadi",
  "Thally Road",
  "Denkanikottai",
  "Shoolagiri",
  "Berigai",
  "Rayakottai",
  "Krishnagiri",
];

/* Shikaripalya leads because it is what the H1 claims, and a service area named in the heading
   but missing from the coverage list is exactly the mismatch that gets structured data ignored
   (the Service.areaServed nodes on the page file must stay in step with this list). The
   localities immediately after it are the ones genuinely within same-morning supervision of the
   Electronic City Phase 1 office; the wider Bengaluru list then follows unchanged. */
const KARNATAKA_AREAS = [
  "Shikaripalya",
  "Electronic City Phase 1",
  "Electronic City Phase 2",
  "Neeladri Nagar",
  "Doddathoguru",
  "Konappana Agrahara",
  "Hebbagodi",
  "Attibele",
  "Anekal",
  "Jigani",
  "Bommasandra",
  "Chandapura",
  "Sarjapur Road",
  "Hosa Road",
  "Whitefield",
  "Kanakapura Road",
];

/** "What you should ask any contractor" — the owner's five questions. */
const ASK_ANY_CONTRACTOR = [
  "Is the estimate itemised, or one lump sum with no breakdown?",
  "What exactly does the per-square-foot rate include, and what will be charged extra?",
  "Are payments linked to completed stages?",
  "Who supervises the site daily, and how often will you see them?",
  "Can you visit two of their running sites and talk to those owners without the contractor present?",
];

/* The first entry is load-bearing: it is the one link that tells search engines which of the two
   contractor pages owns the city-qualified query. Keep the anchor text as it is. */
const RELATED_LINKS: { href: string; name: string; blurb: string }[] = [
  {
    href: "/products/home-construction/building-construction-contractor",
    name: "Building construction contractor in Bangalore",
    blurb:
      "The Bangalore page — stage-by-stage quality gates, what a written specification lists, and what decides cost and time",
  },
  {
    href: "/products/construction-individual-building",
    name: "RCC House Construction Package",
    blurb:
      "The full RCC house construction package and specifications — trade by trade, with IS grades and finish levels",
  },
  {
    href: "/products/category/home-construction",
    name: "Home Construction",
    blurb: "Everything in this category, including build-to-plan homes",
  },
  {
    href: "/cities-we-serve/villa-construction-company-bangalore",
    name: "Villa construction in Bangalore",
    blurb: "The villa-specific page: what we build, how an RCC villa is built, and areas served",
  },
  {
    href: "/products/category/prefab-homes",
    name: "Prefab homes",
    blurb: "Steel-framed houses built in our factory and installed on site — faster, and relocatable",
  },
  {
    href: "/products/category/portable-cabins",
    name: "Portable cabins",
    blurb: "Site offices and stores for the build itself, bought or hired",
  },
];

/* ------------------------------------------------------------------ *
 * Layout helpers
 * ------------------------------------------------------------------ */

function SectionHeading({
  id,
  eyebrow,
  icon: Icon,
  children,
}: {
  id: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-2 scroll-mt-28 font-display text-2xl font-bold text-foreground sm:text-3xl"
      >
        {children}
      </h2>
    </div>
  );
}

function Figure({
  src,
  alt,
  caption,
  aspectRatio = "4/3",
  className = "",
}: {
  src: string;
  alt: string;
  caption: string;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-2xl border border-border">
        <OptimizedImage
          src={`${IMAGE_BASE}/${src}`}
          alt={alt}
          aspectRatio={aspectRatio}
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, 800px"
          className="w-full"
        />
      </div>
      <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * The page body
 * ------------------------------------------------------------------ */

export function ResidentialBuildingConstructionContractorContent() {
  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ─────────────────────────────────────────────────────── opener ─────────── */}
      <section>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
          <div>
            <p className="font-display text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
              Most people build once in their lifetime.
            </p>
            <div className="prose prose-lg mt-4 max-w-none text-muted-foreground">
              <p>
                They save for years, buy the site, and then hand it to a contractor and hope for the
                best. Too often the story goes the same way: the estimate was one figure, the final
                bill is another, the work slows down after the slab, and nobody can say clearly
                where the money went.
              </p>
              <p>
                We work differently. Portable Office Cabin takes on building construction on plots
                in Shikaripalya and the rest of Electronic City — and, from the same works, across
                the border around Hosur — from individual houses to factory sheds, with a written
                estimate, a fixed scope and a payment schedule tied to work actually completed. You
                will know what is being built, what it costs, and when it will be finished. Our
                Karnataka office is in Electronic City Phase 1, minutes from Shikaripalya, which is
                the practical reason a supervisor can be on your plot the same morning rather than
                at the end of the week.
              </p>
            </div>
          </div>

          <Figure
            src="building-construction-contractor-villa-living-dining-terrace.webp"
            alt="Building construction contractor project — open-plan living, dining and kitchen opening onto a covered terrace through full-height sliding doors"
            caption="Open-plan living, dining and kitchen opening onto a covered terrace."
            aspectRatio="1/1"
          />
        </div>

        {/* the three promises the copy above makes, pulled out so they are scannable */}
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Written estimate", "An itemised figure against a specification list, not a lump sum."],
            ["Fixed scope", "What is included, and what is not, agreed before material arrives."],
            ["Stage-wise payment", "You pay as each stage is completed, not in advance."],
          ].map(([title, body]) => (
            <li key={title} className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 font-display font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ────────────────────────────────────────────────── what we build ───────── */}
      <section>
        <SectionHeading id="what-we-build" eyebrow="Scope" icon={Building2}>
          What we build
        </SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BUILD_TYPES.map(({ title, body, icon: Icon, wide }) => (
            <li
              key={title}
              className={`rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50 sm:p-6 ${
                wide ? "sm:col-span-2" : ""
              }`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ──────────────────────────────────────────── two ways to work ──────────── */}
      <section>
        <SectionHeading id="contract-models" eyebrow="Contract models" icon={ClipboardList}>
          Two ways to work with us
        </SectionHeading>

        <div className="grid gap-5 lg:grid-cols-2">
          {CONTRACT_MODELS.map((model) => (
            <div
              key={model.name}
              className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
                model.highlight ? "border-accent/40 bg-accent/[0.04]" : "border-border bg-card"
              }`}
            >
              {model.highlight ? (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Most clients choose this
                </span>
              ) : null}
              <h3 className="font-display text-xl font-bold text-foreground">{model.name}</h3>
              <p className="mt-2 font-medium text-accent">{model.lead}</p>
              <p className="mt-3 leading-relaxed text-muted-foreground">{model.body}</p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    You handle
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {model.youDo.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                        <span
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    We handle
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {model.weDo.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                        <span
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                {model.suits}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 leading-relaxed text-muted-foreground sm:p-6">
          We quote per-square-foot rates in standard, premium and luxury specifications, and the
          difference between them is written down in plain language: which cement, which steel,
          which brand of sanitaryware, what thickness of flooring, how many coats of paint. No vague
          words like &ldquo;best quality&rdquo; on the estimate.
        </p>
      </section>

      {/* ───────────────────────────────────────────────────── process ──────────── */}
      <section>
        <SectionHeading id="process" eyebrow="Process" icon={HardHat}>
          How a project actually runs
        </SectionHeading>

        <ol className="relative space-y-6 border-l border-border pl-8 sm:pl-10">
          {PROCESS.map((stage, i) => (
            <li key={stage.title} className="relative">
              <span
                className="absolute -left-[2.3rem] flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 bg-background font-display text-sm font-bold text-accent sm:-left-[2.8rem]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">{stage.title}</h3>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">{stage.body}</p>
            </li>
          ))}
        </ol>

        <Figure
          className="mt-8"
          src="building-construction-contractor-villa-side-elevation-balcony.webp"
          alt="House construction in progress — completed side elevation of a G+1 residence with first-floor balcony, plastered and painted external walls and a tiled pitched roof"
          caption="Side elevation of a completed G+1 residence — first-floor balcony, plastered and painted walls, tiled pitched roof."
          aspectRatio="16/9"
        />
      </section>

      {/* ──────────────────────────────────────────────────── coverage ──────────── */}
      <section>
        <SectionHeading id="coverage" eyebrow="Coverage" icon={MapPin}>
          Where we work
        </SectionHeading>

        {/* KARNATAKA FIRST since 2026-09-07: the H1 claims Shikaripalya, so the list that
            contains it has to lead. Tamil Nadu stays below because the works genuinely are near
            Hosur and the company genuinely builds there — it is honest supporting coverage, not
            the page's target. Do not re-order these without changing the H1 to match. */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-10">
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-foreground">
                Shikaripalya, Electronic City and south Bengaluru, Karnataka
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {KARNATAKA_AREAS.map((area) => (
                  <li
                    key={area}
                    className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground"
                  >
                    {area}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                …and the rest of Bengaluru.
              </p>
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">
                Hosur and Krishnagiri district, Tamil Nadu
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {TAMIL_NADU_AREAS.map((area) => (
                  <li
                    key={area}
                    className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Civil construction has to be supervised on site, which makes distance a real
              constraint — and it is the whole reason Shikaripalya is a straightforward place for
              us to build. Our Karnataka office is in Electronic City Phase 1, minutes away, and
              our manufacturing works are in Tamil Nadu near Hosur, about 40 km down Hosur Road.
              Tell us where your plot is and we will say plainly whether we can supervise it
              properly.
            </p>
          </div>

          <Figure
            src="building-construction-contractor-villa-aerial-site-layout.webp"
            alt="Factory shed and house construction contractor site planning — aerial view of a completed residence showing the building footprint, driveway approach and boundary setbacks within the plot"
            caption="Aerial view of a completed residence — building footprint, driveway approach and boundary setbacks within the plot."
            aspectRatio="1/1"
          />
        </div>
      </section>

      {/* ───────────────────────────────────────── what to ask any contractor ───── */}
      <section>
        <SectionHeading id="ask" eyebrow="Before you sign" icon={ClipboardCheck}>
          What you should ask any contractor
        </SectionHeading>
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-6 sm:p-8">
          <p className="leading-relaxed text-muted-foreground">
            Before you sign with us, or with anyone else, ask these questions:
          </p>
          <ol className="mt-5 space-y-4">
            {ASK_ANY_CONTRACTOR.map((question, i) => (
              <li key={question} className="flex gap-4">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="leading-relaxed text-foreground">{question}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-accent/20 pt-5 leading-relaxed text-muted-foreground">
            A contractor who answers all five without hesitating is worth talking to. We are happy
            to be asked.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── gallery ────────── */}
      <section>
        <SectionHeading id="work" eyebrow="Recent work" icon={Compass}>
          What a finished build looks like
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Figure
            src="building-construction-contractor-villa-front-elevation-pool.webp"
            alt="Building construction contractor — front elevation of a completed G+1 villa with a tiled pitched roof, first-floor balcony, full-height glazing and a pool deck"
            caption="G+1 villa — front elevation and pool deck."
            aspectRatio="1/1"
          />
          <Figure
            src="building-construction-contractor-villa-poolside-elevation.webp"
            alt="House construction contractor project — poolside elevation of a completed two-storey residence with balconies, sliding glazed doors and a landscaped edge"
            caption="Poolside elevation — balconies, sliding glazed doors and the landscaped edge."
            aspectRatio="1/1"
          />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────── related ───────── */}
      <section>
        <SectionHeading id="related" eyebrow="Related" icon={Compass}>
          Related services
        </SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {RELATED_LINKS.map(({ href, name, blurb }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/50"
              >
                <span className="font-display font-bold text-foreground">{name}</span>
                <span className="mt-1 text-sm text-muted-foreground">{blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ────────────────────────────────────────────────────────────── FAQ ─────── */}
      <section>
        <SectionHeading id="faq" eyebrow="FAQ" icon={ClipboardList}>
          Questions we get every week
        </SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {RESIDENTIAL_BUILDING_CONSTRUCTION_CONTRACTOR_FAQS.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                <h3>{faq.question}</h3>
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ────────────────────────────────────────────────────────────── CTA ─────── */}
      <section
        id="quote"
        className="scroll-mt-28 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.10] to-accent/[0.02]"
      >
        <div className="p-6 sm:p-8 lg:p-10">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Let us look at your site
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Send us the location and a short note on what you want to build. The first site visit
            and discussion cost you nothing.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`tel:${CONTACT.primary.e164}`}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              <Phone className="h-5 w-5" aria-hidden="true" /> {CONTACT.primary.display}
            </a>
            <a
              href={`tel:${CONTACT.secondary.e164}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-5 w-5" aria-hidden="true" /> {CONTACT.secondary.display}
            </a>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp us
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Mail className="h-5 w-5" aria-hidden="true" /> {CONTACT.email}
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/book-appointment"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Schedule a site visit
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Request a written estimate
            </Link>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            {COMPANY.businessHours.weekdays.display} · {COMPANY.businessHours.sunday.display} ·
            Enquiries answered {COMPANY.responseTime.toLowerCase()}.
          </p>
        </div>
      </section>
    </div>
  );
}
