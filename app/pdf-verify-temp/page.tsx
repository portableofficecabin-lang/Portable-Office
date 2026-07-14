"use client";

/**
 * TEMPORARY verification harness — NOT part of the product. Deleted before the final build.
 *
 * Mounts the REAL admin drawing sheets (same components, same export buttons) on a public route so
 * a headless browser can click "Download Drawing PDF" and the resulting PDF can be inspected.
 * The root layout renders <html class="dark">, so this page exercises the exact dark-mode case that
 * the light-theme forcing is supposed to fix.
 */

import { useMemo } from "react";
import CabinCalculator from "@/components/home/cabin-calculator/CabinCalculator";
import CabinQuotation from "@/views/admin/CabinQuotation";
import { ConstructionDrawingTab } from "@/components/admin/labour-colony/ConstructionDrawingTab";
import {
  calculateLabourColony,
  type LabourColonyConfig,
  type LabourColonyResult,
} from "@/lib/quotation/labourColony";
import {
  calculateCivilWork,
  DEFAULT_CIVIL_CONFIG,
  type CivilContext,
} from "@/lib/quotation/labourColonyCivil";
import { buildConstructionPlan } from "@/lib/quotation/labourColonyPlan";

const COLONY_CONFIG: LabourColonyConfig = {
  projectName: "PDF Verify Colony",
  location: "Bengaluru",
  personsPerRoom: 8,
  capacity: 100,
  totalRooms: undefined,
  floors: 2,
  roomLength: 6,
  roomWidth: 3,
  roomHeight: 2.7,
  corridorWidth: 1.5,
  corridorPosition: "center",
  staircasePosition: "both",
  panelType: "PUF",
  panelThicknessMm: 50,
  wastagePercent: 5,
  facilities: { toilet: true, bunkBeds: true, diningKitchen: true, officeSecurity: true },
};

// Same context builder the real LabourColonyQuotation view uses.
function buildCivilCtx(result: LabourColonyResult): CivilContext {
  const rpf = Math.max(1, Math.ceil(result.occupancy.rooms / Math.max(1, result.config.floors)));
  const plan = buildConstructionPlan(result.config, { roomsPerFloor: rpf, startRoomNo: 1 });
  return {
    footprintLengthM: result.area.footprintLengthM,
    footprintWidthM: result.area.footprintWidthM,
    builtUpSqm: result.area.builtUpTotalSqm,
    floors: result.config.floors,
    wcCount: result.occupancy.wc,
    bathCount: result.occupancy.baths,
    totalCapacity: result.occupancy.totalCapacity,
    diningKitchen: result.config.facilities.diningKitchen,
    columnGrid: { xsM: plan.colXs, ysM: plan.rowYs },
  };
}

export default function PdfVerifyPage() {
  const result = useMemo(() => calculateLabourColony(COLONY_CONFIG), []);
  const civil = useMemo(() => calculateCivilWork(DEFAULT_CIVIL_CONFIG, buildCivilCtx(result)), [result]);

  return (
    <main className="p-6 space-y-16">
      <section id="cabin-harness">
        <h1 className="mb-4 text-xl font-bold">Cabin drawing (admin tools)</h1>
        <CabinCalculator adminTools />
      </section>

      <section id="colony-harness">
        <h1 className="mb-4 text-xl font-bold">Labour colony construction drawing</h1>
        <ConstructionDrawingTab
          config={COLONY_CONFIG}
          rooms={result.occupancy.rooms}
          floors={COLONY_CONFIG.floors}
          civil={civil}
        />
      </section>

      <section id="quotation-harness">
        <h1 className="mb-4 text-xl font-bold">Cabin quotation (2D plan SVG uses theme tokens)</h1>
        <CabinQuotation />
      </section>
    </main>
  );
}
