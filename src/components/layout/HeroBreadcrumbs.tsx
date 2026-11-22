import Link from "next/link";

/**
 * Visible breadcrumb trail for pages that build their own hero instead of using <PageHero>
 * (FAQ, Gallery, Book Appointment, Promotions). Same markup and classes as PageHero's trail —
 * nav[aria-label="Breadcrumb"] > ol > li, "/" separators, aria-current on the last crumb — so the
 * trail reads and behaves the same everywhere.
 *
 * WHY (SEO-6, 2026-11-22): these pages already emitted BreadcrumbList JSON-LD with no visible trail
 * to match it. Structured data should describe what the visitor can see, so each page now shows the
 * same crumbs its markup lists. No hooks, no state: safe in Server and Client Components alike.
 *
 * `tone="dark"` is for text over a dark hero image or gradient; `tone="light"` is for the default
 * page background.
 */
export interface HeroBreadcrumb {
  name: string;
  /** Omit on the final (current) crumb — it renders as plain text. */
  href?: string;
}

export function HeroBreadcrumbs({
  items,
  tone = "dark",
  align = "start",
  className = "",
}: {
  items: HeroBreadcrumb[];
  tone?: "dark" | "light";
  align?: "start" | "center";
  className?: string;
}) {
  const link =
    tone === "dark"
      ? "text-white/70 hover:text-white focus-visible:ring-offset-navy-deep"
      : "text-muted-foreground hover:text-foreground focus-visible:ring-offset-background";
  const separator = tone === "dark" ? "text-white/35" : "text-muted-foreground/60";
  const current = tone === "dark" ? "text-accent" : "text-foreground";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm${align === "center" ? " justify-center" : ""}`}>
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${crumb.name}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className={separator}>
                  /
                </span>
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className={`${link} underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none`}
                >
                  {crumb.name}
                </Link>
              ) : (
                <span className={`font-medium ${current}`} aria-current={isLast ? "page" : undefined}>
                  {crumb.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
