import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { PaymentMethods } from "@/components/PaymentMethods";
import { COMPANY } from "@/lib/company";
import { bottomBarLinks, registrationBadges } from "@/lib/site-navigation";

/**
 * Footer base: registrations, accepted payment methods, copyright, policy shortcuts.
 *
 * The registration row (ISO certificate number, GSTIN, Udyam number) and the
 * PaymentMethods strip both already shipped in the footer and are preserved here —
 * the payment strip in particular states the methods Razorpay is genuinely
 * configured to take, which Merchant Center expects to match the real checkout.
 *
 * The copyright year is computed at render. The footer is a Server Component, so this
 * evaluates during the server render and cannot cause a hydration mismatch — but note
 * the page is statically generated with ISR, so the year is baked in until the next
 * revalidation. On 1 January it corrects itself on the first revalidate rather than at
 * the stroke of midnight, which is the right trade for keeping the footer off the
 * client bundle.
 */
export function FooterBottomBar() {
  const year = new Date().getFullYear();

  return (
    <div className="border-t border-white/10">
      <div className="container-custom py-8">
        {/* ---------- Registrations ---------- */}
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          {registrationBadges.map((badge) => (
            <li key={badge.label} className="inline-flex items-center gap-2 text-sm text-white/80">
              <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="font-semibold text-white">{badge.label}</span>
              <span className="font-mono text-xs tracking-tight text-white/70">{badge.value}</span>
            </li>
          ))}
        </ul>

        {/* ---------- Payment methods ---------- */}
        <div className="mt-6 border-t border-white/10 pt-6">
          <PaymentMethods variant="footer" />
        </div>

        {/* ---------- Copyright + policy shortcuts ---------- */}
        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/70">
            © {year} {COMPANY.legalName}. All rights reserved.
          </p>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {bottomBarLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-white/70 underline-offset-4 transition-colors duration-200 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
