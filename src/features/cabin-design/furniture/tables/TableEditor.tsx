"use client";

/**
 * Table module — THE PER-TABLE EDITOR (spec §5–§11, §17–§21).
 *
 * Every control in every panel below funnels through exactly two callbacks:
 *
 *   patch(partial, label, mergeKey)   → clampTable({ ...t, ...partial }, t)
 *   replace(wholeTable, label)        → for the edits the MODEL owns end-to-end
 *                                       (changeMaterial / changeShape / applyPreset /
 *                                        changeTableType), which already clamp themselves
 *
 * Nothing here mutates a CabinTable and nothing here re-derives one. That is the whole discipline:
 * `clampTable(next, prev)` is what demotes a preset to "Custom Size" the moment a dimension moves
 * (spec §5), what keeps a square square, and what stops a 6 mm-thick tabletop reaching the joiner.
 * A panel that "helpfully" fixed up a value on its own would be a second opinion — and the two
 * would disagree the first time the rules changed.
 *
 * The editor computes NO collisions and NO prices (spec §29). Both arrive as props, already
 * computed once for the whole layout by the section above it. Recomputing either per keystroke, per
 * table, is how a calculator starts dropping frames on a phone.
 *
 * An ACCORDION, not tabs: on a 360 px phone this panel is a bottom sheet, and eleven tab triggers
 * would need horizontal scrolling to reach "Position" — a section the customer opens constantly.
 */

import { Sparkles } from "lucide-react";
import React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { formatINR } from "@/components/home/cabin-calculator/pricing";
import type { MaterialIndex } from "@/lib/boq/types";

import { TableAccessories } from "./TableAccessories";
import { TableDimensionInputs } from "./TableDimensionInputs";
import { TableElectricalPanel } from "./TableElectricalPanel";
import { TableMaterialSelector } from "./TableMaterialSelector";
import { TablePositionPanel } from "./TablePositionPanel";
import {
  IntStepper,
  NumField,
  PanelSection,
  SelectField,
  SwitchField,
  TextField,
  UnitField,
} from "./tableFields";
import {
  applyPreset,
  autoSeats,
  changeShape,
  changeTableType,
  clampTable,
  LIMITS,
} from "./tableDefaults";
import type { TableCost } from "./tablePricing";
import type {
  CabinTable,
  TableConference,
  TableIssue,
  TableReception,
  TableShape,
  TableSupport,
  TableWallMount,
  TableWorkstation,
} from "./tableSchema";
import {
  CHAIR_TYPES,
  CUSTOM_PRESET_ID,
  findChair,
  findSupport,
  findTableType,
  PIPE_PROFILES,
  SEATING_CAPACITIES,
  SUPPORT_TYPES,
  TABLE_SHAPES,
  TABLE_TYPE_GROUPS,
  TABLE_TYPES,
} from "./tableTypes";
import type { TableUnit } from "./tableUnits";

const FRAME_FINISHES = ["Powder coated", "Anodised", "Chrome plated", "Painted", "Raw"];

const SIDES: { value: string; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "rear", label: "Rear" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export interface TableEditorProps {
  table: CabinTable;
  /** The whole list — `changeTableType` needs it to name the new table ("Executive Table 2"). */
  tables: CabinTable[];
  config: CabinConfig;
  materials: MaterialIndex;
  unit: TableUnit;
  /** This table's issues, already filtered by the section. */
  issues: TableIssue[];
  cost?: TableCost;
  onChange: (next: CabinTable[], label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

export function TableEditor({
  table: t,
  tables,
  config,
  materials,
  unit,
  issues,
  cost,
  onChange,
  onSeal,
}: TableEditorProps) {
  const def = findTableType(t.tableTypeId);
  const support = findSupport(t.support.supportTypeId);

  /* The two writers. Everything below calls one of these — nothing calls onChange directly. */
  const replace = React.useCallback(
    (next: CabinTable, label: string, mergeKey?: string) =>
      onChange(
        tables.map((x) => (x.id === t.id ? next : x)),
        label,
        mergeKey,
      ),
    [onChange, tables, t.id],
  );

  const patch = React.useCallback(
    (p: Partial<CabinTable>, label: string, mergeKey?: string) =>
      replace(clampTable({ ...t, ...p }, t), label, mergeKey),
    [replace, t],
  );

  const patchSupport = (p: Partial<TableSupport>, label: string) =>
    patch({ support: { ...t.support, ...p } }, label);

  /* Seats are OWNED by the workstation's user count / the conference's seat count — clampTable
   * copies them down into `seating.capacity`. Editing capacity directly for those types would snap
   * straight back, so the field is disabled and points at the panel that does own it. */
  const seatsOwnedBy = t.workstation ? "Workstation" : t.conference ? "Conference" : null;
  const suggested = autoSeats(t);

  /* The type-specific block is OPEN by default: it is the reason the customer chose this type at
   * all — a conference table's seat count matters more to them than its edge band. The Accordion is
   * keyed by the type so that switching type re-applies these defaults instead of leaving the
   * previous type's sections open (and the new type's block collapsed). */
  const defaultOpen = React.useMemo(
    () => ["type", "dimensions", ...(def.panels ?? [])],
    [def],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* ---------------- header ---------------- */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={t.name}
            onChange={(e) => patch({ name: e.target.value }, "Rename", `name:${t.id}`)}
            onBlur={onSeal}
            className="h-8 flex-1 text-[12px] font-medium"
            aria-label="Table name"
          />
          <Badge variant="secondary" className="h-6 shrink-0 px-2 text-[10px]">
            {def.short}
          </Badge>
        </div>

        <div className="flex items-end gap-2">
          <IntStepper
            label="Identical copies"
            value={t.quantity}
            onCommit={(v) => patch({ quantity: v }, "Quantity")}
            onSeal={onSeal}
            min={LIMITS.quantity.min}
            max={LIMITS.quantity.max}
            className="flex-1"
          />
          {cost ? (
            <div className="flex flex-col items-end pb-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t.quantity > 1 ? `${t.quantity} ×` : "Total"}
              </span>
              <span className="text-[13px] font-semibold text-foreground">
                {formatINR(cost.totalAmount)}
              </span>
            </div>
          ) : null}
        </div>

        {issues.length ? (
          <div className="flex flex-col gap-1 border-t border-border/60 pt-1.5">
            {issues.map((iss, i) => (
              <span
                key={`${iss.code}-${i}`}
                className={
                  iss.severity === "error"
                    ? "text-[10px] font-medium text-destructive"
                    : "text-[10px] font-medium text-amber-600 dark:text-amber-400"
                }
              >
                {iss.message}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Accordion
        key={t.tableTypeId}
        type="multiple"
        defaultValue={defaultOpen}
        className="w-full"
      >
        {/* ---------------- type & shape ---------------- */}
        <AccordionItem value="type">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Type & shape</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex flex-col gap-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Table type
                </span>
                {/* A native optgroup select: shadcn's Select has no group primitive wired up here,
                 *  and 24 types need their headings to stay scannable. */}
                <select
                  value={t.tableTypeId}
                  onChange={(e) => replace(changeTableType(t, e.target.value, tables), "Change type")}
                  aria-label="Table type"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TABLE_TYPE_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {TABLE_TYPES.filter((x) => x.isActive && x.group === group).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <SelectField
                label="Shape"
                value={t.shape}
                onValueChange={(v) => replace(changeShape(t, v as TableShape), "Change shape")}
                options={def.shapes.map((s) => {
                  const meta = TABLE_SHAPES.find((x) => x.id === s);
                  return { value: s, label: meta?.label ?? s };
                })}
                hint={TABLE_SHAPES.find((x) => x.id === t.shape)?.note}
              />

              <SelectField
                label="Standard size"
                value={t.presetId}
                onValueChange={(v) =>
                  v === CUSTOM_PRESET_ID
                    ? patch({ presetId: CUSTOM_PRESET_ID }, "Custom size")
                    : replace(applyPreset(t, v), "Standard size")
                }
                options={[
                  ...def.presets.map((p) => ({ value: p.id, label: p.label })),
                  { value: CUSTOM_PRESET_ID, label: "Custom size" },
                ]}
                hint={
                  t.presetId === CUSTOM_PRESET_ID
                    ? "Editing any dimension switches to Custom automatically."
                    : undefined
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- dimensions ---------------- */}
        <AccordionItem value="dimensions">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Dimensions</AccordionTrigger>
          <AccordionContent className="pb-3">
            <TableDimensionInputs table={t} unit={unit} onPatch={patch} onSeal={onSeal} />
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- material ---------------- */}
        <AccordionItem value="material">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Material</AccordionTrigger>
          <AccordionContent className="pb-3">
            <TableMaterialSelector
              table={t}
              unit={unit}
              materials={materials}
              onPatch={patch}
              onReplace={replace}
              onSeal={onSeal}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- support ---------------- */}
        <AccordionItem value="support">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Support & base</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex flex-col gap-2.5">
              <SelectField
                label="Support type"
                value={t.support.supportTypeId}
                onValueChange={(v) => {
                  /* The frame's material follows its KIND: a steel frame is billed as pipe runs, a
                   * panel base as board area. Carrying an old profileKey onto a panel base would
                   * bill a board table for 50 × 50 SHS. */
                  const s = findSupport(v);
                  const steel = s.kind === "steel" || s.kind === "pedestal";
                  patchSupport(
                    {
                      supportTypeId: v,
                      numberOfLegs: s.defaultLegs,
                      profileKey: steel ? s.defaultMaterialKey : undefined,
                      panelMaterialKey: s.kind === "panel" ? s.defaultMaterialKey : undefined,
                    },
                    "Support type",
                  );
                }}
                options={SUPPORT_TYPES.filter((s) => s.isActive).map((s) => ({
                  value: s.id,
                  label: s.label,
                }))}
                hint={support.note}
              />

              {support.kind === "steel" || support.kind === "pedestal" ? (
                <SelectField
                  label="Pipe / profile"
                  value={t.support.profileKey ?? support.defaultMaterialKey}
                  onValueChange={(v) => patchSupport({ profileKey: v }, "Frame profile")}
                  options={PIPE_PROFILES.map((p) => ({ value: p.id, label: p.label }))}
                />
              ) : null}

              <IntStepper
                label="Number of legs"
                value={t.support.numberOfLegs}
                onCommit={(v) => patchSupport({ numberOfLegs: v }, "Legs")}
                onSeal={onSeal}
                min={LIMITS.legs.min}
                max={LIMITS.legs.max}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <SelectField
                  label="Frame finish"
                  value={t.support.frameFinish ?? FRAME_FINISHES[0]}
                  onValueChange={(v) => patchSupport({ frameFinish: v }, "Frame finish")}
                  options={FRAME_FINISHES.map((f) => ({ value: f, label: f }))}
                />
                <TextField
                  label="Powder-coat colour"
                  value={t.support.powderCoatColour ?? ""}
                  onCommit={(v) => patchSupport({ powderCoatColour: v }, "Powder-coat colour")}
                  onSeal={onSeal}
                  placeholder="Black"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <SwitchField
                  label="Adjustable levellers"
                  checked={t.support.levellers}
                  onCheckedChange={(v) => {
                    patchSupport({ levellers: v }, "Levellers");
                    onSeal();
                  }}
                />
                <SwitchField
                  label="Castors / wheels"
                  checked={t.support.castors}
                  onCheckedChange={(v) => {
                    patchSupport({ castors: v }, "Castors");
                    onSeal();
                  }}
                />
                <SwitchField
                  label="Fixed to the floor"
                  checked={t.support.floorFixed}
                  onCheckedChange={(v) => {
                    patchSupport({ floorFixed: v }, "Floor fixing");
                    onSeal();
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- accessories ---------------- */}
        <AccordionItem value="accessories">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">
            Storage & accessories
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <TableAccessories
              table={t}
              unit={unit}
              materials={materials}
              onPatch={patch}
              onSeal={onSeal}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- seating ---------------- */}
        <AccordionItem value="seating">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Seating</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1">
                {SEATING_CAPACITIES.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={t.seating.capacity === n ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-9 px-0 text-[11px]"
                    disabled={!!seatsOwnedBy}
                    onClick={() => {
                      patch({ seating: { ...t.seating, capacity: n } }, "Seating capacity");
                      onSeal();
                    }}
                  >
                    {n}
                  </Button>
                ))}
                {/* §9 — suggest the capacity from the actual top size, for the types that seat
                 *  people all the way round. */}
                {def.seatingModel === "perimeter" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => {
                      patch({ seating: { ...t.seating, capacity: suggested } }, "Suggested seating");
                      onSeal();
                    }}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Suggested: {suggested}
                  </Button>
                ) : null}
              </div>

              <NumField
                label="Seating capacity"
                value={t.seating.capacity}
                onCommit={(v) => patch({ seating: { ...t.seating, capacity: v } }, "Seating capacity")}
                onSeal={onSeal}
                min={LIMITS.seats.min}
                max={LIMITS.seats.max}
                step={1}
                disabled={!!seatsOwnedBy}
                hint={
                  seatsOwnedBy ? `Set by the ${seatsOwnedBy.toLowerCase()} panel below.` : undefined
                }
              />

              <SwitchField
                label="Include chairs in the quote"
                checked={t.seating.includeChairs}
                onCheckedChange={(v) => {
                  patch({ seating: { ...t.seating, includeChairs: v } }, "Include chairs");
                  onSeal();
                }}
              />

              {t.seating.includeChairs ? (
                <SelectField
                  label="Chair type"
                  value={t.seating.chairTypeId ?? CHAIR_TYPES[0].id}
                  onValueChange={(v) => {
                    /* The chair's footprint drives the pull-out clearance and the collision check —
                     * so it moves with the chair, never lags a type behind it. */
                    const c = findChair(v);
                    patch(
                      {
                        seating: {
                          ...t.seating,
                          chairTypeId: v,
                          chairWidthMm: c.widthMm,
                          chairDepthMm: c.depthMm,
                        },
                      },
                      "Chair type",
                    );
                  }}
                  options={CHAIR_TYPES.filter((c) => c.isActive).map((c) => ({
                    value: c.id,
                    label: `${c.label} · ${c.widthMm} × ${c.depthMm} mm`,
                  }))}
                />
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- electrical ---------------- */}
        <AccordionItem value="electrical">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Electrical</AccordionTrigger>
          <AccordionContent className="pb-3">
            <TableElectricalPanel table={t} onPatch={patch} onSeal={onSeal} />
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- position ---------------- */}
        <AccordionItem value="position">
          <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Position</AccordionTrigger>
          <AccordionContent className="pb-3">
            <TablePositionPanel
              table={t}
              config={config}
              unit={unit}
              onPatch={patch}
              onReplace={replace}
              onSeal={onSeal}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ---------------- type-specific blocks ----------------
            Shown ONLY when the type declares the panel AND the model actually carries the block —
            `createTable` seeds them together, so both tests pass or neither does. */}
        {def.panels?.includes("workstation") && t.workstation ? (
          <AccordionItem value="workstation">
            <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Workstation</AccordionTrigger>
            <AccordionContent className="pb-3">
              <WorkstationPanel
                table={t}
                ws={t.workstation}
                unit={unit}
                onPatch={patch}
                onSeal={onSeal}
              />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {def.panels?.includes("conference") && t.conference ? (
          <AccordionItem value="conference">
            <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Conference</AccordionTrigger>
            <AccordionContent className="pb-3">
              <ConferencePanel
                table={t}
                conf={t.conference}
                unit={unit}
                onPatch={patch}
                onSeal={onSeal}
              />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {def.panels?.includes("reception") && t.reception ? (
          <AccordionItem value="reception">
            <AccordionTrigger className="py-2.5 text-[12px] font-semibold">Reception</AccordionTrigger>
            <AccordionContent className="pb-3">
              <ReceptionPanel
                table={t}
                rec={t.reception}
                unit={unit}
                onPatch={patch}
                onSeal={onSeal}
              />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {def.panels?.includes("wallMount") && t.wallMount ? (
          <AccordionItem value="wallMount">
            <AccordionTrigger className="py-2.5 text-[12px] font-semibold">
              Wall mounting
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <WallMountPanel
                table={t}
                wm={t.wallMount}
                unit={unit}
                onPatch={patch}
                onSeal={onSeal}
              />
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  );
}

/* ==========================================================================
 * Type-specific blocks (spec §17–§20)
 * ========================================================================== */

interface BlockProps {
  table: CabinTable;
  unit: TableUnit;
  onPatch: (patch: Partial<CabinTable>, label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

/** Workstation cluster (spec §17). */
function WorkstationPanel({
  table: t,
  ws,
  unit,
  onPatch,
  onSeal,
}: BlockProps & { ws: TableWorkstation }) {
  const mergeKey = `ws:${t.id}`;
  const set = (p: Partial<TableWorkstation>, label: string) =>
    onPatch({ workstation: { ...ws, ...p } }, label, mergeKey);

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Cluster">
        <div className="grid grid-cols-2 gap-2.5">
          <IntStepper
            label="Users"
            value={ws.users}
            onCommit={(v) => set({ users: v }, "Workstation users")}
            onSeal={onSeal}
            min={LIMITS.users.min}
            max={LIMITS.users.max}
          />
          <SelectField
            label="Arrangement"
            value={ws.arrangement}
            onValueChange={(v) =>
              set({ arrangement: v as TableWorkstation["arrangement"] }, "Arrangement")
            }
            options={[
              { value: "linear", label: "Linear" },
              { value: "back-to-back", label: "Back-to-back" },
              { value: "cluster", label: "Cluster" },
              { value: "l-shaped", label: "L-shaped" },
            ]}
          />
          <UnitField
            label="Desk length (per user)"
            mm={ws.deskLengthMm}
            onCommit={(mm) => set({ deskLengthMm: mm }, "Desk length")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.lengthMm.min}
            maxMm={LIMITS.lengthMm.max}
          />
          <UnitField
            label="Desk depth"
            mm={ws.deskDepthMm}
            onCommit={(mm) => set({ deskDepthMm: mm }, "Desk depth")}
            onSeal={onSeal}
            unit={unit}
            minMm={LIMITS.depthMm.min}
            maxMm={LIMITS.depthMm.max}
          />
          <UnitField
            label="Aisle width"
            mm={ws.aisleWidthMm}
            onCommit={(mm) => set({ aisleWidthMm: mm }, "Aisle width")}
            onSeal={onSeal}
            unit={unit}
            minMm={600}
            maxMm={3000}
          />
          <SelectField
            label="Facing"
            value={ws.facing}
            onValueChange={(v) => set({ facing: v as TableWorkstation["facing"] }, "Facing")}
            options={[
              { value: "north", label: "North" },
              { value: "south", label: "South" },
              { value: "east", label: "East" },
              { value: "west", label: "West" },
            ]}
          />
        </div>
      </PanelSection>

      <PanelSection title="Partition screen">
        <div className="grid grid-cols-2 gap-2.5">
          <UnitField
            label="Height"
            mm={ws.partitionHeightMm}
            onCommit={(mm) => set({ partitionHeightMm: mm }, "Partition height")}
            onSeal={onSeal}
            unit={unit}
            minMm={0}
            maxMm={1500}
          />
          <UnitField
            label="Thickness"
            mm={ws.partitionThicknessMm}
            onCommit={(mm) => set({ partitionThicknessMm: mm }, "Partition thickness")}
            onSeal={onSeal}
            unit={unit}
            minMm={5}
            maxMm={80}
          />
          <SelectField
            label="Material"
            value={ws.partitionMaterial}
            onValueChange={(v) =>
              set({ partitionMaterial: v as TableWorkstation["partitionMaterial"] }, "Partition material")
            }
            options={[
              { value: "fabric", label: "Fabric" },
              { value: "glass", label: "Glass" },
              { value: "acrylic", label: "Acrylic" },
              { value: "none", label: "No screen" },
            ]}
            className="col-span-2"
          />
        </div>
      </PanelSection>

      <PanelSection title="Shared services & fittings">
        <div className="flex flex-col gap-1.5">
          <SwitchField
            label="Shared cable tray"
            hint="One tray runs the whole cluster."
            checked={ws.sharedCableTray}
            onCheckedChange={(v) => {
              set({ sharedCableTray: v }, "Shared cable tray");
              onSeal();
            }}
          />
          <SwitchField
            label="Shared power manager"
            checked={ws.sharedPowerManager}
            onCheckedChange={(v) => {
              set({ sharedPowerManager: v }, "Shared power manager");
              onSeal();
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <IntStepper
            label="Pedestals"
            value={ws.pedestalQty}
            onCommit={(v) => set({ pedestalQty: v }, "Pedestals")}
            onSeal={onSeal}
            min={0}
            max={24}
          />
          <IntStepper
            label="CPU holders"
            value={ws.cpuHolderQty}
            onCommit={(v) => set({ cpuHolderQty: v }, "CPU holders")}
            onSeal={onSeal}
            min={0}
            max={24}
          />
          <IntStepper
            label="Chairs"
            value={ws.chairQty}
            onCommit={(v) => set({ chairQty: v }, "Chairs")}
            onSeal={onSeal}
            min={0}
            max={24}
          />
        </div>
      </PanelSection>
    </div>
  );
}

/** Conference / boardroom (spec §18). */
function ConferencePanel({
  table: t,
  conf,
  unit,
  onPatch,
  onSeal,
}: BlockProps & { conf: TableConference }) {
  const mergeKey = `conf:${t.id}`;
  const set = (p: Partial<TableConference>, label: string) =>
    onPatch({ conference: { ...conf, ...p } }, label, mergeKey);

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Seating">
        <div className="grid grid-cols-2 gap-2.5">
          <IntStepper
            label="Seats"
            value={conf.seats}
            onCommit={(v) => set({ seats: v }, "Conference seats")}
            onSeal={onSeal}
            min={0}
            max={LIMITS.seats.max}
          />
          <UnitField
            label="Chair spacing"
            mm={conf.chairSpacingMm}
            onCommit={(mm) => set({ chairSpacingMm: mm }, "Chair spacing")}
            onSeal={onSeal}
            unit={unit}
            minMm={500}
            maxMm={1200}
          />
          <SelectField
            label="Head chairs"
            value={String(conf.headChairs)}
            onValueChange={(v) =>
              set({ headChairs: Number(v) as TableConference["headChairs"] }, "Head chairs")
            }
            options={[
              { value: "0", label: "None" },
              { value: "1", label: "One end" },
              { value: "2", label: "Both ends" },
            ]}
          />
          <SelectField
            label="Display / screen side"
            value={conf.displaySide ?? "front"}
            onValueChange={(v) =>
              set({ displaySide: v as TableConference["displaySide"] }, "Display side")
            }
            options={SIDES}
          />
        </div>
      </PanelSection>

      <PanelSection title="Table build">
        <div className="grid grid-cols-2 gap-2.5">
          <IntStepper
            label="Modular sections"
            value={conf.sections}
            onCommit={(v) => set({ sections: v }, "Sections")}
            onSeal={onSeal}
            min={1}
            max={6}
          />
          <UnitField
            label="Centre gap"
            mm={conf.centreGapMm ?? 0}
            onCommit={(mm) => set({ centreGapMm: mm || undefined }, "Centre gap")}
            onSeal={onSeal}
            unit={unit}
            minMm={0}
            maxMm={1000}
            hint="0 = solid top."
          />
        </div>
      </PanelSection>

      <PanelSection title="Power & AV">
        <div className="grid grid-cols-3 gap-2.5">
          <IntStepper
            label="Power boxes"
            value={conf.powerBoxes}
            onCommit={(v) => set({ powerBoxes: v }, "Power boxes")}
            onSeal={onSeal}
            min={0}
            max={8}
          />
          <IntStepper
            label="Cable openings"
            value={conf.cableOpenings}
            onCommit={(v) => set({ cableOpenings: v }, "Cable openings")}
            onSeal={onSeal}
            min={0}
            max={8}
          />
          <IntStepper
            label="Microphones"
            value={conf.microphonePoints}
            onCommit={(v) => set({ microphonePoints: v }, "Microphone points")}
            onSeal={onSeal}
            min={0}
            max={20}
          />
        </div>
      </PanelSection>
    </div>
  );
}

/** Reception counter (spec §19). */
function ReceptionPanel({
  table: t,
  rec,
  unit,
  onPatch,
  onSeal,
}: BlockProps & { rec: TableReception }) {
  const mergeKey = `rec:${t.id}`;
  const set = (p: Partial<TableReception>, label: string) =>
    onPatch({ reception: { ...rec, ...p } }, label, mergeKey);

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Counter">
        <div className="grid grid-cols-2 gap-2.5">
          <SelectField
            label="Counter style"
            value={rec.counterStyle}
            onValueChange={(v) =>
              set({ counterStyle: v as TableReception["counterStyle"] }, "Counter style")
            }
            options={[
              { value: "straight", label: "Straight" },
              { value: "l-shape", label: "L shape" },
              { value: "u-shape", label: "U shape" },
              { value: "curved", label: "Curved" },
            ]}
          />
          <SelectField
            label="Visitor side"
            value={rec.visitorSide}
            onValueChange={(v) => set({ visitorSide: v as TableReception["visitorSide"] }, "Visitor side")}
            options={SIDES}
          />
          {/* The visitor height IS the table height — clampTable copies it down, so the elevation
           *  and the counter can never disagree. */}
          <UnitField
            label="Visitor counter height"
            mm={rec.visitorCounterHeightMm}
            onCommit={(mm) => set({ visitorCounterHeightMm: mm }, "Visitor counter height")}
            onSeal={onSeal}
            unit={unit}
            minMm={900}
            maxMm={1400}
          />
          <UnitField
            label="Staff counter height"
            mm={rec.staffCounterHeightMm}
            onCommit={(mm) => set({ staffCounterHeightMm: mm }, "Staff counter height")}
            onSeal={onSeal}
            unit={unit}
            minMm={650}
            maxMm={900}
          />
        </div>
      </PanelSection>

      <PanelSection title="Storage & fittings">
        <div className="flex flex-col gap-1.5">
          <SwitchField
            label="Accessible (wheelchair) counter"
            hint="A lowered section for a seated visitor."
            checked={rec.accessibleCounter}
            onCheckedChange={(v) => {
              set({ accessibleCounter: v }, "Accessible counter");
              onSeal();
            }}
          />
          <SwitchField
            label="Under-counter storage"
            checked={rec.underCounterStorage}
            onCheckedChange={(v) => {
              set({ underCounterStorage: v }, "Under-counter storage");
              onSeal();
            }}
          />
          <SwitchField
            label="CPU space"
            checked={rec.cpuSpace}
            onCheckedChange={(v) => {
              set({ cpuSpace: v }, "CPU space");
              onSeal();
            }}
          />
          <SwitchField
            label="Branding panel"
            checked={rec.brandingPanel}
            onCheckedChange={(v) => {
              set({ brandingPanel: v }, "Branding panel");
              onSeal();
            }}
          />
          <SwitchField
            label="LED strip"
            checked={rec.ledStrip}
            onCheckedChange={(v) => {
              set({ ledStrip: v }, "LED strip");
              onSeal();
            }}
          />
        </div>
        <IntStepper
          label="Drawer units"
          value={rec.drawerUnits}
          onCommit={(v) => set({ drawerUnits: v }, "Drawer units")}
          onSeal={onSeal}
          min={0}
          max={6}
        />
      </PanelSection>
    </div>
  );
}

/** Wall-mounted / folding (spec §20). */
function WallMountPanel({
  table: t,
  wm,
  unit,
  onPatch,
  onSeal,
}: BlockProps & { wm: TableWallMount }) {
  const mergeKey = `wm:${t.id}`;
  const set = (p: Partial<TableWallMount>, label: string) =>
    onPatch({ wallMount: { ...wm, ...p } }, label, mergeKey);

  const brackets = SUPPORT_TYPES.filter((s) => s.kind === "bracket" && s.isActive);

  return (
    <div className="flex flex-col gap-4">
      <PanelSection title="Mounting">
        <div className="grid grid-cols-2 gap-2.5">
          <SelectField
            label="Wall"
            value={wm.wall}
            onValueChange={(v) => set({ wall: v as TableWallMount["wall"] }, "Mounting wall")}
            options={SIDES}
          />
          <UnitField
            label="Offset from corner"
            mm={wm.offsetMm}
            onCommit={(mm) => set({ offsetMm: mm }, "Wall offset")}
            onSeal={onSeal}
            unit={unit}
            minMm={0}
            maxMm={12000}
            hint="To the table's near edge."
          />
          <SelectField
            label="Fold direction"
            value={wm.foldDirection}
            onValueChange={(v) =>
              set({ foldDirection: v as TableWallMount["foldDirection"] }, "Fold direction")
            }
            options={[
              { value: "none", label: "Does not fold" },
              { value: "down", label: "Folds down" },
              { value: "up", label: "Folds up" },
            ]}
          />
          <SelectField
            label="Bracket type"
            value={wm.bracketTypeId}
            onValueChange={(v) => set({ bracketTypeId: v }, "Bracket type")}
            options={brackets.map((b) => ({ value: b.id, label: b.label }))}
          />
        </div>
      </PanelSection>

      <PanelSection title="Load">
        <div className="grid grid-cols-2 gap-2.5">
          <IntStepper
            label="Brackets"
            value={wm.bracketQty}
            onCommit={(v) => set({ bracketQty: v }, "Bracket quantity")}
            onSeal={onSeal}
            min={1}
            max={8}
          />
          <NumField
            label="Max load"
            value={wm.maxLoadKg}
            onCommit={(v) => set({ maxLoadKg: v }, "Max load")}
            onSeal={onSeal}
            min={10}
            max={300}
            step={5}
            suffix="kg"
          />
        </div>
        {/* A heavy folding table hung on a stud wall needs a backing plate. The collision/validation
         *  pass raises `wall_reinforcement` for exactly this; the switch is the customer's answer. */}
        <SwitchField
          label="Wall reinforcement behind the table"
          hint="A backing plate spreads the load into the frame."
          checked={wm.wallReinforcement}
          onCheckedChange={(v) => {
            set({ wallReinforcement: v }, "Wall reinforcement");
            onSeal();
          }}
        />
      </PanelSection>
    </div>
  );
}
