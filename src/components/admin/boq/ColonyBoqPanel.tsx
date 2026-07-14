"use client";

/**
 * The Labour Colony calculator's Material BOQ tab.
 *
 * LIVE RECALCULATION (spec §7): `result` is the memoised output of calculateLabourColony(config) in
 * LabourColonyQuotation — the SAME object buildRoomFloorPlan() and buildElevation() feed the room
 * floor plan, the four elevations and the construction drawing from. colonyTakeoff re-reads that same
 * geometry, so the BOQ counts the very columns, walls, openings, verandas and staircases the drawings
 * draw. Change a room size, a floor count, a door, a veranda or a staircase and every quantity below
 * re-derives. Nothing is entered twice.
 *
 * The plinth height comes from the CIVIL result, so a column's lift is measured from the finished
 * plinth top rather than from grade — the same datum the elevations use.
 */

import { useMemo } from "react";

import { buildColonyTakeoff } from "@/lib/boq/colonyTakeoff";
import { defaultBoqSettings, type BoqResult, type BoqSettings } from "@/lib/boq/types";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";

import BoqPanel from "./BoqPanel";

export interface ColonyBoqPanelProps {
  result: LabourColonyResult;
  title: string;
  settings?: BoqSettings;
  onSettingsChange: (s: BoqSettings) => void;
  /** Finished plinth height (m) from the civil engine; the column lift is measured from its top. */
  plinthM?: number;
  onResult?: (r: BoqResult) => void;
}

export default function ColonyBoqPanel({
  result,
  title,
  settings,
  onSettingsChange,
  plinthM,
  onResult,
}: ColonyBoqPanelProps) {
  const live = useMemo(() => settings ?? defaultBoqSettings("labour_colony"), [settings]);

  const takeoff = useMemo(
    () => buildColonyTakeoff(result, live.norms, { plinthM }),
    [result, live.norms, plinthM],
  );

  return (
    <BoqPanel
      takeoff={takeoff}
      settings={live}
      onSettingsChange={onSettingsChange}
      title={title}
      defaultTemplateKind="labour_colony"
      onResult={onResult}
    />
  );
}
