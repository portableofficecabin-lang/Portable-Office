/**
 * Slim trust bar above the header.
 *
 * HEIGHT IS LOAD-BEARING: exactly h-9 (2.25rem / 36px) at every breakpoint, because
 * Header.tsx pins itself with `-top-9`. That offset is what lets this bar — and only
 * this bar — scroll away, leaving the white brand bar and nav row pinned to the
 * viewport top. Change this height and you must change the header's sticky offset in
 * the same commit. It also carries NO border: a border would sit outside the h-9 box
 * and leave a 1px sliver above the pinned bar below.
 *
 * Desktop shows three trust statements; mobile drops them for the two things a phone
 * user actually wants in reach — call and WhatsApp. Every string is backed by
 * existing site content (see topBarTrustItems in src/lib/site-navigation.ts).
 *
 * "Custom sizes available" is a LINK to the customer-facing size/price calculator
 * (/#cabin-calculator), so clicking the trust statement opens the calculator. The two
 * "… Verified" badges on the right reveal the GSTIN / Udyam number on click only
 * (VerifiedBadges) — the statutory numbers are never printed until the visitor asks.
 */
import Link from "next/link";
import { MapPin, Phone, Tag, Truck, type LucideIcon } from "lucide-react";

import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { COMPANY } from "@/lib/company";
import { primaryPhone, topBarTrustItems, whatsappUrl } from "@/lib/site-navigation";

import { VerifiedBadges } from "./VerifiedBadges";

const trustIcons: Record<string, LucideIcon> = {
  pin: MapPin,
  tag: Tag,
  truck: Truck,
};

export function TopBar() {
  return (
    <div className="bg-navy-deep text-white/90">
      <div className="container-custom">
        <div className="flex h-9 items-center gap-5 text-[11px] sm:text-xs lg:gap-7">
          {/* ---------- Desktop: trust statements ---------- */}
          {topBarTrustItems.map((item, index) => {
            const Icon = trustIcons[item.icon] ?? MapPin;
            const href = "href" in item ? item.href : undefined;
            // The third statement is the first to drop when space is tight.
            const visibility =
              index === 2
                ? "hidden items-center gap-1.5 whitespace-nowrap lg:inline-flex"
                : "hidden items-center gap-1.5 whitespace-nowrap md:inline-flex";
            const inner = (
              <>
                <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {item.label}
              </>
            );
            return href ? (
              <Link
                key={item.label}
                href={href}
                title="Open the cabin size & price calculator"
                className={`${visibility} rounded transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-deep`}
              >
                {inner}
              </Link>
            ) : (
              <span key={item.label} className={visibility}>
                {inner}
              </span>
            );
          })}

          {/* ---------- Mobile: call + WhatsApp ---------- */}
          <a
            href={`tel:${primaryPhone.e164}`}
            className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent md:hidden"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            {primaryPhone.display}
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent md:hidden"
          >
            <WhatsAppGlyph className="h-3.5 w-3.5 shrink-0 text-accent" />
            WhatsApp
          </a>

          {/* ---------- Desktop right: verifications + contact ---------- */}
          {/* Always-flex so `ml-auto` keeps the cluster right-aligned; every child sets its
              own breakpoint, so the cluster is simply empty (harmless) on small phones. */}
          <div className="ml-auto flex items-center gap-4 lg:gap-6">
            <VerifiedBadges />
            <a
              href={`mailto:${COMPANY.email.sales}`}
              className="hidden whitespace-nowrap transition-colors hover:text-accent xl:inline"
            >
              {COMPANY.email.sales}
            </a>
            <span className="hidden whitespace-nowrap text-white/70 2xl:inline">
              {COMPANY.businessHours.weekdays.display}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
