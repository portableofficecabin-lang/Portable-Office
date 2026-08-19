"use client";

/**
 * LABOUR COLONY — the shared structural model, built once and safely.
 *
 * Extracted from `ColonyDrawingStudio` so every admin surface that needs the model (the engineering
 * studio AND the reference GA drawing) builds it through ONE implementation. Two copies of this logic
 * would be a live hazard: the staleness rules below are what stop a previous colony's priced sections
 * and piece counts being painted onto the current geometry and presented as fact, and a copy that
 * drifted would do exactly that on one tab while the other stayed correct.
 *
 * GEOMETRY vs PRICE: the model is cached on a `geomKey` built from the CONFIG geometry, the civil
 * substructure geometry, each member's CHOSEN SECTION (materialKey) and each member's PRICED PIECE
 * COUNT — but NOT rates / wastage / charges. So a rate change re-prices without rebuilding geometry,
 * while a section swap, spacing/quantity change or engineering-config change rebuilds correctly.
 *
 * STALE BOQ: the priced BOQ is produced by a panel inside the (unmounted-when-closed) Material BOQ
 * tab, so it can lag behind a config edit made elsewhere. When it does we refuse to blend the two —
 * the resolvers are dropped, the model rebuilds purely from the live take-off, and `boqStale` is
 * raised so the surface can say so.
 */

import { useCallback, useMemo, useRef } from "react";

import type { BoqResult } from "@/lib/boq/types";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "./colonyModel";
import { parseSectionFromSpec, type SectionDims } from "./sectionDims";
import type { ColonyModel } from "./types";

export interface UseColonyStudioModelInput {
  /** The live labour-colony calculation (geometry + sections source). */
  result: LabourColonyResult;
  /** The priced civil substructure — foundation members resolve against this. Null when civil is off. */
  civil?: CivilWorkResult | null;
  /** The live priced Material BOQ — steel members resolve against this. */
  boqResult?: BoqResult | null;
}

export interface UseColonyStudioModelResult {
  model: ColonyModel;
  /** True when `boqResult` belongs to a PREVIOUS configuration and was therefore not used. */
  boqStale: boolean;
}

export function useColonyStudioModel({
  result, civil = null, boqResult = null,
}: UseColonyStudioModelInput): UseColonyStudioModelResult {
  /* ---- LIVE SECTION RESOLVER — the real cross-section each member is PRICED with ------------- */
  const sectionByLine = useMemo(() => {
    const map = new Map<string, SectionDims | null>();
    for (const l of boqResult?.lines ?? []) {
      if (l.cutLengthM != null) map.set(l.id, parseSectionFromSpec(l.spec));
    }
    return map;
  }, [boqResult]);
  const resolveSection = useCallback((id: string) => sectionByLine.get(id) ?? null, [sectionByLine]);

  /* ---- LIVE QUANTITY RESOLVER — the PRICED piece count (incl. manual override / lock) --------- */
  const qtyByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of boqResult?.lines ?? []) {
      if (l.cutLengthM != null && l.pieces != null) map.set(l.id, l.pieces);
    }
    return map;
  }, [boqResult]);
  const resolveQty = useCallback((id: string) => qtyByLine.get(id) ?? null, [qtyByLine]);

  /* ---- geometry signature: sections + piece counts, but NEVER rates ------------------------- */
  const sectionSig = useMemo(
    () => (boqResult?.lines ?? []).filter((l) => l.cutLengthM != null).map((l) => `${l.id}=${l.materialKey}`).join(","),
    [boqResult],
  );
  const qtySig = useMemo(
    () => (boqResult?.lines ?? []).filter((l) => l.cutLengthM != null).map((l) => `${l.id}=${l.pieces}`).join(","),
    [boqResult],
  );
  /** The civil substructure geometry that positions the foundation + the column grid. */
  const civilSig = useMemo(() => {
    const f = civil?.foundation;
    if (!f) return "none";
    return JSON.stringify({
      xs: f.grid?.xsM, ys: f.grid?.ysM,
      sec: f.section,
      ft: (f.footingTypes ?? []).map((t) => `${t.mark}:${t.sideM}:${t.depthM}:${t.count}`),
    });
  }, [civil]);
  const configSig = useMemo(() => JSON.stringify(result.config), [result.config]);

  /* ---- STALENESS GUARD — the priced BOQ can silently belong to a PREVIOUS colony -------------
   * Two independent checks, because neither alone is sufficient:
   *   1. configSig vs. accepted — a ref records the configSig that was in force when each NEW
   *      `boqResult` identity arrived. A configSig change with an unchanged boqResult identity is
   *      exactly the "config edited, never re-priced" signature. This catches EVERY config edit,
   *      including room dimensions, which TakeoffMeta cannot express.
   *   2. TakeoffMeta vs. result — covers the FIRST render, where a boqResult already present on
   *      mount is accepted at face value by (1) because there is no earlier configSig to compare
   *      it against. Only meta fields the take-off reads STRAIGHT off `result` are compared. */
  const acceptedBoq = useRef<BoqResult | null>(null);
  const acceptedConfigSig = useRef<string | null>(null);
  if (acceptedBoq.current !== boqResult) {
    // Render-phase derived state: a new boqResult identity means the BOQ panel has just re-priced,
    // so the config in force right now is the config it was priced against.
    acceptedBoq.current = boqResult;
    acceptedConfigSig.current = boqResult ? configSig : null;
  }
  const boqMetaMismatch = useMemo(() => {
    const m = boqResult?.meta;
    if (!m) return false;
    return (
      m.source !== "colony"
      || m.rooms !== result.occupancy.rooms
      || m.modules !== result.structural.modules
      || m.floors !== Math.max(1, result.config.floors)
    );
  }, [boqResult, result.occupancy.rooms, result.structural.modules, result.config.floors]);
  const boqStale = boqResult != null && (acceptedConfigSig.current !== configSig || boqMetaMismatch);

  /* `boqStale` joins the key so that clearing staleness rebuilds even when the fresh BOQ happens to
   * land on identical sections and piece counts — otherwise the cached take-off fallback would be
   * served while the surface claims the priced BOQ is linked. */
  const geomKey = useMemo(
    () => [configSig, civilSig, sectionSig, qtySig, boqStale ? "stale" : "priced"].join("|"),
    [configSig, civilSig, sectionSig, qtySig, boqStale],
  );

  /* ---- build the model once per geometry change (a rate change reuses the cached model) ------ */
  const modelCache = useRef<{ key: string; model: ColonyModel } | null>(null);
  const model = useMemo(() => {
    if (modelCache.current && modelCache.current.key === geomKey) return modelCache.current.model;
    // Stale BOQ ⇒ no resolvers, so the model derives sections and counts from its own take-off of
    // the CURRENT result instead of half-adopting the previous colony's priced values.
    const built = buildColonyModel(
      { result, civil, columnGrid: null },
      boqStale ? {} : { resolveSection, resolveQty },
    );
    modelCache.current = { key: geomKey, model: built };
    return built;
  }, [geomKey, result, civil, resolveSection, resolveQty, boqStale]);

  return { model, boqStale };
}
