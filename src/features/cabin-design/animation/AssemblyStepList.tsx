"use client";

/**
 * ANIMATED CABIN ASSEMBLY — step list (spec: "click an assembly step … jump directly to it").
 *
 * The construction sequence as a clickable list; the active step is highlighted (not by colour
 * alone — it also carries a ring + a "▶ now" tag, spec: "Do not rely on colour alone"). Clicking a
 * step seeks the animation to it. Engineering mode reveals the per-step material summary row.
 */

import { cn } from "@/lib/utils";
import type { AssemblyTimeline } from "./assemblyTypes";

export function AssemblyStepList({
  timeline, activeIndex, onJump, engineering,
}: {
  timeline: AssemblyTimeline;
  activeIndex: number;
  onJump: (index: number) => void;
  engineering: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2 text-sm font-semibold">Assembly steps ({timeline.steps.length})</div>
      <ol className="max-h-[420px] divide-y divide-border/50 overflow-y-auto">
        {timeline.steps.map((s, i) => {
          const active = i === activeIndex;
          return (
            <li key={s.id}>
              <button
                type="button" onClick={() => onJump(i)} aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                  active ? "bg-accent/15 ring-1 ring-inset ring-accent/40" : "hover:bg-muted/60",
                )}
              >
                <span className={cn("mt-0.5 inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded px-1 text-xs font-bold tabular-nums",
                  active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{s.title}</span>
                    {active && <span className="rounded bg-accent/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-accent">▶ now</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.captionCustomer}</span>
                  {engineering && s.engineering[0] && (
                    <span className="block truncate text-[11px] text-muted-foreground/80">
                      {[s.engineering[0].material, s.engineering[0].section, s.engineering[0].weight].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {/* Step-by-step fixing procedure — expanded for the step being played. */}
                  {active && s.instructions && s.instructions.length > 0 && (
                    <span className="mt-1.5 block rounded border border-accent/30 bg-background/60 p-2">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-accent">
                        Fixing &amp; installation procedure
                      </span>
                      <span className="block space-y-0.5">
                        {s.instructions.map((ins) => (
                          <span key={ins} className="block text-[11px] leading-snug text-foreground/80">{ins}</span>
                        ))}
                      </span>
                      {s.tools && (
                        <span className="mt-1.5 block text-[10px] text-muted-foreground">
                          <b>Tools:</b> {s.tools}
                        </span>
                      )}
                      {s.inspection && (
                        <span className="block text-[10px] text-muted-foreground">
                          <b>Check:</b> {s.inspection}
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.partIds.length}p</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
