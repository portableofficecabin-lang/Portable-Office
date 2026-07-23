"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the construction-step list.
 *
 * The erection sequence as a clickable list; clicking a step seeks the animation straight to it. The
 * active step is never signalled by colour alone (spec) — it also carries an inset ring and a "▶ now"
 * tag. Engineering mode expands the active step's full engineering rows: fabrication part marks,
 * connection marks, bolt spec, the material / section / qty / weight / BOQ rows, the required tools,
 * the safety note and the ITP inspection checkpoint that closes the step.
 *
 * SUB-STEPS. One construction step can be several shots — the per-assembly zoomed tour of the rafter
 * cleat / C-purlin / MS tube connections is one shot per connection inside construction step 18 (and
 * its covering inside 19). Those shots render INDENTED under the step they belong to, so a 5–7 minute
 * timeline still reads as a sequence of construction steps rather than a flat list of 200 rows.
 * Jump-to-step works identically for both: every row seeks by its own timeline index.
 */

import { cn } from "@/lib/utils";
import { ASSEMBLY_SEQUENCE } from "@/features/labour-colony-studio/model/assembly";
import type { AssemblyTimeline, TimelineStep } from "./assemblyTypes";

export interface AssemblyStepListProps {
  timeline: AssemblyTimeline;
  activeIndex: number;
  onJump: (index: number) => void;
  engineering: boolean;
}

export function AssemblyStepList({ timeline, activeIndex, onJump, engineering }: AssemblyStepListProps) {
  // Count what is really there: how many of the canonical construction steps this design uses, and
  // how many shots they were filmed in. A hardcoded "of 24" would start lying the moment one step is
  // split into a detail tour.
  const stages = new Set(timeline.steps.map((s) => s.assemblyStep)).size;
  const tour = timeline.detailTour;

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2 text-sm font-semibold">
        Erection sequence ({stages} of {ASSEMBLY_SEQUENCE.length} steps
        {timeline.steps.length !== stages ? ` · ${timeline.steps.length} shots` : ""})
        {tour.enabled && (
          <span className="ml-1 font-normal text-muted-foreground">
            — zoomed detail on {tour.toured} rafter assembl{tour.toured === 1 ? "y" : "ies"}
            {tour.capped ? ` of ${tour.assemblies}` : ""}
          </span>
        )}
      </div>
      <ol className="max-h-[520px] divide-y divide-border/50 overflow-y-auto">
        {timeline.steps.map((s, i) => {
          const active = i === activeIndex;
          const isSub = s.subIndex !== undefined;
          return (
            <li key={s.id}>
              <button
                type="button" onClick={() => onJump(i)} aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-start gap-2 py-2 pr-3 text-left text-sm transition-colors",
                  isSub ? "border-l-2 border-accent/25 pl-6" : "pl-3",
                  active ? "bg-accent/15 ring-1 ring-inset ring-accent/40" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded px-1 font-bold tabular-nums",
                    isSub ? "text-[10px]" : "text-xs",
                    active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(isSub ? "text-[13px] font-medium" : "font-medium")}>{s.title}</span>
                    <span className="rounded bg-muted px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      seq {s.assemblyStep}{isSub ? `.${s.subIndex}` : ""}
                    </span>
                    {isSub && (
                      <span className="rounded bg-sky-100 px-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        detail
                      </span>
                    )}
                    {active && <span className="rounded bg-accent/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-accent">▶ now</span>}
                  </span>
                  {s.subTitle && (
                    <span className="block truncate text-[11px] font-medium text-muted-foreground/90">{s.subTitle}</span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">{s.captionCustomer}</span>
                  {engineering && !active && s.memberMarks && (
                    <span className="block truncate text-[11px] text-muted-foreground/80">{s.memberMarks}</span>
                  )}
                  {engineering && active && <ActiveStepDetail step={s} />}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.partIds.length}p</span>
              </button>
            </li>
          );
        })}
        {!timeline.steps.length && (
          <li className="px-3 py-4 text-xs text-muted-foreground">
            This design has no components to erect yet.
          </li>
        )}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- detail ---------------------- */

function ActiveStepDetail({ step }: { step: TimelineStep }) {
  return (
    <span className="mt-1.5 block space-y-1 border-l-2 border-accent/40 pl-2 text-[11px] leading-relaxed text-muted-foreground">
      {step.captionEngineering && <Row label="Detail" value={step.captionEngineering} />}
      {step.memberMarks && <Row label="Members" value={step.memberMarks} />}
      {step.connectionMarks && <Row label="Connections" value={step.connectionMarks} />}
      {step.boltSpec && <Row label="Bolts" value={step.boltSpec} />}
      {step.engineering.map((r, i) => (
        <Row
          key={`${r.label}-${i}`}
          label={r.label}
          value={[r.material, r.section, r.qty, r.weight, r.boqRef, r.note].filter(Boolean).join(" · ")}
        />
      ))}
      {step.tools && <Row label="Tools" value={step.tools} />}
      {step.safety && <Row label="Safety" value={step.safety} />}
      {step.inspection && <Row label="ITP" value={step.inspection} />}
      {step.warnings.map((w, i) => (
        <span key={i} className="block text-amber-700">⚠ {w}</span>
      ))}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="block">
      <span className="font-semibold text-foreground/70">{label}:</span> {value}
    </span>
  );
}
