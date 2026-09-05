import Link from "next/link";
import {
  PencilRuler, Flame, Layers3, DoorOpen, Zap, ClipboardCheck,
  Ruler, IndianRupee, Users, Scale, Truck, HelpCircle, ChevronRight, CheckCircle2, Phone, MessageCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { OptimizedImage } from "@/components/OptimizedImage";
import { BuyNowCTA } from "@/components/products/BuyNowCTA";

/**
 * PREFABRICATED PORTABLE CABIN (products.ts id 13, SKU POC-PC-PREFAB).
 *
 * ── THE "HOW IT'S MADE" PAGE ────────────────────────────────────────────────────────────────
 * /products/prefab-porta-cabin is the long buyer's GUIDE. To stop the two competing, this page
 * owns the PROCESS intent: what happens between the enquiry and the crane setting the cabin
 * down, step by step, with day ranges. The two link to each other; neither restates the other.
 *
 * ── NO RUPEE FIGURE IN THIS COPY, AND WHY IT MATTERS MORE HERE THAN USUAL ───────────────────
 * The supplied draft said "starts at ₹5,19,200 including 18% GST" and its meta description said
 * "from ₹5.19 lakh". That figure belongs to the MS/Steel cabin (basePrice 440000). THIS SKU is
 * live in the Google Merchant feed at <g:price>324500.00 INR</g:price> — basePrice 275000. A
 * ₹5,19,200 claim in prose would have contradicted the price box, the cart, Razorpay, the
 * JSON-LD offer and the feed by ~60% on an actively-fed offer, which is the misrepresentation
 * class that gets a Merchant account's offers disapproved.
 *
 * Owner decision (2026-09-05): ₹3,24,500 is correct and the draft's figure was carried over from
 * the Steel/Metal copy. The price section below therefore names NO figure and points at the one
 * the template renders. Never type a price into this file.
 *
 * ── IMAGES ──────────────────────────────────────────────────────────────────────────────────
 * Six renders were supplied; five show a furnished prefab HOUSE (porch, curtains, sofa, lawn),
 * not the site-office/security/storage cabin this SKU sells. Owner decision: ship only the real
 * cabin — see scripts/convert-prefabricated-portable-cabin-images.mjs. It is also the product's
 * FIRST real image: images[] was ["/placeholder.svg"], so the feed had been borrowing the
 * sibling product's photo as its g:image_link.
 *
 * ── TWO DEVIATIONS FROM THE SUPPLIED COPY ───────────────────────────────────────────────────
 * 1. NO FOUNDING YEAR ("Since 2014" ×2). Four pages here have claimed 2010, 2014, 2020 and 2022;
 *    src/lib/company.ts records none.
 * 2. NO HOSKOTE FACTORY. Retired from public display 2026-08-09 (see the @deprecated note on
 *    COMPANY.addresses.karnatakaFactory); the Karnataka presence is the Electronic City office.
 */

const CONTACT = {
  tel: "+919731897976",
  telDisplay: "+91 97318 97976",
  telAlt: "+919019910931",
  telAltDisplay: "+91 90199 10931",
  whatsapp:
    "https://wa.me/919731897976?text=Hi%2C%20I%27d%20like%20a%20drawing%20and%20quote%20for%20a%20prefabricated%20portable%20cabin",
};

/** The factory sequence. Day ranges are the owner's; they are the point of this page. */
const STEPS: { n: string; days: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    n: "1", days: "Day 0–2", icon: PencilRuler,
    title: "Drawing and confirmation",
    body: "You tell us the size, what the cabin is for and where it is going. We send back a dimensioned drawing showing the door, windows, partitions and electrical points. Nothing is cut until you approve it.",
  },
  {
    n: "2", days: "Day 2–6", icon: Flame,
    title: "Frame fabrication",
    body: "The base and wall frames are welded from MS C-channel (75 × 40 mm) or RHS (50 × 50 × 3 mm) on a flat jig, so the cabin is square and the floor is level. Galvanised C and Z purlins go in for the roof. Lifting lugs are welded to the corners now, not bolted on later.",
  },
  {
    n: "3", days: "Day 6–10", icon: Layers3,
    title: "Skinning and insulation",
    body: "1.5–2 mm MS sheet — or GI / PPGI if you have chosen it — is fixed to the frame. 30–50 mm glass wool or rock wool goes into the wall and roof cavities, then the inner lining closes it up. The sloping roof gets EPDM waterproofing at every joint.",
  },
  {
    n: "4", days: "Day 10–13", icon: DoorOpen,
    title: "Floor, doors and windows",
    body: "18 mm cement board is laid on the floor joists and finished with 2 mm vinyl. The MS flush door and aluminium sliding windows are fitted and adjusted so they close properly — something that is surprisingly hard to get right on site.",
  },
  {
    n: "5", days: "Day 13–17", icon: Zap,
    title: "Electricals and finishing",
    body: "Concealed wiring, MCB board, LED lights, fans and modular switches are installed and tested. The whole cabin is primed with epoxy zinc phosphate and finished in PU topcoat in your colour.",
  },
  {
    n: "6", days: "Day 17–21", icon: ClipboardCheck,
    title: "Inspection and dispatch",
    body: "Every cabin is hosed down to check for leaks, every circuit is tested, every door and window is opened and closed. Then it is loaded on a trailer and driven to your site, where a crane or hydra places it in one lift.",
  },
];

const SPEC: [string, string][] = [
  ["Structure", "Welded MS frame, galvanised purlins, four lifting lugs"],
  ["Walls & roof", "1.5–2 mm MS sheet, 30–50 mm insulation, inner lining"],
  ["Waterproofing", "Sloping roof with EPDM sealing"],
  ["Floor", "18 mm cement board, 2 mm vinyl finish"],
  ["Door", "MS flush door 3 × 7 ft with lock"],
  ["Windows", "Aluminium sliding 3 × 4 ft, tinted glass"],
  ["Electricals", "6–10 points per 200 sq ft, MCB, LED, concealed wiring"],
  ["Finish", "Zinc phosphate primer + PU topcoat"],
  ["Life", "15–20+ years with basic upkeep"],
  ["Certification", "Built under an ISO 9001:2015 quality system"],
];

const SIZES: { size: string; area: string; use: string }[] = [
  { size: "8 × 8 × 8.5 ft", area: "64 sq ft", use: "Guard cabin, kiosk" },
  { size: "20 × 8 × 8.5 ft", area: "160 sq ft", use: "Site office for 2–4" },
  { size: "20 × 10 × 8.5 ft", area: "200 sq ft", use: "Manager's office, 4–6 desks" },
  { size: "30 × 10 × 8.5 ft", area: "300 sq ft", use: "Office with toilet and pantry" },
  { size: "40 × 10 × 8.5 ft", area: "400 sq ft", use: "Bunkhouse for 8–12, open-plan office" },
];

/** Prefabricated vs built on site, on the five axes buyers actually weigh. */
const COMPARISON: { axis: string; prefab: string; onSite: string }[] = [
  { axis: "Time", prefab: "7–21 days in the factory, one day on site", onSite: "Two to four months, weather permitting" },
  { axis: "Quality", prefab: "Jig-welded frame, factory-tested wiring, leak-checked before dispatch", onSite: "Depends on the crew, the weather and who is watching" },
  { axis: "Disruption", prefab: "No material dumps, no masons, no curing time on your land", onSite: "All of the above, on your site" },
  { axis: "Reuse", prefab: "Lift it, move it, use it again", onSite: "Demolish it" },
  { axis: "Cost", prefab: "Fixed quote agreed before fabrication starts", onSite: "Estimates, extras and delays" },
];

const BUYERS = [
  "Contractors who need a site office up before the first excavator arrives",
  "Developers who want a sales office that looks finished, not temporary",
  "Factories needing gate security, a weighbridge room or a canteen without a civil-works project",
  "Schools, hospitals and NGOs adding a classroom or clinic on a fixed budget",
  "Government departments and mining companies setting up checkpoints and staff rest rooms",
];

const UPGRADES = [
  "GI or colour-coated skin",
  "PUF panel walls",
  "Thicker insulation",
  "Attached toilet or pantry",
  "False ceiling",
  "AC provision",
  "Inverter wiring",
  "Extra doors and windows",
];

const RELATED = [
  { href: "/products/prefab-porta-cabin", label: "Prefab Porta Cabin", note: "The full buyer's guide to prefab cabins" },
  { href: "/products/metal-portable-cabin", label: "Metal Portable Cabin", note: "Choose your metal — MS, galvanised or colour-coated" },
  { href: "/products/steel-portable-cabin", label: "Steel Portable Cabin", note: "Our standard insulated steel build" },
  { href: "/products/ms-portable-cabin", label: "MS Portable Cabin", note: "Mild steel, ready to order online" },
];

const WARRANTY_QUESTION = "Is there a warranty?";

// Not exported: the FAQPage JSON-LD is emitted below from the same array that renders, so
// nothing outside this file needs it.
const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What does "prefabricated" actually include?',
    answer:
      "Everything: the frame, insulated walls and roof, floor, door, windows, wiring, lights and paint. The cabin is usable the day it is placed — the only site work is connecting the power.",
  },
  {
    question: "Can I see the cabin before it is dispatched?",
    answer:
      "Yes. You are welcome to visit the factory during fabrication, and we send photographs at each stage if you cannot come.",
  },
  {
    question: "Do I need any civil work?",
    answer:
      "Only a level base. No foundation, no columns, no plastering — compacted ground, a PCC bed or concrete blocks at the corners is enough.",
  },
  {
    question: "Can the cabin be extended later?",
    answer:
      "Yes. A second module can be placed alongside and joined, or a G+1 unit stacked on top with a proper staircase.",
  },
  {
    question: "How is it transported?",
    answer:
      "On a flatbed trailer, lashed and covered. Cabins up to 40 ft travel as a single piece; anything larger goes as modules and is joined on site.",
  },
  {
    question: "What maintenance does it need?",
    answer:
      "Keep the roof drains clear, touch up any scratches in the paint, and repaint every few years. That is genuinely all.",
  },
  {
    question: WARRANTY_QUESTION,
    answer:
      "Yes. The terms are set out in full on our Warranty page, and our service team is reachable on the numbers on this page.",
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

export function PrefabricatedPortableCabinContent() {
  return (
    <section className="max-w-4xl" aria-label="Prefabricated portable cabin — how it is built">
      <JsonLd data={generateFAQSchema(FAQS)} />

      {/* ------------------------------------------------ the hook ------------------------- */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Built in the Factory, Not in a Field
        </h2>
        <p>
          &ldquo;Prefabricated&rdquo; is a word that gets used loosely. Some suppliers mean a kit of
          panels that a crew bolts together on your land over a week. When we say prefabricated, we
          mean the cabin arrives finished — walls, roof, floor, wiring, doors, windows, paint — and
          the only thing left to do on site is connect the power.
        </p>
        <p>
          That difference matters. A cabin built under a factory roof is square, dry and inspected.
          A cabin assembled in a field in July is whatever the weather and the crew allowed that
          day. This page walks through exactly what happens between your enquiry and the crane
          setting the cabin down. If you are still deciding whether a prefab cabin is right for you
          at all, start with our{" "}
          <Link href="/products/prefab-porta-cabin" className="font-medium text-accent underline-offset-4 hover:underline">
            prefab porta cabin buyer&rsquo;s guide
          </Link>{" "}
          instead — this page assumes you have decided and want to know how it is made.
        </p>
      </div>

      <figure className="my-8">
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <OptimizedImage
            src="/images/products/prefabricated-portable-cabin/prefabricated-portable-cabin-factory-yard.webp"
            alt="Finished prefabricated portable cabin in the factory yard before dispatch, with grilled windows, flush door and exterior lights fitted"
            aspectRatio="4/3"
            className="w-full"
          />
        </div>
        <figcaption className="mt-2.5 text-sm text-muted-foreground italic">
          A finished cabin in the yard, after inspection and before loading. Everything visible here
          — glazing, door, lights, paint — was fitted indoors, not on your site.
        </figcaption>
      </figure>

      {/* ------------------------------------------------ the process ---------------------- */}
      <div className="mt-12">
        <SectionHeading id="process" icon={ClipboardCheck}>How Your Cabin Is Built</SectionHeading>
        {/* A numbered sequence because the content genuinely IS one: each step depends on the
            one before it, and the day ranges only make sense in order. */}
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <s.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-semibold text-foreground">
                      <span className="text-accent">Step {s.n}</span> — {s.title}
                    </h3>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {s.days}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Smaller standard cabins move through this faster; large or heavily customised ones take
          the full three weeks.
        </p>
      </div>

      {/* ------------------------------------------------ spec ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="spec" icon={Layers3}>What You Get, in One Table</SectionHeading>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Item</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Standard specification</th>
              </tr>
            </thead>
            <tbody>
              {SPEC.map(([k, v], i) => (
                <tr key={k} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">{k}</td>
                  <td className="px-5 py-4 text-muted-foreground">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-6 mb-3 font-semibold text-foreground">Upgrades available</h3>
        <div className="flex flex-wrap gap-2">
          {UPGRADES.map((u) => (
            <span key={u} className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
              {u}
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ sizes ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="sizes" icon={Ruler}>Ready-Made Sizes</SectionHeading>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Size (L × W × H)</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Area</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Suits</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((r, i) => (
                <tr key={r.size} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">{r.size}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{r.area}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Because the cabin is designed before it is built, any size within transport limits is
          possible. Wider or taller units are built in modules and joined on site.
        </p>
      </div>

      {/* ------------------------------------------------ price ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="price" icon={IndianRupee}>What It Costs</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-4">
          This cabin is sold at the single price shown at the top of the page, inclusive of 18% GST,
          complete with floor, door, windows and full electrical fit-out. Transport and crane
          charges are calculated from your delivery pincode and shown before you pay, so there is
          nothing to settle when the truck arrives.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Set against building the same room in brick and RCC, you are trading a construction
          programme for a delivery date — and you keep an asset you can lift and reuse at the next
          project rather than demolish.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Standard sizes can be ordered online with UPI, cards or net banking. Custom builds are
          quoted within one working day.
        </p>
      </div>

      {/* ------------------------------------------------ who buys ------------------------- */}
      <div className="mt-12">
        <SectionHeading id="buyers" icon={Users}>Who Buys Prefabricated Cabins From Us</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUYERS.map((b) => (
            <div key={b} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ comparison ----------------------- */}
      <div className="mt-12">
        <SectionHeading id="vs-site" icon={Scale}>Prefabricated vs Built on Site</SectionHeading>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">&nbsp;</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Prefabricated</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Brick &amp; RCC on site</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((c, i) => (
                <tr key={c.axis} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-foreground">{c.axis}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.prefab}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.onSite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground leading-relaxed mt-5">
          Where brick still wins is a permanent building that will never move and has to match the
          rest of a permanent campus. If that is the requirement, our{" "}
          <Link href="/products/home-construction/building-construction-contractor" className="font-medium text-accent underline-offset-4 hover:underline">
            building construction contractor
          </Link>{" "}
          page is the right one. For everything else, prefabricated is the practical choice.
        </p>
      </div>

      {/* ------------------------------------------------ site prep ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="site" icon={Truck}>Preparing Your Site</SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You need a level base — compacted ground, a PCC bed or concrete blocks at the corners —
          and access for a trailer and crane. That is all. Once the cabin is placed, connect the
          power supply and it is ready. Water and drainage are only needed if you have chosen an
          attached toilet or pantry.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          We deliver anywhere in India from our Tamil Nadu factory at Kamandoddi, near Hosur.
        </p>
      </div>

      {/* ------------------------------------------------ FAQ ------------------------------ */}
      <div className="mt-12">
        <SectionHeading id="faq" icon={HelpCircle}>Frequently Asked Questions</SectionHeading>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`prefabricated-portable-cabin-faq-${index}`}>
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
        <SectionHeading id="related" icon={Layers3}>Related Pages</SectionHeading>
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
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Start With a Drawing</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Tell us the size, the use and the delivery location, and we will send a dimensioned
          drawing and a fixed quote — usually the same working day. Or order a standard size online
          and we will start at step 2.
        </p>
        <BuyNowCTA productId="13" />
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
          Monday to Saturday, 7 AM to 10 PM. ISO 9001:2015 certified and MSME registered, with
          manufacturing at our Tamil Nadu factory in Kamandoddi, near Hosur, and a Bangalore office
          in Electronic City.
        </p>
      </div>
    </section>
  );
}
