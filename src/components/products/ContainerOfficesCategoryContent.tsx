/**
 * CONTAINER OFFICES CATEGORY — manufacturer landing content for /products/category/container-offices.
 *
 * A SERVER component. The category page renders it and hands the result to the client listing view
 * as a ReactNode (`categoryContent`), so none of the data it reads — the company record, the freight
 * zone table, the city-page catalogue — is shipped to the browser as JavaScript. The HTML it produces
 * is ordinary server-rendered markup that crawlers read without running scripts.
 *
 * WHERE EVERY FACT COMES FROM (nothing on this page is typed in as a literal):
 *   • models, sizes, builds, prices  → src/data/products.ts + src/data/productCommerce.ts — the SAME
 *     records the product cards, the product pages, the product JSON-LD, the cart, Razorpay and the
 *     Merchant feed read. Every ₹ is `sellPrice(basePrice)` (GST-inclusive), and a model appears only
 *     when `isOutrightSale()` is true, the same predicate that gates Add to Cart.
 *   • the specification comparison   → each product's own published specification rows, looked up by
 *     label. A cell with no matching row prints "—" rather than a guess.
 *   • freight, dispatch, installation → src/data/shippingZones.ts — the table checkout charges from,
 *     the feed's <g:shipping> block and the Shipping & Delivery page all read.
 *   • payment, cancellation, returns   → what /payment-policy, /refund-policy and /terms-and-conditions
 *     already state (online orders are paid in full; quotation builds take a 40–50% advance; a 48-hour
 *     cancellation window before manufacturing starts; made-to-order units are not returnable).
 *   • factory, office, registrations  → src/lib/company.ts (the footer prints the same values).
 *
 * DELIBERATELY ABSENT: certification claims, service-life figures, "% cheaper than construction",
 * project counts, years in business and client names. None of them is evidenced in this repository
 * (see commit 53d483d for the ISO reasoning), and a landing page that Merchant Center reviews may
 * carry only claims the business can back.
 *
 * THE FAQ array is built by `containerOfficeFaqs()` from the same inputs the page renders, and the
 * category route injects it verbatim as FAQPage JSON-LD, so the visible answers and the schema can
 * never disagree.
 */

import Link from "next/link";
import type { Product } from "@/data/products";
import { formatINR } from "@/lib/pricing/gst";
import { INSTALLATION, SHIPPING_ZONES } from "@/data/shippingZones";
import { COMPANY } from "@/lib/company";
import {
  constructionExamples,
  containerOfficeCityLinks,
  containerOfficeFaqs,
  containerOfficeModels,
  dispatch,
  freightLabel,
  priceBand,
  specValue,
} from "./containerOfficesCategoryData";

const h2 = "font-display text-2xl font-bold mb-3";
const h3 = "font-display text-lg font-bold mb-1";
const p = "text-muted-foreground leading-relaxed";
const th = "px-4 py-3 font-semibold";
const td = "px-4 py-3 text-muted-foreground align-top";
const a = "text-accent hover:underline";

export function ContainerOfficesCategoryContent({ products }: { products: Product[] }) {
  const models = containerOfficeModels(products);
  const steel = models.filter((m) => m.steelUnit);
  const indoor = models.filter((m) => !m.steelUnit);
  const band = priceBand(models);
  const faqs = containerOfficeFaqs(products);
  const cityLinks = containerOfficeCityLinks();
  const { shell: shellModel, fabricated: fabricatedModel } = constructionExamples(models);

  return (
    <section className="mt-16 space-y-12 max-w-4xl" aria-label="Container office buying guide">
      {/* intro — the page's H1 is the header band above */}
      <div className="space-y-4">
        <p className={p}>
          Portable Office Cabin manufactures steel container offices at its own factory at Kamandoddi,
          near Hosur in Tamil Nadu, and sells them direct. Each model on this page is a complete,
          fixed-specification unit with one fixed price that includes 18% GST: the same figure you see
          on its product page and pay at checkout.
          {band && <> Our steel container offices cost <strong className="text-foreground">{band}</strong>.</>}
        </p>
        <p className={p}>
          A container office arrives built: shell, insulation, wiring, flooring, doors and windows are
          fitted in the factory, so the work at your site is placing the unit on a level base and
          connecting power. Need an office that stays on one project site? See our{" "}
          <Link href="/products/category/site-office-containers" className={a}>site office containers</Link>.
          Need a guard post? See our{" "}
          <Link href="/products/category/security-cabins" className={a}>security cabins</Link>. Prefer to
          rent? See <Link href="/rental-service" className={a}>container offices on rent</Link>.
        </p>
      </div>

      {/* models & prices — the live catalogue */}
      <div>
        <h2 className={h2}>Container Office Models and Prices</h2>
        <p className={`${p} text-sm mb-4`}>
          Fixed prices in INR including 18% GST. Transport is charged by delivery pincode and
          installation is optional; both are shown at checkout before payment.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className={th}>Model</th>
                <th className={th}>Size</th>
                <th className={th}>Build</th>
                <th className={`${th} text-right`}>Price (incl. GST)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.sku} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <Link href={m.path} className={`font-medium ${a}`}>{m.name}</Link>
                    <span className="block text-xs text-muted-foreground mt-0.5">{m.bestFor}</span>
                  </td>
                  <td className={td}>{m.size}</td>
                  <td className={td}>{m.material}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{formatINR(m.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {indoor.length > 0 && (
          <p className={`${p} text-sm mt-3`}>
            {indoor.map((m) => m.name).join(", ")} {indoor.length > 1 ? "are" : "is a"} glass-partition
            {indoor.length > 1 ? " cabins" : " cabin"} for fitting inside an existing building, not
            {indoor.length > 1 ? "" : " a"} steel container office{indoor.length > 1 ? "s" : ""}; it is
            listed here because it is part of the same office range.
          </p>
        )}
      </div>

      {/* sizes & customisation */}
      <div>
        <h2 className={h2}>Available Sizes and Customization</h2>
        <p className={p}>
          The fixed-price sizes are: {steel.map((m) => `${m.name} ${m.size}`).join("; ")}. Each product
          page lists what that configuration includes. A different size, a combined or stacked layout, an attached
          toilet or pantry, partitions or furniture can be built to order: those custom builds begin with
          a written quotation and drawing, are confirmed with an advance, and are not sold through the
          online checkout. See our{" "}
          <Link href="/custom-product-policy" className={a}>Customised Product Policy</Link> for how a
          custom order works.
        </p>
      </div>

      {/* structure — straight from each model's published specification rows */}
      <div>
        <h2 className={h2}>MS and GI Steel Structural Specifications</h2>
        <p className={`${p} mb-4`}>
          The structure, walls and floor of each steel model, as published on its product page.
          {fabricatedModel && (
            <> Galvanised (GI) sheet is a wall option on the {fabricatedModel.name}; the other models use
            MS or corten steel.</>
          )}
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className={th}>Model</th>
                <th className={th}>Structure</th>
                <th className={th}>Walls and insulation</th>
                <th className={th}>Floor</th>
              </tr>
            </thead>
            <tbody>
              {steel.map((m) => (
                <tr key={m.sku} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className={td}>{specValue(m, ["Frame", "Structure"]) !== "—" ? specValue(m, ["Frame", "Structure"]) : m.material}</td>
                  <td className={td}>{specValue(m, ["Walls", "Wall Panels"])}</td>
                  <td className={td}>{specValue(m, ["Flooring"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* fit-out options */}
      <div>
        <h2 className={h2}>Insulation, Flooring, Windows and Electrical Options</h2>
        <p className={`${p} mb-4`}>
          Cooling, windows and electricals on each model, again from its own specification. A dash means
          that model&rsquo;s specification table has no row for the item.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className={th}>Model</th>
                <th className={th}>Cooling</th>
                <th className={th}>Windows and doors</th>
                <th className={th}>Electrical</th>
              </tr>
            </thead>
            <tbody>
              {steel.map((m) => (
                <tr key={m.sku} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className={td}>{specValue(m, ["HVAC", "Climate Control"])}</td>
                  <td className={td}>{specValue(m, ["Windows", "Openings", "Windows & Doors"])}</td>
                  <td className={td}>{specValue(m, ["Electrical", "Lighting"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* applications */}
      <div>
        <h2 className={h2}>Container Office Applications</h2>
        <ul className={`space-y-2 ${p} list-disc pl-5`}>
          {steel.map((m) => (
            <li key={m.sku}>
              <strong className="text-foreground">{m.bestFor}:</strong>{" "}
              the <Link href={m.path} className={a}>{m.name}</Link>, {m.size}, {m.material}.
            </li>
          ))}
        </ul>
        <p className={`${p} mt-3`}>
          For many people working on one project, a multi-workstation{" "}
          <Link href="/products/category/site-office-containers" className={a}>site office container</Link>{" "}
          may suit better; for worker housing, see our{" "}
          <Link href="/products/category/labour-colony" className={a}>labour colony</Link> range.
        </p>
      </div>

      {/* converted vs fabricated */}
      <div>
        <h2 className={h2}>New Fabricated vs Converted Shipping Container Offices</h2>
        <div className="space-y-4">
          <div>
            <h3 className={h3}>Converted shipping container</h3>
            <p className={p}>
              Built inside an ISO shipping container shell. The corrugated corten walls are part of the
              structure, so the size is set by the container: 20 ft or 40 ft long and 8 ft wide.
              {shellModel && (
                <> Our <Link href={shellModel.path} className={a}>{shellModel.name}</Link>, {shellModel.size}, is built this way.</>
              )}{" "}
              If you want a plain container to convert yourself, see{" "}
              <Link href="/products/shipping-container-for-sale" className={a}>shipping containers for sale</Link>.
            </p>
          </div>
          <div>
            <h3 className={h3}>Fabricated container office</h3>
            <p className={p}>
              Built new on a purpose-made steel frame, then clad and insulated. Because the frame carries
              the load, the unit is not limited to container dimensions and can be wider than 8 ft.
              {fabricatedModel && (
                <> Our <Link href={fabricatedModel.path} className={a}>{fabricatedModel.name}</Link>, {fabricatedModel.size}, is fabricated this way, from {fabricatedModel.material.replace(/^Heavy-Duty /, "heavy-duty ").replace(/ Sections$/, " sections")}.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* manufacturing */}
      <div>
        <h2 className={h2}>Factory Manufacturing and Quality Process</h2>
        <ol className={`space-y-2 ${p} list-decimal pl-5`}>
          <li><strong className="text-foreground">Specification fixed first.</strong> A catalogue model is built to the specification on its product page; a custom build is built to the written quotation and drawing you approve.</li>
          <li><strong className="text-foreground">Built complete in our factory.</strong> Frame, cladding, insulation, flooring, wiring, doors and windows are fitted at Kamandoddi, near Hosur, before dispatch.</li>
          <li><strong className="text-foreground">Dispatch in {dispatch}</strong> after the order is confirmed and paid.</li>
          <li><strong className="text-foreground">Inspection on delivery.</strong> Check the unit when it arrives and report any concern within 48 hours, as set out in our <Link href="/terms-and-conditions" className={a}>Terms &amp; Conditions</Link>.</li>
        </ol>
      </div>

      {/* ordering, delivery & installation — from the checkout's own freight table */}
      <div>
        <h2 className={h2}>Ordering, Delivery and Installation</h2>
        <p className={`${p} mb-4`}>
          Add a model to the cart and enter your delivery pincode: checkout shows the transport charge
          for your zone, the optional installation line and the final total before you pay. Fixed-price
          orders are paid in full online through Razorpay (UPI, cards or net banking). Manufacturing and
          dispatch take {dispatch}; transit then depends on the zone.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className={th}>Delivery zone</th>
                <th className={th}>Area</th>
                <th className={th}>Transport</th>
                <th className={th}>Transit after dispatch</th>
              </tr>
            </thead>
            <tbody>
              {SHIPPING_ZONES.map((z) => (
                <tr key={z.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium text-foreground">{z.name}</td>
                  <td className={td}>{z.description}</td>
                  <td className={`${td} whitespace-nowrap`}>{freightLabel(z.rate)}</td>
                  <td className={`${td} whitespace-nowrap`}>{z.transitDaysMin}–{z.transitDaysMax} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={p}>
          <strong className="text-foreground">Installation ({formatINR(INSTALLATION.rate)} incl. GST, optional):</strong>{" "}
          {INSTALLATION.description} Your site needs a firm, level base and road access for the truck and
          crane. Read the full terms in our{" "}
          <Link href="/shipping" className={a}>Shipping &amp; Delivery</Link>,{" "}
          <Link href="/payment-policy" className={a}>Payment</Link> and{" "}
          <Link href="/refund-policy" className={a}>Refund &amp; Cancellation</Link> policies.
        </p>
      </div>

      {/* by location */}
      {cityLinks.length > 0 && (
        <nav aria-label="Container offices by location">
          <h2 className={h2}>Container Offices by Location</h2>
          <p className={`${p} mb-3`}>
            Local pages for the industrial areas we deliver to, with site conditions and nearby delivery
            areas for each.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {cityLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={a}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* contact */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <h2 className="font-display text-2xl font-bold mb-2">Talk to the Manufacturer</h2>
        <p className={p}>
          For a custom size or layout, send your site location, the size you need and how the office
          will be used. Call{" "}
          <a href={`tel:${COMPANY.phones[0].e164}`} className="text-accent font-semibold hover:underline">{COMPANY.phones[0].display}</a> or{" "}
          <a href={`tel:${COMPANY.phones[1].e164}`} className="text-accent font-semibold hover:underline">{COMPANY.phones[1].display}</a>,
          email <a href={`mailto:${COMPANY.email.sales}`} className="text-accent font-semibold hover:underline">{COMPANY.email.sales}</a>,
          or use the <Link href="/contact" className={a}>contact page</Link>. GSTIN {COMPANY.gstin}.
        </p>
      </div>

      {/* FAQ — the same array the FAQPage schema uses */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Customer FAQ</h2>
        <div className="space-y-5">
          {faqs.map((f) => (
            <div key={f.question}>
              <h3 className={h3}>{f.question}</h3>
              <p className={p}>{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
