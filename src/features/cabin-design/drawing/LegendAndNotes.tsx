"use client";

/**
 * 2D ENGINEERING SHEETS — material legend + notes sheet (spec §1).
 *
 * MaterialLegend maps each component family present in the model to its drawing colour and (when the
 * live BOQ has priced it) its material. NotesSheet carries the standard general/fabrication notes.
 * Both are literal-hex DOM blocks so they rasterise into the export set. Notes are generic
 * fabrication conventions — nothing product-specific is invented.
 */

import type { CabinModel, CabinPart, PartKind } from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { boqForPart } from "@/features/cabin-design/inspector/boqLink";

const KIND_LABEL: Partial<Record<PartKind, string>> = {
  "base-frame": "Base frame", joist: "Floor joists", column: "Posts / columns", stud: "Wall studs",
  rail: "Framing rails", "roof-frame": "Roof frame / ridge", "lifting-hook": "Lifting hooks",
  "floor-board": "Floor deck", "floor-finish": "Floor finish", "ext-panel": "External wall skin",
  insulation: "Insulation", "int-finish": "Internal lining", "roof-sheet": "Roof sheet", ceiling: "Ceiling",
  partition: "Partitions", door: "Doors", window: "Windows", light: "Lights", fan: "Fans",
  socket: "Sockets", switch: "Switch boards", "electrical-panel": "Distribution board",
  "plumbing-fixture": "Plumbing fixtures", toilet: "Toilets", pantry: "Pantry", furniture: "Furniture",
};

export function MaterialLegend({ model, boqResult }: { model: CabinModel; boqResult?: BoqResult | null }) {
  const byKind = new Map<PartKind, CabinPart>();
  for (const p of model.parts) if (!byKind.has(p.kind)) byKind.set(p.kind, p);
  const rows = Array.from(byKind.values())
    .filter((p) => KIND_LABEL[p.kind])
    .sort((a, b) => a.assemblyStep - b.assemblyStep);

  const td: React.CSSProperties = { padding: "3px 8px", fontSize: 11, color: "#334155", borderBottom: "1px solid #e2e8f0" };
  const th: React.CSSProperties = { textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff" }}>
      <thead><tr><th style={th}></th><th style={th}>Component</th><th style={th}>Material (live BOQ)</th><th style={th}>Step</th></tr></thead>
      <tbody>
        {rows.map((p) => {
          const boq = boqForPart(p, boqResult);
          return (
            <tr key={p.kind}>
              <td style={{ ...td, width: 26 }}><span style={{ display: "inline-block", width: 16, height: 12, background: p.colorHex, border: "1px solid #94a3b8", borderRadius: 2 }} /></td>
              <td style={{ ...td, fontWeight: 600 }}>{KIND_LABEL[p.kind]}</td>
              <td style={td}>{boq?.material ?? "—"}</td>
              <td style={td}>{p.assemblyStep}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const NOTES = [
  "All dimensions are in feet-inches unless noted otherwise; verify all dimensions on site before fabrication.",
  "Structural sections, grades, weights and rates are taken from the Material BOQ and Material Master — refer to the BOQ for the priced schedule.",
  "All steel members to be cut to the lengths in the cutting list; welds continuous unless a detail states otherwise.",
  "Wall / roof sheets and internal lining fixed with self-drilling fasteners at manufacturer's recommended spacing.",
  "Insulation to be provided only where specified in the design; PUF panels are inherently insulated.",
  "Door and window sizes, locations and operation are per the Door & Window Schedule.",
  "Electrical and plumbing points are indicative locations from the design; final positions per site coordination.",
  "This is a schematic reference generated from the cabin design calculator — NOT a stamped structural drawing and NOT for construction.",
];

export function NotesSheet() {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>General Notes</div>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {NOTES.map((n, i) => (
          <li key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 4, lineHeight: 1.5 }}>{n}</li>
        ))}
      </ol>
    </div>
  );
}
