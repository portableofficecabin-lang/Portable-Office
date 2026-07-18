"use client";

/**
 * 2D ENGINEERING SHEETS — CAD title block (spec §8).
 *
 * A professional drawing-register title block: project + customer, drawing number / revision / date,
 * drawn / checked / approved, company identity + logo, and scale. Rendered as the first
 * `.cabin-drawing-block` of the exported set so every plate carries the register. Literal-hex inline
 * styles + the plain <img> logo so it rasterises cleanly through html2canvas-pro.
 */

import logo from "@/assets/logo.webp";
import { COMPANY } from "@/lib/company";
import type { CabinDrawingMeta } from "@/features/cabin-design/model/types";

const cell: React.CSSProperties = { border: "1px solid #0f172a", padding: "4px 8px", fontSize: 10, color: "#0f172a" };
const lbl: React.CSSProperties = { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" };
const val: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#0f172a" };

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div style={cell}>
      <div style={lbl}>{label}</div>
      <div style={val}>{value || "—"}</div>
    </div>
  );
}

export function CabinTitleBlock({ meta }: { meta: CabinDrawingMeta }) {
  return (
    <section className="cabin-drawing-block" style={{ marginBottom: 18 }}>
      <div style={{ border: "2px solid #0f172a", background: "#ffffff" }}>
        {/* header band */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", borderBottom: "2px solid #0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={(logo as { src: string }).src} alt="" width={38} height={38} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: "0.02em" }}>{COMPANY.legalName}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>GSTIN {COMPANY.gstin} · {COMPANY.domain}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Drawing</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{meta.drawingNumber || "CBN-DWG-001"}</div>
          </div>
        </div>

        {/* title row */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 12px", borderBottom: "1px solid #0f172a" }}>
          <div>
            <div style={lbl}>Project</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{meta.projectName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={lbl}>Customer</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{meta.customerName || "—"}</div>
          </div>
        </div>

        {/* register grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <Field label="Date" value={meta.date} />
          <Field label="Revision" value={meta.revision || "R0"} />
          <Field label="Scale" value={meta.scale || "NTS"} />
          <Field label="Sheet" value="Cabin drawing set" />
          <Field label="Drawn by" value={meta.drawnBy} />
          <Field label="Checked by" value={meta.checkedBy} />
          <Field label="Approved by" value={meta.approvedBy} />
          <Field label="Status" value="For review" />
        </div>
      </div>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Schematic reference generated from the cabin design calculator — not a stamped structural drawing.
      </div>
    </section>
  );
}
