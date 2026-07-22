"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PRODUCTS_ACTIVE_PREFIX, isRouteActive, primaryNavigation } from "@/lib/site-navigation";

import { ProductMegaMenu } from "./ProductMegaMenu";

export function DesktopNavigation() {
  const pathname = usePathname();
  const productsActive = pathname.startsWith(PRODUCTS_ACTIVE_PREFIX);

  return (
    // Its own full-width row beneath the brand bar, so nine items fit comfortably
    // from lg (1024px) without competing with the logo and CTA buttons. Below lg the
    // mobile drawer takes over.
    <nav className="hidden items-center lg:flex" aria-label="Primary">
      {primaryNavigation.map((item) => {
        if (item.href === PRODUCTS_ACTIVE_PREFIX) {
          return <ProductMegaMenu key={item.name} isActive={productsActive} />;
        }

        const active = isRouteActive(pathname, item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // The active item is marked with an amber underline rather than a
              // pill, so the row reads as one clean line of links.
              "relative inline-flex h-12 items-center whitespace-nowrap px-3.5 text-[15px] font-medium xl:px-4",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
              active ? "text-accent" : "text-navy-deep hover:text-accent",
            )}
          >
            {item.name}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-accent xl:inset-x-3.5"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
