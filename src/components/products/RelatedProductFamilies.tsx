import Link from "next/link";
import Image from "next/image";

import { getProductDetailPath, type Product } from "@/data/products";
import { getBestProductImage } from "@/data/productImages";
import { getCommerce } from "@/data/productCommerce";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import type { ProductFamily } from "@/data/productFamilies";

/**
 * "Related products" rail — GENUINELY DIFFERENT product families only.
 *
 * ── THE RULE THIS COMPONENT ENFORCES ───────────────────────────────────────────────────
 * A link here must point at a product that is materially different from the one being
 * viewed: a different shell material, construction, layout, storey count or specification.
 * It must NEVER be built from a SEARCH SYNONYM. "Site Office Container", "Porta Office"
 * and "Portable Office Cabin" are other ways of SAYING "container office" — turning them
 * into product-family cards would manufacture duplicate landing pages and duplicate
 * Merchant Center records for one physical cabin.
 *
 * So the list is not derived from names or keywords at all: it is the family's explicit
 * `relatedProductIds`, resolved against the real catalogue. If an id no longer exists the
 * card is dropped rather than guessed at.
 *
 * Each card carries a thumbnail, the product-family name, its category label and a real
 * crawlable link to the genuine product page.
 */
export function RelatedProductFamilies({
  family,
  allProducts,
  className = "",
  heading = "Related products",
}: {
  family: ProductFamily;
  /** The merged catalogue, so an admin image/name edit is reflected here too. */
  allProducts: Product[];
  className?: string;
  heading?: string;
}) {
  const byId = new Map(allProducts.map((p) => [p.id, p]));

  const related = family.relatedProductIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => !!p && p.id !== family.parentProductId);

  if (related.length === 0) return null;

  return (
    <section className={className} aria-labelledby="related-product-families">
      <h2
        id="related-product-families"
        className="font-display text-2xl font-bold text-foreground mb-6"
      >
        {heading}
      </h2>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {related.map((product) => {
          const image =
            (product.images || [])
              .map((i) => resolveImageUrl(i))
              .find((url) => url && !url.includes("placeholder")) ??
            getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku);
          // The clean commercial name where one exists, so the card matches the page's H1.
          const name = getCommerce(product.id)?.h1Title || product.name;

          return (
            <li key={product.id}>
              <Link
                href={getProductDetailPath(product)}
                className="group block h-full rounded-xl overflow-hidden bg-card shadow-card hover:shadow-card-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={image}
                    alt={`${name} — ${product.category} by Portable Office Cabin`}
                    title={`${name} | ${product.category}`}
                    fill
                    sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 18vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-accent">
                    {product.category}
                  </span>
                  <h3 className="mt-1 text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                    {name}
                  </h3>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
