"use client";

/**
 * Table module — ELECTRICAL (spec §21).
 *
 * The counters are the model's own fields; the LOAD is not. Watts, point count and the suggested
 * MCB come from `tableElectricalLoad()` — the same function the BOQ take-off uses to size the
 * circuit — so the rating the customer reads here is the rating that will be ordered. Recomputing
 * "16 A looks about right" in the UI would be a second opinion, and the two would drift the first
 * time a socket's assumed load changed.
 */

import { Zap } from "lucide-react";
import React from "react";

import { tableElectricalLoad } from "@/lib/boq/tableTakeoff";

import { IntStepper, PanelSection, SwitchField } from "./tableFields";
import type { CabinTable, TableElectrical } from "./tableSchema";

/** The counted fields of TableElectrical — everything except the boolean `cableTray`. */
type NumericPointField = Exclude<keyof TableElectrical, "cableTray">;

/** Every counter, with the clamp `clampTable()` will apply anyway — so the stepper's arrows stop
 *  where the model stops, instead of letting the customer click into a value that snaps back. */
const POINTS: { field: NumericPointField; label: string; max: number }[] = [
  { field: "socket5A", label: "5 A socket", max: 20 },
  { field: "socket6A", label: "6 A socket", max: 20 },
  { field: "socket16A", label: "16 A socket", max: 20 },
  { field: "usbPoints", label: "USB point", max: 20 },
  { field: "dataPoints", label: "Data point", max: 20 },
  { field: "lanPoints", label: "LAN point", max: 20 },
  { field: "hdmiPoints", label: "HDMI point", max: 20 },
  { field: "powerManagerQty", label: "Power manager", max: 10 },
  { field: "popupBoxQty", label: "Pop-up box", max: 10 },
  { field: "floorBoxQty", label: "Floor box", max: 10 },
];

export interface TableElectricalPanelProps {
  table: CabinTable;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

export function TableElectricalPanel({ table: t, onPatch, onSeal }: TableElectricalPanelProps) {
  /* The load depends on nothing but `electrical`, and the panel re-renders on every keystroke in
   * every other tab — so it is memoised on that object alone (spec §29). */
  const load = React.useMemo(() => tableElectricalLoad(t), [t]);
  const mergeKey = `elec:${t.id}`;

  /* `field` is deliberately typed to the NUMERIC keys only — `cableTray` is a boolean and has its
   * own setter, so a stepper can never be pointed at it. */
  const setPoint = (field: NumericPointField, v: number, label: string) =>
    onPatch({ electrical: { ...t.electrical, [field]: v } }, label, mergeKey);

  const setCableTray = (v: boolean) => {
    onPatch({ electrical: { ...t.electrical, cableTray: v } }, "Cable tray", mergeKey);
    onSeal();
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Points">
        <div className="grid grid-cols-2 gap-2.5">
          {POINTS.map(({ field, label, max }) => (
            <IntStepper
              key={field}
              label={label}
              value={t.electrical[field] ?? 0}
              onCommit={(v) => setPoint(field, v, label)}
              onSeal={onSeal}
              min={0}
              max={max}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Cable route">
        <SwitchField
          label="Cable tray under the table"
          hint="The drop to the wall is computed from the table's position."
          checked={t.electrical.cableTray}
          onCheckedChange={setCableTray}
        />
      </PanelSection>

      <PanelSection title="Load" note="Sized by the take-off, not by this panel">
        {load.points === 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
            No electrical points on this table.
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
            <Zap className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="grid flex-1 grid-cols-3 gap-2">
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Points
                </span>
                <span className="text-[13px] font-semibold text-foreground">{load.points}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Load
                </span>
                <span className="text-[13px] font-semibold text-foreground">{load.watts} W</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Suggested MCB
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {load.suggestedMcbA} A
                </span>
              </div>
            </div>
          </div>
        )}
      </PanelSection>
    </div>
  );
}
