import Link from "next/link";
import {
  Layers3, ShieldCheck, Paintbrush, Container, Ruler, Wrench, Truck,
  ClipboardList, Phone, MessageCircle, ChevronRight, CheckCircle2, HardHat, IndianRupee,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getCommerce } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/**
 * METAL PORTABLE CABIN — the "choose your metal" HUB at /products/metal-portable-cabin.
 *
 * ── WHY THIS IS A GUIDE AND NOT A PRODUCT (owner decision, 2026-09-05) ──────────────────────
 * The supplied copy carried both a positioning note ("a reason to exist next to those two pages
 * instead of repeating them") and a price with an Add to Cart button. Those are different pages.
 * Built as a product it would have been a THIRD self-canonical URL selling the same 20 × 10 ft
 * cabin at the same ₹5,19,200 as POC-PC-MSPC and POC-PC-STEEL — the duplication that has already
 * been consolidated once and restored once on this site.
 *
 * So there is NO SKU here: no commerce row, no price box, no Add to Cart, no Product/Offer
 * JSON-LD, and nothing for the Merchant feed to pick up. The page owns the MATERIAL-SELECTION
 * intent (MS vs GI vs PPGI vs container-grade) and routes the buyer to the page that sells the
 * build they land on. That is exactly what the copy already said: "Standard MS sizes can be
 * ordered online right away; GI and PPGI builds are quoted within one working day."
 *
 * ── THE ONE ₹ FIGURE ON THIS PAGE IS READ, NEVER TYPED ──────────────────────────────────────
 * The MS reference price below is computed from the commerce catalogue at render time
 * (sellPrice of POC-PC-MSPC's basePrice). Hard-coding ₹5,19,200 here would create a second
 * place to update and a silent contradiction the day the owner changes the price. It is also
 * stated as the fixed price it is — never "starting from", which would contradict the fixed
 * offer that page actually sells.
 *
 * ── THREE DEVIATIONS FROM THE SUPPLIED COPY ─────────────────────────────────────────────────
 * 1. NO FOUNDING YEAR. The draft said "welding metal cabins since 2014" and "manufacturing
 *    since 2014". Four pages on this site have historically claimed 2010, 2014, 2020 and 2022,
 *    and src/lib/company.ts records none, so this page states none.
 * 2. NO HOSKOTE FACTORY. The draft closed "Factories at Kamandoddi, Tamil Nadu and Hoskote,
 *    Bengaluru". The Hoskote works was retired from public display on 2026-08-09 (see the
 *    @deprecated note on COMPANY.addresses.karnatakaFactory); the Karnataka presence is the
 *    Electronic City office.
 * 3. NO "SEVEN IN TEN" SPLIT. The draft claimed "roughly seven in ten choose MS for price".
 *    Nothing in this codebase records the order mix, so the answer below describes how the
 *    choice is made instead of inventing a ratio.
 */

const MS_COMMERCE = getCommerce("11"); // POC-PC-MSPC — the build this page points at for MS orders

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  telAlt: "+919019910931",
  telAltDisplay: "+91 90199 10931",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%27d%20like%20help%20choosing%20the%20metal%20for%20a%20portable%20cabin",
};

/** The four metals, in the order the decision is usually made. */
const METALS: {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  strapline: string;
  body: string;
  bestFor: string;
  href?: string;
  linkLabel?: string;
}[] = [
  {
    key: "ms",
    icon: Wrench,
    name: "Mild steel (MS) sheet",
    strapline: "The workhorse",
    body:
      "1.5–2 mm MS sheet, primed with epoxy zinc phosphate and finished with a PU topcoat. This is the standard build and what most site offices, guard cabins and bunkhouses use. Strong, easy to repair on site, and the most economical of the four. It wants a repaint every few years to stay rust-free, which is a small job.",
    bestFor: "Site offices, guard cabins, bunkhouses — inland sites, tight budgets",
    href: "/products/ms-portable-cabin",
    linkLabel: "MS Portable Cabin — order online",
  },
  {
    key: "gi",
    icon: ShieldCheck,
    name: "Galvanised (GI) sheet",
    strapline: "For wet and coastal sites",
    body:
      "The sheet carries a zinc coating that keeps resisting corrosion even where the paint gets scratched. If the cabin will live near the coast, inside a chemical plant, or somewhere that stays damp for months, GI is worth the premium. It also asks less of you over its life.",
    bestFor: "Coastal, chemical and high-humidity sites; long deployments",
  },
  {
    key: "ppgi",
    icon: Paintbrush,
    name: "Colour-coated (PPGI) sheet",
    strapline: "For a cleaner look",
    body:
      "Pre-painted galvanised sheet with a factory-baked finish. You get the corrosion resistance of GI plus a smooth, even colour that needs no painting after installation. This is what customer-facing cabins are usually built from.",
    bestFor: "Sales offices, showrooms, clinics — anywhere the public sees the cabin",
  },
  {
    key: "corrugated",
    icon: Container,
    name: "Corrugated container-grade steel",
    strapline: "For stacking and heavy lifting",
    body:
      "This is the material of a shipping container, with the corner castings and structure to match. If the cabin will be stacked two high or handled by container equipment again and again, that is a different product from a panel cabin.",
    bestFor: "Stacked units, spreader lifting, very frequent relocation",
    href: "/products/steel-portable-office-container",
    linkLabel: "Steel Office Container — container-grade build",
  },
];

/** Shared frame and fit-out — identical whichever skin is chosen. */
const SPEC: [string, string][] = [
  ["Frame", "Welded MS C-channel 75 × 40 mm or RHS 50 × 50 × 3 mm, galvanised C and Z purlins"],
  ["Wall skin", "MS 1.5–2 mm, GI or PPGI, as chosen"],
  ["Insulation", "30–50 mm glass wool or rock wool between outer skin and inner lining"],
  ["Roof", "Sloping metal roof, insulated, EPDM waterproofing at the joints"],
  ["Floor", "18 mm cement board on steel joists, 2 mm vinyl finish"],
  ["Doors", "MS flush door 3 × 7 ft, lock and hardware fitted"],
  ["Windows", "Aluminium sliding 3 × 4 ft, tinted glass"],
  ["Electricals", "Concealed wiring, MCB board, LED lights, 6–10 points per 200 sq ft"],
  ["Lifting", "Four lifting lugs, crane and hydra ready"],
  ["Service life", "15–20+ years; longer with GI or PPGI"],
];

const SIZES: { size: string; area: string; use: string; priced?: boolean }[] = [
  { size: "8 × 8 × 8.5 ft", area: "64 sq ft", use: "Guard post, ticket booth" },
  { size: "20 × 8 × 8.5 ft", area: "160 sq ft", use: "2–4 person site office" },
  { size: "20 × 10 × 8.5 ft", area: "200 sq ft", use: "Manager's cabin, meeting room, 4–6 desks", priced: true },
  { size: "30 × 10 × 8.5 ft", area: "300 sq ft", use: "Office with pantry and toilet" },
  { size: "40 × 10 × 8.5 ft", area: "400 sq ft", use: "8–12 bed bunkhouse, open office" },
];

const APPLICATIONS = [
  "Construction sites and infrastructure projects — site offices, stores, labour accommodation",
  "Factory gates and residential complexes — security and guard cabins",
  "Real estate projects — sales offices and sample rooms",
  "Schools and training centres — extra classrooms",
  "Hospitals and CSR programmes — first-aid rooms and health camps",
  "Highways, mines and remote plants — checkpoints and staff rest rooms",
];

const RELATED = [
  { href: "/products/steel-portable-cabin", label: "Steel Portable Cabin", note: "Our standard insulated steel build" },
  { href: "/products/ms-portable-cabin", label: "MS Portable Cabin", note: "Mild steel, ready to order online" },
  { href: "/products/steel-portable-office-container", label: "Steel Office Container", note: "Container-grade, stackable" },
  { href: "/products/guard-security-cabin", label: "Guard Security Cabin", note: "Compact gate and checkpoint cabins" },
];

const WARRANTY_QUESTION = "Do you provide a warranty?";

/* Not exported: the FAQPage JSON-LD is emitted inside this component from the same array
 * that renders, so nothing outside needs it — and a non-component export here trips
 * react-refresh/only-export-components. */
const METAL_PORTABLE_CABIN_FAQS: { question: string; answer: string }[] = [
  {
    question: "Will a metal cabin rust?",
    answer:
      "Not if it is built and finished properly. MS cabins get an epoxy zinc phosphate primer under a PU topcoat; GI and PPGI cabins carry a zinc layer as well, which keeps protecting the sheet even where the surface is scratched. The rusting cabins you see on sites are usually unprimed sheet from a local fabricator.",
  },
  {
    question: "MS, GI or PPGI — how do I choose?",
    answer:
      "Start with the site, not the price list. Inland site, ordinary humidity, budget matters: MS. Coastal air, a chemical plant, or ground that stays wet for months: GI, because the zinc keeps working where paint has been scratched. A cabin customers or the public will look at: PPGI, for the factory-baked finish that never needs repainting. Tell us where the cabin is going and what it is for, and we will say which one we would build.",
  },
  {
    question: "Is it hot inside a metal cabin?",
    answer:
      "A bare metal box would be. These carry 30–50 mm of glass wool or rock wool in the walls and roof, which makes a real difference and lets an ordinary split AC keep up. For a room that will be air-conditioned all day, a PUF panel cabin holds temperature better still.",
  },
  {
    question: "Can I add a toilet, pantry or partition?",
    answer:
      "Yes, all three are common. Mention it at the quote stage so the plumbing and wiring are built in at the factory rather than cut in later on site.",
  },
  {
    question: "How is it moved between sites?",
    answer:
      "Four lifting lugs on the roof. A hydra lifts the cabin onto a trailer as a single welded unit and places it the same way at the next site. Nothing is dismantled.",
  },
  {
    question: WARRANTY_QUESTION,
    answer:
      "Yes. The terms are set out in full on our Warranty page, and service support is available on the numbers on this page.",
  },
  {
    question: "How thick is the sheet?",
    answer:
      "1.5 to 2 mm for walls and roof as standard. Thicker sheet is available where the cabin is for high-security or heavy-industrial use — tell us the application and we will specify it.",
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

export function MetalPortableCabinContent() {
  /* Read, never typed — see the header note. If POC-PC-MSPC ever loses its commerce row the
     sentence degrades to "quoted after we know your size" rather than printing a stale figure. */
  const msPrice = MS_COMMERCE ? formatINR(sellPrice(MS_COMMERCE.basePrice)) : null;

  return (
    <section className="max-w-4xl" aria-label="Metal portable cabin — choosing the metal">
      <JsonLd data={generateFAQSchema(METAL_PORTABLE_CABIN_FAQS)} />

      {/* ------------------------------------------------ the hook ------------------------- */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Which Metal Should Your Cabin Be Made Of?
        </h2>
        <p>
          &ldquo;Metal cabin&rdquo; is what most people type into Google. What they actually want to
          know is narrower: which metal, how thick, will it rust, and what will it cost. This page
          answers those four questions and then sends you to the build that fits.
        </p>
        <p>
          Every cabin we make starts from the same welded MS structural frame. What changes is the
          skin — the sheet on the walls and roof. That one choice moves the price, how the cabin
          handles heat and rain, and how it looks in five years. There is no single best metal,
          only the right one for your site and budget.
        </p>
      </div>

      <Figure
        src="/images/products/metal-portable-cabin/metal-portable-cabin-front.webp"
        alt="Metal portable cabin front elevation in colour-coated sage green sheet with a large picture window and glazed door"
        caption="A colour-coated (PPGI) skin on the standard welded MS frame — the same structure underneath whichever metal you choose."
      />

      {/* ------------------------------------------------ the four metals ------------------ */}
      <div className="mt-12">
        <SectionHeading id="metals" icon={Layers3}>The Four Metals, and What Each Is Good At</SectionHeading>
        <div className="space-y-4">
          {METALS.map((m) => (
            <div key={m.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 inline-flex rounded-lg bg-accent/10 p-2.5">
                  <m.icon className="h-5 w-5 text-accent" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{m.name}</h3>
                  <p className="text-sm font-medium text-accent">{m.strapline}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              <p className="mt-3 text-sm text-foreground">
                <span className="font-semibold">Best for:</span>{" "}
                <span className="text-muted-foreground">{m.bestFor}</span>
              </p>
              {m.href && (
                <Link
                  href={m.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  {m.linkLabel}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Still not sure? A thirty-second description of the site is usually enough for us to
          recommend one.
        </p>
      </div>

      <Figure
        src="/images/products/metal-portable-cabin/metal-portable-cabin-colour-coated-terracotta.webp"
        alt="Metal portable cabin in a terracotta colour-coated finish with stainless trim, showing the factory-baked PPGI colour option"
        caption="The same cabin in a terracotta PPGI finish. A colour-coated skin arrives in its final colour and is not painted again on site."
      />

      {/* ------------------------------------------------ shared frame -------------------- */}
      <div className="mt-12">
        <SectionHeading id="frame" icon={Wrench}>The Same Frame, Whichever Metal You Pick</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Whatever skin you choose, the bones of the cabin do not change.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Component</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Specification</th>
              </tr>
            </thead>
            <tbody>
              {SPEC.map(([label, value], i) => (
                <tr key={label} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">{label}</td>
                  <td className="px-5 py-4 text-muted-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Figure
        src="/images/products/metal-portable-cabin/metal-portable-cabin-interior-office.webp"
        alt="Interior of a metal portable cabin fitted out as an office with a desk, chair, lined walls and LED strip lighting"
        caption="Inside, the skin is lined and insulated, so the finish reads as a room rather than a metal box."
      />

      {/* ------------------------------------------------ sizes --------------------------- */}
      <div className="mt-12">
        <SectionHeading id="sizes" icon={Ruler}>Sizes and What They Are Used For</SectionHeading>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Size (L × W × H)</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Area</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Typical use</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((row, i) => (
                <tr key={row.size} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">
                    {row.size}
                    {row.priced && (
                      <span className="ml-2 align-middle rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        Priced online in MS
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
          Custom lengths, widths, partitions, attached toilets and G+1 stacking are all available.
          Send a rough sketch and we will return a proper drawing.
        </p>
      </div>

      {/* ------------------------------------------------ price --------------------------- */}
      <div className="mt-12">
        <SectionHeading id="price" icon={IndianRupee}>What a Metal Cabin Costs</SectionHeading>
        {msPrice ? (
          <p className="text-muted-foreground leading-relaxed mb-4">
            The 20 × 10 ft insulated cabin in MS sheet is sold at a fixed{" "}
            <strong className="font-semibold text-foreground">{msPrice} including 18% GST</strong>,
            on the{" "}
            <Link href="/products/ms-portable-cabin" className="font-medium text-accent underline-offset-4 hover:underline">
              MS Portable Cabin
            </Link>{" "}
            page, where you can order it online. Galvanised and colour-coated skins add a premium on
            the same build, quoted exactly once we know your size and layout.
          </p>
        ) : (
          <p className="text-muted-foreground leading-relaxed mb-4">
            Every build is quoted once we know your size, metal and layout.
          </p>
        )}
        <p className="text-muted-foreground leading-relaxed mb-4">
          What moves the figure: overall size, the metal you choose, insulation thickness, the number
          of doors and windows, and add-ons such as an attached toilet, false ceiling, AC provision
          or inverter wiring. Transport and crane placement are worked out from your delivery pincode
          and shown before you confirm.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Standard MS sizes can be ordered online straight away. GI and PPGI builds are quoted within
          one working day.
        </p>
      </div>

      {/* ------------------------------------------------ applications -------------------- */}
      <div className="mt-12">
        <SectionHeading id="applications" icon={HardHat}>Where Our Metal Cabins Go to Work</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPLICATIONS.map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Because the cabin is a single welded unit, it can be lifted, moved and reused as many times
          as the work requires.
        </p>
      </div>

      <Figure
        src="/images/products/metal-portable-cabin/metal-portable-cabin-rear-service-side.webp"
        alt="Rear and side of a metal portable cabin showing the service hatch and external power and data inlet"
        caption="The service side: an external inlet for the single incoming power connection, and a lockable hatch for the board."
      />

      {/* ------------------------------------------------ comparison ---------------------- */}
      <div className="mt-12">
        <SectionHeading id="comparison" icon={Container}>Metal Cabin vs the Alternatives</SectionHeading>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">Metal cabin vs PUF panel cabin</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Both sit on the same steel frame. A PUF cabin uses foam sandwich panels instead of a
              metal skin with insulation behind it, so it holds air conditioning better. Choose PUF
              for all-day AC; choose metal for value, easy repair and rough sites. Our{" "}
              <Link href="/products/portable-cabin/materials-ms-vs-puf" className="font-medium text-accent underline-offset-4 hover:underline">
                MS sheet vs PUF panel comparison
              </Link>{" "}
              goes through it properly.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">Metal cabin vs brick construction</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Brick takes months and cannot move. A metal cabin arrives finished and goes with you to
              the next project. If the requirement really is a permanent building on your own plot,
              that is a different job — see our{" "}
              <Link href="/products/home-construction/building-construction-contractor" className="font-medium text-accent underline-offset-4 hover:underline">
                building construction contractor page
              </Link>.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">Metal cabin vs FRP cabin</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              FRP is light and fine for a small guard post, but it cracks under impact and is hard to
              enlarge or repair. For anything bigger than a booth, metal is the better buy.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ delivery ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="delivery" icon={Truck}>Getting Ready for Delivery</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Prepare a level base — compacted earth, a PCC bed or concrete blocks under the corners —
          and make sure a 20 or 40 ft trailer can reach the spot. We arrange the crane or hydra for
          placement. Connect one power supply and the cabin is live.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Delivery is 7 to 21 working days, pan-India, from our Tamil Nadu factory at Kamandoddi near
          Hosur. Freight is calculated from your pincode and shown before you confirm the order.
        </p>
      </div>

      {/* ------------------------------------------------ FAQ ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="faq" icon={ClipboardList}>Frequently Asked Questions</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {METAL_PORTABLE_CABIN_FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`metal-portable-cabin-faq-${index}`}>
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

      {/* ------------------------------------------------ related ------------------------- */}
      <div className="mt-12">
        <SectionHeading id="related" icon={Layers3}>Pick Your Build</SectionHeading>
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

      {/* ------------------------------------------------ CTA ----------------------------- */}
      <div className="mt-12 rounded-3xl bg-accent/10 p-6 md:p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Get a Quote</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Tell us the size, the metal you are leaning towards, your delivery location and what the
          cabin is for. We will send a drawing and a fixed quote — usually the same working day.
        </p>
        <div className="flex flex-wrap gap-3">
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
          Monday to Saturday, 7 AM to 10 PM. ISO 9001:2015 certified and MSME registered, with
          manufacturing at our Tamil Nadu factory in Kamandoddi, near Hosur, and a Bangalore office
          in Electronic City.
        </p>
      </div>
    </section>
  );
}
