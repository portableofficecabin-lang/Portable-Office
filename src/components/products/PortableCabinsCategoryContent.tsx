/**
 * PORTABLE CABINS CATEGORY — SEO content section (page copy + FAQ + the data both share with the
 * page's JSON-LD).
 *
 * EVERY ₹ figure on this page is computed live from the SAME source of truth the product cards,
 * product pages, cart, checkout and Merchant feed use — `sellPrice(getCommerce(id).basePrice)` —
 * and is labelled GST-INCLUSIVE, because that is the site-wide convention (productCommerce.ts:
 * basePrice is ex-GST; the customer-facing price is always sellPrice). Nothing here hardcodes a
 * price, so this copy can never contradict the cards rendered above it or the feed.
 *
 * Facts policy: every claim below is verifiable elsewhere on this site — ISO 9001:2015 certificate
 * QT-99968/0726 (IsoCertificationBadge), MSME/Udyam registration and both factory addresses
 * (Footer), 15+ years / 500+ projects / up to 60% cheaper (HeroSection, WhatSetsUsApart), client
 * names (TrustedClientsSection), 7–21 working days dispatch (productCommerce DELIVERY). Claims from
 * draft copy that could NOT be verified against site data (10×8 ft standard size, business hours,
 * "2–3 week" lead time) were corrected or omitted rather than published.
 *
 * The FAQ array is exported and reused VERBATIM by the category page's FAQPage JSON-LD — Google
 * cross-checks that page copy and schema match, so they share one literal source.
 */

import Link from "next/link";
import { products as catalogProducts, type Product } from "@/data/products";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { sellPrice } from "@/lib/pricing/gst";

/** The one-H1-per-page override for this category (used by the listing view). */
export const CATEGORY_H1: Record<string, string> = {
  "portable-cabins": "Portable Cabins — Factory-Built, Delivered Anywhere in India",
};

/** ₹ formatter, Indian grouping. */
const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

/** The category's purchasable models with their LIVE customer-facing (GST-inclusive) prices. */
export function portableCabinModels(products: Product[]) {
  return products
    .filter((p) => p.categorySlug === "portable-cabins" && isPurchasable(p.id))
    .map((p) => {
      const c = getCommerce(p.id)!;
      return {
        name: p.name,
        slug: p.slug,
        price: sellPrice(c.basePrice),
        bestFor: c.bestFor,
      };
    })
    .sort((a, b) => a.price - b.price);
}

/* The category's price band, computed from the SAME catalog + commerce data the cards use — so the
 * FAQ (and its schema copy) can never quote a price the product pages do not show. */
const CATEGORY_PRICES = catalogProducts
  .filter((p) => p.categorySlug === "portable-cabins" && isPurchasable(p.id))
  .map((p) => sellPrice(getCommerce(p.id)!.basePrice));
const PRICE_MIN = CATEGORY_PRICES.length ? Math.min(...CATEGORY_PRICES) : 0;
const PRICE_MAX = CATEGORY_PRICES.length ? Math.max(...CATEGORY_PRICES) : 0;

/** FAQ — published on the page as H3 blocks AND injected verbatim as FAQPage schema. */
export const portableCabinsFaqs: { question: string; answer: string }[] = [
  {
    question: "What is the price of a portable cabin in India?",
    answer:
      `Portable cabin prices in India start around ${inr(PRICE_MIN)} (incl. GST) for basic labour hutments and range up to ${inr(PRICE_MAX)} (incl. GST) for premium executive-grade cabins. The final price depends on size, material (MS, PUF, ACP), interior finish and fittings such as toilets and AC provisioning. Prices exclude transport and installation — request a quote for a landed cost at your site.`,
  },
  {
    question: "What sizes do portable cabins come in?",
    answer:
      "Popular ready configurations include 20 ft cabins for site and executive offices and 40 ft units such as our bunkhouse for 8–12 workers. Because we manufacture in-house, any custom size or layout is possible, including G+1 double-storey configurations for offices and labour colonies.",
  },
  {
    question: "How long does delivery and installation take?",
    answer:
      "Standard models are typically dispatched within 7–21 working days of order confirmation. Because cabins arrive factory-finished — structure, insulation, electricals, doors and windows already fitted — installation at your site is fast: the cabin is craned onto a level base and connected to power and water.",
  },
  {
    question: "Does a portable cabin need a foundation?",
    answer:
      "No RCC foundation is required for standard cabins. A levelled surface, concrete blocks or a simple plinth is sufficient. This also makes it easy to relocate the cabin later.",
  },
  {
    question: "Can a portable cabin be shifted to another site?",
    answer:
      "Yes — relocatability is the core advantage. The cabin is lifted by crane onto a trailer and moved to the new site, where it is ready to use again. MS cabins in particular are built for repeated relocation.",
  },
  {
    question: "Which material should I choose — MS, PUF, or ACP?",
    answer:
      "Choose MS (mild steel) for heavy-duty, long-life use across multiple sites; PUF panels for the best insulation where people work or live full-time; and ACP for a premium look on customer-facing cabins like sales offices. Our team will recommend the right build for your use and budget.",
  },
  {
    question: "How long does a portable cabin last?",
    answer:
      "A well-maintained MS portable cabin lasts 15–20 years or more. Weatherproof coatings protect against monsoon moisture and UV exposure, and individual panels can be repaired or replaced over the cabin's life.",
  },
  {
    question: "Can I get a portable cabin with a toilet and pantry?",
    answer:
      "Yes. Attached toilets, pantries, partitions, AC provisioning and furniture packages are available on our models. The 40 ft bunkhouse, for example, sleeps 8–12 workers with an attached bathroom and a small pantry area.",
  },
  {
    question: "Do you deliver portable cabins outside Bangalore?",
    answer:
      "Yes — we deliver and install across India from our factories in Hoskote (Karnataka) and Kamandoddi (Tamil Nadu). Transport is quoted based on distance to your site, and our team manages the crane and placement at delivery.",
  },
  {
    question: "Are portable cabins cheaper than brick-and-mortar construction?",
    answer:
      "Yes — up to 60% cheaper than conventional construction, and dramatically faster. You also avoid demolition losses: when the project ends, the cabin moves to your next site or can be resold, so it retains value as an asset.",
  },
];

/* ------------------------------------------------------------------ the section ---------------- */

export function PortableCabinsCategoryContent({ products }: { products: Product[] }) {
  const models = portableCabinModels(products);
  const minPrice = models.length ? models[0].price : null;

  return (
    <section className="mt-16 space-y-12 max-w-4xl" aria-label="Portable cabins buying guide">
      {/* intro (the H1 for this page is the header band above) */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Portable cabins from Portable Office Cabin are complete, ready-to-use buildings —
          manufactured, insulated, wired and finished in our own factories, then delivered to your
          site in days instead of months. Whether you need a site office for a construction project,
          secure staff accommodation, a sales office or a{" "}
          <Link href="/products/category/security-cabins" className="text-accent hover:underline">security cabin</Link>,
          our portable cabins cost up to 60% less than conventional construction and can be
          relocated whenever your project moves.
        </p>
        <p>
          We are an ISO 9001:2015 certified manufacturer (Certificate No. QT-99968/0726) with 15+
          years in modular construction, two in-house factories — Hoskote, Karnataka and Kamandoddi,
          Tamil Nadu — and 500+ projects delivered across India for clients including Tata Projects,
          Ashok Leyland, Asian Paints and Brigade Group.
          {minPrice !== null && <> Prices start at <strong className="text-foreground">{inr(minPrice)} (incl. GST)</strong>.</>}
        </p>
      </div>

      {/* models & prices — LIVE from the same source as the cards above */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Portable Cabin Models &amp; Prices</h2>
        <p className="text-sm text-muted-foreground mb-4">
          All prices are fixed, GST-inclusive prices — the same price you will see on the product
          page and pay at checkout. Transport and installation are quoted separately for your site.
          Every model can be customised in size, layout and finish.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
                <th className="px-4 py-3 font-semibold text-right">Price (incl. GST)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((mdl) => (
                <tr key={mdl.slug} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <Link href={`/products/${mdl.slug}`} className="font-medium text-accent hover:underline">
                      {mdl.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{mdl.bestFor}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(mdl.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* sizes */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Sizes &amp; Specifications</h2>
        <div className="overflow-x-auto rounded-xl border border-border mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Typical use</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">20 ft</td>
                <td className="px-4 py-3 text-muted-foreground">Site office for 4–6 people, executive office, sales office</td>
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">40 ft</td>
                <td className="px-4 py-3 text-muted-foreground">Bunkhouse for 8–12 workers with bathroom, large office, classroom</td>
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">Custom / G+1</td>
                <td className="px-4 py-3 text-muted-foreground">Stacked offices, labour colonies, clinics — any size, made to order</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Every cabin ships with a welded MS structural frame, insulated wall and roof panels
          (PUF/EPS options), factory-fitted electricals with distribution board, UPVC or aluminium
          windows, lockable doors and weatherproof exterior coating rated for Indian summers and
          monsoons. Flooring, AC provisioning, attached toilets and partitions are available on
          request.
        </p>
      </div>

      {/* materials */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Choose Your Material: MS, PUF or ACP</h2>
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold mb-1">MS (Mild Steel) Cabins</h3>
            <p className="text-muted-foreground leading-relaxed">
              The workhorse of Indian project sites. A fully welded mild-steel body handles rough
              handling, repeated relocation and 15–20 years of service with basic maintenance.
              Choose MS when the cabin will move between multiple sites or face heavy industrial use.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold mb-1">PUF Panel Cabins</h3>
            <p className="text-muted-foreground leading-relaxed">
              Polyurethane foam sandwich panels give the best thermal insulation — interiors stay
              significantly cooler in summer, cutting air-conditioning costs. Ideal for offices,
              accommodation, clinics and any space where people work full days.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold mb-1">ACP Cabins</h3>
            <p className="text-muted-foreground leading-relaxed">
              Aluminium composite panel exteriors deliver a sleek, modern finish for customer-facing
              uses — sales offices, showrooms, marketing suites and reception cabins — at a lighter
              weight and premium look.
            </p>
          </div>
        </div>
      </div>

      {/* who uses */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Who Uses Our Portable Cabins</h2>
        <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-5">
          <li><strong className="text-foreground">Construction &amp; infrastructure:</strong> site offices, engineers&rsquo; cabins, stores and labour hutments that relocate with the project.</li>
          <li><strong className="text-foreground">Industry &amp; warehousing:</strong> security cabins, weighbridge offices and supervisor cabins for factories and yards.</li>
          <li><strong className="text-foreground">Real estate:</strong> branded sales offices and marketing suites that go up before the project does.</li>
          <li><strong className="text-foreground">Institutions:</strong> temporary classrooms, health clinics, vaccination units and site laboratories.</li>
          <li><strong className="text-foreground">Events &amp; retail:</strong> ticket counters, kiosks, food stalls and pop-up stores.</li>
          <li><strong className="text-foreground">Farmhouses &amp; homestays:</strong> ready-to-live cabins for weekend properties and resorts — see our <Link href="/products/category/prefab-homes" className="text-accent hover:underline">prefab homes</Link>.</li>
        </ul>
      </div>

      {/* why us */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Why Buy From Portable Office Cabin</h2>
        <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-5">
          <li><strong className="text-foreground">In-house manufacturing, no middlemen.</strong> Two factories in Karnataka and Tamil Nadu mean factory-direct prices and full quality control — we are the manufacturer, not a reseller.</li>
          <li><strong className="text-foreground">ISO 9001:2015 certified.</strong> Documented quality processes on every build (Certificate No. QT-99968/0726); GST-registered and Udyam/MSME registered (UDYAM-TN-11-0068545).</li>
          <li><strong className="text-foreground">15+ years, 500+ projects delivered.</strong> Trusted by Tata Projects, Ashok Leyland, Asian Paints and Brigade Group.</li>
          <li><strong className="text-foreground">Up to 60% cheaper than civil construction</strong> — and the cabin is an asset you can relocate or resell, not a structure you demolish.</li>
          <li><strong className="text-foreground">Pan-India delivery.</strong> Cabins delivered and installed across the country, factory-finished and usable when they arrive.</li>
        </ul>
      </div>

      {/* delivery */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Delivery &amp; Installation Across India</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your cabin is built complete in our factory — structure, insulation, electricals, doors,
          windows and finishes — then transported to your site by trailer and placed by crane onto a
          simple level base. Standard cabins need no RCC foundation: a levelled surface or concrete
          blocks are enough. Standard models are typically dispatched within 7–21 working days of
          order confirmation. Also see our{" "}
          <Link href="/products/category/site-office-containers" className="text-accent hover:underline">site office containers</Link>{" "}
          and <Link href="/products/category/portable-toilet-cabins" className="text-accent hover:underline">portable toilet cabins</Link>{" "}
          for complete site set-ups.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <h2 className="font-display text-2xl font-bold mb-2">Get a Price for Your Site — Today</h2>
        <p className="text-muted-foreground leading-relaxed">
          Tell us your location, cabin size and intended use, and our team will send a detailed
          quotation with transport costs. Call{" "}
          <a href="tel:+919731897976" className="text-accent font-semibold hover:underline">+91 97318 97976</a> /{" "}
          <a href="tel:+919019910931" className="text-accent font-semibold hover:underline">+91 90199 10931</a>{" "}
          or WhatsApp us your requirement.
        </p>
      </div>

      {/* FAQ — same array the FAQPage schema uses, so copy and schema can never diverge */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-5">
          {portableCabinsFaqs.map((f) => (
            <div key={f.question}>
              <h3 className="font-display text-lg font-bold mb-1">{f.question}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
