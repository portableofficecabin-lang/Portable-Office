/**
 * HOME CONSTRUCTION CATEGORY — the parent-page content block.
 *
 * Rendered under the product grid on /products/category/home-construction, following the pattern
 * PortableCabinsCategoryContent and PrefabBuildingCategoryContent established in
 * src/views/Products.tsx.
 *
 * TWO JOBS:
 *  1. Link the category's service pages, so the Building Construction Contractor page is reachable
 *     from its parent rather than only from the sitemap. A child page that nothing links to is a
 *     child page Google discovers late and users never find.
 *  2. Give a category that currently holds ONE product something to say. It was added in August
 *     2026 as a placeholder and the listing has been thin ever since.
 *
 * NO ₹ FIGURE, and no FAQ. Both are deliberate:
 *  • Home Construction is quote-only — POC-CIB-RCC is kind:"service" with priceConfirmed:false —
 *    so there is no purchasable SKU to build a live price table from, and a hardcoded number here
 *    would contradict the quotation. Contrast the portable-cabins block, which computes every
 *    figure from sellPrice()/isOutrightSale().
 *  • The contractor page carries the FAQ and its FAQPage schema. Repeating those questions here
 *    would be near-duplicate copy competing with the page it is meant to feed.
 */

import Link from "next/link";
import { ArrowRight, Building2, Film, HardHat } from "lucide-react";

const SERVICE_LINKS: { href: string; name: string; blurb: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    href: "/products/home-construction/building-construction-contractor",
    name: "Building Construction Contractor in Bangalore",
    blurb:
      "Individual houses, villas, turnkey projects, labour contracts, renovation and extension — how each contract model works, the quality checks at each stage, what drives cost and time, and how the quotation is put together.",
    icon: HardHat,
  },
  {
    href: "/products/construction-individual-building",
    name: "Construction Individual Building",
    blurb:
      "The product page for RCC individual house construction: G+1 to G+5 frames, plot sizes and setbacks, what goes into the specification, and how the build runs stage by stage.",
    icon: Building2,
  },
  {
    href: "/cities-we-serve/villa-construction-company-bangalore",
    name: "Villa Construction in Bangalore",
    blurb:
      "Villa-specific guidance — what we build, how an RCC villa actually goes up, what you decide and when, and the areas we serve.",
    icon: Film,
  },
];

export function HomeConstructionCategoryContent() {
  return (
    <section className="mt-14 border-t border-border/60 pt-12" aria-labelledby="home-construction-content">
      <h2
        id="home-construction-content"
        className="font-display text-2xl font-bold text-foreground sm:text-3xl"
      >
        Building a house on your own plot
      </h2>
      <div className="prose prose-lg mt-4 max-w-3xl text-muted-foreground">
        <p>
          Home Construction is the civil side of this business: houses cast in reinforced cement
          concrete on land you already own, rather than units built in our factory and delivered.
          It is priced per square foot of built-up area against a written specification, and quoted
          after a site visit — there is no catalogue price, because there is no catalogue house.
        </p>
        <p>
          The scope is yours to choose. Some owners arrive with sanctioned drawings and need only
          the construction; others want the design, the structural drawings and the approvals
          handled as part of the job. Some buy their own materials and pay for workmanship and
          supervision; others want materials and labour quoted together so one party is answerable
          for both. All of that is settled in writing before anything is cast.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {SERVICE_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                </span>
                <span className="font-display font-bold text-foreground">{item.name}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.blurb}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  Read more
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
        If speed or relocation matters more than permanence, the factory-built side of this
        business is probably the better fit — see{" "}
        <Link href="/products/category/prefab-homes" className="text-accent hover:underline">
          prefab homes
        </Link>{" "}
        and{" "}
        <Link href="/products/category/prefab-building" className="text-accent hover:underline">
          prefab buildings
        </Link>
        .
      </p>
    </section>
  );
}
