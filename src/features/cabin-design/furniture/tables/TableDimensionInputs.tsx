"use client";

/**
 * Table module — DIMENSIONS (spec §4).
 *
 * Renders only the fields the CURRENT SHAPE actually has. A circle has no depth (it has a
 * diameter), a rectangle has no U-arms, and a table that is not a trapezoid has no short parallel
 * side — showing those boxes greyed out would be a menu of things the customer cannot have. The
 * shape predicates (`isRoundish` / `hasReturn` / `hasUShape` / `hasStem`) are the SAME ones
 * tableGeometry uses to decide which polygons to build, so a field is on screen exactly when it
 * moves the drawing.
 *
 * Every bound comes from LIMITS. Nothing is validated twice: `clampTable()` is what actually
 * enforces the range (it is the only writer), and the inline message here is the courtesy that
 * tells the customer WHY the number they typed jumped — spec §4's "never allow zero, negative or
 * unrealistic values" is a model guarantee, not a UI one.
 */

import React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { PanelSection, UnitField } from "./tableFields";
import { LIMITS } from "./tableDefaults";
import type { CabinTable, TableDimensions } from "./tableSchema";
import { hasReturn, hasStem, hasUShape, isRoundish } from "./tableTypes";
import type { TableUnit } from "./tableUnits";

/**
 * Bounds for the fields LIMITS does not name. These are ancillary parts (a cable tray, a side
 * storage box) whose size cannot make a table unbuildable — they only have to be sane, so they are
 * bounded here rather than promoted into the model's LIMITS, which is reserved for the dimensions
 * the joiner actually cuts to.
 */
const SOFT = {
  cableTrayLengthMm: { min: 200, max: 4000 },
  cableTrayWidthMm: { min: 50, max: 400 },
  sideStorageLengthMm: { min: 300, max: 2400 },
  sideStorageWidthMm: { min: 200, max: 900 },
  sideStorageHeightMm: { min: 300, max: 1200 },
} as const;

export interface TableDimensionInputsProps {
  table: CabinTable;
  unit: TableUnit;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

export function TableDimensionInputs({ table: t, unit, onPatch, onSeal }: TableDimensionInputsProps) {
  const d = t.dimensions;
  const shape = t.shape;
  /* Hoisted so the narrowing survives into the onCommit closures — a `const` narrows through a
   * callback where a property access does not. */
  const ret = t.returnSection;
  const uArms = t.uShape;

  /* One mergeKey for the whole dimension gesture: retyping length, then depth, then height inside
   * the merge window is ONE undo step ("Dimensions"), which is what a customer means by "undo that
   * resize" (spec §27, §29). */
  const mergeKey = `dim:${t.id}`;

  const setDim = (patch: Partial<TableDimensions>, label: string) =>
    onPatch({ dimensions: { ...d, ...patch } }, label, mergeKey);

  const round = shape === "circle";
  const square = shape === "square";

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Top">
        <div className="grid grid-cols-2 gap-2.5">
          {round ? (
            /* A circle is driven by ONE number. clampTable derives length = depth = 2r from the
             * radius, so the diameter is written to the radius — writing it to `lengthMm` would be
             * silently discarded the moment radiusMm disagreed. */
            <UnitField
              label="Diameter"
              mm={(d.radiusMm ?? d.lengthMm / 2) * 2}
              onCommit={(mm) =>
                setDim({ radiusMm: mm / 2, lengthMm: mm, depthMm: mm }, "Diameter")
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.radiusMm.min * 2}
              maxMm={LIMITS.radiusMm.max * 2}
              className="col-span-2"
            />
          ) : (
            <>
              <UnitField
                label={square ? "Side" : "Overall length"}
                mm={d.lengthMm}
                onCommit={(mm) => setDim({ lengthMm: mm }, "Length")}
                onSeal={onSeal}
                unit={unit}
                minMm={LIMITS.lengthMm.min}
                maxMm={LIMITS.lengthMm.max}
                className={square ? "col-span-2" : undefined}
                hint={square ? "A square keeps both sides equal." : undefined}
              />
              {!square ? (
                <UnitField
                  label="Depth"
                  mm={d.depthMm}
                  onCommit={(mm) => setDim({ depthMm: mm }, "Depth")}
                  onSeal={onSeal}
                  unit={unit}
                  minMm={LIMITS.depthMm.min}
                  maxMm={LIMITS.depthMm.max}
                />
              ) : null}
            </>
          )}

          <UnitField
            label="Height"
            mm={d.heightMm}
            onCommit={(mm) => setDim({ heightMm: mm }, "Height")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.heightMm.min}
            maxMm={LIMITS.heightMm.max}
            disabled={!!t.reception}
            hint={t.reception ? "Set by the visitor counter height." : undefined}
          />

          <UnitField
            label="Top thickness"
            mm={d.topThicknessMm}
            onCommit={(mm) => setDim({ topThicknessMm: mm }, "Top thickness")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.topThicknessMm.min}
            maxMm={LIMITS.topThicknessMm.max}
          />

          <UnitField
            label="Edge band thickness"
            mm={d.edgeBandThicknessMm}
            onCommit={(mm) => setDim({ edgeBandThicknessMm: mm }, "Edge band thickness")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.edgeBandThicknessMm.min}
            maxMm={LIMITS.edgeBandThicknessMm.max}
          />

          {isRoundish(shape) && !round ? (
            <UnitField
              label="Front / corner radius"
              mm={d.radiusMm ?? d.depthMm / 2}
              onCommit={(mm) => setDim({ radiusMm: mm }, "Radius")}
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.radiusMm.min}
              maxMm={LIMITS.radiusMm.max}
            />
          ) : null}

          {shape === "trapezoid" ? (
            <UnitField
              label="Short parallel side"
              mm={d.secondaryMm ?? Math.round(d.lengthMm * 0.6)}
              onCommit={(mm) => setDim({ secondaryMm: mm }, "Short side")}
              onSeal={onSeal}
              unit={unit}
              minMm={100}
              maxMm={Math.max(100, d.lengthMm - 50)}
              hint="Must stay shorter than the long side."
            />
          ) : null}
        </div>
      </PanelSection>

      {/* ---------------- L / corner return ---------------- */}
      {hasReturn(shape) && ret ? (
        <PanelSection title="Return" note="The side run of the L">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Side</span>
              <Select
                value={ret.side}
                onValueChange={(v) =>
                  onPatch({ returnSection: { ...ret, side: v as "left" | "right" } }, "Return side")
                }
              >
                <SelectTrigger className="h-8 text-[12px]" aria-label="Return side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left" className="text-[12px]">Left</SelectItem>
                  <SelectItem value="right" className="text-[12px]">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <UnitField
              label="Return length"
              mm={ret.lengthMm}
              onCommit={(mm) =>
                onPatch({ returnSection: { ...ret, lengthMm: mm } }, "Return length", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnLengthMm.min}
              maxMm={LIMITS.returnLengthMm.max}
            />
            <UnitField
              label="Return depth"
              mm={ret.depthMm}
              onCommit={(mm) =>
                onPatch({ returnSection: { ...ret, depthMm: mm } }, "Return depth", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnDepthMm.min}
              maxMm={LIMITS.returnDepthMm.max}
            />
          </div>
        </PanelSection>
      ) : null}

      {/* ---------------- T stem ----------------
          A T-shape stores its stem in `returnSection` (same two numbers, different geometry), so
          the fields are the same but the SIDE is meaningless — the stem is always central. */}
      {hasStem(shape) && ret ? (
        <PanelSection title="Stem" note="The centre run of the T">
          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label="Stem length"
              mm={ret.lengthMm}
              onCommit={(mm) =>
                onPatch({ returnSection: { ...ret, lengthMm: mm } }, "Stem length", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnLengthMm.min}
              maxMm={LIMITS.returnLengthMm.max}
            />
            <UnitField
              label="Stem depth"
              mm={ret.depthMm}
              onCommit={(mm) =>
                onPatch({ returnSection: { ...ret, depthMm: mm } }, "Stem depth", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnDepthMm.min}
              maxMm={LIMITS.returnDepthMm.max}
            />
          </div>
        </PanelSection>
      ) : null}

      {/* ---------------- U arms ---------------- */}
      {hasUShape(shape) && uArms ? (
        <PanelSection title="U arms">
          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label="Left arm length"
              mm={uArms.leftLengthMm}
              onCommit={(mm) =>
                onPatch({ uShape: { ...uArms, leftLengthMm: mm } }, "Left arm length", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnLengthMm.min}
              maxMm={LIMITS.returnLengthMm.max}
            />
            <UnitField
              label="Left arm depth"
              mm={uArms.leftDepthMm}
              onCommit={(mm) =>
                onPatch({ uShape: { ...uArms, leftDepthMm: mm } }, "Left arm depth", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnDepthMm.min}
              maxMm={LIMITS.returnDepthMm.max}
            />
            <UnitField
              label="Right arm length"
              mm={uArms.rightLengthMm}
              onCommit={(mm) =>
                onPatch({ uShape: { ...uArms, rightLengthMm: mm } }, "Right arm length", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnLengthMm.min}
              maxMm={LIMITS.returnLengthMm.max}
            />
            <UnitField
              label="Right arm depth"
              mm={uArms.rightDepthMm}
              onCommit={(mm) =>
                onPatch({ uShape: { ...uArms, rightDepthMm: mm } }, "Right arm depth", mergeKey)
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.returnDepthMm.min}
              maxMm={LIMITS.returnDepthMm.max}
            />
          </div>
        </PanelSection>
      ) : null}

      {/* ---------------- Legs & panels ---------------- */}
      <PanelSection title="Legs & panels">
        <div className="grid grid-cols-2 gap-2.5">
          <UnitField
            label="Leg height"
            mm={d.legHeightMm ?? d.heightMm - d.topThicknessMm}
            onCommit={(mm) => setDim({ legHeightMm: mm }, "Leg height")}
            onSeal={onSeal}
            unit={unit}
            minMm={100}
            maxMm={Math.max(100, d.heightMm - d.topThicknessMm)}
            hint="Stops under the top."
          />
          <UnitField
            label="Leg width"
            mm={d.legWidthMm ?? 50}
            onCommit={(mm) => setDim({ legWidthMm: mm }, "Leg width")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.legWidthMm.min}
            maxMm={LIMITS.legWidthMm.max}
          />
          <UnitField
            label="Modesty panel height"
            mm={d.modestyPanelHeightMm ?? 400}
            onCommit={(mm) => setDim({ modestyPanelHeightMm: mm }, "Modesty panel height")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.modestyPanelHeightMm.min}
            maxMm={Math.min(LIMITS.modestyPanelHeightMm.max, Math.max(LIMITS.modestyPanelHeightMm.min, d.heightMm - 200))}
            className="col-span-2"
          />
        </div>
      </PanelSection>

      {/* ---------------- Cable tray & side storage ---------------- */}
      <PanelSection title="Cable tray & side storage">
        <div className="grid grid-cols-2 gap-2.5">
          <UnitField
            label="Cable tray length"
            mm={d.cableTrayLengthMm ?? Math.round(d.lengthMm * 0.8)}
            onCommit={(mm) => setDim({ cableTrayLengthMm: mm }, "Cable tray length")}
            onSeal={onSeal}
            unit={unit}
            minMm={SOFT.cableTrayLengthMm.min}
            maxMm={SOFT.cableTrayLengthMm.max}
          />
          <UnitField
            label="Cable tray width"
            mm={d.cableTrayWidthMm ?? 100}
            onCommit={(mm) => setDim({ cableTrayWidthMm: mm }, "Cable tray width")}
            onSeal={onSeal}
            unit={unit}
            minMm={SOFT.cableTrayWidthMm.min}
            maxMm={SOFT.cableTrayWidthMm.max}
          />
          <UnitField
            label="Side storage length"
            mm={d.sideStorageLengthMm ?? 900}
            onCommit={(mm) => setDim({ sideStorageLengthMm: mm }, "Side storage length")}
            onSeal={onSeal}
            unit={unit}
            minMm={SOFT.sideStorageLengthMm.min}
            maxMm={SOFT.sideStorageLengthMm.max}
          />
          <UnitField
            label="Side storage width"
            mm={d.sideStorageWidthMm ?? 450}
            onCommit={(mm) => setDim({ sideStorageWidthMm: mm }, "Side storage width")}
            onSeal={onSeal}
            unit={unit}
            minMm={SOFT.sideStorageWidthMm.min}
            maxMm={SOFT.sideStorageWidthMm.max}
          />
          <UnitField
            label="Side storage height"
            mm={d.sideStorageHeightMm ?? 650}
            onCommit={(mm) => setDim({ sideStorageHeightMm: mm }, "Side storage height")}
            onSeal={onSeal}
            unit={unit}
            minMm={SOFT.sideStorageHeightMm.min}
            maxMm={SOFT.sideStorageHeightMm.max}
            className="col-span-2"
          />
        </div>
      </PanelSection>
    </div>
  );
}
