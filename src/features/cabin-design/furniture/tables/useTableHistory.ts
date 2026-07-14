"use client";

/**
 * Table module — UNDO / REDO (spec §27).
 *
 * Covers every mutating action the spec names: add, delete, move, resize, rotate, change type,
 * change material, add/remove accessory, duplicate.
 *
 * WHY IT SNAPSHOTS THE WHOLE `CabinTable[]` RATHER THAN DIFFING:
 * a table edit is small (a few hundred bytes of JSON) and the design holds tens of tables, not
 * thousands. A command/diff stack would need an inverse for every one of the ~30 edit paths — and a
 * single missing inverse is a silently corrupted design. Snapshots are O(n) in memory and cannot
 * get out of sync with the model, which is the property that actually matters here.
 *
 * COALESCING: a drag fires dozens of `move` updates per second. Pushing each one would make Undo
 * useless (you would have to press it 40 times to undo one drag). So consecutive edits that share a
 * `mergeKey` (e.g. "move:tbl-abc") collapse into ONE history entry, as long as they land within
 * `MERGE_WINDOW_MS` of each other. Committing a gesture (pointer-up, input blur) clears the key so
 * the next edit starts a fresh entry.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import type { CabinTable } from "./tableSchema";

const MAX_HISTORY = 100;
const MERGE_WINDOW_MS = 600;

interface Entry {
  tables: CabinTable[];
  label: string;
  mergeKey?: string;
  at: number;
}

export interface TableHistory {
  tables: CabinTable[];
  /** Replace the table list. `label` shows in the Undo tooltip; `mergeKey` coalesces a gesture. */
  commit: (next: CabinTable[], label: string, mergeKey?: string) => void;
  /** End the current gesture so the next edit starts a new history entry. */
  seal: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  /** Reset the stack — used when a saved design is loaded. */
  reset: (tables: CabinTable[]) => void;
}

/**
 * `tables` is the live value; `onChange` writes it back into the owning CabinConfig. The hook owns
 * the history stack only — the design state itself stays in CabinCalculator's single `config`
 * object, so nothing here can become a second source of truth.
 */
export function useTableHistory(
  tables: CabinTable[],
  onChange: (next: CabinTable[]) => void,
): TableHistory {
  const [past, setPast] = useState<Entry[]>([]);
  const [future, setFuture] = useState<Entry[]>([]);
  const mergeRef = useRef<{ key: string; at: number } | null>(null);

  const commit = useCallback(
    (next: CabinTable[], label: string, mergeKey?: string) => {
      const now = Date.now();
      const merging =
        !!mergeKey &&
        mergeRef.current?.key === mergeKey &&
        now - mergeRef.current.at < MERGE_WINDOW_MS;

      setPast((p) => {
        // A merged edit REPLACES the pending entry's "after" state; the entry's "before" snapshot
        // (already on the stack) stays put, so one Undo reverts the whole gesture.
        if (merging && p.length) return p;
        const entry: Entry = { tables, label, mergeKey, at: now };
        const nextPast = [...p, entry];
        return nextPast.length > MAX_HISTORY ? nextPast.slice(-MAX_HISTORY) : nextPast;
      });

      mergeRef.current = mergeKey ? { key: mergeKey, at: now } : null;
      setFuture([]);
      onChange(next);
    },
    [tables, onChange],
  );

  const seal = useCallback(() => {
    mergeRef.current = null;
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const entry = p[p.length - 1];
      setFuture((f) => [...f, { tables, label: entry.label, at: Date.now() }]);
      onChange(entry.tables);
      mergeRef.current = null;
      return p.slice(0, -1);
    });
  }, [tables, onChange]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const entry = f[f.length - 1];
      setPast((p) => [...p, { tables, label: entry.label, at: Date.now() }]);
      onChange(entry.tables);
      mergeRef.current = null;
      return f.slice(0, -1);
    });
  }, [tables, onChange]);

  const reset = useCallback((next: CabinTable[]) => {
    setPast([]);
    setFuture([]);
    mergeRef.current = null;
    onChange(next);
  }, [onChange]);

  return useMemo(
    () => ({
      tables,
      commit,
      seal,
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undoLabel: past.length ? past[past.length - 1].label : null,
      redoLabel: future.length ? future[future.length - 1].label : null,
      reset,
    }),
    [tables, commit, seal, undo, redo, past, future, reset],
  );
}
