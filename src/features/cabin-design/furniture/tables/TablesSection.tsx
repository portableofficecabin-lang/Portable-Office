"use client";

/**
 * Table module — FURNITURE ▸ TABLES (spec §1, §11, §16, §27, §28).
 *
 * The section owns the CUSTOMER's view of the table layout: add, list, edit, arrange, undo. It owns
 * no state of its own beyond "which dialog is open" — the tables live in the CabinConfig above it,
 * the history lives in useTableHistory, and the collisions and prices arrive as props, computed once
 * for the whole layout. That is deliberate (spec §29): a section that recomputed pricing to render a
 * total would recompute it on every keystroke of every dimension in every table.
 *
 * TWO THINGS WORTH KNOWING
 *
 *  1. ADDING A TABLE NEVER DROPS IT ON SOMETHING. A new table is seeded at the cabin's centre and
 *     then walked to the nearest clean spot by `findFreeSpot()`. Adding the fourth desk to a small
 *     cabin therefore produces a fourth desk you can see, not a fourth desk hidden underneath the
 *     third one with a red border. There is NO cap on the count — the customer decides how many
 *     tables their office has.
 *
 *  2. RESPONSIVE (spec §28). On desktop the editor is a side panel next to the list. On a phone it
 *     is a bottom SHEET, because the whole point of editing a table is watching the plan redraw as
 *     you do it — an editor that covered the drawing would make the customer edit blind.
 */

import { LayoutGrid, Plus, Redo2, TriangleAlert, Undo2 } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { formatINR } from "@/components/home/cabin-calculator/pricing";
import type { MaterialIndex } from "@/lib/boq/types";
import { cn } from "@/lib/utils";

import { AutoArrangeDialog } from "./AutoArrangeDialog";
import { TableEditor } from "./TableEditor";
import { TableList } from "./TableList";
import { cabinSizeMm } from "./cabinObstacles";
import { buildContext, conflictingIds, findFreeSpot } from "./tableCollision";
import { clampTable, createTable } from "./tableDefaults";
import { defaultMaterialIndex, type TableCost } from "./tablePricing";
import { tableRef } from "./tableSchedule";
import type { CabinTable, ClearanceRules, TableIssue } from "./tableSchema";
import { findTableType, TABLE_TYPE_GROUPS, TABLE_TYPES } from "./tableTypes";
import { TABLE_UNITS, type TableUnit } from "./tableUnits";

export interface TablesSectionProps {
  config: CabinConfig;
  tables: CabinTable[];
  /** Routes to useTableHistory.commit — `mergeKey` coalesces a gesture into one undo entry. */
  onChange: (next: CabinTable[], label: string, mergeKey?: string) => void;
  /** Routes to useTableHistory.seal. */
  onSeal: () => void;
  history: {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    undoLabel: string | null;
    redoLabel: string | null;
  };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  clearances: ClearanceRules;
  /** Live collision / validation issues for the whole layout. */
  issues: TableIssue[];
  /** Live per-table costs. */
  costs: TableCost[];
  unit: TableUnit;
  onUnitChange: (u: TableUnit) => void;
  /**
   * The live Material Master. OPTIONAL: the pure `defaultMaterialIndex()` (seed rates, no Supabase)
   * is used until the master loads, so the calculator prices a table on first paint instead of
   * showing ₹0 while a fetch resolves.
   */
  materials?: MaterialIndex;
}

export function TablesSection({
  config,
  tables,
  onChange,
  onSeal,
  history,
  selectedId,
  onSelect,
  clearances,
  issues,
  costs,
  unit,
  onUnitChange,
  materials,
}: TablesSectionProps) {
  const isMobile = useIsMobile();
  const [arrangeOpen, setArrangeOpen] = React.useState(false);

  const fallbackMaterials = React.useMemo(() => defaultMaterialIndex(), []);
  const materialIndex = materials ?? fallbackMaterials;

  const selected = React.useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId],
  );

  const conflictIds = React.useMemo(() => conflictingIds(issues), [issues]);

  /* Errors first: a warning is advice, an error is a design that cannot be built. */
  const sortedIssues = React.useMemo(
    () =>
      [...issues].sort((a, b) =>
        a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
      ),
    [issues],
  );

  const issuesFor = React.useCallback(
    (id: string) => issues.filter((i) => i.tableId === id),
    [issues],
  );

  const summary = React.useMemo(() => {
    const seats = tables.reduce((s, t) => s + t.seating.capacity * t.quantity, 0);
    const units = tables.reduce((s, t) => s + t.quantity, 0);
    const total = costs.reduce((s, c) => s + c.totalAmount, 0);
    const weight = costs.reduce((s, c) => s + c.weightKg, 0);
    return { seats, units, total, weight };
  }, [tables, costs]);

  const handleAdd = React.useCallback(
    (typeId: string) => {
      /* Seed at the cabin's centre, then walk to the nearest clean spot — a new table must never
       * arrive already in collision (spec §14). The context is built from the LIVE list, so the
       * fourth desk avoids the three that are on screen, not the three the parent last synced. */
      const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
      const seeded = createTable(typeId, { existing: tables, xMm: L / 2, yMm: W / 2 });
      const ctx = buildContext({ ...config, tables }, clearances);
      const spot = findFreeSpot(seeded, ctx);
      const placed = clampTable({
        ...seeded,
        position: { ...seeded.position, xMm: spot.xMm, yMm: spot.yMm },
      });

      onChange([...tables, placed], `Add ${findTableType(typeId).label}`);
      onSeal();
      onSelect(placed.id);
    },
    [config, tables, clearances, onChange, onSeal, onSelect],
  );

  const handleApplyArrangement = React.useCallback(
    (next: CabinTable[], label: string) => {
      onChange(next, label);
      onSeal();
    },
    [onChange, onSeal],
  );

  const editor = selected ? (
    <TableEditor
      table={selected}
      tables={tables}
      config={config}
      materials={materialIndex}
      unit={unit}
      issues={issuesFor(selected.id)}
      cost={costs.find((c) => c.tableId === selected.id)}
      onChange={onChange}
      onSeal={onSeal}
    />
  ) : null;

  return (
    <TooltipProvider delayDuration={300}>
      <section className="flex flex-col gap-3">
        {/* ---------------- toolbar ---------------- */}
        <div className="flex flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-8 text-[12px]">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add table
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[60vh] w-64 overflow-y-auto">
              {TABLE_TYPE_GROUPS.map((group, gi) => {
                const types = TABLE_TYPES.filter((t) => t.isActive && t.group === group);
                if (!types.length) return null;
                return (
                  <React.Fragment key={group}>
                    {gi > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {group}
                    </DropdownMenuLabel>
                    {types.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onSelect={() => handleAdd(t.id)}
                        className="text-[12px]"
                      >
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => setArrangeOpen(true)}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
            Auto arrange
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Undo / redo (spec §27) — the label of the action is in the tooltip, so the customer
             *  knows WHAT they are about to undo before they click. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!history.canUndo}
                    onClick={history.undo}
                    aria-label={history.undoLabel ? `Undo ${history.undoLabel}` : "Undo"}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {history.canUndo ? `Undo ${history.undoLabel ?? ""}`.trim() : "Nothing to undo"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!history.canRedo}
                    onClick={history.redo}
                    aria-label={history.redoLabel ? `Redo ${history.redoLabel}` : "Redo"}
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {history.canRedo ? `Redo ${history.redoLabel ?? ""}`.trim() : "Nothing to redo"}
              </TooltipContent>
            </Tooltip>

            <Select value={unit} onValueChange={(v) => onUnitChange(v as TableUnit)}>
              <SelectTrigger className="h-8 w-[112px] text-[12px]" aria-label="Entry unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABLE_UNITS.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-[12px]">
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ---------------- live summary ---------------- */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-2.5 sm:grid-cols-4">
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Tables
            </span>
            <span className="text-[14px] font-semibold text-foreground">
              {tables.length}
              {summary.units !== tables.length ? (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({summary.units} incl. copies)
                </span>
              ) : null}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Seats
            </span>
            <span className="text-[14px] font-semibold text-foreground">{summary.seats}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Weight
            </span>
            <span className="text-[14px] font-semibold text-foreground">
              {Math.round(summary.weight)} kg
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Furniture total
            </span>
            <span className="text-[14px] font-semibold text-foreground">
              {formatINR(summary.total)}
            </span>
          </div>
        </div>

        {/* ---------------- issues (spec §14) ---------------- */}
        {sortedIssues.length ? (
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-2.5">
            <span className="flex items-center gap-1.5">
              <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                {sortedIssues.length} issue{sortedIssues.length === 1 ? "" : "s"}
              </span>
            </span>
            <div className="flex flex-col gap-1">
              {sortedIssues.map((iss, i) => {
                const idx = tables.findIndex((t) => t.id === iss.tableId);
                return (
                  <button
                    key={`${iss.tableId}-${iss.code}-${i}`}
                    type="button"
                    onClick={() => onSelect(iss.tableId)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                      iss.severity === "error"
                        ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                        : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
                    )}
                  >
                    <span className="flex w-full items-center gap-1.5">
                      {idx >= 0 ? (
                        <Badge variant="outline" className="h-4 shrink-0 px-1 font-mono text-[9px]">
                          {tableRef(idx)}
                        </Badge>
                      ) : null}
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[11px] font-medium",
                          iss.severity === "error"
                            ? "text-destructive"
                            : "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {iss.message}
                      </span>
                    </span>
                    {iss.hint ? (
                      <span className="text-[10px] text-muted-foreground">{iss.hint}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ---------------- list + editor ---------------- */}
        <div
          className={cn(
            "grid gap-3",
            !isMobile && selected ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1",
          )}
        >
          <TableList
            tables={tables}
            config={config}
            clearances={clearances}
            costs={costs}
            conflictIds={conflictIds}
            selectedId={selectedId}
            unit={unit}
            onSelect={onSelect}
            onChange={onChange}
            onSeal={onSeal}
          />

          {/* Desktop: a side panel. The plan stays visible beside it. */}
          {!isMobile && selected ? (
            <aside className="flex max-h-[70vh] flex-col overflow-y-auto rounded-xl border border-border bg-card p-3">
              {editor}
            </aside>
          ) : null}
        </div>

        {/* Mobile: a bottom sheet, so the plan is never fully hidden (spec §28). */}
        {isMobile ? (
          <Sheet
            open={!!selected}
            onOpenChange={(open) => {
              if (!open) onSelect(null);
            }}
          >
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="text-sm">{selected?.name ?? "Table"}</SheetTitle>
              </SheetHeader>
              <div className="mt-2">{editor}</div>
            </SheetContent>
          </Sheet>
        ) : null}

        <AutoArrangeDialog
          open={arrangeOpen}
          onOpenChange={setArrangeOpen}
          config={config}
          tables={tables}
          clearances={clearances}
          unit={unit}
          onApply={handleApplyArrangement}
          onSelect={onSelect}
        />
      </section>
    </TooltipProvider>
  );
}
