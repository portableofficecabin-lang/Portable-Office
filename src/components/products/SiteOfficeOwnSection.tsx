import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { getSiteOfficeOwnSection } from "@/data/siteOfficeOwnSections";

/**
 * SITE-OFFICE OWN SECTION: the product's own buyer section for the two site-office products that
 * also render the shared SiteOfficeContainerContent guide (content and sourcing rules in
 * src/data/siteOfficeOwnSections.ts). Renders nothing for every other product, so mounting it on
 * every product page is free.
 *
 * Server component, plain HTML: no structured data, no price, no buttons. The buy box above it is
 * unchanged.
 */

const p = "leading-relaxed text-muted-foreground";
const linkClass = "font-medium text-foreground underline underline-offset-4 hover:text-primary";

export function SiteOfficeOwnSection({
  productId,
  sharedGuideBelow,
}: {
  productId: string;
  /** True while the shared site-office guide renders further down the same page. */
  sharedGuideBelow: boolean;
}) {
  const section = getSiteOfficeOwnSection(productId);
  if (!section) return null;

  return (
    <section className="mt-16 space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{section.heading}</h2>
      {sharedGuideBelow && <p className={p}>{section.guideNote}</p>}
      <p className={p}>{section.intro.text}</p>

      <div className={section.groups.length > 1 ? "grid gap-8 md:grid-cols-3" : undefined}>
        {section.groups.map((group, gi) => (
          <div key={group.heading ?? gi} className="space-y-3">
            {group.heading && <h3 className="font-display text-lg font-semibold text-foreground">{group.heading}</h3>}
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <span className={p}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {section.links.map((l) => (
        <p key={l.link.href} className={p}>
          {l.before}{" "}
          <Link href={l.link.href} className={linkClass}>
            {l.link.label}
          </Link>
          {l.after}
        </p>
      ))}
    </section>
  );
}
