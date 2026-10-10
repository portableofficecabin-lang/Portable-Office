// SERVER COMPONENT — "Portable Cabin Models, Sizes & Prices" on the range hub
// (/products/portable-cabin).
//
// Every row is a real catalogue product in the Portable Cabins category that is sold at a fixed
// price. Rows come from portableCabinModels() — the SAME helper behind the category page's price
// table — which reads sellPrice(getCommerce(id).basePrice). The figure printed here is therefore
// byte-identical to the product card, the product page, the cart, the JSON-LD offer and the
// Merchant feed; nothing in this file types a price. Size and build read the commerce record's own
// `size` / `material` fields, and the model name is the commerce H1, so an owner edit flows here
// with no second place to update and every anchor matches the destination page's <h1>.
//
// WHY THE HUB NEEDS THIS: the hub is a static route outside the catalogue. Before 2026-10-10 its
// body linked the 17 categories and its 11 guides but not one of the cabins it is the overview
// for — the hierarchy stopped one level short of the products.
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Product } from "@/data/products";
import { portableCabinModels } from "@/components/products/PortableCabinsCategoryContent";

/** ₹ formatter, Indian grouping — same as the category table. */
const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

const linkClass =
  "inline-flex items-center gap-1.5 font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded";

export function PortableCabinModelsTable({ products }: { products: Product[] }) {
  const models = portableCabinModels(products);
  if (models.length === 0) return null;

  return (
    <section aria-labelledby="portable-cabin-models-heading" className="max-w-5xl">
      <h2
        id="portable-cabin-models-heading"
        className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
      >
        Portable Cabin Models, Sizes &amp; Prices
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
        Every model below is sold at one fixed, GST-inclusive price — the same figure you will see
        on its product page, in the cart and at checkout. Transport and optional installation are
        calculated at checkout from your delivery pincode. Open a model for its full specification
        table, gallery, reviews and the Buy Now button.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Build</th>
              <th className="px-4 py-3 font-semibold">Best for</th>
              <th className="px-4 py-3 font-semibold text-right">Price (incl. GST)</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.slug} className="border-t border-border/60 align-top">
                <td className="px-4 py-3">
                  <Link href={`/products/${model.slug}`} className="font-medium text-accent hover:underline">
                    {model.h1 || model.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{model.size}</td>
                <td className="px-4 py-3 text-muted-foreground">{model.material}</td>
                <td className="px-4 py-3 text-muted-foreground">{model.bestFor}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                  {inr(model.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        <li className="rounded-xl border border-border/60 bg-card p-4 text-sm">
          <Link href="/products/category/portable-cabins" className={linkClass}>
            Browse the Portable Cabins category
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-1 text-muted-foreground">
            Product cards with photos, the buying guide and the full A–Z catalogue.
          </p>
        </li>
        <li className="rounded-xl border border-border/60 bg-card p-4 text-sm">
          <Link href="/products/metal-portable-cabin" className={linkClass}>
            Compare MS, galvanised and colour-coated builds
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-1 text-muted-foreground">
            The metal portable cabin guide explains which skin suits which site before you choose.
          </p>
        </li>
      </ul>
    </section>
  );
}
