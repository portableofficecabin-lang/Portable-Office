"use client";

/**
 * 2D ENGINEERING SHEETS — the composed set (spec §1 + §3 + §6).
 *
 * The full cabin drawing set, each sheet in its own `.cabin-drawing-block` so the existing
 * sheet→PDF exporter paginates cleanly between plates. Every sheet is generated from the SAME shared
 * model / config (and the live BOQ for the legend), so all views stay synchronized. The rich Floor
 * Plan reuses the calculator's existing ModulePlan (no duplication).
 *
 * Engineering mode shows the full technical set; Customer mode shows a clean, non-technical subset.
 */

import { ModulePlan } from "@/components/home/cabin-calculator/ModulePlan";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel, ViewMode } from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { CabinPlanSheet } from "./CabinPlanSheet";
import { CabinSection } from "./CabinSection";
import { DoorWindowSchedule } from "./DoorWindowSchedule";
import { ElevationSheet } from "./ElevationSheet";
import { MaterialLegend, NotesSheet } from "./LegendAndNotes";

function Heading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: "#0f172a" }}>{children}</h4>;
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cabin-drawing-block" style={{ marginBottom: 20 }}>
      <Heading>{title}</Heading>
      {children}
    </section>
  );
}

export interface EngineeringSheetsProps {
  model: CabinModel;
  config: CabinConfig;
  viewMode: ViewMode;
  boqResult?: BoqResult | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

export function EngineeringSheets({ model, config, viewMode, boqResult, selectedId, onSelect }: EngineeringSheetsProps) {
  const hasPlumbing = model.parts.some((p) => p.layer === "plumbing");
  const hasFurniture = model.parts.some((p) => p.layer === "furniture");
  const engineering = viewMode === "engineering";
  const sel = { selectedId, onSelect };

  return (
    <div>
      {/* General Arrangement — the lead overview drawing (rich existing plan) */}
      <Block title="General Arrangement">
        <ModulePlan config={config} />
      </Block>

      <Block title="Floor Plan">
        <CabinPlanSheet model={model} config={config} show={["furniture", "openings"]} title="Floor plan — rooms, openings & layout" {...sel} />
      </Block>

      {/* Elevations */}
      {(["front", "rear", "left", "right"] as const).map((face) => (
        <Block key={face} title={`${face[0].toUpperCase()}${face.slice(1)} Elevation`}>
          <ElevationSheet model={model} config={config} face={face} viewMode={viewMode} {...sel} />
        </Block>
      ))}

      {engineering && (
        <>
          <Block title="Base Frame Layout">
            <CabinPlanSheet model={model} config={config} show={["structure"]} kinds={["base-frame", "joist"]} title="Bottom structural frame + floor joists" {...sel} />
          </Block>
          <Block title="Roof Frame Layout">
            <CabinPlanSheet model={model} config={config} show={["structure"]} kinds={["roof-frame", "lifting-hook"]} title="Top frame, ridge & lifting hooks" {...sel} />
          </Block>
          <Block title="Wall Framing Layout">
            <CabinPlanSheet model={model} config={config} show={["structure"]} kinds={["column", "stud", "rail"]} title="Posts, studs & framing rails" {...sel} />
          </Block>
        </>
      )}

      <Block title="Roof Plan">
        <CabinPlanSheet model={model} config={config} show={[]} roof title="Roof plan — ridge & rainwater fall" {...sel} />
      </Block>

      {engineering && (
        <>
          <Block title="Cross Section">
            <CabinSection model={model} config={config} axis="width" />
          </Block>
          <Block title="Longitudinal Section">
            <CabinSection model={model} config={config} axis="length" />
          </Block>
          <Block title="Partition Layout">
            <CabinPlanSheet model={model} config={config} show={["walls", "openings"]} kinds={["partition", "door"]} title="Internal partitions + doorways" {...sel} />
          </Block>
        </>
      )}

      {/* Full electrical + socket schedules are engineering detail; customer mode keeps the
          friendlier lighting reflected plan only. */}
      {engineering && (
        <Block title="Electrical Layout">
          <CabinPlanSheet model={model} config={config} show={["electrical"]} title="All electrical points, sockets, switches & DB" {...sel} />
        </Block>
      )}
      <Block title="Lighting Layout">
        <CabinPlanSheet model={model} config={config} show={["electrical"]} kinds={["light", "fan"]} title="Lights & fans (reflected)" {...sel} />
      </Block>
      {engineering && (
        <Block title="Socket Layout">
          <CabinPlanSheet model={model} config={config} show={["electrical"]} kinds={["socket", "switch", "electrical-panel"]} title="Sockets, switch boards & DB" {...sel} />
        </Block>
      )}

      {hasPlumbing && (
        <Block title="Plumbing Layout">
          <CabinPlanSheet model={model} config={config} show={["plumbing"]} title="Wet fixtures & toilets" {...sel} />
        </Block>
      )}
      {hasFurniture && (
        <Block title="Furniture Layout">
          <CabinPlanSheet model={model} config={config} show={["furniture"]} title="Furniture & accessories arrangement" {...sel} />
        </Block>
      )}

      <Block title="Door & Window Schedule">
        <DoorWindowSchedule config={config} {...sel} />
      </Block>

      {engineering && (
        <Block title="Material Legend">
          <MaterialLegend model={model} boqResult={boqResult} />
        </Block>
      )}

      <Block title="Notes">
        <NotesSheet />
      </Block>
    </div>
  );
}
