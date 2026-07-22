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
 */
import { MapPin, Phone, Tag, Truck, type LucideIcon } from "lucide-react";

import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { COMPANY } from "@/lib/company";
import { primaryPhone, topBarTrustItems, whatsappUrl } from "@/lib/site-navigation";

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
            return (
              <span
                key={item.label}
                className={
                  // The third statement is the first to drop when space is tight.
                  index === 2
                    ? "hidden items-center gap-1.5 whitespace-nowrap lg:inline-flex"
                    : "hidden items-center gap-1.5 whitespace-nowrap md:inline-flex"
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {item.label}
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

          {/* ---------- Desktop right: contact ---------- */}
          <span className="ml-auto hidden items-center gap-6 lg:flex">
            <a
              href={`mailto:${COMPANY.email.sales}`}
              className="hidden whitespace-nowrap transition-colors hover:text-accent xl:inline"
            >
              {COMPANY.email.sales}
            </a>
            <span className="hidden whitespace-nowrap text-white/70 2xl:inline">
              {COMPANY.businessHours.weekdays.display}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
