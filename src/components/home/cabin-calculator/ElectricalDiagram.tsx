"use client";

/**
 * ElectricalDiagram — an annotated "what's included" callout for the Electrical step.
 *
 * A single Plug Point = 2 sockets + 2 switches; a single AC Provision = 1 socket +
 * 1 switch. This renders those components as small faceplate symbols with arrow-
 * labelled groups so the customer sees exactly what each unit contains. Spec-only.
 * Self-contained so it doesn't entangle the (large) CabinCalculator component.
 */

// 3-pin (Indian) socket faceplate: earth pin on top, two pins below.
function SocketIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
      <rect x="1" y="1" width="14" height="18" rx="2.5" fill="hsl(var(--accent) / 0.12)" stroke="hsl(var(--accent))" strokeWidth="1" />
      <circle cx="8" cy="7" r="1.1" fill="hsl(var(--accent))" />
      <circle cx="6" cy="11.5" r="1.1" fill="hsl(var(--accent))" />
      <circle cx="10" cy="11.5" r="1.1" fill="hsl(var(--accent))" />
    </svg>
  );
}

// Rocker light switch faceplate.
function SwitchIcon() {
  return (
    <svg width="13" height="20" viewBox="0 0 13 20" aria-hidden="true">
      <rect x="1" y="1" width="11" height="18" rx="2.5" fill="hsl(var(--accent) / 0.12)" stroke="hsl(var(--accent))" strokeWidth="1" />
      <rect x="3.5" y="5" width="6" height="10" rx="1.5" fill="hsl(var(--accent) / 0.28)" stroke="hsl(var(--accent))" strokeWidth="0.8" />
      <line x1="6.5" y1="7" x2="6.5" y2="10.5" stroke="hsl(var(--accent))" strokeWidth="1" />
    </svg>
  );
}

// A group of identical components with an arrow (▲) pointing up at them and a name below.
function LabeledGroup({ label, count, kind }: { label: string; count: number; kind: "socket" | "switch" }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (kind === "socket" ? <SocketIcon key={i} /> : <SwitchIcon key={i} />))}
      </div>
      <span className="text-[10px] leading-none text-accent">▲</span>
      <span className="text-[10px] font-semibold text-foreground">{count} × {label}</span>
    </div>
  );
}

export function SocketSwitchDiagram({
  title, sockets, switches, units,
}: { title: string; sockets: number; switches: number; units: number }) {
  const perUnit = `${sockets} socket${sockets > 1 ? "s" : ""} + ${switches} switch${switches > 1 ? "es" : ""}`;
  const note = units > 1
    ? `each · ${units} = ${sockets * units} sockets + ${switches * units} switches`
    : perUnit;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          {title} <span className="font-normal text-muted-foreground">— {perUnit}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">{note}</span>
      </div>
      <div className="flex items-end justify-center gap-5 py-1">
        <LabeledGroup label="Socket" count={sockets} kind="socket" />
        <LabeledGroup label="Switch" count={switches} kind="switch" />
      </div>
    </div>
  );
}
