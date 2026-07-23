"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Mail, Menu, Phone, ShieldCheck, User } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { useAuth } from "@/contexts/AuthContext";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";
import {
  isRouteActive,
  megaMenuColumns,
  megaMenuFeatured,
  primaryNavigation,
  primaryPhone,
  secondaryPhone,
  whatsappUrl,
} from "@/lib/site-navigation";

import { resolveCategoryIcon } from "./categoryIcons";

/**
 * Slide-in navigation drawer for tablet and mobile.
 *
 * Built on the existing Sheet primitive (Radix Dialog), which already gives us the
 * things this has to get right and which are easy to get wrong by hand: a focus
 * trap, body-scroll locking while open, Escape-to-close, an accessible dialog role,
 * and focus returning to the trigger on close.
 *
 * The open state is controlled purely by the user. Every link closes the drawer via
 * an explicit onClick, and the `[pathname]` effect is a backstop for navigations
 * triggered some other way. Both are needed: the effect alone misses the case where
 * the tapped link IS the current route (pathname never changes, so the drawer would
 * sit there open with no feedback — e.g. tapping "Get a Quote" while on /contact).
 * Nothing here can open the drawer on its own.
 *
 * Product categories sit in an Accordion so the drawer opens to a short, readable
 * list rather than 15 categories the user has to scroll past to reach Contact.
 * Browsing requires no account: the sign-in row is one option among many, never a
 * gate.
 */
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Backstop for navigations not initiated by a drawer link (back/forward, a
  // redirect). Drawer links close it directly via `close` below.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-deep",
            "transition-colors duration-200 motion-reduce:transition-none",
            "hover:bg-navy-deep/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          )}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Menu</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className={cn(
          "flex w-[min(92vw,24rem)] flex-col gap-0 overflow-y-auto border-navy-deep/10 bg-white p-0 sm:max-w-sm",
          // The shared SheetContent renders its own close button as the last direct
          // child. It ships at icon size, which is well under the 44px touch target
          // this drawer needs, so it is enlarged here rather than by editing the
          // shared primitive (which other dialogs across the app rely on).
          "[&>button]:right-4 [&>button]:top-4 [&>button]:z-10 [&>button]:flex [&>button]:h-11 [&>button]:w-11",
          "[&>button]:items-center [&>button]:justify-center [&>button]:rounded-full",
          "[&>button]:border [&>button]:border-navy-deep/15 [&>button]:bg-white [&>button]:text-navy-deep [&>button]:opacity-100",
          "[&>button>svg]:h-5 [&>button>svg]:w-5",
        )}
      >
        {/* ---------- Drawer header ---------- */}
        <div className="border-b border-navy-deep/10 px-5 pb-5 pt-6">
          <div className="pr-14">
            <SheetTitle className="text-left font-display text-lg font-extrabold tracking-tight text-navy-deep">
              Portable Office <span className="text-accent">Cabin</span>
            </SheetTitle>
            <SheetDescription className="mt-1 text-left text-sm text-navy-deep/60">
              Manufacturer of portable cabins, container offices and prefab structures.
            </SheetDescription>
          </div>

          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ISO 9001:2015 Certified
          </p>
        </div>

        {/* ---------- Navigation ---------- */}
        <nav aria-label="Mobile" className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {primaryNavigation.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-xl px-4 text-[15px] font-semibold",
                      "transition-colors duration-200 motion-reduce:transition-none",
                      active
                        ? "bg-accent/12 text-accent"
                        : "text-navy-deep hover:bg-navy-deep/[0.06]",
                    )}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Accordion type="multiple" className="mt-3">
            {megaMenuColumns.map((column) => (
              <AccordionItem
                key={column.title}
                value={column.title}
                className="border-b border-navy-deep/10"
              >
                <AccordionTrigger className="min-h-11 px-4 text-left text-[13px] font-bold uppercase tracking-wide text-navy-deep/60 hover:text-navy-deep hover:no-underline">
                  {column.title}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul className="space-y-0.5">
                    {column.items.map((item) => {
                      const Icon = resolveCategoryIcon(item.icon);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            className="flex min-h-11 items-center gap-2.5 rounded-lg px-4 text-sm font-medium text-navy-deep/85 transition-colors duration-200 hover:bg-navy-deep/[0.06] hover:text-accent motion-reduce:transition-none"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="mt-3 space-y-1">
            {megaMenuFeatured.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-xl px-4 text-[15px] font-semibold text-navy-deep transition-colors duration-200 hover:bg-navy-deep/[0.06] motion-reduce:transition-none"
                >
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={user ? "/my-account" : "/login"}
                onClick={close}
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-4 text-[15px] font-semibold text-navy-deep transition-colors duration-200 hover:bg-navy-deep/[0.06] motion-reduce:transition-none"
              >
                <User className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {user ? "My Account" : "Sign In / Register"}
              </Link>
            </li>
          </ul>
        </nav>

        {/* ---------- Contact + primary CTA ---------- */}
        <div className="mt-auto space-y-3 border-t border-navy-deep/10 bg-navy-deep/[0.03] px-5 py-5">
          <a
            href={`tel:${primaryPhone.e164}`}
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold text-navy-deep transition-colors hover:text-accent"
          >
            <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {primaryPhone.display}
          </a>
          <a
            href={`tel:${secondaryPhone.e164}`}
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold text-navy-deep transition-colors hover:text-accent"
          >
            <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {secondaryPhone.display}
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold text-navy-deep transition-colors hover:text-[#0B7A43]"
          >
            <WhatsAppGlyph className="h-4 w-4 shrink-0 text-[#0B7A43]" />
            WhatsApp us
          </a>
          <a
            href={`mailto:${COMPANY.email.sales}`}
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-medium text-navy-deep transition-colors hover:text-accent"
          >
            <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">{COMPANY.email.sales}</span>
          </a>
          <p className="flex items-start gap-3 px-1 text-xs text-navy-deep/60">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              {COMPANY.businessHours.weekdays.display}
              <br />
              {COMPANY.businessHours.sunday.display}
            </span>
          </p>

          {/* text-navy-deep: white on the amber gradient fails contrast — see the
              note in HeaderActions. */}
          <Button variant="accent" size="lg" className="w-full text-navy-deep" asChild>
            <Link href="/contact" onClick={close}>
              Get a Quote
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
