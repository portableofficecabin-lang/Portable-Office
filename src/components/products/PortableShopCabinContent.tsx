import Image from "next/image";
import {
  Store, IndianRupee, PackagePlus, Truck, HelpCircle, Images, CheckCircle2, MinusCircle,
  Phone, Ruler, MoveRight, Sparkles,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { BuyNowCTA } from "@/components/products/BuyNowCTA";
import { FixedPriceCallout, type FixedOffer } from "@/components/products/FixedPriceCallout";
import { DISPATCH_WORKING_DAYS, INSTALLATION, SHIPPING_ZONES } from "@/data/shippingZones";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

/**
 * Long-form content for the PORTABLE SHOP CABIN — 10 ft × 10 ft (products.ts id 48, SKU
 * POC-PSC-1010), served at /products/portable-shop-cabin.
 *
 * The product template (ProductDetailServer) already renders the gallery, the price box, the
 * Specifications table and the key-features list. This component adds the owner's arranged copy
 * (18 Oct 2026): highlights, About This Cabin, what the price includes, optional add-ons,
 * transport and installation, site preparation, views of the cabin, FAQs (FAQPage JSON-LD) and
 * a closing order band.
 *
 * ── DEVIATIONS FROM THE SUPPLIED COPY, AND WHY ──────────────────────────────────────────────────
 *
 * 1. GLASS FRONT, NOT A ROLLING SHUTTER. The draft described a shutter; every render shows a
 *    glazed display front with a lockable door, and the owner chose that configuration
 *    (2026-10-18). A shutter appears only as a quoted alternative.
 *
 * 2. NO PLACEHOLDERS. Height, wall/roof/floor materials, electrical point counts, the standard
 *    colour, the advance percentage, yard visits and the warranty were still "[confirm …]" in the
 *    draft. The owner chose to publish confirmed facts only, so none of them is stated; the FAQs
 *    that depended on them answer from the site's real checkout instead. There is NO warranty
 *    FAQ: the policy's structural term depends on the cabin's material, which is unconfirmed,
 *    and the owner asked for unconfirmed warranty wording to be omitted (2026-10-18). For the
 *    same reason ProductDetailServer hides the Steel Grade row and the modal's Warranty tab here.
 *
 * 3. NO HAND-TYPED ₹ FIGURE. The price appears once here, through FixedPriceCallout, from the
 *    same sellPrice(basePrice) as the buy box, cart, JSON-LD and feed. The draft's ₹1,50,000 +
 *    ₹27,000 breakdown is left out: a second, ex-GST ₹ amount on a fixed-price landing page is
 *    the kind of conflicting figure Merchant Center flags. Dispatch days, free local delivery and
 *    the installation scope are read from shippingZones.ts, the source checkout uses.
 *
 * 4. RENDERS ARE LABELLED. Every image is an AI-generated render; each caption says so, and so
 *    does the gallery note above (productImageCaptions.ts).
 *
 * ── MOTION ──────────────────────────────────────────────────────────────────────────────────────
 * The CSS-only motion pass the city pages use (src/index.css "PRO-MAX MOTION SYSTEM"): sections
 * and paragraphs `.reveal` as they scroll in, lists and card grids `.reveal-stagger`, figures
 * `.reveal-scale` with a slow hover zoom, cards `.hover-lift` / `.card-glow`, and the contact
 * buttons `.btn-sheen` / `.press`. Zero client JS. Reveals hide content only inside
 * `@supports (animation-timeline: view())`, and every effect is off under
 * prefers-reduced-motion, so crawlers and older browsers get the fully visible static page.
 */

const HIGHLIGHTS = [
  { icon: Ruler, label: "100 sq ft of shop floor" },
  { icon: MoveRight, label: "Relocatable" },
  { icon: Sparkles, label: "Customisation available" },
];

const INCLUDED = [
  "The 10 ft × 10 ft cabin on an MS steel frame, primed and painted",
  "Glazed display front and a lockable entrance door",
  "Flooring, fitted in the workshop",
  "Internal wiring and LED lights, fitted in the workshop",
  "GST at 18%",
];

const NOT_INCLUDED = [
  "Transport — calculated from your delivery PIN code at checkout, before you pay",
  "Installation and positioning — an optional line at checkout",
  "Site base or foundation",
  "Connection from the main electricity supply",
  "Shelves, sales counter and air conditioner",
  "Any customisation outside the standard specification",
];

const ADD_ONS: { name: string; detail: string }[] = [
  { name: "Display shelves", detail: "Wall-mounted shelving for stocking goods" },
  { name: "Sales counter", detail: "A front counter — many owners place it just inside the entrance" },
  { name: "Air conditioner", detail: "Supplied and fitted; in a 10 × 10 ft space it makes a real difference in summer" },
  { name: "Brand colours", detail: "Custom exterior paint in your brand colours" },
  { name: "Signboard", detail: "A signboard for the front of the cabin" },
  { name: "Rolling-shutter front", detail: "In place of the glazed front, on a revised quotation" },
];

const PREPARE = [
  "A level, firm base built to the agreed support requirements",
  "Access for the delivery truck and lifting equipment",
  "Clear space around the placement area",
  "An authorised person on site to receive the cabin",
  "A main electricity connection, arranged through a qualified electrician",
];

const VIEWS: { src: string; alt: string; caption: string }[] = [
  {
    src: "/images/products/portable-shop-cabin/portable-shop-cabin-front-three-quarter.webp",
    alt: "Illustrative render of a 10 ft × 10 ft portable shop cabin with a glazed display front, a lockable entrance door and a glazed side",
    caption: "Illustrative render — the glazed display front and lockable entrance door.",
  },
  {
    src: "/images/products/portable-shop-cabin/portable-shop-cabin-glazed-side.webp",
    alt: "Illustrative render of the portable shop cabin's glazed side, with display shelving visible inside",
    caption: "Illustrative render — the glazed side. Shelves and stock are shown for illustration and are not in the price.",
  },
  {
    src: "/images/products/portable-shop-cabin/portable-shop-cabin-overhead.webp",
    alt: "Illustrative render of the portable shop cabin from above, showing the roof, glazed front and entrance door",
    caption: "Illustrative render — the cabin from above, showing the roof and entrance.",
  },
  {
    src: "/images/products/portable-shop-cabin/portable-shop-cabin-rear-wall.webp",
    alt: "Illustrative render of the portable shop cabin's solid rear wall, standing on corner blocks",
    caption: "Illustrative render — the solid rear wall, standing on corner blocks.",
  },
];

/**
 * The zone checkout charges nothing for, if the owner has one configured (shippingZones.ts).
 * Described by PIN-code prefix, never by distance: checkout assigns zones by prefix, and the
 * category pages word it the same way (category-landings.test.ts, check 9).
 */
const FREE_ZONE = SHIPPING_ZONES.find((zone) => zone.rate === 0 && zone.pincodePrefixes.length > 0);

/** "560, 562, 563 or 635" */
function listOr(items: readonly string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

const FREE_DELIVERY_LINE = FREE_ZONE
  ? ` Delivery is free to PIN codes beginning ${listOr(FREE_ZONE.pincodePrefixes)}.`
  : "";

const DISPATCH = `${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`;

interface Faq {
  question: string;
  answer: string;
}

const FAQ_GROUPS: { title: string; faqs: Faq[] }[] = [
  {
    title: "Ordering",
    faqs: [
      {
        question: "How do I place an order?",
        answer:
          `Select Buy Now or Add to Cart, enter your delivery PIN code at checkout to see the transport charge, choose whether you want installation, and pay online. You can also call or WhatsApp us on ${primaryPhone.display}. Add-ons and custom requirements need a written quotation before you order.`,
      },
      {
        question: "Do I pay an advance or the full amount?",
        answer:
          "An online order is paid in full at checkout: the cabin price, the transport charge for your PIN code, and installation if you choose it. Add-ons and custom builds are quoted separately, and their payment terms are stated in that quotation.",
      },
    ],
  },
  {
    title: "Delivery and site preparation",
    faqs: [
      {
        question: "How long does delivery take?",
        answer:
          `The cabin is dispatched within ${DISPATCH} of your order, plus transit to your PIN code. Add-ons can take a few days more; your quotation states the time.`,
      },
      {
        question: "Do you deliver to my location?",
        answer:
          `We deliver across India. Enter your delivery PIN code at checkout and the transport charge is shown before you pay.${FREE_DELIVERY_LINE} If checkout can't work out a charge for your PIN code, our team quotes transport for your site.`,
      },
      {
        question: "Do I need permission to install a shop cabin?",
        answer:
          "Requirements depend on the location, the land use and the business you plan to run. Check with your local authority and the landowner before delivery. Obtaining permits is the buyer's responsibility unless we agree otherwise in writing.",
      },
    ],
  },
  {
    title: "Customisation",
    faqs: [
      {
        question: "Can I order another size?",
        answer:
          "Other sizes can be quoted on request. Dimensions, layout and specification are agreed in writing before manufacture. The online price covers only the 10 ft × 10 ft cabin on this page.",
      },
      {
        question: "Can you use my brand colours or add a signboard?",
        answer:
          "Yes. Custom paint and a signboard are quoted separately. Share your branding when you ask for a quotation.",
      },
      {
        question: "Can I have a rolling shutter instead of the glass front?",
        answer:
          "Yes. A rolling-shutter front can be quoted before you order. It is not part of the online price; the shutter, framing and any extra security fittings are specified in the quotation.",
      },
      {
        question: "Can the cabin be moved later?",
        answer:
          "Yes. It is built to be lifted and moved with suitable lifting and transport. Site preparation, lifting, transport and reconnecting utilities are charged at the time of shifting.",
      },
    ],
  },
];

const ALL_FAQS = FAQ_GROUPS.flatMap((group) => group.faqs);

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
    <h2 id={id} className="reveal scroll-mt-24 font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
      <Icon className="h-7 w-7 text-accent shrink-0" />
      {children}
    </h2>
  );
}

export function PortableShopCabinContent({ offer }: { offer?: FixedOffer }) {
  return (
    <section className="max-w-4xl" aria-label="Portable shop cabin — full details">
      <JsonLd data={generateFAQSchema(ALL_FAQS.map(({ question, answer }) => ({ question, answer })))} />

      {/* ------------------------------------------------ highlights ----------------------- */}
      {/* hover-lift sits on an INNER element throughout: a .reveal-stagger child keeps the
          animation's final transform (fill-mode both), which would override the hover lift. */}
      <ul className="reveal-stagger flex flex-wrap gap-3">
        {HIGHLIGHTS.map((item) => (
          <li key={item.label}>
            <span className="hover-lift inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-foreground">
              <item.icon className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="reveal mt-4 text-muted-foreground">
        Have a question first? Call or WhatsApp us on{" "}
        <a href={`tel:${primaryPhone.e164}`} className="font-semibold text-accent hover:underline">
          {primaryPhone.display}
        </a>
        . We&rsquo;ll give you a straight answer.
      </p>

      {/* ------------------------------------------------ about ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="about" icon={Store}>About This Cabin</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p className="reveal">
            Opening a conventional shop means coordinating contractors, materials and construction
            work. A portable shop cabin brings the main structure and the agreed fittings together in
            one workshop-built unit.
          </p>
          <p className="reveal">
            This 10 ft × 10 ft cabin gives you 100 sq ft of floor area for uses such as a kirana
            counter, a mobile accessories shop, a small boutique or a ticket counter. Food and medical
            retail need suitable fittings and the applicable permissions.
          </p>
          <p className="reveal">
            If your business changes location, the cabin can be lifted and transported to another
            prepared site. Lifting, transport and reconnection are quoted separately.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ price ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="price" icon={IndianRupee}>What the Price Includes</SectionHeading>
        {offer && (
          <div className="reveal-scale mb-6">
            <FixedPriceCallout offer={offer} />
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="reveal card-glow rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Included in the price</h3>
            <ul className="reveal-stagger space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal card-glow rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Charged separately</h3>
            <ul className="reveal-stagger space-y-3">
              {NOT_INCLUDED.map((item) => (
                <li key={item} className="flex gap-3">
                  <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="reveal mt-5 text-sm text-muted-foreground leading-relaxed">
          Furniture, merchandise and optional fittings shown in the images are not part of the price.
          They are included only when they are listed in a written quotation.
        </p>
      </div>

      {/* ------------------------------------------------ add-ons -------------------------- */}
      <div className="mt-12">
        <SectionHeading id="add-ons" icon={PackagePlus}>Optional Add-ons</SectionHeading>
        <p className="reveal text-muted-foreground leading-relaxed mb-5">
          Add-ons are not sold online and are not part of the online price. Tell us what you need
          before you order: the agreed fittings and their charges go into a written quotation, and we
          fit them before dispatch so the cabin arrives ready to use.
        </p>
        <ul className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADD_ONS.map((addOn) => (
            <li key={addOn.name}>
              <div className="hover-lift card-glow h-full rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="font-semibold text-foreground">{addOn.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{addOn.detail}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-accent">On quotation</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------ transport ------------------------ */}
      <div className="mt-12">
        <SectionHeading id="transport" icon={Truck}>Transport and Installation</SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p className="reveal">
            We build and dispatch from our factory at Kamandoddi, near Hosur in Tamil Nadu.
            Transport is charged by delivery zone, worked out from your PIN code: enter it at
            checkout and the charge is shown before you pay, so nothing changes on delivery day.
            {FREE_DELIVERY_LINE}
          </p>
          <p className="reveal">
            <strong className="font-semibold text-foreground">{INSTALLATION.label}</strong> is an
            optional line at checkout. {INSTALLATION.description}
          </p>
        </div>
        <div className="reveal mt-6 rounded-2xl border border-border bg-muted/40 p-5">
          <h3 className="mb-4 font-semibold text-foreground">Please prepare</h3>
          <ul className="reveal-stagger space-y-3">
            {PREPARE.map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Base preparation, lifting arrangements and who handles each task are confirmed with you
            before dispatch.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ views ---------------------------- */}
      <div className="mt-12">
        <SectionHeading id="views" icon={Images}>Views of the Cabin</SectionHeading>
        <div className="reveal-stagger grid gap-5 sm:grid-cols-2">
          {VIEWS.map((view) => (
            <div key={view.src}>
              <figure className="group hover-lift card-glow h-full overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[3/2] w-full overflow-hidden">
                  <Image
                    src={view.src}
                    alt={view.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 448px"
                    className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading="lazy"
                  />
                </div>
                <figcaption className="p-4 text-sm italic text-muted-foreground">{view.caption}</figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ FAQs ----------------------------- */}
      <div className="mt-12">
        <SectionHeading id="faqs" icon={HelpCircle}>Frequently Asked Questions</SectionHeading>
        <div className="space-y-8">
          {FAQ_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="reveal mb-3 text-sm font-semibold uppercase tracking-wider text-accent">{group.title}</h3>
              {/* Native <details>: every answer stays in the server HTML beside the FAQPage
                  JSON-LD, with no client JS. */}
              <div className="reveal-stagger space-y-3">
                {group.faqs.map((faq) => (
                  <details key={faq.question} className="group/faq rounded-xl border border-border bg-card px-5 py-4 open:shadow-sm">
                    <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden flex items-start justify-between gap-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span>{faq.question}</span>
                      <span
                        className="mt-0.5 shrink-0 text-accent transition-transform duration-200 group-open/faq:rotate-45 motion-reduce:transition-none"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ order band ----------------------- */}
      <div className="reveal-scale mt-12 rounded-2xl border border-accent/30 bg-muted/40 p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Order Your Shop Cabin</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">
          Buy the standard 10 ft × 10 ft cabin online, or talk to us about your layout, display
          shelves, counter and branding.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <BuyNowCTA productId={offer?.productId} />
          <a
            href={`tel:${primaryPhone.e164}`}
            className="btn-sheen press inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            Call {primaryPhone.display}
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sheen press inline-flex items-center justify-center gap-2 rounded-md bg-[#0B7A43] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096436]"
          >
            <WhatsAppGlyph className="h-4 w-4 shrink-0" />
            WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  );
}
