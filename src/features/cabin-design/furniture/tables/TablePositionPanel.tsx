"use client";

/**
 * Table module — POSITION (spec §10).
 *
 * The wall distances are DERIVED, never stored: `wallDistances()` measures the rotated bounding box
 * against the cabin, and `setWallDistance()` is its exact inverse. That is what makes the round trip
 * the spec demands actually hold — type 500 into "from left wall" and the table's bbox lands 500 mm
 * from the left wall, whatever its rotation, flips or L-return. A stored offset would have to be
 * re-derived on every rotate, and the first time someone forgot, the number in this panel and the
 * table in the drawing would part company.
 *
 * Every write lands inside the cabin: `clampIntoCabin()` runs last, so a typed 99 999 mm parks the
 * table against the far wall instead of off the page.
 *
 * ORIENTATION has no field of its own in the model, and should not: orientation IS rotation. The
 * segmented control below snaps to 0° / 90°, and reads back from whatever angle the table is at.
 */

import { Lock, RotateCw } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { cn } from "@/lib/utils";

import { cabinSizeMm, roomRangesMm } from "./cabinObstacles";
import { NumField, PanelSection, SwitchField, UnitField } from "./tableFields";
import { clampTable } from "./tableDefaults";
import { clampIntoCabin, setWallDistance, wallDistances } from "./tableGeometry";
import { ROTATION_PRESETS, type CabinTable } from "./tableSchema";
import type { TableUnit } from "./tableUnits";

type Wall = "left" | "right" | "rear" | "front";

const WALLS: { id: Wall; label: string }[] = [
  { id: "left", label: "From left wall" },
  { id: "right", label: "From right wall" },
  { id: "rear", label: "From rear wall" },
  { id: "front", label: "From front wall" },
];

export interface TablePositionPanelProps {
  table: CabinTable;
  config: CabinConfig;
  unit: TableUnit;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  /** For edits routed through the geometry helpers, which return a whole table. */
  onReplace: (next: CabinTable, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

export function TablePositionPanel({
  table: t,
  config,
  unit,
  onPatch,
  onReplace,
  onSeal,
}: TablePositionPanelProps) {
  const { lengthMm: L, widthMm: W } = React.useMemo(() => cabinSizeMm(config), [config]);
  const rooms = React.useMemo(() => roomRangesMm(config), [config]);
  const dist = React.useMemo(() => wallDistances(t, L, W), [t, L, W]);

  const mergeKey = `pos:${t.id}`;
  const locked = t.position.locked;

  /** Every positional write ends the same way: clamp the model, then clamp it into the cabin. */
  const place = (next: CabinTable, label: string) =>
    onReplace(clampIntoCabin(clampTable(next, t), L, W), label, mergeKey);

  const setWall = (wall: Wall, mm: number) =>
    place(setWallDistance(t, wall, mm, L, W), `Distance from ${wall} wall`);

  const setCentre = (axis: "xMm" | "yMm", mm: number) =>
    place({ ...t, position: { ...t.position, [axis]: mm } }, axis === "xMm" ? "Move X" : "Move Y");

  const setRotation = (deg: number) =>
    place({ ...t, position: { ...t.position, rotationDeg: deg } }, "Rotate");

  const rot = t.position.rotationDeg;
  const isPortrait = rot % 180 === 90;

  return (
    <div className="flex flex-col gap-4">
      {locked ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Locked — unlock below to move it. Auto-arrange will leave it alone.
          </span>
        </div>
      ) : null}

      <PanelSection title="Distance from walls" note="Measured to the table's outer edge">
        <div className="grid grid-cols-2 gap-2.5">
          {WALLS.map((w) => (
            <UnitField
              key={w.id}
              label={w.label}
              mm={dist[`${w.id}Mm` as keyof typeof dist]}
              onCommit={(mm) => setWall(w.id, mm)}
              onSeal={onSeal}
              unit={unit}
              disabled={locked}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Centre" note="From the cabin's inner top-left corner">
        <div className="grid grid-cols-2 gap-2.5">
          <UnitField
            label="X (along the length)"
            mm={t.position.xMm}
            onCommit={(mm) => setCentre("xMm", mm)}
            onSeal={onSeal}
            unit={unit}
            disabled={locked}
          />
          <UnitField
            label="Y (across the width)"
            mm={t.position.yMm}
            onCommit={(mm) => setCentre("yMm", mm)}
            onSeal={onSeal}
            unit={unit}
            disabled={locked}
          />
        </div>
      </PanelSection>

      <PanelSection title="Rotation">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {ROTATION_PRESETS.map((deg) => (
              <Button
                key={deg}
                type="button"
                variant={rot === deg ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={locked}
                onClick={() => {
                  setRotation(deg);
                  onSeal();
                }}
              >
                {deg}°
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NumField
              label="Custom angle"
              value={rot}
              onCommit={setRotation}
              onSeal={onSeal}
              min={0}
              max={359}
              step={1}
              suffix="°"
              disabled={locked}
            />
            <div className="flex flex-col gap-1">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Orientation
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={!isPortrait ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 px-2 text-[11px]"
                  disabled={locked}
                  onClick={() => {
                    setRotation(0);
                    onSeal();
                  }}
                >
                  Landscape
                </Button>
                <Button
                  type="button"
                  variant={isPortrait ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 px-2 text-[11px]"
                  disabled={locked}
                  onClick={() => {
                    setRotation(90);
                    onSeal();
                  }}
                >
                  Portrait
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-[11px]"
            disabled={locked}
            onClick={() => {
              setRotation((rot + 90) % 360);
              onSeal();
            }}
          >
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            Rotate 90°
          </Button>
        </div>
      </PanelSection>

      <PanelSection title="Mirror & lock">
        <div className="flex flex-col gap-1.5">
          {/* Flipping is what turns a right-hand L-desk into a left-hand one without retyping the
           *  return — it mirrors the geometry, not the numbers. */}
          <SwitchField
            label="Flip horizontally"
            hint="Mirrors left ↔ right (swaps an L-return's hand)."
            checked={t.position.flipH}
            disabled={locked}
            onCheckedChange={(v) => {
              place({ ...t, position: { ...t.position, flipH: v } }, "Flip horizontally");
              onSeal();
            }}
          />
          <SwitchField
            label="Flip vertically"
            hint="Mirrors front ↔ back."
            checked={t.position.flipV}
            disabled={locked}
            onCheckedChange={(v) => {
              place({ ...t, position: { ...t.position, flipV: v } }, "Flip vertically");
              onSeal();
            }}
          />
          <SwitchField
            label="Lock position"
            hint="Drag and auto-arrange will not move this table."
            checked={locked}
            onCheckedChange={(v) => {
              onPatch({ position: { ...t.position, locked: v } }, v ? "Lock table" : "Unlock table");
              onSeal();
            }}
          />
          <SwitchField
            label="Hide from the drawing"
            hint="Still priced — remove it to take it off the quote."
            checked={t.position.hidden}
            onCheckedChange={(v) => {
              onPatch({ position: { ...t.position, hidden: v } }, v ? "Hide table" : "Show table");
              onSeal();
            }}
          />
        </div>
      </PanelSection>

      {rooms.length > 1 ? (
        <PanelSection title="Room">
          <Select
            value={String(t.position.roomIndex)}
            onValueChange={(v) =>
              onPatch({ position: { ...t.position, roomIndex: Number(v) } }, "Room")
            }
          >
            <SelectTrigger className={cn("h-8 text-[12px]")} aria-label="Room">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.index} value={String(r.index)} className="text-[12px]">
                  Room {r.index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>
      ) : null}
    </div>
  );
}
