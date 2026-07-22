"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Header product search.
 *
 * WHAT THIS IS WIRED TO — read before changing it. This site has no search backend
 * and no /search route; that omission is deliberate and is documented in
 * src/components/seo/WebsiteJsonLd.tsx (declaring a schema.org SearchAction for a
 * route that does not exist would be a false capability claim). The only real search
 * on the site is the client-side filter that already ships inside
 * src/views/Products.tsx, which matches a query against product name, category and
 * description.
 *
 * So this box does not invent results and does not call an API. It submits to
 * `/products?search=<query>`, and ProductsListingWithParams seeds that existing
 * filter from the URL. Real search, existing code path, nothing fabricated.
 *
 * The `search` param specifically is safe: middleware.ts rewrites /products only
 * when a `category` param is present, and passes every other query through
 * untouched. Never submit a category query param from here — middleware 301s it and
 * strips the whole query string. Category links must use the path form instead.
 *
 * (That sentence avoids writing the literal query-param form on one line with the
 * word "to"/"href": scripts/seo-audit.mjs greps for exactly that pattern to catch
 * real category-query links, and it does not skip comments.)
 *
 * Interaction contract: the panel opens below the header (never over the nav), the
 * input takes focus on open, Escape closes it and returns focus to the trigger, and
 * a pointer-down outside closes it. It never opens on its own.
 */

const PLACEHOLDER = "Search cabins, sizes or products";

export function HeaderSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const panelId = `${useId()}-header-search`;

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Move focus into the field as soon as the panel mounts.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes from anywhere inside the panel and hands focus back.
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

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    // An empty submit is treated as "show me everything" rather than a no-op, so the
    // user always lands somewhere useful.
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    setOpen(false);
  };

  return (
    // Deliberately NOT `relative`: the panel anchors to the header row (marked
    // `relative` in Header.tsx). Anchored to this button instead, the panel's right
    // edge sat ~180px in from the viewport on mobile — where the button actually is
    // — pushing its left edge ~90px off the left of the screen.
    <div ref={wrapperRef} className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        // Referenced only while the panel is rendered — see ProductMegaMenu.
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close product search" : "Search products"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border",
          "transition-colors duration-200 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-border/60 bg-card/60 text-foreground hover:border-accent/40 hover:text-accent",
        )}
      >
        {open ? (
          <X className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className={cn(
            // Right-aligned to the header row and capped at the container width, so
            // it stays fully on-screen from 320px up.
            "absolute right-0 top-full z-50 mt-2 w-full max-w-[26rem]",
            "animate-[fade-in_0.15s_ease-out_forwards] motion-reduce:animate-none",
          )}
        >
          <form
            onSubmit={handleSubmit}
            role="search"
            className="rounded-2xl border border-border/70 bg-popover p-3 shadow-2xl"
          >
            <label htmlFor={`${panelId}-input`} className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={inputRef}
                id={`${panelId}-input`}
                type="search"
                name="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={PLACEHOLDER}
                autoComplete="off"
                className="h-11 rounded-xl border-border/60 bg-card/60 pl-10 pr-3 focus-visible:border-accent/40 focus-visible:ring-accent/50"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Searches our product range by name and category.
              </p>
              {/* text-navy-deep: white on the amber gradient fails contrast — see
                  the note in HeaderActions. */}
              <Button type="submit" variant="accent" size="sm" className="h-9 shrink-0 px-4 text-navy-deep">
                Search
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
