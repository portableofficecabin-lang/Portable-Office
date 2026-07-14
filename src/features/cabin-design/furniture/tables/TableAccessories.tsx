"use client";

/**
 * Table module — STORAGE & ACCESSORIES (spec §8).
 *
 * THE ONE TRAP IN THIS PANEL. Two of the catalogue's accessories — the power manager and the pop-up
 * socket box — are also electrical points (§21). The model deliberately keeps their quantity in
 * `t.electrical` and NOT in `t.accessories` (see ELECTRICAL_ACCESSORY_IDS): one physical power
 * manager stored in two places is how a BOQ ends up billing five of them when the customer asked
 * for four, and `clampTable()` actively strips them out of `accessories` on every edit — so an
 * accessory row that wrote there would be silently deleted a millisecond later, and the customer
 * would watch their toggle flick back off.
 *
 * They are still SHOWN here, because "where is the power manager?" is answered by looking at the
 * accessories list. They are simply bound to `t.electrical[…]`, and the panel says so.
 */

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PARTITION_KEYS, TABLETOP_MATERIAL_KEYS } from "@/lib/boq/furnitureMaterials";
import type { Material, MaterialIndex } from "@/lib/boq/types";
import { cn } from "@/lib/utils";

import { IntStepper, PanelSection, UnitField } from "./tableFields";
import { accessoryState, makeAccessory } from "./tableDefaults";
import type { CabinTable, TableAccessory } from "./tableSchema";
import {
  ACCESSORY_GROUPS,
  ELECTRICAL_ACCESSORY_FIELD,
  ELECTRICAL_ACCESSORY_IDS,
  type AccessoryDef,
} from "./tableTypes";
import type { TableUnit } from "./tableUnits";

const POSITIONS: TableAccessory["position"][] = [
  "left",
  "right",
  "front",
  "rear",
  "under",
  "on-top",
];

const POSITION_LABEL: Record<string, string> = {
  left: "Left of the table",
  right: "Right of the table",
  front: "In front",
  rear: "Behind",
  under: "Under the top",
  "on-top": "On the top",
};

/** Accessory dimensions are ancillary — they only have to be sane, so they are bounded here. */
const ACC_MIN_MM = 20;
const ACC_MAX_MM = 3000;

export interface TableAccessoriesProps {
  table: CabinTable;
  unit: TableUnit;
  materials: MaterialIndex;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

/** Which Material Master keys this accessory may sensibly be made of. A drawer unit can be any
 *  board; a castor cannot — offering the whole master everywhere would be a menu, not a choice. */
function materialChoices(def: AccessoryDef, current?: string): string[] {
  const base =
    def.group === "Screens"
      ? [def.materialKey, ...Object.values(PARTITION_KEYS), ...TABLETOP_MATERIAL_KEYS]
      : def.group === "Storage"
        ? [def.materialKey, ...TABLETOP_MATERIAL_KEYS]
        : [def.materialKey];
  const all = current ? [current, ...base] : base;
  return Array.from(new Set(all));
}

const nameOf = (materials: MaterialIndex, key: string): string => {
  const m: Material | undefined = materials[key];
  if (!m) return key;
  return m.thicknessMm ? `${m.name} · ${m.thicknessMm} mm` : m.name;
};

export function TableAccessories({
  table: t,
  unit,
  materials,
  onPatch,
  onSeal,
}: TableAccessoriesProps) {
  const rows = React.useMemo(() => accessoryState(t), [t]);
  const mergeKey = `acc:${t.id}`;

  const setAccessories = (next: TableAccessory[], label: string) =>
    onPatch({ accessories: next }, label, mergeKey);

  const patchAccessory = (id: string, patch: Partial<TableAccessory>, label: string) =>
    setAccessories(
      t.accessories.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      label,
    );

  const toggle = (def: AccessoryDef, fitted: TableAccessory | null, on: boolean) => {
    if (!on) {
      setAccessories(
        t.accessories.filter((a) => a.id !== fitted?.id),
        `Remove ${def.label}`,
      );
      onSeal();
      return;
    }
    const made = makeAccessory(def.id);
    if (!made) return;
    setAccessories([...t.accessories, made], `Add ${def.label}`);
    onSeal();
  };

  /* Power manager / pop-up socket: the switch and the stepper write to `electrical`. */
  const electricalQty = (id: string): number => {
    const field = ELECTRICAL_ACCESSORY_FIELD[id];
    return field ? t.electrical[field] : 0;
  };

  const setElectricalQty = (def: AccessoryDef, qty: number) => {
    const field = ELECTRICAL_ACCESSORY_FIELD[def.id];
    if (!field) return;
    onPatch(
      { electrical: { ...t.electrical, [field]: Math.max(0, Math.round(qty)) } },
      qty > 0 ? `${def.label} × ${qty}` : `Remove ${def.label}`,
      mergeKey,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {ACCESSORY_GROUPS.map((group) => {
        const groupRows = rows.filter((r) => r.def.group === group);
        if (!groupRows.length) return null;

        return (
          <PanelSection key={group} title={group}>
            <div className="flex flex-col gap-1.5">
              {groupRows.map(({ def, fitted }) => {
                const isElectrical = ELECTRICAL_ACCESSORY_IDS.has(def.id);
                const qty = isElectrical ? electricalQty(def.id) : (fitted?.quantity ?? 0);
                const on = isElectrical ? qty > 0 : !!fitted;

                return (
                  <div
                    key={def.id}
                    className={cn(
                      "rounded-lg border bg-background p-2.5",
                      on ? "border-primary/40" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-medium text-foreground">
                            {def.label}
                          </span>
                          {isElectrical ? (
                            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[9px]">
                              Electrical
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {isElectrical
                            ? "Counted once, in the Electrical panel."
                            : `${def.lengthMm} × ${def.depthMm} × ${def.heightMm} mm`}
                        </span>
                      </span>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) =>
                          isElectrical ? setElectricalQty(def, v ? 1 : 0) : toggle(def, fitted, v)
                        }
                        aria-label={def.label}
                      />
                    </div>

                    {on && isElectrical ? (
                      <div className="mt-2 border-t border-border/60 pt-2">
                        <IntStepper
                          label="Quantity"
                          value={qty}
                          onCommit={(v) => setElectricalQty(def, v)}
                          onSeal={onSeal}
                          min={0}
                          max={10}
                        />
                      </div>
                    ) : null}

                    {on && !isElectrical && fitted ? (
                      <div className="mt-2 grid grid-cols-2 gap-2.5 border-t border-border/60 pt-2">
                        <IntStepper
                          label="Quantity"
                          value={fitted.quantity}
                          onCommit={(v) => patchAccessory(fitted.id, { quantity: v }, `${def.label} qty`)}
                          onSeal={onSeal}
                          min={1}
                          max={20}
                        />

                        <div className="flex flex-col gap-1">
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                            Position
                          </span>
                          <Select
                            value={fitted.position ?? def.position}
                            onValueChange={(v) =>
                              patchAccessory(
                                fitted.id,
                                { position: v as TableAccessory["position"] },
                                `${def.label} position`,
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]" aria-label={`${def.label} position`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {POSITIONS.map((p) => (
                                <SelectItem key={p} value={p as string} className="text-[12px]">
                                  {POSITION_LABEL[p as string]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <UnitField
                          label="Length"
                          mm={fitted.lengthMm ?? def.lengthMm}
                          onCommit={(mm) => patchAccessory(fitted.id, { lengthMm: mm }, `${def.label} length`)}
                          onSeal={onSeal}
                          unit={unit}
                          minMm={ACC_MIN_MM}
                          maxMm={ACC_MAX_MM}
                        />
                        <UnitField
                          label="Depth"
                          mm={fitted.depthMm ?? def.depthMm}
                          onCommit={(mm) => patchAccessory(fitted.id, { depthMm: mm }, `${def.label} depth`)}
                          onSeal={onSeal}
                          unit={unit}
                          minMm={ACC_MIN_MM}
                          maxMm={ACC_MAX_MM}
                        />
                        <UnitField
                          label="Height"
                          mm={fitted.heightMm ?? def.heightMm}
                          onCommit={(mm) => patchAccessory(fitted.id, { heightMm: mm }, `${def.label} height`)}
                          onSeal={onSeal}
                          unit={unit}
                          minMm={ACC_MIN_MM}
                          maxMm={ACC_MAX_MM}
                        />

                        <div className="flex flex-col gap-1">
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                            Material
                          </span>
                          <Select
                            value={fitted.materialKey ?? def.materialKey}
                            onValueChange={(v) =>
                              patchAccessory(fitted.id, { materialKey: v }, `${def.label} material`)
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]" aria-label={`${def.label} material`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {materialChoices(def, fitted.materialKey).map((k) => (
                                <SelectItem key={k} value={k} className="text-[12px]">
                                  {nameOf(materials, k)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <label className="col-span-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                          <span className="text-[11px] font-medium text-foreground">Show in drawing</span>
                          <Switch
                            checked={fitted.showInDrawing}
                            onCheckedChange={(v) => {
                              patchAccessory(fitted.id, { showInDrawing: v }, `${def.label} in drawing`);
                              onSeal();
                            }}
                            aria-label={`Show ${def.label} in drawing`}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </PanelSection>
        );
      })}
    </div>
  );
}
