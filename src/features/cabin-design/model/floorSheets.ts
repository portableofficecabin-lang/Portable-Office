/**
 * FLOORING SHEET SCHEDULE — the 8 ft × 4 ft decking take-off, laid out sheet by sheet.
 *
 * Pure: no React, no DOM, no Supabase. ONE derivation, TWO consumers — cabinModel.ts draws a part per
 * sheet, and the manufacturing report prints the schedule — so the drawing and the paperwork can never
 * disagree.
 *
 * WHAT IS AND IS NOT DEDUCTED (spec): the flooring runs wall-to-wall under everything, so partitions,
 * walls, furniture and fittings are NOT deducted. Only a genuine floor OPENING (a void where no decking
 * is laid) is removed — a cabin normally has none.
 *
 * RECONCILIATION: the priced BOQ line `floor:board` remains the single source of truth for PROCUREMENT
 * (it applies the material's own wastage). This module never changes it — it explains it: the area-based
 * figures (exact → rounded up) and the physical cutting layout are shown alongside the priced quantity.
 */
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { cabinSizeMm, roomRangesMm } from "@/features/cabin-design/furniture/tables/cabinObstacles";
import { MM_PER_FT } from "@/features/cabin-design/furniture/tables/tableUnits";

/** The standard flooring sheet: 8 ft × 4 ft = 32 sq ft. */
export const SHEET_LEN_FT = 8;
export const SHEET_WID_FT = 4;
export const SHEET_AREA_SQFT = SHEET_LEN_FT * SHEET_WID_FT; // 32
export const SHEET_LEN_MM = SHEET_LEN_FT * MM_PER_FT;
export const SHEET_WID_MM = SHEET_WID_FT * MM_PER_FT;

const sqftOf = (wMm: number, hMm: number) => (wMm / MM_PER_FT) * (hMm / MM_PER_FT);
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface FloorSheetRow {
  /** Sequential sheet number across the whole building (installation order). */
  no: number;
  /** Per-floor sheet number, e.g. "GF-05". */
  mark: string;
  /** 1 = ground floor, 2 = first floor, … */
  floor: number;
  /** 1-based room index this sheet mostly sits in (presentation split — see notes). */
  room: number;
  /** Placement rectangle on that floor, in mm from the rear-left corner. */
  x0: number; y0: number; x1: number; y1: number;
  /** The size this sheet is actually cut to (a full sheet when it equals 8 ft × 4 ft). */
  cutLengthMm: number; cutWidthMm: number;
  full: boolean;
  areaSqft: number;
  /** "Length-wise" — sheets are laid with their 8 ft dimension along the cabin length. */
  orientation: "length-wise";
}

export interface FloorSheetFloorTotals {
  floor: number;
  label: string;
  sheets: number;
  fullSheets: number;
  cutSheets: number;
  floorAreaSqft: number;
}

export interface FloorSheetSchedule {
  sheetLengthFt: number; sheetWidthFt: number; sheetAreaSqft: number;
  floors: number;
  rows: FloorSheetRow[];
  perFloor: FloorSheetFloorTotals[];
  perRoom: { room: number; label: string; sheets: number; areaSqft: number }[];
  totals: {
    /** Total flooring area across every floor (sq ft). */
    floorAreaSqft: number;
    /** area ÷ 32 — the theoretical requirement, before any cutting loss. */
    exactSheets: number;
    /** exactSheets rounded UP to the next whole sheet (10.25 → 11). */
    roundedSheets: number;
    /** Sheets physically placed by the cutting layout (includes part-cut sheets). */
    layoutSheets: number;
    fullSheets: number;
    cutSheets: number;
    /** Board area actually laid (= floorAreaSqft). */
    usedAreaSqft: number;
    /** Board area bought by the layout. */
    grossAreaSqft: number;
    /** Off-cut left over from the part-cut sheets. */
    balanceAreaSqft: number;
    /** Cutting waste = gross − used (the same number as balance; named per the spec). */
    cuttingWasteSqft: number;
    /** cuttingWaste ÷ used × 100. */
    wastagePercent: number;
    /** The PRICED procurement quantity from the BOQ (includes the material's wastage). */
    boqSheets: number | null;
    /** What to buy: the priced BOQ figure when available, else the layout count. */
    grandTotalSheets: number;
  };
  notes: string[];
}

/**
 * Build the flooring schedule from the ACTUAL model dimensions.
 * @param boqSheets the priced `floor:board` sheet count (procurement truth); null when unavailable.
 * @param floors    storeys of decking (BOQ option); 1 = ground floor only.
 * @param openings  genuine floor voids, in mm, that carry no decking.
 */
export function buildFloorSheetSchedule(
  config: CabinConfig,
  boqSheets: number | null,
  floors = 1,
  openings: { x0: number; y0: number; x1: number; y1: number }[] = [],
): FloorSheetSchedule {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const nFloors = Math.max(1, Math.round(floors));
  const rooms = roomRangesMm(config);

  const openArea = openings.reduce((s, o) => s + sqftOf(Math.max(0, o.x1 - o.x0), Math.max(0, o.y1 - o.y0)), 0);
  const perFloorAreaSqft = Math.max(0, sqftOf(L, W) - openArea);

  const cols = Math.max(1, Math.ceil(L / SHEET_LEN_MM - 1e-9));
  const rowsY = Math.max(1, Math.ceil(W / SHEET_WID_MM - 1e-9));

  const rows: FloorSheetRow[] = [];
  const perFloor: FloorSheetFloorTotals[] = [];
  let no = 0;

  for (let f = 1; f <= nFloors; f++) {
    const prefix = f === 1 ? "GF" : f === 2 ? "FF" : `F${f - 1}`;
    let sheets = 0, full = 0, cut = 0, n = 0;
    for (let ry = 0; ry < rowsY; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const x0 = cx * SHEET_LEN_MM, y0 = ry * SHEET_WID_MM;
        const x1 = Math.min(x0 + SHEET_LEN_MM, L), y1 = Math.min(y0 + SHEET_WID_MM, W);
        const cw = x1 - x0, ch = y1 - y0;
        if (cw <= 1 || ch <= 1) continue;
        // skip a tile that lies wholly inside a genuine floor opening
        if (openings.some((o) => x0 >= o.x0 - 1 && x1 <= o.x1 + 1 && y0 >= o.y0 - 1 && y1 <= o.y1 + 1)) continue;
        const isFull = cw >= SHEET_LEN_MM - 1 && ch >= SHEET_WID_MM - 1;
        const cxMid = (x0 + x1) / 2;
        const room = (rooms.find((rr) => cxMid >= rr.x0 && cxMid < rr.x1)?.index ?? 0) + 1;
        no++; n++; sheets++;
        if (isFull) full++; else cut++;
        rows.push({
          no, mark: `${prefix}-${String(n).padStart(2, "0")}`, floor: f, room,
          x0, y0, x1, y1, cutLengthMm: Math.round(cw), cutWidthMm: Math.round(ch),
          full: isFull, areaSqft: r2(sqftOf(cw, ch)), orientation: "length-wise",
        });
      }
    }
    perFloor.push({
      floor: f, label: f === 1 ? "Ground floor" : f === 2 ? "First floor" : `Floor ${f - 1}`,
      sheets, fullSheets: full, cutSheets: cut, floorAreaSqft: r2(perFloorAreaSqft),
    });
  }

  const floorAreaSqft = perFloorAreaSqft * nFloors;
  const exactSheets = floorAreaSqft / SHEET_AREA_SQFT;
  const roundedSheets = Math.ceil(exactSheets - 1e-9);
  const layoutSheets = rows.length;
  const grossAreaSqft = layoutSheets * SHEET_AREA_SQFT;
  const usedAreaSqft = floorAreaSqft;
  const cuttingWasteSqft = Math.max(0, grossAreaSqft - usedAreaSqft);
  const wastagePercent = usedAreaSqft > 0 ? (cuttingWasteSqft / usedAreaSqft) * 100 : 0;

  const perRoomMap = new Map<number, { sheets: number; areaSqft: number }>();
  for (const r of rows) {
    const e = perRoomMap.get(r.room) ?? { sheets: 0, areaSqft: 0 };
    e.sheets += 1; e.areaSqft += r.areaSqft;
    perRoomMap.set(r.room, e);
  }
  const perRoom = [...perRoomMap.entries()].sort((a, b) => a[0] - b[0]).map(([room, v]) => ({
    room, label: `Room ${room}`, sheets: v.sheets, areaSqft: r2(v.areaSqft),
  }));

  return {
    sheetLengthFt: SHEET_LEN_FT, sheetWidthFt: SHEET_WID_FT, sheetAreaSqft: SHEET_AREA_SQFT,
    floors: nFloors, rows, perFloor, perRoom,
    totals: {
      floorAreaSqft: r2(floorAreaSqft),
      exactSheets: r2(exactSheets),
      roundedSheets,
      layoutSheets,
      fullSheets: rows.filter((r) => r.full).length,
      cutSheets: rows.filter((r) => !r.full).length,
      usedAreaSqft: r2(usedAreaSqft),
      grossAreaSqft: r2(grossAreaSqft),
      balanceAreaSqft: r2(cuttingWasteSqft),
      cuttingWasteSqft: r2(cuttingWasteSqft),
      wastagePercent: r2(wastagePercent),
      boqSheets,
      grandTotalSheets: boqSheets ?? layoutSheets,
    },
    notes: [
      `Standard sheet ${SHEET_LEN_FT} ft × ${SHEET_WID_FT} ft = ${SHEET_AREA_SQFT} sq ft, laid length-wise along the cabin.`,
      "Flooring runs wall-to-wall: partitions, walls, furniture and fittings are NOT deducted — only genuine floor openings are.",
      `Area basis: ${r2(floorAreaSqft)} sq ft ÷ ${SHEET_AREA_SQFT} = ${r2(exactSheets)} → ${roundedSheets} sheets rounded up.`,
      `Cutting layout places ${layoutSheets} sheets (${rows.filter((r) => r.full).length} full, ${rows.filter((r) => !r.full).length} cut); off-cuts from cut sheets are reusable.`,
      boqSheets != null
        ? `Procurement quantity ${boqSheets} sheets comes from the priced BOQ line (includes the material's own wastage allowance) — this schedule explains it and never overrides it.`
        : "Priced BOQ quantity unavailable — showing the cutting-layout count.",
    ],
  };
}
