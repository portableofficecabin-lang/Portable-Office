"use client";

/**
 * Industry card grid + image POP-UP for the homepage "Industries We Serve" section.
 *
 * The one deliberate client island in this section (the pop-up needs state), and kept as
 * small as that job allows:
 *   • Cards are <button>s, NOT links — clicking opens a Radix dialog, it never navigates.
 *     All card copy (names, descriptions, chips) still arrives in the initial server HTML,
 *     because "use client" components are server-rendered on first paint.
 *   • ONE controlled dialog serves all 12 industries; its content mounts only while open,
 *     so the pop-up's two extra gallery images are fetched on demand, never on page load.
 *   • Radix supplies focus trap, Escape-to-close, outside-click-to-close and the close X.
 *
 * Data (copy + real project photos) lives in industriesData.ts, shared with the server shell.
 */
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { OptimizedImage } from "@/components/OptimizedImage";
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog";
import { industries, type Industry } from "./industriesData";

export function IndustriesGrid() {
  const [active, setActive] = useState<Industry | null>(null);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {industries.map((ind) => (
          <button
            key={ind.name}
            type="button"
            onClick={() => setActive(ind)}
            aria-haspopup="dialog"
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {/* Photo with the navy name bar */}
            <div className="relative w-full">
              <OptimizedImage
                src={ind.card.image}
                alt={ind.card.alt}
                aspectRatio="4/3"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="w-full transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-navy-deep/90 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <ind.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white">
                  {ind.name}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </div>
            </div>

            {/* Visible SEO copy: description + use-case chips */}
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{ind.desc}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                {ind.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ONE dialog for all cards — content (and its images) exists only while open */}
      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden rounded-2xl border-border/50 p-0">
          {active && (
            <>
              {/* Hero image with the title overlaid on a navy gradient */}
              <div className="relative">
                <OptimizedImage
                  src={active.card.image}
                  alt={active.card.alt}
                  aspectRatio="16/9"
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="w-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-deep/95 via-navy-deep/60 to-transparent px-6 pb-4 pt-12">
                  <DialogTitle className="flex items-center gap-3 font-display text-xl font-bold text-white sm:text-2xl">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <active.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                    </span>
                    {active.name}
                  </DialogTitle>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {active.desc}
                </DialogDescription>

                <div className="flex flex-wrap gap-2">
                  {active.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {/* Two more real project shots */}
                <div className="grid grid-cols-2 gap-3">
                  {active.gallery.map((g) => (
                    <div key={g.alt} className="overflow-hidden rounded-xl border border-border/50">
                      <OptimizedImage
                        src={g.image}
                        alt={g.alt}
                        aspectRatio="4/3"
                        sizes="(max-width: 768px) 50vw, 370px"
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
