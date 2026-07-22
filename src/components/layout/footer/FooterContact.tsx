import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { COMPANY, formatAddress } from "@/lib/company";
import { primaryPhone, secondaryPhone, whatsappUrl } from "@/lib/site-navigation";

/**
 * Footer contact column.
 *
 * Every value is read from src/lib/company.ts — the verified-facts file — rather than
 * retyped, which is how the site previously ended up with a GSTIN on a quotation that
 * disagreed with the one in the footer. Addresses are rendered through the shared
 * formatAddress() helper for the same reason.
 *
 * Business hours are real (Mon-Sat 07:00-22:00, Sun 10:00-19:00) and are stated
 * exactly. company.ts is explicit that there is NO 24/7 support and it must never be
 * implied — so the hours are shown in full rather than summarised as "always open".
 *
 * Phone and email use tel:/mailto: with the E.164 number so the link dials correctly
 * from a mobile browser while the visible text stays human-readable.
 */
export function FooterContact() {
  return (
    <div className="min-w-0">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
        Get in Touch
      </h3>

      <ul className="mt-4 space-y-3.5">
        <li>
          <a
            href={`tel:${primaryPhone.e164}`}
            className="flex items-center gap-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
          >
            <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {primaryPhone.display}
          </a>
        </li>
        <li>
          <a
            href={`tel:${secondaryPhone.e164}`}
            className="flex items-center gap-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
          >
            <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {secondaryPhone.display}
          </a>
        </li>
        <li>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:text-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
          >
            <WhatsAppGlyph className="h-4 w-4 shrink-0 text-[#25D366]" />
            WhatsApp Enquiry
          </a>
        </li>
        <li>
          <a
            href={`mailto:${COMPANY.email.sales}`}
            className="flex items-start gap-2.5 text-sm text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
          >
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="break-all">{COMPANY.email.sales}</span>
          </a>
        </li>
        <li>
          <a
            href={`mailto:${COMPANY.email.secondary}`}
            className="flex items-start gap-2.5 text-sm text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
          >
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="break-all">{COMPANY.email.secondary}</span>
          </a>
        </li>
      </ul>

      {/* ---------- Hours ---------- */}
      <div className="mt-6 flex items-start gap-2.5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="text-sm text-white/80">
          <div className="font-semibold text-white">Working Hours</div>
          <div className="mt-1 leading-relaxed">
            {COMPANY.businessHours.weekdays.display}
            <br />
            {COMPANY.businessHours.sunday.display}
          </div>
        </div>
      </div>

      {/* ---------- Factory addresses ---------- */}
      <div className="mt-6 space-y-4">
        {[COMPANY.addresses.tamilNaduFactory, COMPANY.addresses.karnatakaFactory].map((address) => (
          <div key={address.label} className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <address className="not-italic text-sm text-white/75">
              <span className="block font-semibold text-white">{address.label}</span>
              <span className="mt-0.5 block leading-relaxed">{formatAddress(address)}</span>
            </address>
          </div>
        ))}
      </div>
    </div>
  );
}
