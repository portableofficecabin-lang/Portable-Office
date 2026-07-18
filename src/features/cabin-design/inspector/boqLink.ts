/**
 * COMPONENT ↔ LIVE BOQ LINK (spec §2 + §5).
 *
 * Maps a clicked CabinPart to its priced BoqLine from the LIVE BoqResult (computed once by
 * CabinBoqPanel and lifted into the studio) — never a duplicate calculation. Structural/envelope
 * parts carry an exact `boqLineId` (`<section>:<slug>`, matching cabinTakeoff); openings / MEP /
 * furniture, which the take-off aggregates by size/type, resolve to their representative line by
 * kind. Because the BoqResult is recomputed when a Material Master rate or override changes, the
 * inspector updates live with NO geometry rebuild.
 */

import type { BoqLine, BoqResult } from "@/lib/boq/types";
import type { CabinPart } from "@/features/cabin-design/model/types";
import type { InspectorBoq } from "./ComponentInspector";

function findLine(part: CabinPart, lines: BoqLine[]): BoqLine | undefined {
  if (part.boqLineId) {
    const exact = lines.find((l) => l.id === part.boqLineId);
    if (exact) return exact;
  }
  switch (part.kind) {
    case "door":
      return lines.find((l) => l.id === "openings:door-leaf");
    case "window":
      return lines.find((l) => l.id.startsWith("openings:window:") && !l.id.includes("frame") && !l.id.includes("grill"));
    case "partition":
      return lines.find((l) => l.id === "partition:sheet") ?? lines.find((l) => l.section === "partition");
    case "toilet":
    case "plumbing-fixture":
    case "pipe":
      return lines.find((l) => l.section === "plumbing");
    case "light":
      return lines.find((l) => l.id === "electrical:led") ?? lines.find((l) => l.id === "electrical:tube");
    case "fan":
      return lines.find((l) => l.id === "electrical:fan") ?? lines.find((l) => l.id === "electrical:exhaust");
    case "socket":
    case "switch":
    case "electrical-panel":
      return lines.find((l) => l.id === "electrical:switch-board") ?? lines.find((l) => l.section === "electrical");
    case "furniture":
    case "pantry":
      return lines.find((l) => l.section === "furniture");
    default:
      return undefined;
  }
}

/** The live BOQ view for a part, or null when the part has no priced line (e.g. door-swing). */
export function boqForPart(part: CabinPart, result: BoqResult | null | undefined): InspectorBoq | null {
  const lines = result?.lines ?? [];
  if (!lines.length) return null;
  const l = findLine(part, lines);
  if (!l) return null;
  return {
    material: l.material,
    spec: l.spec,
    qty: l.qty,
    uom: l.uom,
    unitWeightKg: l.unitWeight,
    totalWeightKg: l.totalWeightKg,
    rate: l.rate,
    amount: l.amount,
    drawingRef: l.drawingRef,
    lineId: l.id,
    materialCode: l.materialKey,
  };
}
