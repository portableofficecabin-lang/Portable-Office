import { getKeySpecs, type ProductCommerce } from "@/data/productCommerce";

/**
 * The key-spec grid shown directly under the price on the product page.
 *
 * Every chip comes from getKeySpecs() (src/data/productCommerce.ts) — Size / Range / Delivery /
 * Frame-Material / Brand / Best For, plus any extraSpecs — which already DROPS any chip whose
 * value is unknown rather than filling it with a guess. Nothing is invented here and no chip
 * list is rebuilt: the commerce catalog is the only source.
 *
 * Rendered for purchasable AND quote-only products alike — the specs are true either way; only
 * the PRICE is gated by isPurchasable(). Pure server component (no hooks, no client JS), so the
 * spec text is in the SSR HTML for crawlers and for Google's landing-page/feed comparison.
 */
export function ProductKeySpecs({
  commerce,
  className = "",
}: {
  commerce: ProductCommerce;
  className?: string;
}) {
  const specs = getKeySpecs(commerce);
  if (specs.length === 0) return null;

  return (
    <dl className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${className}`}>
      {specs.map((spec) => (
        <div
          key={spec.label}
          className="bg-card border border-border/60 rounded-xl px-4 py-3 min-w-0"
        >
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{spec.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground break-words">{spec.value}</dd>
        </div>
      ))}
    </dl>
  );
}
