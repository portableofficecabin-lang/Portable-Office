import Link from "next/link";

import type { NavLinkItem } from "@/lib/site-navigation";

/**
 * One titled column of footer links.
 *
 * Plain `<ul>` of `<Link>`s on purpose — no accordion, no client JS. The Google
 * Merchant Center policy column renders through here, and those links must stay
 * crawlable and reachable without JavaScript. Keeping this a Server Component also
 * keeps the whole footer out of the client bundle.
 *
 * Column titles are `<h3>`, sitting under the footer's single sr-only `<h2>` in
 * Footer.tsx — so the footer contributes one labelled section with sub-headings,
 * rather than half a dozen sibling h2s competing with the page's own outline.
 */
export function FooterLinks({ title, items }: { title: string; items: NavLinkItem[] }) {
  return (
    <div className="min-w-0">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={`${item.name}-${item.href}`}>
            <Link
              href={item.href}
              className="inline-block text-sm leading-snug text-white/75 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
