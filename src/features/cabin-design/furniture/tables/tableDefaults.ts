/**
 * Table module — factory + clamping (spec §4, §5, §11).
 *
 * `createTable()` is the ONLY way a CabinTable is born, so every table in a design is guaranteed
 * to have a complete, valid, fully-populated shape — which is what lets the renderer, the BOQ and
 * the collision checker read `t.dimensions.topThicknessMm` without a `?? 18` at every use site.
 *
 * `clampTable()` is the ONLY way a CabinTable is edited from the UI. It re-derives everything that
 * must stay consistent (preset → custom on any dimension edit, square/circle side equality, seating
 * capacity, return arms) and clamps every dimension into a buildable range. Mirrors the discipline
 * of `reclampOpenings` in CabinCalculator.tsx, which re-clamps every opening whenever L/W changes.
 */

import {
  DEFAULT_CLEARANCES,
  type CabinTable,
  type TableAccessory,
  type TableShape,
} from "./tableSchema";
import { FURNITURE_MATERIALS } from "@/lib/boq/furnitureMaterials";

import {
  ACCESSORIES,
  CUSTOM_PRESET_ID,
  ELECTRICAL_ACCESSORY_IDS,
  findAccessory,
  findChair,
  findSupport,
  findTableType,
  hasReturn,
  hasStem,
  hasUShape,
  isRoundish,
  suggestSeating,
  type TableTypeDef,
} from "./tableTypes";

/**
 * The nominal thickness of a tabletop material, read from the Material Master row rather than
 * assumed. "board-prelam-25" IS 25 mm — hardcoding 18 here would make `dimensions.topThicknessMm`
 * and `material.materialKey` contradict each other, and the quotation would print
 * "18 mm … Prelaminated Particle Board 25 mm" on the same line. 18 mm is only the fallback for a
 * material the master does not know (an admin-added key with no thickness).
 */
export function materialThicknessMm(materialKey: string, fallback = 18): number {
  const m = FURNITURE_MATERIALS.find((x) => x.key === materialKey);
  return m?.thicknessMm && m.thicknessMm > 0 ? m.thicknessMm : fallback;
}

export { DEFAULT_CLEARANCES };

/* ---------------------------------------------------------------- */
/* Buildable limits (spec §4: "prevent zero, negative or unrealistic values") */
/* ---------------------------------------------------------------- */

export const LIMITS = {
  lengthMm: { min: 300, max: 6000 },
  depthMm: { min: 250, max: 2500 },
  heightMm: { min: 400, max: 1200 },
  topThicknessMm: { min: 6, max: 60 },
  edgeBandThicknessMm: { min: 0.5, max: 3 },
  legWidthMm: { min: 20, max: 150 },
  radiusMm: { min: 150, max: 1500 },
  returnLengthMm: { min: 300, max: 3000 },
  returnDepthMm: { min: 250, max: 1200 },
  modestyPanelHeightMm: { min: 150, max: 700 },
  quantity: { min: 1, max: 50 },
  seats: { min: 0, max: 30 },
  users: { min: 1, max: 24 },
  legs: { min: 1, max: 8 },
  rotationDeg: { min: 0, max: 359 },
} as const;

export const clampNum = (v: number, lo: number, hi: number): number =>
  !Number.isFinite(v) ? lo : Math.min(Math.max(v, lo), hi);

const clampInt = (v: number, lo: number, hi: number): number =>
  Math.round(clampNum(v, lo, hi));

/** Cheap, collision-free unique id. Not crypto — it only has to be unique within one design. */
let seq = 0;
export const newTableId = (): string =>
  `tbl-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const newAccessoryId = (): string =>
  `acc-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---------------------------------------------------------------- */
/* Creation                                                          */
/* ---------------------------------------------------------------- */

export function makeAccessory(accessoryId: string, quantity = 1): TableAccessory | null {
  const def = findAccessory(accessoryId);
  if (!def) return null;
  return {
    id: newAccessoryId(),
    accessoryId,
    quantity: Math.max(1, Math.round(quantity)),
    lengthMm: def.lengthMm,
    depthMm: def.depthMm,
    heightMm: def.heightMm,
    materialKey: def.materialKey,
    position: def.position,
    showInDrawing: def.drawByDefault,
  };
}

/** Sensible default name — "Executive Table 2" when there is already an Executive Table 1. */
export function defaultName(typeId: string, existing: CabinTable[]): string {
  const def = findTableType(typeId);
  const n = existing.filter((t) => t.tableTypeId === typeId).length + 1;
  return `${def.label} ${n}`;
}

export interface CreateTableOpts {
  /** Preset to seed from. Defaults to the type's first preset. */
  presetId?: string;
  /** Shape override. Defaults to the type's default shape. */
  shape?: TableShape;
  /** Where to drop it (mm, cabin coords). Defaults to the cabin centre — the caller usually
   *  supplies a free spot found by `findFreeSpot()`. */
  xMm?: number;
  yMm?: number;
  /** Existing tables — used only to number the name. */
  existing?: CabinTable[];
  roomIndex?: number;
}

export function createTable(typeId: string, opts: CreateTableOpts = {}): CabinTable {
  const def = findTableType(typeId);
  const preset = def.presets.find((p) => p.id === opts.presetId) ?? def.presets[0];
  const shape = opts.shape ?? def.defaultShape;
  const support = findSupport(def.defaultSupportId);
  const chair = findChair(undefined);

  const lengthMm = preset?.lengthMm ?? 1500;
  const depthMm = preset?.depthMm ?? 750;
  const heightMm = preset?.heightMm ?? 750;
  const diameter = preset?.diameterMm ?? Math.min(lengthMm, depthMm);
  /* The top's thickness IS the chosen board's thickness — never a hardcoded 18. */
  const topThicknessMm = materialThicknessMm(def.defaultMaterialKey);

  const t: CabinTable = {
    id: newTableId(),
    name: defaultName(typeId, opts.existing ?? []),
    tableTypeId: typeId,
    shape,
    quantity: 1,
    presetId: preset?.id ?? CUSTOM_PRESET_ID,

    dimensions: {
      lengthMm,
      depthMm,
      heightMm,
      topThicknessMm,
      edgeBandThicknessMm: 2,
      legHeightMm: heightMm - topThicknessMm,
      legWidthMm: 50,
      radiusMm: isRoundish(shape) ? diameter / 2 : undefined,
      secondaryMm: shape === "trapezoid" ? Math.round(lengthMm * 0.6) : undefined,
      modestyPanelHeightMm: 400,
      cableTrayLengthMm: Math.round(lengthMm * 0.8),
      cableTrayWidthMm: 100,
      sideStorageLengthMm: 900,
      sideStorageWidthMm: 450,
      sideStorageHeightMm: 650,
    },

    returnSection: hasReturn(shape) || hasStem(shape)
      ? { side: "right", lengthMm: Math.round(depthMm * 1.2 + 150), depthMm: Math.max(450, Math.round(depthMm * 0.75)) }
      : undefined,

    uShape: hasUShape(shape)
      ? {
          leftLengthMm: Math.max(750, Math.round(depthMm * 1.3)),
          leftDepthMm: Math.max(450, Math.round(depthMm * 0.75)),
          rightLengthMm: Math.max(750, Math.round(depthMm * 1.3)),
          rightDepthMm: Math.max(450, Math.round(depthMm * 0.75)),
        }
      : undefined,

    position: {
      xMm: opts.xMm ?? 0,
      yMm: opts.yMm ?? 0,
      rotationDeg: 0,
      flipH: false,
      flipV: false,
      locked: false,
      hidden: false,
      roomIndex: opts.roomIndex ?? 0,
    },

    material: {
      materialKey: def.defaultMaterialKey,
      thicknessMm: topThicknessMm,
      edgeBandKey: "edgeband-pvc-2",
      laminateKey: undefined,
      finish: "Matt",
      topColour: "Light Oak",
      edgeBandColour: "Matching",
      brand: "",
    },

    support: {
      supportTypeId: support.id,
      profileKey: support.kind === "steel" || support.kind === "pedestal" ? support.defaultMaterialKey : undefined,
      panelMaterialKey: support.kind === "panel" ? support.defaultMaterialKey : undefined,
      numberOfLegs: support.defaultLegs,
      frameFinish: "Powder coated",
      powderCoatColour: "Black",
      levellers: true,
      castors: false,
      floorFixed: false,
    },

    seating: {
      capacity: preset?.seats ?? (def.seatingModel === "single" ? 1 : suggestSeating(shape, lengthMm, depthMm)),
      includeChairs: def.seatingModel !== "none",
      chairTypeId: chair.id,
      chairWidthMm: chair.widthMm,
      chairDepthMm: chair.depthMm,
    },

    /* Electrical accessories (power manager, pop-up socket) are NOT stored here — `electrical` owns
     * their quantity, so one physical item is never counted from two fields. See
     * ELECTRICAL_ACCESSORY_IDS. */
    accessories: def.defaultAccessories
      .filter((id) => !ELECTRICAL_ACCESSORY_IDS.has(id))
      .map((id) => makeAccessory(id))
      .filter((a): a is TableAccessory => a !== null),

    electrical: {
      socket5A: 0, socket6A: 0, socket16A: 0,
      usbPoints: 0, dataPoints: 0, lanPoints: 0, hdmiPoints: 0,
      powerManagerQty: def.defaultAccessories.includes("power-manager") ? 1 : 0,
      popupBoxQty: def.defaultAccessories.includes("popup-socket") ? 1 : 0,
      floorBoxQty: 0,
      cableTray: false,
    },
  };

  /* Type-specific blocks */
  if (def.panels?.includes("workstation")) {
    t.workstation = {
      users: typeId === "back-to-back-workstation" ? 4 : 2,
      arrangement:
        typeId === "back-to-back-workstation" ? "back-to-back"
        : typeId === "cluster-workstation" ? "cluster"
        : typeId === "linear-workstation" ? "linear"
        : "linear",
      deskLengthMm: lengthMm,
      deskDepthMm: depthMm,
      partitionHeightMm: 400,
      partitionThicknessMm: 40,
      partitionMaterial: "fabric",
      sharedCableTray: true,
      sharedPowerManager: true,
      pedestalQty: 0,
      cpuHolderQty: 0,
      chairQty: 0,
      aisleWidthMm: DEFAULT_CLEARANCES.workstationAisleMm,
      facing: "south",
    };
    // Seats follow the user count for a workstation.
    t.seating.capacity = t.workstation.users;
  }

  if (def.panels?.includes("conference")) {
    t.conference = {
      seats: t.seating.capacity,
      chairSpacingMm: 700,
      headChairs: 2,
      displaySide: "front",
      powerBoxes: 1,
      cableOpenings: 2,
      sections: 1,
      microphonePoints: 0,
    };
  }

  if (def.panels?.includes("reception")) {
    t.reception = {
      counterStyle: shape === "u-shape" ? "u-shape" : shape === "curved" ? "curved" : shape === "l-shape" ? "l-shape" : "straight",
      visitorCounterHeightMm: 1100,
      staffCounterHeightMm: 750,
      visitorSide: "front",
      accessibleCounter: false,
      underCounterStorage: true,
      cpuSpace: true,
      drawerUnits: 1,
      brandingPanel: true,
      ledStrip: false,
    };
    t.dimensions.heightMm = 1100;
  }

  if (def.panels?.includes("wallMount")) {
    t.wallMount = {
      wall: "rear",
      offsetMm: 300,
      foldDirection: typeId === "folding" ? "down" : "none",
      bracketTypeId: support.id,
      bracketQty: 2,
      maxLoadKg: 50,
      wallReinforcement: false,
    };
    t.seating.includeChairs = false;
    t.seating.capacity = 0;
  }

  return clampTable(t);
}

/** Duplicate a table, offsetting it so the copy never lands exactly on the original (spec §11). */
export const DUPLICATE_OFFSET_MM = 300;

export function duplicateTable(t: CabinTable, existing: CabinTable[]): CabinTable {
  const copy: CabinTable = JSON.parse(JSON.stringify(t));
  copy.id = newTableId();
  copy.accessories = copy.accessories.map((a) => ({ ...a, id: newAccessoryId() }));
  copy.name = defaultName(t.tableTypeId, existing);
  copy.position = {
    ...copy.position,
    xMm: copy.position.xMm + DUPLICATE_OFFSET_MM,
    yMm: copy.position.yMm + DUPLICATE_OFFSET_MM,
    locked: false,
  };
  return copy;
}

/* ---------------------------------------------------------------- */
/* Clamping / consistency                                            */
/* ---------------------------------------------------------------- */

/** Which dimension edits demote a preset to "Custom Size" (spec §5). */
const PRESET_DIMS = ["lengthMm", "depthMm", "heightMm"] as const;

/**
 * Re-derive everything that must stay consistent after ANY edit, and clamp every value into its
 * buildable range. Pure — always returns a NEW table.
 *
 * `prev` (the table before the edit) is optional: when supplied, a change to a preset-defining
 * dimension flips `presetId` to "custom" (spec §5). Without it, the preset is left alone — which is
 * what `createTable` wants, since seeding FROM a preset must not immediately un-set it.
 */
export function clampTable(t: CabinTable, prev?: CabinTable): CabinTable {
  const def = findTableType(t.tableTypeId);
  const d = { ...t.dimensions };
  const shape = t.shape;

  /* --- dimensions --- */
  d.lengthMm = clampNum(d.lengthMm, LIMITS.lengthMm.min, LIMITS.lengthMm.max);
  d.depthMm = clampNum(d.depthMm, LIMITS.depthMm.min, LIMITS.depthMm.max);
  d.heightMm = clampNum(d.heightMm, LIMITS.heightMm.min, LIMITS.heightMm.max);
  d.topThicknessMm = clampNum(d.topThicknessMm, LIMITS.topThicknessMm.min, LIMITS.topThicknessMm.max);
  d.edgeBandThicknessMm = clampNum(d.edgeBandThicknessMm, LIMITS.edgeBandThicknessMm.min, LIMITS.edgeBandThicknessMm.max);
  d.legWidthMm = clampNum(d.legWidthMm ?? 50, LIMITS.legWidthMm.min, LIMITS.legWidthMm.max);

  /* A square and a circle have ONE governing dimension — keep the other in lock-step so the
   * drawing can never show a "square" that is 1200 × 900. */
  if (shape === "square") d.depthMm = d.lengthMm;
  if (shape === "circle") {
    const dia = clampNum(d.radiusMm ? d.radiusMm * 2 : d.lengthMm, LIMITS.radiusMm.min * 2, LIMITS.radiusMm.max * 2);
    d.lengthMm = dia;
    d.depthMm = dia;
    d.radiusMm = dia / 2;
  } else if (isRoundish(shape)) {
    d.radiusMm = clampNum(d.radiusMm ?? d.depthMm / 2, LIMITS.radiusMm.min, LIMITS.radiusMm.max);
  }

  /* The leg stops under the top, never through it. */
  d.legHeightMm = clampNum(d.legHeightMm ?? d.heightMm - d.topThicknessMm, 100, d.heightMm);
  if (d.legHeightMm > d.heightMm - d.topThicknessMm) d.legHeightMm = d.heightMm - d.topThicknessMm;

  d.modestyPanelHeightMm = clampNum(
    d.modestyPanelHeightMm ?? 400,
    LIMITS.modestyPanelHeightMm.min,
    Math.min(LIMITS.modestyPanelHeightMm.max, Math.max(LIMITS.modestyPanelHeightMm.min, d.heightMm - 200)),
  );

  if (shape === "trapezoid") {
    // The short parallel side must be shorter than the long one, or it is not a trapezoid.
    d.secondaryMm = clampNum(d.secondaryMm ?? d.lengthMm * 0.6, 100, Math.max(100, d.lengthMm - 50));
  }

  /* --- return / U / stem arms --- */
  let returnSection = t.returnSection;
  if (hasReturn(shape) || hasStem(shape)) {
    const r = returnSection ?? { side: "right" as const, lengthMm: 900, depthMm: 600 };
    returnSection = {
      side: r.side === "left" ? "left" : "right",
      lengthMm: clampNum(r.lengthMm, LIMITS.returnLengthMm.min, LIMITS.returnLengthMm.max),
      depthMm: clampNum(r.depthMm, LIMITS.returnDepthMm.min, LIMITS.returnDepthMm.max),
    };
  } else {
    returnSection = undefined;
  }

  let uShape = t.uShape;
  if (hasUShape(shape)) {
    const u = uShape ?? { leftLengthMm: 900, leftDepthMm: 600, rightLengthMm: 900, rightDepthMm: 600 };
    uShape = {
      leftLengthMm: clampNum(u.leftLengthMm, LIMITS.returnLengthMm.min, LIMITS.returnLengthMm.max),
      leftDepthMm: clampNum(u.leftDepthMm, LIMITS.returnDepthMm.min, LIMITS.returnDepthMm.max),
      rightLengthMm: clampNum(u.rightLengthMm, LIMITS.returnLengthMm.min, LIMITS.returnLengthMm.max),
      rightDepthMm: clampNum(u.rightDepthMm, LIMITS.returnDepthMm.min, LIMITS.returnDepthMm.max),
    };
  } else {
    uShape = undefined;
  }

  /* --- position --- */
  const position = {
    ...t.position,
    rotationDeg: ((Math.round(t.position.rotationDeg) % 360) + 360) % 360,
    roomIndex: Math.max(0, Math.round(t.position.roomIndex ?? 0)),
  };

  /* --- material --- */
  const material = { ...t.material, thicknessMm: d.topThicknessMm };

  /* --- support --- */
  const supportDef = findSupport(t.support.supportTypeId);
  const support = {
    ...t.support,
    numberOfLegs: clampInt(t.support.numberOfLegs ?? supportDef.defaultLegs, LIMITS.legs.min, LIMITS.legs.max),
  };

  /* --- seating --- */
  const chair = findChair(t.seating.chairTypeId);
  const seating = {
    ...t.seating,
    capacity: clampInt(t.seating.capacity ?? 0, LIMITS.seats.min, LIMITS.seats.max),
    chairWidthMm: t.seating.chairWidthMm || chair.widthMm,
    chairDepthMm: t.seating.chairDepthMm || chair.depthMm,
  };

  /* --- type-specific --- */
  let workstation = t.workstation;
  if (workstation) {
    workstation = {
      ...workstation,
      users: clampInt(workstation.users, LIMITS.users.min, LIMITS.users.max),
      deskLengthMm: clampNum(workstation.deskLengthMm, LIMITS.lengthMm.min, LIMITS.lengthMm.max),
      deskDepthMm: clampNum(workstation.deskDepthMm, LIMITS.depthMm.min, LIMITS.depthMm.max),
      partitionHeightMm: clampNum(workstation.partitionHeightMm, 0, 1500),
      partitionThicknessMm: clampNum(workstation.partitionThicknessMm, 5, 80),
      aisleWidthMm: clampNum(workstation.aisleWidthMm, 600, 3000),
    };
    seating.capacity = workstation.users;
  }

  let conference = t.conference;
  if (conference) {
    conference = {
      ...conference,
      seats: clampInt(conference.seats, 0, LIMITS.seats.max),
      chairSpacingMm: clampNum(conference.chairSpacingMm, 500, 1200),
      sections: clampInt(conference.sections, 1, 6),
      powerBoxes: clampInt(conference.powerBoxes, 0, 8),
      cableOpenings: clampInt(conference.cableOpenings, 0, 8),
      microphonePoints: clampInt(conference.microphonePoints, 0, 20),
    };
    seating.capacity = conference.seats;
  }

  let reception = t.reception;
  if (reception) {
    reception = {
      ...reception,
      visitorCounterHeightMm: clampNum(reception.visitorCounterHeightMm, 900, 1400),
      staffCounterHeightMm: clampNum(reception.staffCounterHeightMm, 650, 900),
      drawerUnits: clampInt(reception.drawerUnits, 0, 6),
    };
    d.heightMm = reception.visitorCounterHeightMm;
  }

  let wallMount = t.wallMount;
  if (wallMount) {
    wallMount = {
      ...wallMount,
      offsetMm: Math.max(0, wallMount.offsetMm),
      bracketQty: clampInt(wallMount.bracketQty, 1, 8),
      maxLoadKg: clampNum(wallMount.maxLoadKg, 10, 300),
    };
  }

  /* --- electrical --- */
  const e = t.electrical;
  const electrical = {
    socket5A: clampInt(e.socket5A, 0, 20),
    socket6A: clampInt(e.socket6A, 0, 20),
    socket16A: clampInt(e.socket16A, 0, 20),
    usbPoints: clampInt(e.usbPoints, 0, 20),
    dataPoints: clampInt(e.dataPoints, 0, 20),
    lanPoints: clampInt(e.lanPoints, 0, 20),
    hdmiPoints: clampInt(e.hdmiPoints, 0, 20),
    powerManagerQty: clampInt(e.powerManagerQty, 0, 10),
    popupBoxQty: clampInt(e.popupBoxQty, 0, 10),
    floorBoxQty: clampInt(e.floorBoxQty, 0, 10),
    cableTray: !!e.cableTray,
  };

  /* --- accessories ---
   * Electrical accessories are dropped here, not just at creation: a design SAVED before
   * `electrical` took ownership of them would otherwise keep billing a power manager from both
   * fields forever. Migrating on load is what makes the fix retroactive. */
  const accessories = (t.accessories ?? [])
    .filter((a) => !!findAccessory(a.accessoryId) && !ELECTRICAL_ACCESSORY_IDS.has(a.accessoryId))
    .map((a) => ({ ...a, quantity: clampInt(a.quantity, 1, 20) }));

  /* --- preset demotion (spec §5) ---
   * A preset describes the WHOLE table, so any dimension the customer can edit demotes it — not
   * just L/D/H. Lengthening an L-shape's return makes it a custom size just as surely as widening
   * the main run does, and a quotation that still claimed "1500 × 750 (standard)" would be lying. */
  let presetId = t.presetId;
  if (prev) {
    const dimChanged = PRESET_DIMS.some((k) => prev.dimensions[k] !== d[k]);
    const shapeChanged = prev.shape !== shape;
    const returnChanged =
      JSON.stringify(prev.returnSection ?? null) !== JSON.stringify(returnSection ?? null);
    const uChanged = JSON.stringify(prev.uShape ?? null) !== JSON.stringify(uShape ?? null);
    if (dimChanged || shapeChanged || returnChanged || uChanged) presetId = CUSTOM_PRESET_ID;
  }
  // A preset that no longer belongs to this type (after a type change) is meaningless.
  if (presetId !== CUSTOM_PRESET_ID && !def.presets.some((p) => p.id === presetId)) {
    presetId = CUSTOM_PRESET_ID;
  }

  return {
    ...t,
    presetId,
    quantity: clampInt(t.quantity, LIMITS.quantity.min, LIMITS.quantity.max),
    dimensions: d,
    returnSection,
    uShape,
    position,
    material,
    support,
    seating,
    accessories,
    electrical,
    workstation,
    conference,
    reception,
    wallMount,
  };
}

/**
 * Apply a standard preset (spec §5). Sets the dimensions AND restores `presetId`, which is the one
 * place a table is allowed to move back OUT of "Custom Size".
 */
export function applyPreset(t: CabinTable, presetId: string): CabinTable {
  const def = findTableType(t.tableTypeId);
  const p = def.presets.find((x) => x.id === presetId);
  if (!p) return t;

  const next: CabinTable = {
    ...t,
    presetId: p.id,
    dimensions: {
      ...t.dimensions,
      lengthMm: p.lengthMm,
      depthMm: p.depthMm,
      heightMm: p.heightMm,
      radiusMm: p.diameterMm ? p.diameterMm / 2 : t.dimensions.radiusMm,
    },
    seating: { ...t.seating, capacity: p.seats ?? t.seating.capacity },
  };
  // clampTable WITHOUT `prev` — so applying a preset does not instantly demote it back to custom.
  return clampTable(next);
}

/**
 * Switch a table to a different type, carrying over position/material where sensible and
 * re-seeding everything the new type owns (spec §11: "Change table type" is an undoable action).
 */
export function changeTableType(t: CabinTable, typeId: string, existing: CabinTable[]): CabinTable {
  const fresh = createTable(typeId, {
    xMm: t.position.xMm,
    yMm: t.position.yMm,
    existing: existing.filter((x) => x.id !== t.id),
    roomIndex: t.position.roomIndex,
  });
  return {
    ...fresh,
    id: t.id,
    quantity: t.quantity,
    position: { ...fresh.position, ...t.position },
  };
}

/**
 * Change the tabletop material. The top's THICKNESS follows the board — picking 25 mm prelam must
 * not leave an 18 mm top in the dimensions (and therefore in the board area, the edge-band height
 * and the elevation). The customer can still override the thickness afterwards; this only moves it
 * to the new board's nominal value.
 */
export function changeMaterial(t: CabinTable, materialKey: string): CabinTable {
  const thicknessMm = materialThicknessMm(materialKey, t.dimensions.topThicknessMm);
  return clampTable(
    {
      ...t,
      material: { ...t.material, materialKey, thicknessMm },
      dimensions: { ...t.dimensions, topThicknessMm: thicknessMm },
    },
    t,
  );
}

/** Change the shape, re-deriving the arms the new shape owns. */
export function changeShape(t: CabinTable, shape: TableShape): CabinTable {
  const next: CabinTable = { ...t, shape };
  if ((hasReturn(shape) || hasStem(shape)) && !next.returnSection) {
    next.returnSection = {
      side: "right",
      lengthMm: Math.round(t.dimensions.depthMm * 1.2 + 150),
      depthMm: Math.max(450, Math.round(t.dimensions.depthMm * 0.75)),
    };
  }
  if (hasUShape(shape) && !next.uShape) {
    next.uShape = {
      leftLengthMm: Math.max(750, Math.round(t.dimensions.depthMm * 1.3)),
      leftDepthMm: Math.max(450, Math.round(t.dimensions.depthMm * 0.75)),
      rightLengthMm: Math.max(750, Math.round(t.dimensions.depthMm * 1.3)),
      rightDepthMm: Math.max(450, Math.round(t.dimensions.depthMm * 0.75)),
    };
  }
  if (isRoundish(shape) && !next.dimensions.radiusMm) {
    next.dimensions = { ...next.dimensions, radiusMm: Math.min(t.dimensions.lengthMm, t.dimensions.depthMm) / 2 };
  }
  if (shape === "custom" && !next.dimensions.customPoints?.length) {
    // Seed the custom polygon with the current bounding rectangle so the user edits FROM something.
    const hw = t.dimensions.lengthMm / 2;
    const hd = t.dimensions.depthMm / 2;
    next.dimensions = {
      ...next.dimensions,
      customPoints: [
        { x: -hw, y: -hd }, { x: hw, y: -hd }, { x: hw, y: hd }, { x: -hw, y: hd },
      ],
    };
  }
  return clampTable(next, t);
}

/** Every accessory the UI offers, with a flag for whether this table already has it. */
export function accessoryState(t: CabinTable) {
  return ACCESSORIES.filter((a) => a.isActive).map((def) => ({
    def,
    fitted: t.accessories.find((a) => a.accessoryId === def.id) ?? null,
  }));
}

/** Convenience: is this type one whose seat count should be auto-suggested from the size? */
export function autoSeats(t: CabinTable): number {
  const def: TableTypeDef = findTableType(t.tableTypeId);
  if (def.seatingModel === "perimeter") {
    return suggestSeating(t.shape, t.dimensions.lengthMm, t.dimensions.depthMm,
      t.conference?.chairSpacingMm ?? 700);
  }
  if (def.seatingModel === "workstation") return t.workstation?.users ?? 1;
  if (def.seatingModel === "single") return 1;
  if (def.seatingModel === "counter") return t.seating.capacity || 1;
  return 0;
}
