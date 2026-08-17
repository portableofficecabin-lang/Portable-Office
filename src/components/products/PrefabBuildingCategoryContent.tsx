/**
 * PREFAB BUILDING CATEGORY — SEO content section (page copy + FAQ + the data both share with the
 * page's JSON-LD).
 *
 * EVERY ₹ figure is computed live from the SAME source of truth the product cards, product pages,
 * cart, checkout and Merchant feed use — `sellPrice(getCommerce(id).basePrice)` — and is labelled
 * GST-INCLUSIVE, the site-wide convention. Nothing here hardcodes a price, so this copy cannot
 * contradict the cards rendered above it. If a SKU stops being purchasable the row simply
 * disappears; it can never strand a stale figure.
 *
 * Facts policy: every claim is verifiable elsewhere on this site — ISO 9001:2015 certificate
 * QT-99968/0726 (IsoCertificationBadge), the Tamil Nadu factory at Kamandoddi, Hosur (Footer,
 * company.ts), and 7–15 working days dispatch + 1–5 days transit (productCommerce DELIVERY, shown
 * on the product pages themselves). Nothing about a Bangalore or Karnataka factory: manufacturing
 * is Tamil Nadu only, and Bangalore is an office.
 *
 * Copy is written fresh for this category rather than adapted from the portable-cabins guide —
 * near-duplicate category pages are the doorway-page pattern Google penalises.
 *
 * The FAQ array is exported and reused VERBATIM by the category page's FAQPage JSON-LD, so page
 * copy and schema share one literal source.
 */

import Link from "next/link";
import { products as catalogProducts, getProductSlug, type Product } from "@/data/products";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import { sellPrice } from "@/lib/pricing/gst";

const SLUG = "prefab-building";

/** ₹ formatter, Indian grouping. */
const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

/** The category's purchasable models with their LIVE customer-facing (GST-inclusive) prices. */
export function prefabBuildingModels(products: Product[]) {
  return products
    .filter((p) => p.categorySlug === SLUG && isOutrightSale(p.id))
    .map((p) => {
      const c = getCommerce(p.id)!;
      return {
        name: p.name,
        slug: getProductSlug(p),
        price: sellPrice(c.basePrice),
        size: c.size,
        bestFor: c.bestFor,
      };
    })
    .sort((a, b) => a.price - b.price);
}

/* Price band from the SAME catalog + commerce data the cards use, so the FAQ (and its schema copy)
 * can never quote a figure the product pages do not show. */
const CATEGORY_PRICES = catalogProducts
  .filter((p) => p.categorySlug === SLUG && isOutrightSale(p.id))
  .map((p) => sellPrice(getCommerce(p.id)!.basePrice));
const PRICE_MIN = CATEGORY_PRICES.length ? Math.min(...CATEGORY_PRICES) : 0;

/** FAQ — published on the page as H3 blocks AND injected verbatim as FAQPage schema. */
export const prefabBuildingFaqs: { question: string; answer: string }[] = [
  {
    question: "What is the difference between a prefab building and a container office?",
    answer:
      "A container office starts from a steel shipping container: the shell already exists, and we fit it out. A prefab building has no shell to start with — insulated wall panels, a steel frame and a truss roof are fabricated in our factory and bolted together on your site. That means the footprint is not tied to container dimensions, you can have clear-span width and a higher ceiling, and the panels can be carried by hand into sites a trailer cannot reach.",
  },
  {
    question: "How long does a prefab building take to put up?",
    answer:
      "Fabrication runs in our Tamil Nadu factory while your site is being prepared. Dispatch is 7–15 working days from order confirmation, with 1–5 days in transit depending on distance, and assembly on site is measured in days rather than months. The exact programme depends on the size and finish, and your written quotation states it.",
  },
  {
    question: "Can a prefab building be dismantled and moved later?",
    answer:
      "Yes — that is the point of a bolted panel system. When a project finishes, the panels unbolt, load onto a truck and stand up again at the next site. Nothing is cast into the ground, so you are not writing the building off when the launch ends.",
  },
  {
    question: "What foundation does a prefab building need?",
    answer:
      "A level, firm surface. Most sites use a simple plinth or concrete pads under the frame rather than a full RCC foundation, which is a large part of why the programme is short. We confirm what your ground needs before dispatch.",
  },
  {
    question: "Can I have my own layout?",
    answer:
      "Yes. The plan is yours and we build to it — one large open hall, partitioned cabins, a mezzanine, or a mix. Wall positions, door and window placement, flooring, ceiling, lighting and electrical points are all specified before fabrication starts, so nothing is cut twice.",
  },
  {
    question: "Are the prices on this page final?",
    answer:
      CATEGORY_PRICES.length > 0
        ? `The listed prices are fixed and GST-inclusive, and each one buys the exact configuration named beside it — the same figure you will see on the product page and pay at checkout. Transport to your site and installation are quoted separately, because both depend on where you are. Anything outside those configurations is quoted to your drawing.`
        : "Prices depend on the footprint, specification and finish, so each build is quoted to your drawing. Send us the plan and we will come back with an itemised quotation.",
  },
  {
    question: "Where are these buildings manufactured?",
    answer:
      "At our own factory at Kamandoddi, near Hosur in Tamil Nadu — roughly 40 km from Bangalore on the Hosur road corridor. We are an ISO 9001:2015 certified manufacturer, certificate number QT-99968/0726, and we deliver across India.",
  },
];

export function PrefabBuildingCategoryContent({ products }: { products: Product[] }) {
  const models = prefabBuildingModels(products);

  return (
    <section className="mt-16 space-y-12 max-w-4xl" aria-label="Prefab building guide">
      {/* intro — the H1 for this page is the header band above */}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          A prefab building is not a container with windows cut into it. There is no shell to start
          from: the wall panels, the steel frame and the truss roof are all fabricated in our factory,
          shipped flat, and bolted together on your site. That one difference is what lets the
          footprint follow your drawing instead of a container&apos;s dimensions — clear-span width with
          no columns through the middle, ceiling height a container cannot give, and panels light
          enough to be carried in by hand where a trailer will never fit.
        </p>
        <p>
          Everything here is built at our own factory at Kamandoddi, near Hosur in Tamil Nadu, by an
          ISO 9001:2015 certified manufacturer (Certificate No. QT-99968/0726), and delivered across
          India. If a{" "}
          <Link href="/products/category/container-offices" className="text-accent hover:underline">
            container office
          </Link>{" "}
          fits your site better, that is a different section — this one is for the builds a container
          cannot do.
          {PRICE_MIN > 0 && (
            <>
              {" "}
              Listed configurations start at{" "}
              <strong className="text-foreground">{inr(PRICE_MIN)} (incl. GST)</strong>.
            </>
          )}
        </p>
      </div>

      {/* models & prices — LIVE from the same source as the cards above */}
      {models.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-bold mb-3">Configurations &amp; Prices</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Each price below is fixed and GST-inclusive, and buys the exact footprint named beside it
            — the same figure shown on the product page and charged at checkout. Transport and
            installation are quoted separately for your site. Any other size or layout is built to
            your drawing and quoted from it.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-semibold">Build</th>
                  <th className="px-4 py-3 font-semibold">Footprint</th>
                  <th className="px-4 py-3 font-semibold">Best for</th>
                  <th className="px-4 py-3 font-semibold text-right">Price (incl. GST)</th>
                </tr>
              </thead>
              <tbody>
                {models.map((mdl) => (
                  <tr key={mdl.slug} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${mdl.slug}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {mdl.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{mdl.size}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mdl.bestFor}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                      {inr(mdl.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* what the system is made of */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">What the Building Is Made Of</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
          <li>Steel frame with a truss roof, so spans can run clear with no mid-floor columns</li>
          <li>Insulated PUF or rockwool sandwich wall and roof panels</li>
          <li>Bolted panel joints — the reason the building comes apart again</li>
          <li>Doors, windows and glazing set into the panel grid to your plan</li>
          <li>Concealed wiring, distribution board, lighting and socket points</li>
          <li>Flooring in vinyl, laminate or tile</li>
          <li>Provision for air conditioning, networking and CCTV</li>
          <li>Optional false ceiling, partitions, mezzanine, pantry and washrooms</li>
        </ul>
      </div>

      {/* where it is used */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Where a Prefab Building Makes Sense</h2>
        <p className="text-muted-foreground leading-relaxed">
          It earns its place wherever the space has to look permanent, open up wide, and still come
          down again later. Project sales galleries and marketing offices for launches, township
          experience centres, large site admin blocks, canteens and training halls, exhibition and
          display spaces, and multi-storey office blocks on plots where a conventional build would
          take the whole project timeline. Where the requirement is a compact site office or a guard
          post instead, a{" "}
          <Link href="/products/category/portable-cabins" className="text-accent hover:underline">
            portable cabin
          </Link>{" "}
          or a{" "}
          <Link href="/products/category/security-cabins" className="text-accent hover:underline">
            security cabin
          </Link>{" "}
          is the cheaper answer.
        </p>
      </div>

      {/* delivery */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Delivery &amp; Installation</h2>
        <p className="text-muted-foreground leading-relaxed">
          Fabrication happens at our Tamil Nadu factory while your site is prepared, so the two run
          in parallel rather than end to end. Dispatch is 7–15 working days from order confirmation
          with 1–5 days in transit, and assembly on site is a matter of days. You need a level, firm
          surface and clear vehicle access; our team confirms site readiness before anything leaves
          the factory, and handles placement and handover on arrival.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-border bg-muted/40 p-6">
        <h2 className="font-display text-2xl font-bold mb-2">Send Us the Plan</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Tell us the footprint, the layout and where the building has to stand, and we will come
          back with a drawing and an itemised quotation — no obligation.
        </p>
        <Link
          href="/contact"
          className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Get a Quotation
        </Link>
      </div>

      {/* FAQ — the exact array reused by the page's FAQPage JSON-LD */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-5">
          {prefabBuildingFaqs.map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold mb-1">{f.question}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
