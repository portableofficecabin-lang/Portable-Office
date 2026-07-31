"use client";

/**
 * Click-to-reveal statutory-registration badges for the slim trust bar.
 *
 * Each badge shows only its "… Verified" label until the visitor clicks it — the GSTIN /
 * Udyam number is then revealed in a small popover. Two deliberate constraints:
 *
 *   • REVEAL ON CLICK ONLY. The number is not in the rendered output until the badge is
 *     opened, matching the requested behaviour (label always; number only on click).
 *   • NO LAYOUT IMPACT. The popover is absolutely positioned BELOW the bar and anchored to
 *     the badge's right edge, so it never changes the trust bar's load-bearing h-9 height
 *     (see TopBar) and can never introduce horizontal scrolling on a narrow viewport.
 *
 * Only one badge is open at a time; click the badge again, click anywhere outside, or press
 * Escape to close. The numbers come from `topBarVerifications` (→ COMPANY), never hard-coded
 * here, so this component can never show a stale registration.
 *
 * Shown from `md` up, matching the trust statements beside it; an item can defer itself to
 * `lg` via `showFrom: "lg"` (the long ISO badge does, mirroring how the third trust statement
 * on the left is the first to drop) so the h-9 bar can never overflow at tablet widths. On
 * phones the same registrations remain available in the footer (registrationBadges).
 */
import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";

import { topBarVerifications } from "@/lib/site-navigation";

export function VerifiedBadges() {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — only wired while something is open.
  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  return (
    <div ref={rootRef} className="hidden items-center gap-4 md:flex lg:gap-5">
      {topBarVerifications.map((v) => {
        const open = openId === v.id;
        const panelId = `verified-${v.id}`;
        // The container is `hidden md:flex`; a badge with showFrom "lg" stays hidden
        // one breakpoint longer so the longest label never squeezes the tablet bar.
        const deferToLg = "showFrom" in v && v.showFrom === "lg";
        return (
          <div key={v.id} className={deferToLg ? "relative hidden lg:block" : "relative"}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : v.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded font-semibold text-white transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-deep"
            >
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {v.label}
            </button>

            {open && (
              <div
                id={panelId}
                role="region"
                aria-label={`${v.srLabel} registration number`}
                className="absolute right-0 top-[calc(100%+6px)] z-50 whitespace-nowrap rounded-md border border-navy-deep/10 bg-white px-2.5 py-1.5 text-left shadow-lg"
              >
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-navy-deep/50">
                  {v.srLabel}
                </span>
                <span className="select-all font-mono text-[11px] font-bold tracking-wide text-navy-deep">
                  {v.value}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
