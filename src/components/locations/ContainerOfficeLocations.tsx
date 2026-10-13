/**
 * Container-office cluster links, rendered from src/data/containerOfficeCluster.ts.
 *
 * No hooks and no "use client": every block renders on the server into the initial HTML, whether
 * it is placed in a server route (the location pages) or inside a client view that is
 * server-rendered (the directory, the category page).
 *
 *   <ContainerOfficeLocationCards />   directory: cards grouped by state
 *   <ContainerOfficeLocationLists />   pillar: compact grouped lists
 *   <ContainerOfficeNearbyBlock />     location page: pillar, nearby locations, directory
 */
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import {
  CLUSTER_STATES,
  CONTAINER_OFFICE_BANGALORE_PATH,
  CONTAINER_OFFICE_DIRECTORY_PATH,
  CONTAINER_OFFICE_PILLAR_PATH,
  containerOfficeLocation,
  containerOfficeLocationsIn,
  locationPath,
  pillarAnchorFor,
} from "@/data/containerOfficeCluster";

/** Directory section: one card per location, grouped Karnataka / Tamil Nadu. */
export function ContainerOfficeLocationCards() {
  return (
    <div className="space-y-10">
      {CLUSTER_STATES.map((state) => {
        const headingId = `container-office-${state.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={state} role="group" aria-labelledby={headingId}>
            <h3 id={headingId} className="font-display text-xl font-bold text-foreground mb-4">
              {state}
            </h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {containerOfficeLocationsIn(state).map((loc) => (
                // Stretched link: the anchor text is the place name only; the coverage line is
                // plain text, and the link's ::after overlay keeps the whole card clickable.
                <li
                  key={loc.slug}
                  className="relative flex h-full items-start justify-between gap-3 bg-card border border-border/50 rounded-xl px-5 py-4 hover:border-accent/40 hover:bg-accent/5 focus-within:ring-2 focus-within:ring-ring transition-colors group"
                >
                  <span className="flex items-start gap-3 min-w-0">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <span className="min-w-0">
                      <Link
                        href={locationPath(loc.slug)}
                        className="block font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
                      >
                        {loc.name}
                      </Link>
                      <span className="mt-1 block text-sm text-muted-foreground">{loc.area}</span>
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

/** Pillar (category page): compact grouped lists, anchors from `hubAnchor`. */
export function ContainerOfficeLocationLists() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {CLUSTER_STATES.map((state) => (
        <div key={state}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">{state}</h3>
          <ul className="list-disc space-y-1.5 pl-6 text-accent">
            {containerOfficeLocationsIn(state).map((loc) => (
              <li key={loc.slug}>
                <Link href={locationPath(loc.slug)} className="hover:underline underline-offset-4">
                  {loc.hubAnchor}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Location page: one block linking up to the pillar, across to genuinely nearby locations and out
 * to the directory (plus the Bangalore landing page for Bengaluru-region pages). Links the page
 * already carries in its own related-links block are not repeated here. Renders nothing for a slug
 * outside the cluster, so the other city pages are unaffected.
 */
export function ContainerOfficeNearbyBlock({
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
  const loc = containerOfficeLocation(slug);
  if (!loc) return null;
  const mc = (cls: string) => (motion ? ` ${cls}` : "");
  const skip = new Set(existingHrefs);

  const nearby = loc.neighbours
    .map((s) => containerOfficeLocation(s))
    .filter((n): n is NonNullable<typeof n> => !!n && !skip.has(locationPath(n.slug)));
  const showBangalore = loc.bangaloreRegion && !skip.has(CONTAINER_OFFICE_BANGALORE_PATH);

  return (
    <nav aria-label={`Container office options near ${loc.placeName}`} className={`mt-10${mc("reveal")}`}>
      <h2 className="mb-3 text-xl font-bold tracking-tight">More container office options near {loc.placeName}</h2>
      <p className="mb-4 leading-relaxed text-muted-foreground">
        Compare{" "}
        <Link href={CONTAINER_OFFICE_PILLAR_PATH} className="font-medium text-foreground underline underline-offset-4">
          {pillarAnchorFor(slug)}
        </Link>
        {nearby.length > 0
          ? ", or see the locations we also serve nearby."
          : `, or browse the other locations we serve in ${loc.state === "Karnataka" ? "Karnataka and Tamil Nadu" : "Tamil Nadu and Karnataka"}.`}
      </p>
      {nearby.length > 0 && (
        <ul className={`mb-4 grid gap-2 sm:grid-cols-2${mc("reveal-stagger")}`}>
          {nearby.map((n) => (
            // Stretched link (see ContainerOfficeLocationCards): anchor text = the place only.
            <li
              key={n.slug}
              className={`relative rounded-lg border px-4 py-3 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring${mc("hover-lift")}`}
            >
              <Link
                href={locationPath(n.slug)}
                className="block font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
              >
                {n.nearbyLabel}
              </Link>
              <span className="mt-0.5 block text-muted-foreground">{n.area}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        <Link href={CONTAINER_OFFICE_DIRECTORY_PATH} className="font-medium text-foreground underline underline-offset-4">
          All container office locations in Karnataka and Tamil Nadu
        </Link>
        {showBangalore && (
          <>
            {" · "}
            <Link href={CONTAINER_OFFICE_BANGALORE_PATH} className="font-medium text-foreground underline underline-offset-4">
              Container office options across Bangalore
            </Link>
          </>
        )}
      </p>
    </nav>
  );
}
