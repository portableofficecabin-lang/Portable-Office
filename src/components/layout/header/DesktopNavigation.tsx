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
    // Shown from xl (1280px) up. Below that the mobile drawer takes over — see the
    // note in Header.tsx: at 1024px this bar plus the brand and actions overflowed
    // the container.
    <nav className="hidden shrink-0 items-center gap-0.5 xl:flex" aria-label="Primary">
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
              "relative rounded-full px-3.5 py-2 text-sm font-semibold",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-accent/15 text-accent"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
