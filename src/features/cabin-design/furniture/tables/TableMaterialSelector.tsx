"use client";

/**
 * Table module — MATERIAL (spec §6, §23).
 *
 * Two rules this panel exists to keep:
 *
 *  1. NO RATE IS EVER HARDCODED. The rate, the weight, the section size and the nominal thickness
 *     all come out of the passed-in MaterialIndex — the same index the pricing engine bills from.
 *     The customer sees the rate that WILL be charged, not a number a designer typed into a JSX
 *     file six months ago. A key the master does not know shows "Rate not set" rather than a
 *     plausible lie; `validateTables` raises `missing_material` for the same row.
 *
 *  2. THE THICKNESS FOLLOWS THE BOARD. Changing the top goes through `changeMaterial()`, never
 *     through a plain patch, because 25 mm prelam must not leave an 18 mm top in the dimensions —
 *     the board area, the edge-band height and the elevation all read `topThicknessMm`, and a
 *     quotation that printed "18 mm … Prelaminated Particle Board 25 mm" on one line would be
 *     self-contradicting. The customer can still override the thickness afterwards.
 */

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDGE_BAND_KEYS, TABLETOP_MATERIAL_KEYS } from "@/lib/boq/furnitureMaterials";
import type { Material, MaterialIndex } from "@/lib/boq/types";
import { formatINR } from "@/components/home/cabin-calculator/pricing";

import { NumField, PanelSection, SwitchField, TextField, UnitField } from "./tableFields";
import { changeMaterial, LIMITS } from "./tableDefaults";
import type { CabinTable } from "./tableSchema";
import type { TableUnit } from "./tableUnits";

/** Rate units as the Material Master spells them. A lookup, not an exhaustive Record, so an
 *  admin-added rate unit shows its raw key instead of failing to compile. */
const RATE_UNIT_LABEL: Record<string, string> = {
  per_kg: "kg",
  per_m: "m",
  per_sqm: "m²",
  per_nos: "no.",
  per_ltr: "litre",
  per_sheet: "sheet",
  per_lot: "lot",
};

const WEIGHT_BASIS_LABEL: Record<string, string> = {
  kg_per_m: "kg/m",
  kg_per_sqm: "kg/m²",
  kg_per_nos: "kg each",
};

const SURFACE_FINISHES = ["Matt", "Glossy", "Suede", "Textured", "Wood grain"];

export interface TableMaterialSelectorProps {
  table: CabinTable;
  unit: TableUnit;
  /** The live Material Master. Rates, weights and nominal thicknesses are read from here ONLY. */
  materials: MaterialIndex;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  /** For edits the model owns end-to-end (changeMaterial) — the table arrives already clamped. */
  onReplace: (next: CabinTable, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

/** The rate / weight strip under a material picker — the "why the price moved" line (spec §6). */
function MaterialFacts({ material }: { material: Material | undefined }) {
  if (!material) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
        Not in the Material Master — this line will price at ₹0 until a rate is added.
      </div>
    );
  }

  const rate = material.purchaseRate;
  const rateUnit = RATE_UNIT_LABEL[material.rateUnit] ?? material.rateUnit;
  const weightUnit = WEIGHT_BASIS_LABEL[material.weightBasis] ?? material.weightBasis;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
      <span className="text-[11px] font-semibold text-foreground">
        {rate != null ? `${formatINR(rate)} / ${rateUnit}` : "Rate not set"}
      </span>
      {material.unitWeight != null ? (
        <span className="text-[10px] text-muted-foreground">
          {material.unitWeight} {weightUnit}
        </span>
      ) : null}
      {material.sectionSize ? (
        <span className="text-[10px] text-muted-foreground">· {material.sectionSize}</span>
      ) : null}
      {material.thicknessMm ? (
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
          {material.thicknessMm} mm
        </Badge>
      ) : null}
      {material.grade ? (
        <span className="ml-auto text-[10px] text-muted-foreground">{material.grade}</span>
      ) : null}
    </div>
  );
}

/** "Prelaminated Particle Board 18 mm" — falls back to the raw key so an admin-added board still
 *  shows something a human can pick. */
const nameOf = (materials: MaterialIndex, key: string): string => {
  const m: Material | undefined = materials[key];
  if (!m) return key;
  return m.thicknessMm ? `${m.name} · ${m.thicknessMm} mm` : m.name;
};

export function TableMaterialSelector({
  table: t,
  unit,
  materials,
  onPatch,
  onReplace,
  onSeal,
}: TableMaterialSelectorProps) {
  const m = t.material;
  const topMaterial: Material | undefined = materials[m.materialKey];
  const bandMaterial: Material | undefined = m.edgeBandKey ? materials[m.edgeBandKey] : undefined;
  const mergeKey = `material:${t.id}`;

  /* The chosen key may be an admin-added board that is not in the built-in list — offer it anyway,
   * or the picker would silently reset a design it cannot represent. */
  const topKeys = React.useMemo(
    () =>
      TABLETOP_MATERIAL_KEYS.includes(m.materialKey)
        ? TABLETOP_MATERIAL_KEYS
        : [m.materialKey, ...TABLETOP_MATERIAL_KEYS],
    [m.materialKey],
  );

  const bandKeys = React.useMemo(
    () =>
      !m.edgeBandKey || EDGE_BAND_KEYS.includes(m.edgeBandKey)
        ? EDGE_BAND_KEYS
        : [m.edgeBandKey, ...EDGE_BAND_KEYS],
    [m.edgeBandKey],
  );

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Tabletop">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Top material
            </span>
            <Select
              value={m.materialKey}
              onValueChange={(v) => onReplace(changeMaterial(t, v), "Top material")}
            >
              <SelectTrigger className="h-8 text-[12px]" aria-label="Top material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topKeys.map((k) => (
                  <SelectItem key={k} value={k} className="text-[12px]">
                    {nameOf(materials, k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MaterialFacts material={topMaterial} />

          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label="Thickness"
              mm={t.dimensions.topThicknessMm}
              onCommit={(mm) =>
                onPatch(
                  { dimensions: { ...t.dimensions, topThicknessMm: mm } },
                  "Top thickness",
                  mergeKey,
                )
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.topThicknessMm.min}
              maxMm={LIMITS.topThicknessMm.max}
              hint={
                topMaterial?.thicknessMm
                  ? `Board is nominally ${topMaterial.thicknessMm} mm.`
                  : undefined
              }
            />
            <div className="flex flex-col gap-1">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Surface finish
              </span>
              <Select
                value={m.finish || "Matt"}
                onValueChange={(v) => onPatch({ material: { ...m, finish: v } }, "Surface finish")}
              >
                <SelectTrigger className="h-8 text-[12px]" aria-label="Surface finish">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURFACE_FINISHES.map((f) => (
                    <SelectItem key={f} value={f} className="text-[12px]">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TextField
              label="Top colour"
              value={m.topColour ?? ""}
              onCommit={(v) => onPatch({ material: { ...m, topColour: v } }, "Top colour", mergeKey)}
              onSeal={onSeal}
              placeholder="Light Oak"
            />
            <TextField
              label="Laminate code"
              value={m.laminateKey ?? ""}
              onCommit={(v) =>
                onPatch({ material: { ...m, laminateKey: v || undefined } }, "Laminate", mergeKey)
              }
              onSeal={onSeal}
              placeholder="e.g. 1234 SF"
            />
            <TextField
              label="Brand"
              value={m.brand ?? ""}
              onCommit={(v) => onPatch({ material: { ...m, brand: v } }, "Brand", mergeKey)}
              onSeal={onSeal}
              placeholder="Any"
              className="col-span-2"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Edge band">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Edge band material
            </span>
            <Select
              value={m.edgeBandKey ?? EDGE_BAND_KEYS[0]}
              onValueChange={(v) => onPatch({ material: { ...m, edgeBandKey: v } }, "Edge band")}
            >
              <SelectTrigger className="h-8 text-[12px]" aria-label="Edge band material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bandKeys.map((k) => (
                  <SelectItem key={k} value={k} className="text-[12px]">
                    {nameOf(materials, k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MaterialFacts material={bandMaterial} />

          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label="Band thickness"
              mm={t.dimensions.edgeBandThicknessMm}
              onCommit={(mm) =>
                onPatch(
                  { dimensions: { ...t.dimensions, edgeBandThicknessMm: mm } },
                  "Edge band thickness",
                  mergeKey,
                )
              }
              onSeal={onSeal}
              unit={unit}
              minMm={LIMITS.edgeBandThicknessMm.min}
              maxMm={LIMITS.edgeBandThicknessMm.max}
            />
            <TextField
              label="Band colour"
              value={m.edgeBandColour ?? ""}
              onCommit={(v) =>
                onPatch({ material: { ...m, edgeBandColour: v } }, "Edge band colour", mergeKey)
              }
              onSeal={onSeal}
              placeholder="Matching"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Wastage" note="Applies to the top material only">
        <div className="flex flex-col gap-2">
          {/* Absent ⇒ the Material Master's own wastage % applies. The switch is how the customer
           *  says "cut this granite tight" without inventing a number for every other board. */}
          <SwitchField
            label="Override the standard wastage"
            hint={
              m.wastagePercent == null
                ? `Master default: ${topMaterial?.wastagePercent ?? 0}%`
                : "Your figure is used instead of the master's."
            }
            checked={m.wastagePercent != null}
            onCheckedChange={(on) =>
              onPatch(
                {
                  material: {
                    ...m,
                    wastagePercent: on ? (topMaterial?.wastagePercent ?? 5) : undefined,
                  },
                },
                on ? "Wastage override on" : "Wastage override off",
              )
            }
          />
          {m.wastagePercent != null ? (
            <NumField
              label="Wastage"
              value={m.wastagePercent}
              onCommit={(v) =>
                onPatch({ material: { ...m, wastagePercent: v } }, "Wastage %", mergeKey)
              }
              onSeal={onSeal}
              min={0}
              max={40}
              step={0.5}
              suffix="%"
            />
          ) : null}
        </div>
      </PanelSection>
    </div>
  );
}
