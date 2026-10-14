/**
 * City-page groups that are not part of the container-office cluster, rendered from
 * src/data/cityDirectory.ts (itself derived from CITY_PAGES).
 *
 * No hooks and no "use client": like ContainerOfficeLocations.tsx, every block renders on the server
 * into the initial HTML, whether placed in a server route (the location pages) or inside the
 * server-rendered client view of the directory.
 *
 *   <CityGuideCards family="shipping-container" />   directory: cards grouped by state
 *   <ShippingContainerNearbyBlock slug=… />          shipping-container page: same-state locations,
 *                                                    the family's category and the directory section
 */
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import {
  SHIPPING_CONTAINER_CATEGORY_PATH,
  SHIPPING_CONTAINER_DIRECTORY_PATH,
  cityDirectoryLabel,
  cityPagePath,
  cityPagesByState,
  cityPlaceLine,
  cityState,
  shippingContainerSiblings,
  type CityFamily,
} from "@/data/cityDirectory";
import { cityPageBySlug } from "@/data/cityPages";

/** Directory section: one card per page of `family`, grouped by state (same card as the cluster's). */
export function CityGuideCards({ family }: { family: Exclude<CityFamily, "container-office"> }) {
  return (
    <div className="space-y-10">
      {cityPagesByState(family).map(({ state, pages }) => {
        const headingId = `${family}-${state.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={state} role="group" aria-labelledby={headingId}>
            <h3 id={headingId} className="font-display text-xl font-bold text-foreground mb-4">
              {state}
            </h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pages.map((page) => (
                // Stretched link (see ContainerOfficeLocationCards): the anchor text is the page's
                // label only; the place line is plain text and the ::after overlay keeps the card clickable.
                <li
                  key={page.slug}
                  className="relative flex h-full items-start justify-between gap-3 bg-card border border-border/50 rounded-xl px-5 py-4 hover:border-accent/40 hover:bg-accent/5 focus-within:ring-2 focus-within:ring-ring transition-colors group"
                >
                  <span className="flex items-start gap-3 min-w-0">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <span className="min-w-0">
                      <Link
                        href={cityPagePath(page.slug)}
                        className="block font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
                      >
                        {cityDirectoryLabel(page)}
                      </Link>
                      <span className="mt-1 block text-sm text-muted-foreground">{cityPlaceLine(page)}</span>
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 mt-1 transition-colors"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shipping-container page: the other shipping-container pages in the same state, plus the family's
 * category and the directory section. Links the page already carries in its related-links block are
 * not repeated. Renders nothing for any other page, so every other city page is unaffected.
 */
export function ShippingContainerNearbyBlock({
  slug,
  existingHrefs = [],
  motion = false,
}: {
  slug: string;
  /** Hrefs the page already links in its related-links block; skipped here to avoid repeats. */
  existingHrefs?: string[];
  /** Mirror the page's opt-in motion pass (same utility classes as the template). */
  motion?: boolean;
}) {
  const page = cityPageBySlug(slug);
  if (!page || !slug.startsWith("shipping-container-in-")) return null;
  const mc = (cls: string) => (motion ? ` ${cls}` : "");
  const skip = new Set(existingHrefs);
  const state = cityState(page);
  const siblings = shippingContainerSiblings(slug).filter((s) => !skip.has(cityPagePath(s.slug)));
  const showCategory = !skip.has(SHIPPING_CONTAINER_CATEGORY_PATH);

  return (
    <nav aria-label={`Shipping container supply in other ${state} locations`} className={`mt-10${mc("reveal")}`}>
      <h2 className="mb-3 text-xl font-bold tracking-tight">
        {siblings.length > 0 ? `Shipping containers in other ${state} locations` : "Shipping containers in other locations"}
      </h2>
      {siblings.length > 0 && (
        <ul className={`mb-4 grid gap-2 sm:grid-cols-2${mc("reveal-stagger")}`}>
          {siblings.map((s) => (
            <li
              key={s.slug}
              className={`relative rounded-lg border px-4 py-3 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring${mc("hover-lift")}`}
            >
              <Link
                href={cityPagePath(s.slug)}
                className="block font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
              >
                {cityDirectoryLabel(s)}
              </Link>
              <span className="mt-0.5 block text-muted-foreground">{cityPlaceLine(s)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        <Link href={SHIPPING_CONTAINER_DIRECTORY_PATH} className="font-medium text-foreground underline underline-offset-4">
          All shipping container locations in Karnataka and Tamil Nadu
        </Link>
        {showCategory && (
          <>
            {" · "}
            <Link href={SHIPPING_CONTAINER_CATEGORY_PATH} className="font-medium text-foreground underline underline-offset-4">
              Compare shipping and storage containers
            </Link>
          </>
        )}
      </p>
    </nav>
  );
}
