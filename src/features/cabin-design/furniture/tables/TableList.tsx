"use client";

/**
 * Table module — THE TABLE LIST (spec §11).
 *
 * One row per table, with the six actions the spec names. Two of them are not the one-liners they
 * look like:
 *
 *  · DUPLICATE. `duplicateTable()` offsets the copy by 300 mm so it is visibly a copy — but 300 mm
 *    is not a guarantee, it is a nudge: in a tight cabin the copy can still land on a neighbour, a
 *    wall or a door swing. So the copy is run through `resolveOverlap()` against a context built
 *    from the LIVE table list, which walks it to the nearest clean spot. Duplicating never creates
 *    a collision the customer then has to find and fix.
 *
 *  · DELETE. Confirmed, because a table carries a whole configuration — twenty minutes of choices —
 *    and an undo the customer does not know exists is no comfort at the moment they lose it.
 *
 * ROWS ARE MEMOISED (spec §29). The callbacks handed to a row are stable for as long as the table
 * list is (they take the table as an argument rather than closing over it), so selecting a row
 * re-renders exactly two rows — the one leaving the selection and the one taking it — instead of
 * all forty.
 */

import {
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal,
  Lock,
  Pencil,
  RotateCw,
  Trash2,
  Unlock,
} from "lucide-react";
import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { formatINR } from "@/components/home/cabin-calculator/pricing";
import { cn } from "@/lib/utils";

import { buildContext, resolveOverlap } from "./tableCollision";
import { clampTable, duplicateTable } from "./tableDefaults";
import type { TableCost } from "./tablePricing";
import { quotationSize, tableRef } from "./tableSchedule";
import type { CabinTable, ClearanceRules } from "./tableSchema";
import { findTableType } from "./tableTypes";
import { formatMm, type TableUnit } from "./tableUnits";

export interface TableListProps {
  tables: CabinTable[];
  config: CabinConfig;
  clearances: ClearanceRules;
  costs: TableCost[];
  /** Ids of every table involved in a collision — from `conflictingIds(issues)`. */
  conflictIds: Set<string>;
  selectedId: string | null;
  unit: TableUnit;
  onSelect: (id: string | null) => void;
  onChange: (next: CabinTable[], label: string, mergeKey?: string) => void;
  onSeal: () => void;
}

interface TableRowProps {
  table: CabinTable;
  index: number;
  selected: boolean;
  conflict: boolean;
  cost?: TableCost;
  unit: TableUnit;
  onSelect: (id: string) => void;
  onDuplicate: (t: CabinTable) => void;
  onMirror: (t: CabinTable) => void;
  onRotate: (t: CabinTable) => void;
  onToggleLock: (t: CabinTable) => void;
  onToggleHidden: (t: CabinTable) => void;
  onDelete: (t: CabinTable) => void;
}

const IconAction = ({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", className)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-[11px]">
      {label}
    </TooltipContent>
  </Tooltip>
);

const TableRow = React.memo(function TableRow({
  table: t,
  index,
  selected,
  conflict,
  cost,
  unit,
  onSelect,
  onDuplicate,
  onMirror,
  onRotate,
  onToggleLock,
  onToggleHidden,
  onDelete,
}: TableRowProps) {
  const def = findTableType(t.tableTypeId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(t.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(t.id);
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded-lg border bg-background p-2.5 transition-colors",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40",
        conflict && "border-destructive/60 bg-destructive/5",
        t.position.hidden && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px]">
            {tableRef(index)}
          </Badge>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-foreground">{t.name}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{def.label}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {t.quantity > 1 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              × {t.quantity}
            </Badge>
          ) : null}
          {conflict ? (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              Conflict
            </Badge>
          ) : null}
          {t.position.locked ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Locked
            </Badge>
          ) : null}
          {t.position.hidden ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Hidden
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>{quotationSize(t)}</span>
        <span>·</span>
        <span>
          x {formatMm(t.position.xMm, unit)}, y {formatMm(t.position.yMm, unit)}
        </span>
        {t.position.rotationDeg ? (
          <>
            <span>·</span>
            <span>{t.position.rotationDeg}°</span>
          </>
        ) : null}
        {cost ? (
          <span className="ml-auto font-semibold text-foreground">{formatINR(cost.totalAmount)}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-0.5 border-t border-border/60 pt-1">
        <IconAction label="Edit" onClick={() => onSelect(t.id)}>
          <Pencil className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction label="Duplicate" onClick={() => onDuplicate(t)}>
          <Copy className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction label="Mirror" onClick={() => onMirror(t)}>
          <FlipHorizontal className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction label="Rotate 90°" onClick={() => onRotate(t)}>
          <RotateCw className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction
          label={t.position.locked ? "Unlock" : "Lock"}
          onClick={() => onToggleLock(t)}
          className={t.position.locked ? "text-amber-600 dark:text-amber-400" : undefined}
        >
          {t.position.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </IconAction>
        <IconAction label={t.position.hidden ? "Show" : "Hide"} onClick={() => onToggleHidden(t)}>
          {t.position.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </IconAction>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">
              Delete
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the table, its accessories and its electrical points from the drawing and
                the quotation. You can undo it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(t)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

export function TableList({
  tables,
  config,
  clearances,
  costs,
  conflictIds,
  selectedId,
  unit,
  onSelect,
  onChange,
  onSeal,
}: TableListProps) {
  const costById = React.useMemo(() => {
    const m: Record<string, TableCost> = {};
    for (const c of costs) m[c.tableId] = c;
    return m;
  }, [costs]);

  /* The collision context is built from the LIVE list, not from `config.tables` — the parent syncs
   * the two, but a context one edit behind would walk a duplicate onto a table that had just moved. */
  const ctx = React.useMemo(
    () => buildContext({ ...config, tables }, clearances),
    [config, tables, clearances],
  );

  const replace = React.useCallback(
    (t: CabinTable, next: CabinTable, label: string) => {
      onChange(
        tables.map((x) => (x.id === t.id ? next : x)),
        label,
      );
      onSeal();
    },
    [tables, onChange, onSeal],
  );

  const handleDuplicate = React.useCallback(
    (t: CabinTable) => {
      const copy = resolveOverlap(duplicateTable(t, tables), ctx);
      onChange([...tables, copy], `Duplicate ${t.name}`);
      onSeal();
      onSelect(copy.id);
    },
    [tables, ctx, onChange, onSeal, onSelect],
  );

  const handleMirror = React.useCallback(
    (t: CabinTable) =>
      replace(
        t,
        clampTable({ ...t, position: { ...t.position, flipH: !t.position.flipH } }, t),
        `Mirror ${t.name}`,
      ),
    [replace],
  );

  const handleRotate = React.useCallback(
    (t: CabinTable) =>
      replace(
        t,
        clampTable(
          { ...t, position: { ...t.position, rotationDeg: (t.position.rotationDeg + 90) % 360 } },
          t,
        ),
        `Rotate ${t.name}`,
      ),
    [replace],
  );

  const handleToggleLock = React.useCallback(
    (t: CabinTable) =>
      replace(
        t,
        clampTable({ ...t, position: { ...t.position, locked: !t.position.locked } }, t),
        t.position.locked ? `Unlock ${t.name}` : `Lock ${t.name}`,
      ),
    [replace],
  );

  const handleToggleHidden = React.useCallback(
    (t: CabinTable) =>
      replace(
        t,
        clampTable({ ...t, position: { ...t.position, hidden: !t.position.hidden } }, t),
        t.position.hidden ? `Show ${t.name}` : `Hide ${t.name}`,
      ),
    [replace],
  );

  const handleDelete = React.useCallback(
    (t: CabinTable) => {
      onChange(
        tables.filter((x) => x.id !== t.id),
        `Delete ${t.name}`,
      );
      onSeal();
      if (selectedId === t.id) onSelect(null);
    },
    [tables, onChange, onSeal, onSelect, selectedId],
  );

  const handleSelect = React.useCallback((id: string) => onSelect(id), [onSelect]);

  if (!tables.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-8 text-center">
        <span className="text-[12px] font-medium text-foreground">No tables yet</span>
        <span className="text-[11px] text-muted-foreground">
          Add a table, or let Auto Arrange lay out a room for you.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tables.map((t, i) => (
        <TableRow
          key={t.id}
          table={t}
          index={i}
          selected={selectedId === t.id}
          conflict={conflictIds.has(t.id)}
          cost={costById[t.id]}
          unit={unit}
          onSelect={handleSelect}
          onDuplicate={handleDuplicate}
          onMirror={handleMirror}
          onRotate={handleRotate}
          onToggleLock={handleToggleLock}
          onToggleHidden={handleToggleHidden}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
