import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The banner band at the top of every public page.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────
 * Roughly twenty pages each hand-rolled their own hero, and nearly all of them used
 * `bg-gradient-to-br from-primary ... text-primary-foreground`. That looks like a
 * navy band with light text — but in this theme `--primary` is AMBER
 * (src/index.css) and `--primary-foreground` is DARK NAVY. So those banners actually
 * rendered dark navy body copy on an orange gradient, which is close to illegible
 * (roughly 2:1 in the orange regions) and made every page open on a muddy
 * orange-to-navy diagonal. This component replaces all of them with one readable,
 * consistent band.
 *
 * ── DESIGN ──────────────────────────────────────────────────────────────────────
 * Deep navy surface, white type. A faint blueprint grid and a soft amber glow give
 * it depth without competing with the text; both are masked so they fade out behind
 * the copy. The bottom edge fades into the page background so the band reads as part
 * of the page rather than a stripe pasted on top.
 *
 * Contrast on navy-deep hsl(212 73% 15%):
 *   white       15.3:1     white/75    8.8:1     amber (accent)   7.0:1
 * All comfortably past AA. Do not reintroduce `text-primary-foreground` here.
 *
 * ── PERFORMANCE ─────────────────────────────────────────────────────────────────
 * Deliberately image-free. On several routes the <h1> below IS the mobile LCP
 * element precisely because this band is pure CSS: it paints as soon as the HTML and
 * the display:swap fallback font arrive, gated only by TTFB rather than by any asset
 * download. Do not add a background image, and keep the decorative layers
 * `aria-hidden` and non-interactive.
 *
 * Server Component — no state, no effects. Keep it that way so page heroes stay out
 * of the client bundle.
 */

export interface PageHeroBreadcrumb {
  name: string;
  /** Omit on the final (current) crumb — it renders as plain text. */
  href?: string;
}

export interface PageHeroProps {
  /** Small amber label above the title, e.g. "Our Range" or "Legal". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One or two sentences. Kept to a readable measure by max-w-2xl. */
  description?: ReactNode;
  breadcrumbs?: PageHeroBreadcrumb[];
  /** CTAs, stat chips, badges — rendered under the description. */
  children?: ReactNode;
  /** "compact" for dense pages such as the policy set. */
  size?: "default" | "compact";
  /** Set when the page needs to reference the heading, e.g. aria-labelledby. */
  titleId?: string;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
  size = "default",
  titleId,
  className,
}: PageHeroProps) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-navy-deep", className)}>
      {/* ---------- Decorative layers (all aria-hidden, none interactive) ---------- */}

      {/* Blueprint grid — a nod to the drawings this business actually works from.
          Masked so it is strongest at the top-left and gone behind the copy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 15% 0%, #000 35%, transparent 75%)",
          maskImage: "radial-gradient(ellipse 80% 70% at 15% 0%, #000 35%, transparent 75%)",
        }}
      />

      {/* Warm brand glow, top-right. Low opacity so it never tints the type. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-navy-light/25 blur-3xl"
      />

      {/* Hairline of brand colour along the top edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
      />

      {/* Fade the band into the page background so it does not read as a stripe. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background"
      />

      {/* ---------- Content ---------- */}
      <div className="container-custom relative">
        <div className={cn("max-w-3xl", size === "compact" ? "py-12 md:py-14" : "py-14 md:py-20")}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li key={`${crumb.name}-${index}`} className="flex items-center gap-2">
                      {index > 0 && (
                        <span aria-hidden="true" className="text-white/35">
                          /
                        </span>
                      )}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
                        >
                          {crumb.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-accent" aria-current={isLast ? "page" : undefined}>
                          {crumb.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {eyebrow && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
          )}

          <div className="flex items-start gap-4">
            {/* Vertical brand rule beside the title. */}
            <span
              aria-hidden="true"
              className={cn(
                "mt-1.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-amber-light",
                size === "compact" ? "h-8 sm:h-9" : "h-9 sm:h-11",
              )}
            />
            <h1
              id={titleId}
              className={cn(
                "font-display font-bold tracking-tight text-white",
                size === "compact"
                  ? "text-3xl sm:text-4xl"
                  : "text-3xl sm:text-4xl lg:text-5xl",
              )}
            >
              {title}
            </h1>
          </div>

          {description && (
            <div className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              {description}
            </div>
          )}

          {children && <div className="mt-7">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/**
 * Small trust/stat chip for use inside a PageHero's children.
 * Sized and coloured to sit on the navy band.
 */
export function PageHeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-sm font-medium text-white/85">
      {children}
    </span>
  );
}
