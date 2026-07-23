"use client";

/**
 * LABOUR COLONY ENGINEERING STUDIO — component colour picker.
 *
 * One panel that recolours every visible element family. The colour chosen here is applied through
 * `resolvePartColor` (model/palette.ts), which is the single resolver the 3D viewer, the exploded
 * view, the assembly video and every exported frame all call — so a colour can never be right in one
 * surface and wrong in another.
 *
 * Only groups the CURRENT model actually contains are offered, so a single-storey colony with no
 * staircase never shows a "Staircase" swatch it cannot demonstrate.
 *
 * Literal hex only (`<input type="color">` always yields `#rrggbb`), which keeps three.js happy and
 * keeps the PDF/PNG export path free of oklch() — see src/lib/pdf/sanitizeColors.ts.
 */

import { useMemo } from "react";
import { Palette, RotateCcw } from "lucide-react";
import type { ColonyModel } from "@/features/labour-colony-studio/model/types";
import {
  COLOR_GROUP_META, COLOR_GROUP_ORDER, defaultPalette, groupsPresentIn,
  type ColonyColorGroup, type ColonyPalette,
} from "@/features/labour-colony-studio/model/palette";

export interface PaletteEditorProps {
  model: ColonyModel;
  palette: ColonyPalette;
  onChange: (next: ColonyPalette) => void;
  /** Collapsed by default inside a details/summary so it never crowds the viewer controls. */
  defaultOpen?: boolean;
}

export function PaletteEditor({ model, palette, onChange, defaultOpen = false }: PaletteEditorProps) {
  const defaults = useMemo(() => defaultPalette(), []);
  const present = useMemo(() => groupsPresentIn(model.parts), [model]);
  const groups = useMemo(
    () => COLOR_GROUP_ORDER.filter((g) => present.has(g)),
    [present],
  );
  const changed = useMemo(
    () => groups.filter((g) => {
      const v = palette[g];
      return typeof v === "string" && v.toLowerCase() !== defaults[g].toLowerCase();
    }).length,
    [groups, palette, defaults],
  );

  const set = (g: ColonyColorGroup, hex: string) => onChange({ ...palette, [g]: hex });
  const resetAll = () => onChange({});
  const resetOne = (g: ColonyColorGroup) => {
    const next = { ...palette };
    delete next[g];
    onChange(next);
  };

  return (
    <details open={defaultOpen} className="rounded-xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <Palette className="h-4 w-4 text-amber" />
          Component colours
          <span className="text-xs font-normal text-muted-foreground">
            ({groups.length} families{changed > 0 ? `, ${changed} changed` : ""})
          </span>
        </span>
        {changed > 0 && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); resetAll(); }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset all
          </button>
        )}
      </summary>

      <div className="max-h-[320px] overflow-y-auto border-t border-border p-2">
        <p className="mb-2 px-1 text-[11px] leading-snug text-muted-foreground">
          Applies to the 3D model, the exploded view, the assembly video and every exported frame.
        </p>
        <ul className="space-y-1">
          {groups.map((g) => {
            const value = palette[g] ?? defaults[g];
            const isChanged = value.toLowerCase() !== defaults[g].toLowerCase();
            const meta = COLOR_GROUP_META[g];
            return (
              <li key={g} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(g, e.target.value)}
                  aria-label={`${meta.label} colour`}
                  className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{meta.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{meta.hint}</span>
                </span>
                <code className="shrink-0 text-[10px] uppercase text-muted-foreground">{value}</code>
                {isChanged && (
                  <button
                    type="button"
                    onClick={() => resetOne(g)}
                    title={`Reset ${meta.label} to the default engineering colour`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

export default PaletteEditor;
