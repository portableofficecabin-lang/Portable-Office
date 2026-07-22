/**
 * Compact business-information bar that sits above the main navigation.
 *
 * HEIGHT IS LOAD-BEARING: this bar is exactly h-9 (2.25rem / 36px) at every
 * breakpoint, because Header.tsx pins itself with `-top-9`. That offset is what
 * lets the whole header scroll up by exactly this bar's height and then park the
 * main navigation flush against the viewport top. Change this height and you must
 * change the header's sticky offset in the same commit, or the nav will either
 * float below the top edge or clip its own top border.
 *
 * Everything here is a verified fact from src/lib/company.ts — no invented hours,
 * numbers or certifications.
 */
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import { COMPANY } from "@/lib/company";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";

export function TopBar() {
  return (
    // NO border-b. A border would sit OUTSIDE the h-9 box, making the bar 37px tall
    // while Header.tsx pins the header at -top-9 (36px) — leaving a 1px navy sliver
    // above the nav once scrolled. The colour change against the nav is separation
    // enough.
    <div className="bg-navy-deep text-white/85">
      <div className="container-custom">
        <div className="flex h-9 items-center justify-between gap-4 text-[11px] sm:text-xs">
          {/* ---------- Left: coverage + credentials (desktop) ---------- */}
          <div className="hidden min-w-0 items-center gap-4 md:flex">
            <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">Factories in Tamil Nadu &amp; Karnataka</span>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span className="truncate">Delivery PAN India</span>
            </span>

            {/* Revealed only at xl. Below that the four clusters together need more
                width than the container has, and the nowrap children paint over
                each other. */}
            <span className="hidden min-w-0 items-center gap-1.5 whitespace-nowrap xl:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">ISO 9001:2015 Certified</span>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span className="truncate">
                GSTIN <span className="font-mono tracking-tight">{COMPANY.gstin}</span>
              </span>
            </span>
          </div>

          {/* ---------- Left: essentials only (mobile) ---------- */}
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <a
              href={`tel:${primaryPhone.e164}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {primaryPhone.display}
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent"
            >
              <WhatsAppGlyph className="h-3.5 w-3.5 shrink-0 text-accent" />
              WhatsApp
            </a>
          </div>

          {/* ---------- Right: hours + contact (desktop) ---------- */}
          <div className="hidden min-w-0 shrink-0 items-center gap-4 md:flex">
            <span className="hidden items-center gap-1.5 whitespace-nowrap 2xl:inline-flex">
              <Clock className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {COMPANY.businessHours.weekdays.display}
            </span>

            <a
              href={`mailto:${COMPANY.email.sales}`}
              className="hidden items-center gap-1.5 whitespace-nowrap transition-colors hover:text-accent xl:inline-flex"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {COMPANY.email.sales}
            </a>

            <a
              href={`tel:${primaryPhone.e164}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {primaryPhone.display}
            </a>
          </div>

          {/* ---------- Right: email shortcut (mobile) ---------- */}
          <a
            href={`mailto:${COMPANY.email.sales}`}
            title={`Email ${COMPANY.email.sales}`}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-accent md:hidden"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
