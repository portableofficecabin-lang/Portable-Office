import Link from "next/link";
import { CheckCircle, Phone, MessageCircle, Truck, Wrench, XCircle } from "lucide-react";
import type { DeliveryInstallationData, PromotionBuyerFactsData } from "@/data/promotionBuyerFacts";
import { COMPANY } from "@/lib/company";

/**
 * Buyer facts for a promotion page (SEO phase 2): exact catalogue configurations with their fixed
 * GST-inclusive prices, each listed unit's catalogue specification, delivery and installation scope
 * from the checkout constants, and a quote / WhatsApp action. Presentational only — the data is
 * resolved on the server (src/data/promotionBuyerFacts.ts) and passed in, so no catalogue code
 * reaches the browser.
 */
export function PromotionBuyerFacts({ data, productLabel }: { data: PromotionBuyerFactsData; productLabel: string }) {
  return (
    <div className="space-y-8">
      {/* Sizes and fixed prices */}
      <section aria-labelledby="buyer-prices" className="bg-card rounded-2xl p-6 md:p-10 border border-border">
        <h2 id="buyer-prices" className="font-display font-extrabold text-2xl md:text-3xl mb-3 text-foreground">
          {productLabel} sizes and fixed prices in {data.place}
        </h2>
        <p className="text-muted-foreground mb-6">
          Standard units carry one fixed price, including GST, on their product page. Custom sizes and fit-outs are
          priced on a written quotation.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border/60 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-primary/10 text-left">
                <th scope="col" className="p-3 font-semibold text-foreground">Size / configuration</th>
                <th scope="col" className="p-3 font-semibold text-foreground">Product and fixed price (incl. GST)</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <th scope="row" className="p-3 font-medium text-foreground align-top text-left">{row.type}</th>
                  <td className="p-3">
                    <ul className="space-y-1">
                      {row.items.map((item) => (
                        <li key={item.id}>
                          <Link href={item.href} className="font-medium text-primary hover:underline">{item.name}</Link>{" "}
                          <span className="font-semibold text-foreground whitespace-nowrap">{item.price}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catalogue specification of each listed unit */}
      <section aria-labelledby="buyer-specs" className="bg-card rounded-2xl p-6 md:p-10 border border-border">
        <h2 id="buyer-specs" className="font-display font-extrabold text-2xl md:text-3xl mb-3 text-foreground">
          What each listed {productLabel.toLowerCase()} comes with
        </h2>
        <p className="text-muted-foreground mb-6">
          The specification each fixed price is for, as listed on the product page.
        </p>
        <div className="space-y-3">
          {data.rows.flatMap((row) => row.items).map((item) => (
            <details key={item.id} className="group rounded-xl border border-border/60 bg-muted/20 p-4">
              <summary className="cursor-pointer font-semibold text-foreground">
                {item.name} <span className="font-normal text-muted-foreground">— {item.price}</span>
              </summary>
              {item.specs.length > 0 ? (
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                  {item.specs.map((s) => (
                    <div key={s.label} className="contents">
                      <dt className="font-medium text-foreground">{s.label}</dt>
                      <dd className="text-muted-foreground">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">See the product page for the full specification.</p>
              )}
              <Link href={item.href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                View {item.name}
              </Link>
            </details>
          ))}
        </div>
      </section>

      <DeliveryInstallationFacts data={data.delivery} place={data.place} />

      {/* Quote / WhatsApp action */}
      <section aria-labelledby="buyer-quote" className="rounded-2xl p-6 md:p-10 border border-primary/30 bg-primary/5">
        <h2 id="buyer-quote" className="font-display font-extrabold text-2xl md:text-3xl mb-3 text-foreground">
          Get a written quotation
        </h2>
        <p className="text-muted-foreground mb-6">
          Send your site location, the size you need and any fit-out (partitions, toilet, pantry, AC points). We reply
          with a written quotation that states the price, what is included and the delivery window.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={data.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp for a quote
          </a>
          <a
            href={`tel:${COMPANY.phones[0].e164}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:border-primary"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> Call {COMPANY.phones[0].display}
          </a>
        </div>
      </section>
    </div>
  );
}

/** "560, 562, 563 and 635" — the free zone's PIN-code prefixes as the owner words them (2026-11-27). */
export function pinPrefixList(pins: readonly string[]): string {
  return pins.length > 1 ? `${pins.slice(0, -1).join(", ")} and ${pins[pins.length - 1]}` : pins[0] ?? "";
}

/** Delivery and installation scope from the checkout constants (also used on the bespoke Bangalore page). */
export function DeliveryInstallationFacts({ data, place }: { data: DeliveryInstallationData; place: string }) {
  return (
    <section aria-labelledby="buyer-delivery" className="bg-card rounded-2xl p-6 md:p-10 border border-border">
      <h2 id="buyer-delivery" className="font-display font-extrabold text-2xl md:text-3xl mb-3 text-foreground">
        Delivery and installation to {place}
      </h2>
      <div className="space-y-6 text-muted-foreground">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <Truck className="h-5 w-5 text-primary" aria-hidden="true" /> Delivery
          </h3>
          <ul className="space-y-2">
            <li>Standard units bought online are dispatched within {data.dispatch}.</li>
            {data.freePins.length > 0 && (
              <li>
                {/* Owner wording (2026-11-27): "the 560, 562, 563 and 635 PIN-code prefixes". */}
                Delivery is <strong className="text-foreground">free</strong> for the {pinPrefixList(data.freePins)} PIN-code
                {data.freePins.length > 1 ? " prefixes" : " prefix"}, with {data.freeTransit} in transit.
              </li>
            )}
            {data.otherZones.map((zone) => (
              <li key={zone.name}>
                {zone.description.replace(/\.$/, "")}: {zone.price}, {zone.transit} in transit.
              </li>
            ))}
            <li>
              The charge for your PIN code is shown at checkout. Full terms:{" "}
              <Link href="/shipping" className="font-medium text-primary hover:underline">Shipping &amp; Delivery</Link>.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <Wrench className="h-5 w-5 text-primary" aria-hidden="true" /> Installation (optional, {data.installation.price})
          </h3>
          <ul className="space-y-2">
            {data.installation.scope.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-1 shrink-0 text-primary" aria-hidden="true" /> {s}
              </li>
            ))}
            {data.installation.notCovered.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" /> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
