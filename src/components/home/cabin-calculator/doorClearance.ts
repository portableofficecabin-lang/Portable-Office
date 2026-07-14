/**
 * Main-entrance-door clearance geometry (pure, no React) — shared by the 2D ModulePlan so the
 * entry area in front of the cabin door always stays clear: no furniture, fixture or enclosed
 * washroom may sit or be shifted into it. Kept in its own module so ModulePlan doesn't export
 * non-component helpers (which breaks React Fast Refresh).
 */
import { doorSizeOf, sideSpanFt, openingWidthOn, clampOpeningOffset, type CabinConfig } from "./pricing";

export type KeepRect = { x0: number; y0: number; x1: number; y1: number };

/** Clear zones (px) in front of every MAIN entrance door — a person needs room to enter, so no
 *  furniture / fixture / washroom may sit here. Extends from the door wall INTO the room by ~3 ft
 *  (capped to 60% of the room depth) across the opening width + a small margin. Mirrors the door
 *  geometry (sideSpanFt / openingWidthOn / clampOpeningOffset). Partition doors are NOT included. */
export function doorKeepoutRects(
  config: CabinConfig, ox: number, oy: number, rx: number, by: number, L: number, W: number, ppf: number,
): KeepRect[] {
  const m = 4;
  const rects: KeepRect[] = [];
  (config.doorPlacements ?? []).forEach((d) => {
    const side = d.side || "bottom";
    const horiz = side === "top" || side === "bottom";
    const spanFt = sideSpanFt(side, L, W);
    // Sized off THIS door, not the standard 3 ft. A 6 ft double-leaf door needs a keep-out twice as
    // wide AND twice as deep — its leaves sweep further into the room. Keeping the old constant here
    // would let a table be auto-placed inside the swing of a wide door.
    const dz = doorSizeOf(d);
    const dw = openingWidthOn(spanFt, dz.widthFt) * ppf;
    const startPx = clampOpeningOffset(d.offset, spanFt, dz.widthFt) * ppf;
    const roomDepth = horiz ? by - oy : rx - ox;
    const clr = Math.min(Math.max(dz.widthFt, 3) * ppf, roomDepth * 0.6);
    if (side === "bottom")     rects.push({ x0: ox + startPx - m, x1: ox + startPx + dw + m, y0: by - clr, y1: by });
    else if (side === "top")   rects.push({ x0: ox + startPx - m, x1: ox + startPx + dw + m, y0: oy, y1: oy + clr });
    else if (side === "left")  rects.push({ x0: ox, x1: ox + clr, y0: oy + startPx - m, y1: oy + startPx + dw + m });
    else                       rects.push({ x0: rx - clr, x1: rx, y0: oy + startPx - m, y1: oy + startPx + dw + m });
  });
  return rects;
}

/** Minimally shift a box centre (half-extents hw,hh) out of every keep-out rect — along the axis
 *  of least penetration, or only `along` when a wall-anchored piece must slide ALONG its wall
 *  ("x" = slide horizontally / top-bottom wall, "y" = slide vertically / left-right wall). The
 *  centre is then clamped into [loX,hiX]×[loY,hiY]. A few passes settle overlapping rects. */
export function avoidKeepouts(
  cx: number, cy: number, hw: number, hh: number, rects: KeepRect[],
  loX: number, hiX: number, loY: number, hiY: number, along?: "x" | "y",
): { cx: number; cy: number } {
  if (!rects.length) return { cx, cy };
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const k of rects) {
      const ovx = Math.min(cx + hw, k.x1) - Math.max(cx - hw, k.x0);
      const ovy = Math.min(cy + hh, k.y1) - Math.max(cy - hh, k.y0);
      if (ovx > 0 && ovy > 0) {
        const moveX = along === "x" ? true : along === "y" ? false : ovx <= ovy;
        if (moveX) cx = cx < (k.x0 + k.x1) / 2 ? k.x0 - hw : k.x1 + hw;
        else       cy = cy < (k.y0 + k.y1) / 2 ? k.y0 - hh : k.y1 + hh;
        moved = true;
      }
    }
    cx = Math.min(Math.max(cx, loX), hiX);
    cy = Math.min(Math.max(cy, loY), hiY);
    if (!moved) break;
  }
  return { cx, cy };
}
