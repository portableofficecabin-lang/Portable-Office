"use client";

/**
 * LABOUR COLONY — REFERENCE GA DRAWING: the sheet's CAD title block.
 *
 * The strip that closes a tender drawing, laid out the way the reference sheet lays it out:
 *
 *   ┌ Released For ─┬ Contractor ─┬ Client ────┬ Title ─────────────┬ Sheet ┐
 *   │ ☑ Preliminary │ our address │ the client │ General Arrangement│   1   │
 *   │ ☐ Tender  …   │             │            │ Layout             │       │
 *   ├───────────────┼─────────────┴────────────┼────────────────────┼───────┤
 *   │ Size L/W/H    │ Drawing no.              │ Name·Sign·Date     │ Rev   │
 *   └───────────────┴──────────────────────────┴────────────────────┴───────┘
 *
 * Every value is passed in — the block invents nothing. The EPC-contractor cell is our own verified
 * identity from `COMPANY` (never a hardcoded duplicate), the size cells are the model's own overall
 * dimensions, and the issue status is whatever the admin selected.
 *
 * Literal-hex inline colours only (html2canvas cannot resolve Tailwind's oklch tokens); layout-only
 * utility classes are fine.
 */

import { COMPANY, formatAddress } from "@/lib/company";

const C = {
  ink: "#0f172a",
  slate: "#334155",
  note: "#64748b",
  rule: "#0f172a",
  line: "#cbd5e1",
  paper: "#ffffff",
  wash: "#f8fafc",
};

/** The five issue statuses a tender drawing is released under. */
export const RELEASED_FOR = ["Preliminary", "Tender", "Information", "Approval", "Construction"] as const;
export type ReleasedFor = (typeof RELEASED_FOR)[number];

export interface ReferenceTitleBlockMeta {
  projectName: string;
  clientName: string;
  location: string;
  /** "General Arrangement Layout" */
  title: string;
  drawingNumber: string;
  revision: string;
  scale: string;
  sheet: string;
  date: string;
  releasedFor: ReleasedFor;
  designedBy: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  /** Overall building size, already formatted in metres by the caller. */
  lengthLabel: string;
  widthLabel: string;
  heightLabel: string;
}

function Box({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: `1px solid ${C.rule}`, background: C.paper, display: "flex", flexDirection: "column", ...style }}>
      <div
        style={{
          borderBottom: `1px solid ${C.line}`, background: C.wash, color: C.note,
          fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 6px",
        }}
      >
        {label}
      </div>
      <div style={{ padding: "4px 6px", color: C.ink, fontSize: 11, flex: 1 }}>{children}</div>
    </div>
  );
}

/** A ballot box that is ticked for exactly the selected issue status. */
function Tick({ on, label }: { on: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: on ? C.ink : C.slate }}>
      <span
        style={{
          width: 11, height: 11, border: `1.2px solid ${C.ink}`, display: "inline-flex",
          alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, lineHeight: 1,
        }}
      >
        {on ? "✓" : ""}
      </span>
      <span style={{ fontWeight: on ? 700 : 400 }}>{label}</span>
    </div>
  );
}

/** The first-angle projection symbol — the truncated cone pair every Indian GA sheet carries. */
function ProjectionSymbol() {
  return (
    <svg viewBox="0 0 62 26" width={62} height={26} role="img" aria-label="First angle projection">
      <polygon points="4,4 4,22 20,17 20,9" fill="none" stroke={C.ink} strokeWidth={1} />
      <line x1="4" y1="13" x2="20" y2="13" stroke={C.ink} strokeWidth={0.5} strokeDasharray="3 2" />
      <circle cx="42" cy="13" r="9" fill="none" stroke={C.ink} strokeWidth={1} />
      <circle cx="42" cy="13" r="4" fill="none" stroke={C.ink} strokeWidth={1} />
      <line x1="31" y1="13" x2="53" y2="13" stroke={C.ink} strokeWidth={0.5} strokeDasharray="3 2" />
    </svg>
  );
}

export function ReferenceTitleBlock({ meta }: { meta: ReferenceTitleBlockMeta }) {
  const rows: { role: string; name: string }[] = [
    { role: "DSGN", name: meta.designedBy },
    { role: "DRWN", name: meta.drawnBy },
    { role: "CHKD", name: meta.checkedBy },
    { role: "APPD", name: meta.approvedBy },
  ];

  return (
    <div style={{ border: `1.6px solid ${C.rule}`, background: C.paper }}>
      {/* ── upper band: status · contractor · client · title · sheet ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,1fr) minmax(180px,1.3fr) minmax(160px,1.2fr) minmax(160px,1.2fr) 76px" }}>
        <Box label="Released for">
          <div style={{ display: "grid", gap: 2 }}>
            {RELEASED_FOR.map((r) => (
              <Tick key={r} on={r === meta.releasedFor} label={r} />
            ))}
          </div>
        </Box>

        <Box label="EPC contractor / manufacturer">
          <div style={{ fontWeight: 700, fontSize: 11 }}>{COMPANY.legalName}</div>
          <div style={{ fontSize: 8.5, color: C.slate, lineHeight: 1.35, marginTop: 2 }}>
            {formatAddress(COMPANY.addresses.tamilNaduFactory)}
          </div>
          <div style={{ fontSize: 8.5, color: C.slate, marginTop: 2 }}>
            GSTIN {COMPANY.gstin} · {COMPANY.phones.map((p) => p.display).join(" / ")}
          </div>
        </Box>

        <Box label="Client">
          <div style={{ fontWeight: 700 }}>{meta.clientName || "—"}</div>
          <div style={{ fontSize: 9, color: C.slate, marginTop: 3 }}>{meta.projectName || "—"}</div>
          <div style={{ fontSize: 9, color: C.note }}>{meta.location || "—"}</div>
        </Box>

        <Box label="Title">
          <div style={{ fontWeight: 700 }}>{meta.title}</div>
          <div style={{ fontSize: 9, color: C.slate, marginTop: 3 }}>Scale {meta.scale || "NTS"}</div>
          <div style={{ marginTop: 3 }}><ProjectionSymbol /></div>
        </Box>

        <Box label="Sheet">
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>
            {meta.sheet}
          </div>
        </Box>
      </div>

      {/* ── lower band: size · drawing no · sign-off grid · revision ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,1fr) minmax(180px,1.3fr) minmax(320px,2.4fr) 76px", borderTop: `1px solid ${C.rule}` }}>
        <Box label="Size">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", textAlign: "center", gap: 2 }}>
            {[["Length", meta.lengthLabel], ["Width", meta.widthLabel], ["Height", meta.heightLabel]].map(([k, v]) => (
              <div key={k} style={{ border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, padding: "1px 0" }}>{v}</div>
                <div style={{ fontSize: 7.5, color: C.note, borderTop: `1px solid ${C.line}` }}>{k}</div>
              </div>
            ))}
          </div>
        </Box>

        <Box label="Drawing no.">
          <div style={{ fontWeight: 700, fontSize: 11, wordBreak: "break-word" }}>{meta.drawingNumber || "—"}</div>
          <div style={{ fontSize: 9, color: C.slate, marginTop: 3 }}>Project: {meta.projectName || "—"}</div>
        </Box>

        <Box label="Prepared / checked / approved">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["", "Name", "Sign.", "Date"].map((h) => (
                  <th key={h} style={{ fontSize: 7.5, color: C.note, textAlign: "left", borderBottom: `1px solid ${C.line}`, padding: "1px 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.role}>
                  <td style={{ fontSize: 8.5, fontWeight: 700, color: C.slate, padding: "1px 4px", borderBottom: `1px solid ${C.line}` }}>{r.role}</td>
                  <td style={{ fontSize: 9.5, color: C.ink, padding: "1px 4px", borderBottom: `1px solid ${C.line}` }}>{r.name || "—"}</td>
                  <td style={{ padding: "1px 4px", borderBottom: `1px solid ${C.line}`, minWidth: 52 }} />
                  <td style={{ fontSize: 9, color: C.slate, padding: "1px 4px", borderBottom: `1px solid ${C.line}` }}>{r.name ? meta.date : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <Box label="Revision">
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
            {meta.revision || "0"}
          </div>
        </Box>
      </div>
    </div>
  );
}
