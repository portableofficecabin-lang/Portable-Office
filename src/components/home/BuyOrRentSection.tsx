import Link from "next/link";
import {
  ArrowRight, BadgeIndianRupee, Box, Clock, Flag, Headphones, IndianRupee, MapPin,
  SlidersHorizontal, Tag, Target, Truck, Wrench,
} from "lucide-react";
import { BuyOrRentHelper } from "./BuyOrRentHelper";

/**
 * BUY OR RENT — the purchase-vs-rental decision section (light contrast band on the dark homepage,
 * matching the approved mockup 1:1): eyebrow + title, the two offer cards, the 8-row comparison
 * table, the "Still unsure?" band (3-question helper dialog + contact CTA) and the four trust chips.
 *
 * Server component — the only interactive piece is the <BuyOrRentHelper /> client island. CTAs:
 * buy → /products, rent → /rental-service, contact → /contact. Palette is the mockup's: blue #2563EB
 * for purchase, orange #EA580C for rental, green #16A34A accents, on white/slate-50.
 */

interface CompareRow {
  icon: typeof Target;
  label: string;
  purchase: string;
  rental: string;
}

const COMPARE_ROWS: CompareRow[] = [
  { icon: Target, label: "Best For", purchase: "Permanent sites", rental: "Temporary projects" },
  { icon: Clock, label: "Project Duration", purchase: "Long-term use", rental: "Minimum 6 months" },
  { icon: IndianRupee, label: "Upfront Cost", purchase: "One-time investment", rental: "Monthly rental" },
  { icon: BadgeIndianRupee, label: "Ownership", purchase: "Yours permanently", rental: "Return after term" },
  { icon: SlidersHorizontal, label: "Customisation", purchase: "Fully customisable", rental: "Standard options" },
  { icon: Wrench, label: "Maintenance", purchase: "Owner managed", rental: "Rental support" },
  { icon: MapPin, label: "Relocation", purchase: "Reuse at any site", rental: "Extend or exchange" },
  { icon: Flag, label: "End of Term", purchase: "Keep or resell", rental: "Return or renew" },
];

const TRUST_CHIPS = [
  { icon: Tag, label: "Transparent Pricing" },
  { icon: Box, label: "Custom Sizes" },
  { icon: Truck, label: "Fast Delivery" },
  { icon: Headphones, label: "Pan-India Support" },
];

/** Filled check disc — blue for the purchase column, orange for rental (mockup's row markers). */
function CheckDisc({ color }: { color: "blue" | "orange" }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        color === "blue" ? "bg-[#2563EB]" : "bg-[#EA580C]"
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
        <path d="M2.5 6.2 5 8.6l4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The purchase card's cabin illustration (simple line cabin on a tinted disc, per the mockup). */
function CabinIllustration() {
  return (
    <span className="flex h-32 w-32 items-center justify-center rounded-full bg-[#EFF4FB] sm:h-36 sm:w-36" aria-hidden>
      <svg viewBox="0 0 96 72" className="h-20 w-24" fill="none">
        {/* body */}
        <rect x="8" y="18" width="80" height="42" rx="2" fill="#fff" stroke="#1E3A8A" strokeWidth="2.5" />
        {/* roof */}
        <path d="M4 18h88l-5-8H9l-5 8Z" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="2.5" strokeLinejoin="round" />
        {/* door */}
        <rect x="41" y="30" width="14" height="30" rx="1" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
        <circle cx="52" cy="46" r="1.4" fill="#fff" />
        {/* windows */}
        <rect x="16" y="28" width="14" height="12" rx="1" fill="#BFDBFE" stroke="#1E3A8A" strokeWidth="2" />
        <rect x="66" y="28" width="14" height="12" rx="1" fill="#BFDBFE" stroke="#1E3A8A" strokeWidth="2" />
        {/* corrugation hints */}
        <path d="M16 46v10M22 46v10M74 46v10M80 46v10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        {/* steps */}
        <path d="M38 60h20v4H36l2-4Z" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The rental card's calendar-with-renewal illustration (per the mockup). */
function CalendarIllustration() {
  return (
    <span className="flex h-32 w-32 items-center justify-center rounded-full bg-[#FDF0E7] sm:h-36 sm:w-36" aria-hidden>
      <svg viewBox="0 0 84 76" className="h-20 w-20" fill="none">
        {/* calendar body */}
        <rect x="6" y="12" width="60" height="56" rx="7" fill="#fff" stroke="#EA580C" strokeWidth="3" />
        <path d="M6 28h60" stroke="#EA580C" strokeWidth="3" />
        {/* binder rings */}
        <path d="M22 6v12M50 6v12" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
        {/* date dots */}
        {[0, 1, 2, 3].map((c) => (
          <rect key={`r1-${c}`} x={15 + c * 12} y={36} width="7" height="7" rx="1.5" fill="#FDBA8C" />
        ))}
        {[0, 1, 2].map((c) => (
          <rect key={`r2-${c}`} x={15 + c * 12} y={48} width="7" height="7" rx="1.5" fill="#FDBA8C" />
        ))}
        {/* renewal cycle arrows */}
        <path d="M78 46a16 16 0 0 1-14 15" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M50 63a16 16 0 0 1-2-24" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M64 65l-4-4 6-2 -2 6Z" fill="#EA580C" />
        <path d="M46 36l5 2-5 4 0-6Z" fill="#EA580C" />
      </svg>
    </span>
  );
}

export function BuyOrRentSection() {
  return (
    <section className="section-padding cv-section bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <div className="container-custom">
        {/* ---------------- header ---------------- */}
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block text-sm font-bold uppercase tracking-[0.2em] text-[#16A34A]">
            BUY&nbsp;&nbsp;•&nbsp;&nbsp;RENT&nbsp;&nbsp;•&nbsp;&nbsp;CUSTOMISE
          </span>
          <h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Buy or Rent — Choose What Works for You
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Compare cost, flexibility and ownership before you decide.
          </p>
        </div>

        {/* ---------------- the two offer cards ---------------- */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* PURCHASE */}
          <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-[#BFD5F6] bg-[#F7FAFF] p-6 sm:flex-row sm:p-8">
            <CabinIllustration />
            <div className="text-center sm:text-left">
              <div className="font-display text-2xl font-extrabold tracking-wide text-[#2563EB]">PURCHASE</div>
              <span className="mt-2 inline-block rounded-md border border-[#BFD5F6] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                BEST FOR LONG-TERM
              </span>
              <p className="mt-3 text-lg leading-snug text-slate-700">
                Own the asset and customise every detail.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
              >
                Explore Cabins to Buy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* RENTAL */}
          <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-[#F6CDAF] bg-[#FFF9F4] p-6 sm:flex-row sm:p-8">
            <CalendarIllustration />
            <div className="text-center sm:text-left">
              <div className="font-display text-2xl font-extrabold tracking-wide text-[#EA580C]">RENTAL</div>
              <span className="mt-2 inline-block rounded-md border border-[#F6CDAF] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#EA580C]">
                LOWER UPFRONT COST
              </span>
              <p className="mt-3 text-lg leading-snug text-slate-700">
                Deploy quickly for temporary project needs.
              </p>
              <Link
                href="/rental-service"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#C2410C]"
              >
                View Rental Cabins <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ---------------- comparison table ---------------- */}
        <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm sm:text-base">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wide text-slate-700">COMPARE</th>
                <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wide text-[#2563EB]">PURCHASE</th>
                <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wide text-[#EA580C]">RENTAL</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-5 py-3 font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-2.5">
                      <row.icon className="h-[18px] w-[18px] text-slate-400" aria-hidden />
                      {row.label}
                    </span>
                  </th>
                  <td className="px-5 py-3 text-slate-700">
                    <span className="inline-flex items-center gap-2.5">
                      <CheckDisc color="blue" /> {row.purchase}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    <span className="inline-flex items-center gap-2.5">
                      <CheckDisc color="orange" /> {row.rental}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---------------- still unsure? ---------------- */}
        <div className="mb-8 flex flex-col items-center gap-5 rounded-2xl border border-[#D7E4F7] bg-[#F2F7FE] p-6 sm:flex-row sm:justify-between sm:p-7">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-sm" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
                <rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="#2563EB" />
                <rect x="7" y="5.5" width="10" height="4" rx="1" fill="#BFDBFE" />
                {[0, 1, 2].map((r) =>
                  [0, 1, 2].map((c) => (
                    <rect key={`${r}-${c}`} x={7 + c * 3.6} y={12 + r * 3.2} width="2.4" height="2.2" rx="0.6" fill="#fff" />
                  )),
                )}
              </svg>
            </span>
            <div className="text-center sm:text-left">
              <div className="font-display text-xl font-bold text-slate-900">Still unsure?</div>
              <p className="text-slate-500">
                Answer 3 quick questions and get the best option for your project.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <BuyOrRentHelper />
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#2563EB] bg-white px-5 py-2.5 font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF4FB]"
            >
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ---------------- trust chips ---------------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TRUST_CHIPS.map((chip) => (
            <div
              key={chip.label}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F7EE]" aria-hidden>
                <chip.icon className="h-4 w-4 text-[#16A34A]" />
              </span>
              <span className="font-semibold text-slate-800">{chip.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
