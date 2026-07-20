"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the construction-step list.
 *
 * The erection sequence as a clickable list; clicking a step seeks the animation straight to it. The
 * active step is never signalled by colour alone (spec) — it also carries an inset ring and a "▶ now"
 * tag. Engineering mode expands the active step's full engineering rows: fabrication part marks,
 * connection marks, bolt spec, the material / section / qty / weight / BOQ rows, the required tools,
 * the safety note and the ITP inspection checkpoint that closes the step.
 */

import { cn } from "@/lib/utils";
import type { AssemblyTimeline, TimelineStep } from "./assemblyTypes";

export interface AssemblyStepListProps {
  timeline: AssemblyTimeline;
  activeIndex: number;
  onJump: (index: number) => void;
  engineering: boolean;
}

export function AssemblyStepList({ timeline, activeIndex, onJump, engineering }: AssemblyStepListProps) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2 text-sm font-semibold">
        Erection sequence ({timeline.steps.length} of 24 steps)
      </div>
      <ol className="max-h-[520px] divide-y divide-border/50 overflow-y-auto">
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
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded px-1 text-xs font-bold tabular-nums",
                    active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{s.title}</span>
                    <span className="rounded bg-muted px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      seq {s.assemblyStep}
                    </span>
                    {active && <span className="rounded bg-accent/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-accent">▶ now</span>}
                  </span>
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
