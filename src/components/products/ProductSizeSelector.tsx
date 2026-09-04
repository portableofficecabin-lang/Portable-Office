import Link from "next/link";
import { Check } from "lucide-react";

import {
  builtUpAreaSqFt,
  publishedVariants,
  variantIsPurchasable,
  variantPath,
  type ProductFamily,
  type SizeVariant,
} from "@/data/productFamilies";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/**
 * "Choose your size" — the size ladder for a product family.
 *
 * ── WHY EVERY OPTION IS A REAL <Link>, NOT A BUTTON ────────────────────────────────────
 * This is a SERVER component and each option is an anchor to a real URL. That is the whole
 * point of the multi-page variant pattern:
 *
 *   • Googlebot sees six crawlable <a href> in the FIRST HTTP response — no JavaScript, no
 *     hydration, no client fetch. A JS-only button would leave every size but one invisible
 *     to a crawler and would make the size pages orphans.
 *   • The URL IS the state, so a refresh, a shared link, browser Back/Forward and a
 *     JS-disabled browser all show the same selected size, price and image. There is no
 *     client state to get out of step with the server, so no price can flash and change
 *     after hydration.
 *   • The selected option is marked with `aria-current="page"` and rendered as a <span>
 *     rather than a self-link, which is both correct HTML and avoids a self-referencing
 *     link that adds nothing for a crawler.
 *
 * ── PRICES ON THE BUTTONS ──────────────────────────────────────────────────────────────
 * A size shows its GST-inclusive price only when it is genuinely purchasable, straight from
 * sellPrice() — the same integer as the price block, the cart, the Offer and the feed. A
 * size the owner has not priced shows "Price on request" and NEVER a number, because a
 * figure a customer cannot pay is the misrepresentation this catalogue exists to avoid.
 */
export function ProductSizeSelector({
  family,
  selectedSizeSlug,
  className = "",
}: {
  family: ProductFamily;
  /** The size being viewed, or undefined on the parent/overview page. */
  selectedSizeSlug?: string;
  className?: string;
}) {
  const variants = publishedVariants(family);
  if (variants.length === 0) return null;

  const priceFor = (variant: SizeVariant): string => {
    if (!variantIsPurchasable(family, variant) || !isOutrightSale(variant.variantId)) {
      return "Price on request";
    }
    const commerce = getCommerce(variant.variantId);
    return commerce ? `${formatINR(sellPrice(commerce.basePrice))} incl. GST` : "Price on request";
  };

  return (
    <section className={className} aria-labelledby="choose-your-size">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 id="choose-your-size" className="font-display text-lg font-semibold text-foreground">
          Choose your size
        </h2>
        <span className="text-xs text-muted-foreground">
          {variants.length} standard sizes · each has its own page
        </span>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {variants.map((variant) => {
          const selected = variant.sizeSlug === selectedSizeSlug;
          const area = `${builtUpAreaSqFt(variant)} sq ft`;
          const price = priceFor(variant);

          const inner = (
            <>
              <span className="flex items-center justify-between gap-1">
                <span className="font-semibold text-foreground">{variant.sizeLabel}</span>
                {selected && <Check className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">{area}</span>
              <span className="block text-xs font-medium text-foreground/80 mt-1">{price}</span>
            </>
          );

          return (
            <li key={variant.sizeSlug}>
              {selected ? (
                <span
                  aria-current="page"
                  data-size-slug={variant.sizeSlug}
                  data-selected="true"
                  className="block h-full rounded-xl border-2 border-accent bg-accent/5 px-3 py-2.5 text-sm"
                >
                  {inner}
                  <span className="sr-only"> (selected size)</span>
                </span>
              ) : (
                <Link
                  href={variantPath(family, variant)}
                  data-size-slug={variant.sizeSlug}
                  data-selected="false"
                  title={`${family.groupTitle} ${variant.sizeLabelPlain} — ${area}`}
                  className="block h-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm transition hover:border-accent/60 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
