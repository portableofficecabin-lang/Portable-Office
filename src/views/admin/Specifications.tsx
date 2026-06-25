"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, FileDown, Copy, FileText, RefreshCw, Pencil, Save, Printer, Eye,
  EyeOff, ArrowUp, ArrowDown, Sparkles, Layers, ListPlus,
} from "lucide-react";
import jsPDF from "jspdf";
import { addLegalFooter } from "@/lib/pdfFooter";
import { imageToPngDataUrl } from "@/lib/pdf/imageToPng";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.webp";
import signatureSealUrl from "@/assets/signature-seal.webp";
import {
  EMBASSY_360_TEMPLATE,
  type SpecBlock,
  type SpecRow,
  type SpecSection,
} from "@/data/specTemplates";

type SavedSpec = {
  id: string;
  client_name: string | null;
  project_details: string | null;
  doc_date: string | null;
  ref_number: string | null;
  sections: SpecSection[];
  created_at: string;
};

type WatermarkKey = "company" | "draft" | "approved" | "paid";
type Watermarks = Record<WatermarkKey, boolean>;

const uid = () => Math.random().toString(36).slice(2, 9);

const COMPANY_NAME = "PORTABLE OFFICE CABIN";

const APPROVAL_ROLES = [
  "Managing Director (MD) / Director",
  "CEO / General Manager",
  "Purchase Manager / Procurement Manager",
  "Commercial Manager",
  "Project Manager",
  "Contracts Manager",
  "Operations Manager",
] as const;
type ApprovalRole = (typeof APPROVAL_ROLES)[number];

const DEFAULT_WATERMARKS: Watermarks = { company: false, draft: true, approved: false, paid: false };

const DEFAULT_SECTIONS: SpecSection[] = [
  {
    id: uid(),
    kind: "item",
    title: "General Details",
    rows: [
      { id: uid(), label: "Cabin Type", value: "" },
      { id: uid(), label: "Overall Size (L x W x H)", value: "" },
      { id: uid(), label: "Application", value: "" },
      { id: uid(), label: "Quantity", value: "" },
    ],
    blocks: [],
  },
  {
    id: uid(),
    kind: "item",
    title: "Structural Framework",
    rows: [
      { id: uid(), label: "Main Frame", value: "MS Hollow Section / ISMC Channel" },
      { id: uid(), label: "Frame Thickness", value: "" },
      { id: uid(), label: "Anti-Corrosion Treatment", value: "Red Oxide Primer + Enamel Paint" },
    ],
    blocks: [],
  },
  {
    id: uid(),
    kind: "item",
    title: "Wall Construction",
    rows: [
      { id: uid(), label: "Outer Wall", value: "GI / PPGI Pre-coated Sheet (0.50 mm)" },
      { id: uid(), label: "Inner Wall", value: "GI Sheet / PVC Panel" },
      { id: uid(), label: "Insulation Core", value: "PUF / Rockwool / Thermocol" },
      { id: uid(), label: "Total Wall Thickness", value: "50 mm / 75 mm" },
    ],
    blocks: [],
  },
];

// Brand colors (RGB)
const BRAND_DARK: [number, number, number] = [62, 47, 47];
const BRAND_OLIVE: [number, number, number] = [124, 126, 90];
const TEXT_GRAY: [number, number, number] = [68, 68, 68];
const LINE_GRAY: [number, number, number] = [154, 154, 138];

// CSS equivalents for the on-screen preview
const CSS_DARK = "rgb(62,47,47)";
const CSS_OLIVE = "rgb(124,126,90)";
const CSS_TEXT = "rgb(68,68,68)";

// Normalise sections coming from DB / templates so optional fields always exist.
function normalizeSections(raw: unknown): SpecSection[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((sec: Partial<SpecSection>) => ({
    id: sec.id || uid(),
    kind: sec.kind === "part" ? "part" : "item",
    number: typeof sec.number === "string" ? sec.number : undefined,
    title: sec.title || "",
    rows: Array.isArray(sec.rows)
      ? sec.rows.map((r: Partial<SpecRow>) => ({
          id: r.id || uid(),
          label: r.label || "",
          value: r.value || "",
        }))
      : [],
    blocks: Array.isArray(sec.blocks)
      ? sec.blocks.map((b: Partial<SpecBlock>) => ({
          id: b.id || uid(),
          heading: b.heading || "",
          bullets: Array.isArray(b.bullets) ? b.bullets.filter((x) => typeof x === "string") : [],
        }))
      : [],
  }));
}

// Display number for an item: explicit number wins; empty string = no number;
// undefined (legacy) falls back to position-based auto numbering.
function displayPrefix(section: SpecSection, index: number): string {
  if (section.kind === "part") return "";
  if (typeof section.number === "string") {
    const t = section.number.trim();
    return t ? `${t}. ` : "";
  }
  return `${index + 1}. `;
}

export default function AdminSpecifications() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [refNumber, setRefNumber] = useState("");
  const [sections, setSections] = useState<SpecSection[]>(DEFAULT_SECTIONS);
  const [generating, setGenerating] = useState(false);
  const [savedSpecs, setSavedSpecs] = useState<SavedSpec[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Watermark + approver — remembered per document via localStorage (matches the
  // Quotation Pro behaviour). Keyed by the editing id (or "new" while unsaved).
  const wmKey = `poc_spec_wm_${editingId || "new"}`;
  const apprKey = `poc_spec_appr_${editingId || "new"}`;
  const [watermarks, setWatermarks] = useState<Watermarks>(DEFAULT_WATERMARKS);
  const [approver, setApproverState] = useState<ApprovalRole | null>(null);

  // Restore watermark + approver whenever the active document changes.
  useEffect(() => {
    try {
      const w = localStorage.getItem(wmKey);
      setWatermarks(w ? { ...DEFAULT_WATERMARKS, ...JSON.parse(w) } : DEFAULT_WATERMARKS);
      const a = localStorage.getItem(apprKey);
      setApproverState(a && (APPROVAL_ROLES as readonly string[]).includes(a) ? (a as ApprovalRole) : null);
    } catch {
      setWatermarks(DEFAULT_WATERMARKS);
      setApproverState(null);
    }
  }, [wmKey, apprKey]);

  const toggleWm = (k: WatermarkKey) =>
    setWatermarks((w) => {
      const next = { ...w, [k]: !w[k] };
      try {
        localStorage.setItem(wmKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const setApprover = (role: ApprovalRole | null) => {
    setApproverState(role);
    try {
      if (role) localStorage.setItem(apprKey, role);
      else localStorage.removeItem(apprKey);
    } catch {
      /* ignore */
    }
  };

  const fetchSaved = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const { data, error } = await supabase
        .from("spec_documents")
        .select("id, client_name, project_details, doc_date, ref_number, sections, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSavedSpecs((data || []) as unknown as SavedSpec[]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load saved specifications",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const resetForm = () => {
    setEditingId(null);
    setClientName("");
    setProjectDetails("");
    setDocDate(new Date().toISOString().slice(0, 10));
    setRefNumber("");
    setSections(normalizeSections(DEFAULT_SECTIONS));
  };

  const loadTemplate = () => {
    setEditingId(null);
    setClientName(EMBASSY_360_TEMPLATE.client_name);
    setProjectDetails(EMBASSY_360_TEMPLATE.project_details);
    setDocDate(new Date().toISOString().slice(0, 10));
    setRefNumber(EMBASSY_360_TEMPLATE.ref_number);
    // Deep-copy with fresh ids so editing the template doesn't mutate the constant.
    setSections(normalizeSections(JSON.parse(JSON.stringify(EMBASSY_360_TEMPLATE.sections))));
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({
      title: "Template loaded",
      description: `${EMBASSY_360_TEMPLATE.label} is ready — review, then Save & Download.`,
    });
  };

  const loadSaved = (s: SavedSpec) => {
    setEditingId(s.id);
    setClientName(s.client_name || "");
    setProjectDetails(s.project_details || "");
    setDocDate(s.doc_date || new Date().toISOString().slice(0, 10));
    setRefNumber(s.ref_number || "");
    const restored = normalizeSections(s.sections);
    setSections(restored.length > 0 ? restored : normalizeSections(DEFAULT_SECTIONS));
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({ title: "Loaded", description: "Specification loaded for editing." });
  };

  const deleteSaved = async (id: string) => {
    if (!confirm("Delete this specification record? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("spec_documents").delete().eq("id", id);
      if (error) throw error;
      setSavedSpecs((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
      toast({ title: "Deleted", description: "Specification record removed." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // ---- Section mutations ----
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: uid(), kind: "item", number: "", title: "New Section", rows: [{ id: uid(), label: "", value: "" }], blocks: [] },
    ]);
  };

  const addPart = () => {
    setSections((prev) => [
      ...prev,
      { id: uid(), kind: "part", number: "", title: "New Part / Divider", rows: [], blocks: [] },
    ]);
  };

  const removeSection = (sid: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sid));
  };

  const duplicateSection = (sid: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      if (idx < 0) return prev;
      const original = prev[idx];
      const copy: SpecSection = {
        ...original,
        id: uid(),
        title: original.title + " (Copy)",
        rows: original.rows.map((r) => ({ ...r, id: uid() })),
        blocks: (original.blocks || []).map((b) => ({ ...b, id: uid(), bullets: [...b.bullets] })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const updateSection = (sid: string, patch: Partial<SpecSection>) => {
    setSections((prev) => prev.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  };

  const moveSection = (sid: string, dir: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      const ni = idx + dir;
      if (idx < 0 || ni < 0 || ni >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  };

  // ---- Row mutations ----
  const addRow = (sid: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, rows: [...s.rows, { id: uid(), label: "", value: "" }] } : s)),
    );

  const removeRow = (sid: string, rid: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, rows: s.rows.filter((r) => r.id !== rid) } : s)),
    );

  const updateRow = (sid: string, rid: string, field: "label" | "value", val: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, rows: s.rows.map((r) => (r.id === rid ? { ...r, [field]: val } : r)) } : s,
      ),
    );

  // ---- Block mutations ----
  const addBlock = (sid: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, blocks: [...(s.blocks || []), { id: uid(), heading: "", bullets: [] }] } : s,
      ),
    );

  const removeBlock = (sid: string, bid: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, blocks: (s.blocks || []).filter((b) => b.id !== bid) } : s)),
    );

  const updateBlockHeading = (sid: string, bid: string, heading: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, blocks: (s.blocks || []).map((b) => (b.id === bid ? { ...b, heading } : b)) }
          : s,
      ),
    );

  // Bullets are edited as one-per-line text for fast entry.
  const updateBlockBullets = (sid: string, bid: string, text: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              blocks: (s.blocks || []).map((b) =>
                b.id === bid ? { ...b, bullets: text.split("\n") } : b,
              ),
            }
          : s,
      ),
    );

  const moveBlock = (sid: string, bid: string, dir: -1 | 1) =>
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        const blocks = [...(s.blocks || [])];
        const idx = blocks.findIndex((b) => b.id === bid);
        const ni = idx + dir;
        if (idx < 0 || ni < 0 || ni >= blocks.length) return s;
        [blocks[idx], blocks[ni]] = [blocks[ni], blocks[idx]];
        return { ...s, blocks };
      }),
    );

  // ---- PDF generation ----
  const generatePdf = async () => {
    try {
      setGenerating(true);
      const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginL = 18;
      const marginR = 18;
      const contentW = pageW - marginL - marginR;
      const contentTop = 50; // first body line below the letterhead
      const contentBottom = pageH - 18; // keep clear of the footer

      const logoData = await imageToPngDataUrl(logoUrl, { maxWidth: 220 });

      const drawHeader = () => {
        const logoSize = 22;
        if (logoData) {
          try {
            doc.addImage(logoData, "PNG", marginL, 18, logoSize, logoSize);
          } catch {
            /* ignore */
          }
        }
        doc.setTextColor(...BRAND_DARK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text(COMPANY_NAME, pageW / 2, 22, { align: "center" });

        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.4);
        doc.line(pageW / 2 - 35, 25, pageW / 2 - 5, 25);
        doc.line(pageW / 2 + 5, 25, pageW / 2 + 35, 25);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_GRAY);
        doc.text(
          "Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post,",
          pageW / 2,
          30,
          { align: "center" },
        );
        doc.text("Shoolagiri, Krishnagiri, Tamil Nadu – 635117", pageW / 2, 34, { align: "center" });

        doc.setTextColor(...BRAND_DARK);
        doc.text(
          "Phone: 9019910931 / 9731897976  |  Website: portableofficecabin.com  |  GST No: 33FVKPK6238Q1ZT",
          pageW / 2,
          39,
          { align: "center" },
        );

        doc.setDrawColor(...BRAND_DARK);
        doc.setLineWidth(0.5);
        doc.line(marginL, 43, pageW - marginR, 43);
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.2);
        doc.line(marginL, 44, pageW - marginR, 44);
      };

      const drawFooter = (pageNum: number, total: number) => {
        const fy = pageH - 14;
        doc.setDrawColor(...BRAND_DARK);
        doc.setLineWidth(0.4);
        doc.line(marginL, fy, pageW - marginR, fy);
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.2);
        doc.line(marginL, fy + 1, pageW - marginR, fy + 1);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_GRAY);
        doc.text("Portable Office Cabin  •  Premium Portable Cabins & Prefab Solutions", marginL, fy + 4.5);
        doc.text(`Page ${pageNum} of ${total}`, pageW - marginR, fy + 4.5, { align: "right" });
        doc.setTextColor(0, 0, 0);
      };

      let y = 0;
      const ensure = (h: number) => {
        if (y + h > contentBottom) {
          doc.addPage();
          drawHeader();
          y = contentTop;
        }
      };

      drawHeader();

      // Title
      y = 53;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...BRAND_DARK);
      doc.text("TECHNICAL SPECIFICATION", pageW / 2, y, { align: "center" });
      doc.setDrawColor(...BRAND_OLIVE);
      doc.setLineWidth(0.6);
      doc.line(pageW / 2 - 25, y + 1.5, pageW / 2 + 25, y + 1.5);
      y += 10;

      // Info block
      const info: [string, string][] = [
        ["Client Name", clientName || ""],
        ["Project Details", projectDetails || ""],
        ["Date", docDate || ""],
        ["Reference No.", refNumber || ""],
      ];
      doc.setFontSize(10);
      info.forEach(([k, v]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_DARK);
        doc.text(k, marginL, y + 5);
        doc.text(":", marginL + 38, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_GRAY);
        const lines = doc.splitTextToSize(v || "", contentW - 45);
        doc.text(lines, marginL + 42, y + 5);
        doc.setDrawColor(...LINE_GRAY);
        doc.setLineWidth(0.2);
        doc.line(marginL + 42, y + 6.5, pageW - marginR, y + 6.5);
        y += 8;
      });
      y += 4;

      // ---- Content renderers ----
      const drawPartBanner = (text: string) => {
        ensure(16);
        doc.setFillColor(...BRAND_DARK);
        doc.rect(marginL, y, contentW, 10, "F");
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.6);
        doc.line(marginL, y + 10, marginL + contentW, y + 10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(text, marginL + contentW / 2, y + 6.6, { align: "center" });
        doc.setTextColor(0, 0, 0);
        y += 14;
      };

      const drawItemBar = (text: string) => {
        ensure(15);
        doc.setFillColor(...BRAND_OLIVE);
        doc.rect(marginL, y, contentW, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(text, marginL + 3, y + 5.1);
        doc.setTextColor(0, 0, 0);
        y += 9.5;
      };

      const drawKV = (label: string, value: string) => {
        const lbl = `${label}: `;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const labelW = doc.getTextWidth(lbl);
        const wrapW = contentW - 6 - labelW;
        if (wrapW < 45) {
          // Label too long — stack value beneath it.
          ensure(4.4);
          doc.setTextColor(...BRAND_DARK);
          doc.text(lbl, marginL + 4, y + 3);
          y += 4.4;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...TEXT_GRAY);
          const lines = doc.splitTextToSize(value || "", contentW - 8);
          lines.forEach((ln: string) => {
            ensure(4.2);
            doc.text(ln, marginL + 8, y + 3);
            y += 4.2;
          });
          y += 0.5;
          return;
        }
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(value || "", wrapW);
        ensure(Math.max(lines.length, 1) * 4.2 + 1);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_DARK);
        doc.text(lbl, marginL + 4, y + 3);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_GRAY);
        doc.text(lines, marginL + 4 + labelW, y + 3);
        y += Math.max(lines.length, 1) * 4.2 + 1;
      };

      const drawBlockHeading = (heading: string) => {
        if (!heading.trim()) return;
        ensure(6.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.8);
        doc.setTextColor(...BRAND_DARK);
        doc.text(heading, marginL + 4, y + 3.4);
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.3);
        doc.line(marginL + 4, y + 4.6, marginL + 4 + doc.getTextWidth(heading), y + 4.6);
        y += 6.5;
      };

      const drawBullet = (raw: string) => {
        const sub = /^\s+[–-]/.test(raw); // indented sub-bullet ("   – ...")
        const txt = raw.replace(/^\s*[–•*-]\s*/, "").trim(); // strip leading ws + marker
        if (!txt) return;
        const indent = sub ? 11 : 7;
        const marker = sub ? "–" : "•";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_GRAY);
        const lines = doc.splitTextToSize(txt, contentW - indent - 4);
        lines.forEach((ln: string, i: number) => {
          ensure(4.2);
          if (i === 0) {
            doc.setTextColor(...BRAND_OLIVE);
            doc.text(marker, marginL + indent - 3.5, y + 3);
            doc.setTextColor(...TEXT_GRAY);
          }
          doc.text(ln, marginL + indent, y + 3);
          y += 4.2;
        });
      };

      sections.forEach((section, sIdx) => {
        if (section.kind === "part") {
          drawPartBanner(section.title || "Part");
          return;
        }
        const hasContent =
          (section.title || "").trim() ||
          section.rows.some((r) => r.label.trim() || r.value.trim()) ||
          (section.blocks || []).some((b) => b.heading.trim() || b.bullets.some((x) => x.trim()));
        if (!hasContent) return;

        drawItemBar(`${displayPrefix(section, sIdx)}${section.title || "Untitled"}`);

        section.rows
          .filter((r) => r.label.trim() || r.value.trim())
          .forEach((r) => drawKV(r.label, r.value));

        (section.blocks || []).forEach((b) => {
          const bullets = b.bullets.filter((x) => x.trim());
          if (!b.heading.trim() && bullets.length === 0) return;
          drawBlockHeading(b.heading);
          bullets.forEach((bl) => drawBullet(bl));
          y += 1.5;
        });

        y += 3;
      });

      // Signatory block
      ensure(62);
      y += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_GRAY);
      doc.text(
        "Note: All specifications are indicative and may be customized as per client requirements.",
        marginL,
        y,
      );
      y += 8;

      const rightX = pageW - marginR;
      const sealData = await imageToPngDataUrl(signatureSealUrl, {
        maxWidth: 700,
        format: "jpeg",
        quality: 0.82,
        background: "#ffffff",
      });
      if (sealData) {
        try {
          const sigW = 55;
          const sigH = 32;
          doc.addImage(sealData, "JPEG", rightX - sigW, y, sigW, sigH);
          y += sigH + 1;
        } catch {
          y += 18;
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_DARK);
        doc.text(`For ${COMPANY_NAME}`, rightX, y, { align: "right" });
        y += 18;
      }

      doc.setDrawColor(...BRAND_DARK);
      doc.setLineWidth(0.3);
      doc.line(rightX - 60, y, rightX, y);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND_DARK);
      doc.text("Authorized Signatory", rightX, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_GRAY);
      doc.text("Proprietor — Portable Office Cabin", rightX, y, { align: "right" });
      y += 4;
      doc.text("(Digitally signed & sealed)", rightX, y, { align: "right" });
      y += 4;

      // Approval stamp
      if (approver) {
        ensure(20);
        const sw = 75;
        const sh = 16;
        const sx = rightX - sw;
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.6);
        doc.roundedRect(sx, y, sw, sh, 1.5, 1.5);
        doc.setTextColor(30, 64, 175);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("APPROVED BY", sx + sw / 2, y + 5, { align: "center" });
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(approver, sw - 4), sx + sw / 2, y + 10, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }

      // === WATERMARKS (all pages) ===
      // GState (opacity) is available at runtime but not in jsPDF's TS types.
      const gsDoc = doc as unknown as {
        GState?: (o: { opacity: number }) => unknown;
        setGState?: (g: unknown) => void;
      };
      try {
        const pageCount = doc.getNumberOfPages();
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          const gs = gsDoc.GState ? gsDoc.GState({ opacity: 0.08 }) : null;
          if (gs && gsDoc.setGState) gsDoc.setGState(gs);

          if (watermarks.company) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(...BRAND_OLIVE);
            const stepX = 70;
            const stepY = 28;
            for (let yy = -10; yy < ph + 20; yy += stepY) {
              for (let xx = -20; xx < pw + 40; xx += stepX) {
                doc.text(COMPANY_NAME, xx, yy, { angle: -30 });
              }
            }
          }

          const bigLabels: Array<{ on: boolean; text: string; rgb: [number, number, number] }> = [
            { on: watermarks.draft, text: "DRAFT", rgb: [120, 120, 120] },
            { on: watermarks.approved, text: "APPROVED", rgb: [16, 122, 60] },
            { on: watermarks.paid, text: "PAID", rgb: [16, 122, 60] },
          ];
          bigLabels.forEach((l, idx) => {
            if (!l.on) return;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(110);
            doc.setTextColor(l.rgb[0], l.rgb[1], l.rgb[2]);
            const offset = (idx - 1) * 35;
            doc.text(l.text, pw / 2, ph / 2 + offset, { align: "center", angle: -30 });
          });

          if (gs && gsDoc.GState && gsDoc.setGState) {
            gsDoc.setGState(gsDoc.GState({ opacity: 1 }));
          }
        }
      } catch (e) {
        console.warn("watermark draw failed", e);
      }

      // Footers + page numbers
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      addLegalFooter(doc);

      const safeClient = (clientName || "Client").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
      doc.save(`Technical_Specification_${safeClient}_${docDate}.pdf`);

      // Persist record (insert new or update existing)
      try {
        const payload = {
          client_name: clientName || null,
          project_details: projectDetails || null,
          doc_date: docDate || null,
          ref_number: refNumber || null,
          sections: JSON.parse(JSON.stringify(sections)),
        };
        if (editingId) {
          const { error: updErr } = await supabase.from("spec_documents").update(payload).eq("id", editingId);
          if (updErr) throw updErr;
        } else {
          const { data: userData } = await supabase.auth.getUser();
          const { data: inserted, error: insErr } = await supabase
            .from("spec_documents")
            .insert([{ ...payload, created_by: userData.user?.id ?? null }])
            .select("id")
            .single();
          if (insErr) throw insErr;
          if (inserted?.id) {
            // Carry the watermark/approver selection from the "new" key to the saved id
            // so reopening the record restores the same choices.
            try {
              localStorage.setItem(`poc_spec_wm_${inserted.id}`, JSON.stringify(watermarks));
              if (approver) localStorage.setItem(`poc_spec_appr_${inserted.id}`, approver);
            } catch {
              /* ignore */
            }
            setEditingId(inserted.id);
          }
        }
        await fetchSaved();
      } catch (saveErr) {
        console.error("Save record failed", saveErr);
        toast({
          title: "PDF downloaded, but record not saved",
          description: saveErr instanceof Error ? saveErr.message : "Unknown error",
          variant: "destructive",
        });
      }

      toast({
        title: "PDF generated",
        description: "Your technical specification has been downloaded and recorded.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to generate PDF",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Save PDF: persist watermark + approver for this document, then download.
  const saveSettingsAndDownload = async () => {
    try {
      localStorage.setItem(wmKey, JSON.stringify(watermarks));
      if (approver) localStorage.setItem(apprKey, approver);
      else localStorage.removeItem(apprKey);
    } catch {
      /* ignore */
    }
    toast({ title: "Settings saved", description: "Watermark & approver remembered for this specification." });
    await generatePdf();
  };

  const printIt = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 120);
  };

  const anyWatermark = watermarks.company || watermarks.draft || watermarks.approved || watermarks.paid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Technical Specification Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {editingId
              ? "Editing a saved specification — saving will update the existing record."
              : "Build a pointwise technical specification with parts, numbered items, key-value rows and bullet sub-sections — then export a watermarked, print-ready PDF on company letterhead."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button onClick={loadTemplate} variant="outline" size="lg" className="rounded-xl">
            <Sparkles className="h-4 w-4 mr-2" />
            Load Embassy 360
          </Button>
          {editingId && (
            <Button onClick={resetForm} variant="outline" size="lg" className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              New Spec
            </Button>
          )}
          <Button onClick={generatePdf} disabled={generating} size="lg" className="rounded-xl">
            <FileDown className="h-4 w-4 mr-2" />
            {generating ? "Saving..." : editingId ? "Save & Download PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Document meta */}
      <Card className="p-6 print:hidden">
        <h3 className="font-semibold text-foreground mb-4">Document Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client">Client Name</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Embassy Office Parks"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">Project Details</Label>
            <Input
              id="project"
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              placeholder="e.g. Embassy 360 — Container Site Office"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Reference No.</Label>
            <Input
              id="ref"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. POC/EMB-360/2026"
            />
          </div>
        </div>
      </Card>

      {/* Watermark toolbar */}
      <div className="print:hidden flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-2.5">
        <span className="text-xs font-semibold text-muted-foreground px-1">Watermarks:</span>
        {(
          [
            { key: "company", label: "Company Name (tiled)" },
            { key: "draft", label: "DRAFT" },
            { key: "approved", label: "APPROVED" },
            { key: "paid", label: "PAID" },
          ] as const
        ).map((w) => (
          <label key={w.key} className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch checked={watermarks[w.key]} onCheckedChange={() => toggleWm(w.key)} />
            <span>{w.label}</span>
          </label>
        ))}
      </div>

      {/* Approver toolbar */}
      <div className="print:hidden flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
        <span className="text-xs font-semibold text-muted-foreground px-1">Approved By:</span>
        {APPROVAL_ROLES.map((role) => {
          const active = approver === role;
          return (
            <Button
              key={role}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setApprover(active ? null : role)}
              className="h-7 text-xs"
            >
              {role}
            </Button>
          );
        })}
        {approver && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setApprover(null)}
            className="h-7 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Action row: preview / print / save */}
      <div className="print:hidden flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowPreview((v) => !v)} className="rounded-xl">
          {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
        <Button variant="outline" onClick={printIt} className="rounded-xl">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" onClick={saveSettingsAndDownload} disabled={generating} className="rounded-xl">
          <Save className="h-4 w-4 mr-2" />
          Save PDF
        </Button>
      </div>

      {/* Sections editor */}
      <div className="space-y-5 print:hidden">
        {sections.map((section, sIdx) => {
          const isPart = section.kind === "part";
          return (
            <Card key={section.id} className={`p-5 ${isPart ? "border-foreground/30 bg-muted/40" : ""}`}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, -1)}
                    disabled={sIdx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, 1)}
                    disabled={sIdx === sections.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 mt-1"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isPart ? (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Layers className="h-3 w-3" /> Part
                  </Badge>
                ) : (
                  <Input
                    value={section.number ?? ""}
                    onChange={(e) => updateSection(section.id, { number: e.target.value })}
                    placeholder="No."
                    className="w-16 shrink-0 text-center font-semibold"
                    title="Item number (e.g. 1, 1.1, 10.a) — leave blank for none"
                  />
                )}

                <Input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  placeholder={isPart ? "Part / divider title (e.g. A. Ground Floor)" : "Item title (e.g. MS Portable Cabin)"}
                  className="font-semibold text-base"
                />

                {!isPart && (
                  <Button variant="ghost" size="sm" onClick={() => duplicateSection(section.id)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(section.id)}
                  title="Remove"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {isPart ? (
                <p className="text-xs text-muted-foreground">
                  Renders as a full-width divider banner in the document. Place it above the items that belong to this part.
                </p>
              ) : (
                <>
                  {/* Key-value rows */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <div>Label</div>
                      <div>Value</div>
                      <div className="w-8" />
                    </div>
                    {section.rows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_1.5fr_auto] gap-3 items-start">
                        <Input
                          value={row.label}
                          onChange={(e) => updateRow(section.id, row.id, "label", e.target.value)}
                          placeholder="e.g. Size"
                        />
                        <Input
                          value={row.value}
                          onChange={(e) => updateRow(section.id, row.id, "value", e.target.value)}
                          placeholder="e.g. 40' x 24' x 8'-6&quot;"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(section.id, row.id)}
                          title="Remove row"
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addRow(section.id)} className="mt-1 rounded-lg">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>

                  {/* Bullet blocks */}
                  <div className="mt-5 space-y-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Sub-sections (heading + bullet points)
                    </div>
                    {(section.blocks || []).map((block, bIdx) => (
                      <div key={block.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveBlock(section.id, block.id, -1)}
                              disabled={bIdx === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(section.id, block.id, 1)}
                              disabled={bIdx === (section.blocks || []).length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <Input
                            value={block.heading}
                            onChange={(e) => updateBlockHeading(section.id, block.id, e.target.value)}
                            placeholder="Sub-heading (e.g. Scope of Work) — optional"
                            className="font-medium"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBlock(section.id, block.id)}
                            title="Remove sub-section"
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={block.bullets.join("\n")}
                          onChange={(e) => updateBlockBullets(section.id, block.id, e.target.value)}
                          placeholder={"One bullet per line.\nStart a line with spaces + dash for a sub-bullet, e.g.\n   - 16A power sockets"}
                          rows={Math.min(Math.max(block.bullets.length + 1, 3), 14)}
                          className="text-sm font-mono"
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addBlock(section.id)} className="rounded-lg">
                      <ListPlus className="h-4 w-4 mr-1" />
                      Add Sub-section
                    </Button>
                  </div>
                </>
              )}
            </Card>
          );
        })}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={addSection} variant="outline" className="rounded-xl h-12">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={addPart} variant="outline" className="rounded-xl h-12">
            <Layers className="h-4 w-4 mr-2" />
            Add Part / Divider
          </Button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-end gap-2 pt-2 print:hidden">
        <Button variant="outline" onClick={saveSettingsAndDownload} disabled={generating} size="lg" className="rounded-xl">
          <Save className="h-4 w-4 mr-2" />
          Save PDF
        </Button>
        <Button onClick={generatePdf} disabled={generating} size="lg" className="rounded-xl">
          <FileDown className="h-4 w-4 mr-2" />
          {generating ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Tip */}
      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-4 print:hidden">
        <strong className="text-foreground">Tip:</strong> Empty rows, sub-sections and bullets are skipped
        automatically. Watermarks and the "Approved By" stamp are applied to the exported PDF (and the preview).
        Each download is also recorded below until you delete it.
      </div>

      {/* ===== A4 Preview (always in DOM so Print works; visible only when toggled) ===== */}
      <div className={`${showPreview ? "block" : "hidden"} print:block`}>
        <div
          id="spec-print"
          className="bg-white text-black mx-auto shadow-2xl print:shadow-none rounded print:rounded-none relative overflow-hidden"
          style={{ width: "210mm", minHeight: "297mm", padding: "14mm 16mm" }}
        >
          {/* Watermark overlay */}
          {anyWatermark && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
              {watermarks.company && (
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: 0.07,
                    color: CSS_OLIVE,
                    fontWeight: 700,
                    fontSize: "18px",
                    transform: "rotate(-30deg)",
                    transformOrigin: "center",
                    whiteSpace: "nowrap",
                    lineHeight: "70px",
                    letterSpacing: "2px",
                  }}
                >
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <span key={j} style={{ marginRight: 60 }}>
                          {COMPANY_NAME}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {[
                { on: watermarks.draft, text: "DRAFT", color: "#787878", offset: -120 },
                { on: watermarks.approved, text: "APPROVED", color: "#107a3c", offset: 0 },
                { on: watermarks.paid, text: "PAID", color: "#107a3c", offset: 120 },
              ].map((l) =>
                l.on ? (
                  <div
                    key={l.text}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `translate(-50%, -50%) translateY(${l.offset}px) rotate(-30deg)`,
                      fontSize: "130px",
                      fontWeight: 900,
                      color: l.color,
                      opacity: 0.1,
                      letterSpacing: "8px",
                    }}
                  >
                    {l.text}
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div className="relative z-10">
            {/* Letterhead */}
            <div className="flex items-center gap-4 pb-2">
              <img src={resolveImageUrl(logoUrl)} alt="logo" className="w-16 h-16 object-contain" />
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold" style={{ color: CSS_DARK }}>
                  {COMPANY_NAME}
                </h1>
                <p className="text-[10px] mt-1" style={{ color: CSS_TEXT }}>
                  Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post, Shoolagiri, Krishnagiri,
                  Tamil Nadu – 635117
                </p>
                <p className="text-[10px] font-medium" style={{ color: CSS_DARK }}>
                  Phone: 9019910931 / 9731897976 | portableofficecabin.com | GST: 33FVKPK6238Q1ZT
                </p>
              </div>
            </div>
            <div className="h-[2px]" style={{ background: CSS_DARK }} />

            {/* Title */}
            <h2 className="text-center text-lg font-bold mt-4 tracking-wide" style={{ color: CSS_DARK }}>
              TECHNICAL SPECIFICATION
            </h2>

            {/* Info block */}
            <div className="mt-4 text-[11px] space-y-1">
              {[
                ["Client Name", clientName],
                ["Project Details", projectDetails],
                ["Date", docDate],
                ["Reference No.", refNumber],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2 border-b border-dashed border-gray-300 pb-0.5">
                  <span className="font-bold w-28 shrink-0" style={{ color: CSS_DARK }}>
                    {k}
                  </span>
                  <span style={{ color: CSS_TEXT }}>{v || "—"}</span>
                </div>
              ))}
            </div>

            {/* Sections */}
            <div className="mt-5 space-y-3">
              {sections.map((section, sIdx) => {
                if (section.kind === "part") {
                  return (
                    <div
                      key={section.id}
                      className="text-center font-bold text-white text-sm py-2 px-3"
                      style={{ background: CSS_DARK, borderBottom: `2px solid ${CSS_OLIVE}` }}
                    >
                      {section.title}
                    </div>
                  );
                }
                const rows = section.rows.filter((r) => r.label.trim() || r.value.trim());
                const blocks = (section.blocks || [])
                  .map((b) => ({ ...b, bullets: b.bullets.filter((x) => x.trim()) }))
                  .filter((b) => b.heading.trim() || b.bullets.length);
                if (!section.title.trim() && rows.length === 0 && blocks.length === 0) return null;
                return (
                  <div key={section.id} className="break-inside-avoid">
                    <div
                      className="font-bold text-white text-[12px] py-1.5 px-2"
                      style={{ background: CSS_OLIVE }}
                    >
                      {displayPrefix(section, sIdx)}
                      {section.title}
                    </div>
                    {rows.length > 0 && (
                      <div className="mt-1.5 px-1 space-y-0.5">
                        {rows.map((r) => (
                          <div key={r.id} className="text-[11px]">
                            <span className="font-bold" style={{ color: CSS_DARK }}>
                              {r.label}:
                            </span>{" "}
                            <span style={{ color: CSS_TEXT }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {blocks.map((b) => (
                      <div key={b.id} className="mt-2 px-1">
                        {b.heading.trim() && (
                          <div
                            className="text-[11px] font-bold inline-block"
                            style={{ color: CSS_DARK, borderBottom: `1px solid ${CSS_OLIVE}` }}
                          >
                            {b.heading}
                          </div>
                        )}
                        <ul className="mt-1 space-y-0.5">
                          {b.bullets.map((bl, i) => {
                            const sub = /^\s+[–-]/.test(bl);
                            const text = bl.replace(/^\s*[–•*-]\s*/, "");
                            return (
                              <li
                                key={i}
                                className="text-[10.5px] flex gap-1.5"
                                style={{ color: CSS_TEXT, marginLeft: sub ? 16 : 0 }}
                              >
                                <span style={{ color: CSS_OLIVE }}>{sub ? "–" : "•"}</span>
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Signatory */}
            <div className="mt-8 flex justify-end">
              <div className="text-right">
                <img src={resolveImageUrl(signatureSealUrl)} alt="seal" className="w-44 h-24 object-contain ml-auto" />
                <div className="border-t border-gray-700 w-48 ml-auto mt-1" />
                <p className="text-[11px] font-bold mt-1" style={{ color: CSS_DARK }}>
                  Authorized Signatory
                </p>
                <p className="text-[10px]" style={{ color: CSS_TEXT }}>
                  Proprietor — Portable Office Cabin
                </p>
                {approver && (
                  <div
                    className="mt-2 inline-block rounded-md border-2 px-3 py-1 text-center"
                    style={{ borderColor: "rgb(30,64,175)", color: "rgb(30,64,175)" }}
                  >
                    <div className="text-[9px] font-bold">APPROVED BY</div>
                    <div className="text-[9px]">{approver}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Specifications */}
      <Card className="p-6 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-foreground">
              Saved Specifications <span className="text-muted-foreground font-normal">({savedSpecs.length})</span>
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSaved} disabled={loadingSaved} className="rounded-lg">
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingSaved ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingSaved && savedSpecs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : savedSpecs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No saved specifications yet. Generate a PDF to record one here.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Client</th>
                  <th className="px-2 py-2">Project</th>
                  <th className="px-2 py-2">Ref. No.</th>
                  <th className="px-2 py-2 text-center">Sections</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedSpecs.map((s) => {
                  const isEditing = editingId === s.id;
                  const sectionCount = Array.isArray(s.sections) ? s.sections.length : 0;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border last:border-0 ${isEditing ? "bg-muted/40" : ""}`}
                    >
                      <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                        {s.doc_date || new Date(s.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-2 py-3 font-medium text-foreground">
                        {s.client_name || "—"}
                        {isEditing && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">Editing</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground max-w-[260px] truncate">
                        {s.project_details || "—"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{s.ref_number || "—"}</td>
                      <td className="px-2 py-3 text-center text-muted-foreground">{sectionCount}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadSaved(s)} title="Load & edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSaved(s.id)}
                            title="Delete record"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
