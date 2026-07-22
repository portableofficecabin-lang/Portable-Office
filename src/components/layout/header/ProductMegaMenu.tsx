"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { megaMenuColumns, megaMenuFeatured } from "@/lib/site-navigation";

import { resolveCategoryIcon } from "./categoryIcons";

/**
 * Desktop "Products" dropdown.
 *
 * The previous implementation was pure `group-hover` CSS, which meant keyboard and
 * screen-reader users could reach the trigger but could never open the panel — the
 * category links were unreachable without a mouse. This version is driven by real
 * state so it works for every input device:
 *
 *  - Pointer: hovering the trigger opens the panel after a short intent delay, and
 *    leaving the trigger *or* the panel closes it after a slightly longer grace
 *    period. The grace period is what stops the panel flickering shut while the
 *    pointer crosses the gap between trigger and panel.
 *  - Keyboard: Enter/Space toggles, ArrowDown opens and moves focus into the first
 *    link, Escape closes and returns focus to the trigger, and tabbing out of the
 *    subtree closes it.
 *  - Pointer-down anywhere outside closes it.
 *  - A route change closes it, so the panel is never left hanging over the new page.
 *
 * Timers are always cleared on unmount, so the panel can never re-open by itself
 * after the component has gone away.
 */

const OPEN_DELAY_MS = 90;
const CLOSE_DELAY_MS = 160;

export function ProductMegaMenu({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelId = `${useId()}-products-menu`;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearTimer]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      // Don't yank the panel away from a keyboard user just because the mouse
      // happens to be elsewhere — that would drop their focus onto <body>.
      //
      // This tests panelRef, NOT wrapperRef, and the difference matters: wrapperRef
      // also contains the TRIGGER. Clicking the trigger to open the menu leaves it
      // focused, so a wrapperRef test would bail on every subsequent close attempt
      // and strand the panel open over the page for good.
      if (panelRef.current?.contains(document.activeElement)) return;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, [clearTimer]);

  const closeNow = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  /** Close and hand focus back to the trigger — the Escape / tab-out contract. */
  const closeAndRestoreFocus = useCallback(() => {
    closeNow();
    triggerRef.current?.focus();
  }, [closeNow]);

  // Clear any pending timer when the component unmounts so a queued setOpen(true)
  // can never fire against an unmounted tree.
  useEffect(() => clearTimer, [clearTimer]);

  // A navigation happened — drop the panel. Deliberately does NOT restore focus:
  // focus belongs to whatever the user just navigated to.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape anywhere closes and restores focus.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeAndRestoreFocus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeAndRestoreFocus]);

  // Pointer-down outside the trigger+panel subtree closes without stealing focus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) closeNow();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeNow]);

  /** Tabbing (or clicking) to something outside the subtree closes the panel. */
  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && wrapperRef.current?.contains(next)) return;
    // relatedTarget is null when focus leaves the document entirely (e.g. the user
    // switched tabs) — leave the panel as-is in that case rather than closing.
    if (next) closeNow();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      clearTimer();
      setOpen(true);
      // Wait for the panel to be in the DOM before moving focus into it.
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
      });
    }
  };

  return (
    // Deliberately NOT `relative`: the panel below anchors to the header row (which
    // Header.tsx marks `relative`) so it spans the container instead of being centred
    // on this ~110px trigger, which pushed its left edge off-screen.
    <div
      ref={wrapperRef}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onBlurCapture={handleBlurCapture}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        // Only reference the panel while it exists. The panel is conditionally
        // rendered, so a permanent aria-controls would dangle at a missing id
        // whenever the menu is closed.
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) {
            closeNow();
          } else {
            clearTimer();
            setOpen(true);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "relative inline-flex h-12 items-center gap-1 whitespace-nowrap px-3.5 text-[15px] font-medium xl:px-4",
          "transition-colors duration-200 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
          isActive || open ? "text-accent" : "text-navy-deep hover:text-accent",
        )}
      >
        Products
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-accent xl:inset-x-3.5"
          />
        )}
      </button>

      {/* Rendered only when open: nothing to hit-test or paint while closed, and no
          hidden-but-focusable links for keyboard users to fall into. */}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className={cn(
            // Anchored to the nav row (inset to the container), so the panel can
            // never run off either viewport edge at any width. No top margin — it
            // reads as a sheet dropping straight out of the nav row.
            "absolute inset-x-0 top-full z-50",
            "animate-[fade-in_0.15s_ease-out_forwards] motion-reduce:animate-none",
          )}
        >
          <div
            className={cn(
              // White to match the light header bars above it.
              "overflow-hidden rounded-b-2xl border-x border-b border-navy-deep/10 bg-white shadow-2xl",
              // A short viewport can't show a 4-row category grid; let it scroll
              // rather than spill off the bottom of the screen.
              "max-h-[calc(100vh-9rem)] overflow-y-auto",
            )}
          >
            <div className="grid gap-x-6 gap-y-7 p-6 xl:grid-cols-[repeat(4,minmax(0,1fr))_15rem]">
              {megaMenuColumns.map((column) => (
                <div key={column.title} className="min-w-0">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-accent">
                    {column.title}
                  </h3>
                  <ul className="space-y-0.5">
                    {column.items.map((item) => {
                      const Icon = resolveCategoryIcon(item.icon);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeNow}
                            className={cn(
                              "group/item flex gap-2.5 rounded-lg p-2 transition-colors duration-200 motion-reduce:transition-none",
                              "hover:bg-navy-deep/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            )}
                          >
                            <Icon
                              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug text-navy-deep group-hover/item:text-accent">
                                {item.name}
                              </span>
                              <span className="mt-0.5 block text-xs leading-snug text-navy-deep/60">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {/* Right-hand rail: the non-category journeys. */}
              <div className="min-w-0 xl:border-l xl:border-navy-deep/10 xl:pl-6">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-accent">
                  Quick Links
                </h3>
                <ul className="space-y-0.5">
                  {megaMenuFeatured.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeNow}
                        className={cn(
                          "group/item block rounded-lg p-2 transition-colors duration-200 motion-reduce:transition-none",
                          "hover:bg-navy-deep/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold leading-snug text-navy-deep group-hover/item:text-accent">
                          {item.name}
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/item:translate-x-0.5 motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-navy-deep/60">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
