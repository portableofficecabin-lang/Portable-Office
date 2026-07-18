"use client";

/**
 * MANUFACTURING OUTPUTS (spec §7) — all DERIVED from the live BoqResult, never recalculated.
 *
 * Steel/tube cutting list, sheet nesting, a fabrication/welding basis, paint & sealant, hardware,
 * and the electrical / plumbing / furniture schedules — each a grouping of the already-priced BOQ
 * lines the Material BOQ produced. Because it reads the shared live result, every figure matches the
 * BOQ and updates when a rate/quantity changes. Literal-hex so it exports through the sheet pipeline.
 */

import type { BoqLine, BoqResult, CuttingRow } from "@/lib/boq/types";

const th: React.CSSProperties = { textAlign: "left", padding: "3px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "3px 8px", fontSize: 11, color: "#334155", borderBottom: "1px solid #e2e8f0" };
const num = (n: number | null | undefined, dp = 0) => (n == null || !isFinite(n) ? "—" : n.toFixed(dp));
const kg = (n: number) => `${n.toFixed(1)} kg`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cabin-drawing-block" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      {children}
    </section>
  );
}

function LineTable({ lines, extra }: { lines: BoqLine[]; extra?: "area" | "length" }) {
  if (!lines.length) return <div style={{ fontSize: 11, color: "#94a3b8" }}>None</div>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
      <thead><tr>
        <th style={th}>Item</th><th style={th}>Spec</th><th style={th}>Qty</th>
        {extra === "area" && <th style={th}>Area m²</th>}
        {extra === "length" && <th style={th}>Length m</th>}
        <th style={th}>Weight</th>
      </tr></thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.id}>
            <td style={{ ...td, fontWeight: 600 }}>{l.description || l.material}</td>
            <td style={td}>{l.spec}</td>
            <td style={td}>{num(l.qty, 0)} {l.uom}</td>
            {extra === "area" && <td style={td}>{num(l.netAreaSqm, 2)}</td>}
            {extra === "length" && <td style={td}>{num(l.runningLengthM ?? l.cutLengthM, 2)}</td>}
            <td style={td}>{kg(l.totalWeightKg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CuttingTable({ rows }: { rows: CuttingRow[] }) {
  if (!rows.length) return <div style={{ fontSize: 11, color: "#94a3b8" }}>None</div>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
      <thead><tr><th style={th}>Member</th><th style={th}>Section</th><th style={th}>Cut length m</th><th style={th}>Qty</th><th style={th}>Total m</th><th style={th}>Weight</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...td, fontWeight: 600 }}>{r.member}</td>
            <td style={td}>{r.spec}</td>
            <td style={td}>{num(r.cutLengthM, 3)}</td>
            <td style={td}>{r.qty}</td>
            <td style={td}>{num(r.totalLengthM, 2)}</td>
            <td style={td}>{kg(r.weightKg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ManufacturingReport({ boqResult }: { boqResult?: BoqResult | null }) {
  if (!boqResult) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Open the Material BOQ panel below (any step past Product) to compute the manufacturing quantities — they appear here automatically.
      </div>
    );
  }
  const lines = boqResult.lines.filter((l) => l.enabled);
  const inSection = (...s: string[]) => lines.filter((l) => s.includes(l.section));
  const steelCut = boqResult.cuttingList;
  const sheetLines = lines.filter((l) => l.category === "sheet" || l.category === "panel");
  const hardware = lines.filter((l) => l.category === "hardware" || l.section === "misc");
  const finishing = inSection("finishing");
  const electrical = inSection("electrical");
  const plumbing = inSection("plumbing");
  const furniture = inSection("furniture");

  const members = steelCut.reduce((a, r) => a + r.qty, 0);
  const cutM = steelCut.reduce((a, r) => a + r.totalLengthM, 0);

  return (
    <div>
      <Section title="Fabrication summary (welding basis)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, fontSize: 12 }}>
          <div>Steel members to cut: <b>{members}</b></div>
          <div>Total cut length: <b>{cutM.toFixed(1)} m</b></div>
          <div>Steel weight: <b>{boqResult.totals.totalSteelKg.toFixed(0)} kg</b></div>
          <div>Total weight: <b>{boqResult.totals.totalWeightKg.toFixed(0)} kg ({boqResult.totals.totalTonnes.toFixed(2)} t)</b></div>
          <div>Weld connections (indicative): <b>~{members}</b></div>
          <div>Sheet/panel items: <b>{sheetLines.reduce((a, l) => a + (l.sheets ?? 0), 0)}</b></div>
        </div>
      </Section>

      <Section title="Steel / tube cutting list"><CuttingTable rows={steelCut} /></Section>
      <Section title="Sheet cutting & nesting"><LineTable lines={sheetLines} extra="area" /></Section>
      <Section title="Paint, primer & sealant"><LineTable lines={finishing} extra="area" /></Section>
      <Section title="Hardware & fasteners"><LineTable lines={hardware} /></Section>
      <Section title="Electrical schedule"><LineTable lines={electrical} /></Section>
      <Section title="Plumbing schedule"><LineTable lines={plumbing} /></Section>
      <Section title="Furniture schedule"><LineTable lines={furniture} /></Section>
    </div>
  );
}
