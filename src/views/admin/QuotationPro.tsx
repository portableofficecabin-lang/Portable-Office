"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Trash2, Download, Printer, Eye, Save, ArrowLeft,
  Building2, Hash, IndianRupee, Wrench, Banknote, FileEdit,
  CheckCircle2, Clock, FileCheck2, TrendingUp, Sparkles, Loader2, Package,
  Users, BookmarkPlus, Truck, X, Check, ChevronsUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import jsPDF from "jspdf";
import { addLegalFooter } from "@/lib/pdfFooter";
import QRCode from "qrcode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { imageToPngDataUrl } from "@/lib/pdf/imageToPng";
import logoImg from "@/assets/logo.webp";
import sealImg from "@/assets/signature-seal.webp";

/* ==================== TYPES ==================== */
interface ProductItem {
  id: string;
  product_name: string;
  cabin_type: string;
  description_points: string;
  hsn_code: string;
  length: string;
  width: string;
  height: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  // Optional grouping: which cabin section this item belongs to (see Quotation.cabins).
  // Undefined = legacy/ungrouped; such items render flat exactly as before.
  cabin_id?: string;
}

interface SpecRow {
  id: string;
  category: string;
  component: string;
  specification: string;
  material: string;
  thickness: string;
  brand: string;
  cabin_id?: string;
}

// A named grouping section ("Cabin 1", "Cabin 2", …) that items/optional-items/specs
// can be assigned to via their cabin_id. When a quotation has no cabins, everything
// renders flat (legacy behaviour, fully backward compatible).
interface CabinSection {
  id: string;
  name: string;
}

// An "Option Item" is a customer-requested CHANGE/variation (e.g. upgrade flooring,
// change wall interior) that would raise or lower the price. It is shown separately
// as a what-if line — the base quotation total is NEVER affected by it.
interface OptionItem {
  id: string;
  description: string;
  direction: "increase" | "decrease";
  amount: number; // magnitude of the cost difference (always positive)
}

interface BankDetails {
  account_holder: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  date: string;
  po_number: string;
  po_date: string;
  eway_number: string;
  eway_date: string;
  challan_number: string;
  invoice_ref: string;
  vehicle_number: string;
  doc_type: "quotation" | "proforma" | "invoice" | "challan";
  gst_mode: "cgst_sgst" | "igst";
  default_hsn: string;
  // Client
  client_name: string;
  client_company: string;
  client_address: string;
  client_state: string;
  client_pincode: string;
  client_gst: string;
  contact_person: string;
  contact_number: string;
  client_email: string;
  site_location: string;
  // Shipping
  same_as_billing: boolean;
  ship_to_name: string;
  ship_to_company: string;
  ship_to_address: string;
  ship_to_state: string;
  ship_to_pincode: string;
  ship_to_contact: string;
  ship_to_phone: string;
  ship_to_gst: string;
  // Commercial
  validity: string;
  payment_terms: string;
  delivery_timeline: string;
  transport_charges: string;
  gst_percent: number;
  discount_before_value?: number;
  discount_before_type?: "percent" | "amount";
  discount_after_value?: number;
  discount_after_type?: "percent" | "amount";
  advance_paid_value?: number;
  advance_paid_type?: "percent" | "amount";
  notes: string;
  // Items
  items: ProductItem[];
  // Cabin sections for grouping items/optional-items/specs. Empty/undefined = flat.
  cabins?: CabinSection[];
  // Optional add-on items — shown as extras in the document but NEVER added to the
  // Grand Total. Gated by include_optional_items.
  optional_items?: ProductItem[];
  include_optional_items?: boolean;
  // Option Items — customer-requested change/variation options (increase or reduce
  // vs the base total). Shown separately as what-if lines; never change the total.
  option_items?: OptionItem[];
  include_option_items?: boolean;
  // When true (and the quotation has cabins), each cabin is totalled as its own
  // standalone quote (own Subtotal + GST + Grand Total) instead of one combined total.
  separate_cabin_totals?: boolean;
  specs: SpecRow[];
  include_specs?: boolean;
  include_gst?: boolean;
  // When true, the document header leads with the proprietor's name
  // (SHAIKH ABDUL KALAM) and shows the trade name "(Portable Office Cabin)" — the
  // legal-name-first format a few customers ask for. Default false.
  proprietor_first?: boolean;
  // Only applies when proprietor_first is on: when true the trade name
  // "(Portable Office Cabin)" sits on its OWN line below the owner name instead of
  // on the same line. Default false (same line).
  company_below_owner?: boolean;
  terms: string[];
  bank: BankDetails;
  status: "draft" | "pending" | "approved" | "rejected";
  subject?: string;
  created_at: string;
}

/* ==================== CONSTANTS ==================== */
const COMPANY = {
  name: "PORTABLE OFFICE CABIN",
  proprietor: "Shaikh Abdul Kalam",
  trade_name: "Portable Office Cabin",
  firm_type: "Proprietorship Firm",
  address: "Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post, Shoolagiri, Krishnagiri, Tamil Nadu – 635117",
  phone: "9019910931 / 9731897976",
  website: "portableofficecabin.com",
  gst: "33FVKPK6238Q1ZT",
  email: "info@portableofficecabin.com",
  upi_id: "shaikhkalam63-5@okaxis",
  upi_name: "PORTABLE OFFICE CABIN",
};

// Builds a UPI deep-link string per NPCI spec — scannable by all UPI apps
const buildUpiUri = (amount: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(COMPANY.upi_id)}&pn=${encodeURIComponent(COMPANY.upi_name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

const SPEC_CATEGORIES = [
  "General Details",
  "Bottom Frame",
  "Top Frame",
  "Floor Frame / Stiffeners",
  "Wall Stiffeners",
  "External Wall Panel",
  "Internal Wall Panel",
  "Roof Structure",
  "Insulation (Glass Wool / Hitlon)",
  "Flooring",
  "Doors",
  "Windows",
  "Electrical (Fans, Lights, Wiring)",
  "Plumbing",
  "Painting / Finish",
  "Transportation",
  "Installation",
];

const DEFAULT_TERMS = [
  "GST extra as applicable",
  "Transportation extra unless specified",
  "Delivery timeline depends on advance payment",
  "Work starts after work order / advance",
  "Quotation validity: 7 days",
  "Additional work will be charged extra",
];

const DEFAULT_SPECS: SpecRow[] = [
  {
    id: crypto.randomUUID(),
    category: "General Details",
    component: "MS",
    specification: "PORTABLE PREFABRICATED CABIN",
    material: "—",
    thickness: "—",
    brand: "PORTABLE MODULAR STRUCTURE",
  },
  {
    id: crypto.randomUUID(),
    category: "Bottom Frame",
    component: "BASE FRAME",
    specification: "ISMC CHANNEL HEAVY DUTY STRUCTURE / MS TUBE.",
    material: "HEAVY DUTY - MILD STEEL",
    thickness: "100 × 50 MM",
    brand: "6 MM THICK - JINDAL, APOLLO, JSW OR SRIRAJ",
  },
  {
    id: crypto.randomUUID(),
    category: "Top Frame",
    component: "ROOF FRAME",
    specification: "SQUARE TUBE STRUCTURE",
    material: "MS TUBE",
    thickness: "50 × 50 MM",
    brand: "3 MM - JINDAL, APOLLO, JSW OR SRIRAJ",
  },
  {
    id: crypto.randomUUID(),
    category: "Floor Frame / Stiffeners",
    component: "BOTTOM SUPPORT",
    specification: "RECTANGULAR TUBE REINFORCEMENT",
    material: "MS TUBE",
    thickness: "100×50 / 50×50 MM",
    brand: "3 MM - JINDAL, APOLLO, JSW OR SRIRAJ",
  },
  {
    id: crypto.randomUUID(),
    category: "Wall Stiffeners",
    component: "SIDE SUPPORT",
    specification: "VERTICAL & HORIZONTAL MEMBERS",
    material: "MS TUBE",
    thickness: "50 × 50 MM",
    brand: "3 MM - JINDAL, APOLLO, JSW OR SRIRAJ",
  },
  {
    id: crypto.randomUUID(),
    category: "External Wall Panel",
    component: "OUTER CLADDING",
    specification: "CORRUGATED CR SHEET WELDED",
    material: "MILD STEEL SHEET",
    thickness: "1.2 MM (18 GAUGE)",
    brand: "3 MM - JINDAL, APOLLO, JSW OR SRIRAJ",
  },
  {
    id: crypto.randomUUID(),
    category: "Internal Wall Panel",
    component: "INNER FINISH",
    specification: "PRE-LAMINATED BOARD / MDF",
    material: "MDF BOARD",
    thickness: "8 MM",
    brand: "DECORATIVE FINISH",
  },
  {
    id: crypto.randomUUID(),
    category: "Roof Structure",
    component: "TOP COVERING",
    specification: "SLANTED 2 SIDES SLOPED / FLAT ROOF FOR G+1 FLOOR CONTAINER ONLY.",
    material: "MS SHEET",
    thickness: "1.2 MM (18 GAUGE)",
    brand: "WEATHER RESISTANT",
  },
  {
    id: crypto.randomUUID(),
    category: "Insulation (Glass Wool / Hitlon)",
    component: "THERMAL LAYER",
    specification: "HEAT INSULATION",
    material: "GLASS WOOL 50KG DENSITY / HITLON",
    thickness: "10MM / 25MM THICK",
    brand: "HEAT RESISTANT",
  },
  {
    id: crypto.randomUUID(),
    category: "Flooring",
    component: "FLOOR FINISH",
    specification: "VINYL FLOORING REGULAR",
    material: "PVC VINYL",
    thickness: "1MM",
    brand: "ANTI-SKID",
  },
  {
    id: crypto.randomUUID(),
    category: "Doors",
    component: "MAIN DOOR",
    specification: "LOCKABLE MS DOOR",
    material: "MILD STEEL",
    thickness: "STANDARD SIZE",
    brand: "WITH L DROP HANDLE / GODREJ LOCK (NEED TO INFORMED EARLIER).",
  },
  {
    id: crypto.randomUUID(),
    category: "Windows",
    component: "VENTILATION",
    specification: "UPVC SLIDING WINDOWS / ALUMINIUM.",
    material: "UPVC + GLASS / ALUMINIUM + GLASS.",
    thickness: "2 TRACK",
    brand: "WITH SAFETY GRILL AND CANOPY",
  },
  {
    id: crypto.randomUUID(),
    category: "Electrical (Fans, Lights, Wiring)",
    component: "ELECTRICAL FITTINGS",
    specification: "LED LIGHTS, CABIN FAN, INTERNAL WIRING",
    material: "COPPER WIRING",
    thickness: "SWITCH SOCKET - HIFI, LIGHT BRAND - STURLITE.",
    brand: "ISI STANDARD",
  },
  {
    id: crypto.randomUUID(),
    category: "Plumbing",
    component: "WATER SYSTEM - ONLY FOR PANTRY AND TOILET BATH CABIN ONLY.",
    specification: "BASIC PLUMBING (IF REQUIRED) OR MENTIONED IN QUOTE.",
    material: "PVC / CPVC",
    thickness: "—",
    brand: "OPTIONAL OR EXCLUSIVE.",
  },
  {
    id: crypto.randomUUID(),
    category: "Painting / Finish",
    component: "SURFACE COATING",
    specification: "PRIMER + ENAMEL PAINT",
    material: "—",
    thickness: "—",
    brand: "ANTI-RUST FINISH",
  },
  {
    id: crypto.randomUUID(),
    category: "Transportation",
    component: "DELIVERY - EXCLUSIVE",
    specification: "BY ROAD TRANSPORT",
    material: "—",
    thickness: "—",
    brand: "EXTRA / AS ACTUAL",
  },
  {
    id: crypto.randomUUID(),
    category: "Installation",
    component: "SETUP",
    specification: "ON-SITE INSTALLATION",
    material: "CLIENT SCOPED OR CHARGES APPLICABLE.",
    thickness: "—",
    brand: "OPTIONAL",
  },
];

/* ==================== HELPERS ==================== */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const fmtPdf = (n: number) => "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);
const today = () => new Date().toISOString().split("T")[0];
const uid = () => crypto.randomUUID();

const STORAGE_KEY = "poc_quotations_v1";

const loadAll = (): Quotation[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveAll = (list: Quotation[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

const sortQuotations = (items: Quotation[]) =>
  [...items].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

const mergeQuotations = (local: Quotation[], remote: Quotation[]) => {
  const map = new Map<string, Quotation>();
  remote.forEach((q) => map.set(q.id, q));
  local.forEach((q) => map.set(q.id, q));
  return sortQuotations(Array.from(map.values()));
};

const mapDbQuotation = (row: any, items: any[] = []): Quotation => ({
  ...blankQuotation(),
  id: row.id,
  quotation_number: row.quotation_number || "QTN-1001",
  date: (row.created_at || new Date().toISOString()).split("T")[0],
  doc_type: "quotation",
  client_name: row.client_name || "",
  client_company: row.client_company || "",
  client_address: row.client_address || "",
  contact_number: row.client_phone || "",
  client_email: row.client_email || "",
  subject: row.subject || "",
  gst_percent: Number(row.gst_percent ?? 18),
  advance_paid_value: Number(row.advance_paid ?? 0),
  advance_paid_type: "amount",
  terms: row.terms ? String(row.terms).split("\n").filter(Boolean) : [...DEFAULT_TERMS],
  notes: row.notes || "",
  status: (row.status || "draft") as Quotation["status"],
  created_at: row.created_at || new Date().toISOString(),
  items: items.length
    ? items.map((it, i) => ({
        ...emptyItem(),
        id: it.id || uid(),
        product_name: it.description || `Item ${i + 1}`,
        description_points: it.description || "",
        quantity: Number(it.quantity ?? 1),
        unit: it.unit || "Nos",
        unit_rate: Number(it.unit_price ?? 0),
      }))
    : [emptyItem()],
});

const loadRemoteQuotations = async (): Promise<Quotation[]> => {
  const { data: rows, error } = await supabase
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const ids = (rows || []).map((q: any) => q.id);
  const { data: itemRows, error: itemError } = ids.length
    ? await supabase.from("quotation_items").select("*").in("quotation_id", ids).order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (itemError) throw itemError;
  return (rows || []).map((row: any) => mapDbQuotation(row, (itemRows || []).filter((it: any) => it.quotation_id === row.id)));
};

const saveRemoteQuotation = async (q: Quotation) => {
  const totals = calcTotals(q);
  const { data: auth } = await supabase.auth.getUser();
  const payload = {
    id: q.id,
    quotation_number: q.quotation_number,
    client_name: q.client_name || "Customer",
    client_company: q.client_company || null,
    client_address: q.client_address || null,
    client_phone: q.contact_number || null,
    client_email: q.client_email || null,
    subject: q.subject || null,
    subtotal: totals.subtotal,
    gst_amount: totals.gst,
    total_amount: totals.total,
    advance_paid: totals.advancePaid,
    balance_due: totals.balanceDue,
    gst_percent: q.gst_percent || 18,
    validity_days: parseInt(q.validity || "15", 10) || 15,
    terms: (q.terms || []).join("\n"),
    notes: q.notes || null,
    status: q.status || "draft",
    updated_at: new Date().toISOString(),
    ...(auth.user?.id ? { created_by: auth.user.id } : {}),
  };

  let { error } = await supabase.from("quotations").upsert(payload as any, { onConflict: "id" });
  // advance_paid / balance_due require the 20260630 migration. If the database
  // hasn't been migrated yet, PostgREST rejects the whole upsert (PGRST204:
  // "Could not find the 'advance_paid' column ... in the schema cache"). Retry
  // without those two columns so the quotation still syncs — the advance stays in
  // localStorage and will persist to the DB automatically once the migration runs.
  if (error && (error.code === "PGRST204" || /schema cache|advance_paid|balance_due/i.test(error.message || ""))) {
    const { advance_paid, balance_due, ...legacyPayload } = payload as Record<string, unknown>;
    ({ error } = await supabase.from("quotations").upsert(legacyPayload as any, { onConflict: "id" }));
  }
  if (error) throw error;

  await supabase.from("quotation_items").delete().eq("quotation_id", q.id);
  const lineItems = (q.items || []).map((it, i) => ({
    quotation_id: q.id,
    description: it.product_name || it.description_points || `Item ${i + 1}`,
    quantity: it.quantity || 1,
    unit: it.unit || "Nos",
    unit_price: it.unit_rate || 0,
    total_price: itemAmount(it),
    sort_order: i,
  }));
  if (lineItems.length) {
    const { error: itemError } = await supabase.from("quotation_items").insert(lineItems as any);
    if (itemError) throw itemError;
  }
};

/* ---------- SAVED CLIENTS ---------- */
interface SavedShipping {
  id: string;
  label: string;
  name: string;
  company: string;
  address: string;
  state?: string;
  pincode?: string;
  contact: string;
  phone: string;
  gst: string;
}
interface SavedClient {
  id: string;
  name: string;
  company: string;
  address: string;
  state?: string;
  pincode?: string;
  gst: string;
  contact_person: string;
  contact_number: string;
  email: string;
  site_location: string;
  shipping: SavedShipping[];
}
const CLIENTS_KEY = "poc_clients_v1";
const loadClients = (): SavedClient[] => {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]"); } catch { return []; }
};
const saveClients = (list: SavedClient[]) => localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));

const DOC_PREFIX: Record<Quotation["doc_type"], string> = {
  quotation: "QTN",
  proforma: "PI",
  invoice: "INV",
  challan: "DC",
};

/* Indian States & UTs (for GST place-of-supply) */
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
/* Seller's home state — used for IGST vs CGST/SGST detection.
   Portable Office Cabin is GST-registered in Tamil Nadu. */
const SELLER_STATE = "Tamil Nadu";

const GST_STATE_CODE_TO_STATE: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

const normalizeState = (state?: string) => (state || "").trim().toLowerCase().replace(/[^a-z]/g, "");
const stateFromGstin = (gstin?: string) => GST_STATE_CODE_TO_STATE[(gstin || "").trim().slice(0, 2)] || "";
const gstModeFromState = (state?: string): Quotation["gst_mode"] =>
  normalizeState(state) && normalizeState(state) !== normalizeState(SELLER_STATE) ? "igst" : "cgst_sgst";
const placeOfSupplyState = (q: Quotation) => {
  const billingState = q.client_state || stateFromGstin(q.client_gst);
  const shippingState = q.ship_to_state || stateFromGstin(q.ship_to_gst);
  return billingState || shippingState;
};
const gstModeForQuotation = (q: Quotation): Quotation["gst_mode"] => {
  const supplyState = placeOfSupplyState(q);
  return supplyState ? gstModeFromState(supplyState) : q.gst_mode;
};
const withAutoGstMode = (q: Quotation): Quotation => ({ ...q, gst_mode: gstModeForQuotation(q) });

const newDocNumber = (docType: Quotation["doc_type"] = "quotation") => {
  const prefix = DOC_PREFIX[docType];
  const list = loadAll();
  const max = list.reduce((m, q) => {
    if (!q.quotation_number?.startsWith(prefix + "-")) return m;
    const n = parseInt(q.quotation_number.replace(/\D/g, "") || "0", 10);
    return Math.max(m, n);
  }, 1000);
  return `${prefix}-${max + 1}`;
};

// Backward-compat alias
const newQuotationNumber = () => newDocNumber("quotation");

const emptyItem = (hsn = "9406"): ProductItem => ({
  id: uid(),
  product_name: "",
  cabin_type: "",
  description_points: "",
  hsn_code: hsn,
  length: "",
  width: "",
  height: "",
  quantity: 1,
  unit: "Nos",
  unit_rate: 0,
});

const emptySpec = (cat = "General Details"): SpecRow => ({
  id: uid(),
  category: cat,
  component: "",
  specification: "",
  material: "",
  thickness: "",
  brand: "",
});

const blankQuotation = (): Quotation => ({
  id: uid(),
  quotation_number: newQuotationNumber(),
  date: today(),
  po_number: "",
  po_date: "",
  eway_number: "",
  eway_date: "",
  challan_number: "",
  invoice_ref: "",
  vehicle_number: "",
  doc_type: "quotation",
  gst_mode: "cgst_sgst",
  default_hsn: "9406",
  client_name: "",
  client_company: "",
  client_address: "",
  client_state: "",
  client_pincode: "",
  client_gst: "",
  contact_person: "",
  contact_number: "",
  client_email: "",
  site_location: "",
  same_as_billing: true,
  ship_to_name: "",
  ship_to_company: "",
  ship_to_address: "",
  ship_to_state: "",
  ship_to_pincode: "",
  ship_to_contact: "",
  ship_to_phone: "",
  ship_to_gst: "",
  validity: "7 days",
  payment_terms: "50% advance, 50% before dispatch",
  delivery_timeline: "15-20 working days from advance",
  transport_charges: "Extra at actuals",
  gst_percent: 18,
  discount_before_value: 0,
  discount_before_type: "amount",
  discount_after_value: 0,
  discount_after_type: "amount",
  advance_paid_value: 0,
  advance_paid_type: "amount",
  notes: "",
  items: [emptyItem()],
  cabins: [],
  optional_items: [],
  include_optional_items: false,
  option_items: [],
  include_option_items: false,
  separate_cabin_totals: false,
  specs: DEFAULT_SPECS.map((s) => ({ ...s, id: uid() })),
  include_specs: true,
  include_gst: true,
  proprietor_first: false,
  company_below_owner: false,
  terms: [...DEFAULT_TERMS],
  bank: {
    account_holder: "PORTABLE OFFICE CABIN",
    bank_name: "Axis Bank",
    account_number: "923020047280667",
    ifsc: "UTIB0004965",
    branch: "THIYAGARASANAPALLI",
  },
  status: "draft",
  subject: "",
  created_at: new Date().toISOString(),
});

const itemAmount = (it: ProductItem) => (it.quantity || 0) * (it.unit_rate || 0);

const calcTotals = (q: Quotation) => {
  const subtotal = q.items.reduce((s, i) => s + itemAmount(i), 0);
  const dbType = q.discount_before_type || "amount";
  const dbVal = Number(q.discount_before_value) || 0;
  const discountBefore = dbType === "percent" ? (subtotal * dbVal) / 100 : dbVal;
  const taxable = Math.max(0, subtotal - discountBefore);
  const gstEnabled = q.include_gst !== false;
  const gstAmt = gstEnabled ? (taxable * (q.gst_percent || 0)) / 100 : 0;
  const gstMode = gstModeForQuotation(q);
  const cgst = gstEnabled && gstMode === "cgst_sgst" ? gstAmt / 2 : 0;
  const sgst = gstEnabled && gstMode === "cgst_sgst" ? gstAmt / 2 : 0;
  const igst = gstEnabled && gstMode === "igst" ? gstAmt : 0;
  const afterTaxBase = taxable + gstAmt;
  const daType = q.discount_after_type || "amount";
  const daVal = Number(q.discount_after_value) || 0;
  const discountAfter = daType === "percent" ? (afterTaxBase * daVal) / 100 : daVal;
  const total = Math.max(0, afterTaxBase - discountAfter);
  const apType = q.advance_paid_type || "amount";
  const apVal = Number(q.advance_paid_value) || 0;
  const advancePaid = Math.min(total, Math.max(0, apType === "percent" ? (total * apVal) / 100 : apVal));
  const balanceDue = Math.max(0, total - advancePaid);
  return { subtotal, discountBefore, taxable, gst: gstAmt, cgst, sgst, igst, discountAfter, total, advancePaid, balanceDue };
};

// Per-cabin totals for "separate cabin calculation" mode: each cabin is treated as
// its own standalone quote, applying the SAME commercial terms (discounts, GST,
// advance) to just that cabin's items. Returns null when the quotation has no cabins.
const calcCabinTotals = (q: Quotation) =>
  groupByCabin(q.items, q.cabins)?.map((g) => ({
    cabin: g.cabin,
    totals: calcTotals({ ...q, items: g.items }),
  })) ?? null;

// Groups a list (items / optional-items / specs) by cabin, in cabin order. Returns
// null when the quotation has NO cabins, so callers fall back to the original flat
// rendering (100% backward compatible). Entries whose cabin_id is missing or points
// at a deleted cabin fall into the first cabin, so nothing is ever dropped. Original
// order is preserved within each cabin.
function groupByCabin<T extends { cabin_id?: string }>(
  list: T[],
  cabins?: CabinSection[],
): { cabin: CabinSection; items: T[] }[] | null {
  if (!cabins || cabins.length === 0) return null;
  const ids = new Set(cabins.map((c) => c.id));
  const firstId = cabins[0].id;
  const buckets = new Map<string, T[]>(cabins.map((c) => [c.id, [] as T[]]));
  for (const it of list) {
    const cid = it.cabin_id && ids.has(it.cabin_id) ? it.cabin_id : firstId;
    buckets.get(cid)!.push(it);
  }
  return cabins.map((c) => ({ cabin: c, items: buckets.get(c.id)! }));
}

/* ============== GST/E-WAY BILL UQC (Unit Quantity Codes) ============== */
// Source: CBIC - Official Unit Quantity Codes for GST invoices & e-Way Bills
const UQC_UNITS: { code: string; label: string; aliases?: string }[] = [
  { code: "NOS", label: "NOS - Numbers (Pieces)", aliases: "pcs piece pc no number unit" },
  { code: "PCS", label: "PCS - Pieces", aliases: "pc piece" },
  { code: "SET", label: "SET - Set" },
  { code: "PRS", label: "PRS - Pairs", aliases: "pair" },
  { code: "DOZ", label: "DOZ - Dozens", aliases: "dozen" },
  { code: "BOX", label: "BOX - Box" },
  { code: "BAG", label: "BAG - Bags" },
  { code: "BDL", label: "BDL - Bundles", aliases: "bundle" },
  { code: "BKL", label: "BKL - Buckles" },
  { code: "BUN", label: "BUN - Bunches" },
  { code: "CAN", label: "CAN - Cans" },
  { code: "CTN", label: "CTN - Cartons", aliases: "carton" },
  { code: "CBM", label: "CBM - Cubic Meters", aliases: "cubic meter m3" },
  { code: "CCM", label: "CCM - Cubic Centimeters", aliases: "cubic cm" },
  { code: "DRM", label: "DRM - Drums", aliases: "drum" },
  { code: "GGR", label: "GGR - Great Gross" },
  { code: "GMS", label: "GMS - Grams", aliases: "g gram" },
  { code: "GRS", label: "GRS - Gross" },
  { code: "GYD", label: "GYD - Gross Yards" },
  { code: "KGS", label: "KGS - Kilograms", aliases: "kg kilo kilogram weight" },
  { code: "KLR", label: "KLR - Kilolitre", aliases: "kilolitre kl" },
  { code: "KME", label: "KME - Kilometre", aliases: "km kilometer" },
  { code: "MTR", label: "MTR - Meters", aliases: "m meter metre length" },
  { code: "MLT", label: "MLT - Millilitre", aliases: "ml" },
  { code: "MTS", label: "MTS - Metric Ton", aliases: "ton tonne mt" },
  { code: "OTH", label: "OTH - Others" },
  { code: "PAC", label: "PAC - Packs", aliases: "pack" },
  { code: "QTL", label: "QTL - Quintal" },
  { code: "ROL", label: "ROL - Rolls", aliases: "roll" },
  { code: "SQF", label: "SQF - Square Feet", aliases: "sqft sq ft area" },
  { code: "SQM", label: "SQM - Square Meters", aliases: "sqm sq m square metre area" },
  { code: "SQY", label: "SQY - Square Yards", aliases: "sqy sq yard" },
  { code: "TBS", label: "TBS - Tablets" },
  { code: "TGM", label: "TGM - Ten Gross" },
  { code: "THD", label: "THD - Thousands", aliases: "thousand 1000" },
  { code: "TON", label: "TON - Tonnes", aliases: "ton tonne" },
  { code: "TUB", label: "TUB - Tubes" },
  { code: "UGS", label: "UGS - US Gallons" },
  { code: "UNT", label: "UNT - Units" },
  { code: "YDS", label: "YDS - Yards", aliases: "yard" },
];

/* ============== Searchable Unit Picker ============== */
function UnitPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 px-3 font-normal"
        >
          <span className="truncate">{value || "Select unit..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput placeholder="Search unit (pcs, sqft, kg...)" className="h-9" />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>No unit found.</CommandEmpty>
            <CommandGroup>
              {UQC_UNITS.map((u) => (
                <CommandItem
                  key={u.code}
                  value={`${u.code} ${u.label} ${u.aliases || ""}`}
                  onSelect={() => {
                    onChange(u.code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === u.code ? "opacity-100" : "opacity-0")} />
                  <span className="text-xs">{u.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ==================== MAIN ==================== */
export default function QuotationPro() {
  const [list, setList] = useState<Quotation[]>([]);
  const [view, setView] = useState<"dashboard" | "form" | "preview">("dashboard");
  const [current, setCurrent] = useState<Quotation | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "quotation" | "proforma" | "invoice" | "challan">("all");

  useEffect(() => {
    const local = loadAll();
    setList(sortQuotations(local));

    (async () => {
      try {
        const remote = await loadRemoteQuotations();
        const remoteIds = new Set(remote.map((r) => r.id));
        // Push any local-only quotations up to the backend so they're visible everywhere
        const localOnly = local.filter((q) => !remoteIds.has(q.id));
        if (localOnly.length > 0) {
          const results = await Promise.allSettled(localOnly.map((q) => saveRemoteQuotation(q)));
          const synced = results.filter((r) => r.status === "fulfilled").length;
          const failed = results.length - synced;
          if (synced > 0) toast({ title: `Synced ${synced} local quotation${synced > 1 ? "s" : ""} to backend` });
          if (failed > 0) {
            const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
            toast({ title: `${failed} quotation${failed > 1 ? "s" : ""} could not sync`, description: firstErr?.reason?.message || "Unknown error", variant: "destructive" });
          }
          // Reload remote after sync
          const refreshed = await loadRemoteQuotations();
          const merged = mergeQuotations(local, refreshed);
          saveAll(merged);
          setList(merged);
        } else {
          const merged = mergeQuotations(local, remote);
          saveAll(merged);
          setList(merged);
        }
      } catch (error: any) {
        console.error("Failed to load saved quotations from backend (using local cache)", error);
        // The local cache was already loaded + shown above, so nothing is lost. When the
        // backend quotations table simply isn't reachable/queryable yet — e.g. PostgREST's
        // schema cache is stale after a project restore, or the table isn't migrated — do
        // NOT alarm the user; just keep working from this device's saved quotations. Only
        // genuinely unexpected failures get a soft, non-destructive notice.
        const msg = String(error?.message || "");
        const backendTableUnavailable =
          error?.code === "PGRST205" ||
          error?.code === "PGRST204" ||
          error?.code === "42P01" ||
          /schema cache|could not find the table|does not exist|relation .* does not exist/i.test(msg);
        if (!backendTableUnavailable) {
          toast({ title: "Showing quotations from this device", description: "Couldn't reach the backend just now — your saved quotations are still here." });
        }
      }
    })();
  }, []);

  const refresh = () => setList(sortQuotations(loadAll()));

  const filteredList = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const cutoff: Date | null = (() => {
      if (periodFilter === "today") return startOfDay(now);
      if (periodFilter === "week") { const d = startOfDay(now); d.setDate(d.getDate() - 7); return d; }
      if (periodFilter === "month") { const d = startOfDay(now); d.setMonth(d.getMonth() - 1); return d; }
      if (periodFilter === "year") { const d = startOfDay(now); d.setFullYear(d.getFullYear() - 1); return d; }
      return null;
    })();
    return list.filter((q) => {
      if (docTypeFilter !== "all" && (q.doc_type || "quotation") !== docTypeFilter) return false;
      if (cutoff) {
        const qd = q.date ? new Date(q.date) : (q.created_at ? new Date(q.created_at) : null);
        if (!qd || qd < cutoff) return false;
      }
      if (!term) return true;
      const hay = [
        q.quotation_number, q.client_name, q.client_company, q.contact_person,
        q.client_email, q.contact_number, q.site_location, q.po_number,
        ...(q.items || []).map((i) => `${i.product_name} ${i.cabin_type}`),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [list, search, periodFilter, docTypeFilter]);

  const stats = useMemo(() => {
    const total = filteredList.length;
    const pending = filteredList.filter((q) => q.status === "pending" || q.status === "draft").length;
    const approved = filteredList.filter((q) => q.status === "approved").length;
    const value = filteredList.reduce((s, q) => s + calcTotals(q).total, 0);
    return { total, pending, approved, value };
  }, [filteredList]);

  const openNew = () => {
    setCurrent(blankQuotation());
    setView("form");
  };
  const openEdit = (q: Quotation) => {
    setCurrent(withAutoGstMode(q));
    setView("form");
  };
  const openPreview = (q: Quotation) => {
    setCurrent(withAutoGstMode(q));
    setView("preview");
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this quotation?")) return;
    const next = list.filter((q) => q.id !== id);
    saveAll(next);
    setList(next);
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) toast({ title: "Local quotation deleted", description: error.message, variant: "destructive" });
    else toast({ title: "Quotation deleted" });
  };
  const persist = async (q: Quotation) => {
    const nextQuotation = withAutoGstMode(q);
    const all = loadAll();
    const idx = all.findIndex((x) => x.id === nextQuotation.id);
    if (idx >= 0) all[idx] = nextQuotation;
    else all.unshift(nextQuotation);
    const sorted = sortQuotations(all);
    saveAll(sorted);
    setList(sorted);
    try {
      await saveRemoteQuotation(nextQuotation);
      toast({ title: "Quotation saved" });
    } catch (error: any) {
      console.error("Failed to save quotation", error);
      toast({ title: "Saved only on this browser", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {view === "dashboard" && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(222_45%_18%)] to-[hsl(222_47%_11%)] p-8 lg:p-10 shadow-2xl">
              {/* Decorative orbs */}
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber/30 to-amber-light/10 blur-3xl" />
              <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-amber/20 to-transparent blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05),transparent_60%)]" />

              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
                    <Sparkles className="h-3.5 w-3.5 text-amber-light" />
                    <span className="text-xs font-semibold tracking-wider uppercase text-white/90">Premium Builder</span>
                  </div>
                  <h1 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight">
                    Quotation <span className="bg-gradient-to-r from-amber-light to-amber bg-clip-text text-transparent">Pro</span>
                  </h1>
                  <p className="text-white/70 max-w-xl text-sm lg:text-base">
                    Craft GST-compliant quotations, proforma invoices, tax invoices & delivery challans with technical specifications and instant PDF export.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/admin/labour-colony-quotation">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 px-6 py-6 text-base font-semibold rounded-2xl backdrop-blur-sm"
                    >
                      <Building2 className="h-5 w-5" /> Labour Colony
                    </Button>
                  </Link>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={openNew}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-amber to-amber-light text-white border-0 shadow-2xl shadow-amber/40 hover:shadow-amber/60 px-7 py-6 text-base font-semibold rounded-2xl"
                    >
                      <Plus className="h-5 w-5" /> Create New Document
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile icon={FileText} label="Total Quotations" value={String(stats.total)} color="from-blue-500 to-indigo-600" />
              <StatTile icon={Clock} label="Pending" value={String(stats.pending)} color="from-amber-500 to-orange-500" />
              <StatTile icon={CheckCircle2} label="Approved" value={String(stats.approved)} color="from-emerald-500 to-green-600" />
              <StatTile icon={IndianRupee} label="Total Value" value={fmt(stats.value)} color="from-violet-500 to-purple-600" />
            </div>

            {/* Recent list */}
            <div className="relative rounded-3xl border bg-card shadow-xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber via-amber-light to-amber" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-amber" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">Recent Documents</h3>
                      <p className="text-xs text-muted-foreground">All quotations, invoices & challans</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">{filteredList.length} of {list.length}</Badge>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, quotation no, client, company, product…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as any)}>
                    <SelectTrigger className="md:w-[160px] h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="proforma">Proforma</SelectItem>
                      <SelectItem value="invoice">Tax Invoice</SelectItem>
                      <SelectItem value="challan">Challan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
                    <SelectTrigger className="md:w-[160px] h-10"><SelectValue placeholder="Period" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="year">Last 12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  {(search || periodFilter !== "all" || docTypeFilter !== "all") && (
                    <Button variant="outline" onClick={() => { setSearch(""); setPeriodFilter("all"); setDocTypeFilter("all"); }} className="h-10">
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                {list.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/20 flex items-center justify-center shadow-inner">
                      <FileText className="h-12 w-12 text-amber" />
                    </div>
                    <h4 className="font-display font-bold text-2xl mb-2">No documents yet</h4>
                    <p className="text-muted-foreground mb-6">Create your first professional quotation in seconds.</p>
                    <Button onClick={openNew} variant="accent" size="lg" className="gap-2 rounded-2xl">
                      <Plus className="h-5 w-5" /> Create First Quotation
                    </Button>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No documents match your filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left py-3 px-3 font-semibold">Doc No.</th>
                          <th className="text-left py-3 px-3 font-semibold">Type</th>
                          <th className="text-left py-3 px-3 font-semibold">Date</th>
                          <th className="text-left py-3 px-3 font-semibold">Client</th>
                          <th className="text-left py-3 px-3 font-semibold">Site</th>
                          <th className="text-right py-3 px-3 font-semibold">Amount</th>
                          <th className="text-left py-3 px-3 font-semibold">Status</th>
                          <th className="text-right py-3 px-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredList.map((q) => {
                          const t = calcTotals(q);
                          const typeMap: Record<string, { label: string; emoji: string; color: string }> = {
                            quotation: { label: "Quotation", emoji: "📄", color: "bg-blue-50 text-blue-700 border-blue-200" },
                            proforma: { label: "Proforma", emoji: "🧾", color: "bg-violet-50 text-violet-700 border-violet-200" },
                            invoice: { label: "Tax Invoice", emoji: "💼", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                            challan: { label: "Challan", emoji: "🚚", color: "bg-amber-50 text-amber-700 border-amber-200" },
                          };
                          const dt = typeMap[q.doc_type || "quotation"];
                          return (
                            <tr key={q.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                              <td className="py-4 px-3 font-bold text-primary font-mono text-xs">{q.quotation_number}</td>
                              <td className="py-4 px-3">
                                <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border", dt.color)}>
                                  <span>{dt.emoji}</span>{dt.label}
                                </span>
                              </td>
                              <td className="py-4 px-3 text-muted-foreground text-xs">{new Date(q.date).toLocaleDateString("en-IN")}</td>
                              <td className="py-4 px-3">
                                <div className="font-medium">{q.client_name || "—"}</div>
                                <div className="text-xs text-muted-foreground">{q.client_company}</div>
                              </td>
                              <td className="py-4 px-3 text-muted-foreground text-xs max-w-[180px] truncate">{q.site_location || "—"}</td>
                              <td className="py-4 px-3 text-right font-bold tabular-nums">{fmt(t.total)}</td>
                              <td className="py-4 px-3"><StatusBadge status={q.status} /></td>
                              <td className="py-4 px-3 text-right">
                                <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" onClick={() => openPreview(q)} title="Preview" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(q)} title="Edit" className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"><FileEdit className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => remove(q.id)} title="Delete" className="h-8 w-8 text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {view === "form" && current && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <QuotationForm
              quotation={current}
              onChange={setCurrent}
              onBack={() => setView("dashboard")}
              onSave={(q) => { persist(q); setView("dashboard"); }}
              onPreview={(q) => { const next = withAutoGstMode(q); persist(next); setCurrent(next); setView("preview"); }}
            />
          </motion.div>
        )}

        {view === "preview" && current && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <QuotationPreview
              quotation={current}
              onBack={() => setView("dashboard")}
              onEdit={() => setView("form")}
              onConvert={(type) => {
                const updated: Quotation = withAutoGstMode(
                  type === current.doc_type
                    ? current
                    : { ...current, doc_type: type, quotation_number: newDocNumber(type) }
                );
                setCurrent(updated);
                persist(updated);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==================== STAT TILE ==================== */
function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-2xl transition-all duration-300"
    >
      <div className={cn("absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-br opacity-10 blur-2xl group-hover:opacity-20 transition-opacity", color)} />
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", color)} />
      <div className="relative">
        <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/20", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">{label}</p>
        <p className="text-3xl font-display font-bold mt-1 tabular-nums">{value}</p>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: Quotation["status"] }) {
  const map: Record<Quotation["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <Badge className={cn("capitalize", map[status])}>{status}</Badge>;
}

/* ==================== FORM ==================== */
function QuotationForm({
  quotation, onChange, onBack, onSave, onPreview,
}: {
  quotation: Quotation;
  onChange: (q: Quotation) => void;
  onBack: () => void;
  onSave: (q: Quotation) => void;
  onPreview: (q: Quotation) => void;
}) {
  const q = quotation;
  const set = (patch: Partial<Quotation>) => onChange(withAutoGstMode({ ...q, ...patch }));
  const setDocType = (type: Quotation["doc_type"]) => {
    if (type === q.doc_type) return;
    onChange(withAutoGstMode({ ...q, doc_type: type, quotation_number: newDocNumber(type) }));
  };

  const totals = calcTotals(q);
  const activeGstMode = gstModeForQuotation(q);
  const optionalItems = q.optional_items || [];
  const optionalTotal = optionalItems.reduce((s, i) => s + itemAmount(i), 0);

  // ── Cabin sections (grouping) ─────────────────────────────────────────────
  const cabins = q.cabins || [];
  const hasCabins = cabins.length > 0;

  // Renders the full totals ladder (Basic Value → GST → Grand Total → Advance/Balance)
  // for a given totals object. Reused for the combined total and for each cabin when
  // "Separate Cabin Totals" is on.
  const totalsLadder = (t: ReturnType<typeof calcTotals>) => (
    <>
      <Row label="Basic Value" value={fmt(t.subtotal)} />
      {t.discountBefore > 0 && (
        <Row
          label={`Discount (Before Tax)${q.discount_before_type === "percent" ? ` @ ${q.discount_before_value}%` : ""}`}
          value={`- ${fmt(t.discountBefore)}`}
        />
      )}
      {t.discountBefore > 0 && <Row label="Taxable Value" value={fmt(t.taxable)} />}
      {q.include_gst === false ? (
        <Row label="GST" value="Not Applicable" />
      ) : activeGstMode === "cgst_sgst" ? (
        <>
          <Row label={`CGST (${(q.gst_percent / 2).toFixed(2)}%)`} value={fmt(t.cgst)} />
          <Row label={`SGST (${(q.gst_percent / 2).toFixed(2)}%)`} value={fmt(t.sgst)} />
        </>
      ) : (
        <Row label={`IGST (${q.gst_percent}%)`} value={fmt(t.igst)} />
      )}
      {t.discountAfter > 0 && (
        <Row
          label={`Discount (After Tax)${q.discount_after_type === "percent" ? ` @ ${q.discount_after_value}%` : ""}`}
          value={`- ${fmt(t.discountAfter)}`}
        />
      )}
      <div className="border-t pt-2 mt-2">
        <Row label="Grand Total" value={fmt(t.total)} bold />
      </div>
      {t.advancePaid > 0 && (
        <>
          <Row
            label={`Advance Paid${q.advance_paid_type === "percent" ? ` @ ${q.advance_paid_value}%` : ""}`}
            value={`- ${fmt(t.advancePaid)}`}
          />
          <Row label="Balance Due" value={fmt(t.balanceDue)} bold />
        </>
      )}
    </>
  );
  const addCabin = () => {
    const newCabin: CabinSection = { id: uid(), name: `Cabin ${cabins.length + 1}` };
    if (cabins.length === 0) {
      // First cabin adopts all existing (untagged) rows so nothing is left orphaned.
      set({
        cabins: [newCabin],
        items: q.items.map((x) => (x.cabin_id ? x : { ...x, cabin_id: newCabin.id })),
        specs: q.specs.map((x) => (x.cabin_id ? x : { ...x, cabin_id: newCabin.id })),
        optional_items: optionalItems.map((x) => (x.cabin_id ? x : { ...x, cabin_id: newCabin.id })),
      });
    } else {
      set({ cabins: [...cabins, newCabin] });
    }
  };
  const updateCabin = (id: string, name: string) =>
    set({ cabins: cabins.map((c) => (c.id === id ? { ...c, name } : c)) });
  const removeCabin = (id: string) => {
    const remaining = cabins.filter((c) => c.id !== id);
    const fallback = remaining[0]?.id; // reassign this cabin's rows to the first remaining cabin (undefined → flat when none left)
    set({
      cabins: remaining,
      items: q.items.map((x) => (x.cabin_id === id ? { ...x, cabin_id: fallback } : x)),
      specs: q.specs.map((x) => (x.cabin_id === id ? { ...x, cabin_id: fallback } : x)),
      optional_items: optionalItems.map((x) => (x.cabin_id === id ? { ...x, cabin_id: fallback } : x)),
    });
  };

  const updateItem = (id: string, patch: Partial<ProductItem>) => {
    set({ items: q.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  };
  const addItem = (cabinId?: string) => set({ items: [...q.items, { ...emptyItem(), ...(cabinId ? { cabin_id: cabinId } : {}) }] });
  const removeItem = (id: string) => set({ items: q.items.filter((it) => it.id !== id) });
  const moveItem = (id: string, dir: -1 | 1) => {
    const arr = [...q.items];
    const i = arr.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ items: arr });
  };

  // Optional items — mirror the item helpers but on q.optional_items.
  const updateOptionalItem = (id: string, patch: Partial<ProductItem>) => {
    set({ optional_items: optionalItems.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  };
  const addOptionalItem = (cabinId?: string) => set({ optional_items: [...optionalItems, { ...emptyItem(), ...(cabinId ? { cabin_id: cabinId } : {}) }] });
  const removeOptionalItem = (id: string) => set({ optional_items: optionalItems.filter((it) => it.id !== id) });
  const moveOptionalItem = (id: string, dir: -1 | 1) => {
    const arr = [...optionalItems];
    const i = arr.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ optional_items: arr });
  };

  // Option Items — customer-requested change options (increase/decrease vs base total).
  const optionItems = q.option_items || [];
  const updateOptionItem = (id: string, patch: Partial<OptionItem>) =>
    set({ option_items: optionItems.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const addOptionItem = () =>
    set({ option_items: [...optionItems, { id: uid(), description: "", direction: "increase", amount: 0 } as OptionItem] });
  const removeOptionItem = (id: string) => set({ option_items: optionItems.filter((o) => o.id !== id) });
  const moveOptionItem = (id: string, dir: -1 | 1) => {
    const arr = [...optionItems];
    const i = arr.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ option_items: arr });
  };

  const updateSpec = (id: string, patch: Partial<SpecRow>) => {
    set({ specs: q.specs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const addSpec = (cat = "General Details", cabinId?: string) => set({ specs: [...q.specs, { ...emptySpec(cat), ...(cabinId ? { cabin_id: cabinId } : {}) }] });
  const removeSpec = (id: string) => set({ specs: q.specs.filter((s) => s.id !== id) });
  const moveSpec = (id: string, dir: -1 | 1) => {
    const arr = [...q.specs];
    const i = arr.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ specs: arr });
  };

  const updateTerm = (i: number, val: string) => {
    const next = [...q.terms];
    next[i] = val;
    set({ terms: next });
  };
  const addTerm = () => set({ terms: [...q.terms, ""] });
  const removeTerm = (i: number) => set({ terms: q.terms.filter((_, idx) => idx !== i) });

  const docTypeMeta: Record<string, { label: string; emoji: string }> = {
    quotation: { label: "Quotation", emoji: "📄" },
    proforma: { label: "Proforma Invoice", emoji: "🧾" },
    invoice: { label: "Tax Invoice", emoji: "💼" },
    challan: { label: "Delivery Challan", emoji: "🚚" },
  };
  const meta = docTypeMeta[q.doc_type];

  return (
    <div className="space-y-6">
      {/* Sticky premium header */}
      <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 bg-background/80 backdrop-blur-xl border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber to-amber-light flex items-center justify-center shadow-lg shadow-amber/30 text-xl">
                {meta.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight">{q.quotation_number}</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">{meta.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Live editor · Auto-saves to local storage</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={q.doc_type} onValueChange={(v) => setDocType(v as Quotation["doc_type"])}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quotation">📄 Quotation</SelectItem>
                <SelectItem value="proforma">🧾 Proforma Invoice</SelectItem>
                <SelectItem value="invoice">💼 Tax Invoice</SelectItem>
                <SelectItem value="challan">🚚 Delivery Challan</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => onSave(q)} className="gap-2 rounded-xl"><Save className="h-4 w-4" /> Save</Button>
            <Button
              onClick={() => onPreview(q)}
              className="gap-2 rounded-xl bg-gradient-to-r from-amber to-amber-light text-white border-0 shadow-lg shadow-amber/30 hover:shadow-amber/50"
            >
              <Eye className="h-4 w-4" /> Preview & PDF
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl h-auto p-1.5 rounded-2xl bg-muted/60 backdrop-blur">
          <TabsTrigger value="basic" className="gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-amber py-2"><Hash className="h-3.5 w-3.5" /> Basic</TabsTrigger>
          <TabsTrigger value="client" className="gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-amber py-2"><Building2 className="h-3.5 w-3.5" /> Client</TabsTrigger>
          <TabsTrigger value="items" className="gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-amber py-2"><Package className="h-3.5 w-3.5" /> Items & Specs</TabsTrigger>
          <TabsTrigger value="terms" className="gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-amber py-2"><FileCheck2 className="h-3.5 w-3.5" /> Terms</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-amber py-2"><Banknote className="h-3.5 w-3.5" /> Bank</TabsTrigger>
        </TabsList>

        {/* BASIC */}
        <TabsContent value="basic">
          <AdminCard>
            <AdminCardContent>
              <SectionTitle icon={Hash} title="Basic Details" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label={q.doc_type === "proforma" ? "Proforma Number" : q.doc_type === "invoice" ? "Invoice Number" : q.doc_type === "challan" ? "Challan Number" : "Quotation Number"}><Input value={q.quotation_number} onChange={(e) => set({ quotation_number: e.target.value })} /></Field>
                <Field label="Date"><Input type="date" value={q.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                <Field label="Validity"><Input value={q.validity} onChange={(e) => set({ validity: e.target.value })} /></Field>
                <Field label="PO Number"><Input value={q.po_number} onChange={(e) => set({ po_number: e.target.value })} placeholder="PO-XXXX" /></Field>
                <Field label="PO Date"><Input type="date" value={q.po_date} onChange={(e) => set({ po_date: e.target.value })} /></Field>
                <Field label="E-Way Bill Number"><Input value={q.eway_number} onChange={(e) => set({ eway_number: e.target.value })} /></Field>
                <Field label="E-Way Bill Date"><Input type="date" value={q.eway_date} onChange={(e) => set({ eway_date: e.target.value })} /></Field>
                <Field label="Delivery Challan Number"><Input value={q.challan_number} onChange={(e) => set({ challan_number: e.target.value })} /></Field>
                <Field label="Invoice Reference Number"><Input value={q.invoice_ref} onChange={(e) => set({ invoice_ref: e.target.value })} /></Field>
                <Field label="Vehicle Number"><Input value={q.vehicle_number} onChange={(e) => set({ vehicle_number: e.target.value })} placeholder="TN 24 XX 0000" /></Field>
                <Field label="Document Type">
                  <Select value={q.doc_type} onValueChange={(v) => setDocType(v as Quotation["doc_type"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="proforma">Proforma Invoice</SelectItem>
                      <SelectItem value="invoice">Tax Invoice</SelectItem>
                      <SelectItem value="challan">Delivery Challan</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default HSN/SAC Code">
                  <Input value={q.default_hsn} onChange={(e) => set({ default_hsn: e.target.value })} placeholder="9406 / 998732" />
                </Field>
                <Field label="GST Type">
                  <Select value={q.gst_mode} onValueChange={(v) => set({ gst_mode: v as Quotation["gst_mode"] })} disabled={q.include_gst === false}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cgst_sgst">CGST + SGST (Intra-state)</SelectItem>
                      <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Apply GST">
                  <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-muted/20">
                    <Switch
                      id="include-gst"
                      checked={q.include_gst !== false}
                      onCheckedChange={(v) => set({ include_gst: v })}
                    />
                    <label htmlFor="include-gst" className="text-sm cursor-pointer">
                      {q.include_gst !== false ? "GST applied to this document" : "GST disabled — totals exclude tax"}
                    </label>
                  </div>
                </Field>
                <Field label="Header: Owner Name First">
                  <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-muted/20">
                    <Switch
                      id="proprietor-first"
                      checked={q.proprietor_first === true}
                      onCheckedChange={(v) => set({ proprietor_first: v })}
                    />
                    <label htmlFor="proprietor-first" className="text-sm cursor-pointer">
                      {q.proprietor_first ? "SHAIKH ABDUL KALAM (Portable Office Cabin)" : `${COMPANY.name} (default)`}
                    </label>
                  </div>
                </Field>
                <Field label="Header: Company Name Below Owner">
                  <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-muted/20">
                    <Switch
                      id="company-below-owner"
                      checked={q.company_below_owner === true}
                      disabled={!q.proprietor_first}
                      onCheckedChange={(v) => set({ company_below_owner: v })}
                    />
                    <label htmlFor="company-below-owner" className="text-sm cursor-pointer">
                      {!q.proprietor_first
                        ? "Turn on “Owner Name First” to use this"
                        : q.company_below_owner
                          ? "(Portable Office Cabin) on a new line below"
                          : "(Portable Office Cabin) on the same line"}
                    </label>
                  </div>
                </Field>
              </div>

              <SectionTitle icon={IndianRupee} title="Commercial Details" className="mt-8" />
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Payment Terms"><Input value={q.payment_terms} onChange={(e) => set({ payment_terms: e.target.value })} /></Field>
                <Field label="Delivery Timeline"><Input value={q.delivery_timeline} onChange={(e) => set({ delivery_timeline: e.target.value })} /></Field>
                <Field label="Transportation Charges"><Input value={q.transport_charges} onChange={(e) => set({ transport_charges: e.target.value })} /></Field>
                <Field label="GST Slab (Indian GST Rates)">
                  <div className="flex gap-2">
                    <Select
                      value={[0, 0.25, 3, 5, 12, 18, 28].includes(q.gst_percent) ? String(q.gst_percent) : "custom"}
                      onValueChange={(v) => { if (v !== "custom") set({ gst_percent: parseFloat(v) }); }}
                    >
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select GST %" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="0">0% — Exempted (Essential goods)</SelectItem>
                        <SelectItem value="0.25">0.25% — Rough precious stones</SelectItem>
                        <SelectItem value="3">3% — Gold, Silver, Jewellery</SelectItem>
                        <SelectItem value="5">5% — Essential items</SelectItem>
                        <SelectItem value="12">12% — Standard goods</SelectItem>
                        <SelectItem value="18">18% — Most goods & services (Default)</SelectItem>
                        <SelectItem value="28">28% — Luxury / Sin goods</SelectItem>
                        <SelectItem value="custom">Custom %</SelectItem>
                      </SelectContent>
                    </Select>
                    <NumberInput
                      className="w-24"
                      value={q.gst_percent}
                      placeholder="%"
                      onChange={(e) => set({ gst_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </Field>
                <Field label="Discount BEFORE Tax (on Basic)">
                  <div className="flex gap-2">
                    <NumberInput
                      className="flex-1"
                      min={0}
                      value={q.discount_before_value === 0 ? "" : q.discount_before_value}
                      placeholder="0"
                      onChange={(e) => set({ discount_before_value: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                    />
                    <Select
                      value={q.discount_before_type || "amount"}
                      onValueChange={(v) => set({ discount_before_type: v as "percent" | "amount" })}
                    >
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">₹</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label="Discount AFTER Tax (on Total)">
                  <div className="flex gap-2">
                    <NumberInput
                      className="flex-1"
                      min={0}
                      value={q.discount_after_value === 0 ? "" : q.discount_after_value}
                      placeholder="0"
                      onChange={(e) => set({ discount_after_value: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                    />
                    <Select
                      value={q.discount_after_type || "amount"}
                      onValueChange={(v) => set({ discount_after_type: v as "percent" | "amount" })}
                    >
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">₹</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label="Advance Paid (on Grand Total)">
                  <div className="flex gap-2">
                    <NumberInput
                      className="flex-1"
                      min={0}
                      value={q.advance_paid_value === 0 ? "" : q.advance_paid_value}
                      placeholder="0"
                      onChange={(e) => set({ advance_paid_value: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                    />
                    <Select
                      value={q.advance_paid_type || "amount"}
                      onValueChange={(v) => set({ advance_paid_type: v as "percent" | "amount" })}
                    >
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">₹</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <div className="md:col-span-2"><Field label="Notes / Remarks"><Textarea rows={3} value={q.notes} onChange={(e) => set({ notes: e.target.value })} /></Field></div>
              </div>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* CLIENT */}
        <TabsContent value="client">
          <ClientTab q={q} set={set} />
        </TabsContent>

        {/* ITEMS */}
        <TabsContent value="items">
          <AdminCard>
            <AdminCardContent>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <SectionTitle icon={Package} title="Product / Cabin Details" className="!mb-0" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30">
                    <Switch
                      checked={q.include_optional_items === true}
                      onCheckedChange={(v) => set({ include_optional_items: v })}
                      id="include-optional"
                    />
                    <Label htmlFor="include-optional" className="text-xs cursor-pointer whitespace-nowrap">
                      {q.include_optional_items ? "Optional Items: ON" : "Optional Items: OFF"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30">
                    <Switch
                      checked={q.include_option_items === true}
                      onCheckedChange={(v) => set({ include_option_items: v })}
                      id="include-option"
                    />
                    <Label htmlFor="include-option" className="text-xs cursor-pointer whitespace-nowrap">
                      {q.include_option_items ? "Option Items: ON" : "Option Items: OFF"}
                    </Label>
                  </div>
                  {hasCabins && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30">
                      <Switch
                        checked={q.separate_cabin_totals === true}
                        onCheckedChange={(v) => set({ separate_cabin_totals: v })}
                        id="separate-cabin-totals"
                      />
                      <Label htmlFor="separate-cabin-totals" className="text-xs cursor-pointer whitespace-nowrap">
                        {q.separate_cabin_totals ? "Separate Cabin Totals: ON" : "Separate Cabin Totals: OFF"}
                      </Label>
                    </div>
                  )}
                  <Button onClick={addCabin} variant="outline" size="sm" className="gap-2 border-primary/40 text-primary"><Plus className="h-4 w-4" /> Add Cabin</Button>
                  <Button onClick={() => addItem()} variant="accent" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
                </div>
              </div>

              {/* Items — grouped under cabin sections when cabins exist, else flat (legacy). */}
              {(hasCabins ? groupByCabin(q.items, cabins)! : [{ cabin: null as CabinSection | null, items: q.items }]).map((g) => (
                <div key={g.cabin?.id ?? "flat"} className={g.cabin ? "rounded-xl border-2 border-primary/20 overflow-hidden mb-4" : ""}>
                  {g.cabin && (
                    <div className="flex items-center gap-2 bg-primary/5 px-3 py-2.5 border-b">
                      <span className="font-bold text-primary text-sm whitespace-nowrap flex items-center gap-1"><Package className="h-4 w-4" /> Cabin</span>
                      <Input value={g.cabin.name} onChange={(e) => updateCabin(g.cabin!.id, e.target.value)} className="h-8 max-w-[220px] font-semibold" placeholder="Cabin name" />
                      <span className="text-xs text-muted-foreground ml-auto">{g.items.length} item{g.items.length === 1 ? "" : "s"}</span>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => removeCabin(g.cabin!.id)} title="Delete this cabin"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                  <div className={g.cabin ? "p-3 space-y-4" : "space-y-4"}>
                {g.items.map((it, idx) => { const gi = q.items.indexOf(it); return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-xl p-4 bg-muted/20 relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">Item #{idx + 1}</Badge>
                        {hasCabins && (
                          <select value={it.cabin_id || cabins[0].id} onChange={(e) => updateItem(it.id, { cabin_id: e.target.value })} className="h-7 text-xs bg-background border rounded px-2" title="Move to cabin">
                            {cabins.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, -1)} disabled={gi === 0} className="h-8 w-8" title="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, 1)} disabled={gi === q.items.length - 1} className="h-8 w-8" title="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        {q.items.length > 1 && (
                          <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} className="text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Field label="Product Name"><Input value={it.product_name} onChange={(e) => updateItem(it.id, { product_name: e.target.value })} placeholder="Portable Office Cabin" /></Field>
                      <Field label="Cabin Type"><Input value={it.cabin_type} onChange={(e) => updateItem(it.id, { cabin_type: e.target.value })} placeholder="MS / Container" /></Field>
                      <Field label="Length (ft)"><Input value={it.length} onChange={(e) => updateItem(it.id, { length: e.target.value })} placeholder="20" /></Field>
                      <Field label="Width (ft)"><Input value={it.width} onChange={(e) => updateItem(it.id, { width: e.target.value })} placeholder="10" /></Field>
                      <Field label="Height (ft)"><Input value={it.height} onChange={(e) => updateItem(it.id, { height: e.target.value })} placeholder="9" /></Field>
                      <Field label="Quantity"><NumberInput  min={0} value={it.quantity === 0 ? "" : it.quantity} placeholder="0" onChange={(e) => updateItem(it.id, { quantity: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /></Field>
                      <Field label="Unit (UQC)"><UnitPicker value={it.unit} onChange={(v) => updateItem(it.id, { unit: v })} /></Field>
                      <Field label="Unit Rate (₹)"><NumberInput  min={0} value={it.unit_rate === 0 ? "" : it.unit_rate} placeholder="0.00" onChange={(e) => updateItem(it.id, { unit_rate: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /></Field>
                      <Field label="HSN / SAC Code *"><Input value={it.hsn_code} onChange={(e) => updateItem(it.id, { hsn_code: e.target.value })} placeholder="9406" /></Field>
                      <Field label="Taxable Value (₹)">
                        <Input value={fmt(itemAmount(it))} readOnly className="bg-muted/40 font-semibold" />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <Field label="Description Points (one per line — each line shown as a bullet)">
                        <Textarea
                          rows={4}
                          value={it.description_points}
                          onChange={(e) => updateItem(it.id, { description_points: e.target.value })}
                          placeholder={"Walls: 50mm PUF insulated sandwich panel\nFlooring: 18mm marine ply with vinyl\nElectricals: MCB, 4 LED lights, 2 fans, 4 sockets\nWindows: 2 sliding aluminum windows with mosquito mesh"}
                          className="text-sm font-mono"
                        />
                      </Field>
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-xl font-display font-bold text-primary">{fmt(itemAmount(it))}</p>
                      </div>
                    </div>
                  </motion.div>
                ); })}
                    {g.cabin && (
                      <Button onClick={() => addItem(g.cabin!.id)} variant="outline" size="sm" className="w-full gap-2 border-dashed"><Plus className="h-4 w-4" /> Add Item to {g.cabin.name}</Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Item / Add Cabin at the bottom. In flat mode, a plain Add Item;
                  in grouped mode each cabin has its own Add Item, so only Add Cabin here. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {!hasCabins && (
                  <Button onClick={() => addItem()} variant="outline" size="sm" className="flex-1 gap-2 border-dashed"><Plus className="h-4 w-4" /> Add Item</Button>
                )}
                <Button onClick={addCabin} variant="outline" size="sm" className={`gap-2 border-dashed border-primary/40 text-primary ${hasCabins ? "w-full" : ""}`}><Plus className="h-4 w-4" /> Add Cabin</Button>
              </div>

              {/* OPTIONAL ITEMS — add-on section, NOT included in the Grand Total */}
              {q.include_optional_items && (
                <div className="mt-6 border-2 border-dashed border-amber/40 rounded-xl p-4 bg-amber/5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber" />
                      <h4 className="font-semibold text-sm">
                        Optional Items{" "}
                        <span className="text-xs font-normal text-muted-foreground">(add-ons — NOT added to the Grand Total)</span>
                      </h4>
                    </div>
                    <Button onClick={() => addOptionalItem()} variant="outline" size="sm" className="gap-2 border-amber/50 text-amber hover:bg-amber/10">
                      <Plus className="h-4 w-4" /> Add Optional Item
                    </Button>
                  </div>
                  {optionalItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-md text-center">
                      No optional items yet. Click &ldquo;Add Optional Item&rdquo; to offer add-ons the customer can choose.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {optionalItems.map((it, idx) => (
                        <motion.div
                          key={it.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-xl p-4 bg-background relative"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono bg-amber/10 border-amber/30 text-amber-700">Optional #{idx + 1}</Badge>
                              {hasCabins && (
                                <select value={it.cabin_id || cabins[0].id} onChange={(e) => updateOptionalItem(it.id, { cabin_id: e.target.value })} className="h-7 text-xs bg-background border rounded px-2" title="Assign to cabin">
                                  {cabins.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => moveOptionalItem(it.id, -1)} disabled={idx === 0} className="h-8 w-8" title="Move up"><ArrowUp className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => moveOptionalItem(it.id, 1)} disabled={idx === optionalItems.length - 1} className="h-8 w-8" title="Move down"><ArrowDown className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => removeOptionalItem(it.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Field label="Product Name"><Input value={it.product_name} onChange={(e) => updateOptionalItem(it.id, { product_name: e.target.value })} placeholder="e.g. Extra split AC unit" /></Field>
                            <Field label="Cabin Type"><Input value={it.cabin_type} onChange={(e) => updateOptionalItem(it.id, { cabin_type: e.target.value })} placeholder="—" /></Field>
                            <Field label="Length (ft)"><Input value={it.length} onChange={(e) => updateOptionalItem(it.id, { length: e.target.value })} placeholder="" /></Field>
                            <Field label="Width (ft)"><Input value={it.width} onChange={(e) => updateOptionalItem(it.id, { width: e.target.value })} placeholder="" /></Field>
                            <Field label="Height (ft)"><Input value={it.height} onChange={(e) => updateOptionalItem(it.id, { height: e.target.value })} placeholder="" /></Field>
                            <Field label="Quantity"><NumberInput min={0} value={it.quantity === 0 ? "" : it.quantity} placeholder="0" onChange={(e) => updateOptionalItem(it.id, { quantity: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /></Field>
                            <Field label="Unit (UQC)"><UnitPicker value={it.unit} onChange={(v) => updateOptionalItem(it.id, { unit: v })} /></Field>
                            <Field label="Unit Rate (₹)"><NumberInput min={0} value={it.unit_rate === 0 ? "" : it.unit_rate} placeholder="0.00" onChange={(e) => updateOptionalItem(it.id, { unit_rate: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /></Field>
                            <Field label="HSN / SAC Code"><Input value={it.hsn_code} onChange={(e) => updateOptionalItem(it.id, { hsn_code: e.target.value })} placeholder="9406" /></Field>
                            <Field label="Amount (₹)"><Input value={fmt(itemAmount(it))} readOnly className="bg-muted/40 font-semibold" /></Field>
                          </div>
                          <div className="mt-3">
                            <Field label="Description Points (one per line — each line shown as a bullet)">
                              <Textarea rows={3} value={it.description_points} onChange={(e) => updateOptionalItem(it.id, { description_points: e.target.value })} className="text-sm font-mono" />
                            </Field>
                          </div>
                        </motion.div>
                      ))}
                      <div className="flex justify-end pt-1 border-t border-amber/20">
                        <div className="text-right pt-2">
                          <p className="text-xs text-muted-foreground">Optional Items Total (not in Grand Total)</p>
                          <p className="text-lg font-display font-bold text-amber">{fmt(optionalTotal)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPTION ITEMS — customer-requested change options (increase/decrease vs base total) */}
              {q.include_option_items && (
                <div className="mt-6 border-2 border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">
                        Option Items{" "}
                        <span className="text-xs font-normal text-muted-foreground">(change options — base total stays the same)</span>
                      </h4>
                    </div>
                    <Button onClick={addOptionItem} variant="outline" size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                      <Plus className="h-4 w-4" /> Add Option
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">e.g. &ldquo;Upgrade flooring to premium vinyl (+₹5,000)&rdquo; or &ldquo;Standard wall interior instead of PVC (−₹3,000)&rdquo;. Each option shows the revised total if the customer picks it; the base Grand Total is not changed.</p>
                  {optionItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-md text-center">
                      No options yet. Click &ldquo;Add Option&rdquo; to list a change the customer can choose.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {optionItems.map((o, idx) => {
                        const delta = o.direction === "increase" ? (o.amount || 0) : -(o.amount || 0);
                        const revised = totals.total + delta;
                        return (
                        <div key={o.id} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-mono">Option #{idx + 1}</Badge>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => moveOptionItem(o.id, -1)} disabled={idx === 0} className="h-8 w-8" title="Move up"><ArrowUp className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => moveOptionItem(o.id, 1)} disabled={idx === optionItems.length - 1} className="h-8 w-8" title="Move down"><ArrowDown className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => removeOptionItem(o.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-12 gap-3 items-start">
                            <div className="md:col-span-6"><Field label="Change Description"><Input value={o.description} onChange={(e) => updateOptionItem(o.id, { description: e.target.value })} placeholder="e.g. Upgrade flooring to premium vinyl" /></Field></div>
                            <div className="md:col-span-3"><Field label="Effect">
                              <Select value={o.direction} onValueChange={(v) => updateOptionItem(o.id, { direction: v as "increase" | "decrease" })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="increase">Increase (+)</SelectItem>
                                  <SelectItem value="decrease">Reduction (−)</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field></div>
                            <div className="md:col-span-3"><Field label="Cost Difference (₹)"><NumberInput min={0} value={o.amount === 0 ? "" : o.amount} placeholder="0" onChange={(e) => updateOptionItem(o.id, { amount: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /></Field></div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm border-t pt-2">
                            <span className={o.direction === "increase" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {o.direction === "increase" ? "+ " : "− "}{fmt(o.amount || 0)}
                            </span>
                            <span className="text-muted-foreground">Revised Total:</span>
                            <span className="font-display font-bold text-[15px] px-2 py-0.5 rounded" style={{ background: "#fdf3e7", color: "#b45309" }}>{fmt(revised)}</span>
                          </div>
                        </div>
                        );
                      })}
                      {/* Combined: all options applied together (net of every increase/reduction) */}
                      {optionItems.length >= 2 && (() => {
                        const combinedDelta = optionItems.reduce((s, o) => s + (o.direction === "increase" ? (o.amount || 0) : -(o.amount || 0)), 0);
                        const combinedTotal = totals.total + combinedDelta;
                        const up = combinedDelta >= 0;
                        return (
                          <div className="mt-1 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm rounded-lg border-2 border-primary/40 bg-primary/10 p-3">
                            <span className="mr-auto font-semibold text-primary">All {optionItems.length} options applied together</span>
                            <span className={up ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {up ? "+ " : "− "}{fmt(Math.abs(combinedDelta))}
                            </span>
                            <span className="text-muted-foreground">Combined Total:</span>
                            <span className="font-display font-bold text-primary">{fmt(combinedTotal)}</span>
                          </div>
                        );
                      })()}
                      <p className="text-[11px] text-muted-foreground text-right">Base Grand Total {fmt(totals.total)} — each option row is applied to this base independently; the combined row applies all options together.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Discounts — quick edit, synced with Commercial Details */}
              <div className="mt-6 border rounded-xl p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-amber" />
                  <h4 className="font-semibold text-sm">Discounts &amp; Advance</h4>
                  <span className="text-xs text-muted-foreground">(also editable in Basic › Commercial Details)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Discount BEFORE Tax (on Basic)">
                    <div className="flex gap-2">
                      <NumberInput
                        className="flex-1"
                        min={0}
                        value={q.discount_before_value === 0 ? "" : q.discount_before_value}
                        placeholder="0"
                        onChange={(e) => set({ discount_before_value: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                      />
                      <Select
                        value={q.discount_before_type || "amount"}
                        onValueChange={(v) => set({ discount_before_type: v as "percent" | "amount" })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">₹</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                  <Field label="Discount AFTER Tax (on Total)">
                    <div className="flex gap-2">
                      <NumberInput
                        className="flex-1"
                        min={0}
                        value={q.discount_after_value === 0 ? "" : q.discount_after_value}
                        placeholder="0"
                        onChange={(e) => set({ discount_after_value: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                      />
                      <Select
                        value={q.discount_after_type || "amount"}
                        onValueChange={(v) => set({ discount_after_type: v as "percent" | "amount" })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">₹</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                  <Field label="Advance Paid (on Grand Total)">
                    <div className="flex gap-2">
                      <NumberInput
                        className="flex-1"
                        min={0}
                        value={q.advance_paid_value === 0 ? "" : q.advance_paid_value}
                        placeholder="0"
                        onChange={(e) => set({ advance_paid_value: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                      />
                      <Select
                        value={q.advance_paid_type || "amount"}
                        onValueChange={(v) => set({ advance_paid_type: v as "percent" | "amount" })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">₹</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                </div>
              </div>

              {/* Totals — one combined block, or one standalone quote per cabin when "Separate Cabin Totals" is on */}
              {q.separate_cabin_totals && hasCabins ? (
                <div className="mt-6 ml-auto max-w-sm space-y-4">
                  {calcCabinTotals(q)!.map(({ cabin, totals: ct }) => (
                    <div key={cabin.id} className="border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-amber/5 space-y-2">
                      <div className="text-sm font-semibold text-primary border-b pb-1.5 mb-1">{cabin.name} — separate quote</div>
                      {totalsLadder(ct)}
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground text-right">Each cabin is quoted separately — there is no combined grand total.</p>
                </div>
              ) : (
                <div className="mt-6 ml-auto max-w-sm border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-amber/5 space-y-2">
                  {totalsLadder(totals)}
                </div>
              )}
            </AdminCardContent>
          </AdminCard>

          {/* TECHNICAL SPECIFICATIONS — combined on the same page */}
          <AdminCard className="mt-4">
            <AdminCardContent>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <SectionTitle icon={Wrench} title="Technical Specifications" className="!mb-0" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30">
                    <Switch
                      checked={q.include_specs !== false}
                      onCheckedChange={(v) => set({ include_specs: v })}
                      id="include-specs"
                    />
                    <Label htmlFor="include-specs" className="text-xs cursor-pointer">
                      {q.include_specs !== false ? "Included in document" : "Hidden from document"}
                    </Label>
                  </div>
                  <Button onClick={() => addItem()} variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
                  <Button onClick={() => addSpec()} variant="accent" size="sm" className="gap-2" disabled={q.include_specs === false}><Plus className="h-4 w-4" /> Add Row</Button>
                </div>
              </div>
              {q.include_specs === false ? (
                <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-md text-center">
                  Technical Specifications are disabled and will not appear in the PDF / Preview.
                </div>
              ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase">
                    <tr>
                      <th className="text-left p-2 w-44">Category</th>
                      <th className="text-left p-2">Component</th>
                      <th className="text-left p-2">Specification</th>
                      <th className="text-left p-2">Material</th>
                      <th className="text-left p-2 w-28">Thickness/Size</th>
                      <th className="text-left p-2 w-32">Brand / Remarks</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hasCabins ? groupByCabin(q.specs, cabins)! : [{ cabin: null as CabinSection | null, items: q.specs }]).map((g) => (
                      <Fragment key={g.cabin?.id ?? "flat"}>
                        {g.cabin && (
                          <tr className="bg-primary/5 border-t">
                            <td colSpan={7} className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary text-xs">{g.cabin.name} — Specifications</span>
                                <span className="text-[11px] text-muted-foreground">{g.items.length} row{g.items.length === 1 ? "" : "s"}</span>
                                <Button onClick={() => addSpec("General Details", g.cabin!.id)} size="sm" variant="outline" className="ml-auto h-7 gap-1 text-xs" disabled={q.include_specs === false}><Plus className="h-3.5 w-3.5" /> Add Row</Button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {g.items.map((s) => { const sIdx = q.specs.indexOf(s); return (
                      <tr key={s.id} className="border-t hover:bg-muted/20">
                        <td className="p-1">
                          <select
                            value={s.category}
                            onChange={(e) => updateSpec(s.id, { category: e.target.value })}
                            className="w-full bg-background border rounded px-2 py-1.5 text-xs"
                          >
                            {SPEC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-1"><Input className="h-8 text-xs" value={s.component} onChange={(e) => updateSpec(s.id, { component: e.target.value })} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={s.specification} onChange={(e) => updateSpec(s.id, { specification: e.target.value })} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={s.material} onChange={(e) => updateSpec(s.id, { material: e.target.value })} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={s.thickness} onChange={(e) => updateSpec(s.id, { thickness: e.target.value })} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={s.brand} onChange={(e) => updateSpec(s.id, { brand: e.target.value })} /></td>
                        <td className="p-1">
                          <div className="flex items-center gap-0.5">
                            <Button size="icon" variant="ghost" onClick={() => moveSpec(s.id, -1)} disabled={sIdx === 0} className="h-7 w-7" title="Move up">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => moveSpec(s.id, 1)} disabled={sIdx === q.specs.length - 1} className="h-7 w-7" title="Move down">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeSpec(s.id)} className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                        ); })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* TERMS */}
        <TabsContent value="terms">
          <AdminCard>
            <AdminCardContent>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={FileCheck2} title="Terms & Conditions" className="!mb-0" />
                <Button onClick={addTerm} variant="accent" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Term</Button>
              </div>
              <div className="space-y-2">
                {q.terms.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Badge variant="outline" className="shrink-0 w-8 justify-center">{i + 1}</Badge>
                    <Input value={t} onChange={(e) => updateTerm(i, e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => removeTerm(i)} className="text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* BANK */}
        <TabsContent value="bank">
          <AdminCard>
            <AdminCardContent>
              <SectionTitle icon={Banknote} title="Bank Details" />
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Account Holder Name"><Input value={q.bank.account_holder} onChange={(e) => set({ bank: { ...q.bank, account_holder: e.target.value } })} /></Field>
                <Field label="Bank Name"><Input value={q.bank.bank_name} onChange={(e) => set({ bank: { ...q.bank, bank_name: e.target.value } })} /></Field>
                <Field label="Account Number"><Input value={q.bank.account_number} onChange={(e) => set({ bank: { ...q.bank, account_number: e.target.value } })} /></Field>
                <Field label="IFSC Code"><Input value={q.bank.ifsc} onChange={(e) => set({ bank: { ...q.bank, ifsc: e.target.value } })} /></Field>
                <Field label="Branch"><Input value={q.bank.branch} onChange={(e) => set({ bank: { ...q.bank, branch: e.target.value } })} /></Field>
              </div>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================== CLIENT TAB ==================== */
function ClientTab({ q, set }: { q: Quotation; set: (patch: Partial<Quotation>) => void }) {
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [shipPickId, setShipPickId] = useState<string>("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [editingShipId, setEditingShipId] = useState<string>("");
  const activeGstMode = gstModeForQuotation(q);

  // Load clients (parties + party_addresses) from Supabase on mount,
  // and one-time migrate any legacy localStorage clients into Supabase.
  useEffect(() => {
    (async () => {
      try {
        // One-time migration of legacy local clients
        const legacy = loadClients();
        const migratedFlag = "poc_clients_v1_migrated";
        if (legacy.length > 0 && !localStorage.getItem(migratedFlag)) {
          for (const c of legacy) {
            // Skip if a party already exists with same name+company
            const { data: existing } = await (supabase as any)
              .from("parties")
              .select("id")
              .ilike("name", c.name || "")
              .limit(1)
              .maybeSingle();
            let partyId = existing?.id;
            if (!partyId) {
              const { data: ins, error } = await (supabase as any)
                .from("parties")
                .insert({
                  name: c.name || "Unnamed",
                  company: c.company || null,
                  email: c.email || null,
                  phone: c.contact_number || null,
                  gstin: c.gst || null,
                  billing_address: c.address || null,
                  state: c.state || null,
                  pincode: c.pincode || null,
                  contact_person: c.contact_person || null,
                  site_location: c.site_location || null,
                  party_type: "customer",
                })
                .select("id")
                .single();
              if (error) continue;
              partyId = ins.id;
            }
            for (const s of c.shipping || []) {
              await (supabase as any).from("party_addresses").insert({
                party_id: partyId,
                label: s.label || "Site",
                consignee_name: s.name || null,
                company: s.company || null,
                contact_person: s.contact || null,
                contact_phone: s.phone || null,
                gstin: s.gst || null,
                address_line1: s.address || null,
                state: s.state || null,
                pincode: s.pincode || null,
              });
            }
          }
          localStorage.setItem(migratedFlag, "1");
        }
      } catch (e) { console.warn("Client migration skipped:", e); }
      await reloadClients();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadClients = async () => {
    const [pRes, aRes] = await Promise.all([
      (supabase as any).from("parties").select("*").order("name"),
      (supabase as any).from("party_addresses").select("*"),
    ]);
    const parties = (pRes.data as any[]) || [];
    const addrs = (aRes.data as any[]) || [];
    const mapped: SavedClient[] = parties.map((p) => ({
      id: p.id,
      name: p.name || "",
      company: p.company || "",
      address: p.billing_address || "",
      state: p.state || "",
      pincode: p.pincode || "",
      gst: p.gstin || "",
      contact_person: p.contact_person || "",
      contact_number: p.phone || "",
      email: p.email || "",
      site_location: p.site_location || "",
      shipping: addrs
        .filter((a) => a.party_id === p.id)
        .map((a) => ({
          id: a.id,
          label: a.label || "Site",
          name: a.consignee_name || "",
          company: a.company || "",
          address: a.address_line1 || "",
          state: a.state || "",
          pincode: a.pincode || "",
          contact: a.contact_person || "",
          phone: a.contact_phone || "",
          gst: a.gstin || "",
        })),
    }));
    setClients(mapped);
  };

  const pickClient = (id: string) => {
    setSelectedId(id);
    if (!id) return;
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    set({
      client_name: c.name,
      client_company: c.company,
      client_address: c.address,
      client_state: c.state || "",
      client_pincode: c.pincode || "",
      client_gst: c.gst,
      contact_person: c.contact_person,
      contact_number: c.contact_number,
      client_email: c.email,
      site_location: c.site_location,
      gst_mode: (c.state && c.state !== SELLER_STATE) ? "igst" : "cgst_sgst",
    });
    setShipPickId("");
    setEditingShipId("");
    toast({ title: "Client loaded", description: c.name });
  };

  const saveAsClient = async () => {
    if (!q.client_name.trim()) {
      toast({ title: "Client Name required", variant: "destructive" });
      return;
    }
    // Duplicate guard: a client is identified by mobile number / email / GST.
    // When saving a NEW client (no existing selection), if any of these already
    // match a saved client, don't create a duplicate — select the existing one.
    if (!selectedId) {
      const phone = (q.contact_number || "").trim();
      const email = (q.client_email || "").trim().toLowerCase();
      const gst = (q.client_gst || "").trim().toUpperCase();
      const dupe = clients.find((c) =>
        (phone && (c.contact_number || "").trim() === phone) ||
        (email && (c.email || "").trim().toLowerCase() === email) ||
        (gst && (c.gst || "").trim().toUpperCase() === gst)
      );
      if (dupe) {
        toast({
          title: "Client already saved",
          description: `${dupe.name} already exists (matched by mobile / email / GST). Loaded the existing client.`,
        });
        setSelectedId(dupe.id);
        pickClient(dupe.id);
        return;
      }
    }
    const payload: any = {
      name: q.client_name,
      company: q.client_company || null,
      billing_address: q.client_address || null,
      state: q.client_state || null,
      pincode: q.client_pincode || null,
      gstin: q.client_gst || null,
      contact_person: q.contact_person || null,
      phone: q.contact_number || null,
      email: q.client_email || null,
      site_location: q.site_location || null,
      party_type: "customer",
    };
    if (selectedId) {
      const { error } = await (supabase as any).from("parties").update(payload).eq("id", selectedId);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      await reloadClients();
      toast({ title: "Client updated", description: q.client_name });
    } else {
      const { data, error } = await (supabase as any).from("parties").insert(payload).select("id").single();
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      await reloadClients();
      setSelectedId(data.id);
      toast({ title: "Client saved", description: q.client_name });
    }
  };

  const deleteClient = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this saved client?")) return;
    const { error } = await (supabase as any).from("parties").delete().eq("id", selectedId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setSelectedId("");
    await reloadClients();
  };

  const pickShipping = (id: string) => {
    setShipPickId(id);
    const c = clients.find((x) => x.id === selectedId);
    if (!c) return;
    const s = c.shipping.find((x) => x.id === id);
    if (!s) return;
    set({
      same_as_billing: false,
      ship_to_name: s.name,
      ship_to_company: s.company,
      ship_to_address: s.address,
      ship_to_state: s.state || "",
      ship_to_pincode: s.pincode || "",
      ship_to_contact: s.contact,
      ship_to_phone: s.phone,
      ship_to_gst: s.gst,
      gst_mode: (s.state && s.state !== SELLER_STATE) ? "igst" : "cgst_sgst",
    });
    toast({ title: "Shipping address loaded", description: s.label });
  };

  const saveShipping = async () => {
    if (!selectedId) {
      toast({ title: "Save the client first", description: "Use 'Save Client' before adding shipping addresses.", variant: "destructive" });
      return;
    }
    if (!q.ship_to_address.trim() && !q.ship_to_name.trim()) {
      toast({ title: "Shipping address is empty", variant: "destructive" });
      return;
    }

    const fields = {
      consignee_name: q.ship_to_name || null,
      company: q.ship_to_company || null,
      contact_person: q.ship_to_contact || null,
      contact_phone: q.ship_to_phone || null,
      gstin: q.ship_to_gst || null,
      address_line1: q.ship_to_address || null,
      state: q.ship_to_state || null,
      pincode: q.ship_to_pincode || null,
    };

    // Editing an existing site address → update it in place (no duplicate).
    if (editingShipId) {
      const { error } = await (supabase as any).from("party_addresses").update(fields).eq("id", editingShipId);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      await reloadClients();
      toast({ title: "Site address updated" });
      return;
    }

    // Duplicate guard: don't store the same site address twice under one client.
    const client = clients.find((c) => c.id === selectedId);
    const normAddr = (q.ship_to_address || "").trim().toLowerCase();
    const dupe = (client?.shipping || []).find(
      (s) => normAddr && (s.address || "").trim().toLowerCase() === normAddr
    );
    if (dupe) {
      toast({ title: "Shipping address already exists", description: `"${dupe.label}" already has this site address for ${client?.name}.` });
      setShipPickId(dupe.id);
      return;
    }

    const label = window.prompt("Label for this site address (e.g. Site - Hosur, Warehouse)", q.ship_to_name || "Site");
    if (!label) return;
    const { data, error } = await (supabase as any).from("party_addresses").insert({
      party_id: selectedId,
      label,
      ...fields,
    }).select("id").single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await reloadClients();
    setShipPickId(data.id);
    toast({ title: "Site address saved", description: label });
  };

  const startEditShipping = (id: string) => {
    const c = clients.find((x) => x.id === selectedId);
    const s = c?.shipping.find((x) => x.id === id);
    if (!s) return;
    setEditingShipId(id);
    setShipPickId(id);
    set({
      same_as_billing: false,
      ship_to_name: s.name, ship_to_company: s.company, ship_to_address: s.address,
      ship_to_state: s.state || "", ship_to_pincode: s.pincode || "",
      ship_to_contact: s.contact, ship_to_phone: s.phone, ship_to_gst: s.gst,
    });
    toast({ title: "Editing site address", description: s.label });
  };

  const startNewShipping = () => {
    setEditingShipId("");
    setShipPickId("");
    set({
      same_as_billing: false,
      ship_to_name: "", ship_to_company: "", ship_to_address: "",
      ship_to_state: "", ship_to_pincode: "", ship_to_contact: "", ship_to_phone: "", ship_to_gst: "",
    });
  };

  const removeShipping = async (id: string) => {
    if (!selectedId) return;
    if (!confirm("Delete this shipping address?")) return;
    const { error } = await (supabase as any).from("party_addresses").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await reloadClients();
    if (shipPickId === id) setShipPickId("");
    if (editingShipId === id) setEditingShipId("");
  };

  const currentClient = clients.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Saved client picker */}
      <AdminCard>
        <AdminCardContent>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-amber" /> Saved Clients
            </h3>
            <span className="text-xs text-muted-foreground">{clients.length} saved</span>
          </div>
          <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Search / pick a saved client</Label>
              <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {(() => {
                        const c = clients.find((x) => x.id === selectedId);
                        return c ? `${c.name}${c.company ? ` · ${c.company}` : ""}` : "— Select saved client —";
                      })()}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[320px]" align="start">
                  <Command>
                    <CommandInput placeholder="Search name, phone, email, company, project…" />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__new_clear__" onSelect={() => { pickClient(""); setClientPickerOpen(false); }}>
                          ＋ New / clear selection
                        </CommandItem>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.company} ${c.contact_number} ${c.email} ${c.site_location}`}
                            onSelect={() => { pickClient(c.id); setClientPickerOpen(false); }}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{c.name}{c.company ? ` · ${c.company}` : ""}</span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {[c.contact_number, c.email, c.site_location].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                            {selectedId === c.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button variant="accent" onClick={saveAsClient} className="gap-2">
              <BookmarkPlus className="h-4 w-4" /> {selectedId ? "Update Client" : "Save Client"}
            </Button>
            {selectedId && (
              <Button variant="outline" onClick={deleteClient} className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Save once and reuse next time — billing details, contacts and multiple shipping addresses are stored locally.
          </p>
        </AdminCardContent>
      </AdminCard>

      {/* Bill To */}
      <AdminCard>
        <AdminCardContent>
          <SectionTitle icon={Building2} title="Bill To (Client Billing Details)" />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Client Name *"><Input value={q.client_name} onChange={(e) => set({ client_name: e.target.value })} /></Field>
            <Field label="Company Name"><Input value={q.client_company} onChange={(e) => set({ client_company: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Billing Address"><Textarea rows={2} value={q.client_address} onChange={(e) => set({ client_address: e.target.value })} placeholder="Street, area, landmark, city" /></Field></div>
            <Field label="State (Place of Supply) *">
              <Select
                value={q.client_state}
                onValueChange={(v) => {
                  const supplyState = q.same_as_billing ? v : (q.ship_to_state || v);
                  const mode: Quotation["gst_mode"] =
                    supplyState && supplyState !== SELLER_STATE ? "igst" : "cgst_sgst";
                  set({ client_state: v, gst_mode: mode });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pincode *">
              <Input
                inputMode="numeric"
                maxLength={6}
                value={q.client_pincode}
                onChange={(e) => set({ client_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="6-digit PIN"
              />
            </Field>
            <Field label="GST Number"><Input value={q.client_gst} onChange={(e) => set({ client_gst: e.target.value.toUpperCase() })} placeholder="29ABCDE1234F1Z5" /></Field>
            <Field label="Contact Person"><Input value={q.contact_person} onChange={(e) => set({ contact_person: e.target.value })} /></Field>
            <Field label="Contact Number"><Input value={q.contact_number} onChange={(e) => set({ contact_number: e.target.value })} /></Field>
            <Field label="Email ID"><Input type="email" value={q.client_email} onChange={(e) => set({ client_email: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Project / Site Location"><Input value={q.site_location} onChange={(e) => set({ site_location: e.target.value })} /></Field></div>
          </div>
          {q.client_state && (
            <div className="mt-3 text-xs rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span className="font-semibold">GST Auto-detect:</span>{" "}
              {activeGstMode === "cgst_sgst"
                ? <span className="text-green-700">Intra-state → CGST + SGST applied</span>
                : <span className="text-amber-700">Inter-state → IGST applied</span>}
              <span className="text-muted-foreground"> (Seller: {SELLER_STATE})</span>
            </div>
          )}
        </AdminCardContent>
      </AdminCard>

      {/* Ship To */}
      <AdminCard>
        <AdminCardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber/15 text-amber flex items-center justify-center"><Truck className="h-4 w-4" /></span>
              Ship To (Shipping / Delivery)
            </h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={q.same_as_billing}
                onChange={(e) => set({ same_as_billing: e.target.checked })}
                className="h-4 w-4 rounded border-2 border-amber accent-amber"
              />
              <span className="font-medium">Same as Billing Address</span>
            </label>
          </div>

          {!q.same_as_billing && (
            <>
              {currentClient && (
                <div className="mb-4 p-3 rounded-xl bg-amber/5 border border-amber/20">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      Saved site addresses for {currentClient.name} ({currentClient.shipping.length})
                    </Label>
                    <Button size="sm" variant="outline" onClick={startNewShipping} className="h-7 gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add New Site Address
                    </Button>
                  </div>
                  {currentClient.shipping.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      No site addresses yet. Fill the fields below and click “Save Site Address”.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {currentClient.shipping.map((s) => (
                        <div key={s.id} className={cn(
                          "rounded-lg border-2 p-2.5 transition-all",
                          shipPickId === s.id ? "border-amber bg-amber/10" : "border-border bg-card"
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold flex items-center gap-1.5">
                                📍 {s.label}
                                {editingShipId === s.id && <Badge variant="outline" className="text-[10px]">editing</Badge>}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {[s.name, s.address, s.state, s.pincode].filter(Boolean).join(", ")}
                              </div>
                              {(s.contact || s.phone) && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {[s.contact, s.phone].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant={shipPickId === s.id ? "accent" : "outline"} onClick={() => pickShipping(s.id)} className="h-7 px-2 text-xs">Select</Button>
                              <Button size="sm" variant="outline" onClick={() => startEditShipping(s.id)} className="h-7 px-2 text-xs gap-1"><FileEdit className="h-3 w-3" /> Edit</Button>
                              <Button size="sm" variant="outline" onClick={() => removeShipping(s.id)} className="h-7 px-2 text-xs text-destructive" title="Delete"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Consignee Name"><Input value={q.ship_to_name} onChange={(e) => set({ ship_to_name: e.target.value })} placeholder="Receiver name" /></Field>
                <Field label="Consignee Company"><Input value={q.ship_to_company} onChange={(e) => set({ ship_to_company: e.target.value })} /></Field>
                <div className="md:col-span-2"><Field label="Shipping Address"><Textarea rows={2} value={q.ship_to_address} onChange={(e) => set({ ship_to_address: e.target.value })} placeholder="Street, area, landmark, city" /></Field></div>
                <Field label="Ship-To State (Place of Supply) *">
                  <Select
                    value={q.ship_to_state}
                    onValueChange={(v) => {
                      const mode: Quotation["gst_mode"] =
                        v && v !== SELLER_STATE ? "igst" : "cgst_sgst";
                      set({ ship_to_state: v, gst_mode: mode });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ship-To Pincode *">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={q.ship_to_pincode}
                    onChange={(e) => set({ ship_to_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="6-digit PIN"
                  />
                </Field>
                <Field label="Site Contact Person"><Input value={q.ship_to_contact} onChange={(e) => set({ ship_to_contact: e.target.value })} /></Field>
                <Field label="Site Phone"><Input value={q.ship_to_phone} onChange={(e) => set({ ship_to_phone: e.target.value })} /></Field>
                <Field label="GSTIN at Ship-To (optional)"><Input value={q.ship_to_gst} onChange={(e) => set({ ship_to_gst: e.target.value.toUpperCase() })} /></Field>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Button variant="accent" onClick={saveShipping} className="gap-2" disabled={!selectedId}>
                  <BookmarkPlus className="h-4 w-4" /> {editingShipId ? "Update Site Address" : "Save Site Address"}
                </Button>
                {editingShipId && (
                  <Button variant="outline" onClick={startNewShipping} className="gap-2">
                    <X className="h-4 w-4" /> Cancel Edit
                  </Button>
                )}
                {!selectedId && (
                  <p className="text-xs text-muted-foreground">Save the client first to store multiple shipping addresses.</p>
                )}
              </div>
            </>
          )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}

/* tiny helpers */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</Label>
      {children}
    </div>
  );
}
function SectionTitle({ icon: Icon, title, className }: { icon: any; title: string; className?: string }) {
  return (
    <h3 className={cn("font-display text-lg font-bold flex items-center gap-2 mb-4", className)}>
      <span className="w-8 h-8 rounded-lg bg-amber/15 text-amber flex items-center justify-center"><Icon className="h-4 w-4" /></span>
      {title}
    </h3>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between text-sm", bold && "text-base font-bold text-primary")}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

// (Package icon imported at top)
/* ==================== PREVIEW + PDF ==================== */
function QuotationPreview({ quotation, onBack, onEdit, onConvert }: { quotation: Quotation; onBack: () => void; onEdit: () => void; onConvert: (type: Quotation["doc_type"]) => void }) {
  const q = quotation;
  const totals = calcTotals(q);
  // Once an advance is recorded, the customer only owes the balance — collect that via UPI.
  const payable = totals.advancePaid > 0 ? totals.balanceDue : totals.total;
  const activeGstMode = gstModeForQuotation(q);
  const cabins = q.cabins || [];
  const hasCabins = cabins.length > 0;
  // Optional add-on items (never part of the Grand Total).
  const optionalItems = q.include_optional_items ? (q.optional_items || []) : [];
  const optionalTotal = optionalItems.reduce((s, i) => s + itemAmount(i), 0);
  // Option Items — customer-requested change options (increase/decrease vs base total).
  const optionItems = q.include_option_items ? (q.option_items || []) : [];
  const [generating, setGenerating] = useState(false);
  // Persist the watermark choice per quotation so reopening it later restores the
  // same watermarks without rework (no PDF size impact — watermarks are vector text).
  const wmKey = `poc_qp_wm_${q.id}`;
  const [watermarks, setWatermarks] = useState(() => {
    const defaults = {
      company: false,
      draft: q.status === "draft",
      approved: q.status === "approved",
      paid: false,
    };
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(wmKey) : null;
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaults;
  });
  const toggleWm = (k: keyof typeof watermarks) =>
    setWatermarks((w) => {
      const next = { ...w, [k]: !w[k] };
      try { localStorage.setItem(wmKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  const APPROVAL_ROLES = [
    "Managing Director (MD) / Director",
    "CEO / General Manager",
    "Purchase Manager / Procurement Manager",
    "Commercial Manager",
    "Project Manager",
    "Contracts Manager",
    "Operations Manager",
  ] as const;
  type ApprovalRole = typeof APPROVAL_ROLES[number];
  // Persist the chosen approver per quotation (same approach as watermarks) so it
  // is restored without rework when the quotation is reopened.
  const apprKey = `poc_qp_appr_${q.id}`;
  const [approver, setApproverState] = useState<ApprovalRole | null>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(apprKey) : null;
      if (saved && (APPROVAL_ROLES as readonly string[]).includes(saved)) return saved as ApprovalRole;
    } catch { /* ignore */ }
    return null;
  });
  const setApprover = (role: ApprovalRole | null) => {
    setApproverState(role);
    try {
      if (role) localStorage.setItem(apprKey, role);
      else localStorage.removeItem(apprKey);
    } catch { /* ignore */ }
  };
  const [upiQr, setUpiQr] = useState<string>("");
  const upiNote = `${q.quotation_number} ${q.client_name || ""}`.trim();
  const upiUri = useMemo(() => buildUpiUri(payable, upiNote), [payable, upiNote]);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(upiUri, { width: 320, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => { if (!cancelled) setUpiQr(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [upiUri]);

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const W = 210;
      const M = 12;
      let y = M;

      // === MODERN HEADER ===
      // Top gradient accent bar
      doc.setFillColor(30, 58, 95); doc.rect(M, y, (W - 2 * M) * 0.55, 1.5, "F");
      doc.setFillColor(232, 130, 38); doc.rect(M + (W - 2 * M) * 0.55, y, (W - 2 * M) * 0.45, 1.5, "F");
      y += 4;

      // Logo box
      try {
        const logoData = await imageToPngDataUrl(logoImg, { maxWidth: 220 });
        doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.3);
        doc.roundedRect(M, y, 24, 24, 1.5, 1.5);
        if (logoData) doc.addImage(logoData, "PNG", M + 1, y + 1, 22, 22);
      } catch {}

      // Header title — three layouts from two toggles:
      //   default             → "PORTABLE OFFICE CABIN"
      //   owner-first          → "SHAIKH ABDUL KALAM (Portable Office Cabin)" (1 line)
      //   owner-first + below  → "SHAIKH ABDUL KALAM" / "(Portable Office Cabin)" (2 lines)
      // Owner name and trade name share ONE font size; auto-shrink from 20 only if a
      // line would overflow the right margin, so they always stay equal-sized. A cursor
      // (coTitleBottom) keeps the tagline/address flowing below whatever the title uses.
      const coTitleLines = q.proprietor_first
        ? (q.company_below_owner
            ? [COMPANY.proprietor.toUpperCase(), `(${COMPANY.trade_name})`]
            : [`${COMPANY.proprietor.toUpperCase()} (${COMPANY.trade_name})`])
        : [COMPANY.name.toUpperCase()];
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 95);
      const coTitleMaxW = W - M - (M + 28);
      let coTitleSize = 20;
      doc.setFontSize(coTitleSize);
      while (coTitleSize > 12 && coTitleLines.some((t: string) => doc.getTextWidth(t) > coTitleMaxW)) {
        coTitleSize -= 1;
        doc.setFontSize(coTitleSize);
      }
      const coTitleH = coTitleSize * 0.35;
      coTitleLines.forEach((line: string, i: number) => doc.text(line, M + 28, y + 7 + i * coTitleH));
      const coTitleBottom = y + 7 + (coTitleLines.length - 1) * coTitleH;

      // Accent line + brand tagline (positioned under the last title line)
      doc.setDrawColor(232, 130, 38); doc.setLineWidth(0.6);
      doc.line(M + 28, coTitleBottom + 1.5, M + 36, coTitleBottom + 1.5);
      doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(232, 130, 38);
      doc.text("MANUFACTURER  ·  SUPPLIER  ·  RENTAL", M + 38, coTitleBottom + 2.5);

      // Address
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(90);
      const addrLines = doc.splitTextToSize(COMPANY.address, W - M - 32);
      const addrY0 = coTitleBottom + 6.5;
      addrLines.forEach((line: string, i: number) => doc.text(line, M + 28, addrY0 + i * 3));

      // Firm / proprietor legal-details block (below the address).
      let by = addrY0 + addrLines.length * 3 + 2.5;
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 95);
      doc.text(COMPANY.name, M + 28, by); by += 3.2;
      doc.setFontSize(6.3); doc.setFont("helvetica", "italic"); doc.setTextColor(120);
      doc.text(`(${COMPANY.firm_type})`, M + 28, by); by += 3.9;
      doc.setFontSize(6.8);
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 95);
      doc.text("Trade Name:", M + 28, by);
      const tnW = doc.getTextWidth("Trade Name:");
      doc.setFont("helvetica", "normal"); doc.setTextColor(70);
      doc.text(` ${COMPANY.trade_name}`, M + 28 + tnW, by); by += 3;
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 95);
      doc.text("Proprietor:", M + 28, by);
      const pnW = doc.getTextWidth("Proprietor:");
      doc.setFont("helvetica", "normal"); doc.setTextColor(70);
      doc.text(` ${COMPANY.proprietor}`, M + 28 + pnW, by);

      // Info pills row
      const pillY = by + 4;
      doc.setFillColor(245, 247, 250); doc.roundedRect(M + 28, pillY, 42, 5, 1, 1, "F");
      doc.setFillColor(245, 247, 250); doc.roundedRect(M + 72, pillY, 36, 5, 1, 1, "F");
      doc.setFillColor(252, 240, 225); doc.roundedRect(M + 110, pillY, 50, 5, 1, 1, "F");
      doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 95);
      doc.text(`Phone: ${COMPANY.phone}`, M + 30, pillY + 3.4);
      doc.text(`Web: ${COMPANY.website}`, M + 74, pillY + 3.4);
      doc.setTextColor(185, 94, 10);
      doc.text(`GSTIN: ${COMPANY.gst}`, M + 112, pillY + 3.4);

      y = pillY + 8;
      // Subtle divider
      doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.2); doc.line(M, y, W - M, y);
      y += 4;

      // Title
      doc.setFillColor(30, 58, 95); doc.rect(M, y, W - 2 * M, 9, "F");
      doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(255);
      const titleText = q.doc_type === "proforma" ? "PROFORMA INVOICE" : q.doc_type === "invoice" ? "TAX INVOICE" : q.doc_type === "challan" ? "DELIVERY CHALLAN" : "QUOTATION";
      doc.text(titleText, W / 2, y + 6.2, { align: "center" });
      doc.setTextColor(0); y += 13;

      // Top info two-column — only fields that are actually filled
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      const leftCol = M + 2; const rightCol = W / 2 + 4;
      const colW = (W / 2) - M - 4; // available width per column for value (after label offset adjusted below)
      const labelOffset = 28;
      const valW = colW - labelOffset;
      const labelVal = (x: number, yy: number, lbl: string, val: string): number => {
        doc.setFont("helvetica", "bold"); doc.text(lbl, x, yy);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(val || "", valW);
        lines.forEach((ln: string, idx: number) => doc.text(ln, x + labelOffset, yy + idx * 4));
        return Math.max(1, lines.length);
      };
      const labelValFull = (x: number, yy: number, lbl: string, val: string): number => {
        doc.setFont("helvetica", "bold"); doc.text(lbl, x, yy);
        doc.setFont("helvetica", "normal");
        const fullW = (W - 2 * M) - labelOffset - 2;
        const lines = doc.splitTextToSize(val || "", fullW);
        lines.forEach((ln: string, idx: number) => doc.text(ln, x + labelOffset, yy + idx * 4));
        return Math.max(1, lines.length);
      };
      const docNoLabel =
        q.doc_type === "proforma" ? "Proforma No:" :
        q.doc_type === "invoice" ? "Invoice No:" :
        q.doc_type === "challan" ? "Challan No:" : "Quotation No:";
      const pairs: Array<[string, string]> = [];
      pairs.push([docNoLabel, q.quotation_number]);
      pairs.push(["Date:", new Date(q.date).toLocaleDateString("en-IN")]);
      if (q.po_number) pairs.push(["PO Number:", q.po_number]);
      if (q.po_date) pairs.push(["PO Date:", new Date(q.po_date).toLocaleDateString("en-IN")]);
      if (q.eway_number) pairs.push(["E-Way Bill:", q.eway_number]);
      if (q.eway_date) pairs.push(["E-Way Date:", new Date(q.eway_date).toLocaleDateString("en-IN")]);
      if (q.challan_number && q.doc_type !== "challan") pairs.push(["Challan No:", q.challan_number]);
      if (q.invoice_ref) pairs.push(["Invoice Ref:", q.invoice_ref]);
      if (q.vehicle_number) pairs.push(["Vehicle No:", q.vehicle_number]);
      if (q.validity) pairs.push(["Validity:", q.validity]);
      // Site Location rendered separately full-width to avoid overflow
      for (let i = 0; i < pairs.length; i += 2) {
        const [lLbl, lVal] = pairs[i];
        const lLines = labelVal(leftCol, y, lLbl, lVal);
        let rLines = 0;
        if (pairs[i + 1]) {
          const [rLbl, rVal] = pairs[i + 1];
          rLines = labelVal(rightCol, y, rLbl, rVal);
        }
        y += 4.5 * Math.max(lLines, rLines, 1);
      }
      if (q.site_location) {
        const n = labelValFull(leftCol, y, "Site Location:", q.site_location);
        y += 4.5 * n;
      }
      y += 1.5;

      // Bill To + Ship To boxes (two columns)
      const halfW = (W - 2 * M) / 2 - 1;
      const boxStartY = y;
      // headers
      doc.setFillColor(30, 58, 95); doc.rect(M, y, halfW, 5, "F");
      doc.setFillColor(232, 130, 38); doc.rect(M + halfW + 2, y, halfW, 5, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("BILL TO", M + 2, y + 3.5);
      doc.text(q.same_as_billing ? "SHIP TO  (Same as Bill To)" : "SHIP TO", M + halfW + 4, y + 3.5);
      doc.setTextColor(0);
      y += 9;

      // Bill To content
      let yL = y;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text(q.client_name || "—", M + 2, yL); yL += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      if (q.client_company) { doc.text(q.client_company, M + 2, yL); yL += 4; }
      if (q.client_address) {
        const addrL = doc.splitTextToSize(q.client_address, halfW - 4);
        addrL.forEach((l: string) => { doc.text(l, M + 2, yL); yL += 4; });
      }
      if (q.client_state || q.client_pincode) {
        const sp = [q.client_state, q.client_pincode].filter(Boolean).join(" — ");
        doc.text(sp, M + 2, yL); yL += 4;
      }
      if (q.client_gst) { doc.text(`GSTIN: ${q.client_gst}`, M + 2, yL); yL += 4; }
      if (q.contact_person) { doc.text(`Contact: ${q.contact_person}`, M + 2, yL); yL += 4; }
      if (q.contact_number) { doc.text(`Phone: ${q.contact_number}`, M + 2, yL); yL += 4; }
      if (q.client_email) { doc.text(`Email: ${q.client_email}`, M + 2, yL); yL += 4; }

      // Ship To content
      let yR = y;
      const shipX = M + halfW + 4;
      const shipW = halfW - 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      if (q.same_as_billing) {
        doc.text(q.client_name || "—", shipX, yR); yR += 4;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        if (q.client_company) { doc.text(q.client_company, shipX, yR); yR += 4; }
        if (q.client_address) {
          const addrL = doc.splitTextToSize(q.client_address, shipW);
          addrL.forEach((l: string) => { doc.text(l, shipX, yR); yR += 4; });
        }
        if (q.client_state || q.client_pincode) {
          const sp = [q.client_state, q.client_pincode].filter(Boolean).join(" — ");
          doc.text(sp, shipX, yR); yR += 4;
        }
        if (q.site_location) {
          const sl = doc.splitTextToSize(`Site: ${q.site_location}`, shipW);
          sl.forEach((l: string) => { doc.text(l, shipX, yR); yR += 4; });
        }
      } else {
        doc.text(q.ship_to_name || q.client_name || "—", shipX, yR); yR += 4;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        if (q.ship_to_company) { doc.text(q.ship_to_company, shipX, yR); yR += 4; }
        if (q.ship_to_address) {
          const addrL = doc.splitTextToSize(q.ship_to_address, shipW);
          addrL.forEach((l: string) => { doc.text(l, shipX, yR); yR += 4; });
        }
        if (q.ship_to_state || q.ship_to_pincode) {
          const sp = [q.ship_to_state, q.ship_to_pincode].filter(Boolean).join(" — ");
          doc.text(sp, shipX, yR); yR += 4;
        }
        if (q.ship_to_gst) { doc.text(`GSTIN: ${q.ship_to_gst}`, shipX, yR); yR += 4; }
        if (q.ship_to_contact) { doc.text(`Contact: ${q.ship_to_contact}`, shipX, yR); yR += 4; }
        if (q.ship_to_phone) { doc.text(`Phone: ${q.ship_to_phone}`, shipX, yR); yR += 4; }
        if (q.site_location) {
          const sl = doc.splitTextToSize(`Site: ${q.site_location}`, shipW);
          sl.forEach((l: string) => { doc.text(l, shipX, yR); yR += 4; });
        }
      }

      // Outline boxes
      const boxBottom = Math.max(yL, yR) + 1;
      doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.2);
      doc.rect(M, boxStartY, halfW, boxBottom - boxStartY);
      doc.rect(M + halfW + 2, boxStartY, halfW, boxBottom - boxStartY);
      y = boxBottom + 3;

      // Items table
      const cols = { sno: M + 2, desc: M + 10, hsn: M + 60, size: M + 78, qty: M + 110, unit: M + 122, rate: M + 138, amt: W - M - 2 };
      doc.setFillColor(30, 58, 95); doc.rect(M, y, W - 2 * M, 7, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("S.N", cols.sno, y + 4.8);
      doc.text("Product / Description", cols.desc, y + 4.8);
      doc.text("HSN/SAC", cols.hsn, y + 4.8);
      doc.text("Size (L×W×H ft)", cols.size, y + 4.8);
      doc.text("Qty", cols.qty, y + 4.8);
      doc.text("Unit", cols.unit, y + 4.8);
      doc.text("Rate", cols.rate, y + 4.8);
      doc.text("Taxable Value", cols.amt, y + 4.8, { align: "right" });
      doc.setTextColor(0); doc.setFont("helvetica", "normal");
      y += 7;

      // Items grouped by cabin section when cabins exist; otherwise one flat group
      // (identical to the legacy single-table output). Continuous S.N across cabins.
      const itemGroups = groupByCabin(q.items, q.cabins) ?? [{ cabin: null as CabinSection | null, items: q.items }];
      let rowNo = 0;
      itemGroups.forEach((grp) => {
        if (grp.cabin) {
          if (y + 7 > 270) { doc.addPage(); y = M; }
          doc.setFillColor(44, 82, 130); doc.rect(M, y, W - 2 * M, 6, "F");
          doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
          doc.text(grp.cabin.name, M + 2, y + 4.2);
          doc.setTextColor(0); doc.setFont("helvetica", "normal");
          y += 6.5;
        }
        grp.items.forEach((it) => {
        const stripe = rowNo % 2 === 0;
        rowNo++;
        const sn = rowNo;
        const descWidth = cols.hsn - cols.desc - 2;
        const nameLines = doc.splitTextToSize(it.product_name || "—", descWidth);
        const typeLines = it.cabin_type ? doc.splitTextToSize(it.cabin_type, descWidth) : [];
        const bulletLines: string[] = [];
        if (it.description_points && it.description_points.trim()) {
          it.description_points.split("\n").forEach((ln) => {
            const t = ln.trim().replace(/^[-•*]\s*/, "");
            if (t) {
              const wrapped = doc.splitTextToSize("• " + t, descWidth - 2);
              wrapped.forEach((w: string) => bulletLines.push(w));
            }
          });
        }
        const totalLines = nameLines.length + typeLines.length + bulletLines.length;
        const rh = Math.max(totalLines * 3.6 + 4, 8);
        if (y + rh > 270) { doc.addPage(); y = M; }
        if (stripe) { doc.setFillColor(248, 250, 252); doc.rect(M, y, W - 2 * M, rh, "F"); }
        doc.setFontSize(7.4);
        doc.text(String(sn), cols.sno, y + 4.5);

        // Product name — bold with underline (modern style)
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.8); doc.setTextColor(20, 30, 60);
        let descY = y + 4.5;
        nameLines.forEach((ln: string) => {
          doc.text(ln, cols.desc, descY);
          const tw = doc.getTextWidth(ln);
          doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4);
          doc.line(cols.desc, descY + 0.8, cols.desc + tw, descY + 0.8);
          descY += 3.6;
        });
        // Cabin type — italic blue with dotted underline
        if (typeLines.length) {
          doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(37, 99, 235);
          typeLines.forEach((ln: string) => {
            doc.text(ln, cols.desc, descY);
            const tw = doc.getTextWidth(ln);
            doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.2);
            doc.setLineDashPattern([0.4, 0.4], 0);
            doc.line(cols.desc, descY + 0.8, cols.desc + tw, descY + 0.8);
            doc.setLineDashPattern([], 0);
            descY += 3.4;
          });
        }
        // Bullets in normal
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
        if (bulletLines.length > 0) {
          doc.text(bulletLines, cols.desc + 1, descY);
        }
        doc.setTextColor(0); doc.setDrawColor(0); doc.setLineWidth(0.2);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.4);
        doc.text(it.hsn_code || q.default_hsn || "—", cols.hsn, y + 4.5);
        const szParts = [
          it.length ? `L:${it.length}` : null,
          it.width ? `W:${it.width}` : null,
          it.height ? `H:${it.height}` : null,
        ].filter(Boolean) as string[];
        const sz = szParts.length ? szParts.join("×") + " ft" : "—";
        doc.text(sz, cols.size, y + 4.5);
        doc.text(String(it.quantity), cols.qty, y + 4.5);
        doc.text(it.unit, cols.unit, y + 4.5);
        doc.text(fmtPdf(it.unit_rate).replace("Rs. ", ""), cols.rate, y + 4.5);
        doc.text(fmtPdf(itemAmount(it)).replace("Rs. ", ""), cols.amt, y + 4.5, { align: "right" });
        y += rh;
        });
        if (grp.cabin && grp.items.length > 0) {
          const sub = grp.items.reduce((s, it) => s + itemAmount(it), 0);
          if (y + 6 > 270) { doc.addPage(); y = M; }
          doc.setFillColor(238, 244, 251); doc.rect(M, y, W - 2 * M, 5.5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); doc.setTextColor(30, 58, 95);
          doc.text(`${grp.cabin.name} Subtotal`, cols.size, y + 3.8);
          doc.text(fmtPdf(sub), cols.amt, y + 3.8, { align: "right" });
          doc.setTextColor(0); doc.setFont("helvetica", "normal");
          y += 6;
        }
      });

      // Totals — one combined block, or one standalone quote per cabin when "Separate Cabin Totals" is on
      const totalsX = W - M - 70;
      const drawTotals = (t: ReturnType<typeof calcTotals>, grandLabel: string) => {
        doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 5;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text("Basic Value:", totalsX, y); doc.text(fmtPdf(t.subtotal), W - M - 2, y, { align: "right" }); y += 5;
        if (t.discountBefore > 0) {
          const lbl = `Discount (Before Tax)${q.discount_before_type === "percent" ? ` @ ${q.discount_before_value}%` : ""}:`;
          doc.text(lbl, totalsX, y); doc.text("- " + fmtPdf(t.discountBefore), W - M - 2, y, { align: "right" }); y += 5;
          doc.text("Taxable Value:", totalsX, y); doc.text(fmtPdf(t.taxable), W - M - 2, y, { align: "right" }); y += 5;
        }
        if (q.include_gst === false) {
          doc.text("GST:", totalsX, y); doc.text("Not Applicable", W - M - 2, y, { align: "right" }); y += 5;
        } else if (activeGstMode === "cgst_sgst") {
          doc.text(`CGST @ ${(q.gst_percent / 2).toFixed(2)}%:`, totalsX, y); doc.text(fmtPdf(t.cgst), W - M - 2, y, { align: "right" }); y += 5;
          doc.text(`SGST @ ${(q.gst_percent / 2).toFixed(2)}%:`, totalsX, y); doc.text(fmtPdf(t.sgst), W - M - 2, y, { align: "right" }); y += 5;
        } else {
          doc.text(`IGST @ ${q.gst_percent}%:`, totalsX, y); doc.text(fmtPdf(t.igst), W - M - 2, y, { align: "right" }); y += 5;
        }
        if (t.discountAfter > 0) {
          const lbl = `Discount (After Tax)${q.discount_after_type === "percent" ? ` @ ${q.discount_after_value}%` : ""}:`;
          doc.text(lbl, totalsX, y); doc.text("- " + fmtPdf(t.discountAfter), W - M - 2, y, { align: "right" }); y += 5;
        }
        y -= 3;
        doc.line(totalsX - 2, y, W - M, y); y += 5;
        doc.setFillColor(232, 130, 38); doc.rect(totalsX - 2, y - 4, W - M - totalsX + 4, 7, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(grandLabel + ":", totalsX, y + 1); doc.text(fmtPdf(t.total), W - M - 2, y + 1, { align: "right" });
        doc.setTextColor(0); y += 8;
        if (t.advancePaid > 0) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
          const apLbl = `Advance Paid${q.advance_paid_type === "percent" ? ` @ ${q.advance_paid_value}%` : ""}:`;
          doc.text(apLbl, totalsX, y); doc.text("- " + fmtPdf(t.advancePaid), W - M - 2, y, { align: "right" }); y += 5;
          doc.setFillColor(30, 58, 95); doc.rect(totalsX - 2, y - 4, W - M - totalsX + 4, 7, "F");
          doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
          doc.text("BALANCE DUE:", totalsX, y + 1); doc.text(fmtPdf(t.balanceDue), W - M - 2, y + 1, { align: "right" });
          doc.setTextColor(0); y += 10;
        } else {
          y += 2;
        }
      };

      const perCabinTotals = q.separate_cabin_totals ? calcCabinTotals(q) : null;
      if (perCabinTotals && perCabinTotals.length > 0) {
        perCabinTotals.forEach(({ cabin, totals: ct }) => {
          if (y + 52 > 280) { doc.addPage(); y = M; }
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(44, 82, 130);
          doc.text(`${cabin.name} — Separate Quote`, totalsX, y + 2); doc.setTextColor(0); y += 4;
          drawTotals(ct, `${cabin.name} TOTAL`);
        });
        doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120);
        doc.text("Each cabin is quoted separately — there is no combined grand total.", M, y); doc.setTextColor(0);
        doc.setFont("helvetica", "normal"); y += 4;
      } else {
        drawTotals(totals, "GRAND TOTAL");
      }

      // Optional Items (add-ons — informational only, NOT part of the Grand Total)
      if (q.include_optional_items && optionalItems.length > 0) {
        if (y + 26 > 270) { doc.addPage(); y = M; }
        y += 2;
        doc.setFillColor(232, 130, 38); doc.rect(M, y, W - 2 * M, 7, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.text("OPTIONAL ITEMS  —  Add-ons, NOT included in the total above", W / 2, y + 4.8, { align: "center" });
        doc.setTextColor(0); y += 7;
        doc.setFillColor(240, 244, 248); doc.rect(M, y, W - 2 * M, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.setTextColor(30, 40, 70);
        doc.text("S.N", cols.sno, y + 4);
        doc.text("Product / Description", cols.desc, y + 4);
        doc.text("HSN/SAC", cols.hsn, y + 4);
        doc.text("Size (L×W×H ft)", cols.size, y + 4);
        doc.text("Qty", cols.qty, y + 4);
        doc.text("Unit", cols.unit, y + 4);
        doc.text("Rate", cols.rate, y + 4);
        doc.text("Amount", cols.amt, y + 4, { align: "right" });
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 6;

        const optGroups = groupByCabin(optionalItems, q.cabins) ?? [{ cabin: null as CabinSection | null, items: optionalItems }];
        let optNo = 0;
        optGroups.forEach((grp) => {
          if (grp.cabin && grp.items.length > 0) {
            if (y + 6 > 272) { doc.addPage(); y = M; }
            doc.setFillColor(180, 83, 9); doc.rect(M, y, W - 2 * M, 5.5, "F");
            doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.6);
            doc.text(grp.cabin.name, M + 2, y + 3.8);
            doc.setTextColor(0); doc.setFont("helvetica", "normal");
            y += 6;
          }
          grp.items.forEach((it) => {
          const stripe = optNo % 2 === 0;
          optNo++;
          const sn = optNo;
          const descWidth = cols.hsn - cols.desc - 2;
          const nameLines = doc.splitTextToSize(it.product_name || "—", descWidth);
          const typeLines = it.cabin_type ? doc.splitTextToSize(it.cabin_type, descWidth) : [];
          const bulletLines: string[] = [];
          if (it.description_points && it.description_points.trim()) {
            it.description_points.split("\n").forEach((ln) => {
              const t = ln.trim().replace(/^[-•*]\s*/, "");
              if (t) doc.splitTextToSize("• " + t, descWidth - 2).forEach((w: string) => bulletLines.push(w));
            });
          }
          const totalLines = nameLines.length + typeLines.length + bulletLines.length;
          const rh = Math.max(totalLines * 3.6 + 4, 8);
          if (y + rh > 272) { doc.addPage(); y = M; }
          if (stripe) { doc.setFillColor(253, 243, 231); doc.rect(M, y, W - 2 * M, rh, "F"); }
          doc.setFontSize(7.4); doc.setTextColor(0);
          doc.text(String(sn), cols.sno, y + 4.5);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.8); doc.setTextColor(20, 30, 60);
          let descY = y + 4.5;
          nameLines.forEach((ln: string) => { doc.text(ln, cols.desc, descY); descY += 3.6; });
          if (typeLines.length) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(37, 99, 235);
            typeLines.forEach((ln: string) => { doc.text(ln, cols.desc, descY); descY += 3.4; });
          }
          doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
          if (bulletLines.length > 0) doc.text(bulletLines, cols.desc + 1, descY);
          doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(7.4);
          doc.text(it.hsn_code || q.default_hsn || "—", cols.hsn, y + 4.5);
          const szParts = [it.length ? `L:${it.length}` : null, it.width ? `W:${it.width}` : null, it.height ? `H:${it.height}` : null].filter(Boolean) as string[];
          doc.text(szParts.length ? szParts.join("×") + " ft" : "—", cols.size, y + 4.5);
          doc.text(String(it.quantity), cols.qty, y + 4.5);
          doc.text(it.unit, cols.unit, y + 4.5);
          doc.text(fmtPdf(it.unit_rate).replace("Rs. ", ""), cols.rate, y + 4.5);
          doc.text(fmtPdf(itemAmount(it)).replace("Rs. ", ""), cols.amt, y + 4.5, { align: "right" });
          y += rh;
          });
        });
        doc.setDrawColor(232, 130, 38); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4.5;
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(180, 83, 9);
        doc.text("Optional Items Total (not included in Grand Total):", W - M - 95, y);
        doc.text(fmtPdf(optionalTotal), W - M - 2, y, { align: "right" });
        doc.setTextColor(0); doc.setDrawColor(0); doc.setLineWidth(0.2); y += 6;
      }

      // Option Items — customer-requested change options (base Grand Total unchanged)
      if (q.include_option_items && optionItems.length > 0) {
        if (y + 24 > 270) { doc.addPage(); y = M; }
        y += 2;
        doc.setFillColor(44, 82, 130); doc.rect(M, y, W - 2 * M, 7, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.text(`OPTION ITEMS  —  Change Options (base Grand Total stays ${fmtPdf(totals.total)})`, W / 2, y + 4.8, { align: "center" });
        doc.setTextColor(0); y += 7;
        const oc = { num: M + 2, desc: M + 9, eff: M + 106, diffR: W - M - 40, revR: W - M - 2 };
        doc.setFillColor(240, 244, 248); doc.rect(M, y, W - 2 * M, 6, "F");
        doc.setFillColor(232, 130, 38); doc.rect(W - M - 38, y, 38, 6, "F"); // amber-highlight the Revised Total header cell
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.setTextColor(30, 40, 70);
        doc.text("#", oc.num, y + 4);
        doc.text("Change Requested", oc.desc, y + 4);
        doc.text("Effect", oc.eff, y + 4);
        doc.text("Cost Difference", oc.diffR, y + 4, { align: "right" });
        doc.setTextColor(255); doc.text("Revised Total", oc.revR, y + 4, { align: "right" });
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 6;
        optionItems.forEach((o, idx) => {
          const inc = o.direction === "increase";
          const delta = inc ? (o.amount || 0) : -(o.amount || 0);
          const descLines = doc.splitTextToSize(o.description || "—", oc.eff - oc.desc - 3);
          const rh = Math.max(descLines.length * 3.6 + 3, 7);
          if (y + rh > 272) { doc.addPage(); y = M; }
          if (idx % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(M, y, W - 2 * M, rh, "F"); }
          doc.setFontSize(7.4); doc.setTextColor(0); doc.setFont("helvetica", "normal");
          doc.text(String(idx + 1), oc.num, y + 4.5);
          doc.text(descLines, oc.desc, y + 4.5);
          if (inc) doc.setTextColor(5, 150, 105); else doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "bold");
          doc.text(inc ? "Increase" : "Reduction", oc.eff, y + 4.5);
          doc.text(`${inc ? "+ " : "- "}${fmtPdf(o.amount || 0)}`, oc.diffR, y + 4.5, { align: "right" });
          // Revised Total — highlighted amber cell so the customer spots the resulting total
          doc.setFillColor(253, 243, 231); doc.rect(W - M - 38, y, 38, rh, "F");
          doc.setTextColor(180, 83, 9); doc.setFontSize(8.4);
          doc.text(fmtPdf(totals.total + delta), oc.revR, y + 4.5, { align: "right" });
          doc.setFontSize(7.4); doc.setTextColor(0); doc.setFont("helvetica", "normal");
          y += rh;
        });
        doc.setFontSize(6.5); doc.setTextColor(120); doc.setFont("helvetica", "italic");
        doc.text("Each option is an alternative applied to the base Grand Total on its own — options are not added together and do not change the base total.", M + 2, y + 3);
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 6;
      }

      // Tech Specs
      const filledSpecs = q.include_specs === false ? [] : q.specs.filter((s) => s.component || s.specification || s.material || s.thickness || s.brand);
      if (filledSpecs.length > 0) {
        if (y + 30 > 270) { doc.addPage(); y = M; }
        doc.setFillColor(30, 58, 95); doc.rect(M, y, W - 2 * M, 7, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text("TECHNICAL SPECIFICATIONS", W / 2, y + 4.8, { align: "center" });
        doc.setTextColor(0); y += 9;

        // Column x positions and widths (page width ~190mm usable)
        const sCols = { cat: M + 2, comp: M + 30, spec: M + 60, mat: M + 105, thk: M + 138, br: M + 160 };
        const sW = { cat: 26, comp: 28, spec: 43, mat: 31, thk: 20, br: 28 };
        doc.setFillColor(240, 244, 248); doc.rect(M, y, W - 2 * M, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
        doc.text("Category", sCols.cat, y + 4);
        doc.text("Component", sCols.comp, y + 4);
        doc.text("Specification", sCols.spec, y + 4);
        doc.text("Material", sCols.mat, y + 4);
        doc.text("Thk/Size", sCols.thk, y + 4);
        doc.text("Brand", sCols.br, y + 4);
        y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7);

        const specGroups = groupByCabin(filledSpecs, q.cabins) ?? [{ cabin: null as CabinSection | null, items: filledSpecs }];
        let specNo = 0;
        specGroups.forEach((grp) => {
          if (grp.cabin && grp.items.length > 0) {
            if (y + 6 > 275) { doc.addPage(); y = M; }
            doc.setFillColor(44, 82, 130); doc.rect(M, y, W - 2 * M, 5.5, "F");
            doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.4);
            doc.text(grp.cabin.name, sCols.cat, y + 3.8);
            doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
            y += 6;
          }
          grp.items.forEach((s) => {
          const stripe = specNo % 2 === 0;
          specNo++;
          const catL = doc.splitTextToSize(s.category || "—", sW.cat);
          const compL = doc.splitTextToSize(s.component || "—", sW.comp);
          const specL = doc.splitTextToSize(s.specification || "—", sW.spec);
          const matL = doc.splitTextToSize(s.material || "—", sW.mat);
          const thkL = doc.splitTextToSize(s.thickness || "—", sW.thk);
          const brL = doc.splitTextToSize(s.brand || "—", sW.br);
          const rh = Math.max(catL.length, specL.length, compL.length, matL.length, thkL.length, brL.length) * 3.2 + 2;
          if (y + rh > 275) { doc.addPage(); y = M; }
          if (stripe) { doc.setFillColor(250, 251, 253); doc.rect(M, y, W - 2 * M, rh, "F"); }
          doc.text(catL, sCols.cat, y + 3);
          doc.text(compL, sCols.comp, y + 3);
          doc.text(specL, sCols.spec, y + 3);
          doc.text(matL, sCols.mat, y + 3);
          doc.text(thkL, sCols.thk, y + 3);
          doc.text(brL, sCols.br, y + 3);
          y += rh;
          });
        });
        y += 4;
      }

      // Commercial Details
      const commercialPairs: Array<[string, string]> = [];
      if (q.payment_terms) commercialPairs.push(["Payment Terms:", q.payment_terms]);
      if (q.delivery_timeline) commercialPairs.push(["Delivery Timeline:", q.delivery_timeline]);
      if (q.transport_charges) commercialPairs.push(["Transportation:", q.transport_charges]);
      if (q.gst_percent !== undefined) commercialPairs.push(["GST Rate:", `${q.gst_percent}%`]);
      if (commercialPairs.length > 0 || q.notes) {
        if (y + 20 > 275) { doc.addPage(); y = M; }
        doc.setFillColor(30, 58, 95); doc.rect(M, y, W - 2 * M, 6, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
        doc.text("COMMERCIAL DETAILS", M + 2, y + 4); doc.setTextColor(0);
        y += 8;
        doc.setFontSize(7.5);
        const cLeft = M + 2; const cRight = W / 2 + 2;
        const cValW = (W / 2) - M - 32;
        for (let i = 0; i < commercialPairs.length; i += 2) {
          const [lLbl, lVal] = commercialPairs[i];
          doc.setFont("helvetica", "bold"); doc.text(lLbl, cLeft, y);
          doc.setFont("helvetica", "normal");
          const lLines = doc.splitTextToSize(lVal, cValW);
          lLines.forEach((ln: string, idx: number) => doc.text(ln, cLeft + 28, y + idx * 3.8));
          let rLines = [""];
          if (commercialPairs[i + 1]) {
            const [rLbl, rVal] = commercialPairs[i + 1];
            doc.setFont("helvetica", "bold"); doc.text(rLbl, cRight, y);
            doc.setFont("helvetica", "normal");
            rLines = doc.splitTextToSize(rVal, cValW);
            rLines.forEach((ln: string, idx: number) => doc.text(ln, cRight + 28, y + idx * 3.8));
          }
          y += 3.8 * Math.max(lLines.length, rLines.length, 1) + 1;
        }
        if (q.notes) {
          doc.setFont("helvetica", "bold"); doc.text("Notes / Remarks:", cLeft, y);
          doc.setFont("helvetica", "normal");
          const nLines = doc.splitTextToSize(q.notes, W - 2 * M - 32);
          nLines.forEach((ln: string, idx: number) => doc.text(ln, cLeft + 28, y + idx * 3.8));
          y += 3.8 * nLines.length + 1;
        }
        y += 2;
      }

      // Terms
      if (y + 30 > 275) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 58, 95);
      doc.text("Terms & Conditions:", M, y); y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(50);
      q.terms.filter(Boolean).forEach((t, i) => {
        if (y > 278) { doc.addPage(); y = M; }
        const tl = doc.splitTextToSize(`${i + 1}. ${t}`, W - 2 * M - 4);
        tl.forEach((l: string) => { doc.text(l, M + 2, y); y += 3.5; });
      });
      doc.setTextColor(0);

      // Bank + UPI QR
      if (q.bank.bank_name || q.bank.account_number) {
        y += 3;
        const blockH = 36;
        if (y + blockH > 280) { doc.addPage(); y = M; }
        doc.setFillColor(245, 247, 250); doc.rect(M, y, W - 2 * M, blockH, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 58, 95);
        doc.text("Bank Details", M + 2, y + 4); doc.setTextColor(0);
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        const b = q.bank;
        doc.text(`Account Holder: ${b.account_holder}`, M + 2, y + 9);
        doc.text(`Bank: ${b.bank_name}`, M + 2, y + 13);
        doc.text(`A/C No: ${b.account_number}`, M + 2, y + 17);
        doc.text(`IFSC: ${b.ifsc}`, M + 70, y + 13);
        doc.text(`Branch: ${b.branch}`, M + 70, y + 17);

        // UPI section
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(M + 2, y + 20, W - M - 36, y + 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 58, 95);
        doc.text("UPI Payment (Scan & Pay)", M + 2, y + 24); doc.setTextColor(0);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        doc.text(`UPI ID: ${COMPANY.upi_id}`, M + 2, y + 28);
        doc.text(`Payable: ${fmtPdf(payable)}`, M + 2, y + 32);
        doc.setFontSize(6.8); doc.setTextColor(100);
        doc.text("Works with GPay, PhonePe, Paytm, BHIM & all UPI apps", M + 2, y + 35);
        doc.setTextColor(0);

        // QR on the right inside bank block
        try {
          const qrUrl = await QRCode.toDataURL(upiUri, { width: 400, margin: 1, errorCorrectionLevel: "M" });
          doc.addImage(qrUrl, "PNG", W - M - 32, y + 2, 30, 30);
          doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(232, 130, 38);
          doc.text("SCAN & PAY", W - M - 17, y + 35, { align: "center" });
          doc.setTextColor(0);
        } catch {}
        y += blockH + 2;
      }

      // Signature — large real seal (~75mm × 45mm)
      if (y + 60 > 285) { doc.addPage(); y = 210; }
      try {
        const sealData = await imageToPngDataUrl(sealImg, { maxWidth: 700, format: "jpeg", quality: 0.82, background: "#ffffff" });
        if (sealData) doc.addImage(sealData, "JPEG", W - M - 78, y, 75, 45);
      } catch {}
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("For " + COMPANY.name, W - M - 2, y + 51, { align: "right" });
      doc.setFont("helvetica", "bold"); doc.text("Authorized Signatory (Digitally Signed)", W - M - 2, y + 55, { align: "right" });
      doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(100);
      doc.text("This is a computer-generated document. No physical signature or seal is required.", W / 2, y + 62, { align: "center" });
      doc.setTextColor(0);

      // Approval stamp under signature
      if (approver) {
        const sx = W - M - 78;
        const sy = y + 66;
        const sw = 75;
        const sh = 16;
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.6);
        doc.roundedRect(sx, sy, sw, sh, 1.5, 1.5);
        doc.setTextColor(30, 64, 175);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("APPROVED BY", sx + sw / 2, sy + 5, { align: "center" });
        doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(approver, sw - 4);
        doc.text(lines, sx + sw / 2, sy + 10, { align: "center" });
        doc.setTextColor(0);
      }


      // Footer
      const ph = doc.internal.pageSize.height;
      doc.setDrawColor(232, 130, 38); doc.setLineWidth(0.4); doc.line(M, ph - 10, W - M, ph - 10);
      doc.setFontSize(7); doc.setTextColor(100); doc.setFont("helvetica", "normal");
      doc.text(`${COMPANY.phone}  |  ${COMPANY.website}  |  GST: ${COMPANY.gst}`, W / 2, ph - 6, { align: "center" });

      // === WATERMARKS (all pages) ===
      try {
        const pageCount = doc.getNumberOfPages();
        const pw = doc.internal.pageSize.width;
        const ph = doc.internal.pageSize.height;
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          // @ts-ignore — GState supported by jsPDF
          const gs = (doc as any).GState ? (doc as any).GState({ opacity: 0.08 }) : null;
          if (gs) (doc as any).setGState(gs);

          // Tiled company name
          if (watermarks.company) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(30, 58, 95);
            const stepX = 70, stepY = 28;
            for (let yy = -10; yy < ph + 20; yy += stepY) {
              for (let xx = -20; xx < pw + 40; xx += stepX) {
                doc.text(COMPANY.name, xx, yy, { angle: -30 });
              }
            }
          }

          // Big diagonal labels
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

          // Reset opacity
          if (gs) {
            // @ts-ignore
            const reset = (doc as any).GState({ opacity: 1 });
            (doc as any).setGState(reset);
          }
        }
      } catch (e) {
        console.warn("watermark draw failed", e);
      }

      addLegalFooter(doc);
      doc.save(`${q.quotation_number}-${q.client_name || "quotation"}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (e) {
      console.error(e);
      toast({ title: "PDF generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const printIt = () => window.print();

  // Save PDF: persist the selected watermark + approver for this quotation (so they
  // are remembered on reopen), then generate and download the PDF.
  const saveSettingsAndDownload = async () => {
    try {
      localStorage.setItem(wmKey, JSON.stringify(watermarks));
      if (approver) localStorage.setItem(apprKey, approver);
      else localStorage.removeItem(apprKey);
    } catch { /* ignore */ }
    toast({ title: "Settings saved", description: "Watermark & approver will be remembered for this quotation." });
    await downloadPdf();
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Button>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
            <span className="text-xs text-muted-foreground px-2 hidden sm:inline">Convert to:</span>
            <Button
              size="sm"
              variant={q.doc_type === "quotation" ? "accent" : "ghost"}
              onClick={() => onConvert("quotation")}
              className="h-7 text-xs gap-1"
            ><FileText className="h-3.5 w-3.5" /> Quotation</Button>
            <Button
              size="sm"
              variant={q.doc_type === "proforma" ? "accent" : "ghost"}
              onClick={() => onConvert("proforma")}
              className="h-7 text-xs gap-1"
            ><FileCheck2 className="h-3.5 w-3.5" /> Proforma</Button>
            <Button
              size="sm"
              variant={q.doc_type === "invoice" ? "accent" : "ghost"}
              onClick={() => onConvert("invoice")}
              className="h-7 text-xs gap-1"
            ><FileEdit className="h-3.5 w-3.5" /> Invoice</Button>
            <Button
              size="sm"
              variant={q.doc_type === "challan" ? "accent" : "ghost"}
              onClick={() => onConvert("challan")}
              className="h-7 text-xs gap-1"
            ><Package className="h-3.5 w-3.5" /> Challan</Button>
          </div>
          <Button variant="outline" onClick={onEdit} className="gap-2"><FileEdit className="h-4 w-4" /> Edit</Button>
          <Button variant="outline" onClick={printIt} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="accent" onClick={downloadPdf} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
          <Button variant="outline" onClick={saveSettingsAndDownload} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save PDF
          </Button>
        </div>
      </div>

      {/* Watermark toolbar */}
      <div className="print:hidden flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-2.5">
        <span className="text-xs font-semibold text-muted-foreground px-1">Watermarks:</span>
        {([
          { key: "company", label: "Company Name (tiled)" },
          { key: "draft", label: "DRAFT" },
          { key: "approved", label: "APPROVED" },
          { key: "paid", label: "PAID" },
        ] as const).map((w) => (
          <label key={w.key} className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch checked={watermarks[w.key]} onCheckedChange={() => toggleWm(w.key)} />
            <span>{w.label}</span>
          </label>
        ))}
      </div>

      {/* Approval (Approved By) toolbar */}
      <div className="print:hidden flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
        <span className="text-xs font-semibold text-muted-foreground px-1">Approved By:</span>
        {APPROVAL_ROLES.map((role) => {
          const active = approver === role;
          return (
            <Button
              key={role}
              size="sm"
              variant={active ? "accent" : "outline"}
              onClick={() => setApprover(active ? null : role)}
              className="h-7 text-xs"
            >
              {role}
            </Button>
          );
        })}
        {approver && (
          <Button size="sm" variant="ghost" onClick={() => setApprover(null)} className="h-7 text-xs text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {/* A4 preview */}
      <div className="bg-white text-black mx-auto shadow-2xl print:shadow-none rounded print:rounded-none relative overflow-hidden" style={{ width: "210mm", minHeight: "297mm", padding: "12mm" }} id="qtn-print">
        {/* Watermark overlay (preview only — PDF uses jsPDF watermarks) */}
        {(watermarks.company || watermarks.draft || watermarks.approved || watermarks.paid) && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            {watermarks.company && (
              <div
                className="absolute inset-0"
                style={{
                  opacity: 0.07,
                  color: "#1e3a5f",
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
                      <span key={j} style={{ marginRight: 60 }}>{COMPANY.name}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {[
              { on: watermarks.draft, text: "DRAFT", color: "#777", offset: -120 },
              { on: watermarks.approved, text: "APPROVED", color: "#107a3c", offset: 0 },
              { on: watermarks.paid, text: "PAID", color: "#107a3c", offset: 120 },
            ].map((l) =>
              l.on ? (
                <div
                  key={l.text}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `translate(-50%, -50%) translateY(${l.offset}px) rotate(-30deg)`,
                    fontSize: "140px",
                    fontWeight: 900,
                    color: l.color,
                    opacity: 0.1,
                    letterSpacing: "8px",
                  }}
                >
                  {l.text}
                </div>
              ) : null
            )}
          </div>
        )}
        <div className="relative z-10">
        {/* Modern Header */}
        <div className="relative">
          {/* Top accent bar */}
          <div className="h-1.5 rounded-full" style={{ background: "linear-gradient(90deg, #1e3a5f 0%, #2c5282 50%, #e88226 100%)" }} />

          <div className="flex items-stretch gap-5 mt-3 pb-3">
            {/* Logo block */}
            <div className="flex items-center justify-center p-2 rounded-lg border-2" style={{ borderColor: "#1e3a5f15", background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)" }}>
              <img src={resolveImageUrl(logoImg)} alt="Portable Office Cabin" className="w-20 h-20 object-contain" />
            </div>

            {/* Company info */}
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-[22px] font-bold leading-tight tracking-tight" style={{ color: "#1e3a5f", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                {q.proprietor_first ? (
                  <>
                    {COMPANY.proprietor.toUpperCase()}
                    {q.company_below_owner
                      ? <span className="block">({COMPANY.trade_name})</span>
                      : <span className="ml-1.5">({COMPANY.trade_name})</span>}
                  </>
                ) : (
                  COMPANY.name
                )}
              </h1>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="h-[2px] w-8" style={{ background: "#e88226" }} />
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#e88226" }}>Manufacturer · Supplier · Rental</p>
              </div>
              <p className="text-[10px] mt-2 text-gray-600 leading-relaxed max-w-[95%]">{COMPANY.address}</p>
              <div className="mt-1.5 text-[10px] leading-snug">
                <p className="font-bold" style={{ color: "#1e3a5f" }}>{COMPANY.name}</p>
                <p className="italic text-gray-500 text-[9px]">({COMPANY.firm_type})</p>
                <p className="mt-1 text-gray-700"><span className="font-semibold" style={{ color: "#1e3a5f" }}>Trade Name:</span> {COMPANY.trade_name}</p>
                <p className="text-gray-700"><span className="font-semibold" style={{ color: "#1e3a5f" }}>Proprietor:</span> {COMPANY.proprietor}</p>
              </div>

              {/* Info pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-medium" style={{ background: "#1e3a5f0d", color: "#1e3a5f" }}>
                  <span style={{ color: "#e88226" }}>📞</span> {COMPANY.phone}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-medium" style={{ background: "#1e3a5f0d", color: "#1e3a5f" }}>
                  <span style={{ color: "#e88226" }}>🌐</span> {COMPANY.website}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-medium" style={{ background: "#e8822615", color: "#b95e0a" }}>
                  <span>GSTIN</span> <span className="font-mono font-bold">{COMPANY.gst}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom border */}
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 0%, #1e3a5f40 50%, transparent 100%)" }} />
        </div>

        {/* Title */}
        <div className="text-white text-center font-bold text-lg py-2 mt-3 tracking-widest" style={{ background: "#1e3a5f" }}>
          {q.doc_type === "proforma" ? "PROFORMA INVOICE" : q.doc_type === "invoice" ? "TAX INVOICE" : q.doc_type === "challan" ? "DELIVERY CHALLAN" : "QUOTATION"}
        </div>

        {/* Top info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mt-3">
          <KV k={q.doc_type === "quotation" ? "Quotation No" : q.doc_type === "proforma" ? "Proforma No" : q.doc_type === "challan" ? "Challan No" : "Invoice No"} v={q.quotation_number} />
          <KV k="Date" v={new Date(q.date).toLocaleDateString("en-IN")} />
          <KV k="PO Number" v={q.po_number} />
          <KV k="PO Date" v={q.po_date && new Date(q.po_date).toLocaleDateString("en-IN")} />
          <KV k="E-Way Bill" v={q.eway_number} />
          <KV k="E-Way Date" v={q.eway_date && new Date(q.eway_date).toLocaleDateString("en-IN")} />
          <KV k="Challan No" v={q.challan_number} />
          <KV k="Invoice Ref" v={q.invoice_ref} />
          <KV k="Vehicle No" v={q.vehicle_number} />
          <KV k="Validity" v={q.validity} />
          <KV k="Site Location" v={q.site_location} full />
        </div>

        {/* Client / Bill To + Ship To */}
        <div className="mt-4 grid grid-cols-2 gap-3 items-stretch">
          <div className="border border-gray-200 rounded-sm overflow-hidden min-w-0 h-full flex flex-col">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "#1e3a5f" }}>Bill To</div>
            <div className="bg-gray-50 px-3 pt-3 pb-3 text-xs break-words flex-1 leading-relaxed">
              {q.client_company && (
                <div className="text-[15px] font-extrabold uppercase break-words mb-1" style={{ color: "#1e3a5f", letterSpacing: "0.3px", borderBottom: "2px solid #e88226", paddingBottom: "2px", display: "inline-block" }}>
                  {q.client_company}
                </div>
              )}
              <div className="font-semibold break-words">{q.client_name || "—"}</div>
              {q.client_address && <div className="text-gray-700 whitespace-pre-line break-words">{q.client_address}</div>}
              {(q.client_state || q.client_pincode) && (
                <div className="text-gray-700 break-words">
                  {q.client_state}{q.client_state && q.client_pincode ? " — " : ""}{q.client_pincode}
                </div>
              )}
              {q.client_gst && <div className="mt-0.5 break-all">GSTIN: <span className="font-mono">{q.client_gst}</span></div>}
              {q.contact_person && <div className="text-gray-700 break-words">Contact: {q.contact_person}</div>}
              {q.contact_number && <div className="text-gray-700 break-words">Phone: {q.contact_number}</div>}
              {q.client_email && <div className="text-gray-700 break-all">Email: {q.client_email}</div>}
            </div>
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden min-w-0 h-full flex flex-col">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5" style={{ background: "#e88226" }}>
              <span>Ship To</span>
              {q.same_as_billing && <span className="font-normal italic opacity-90 normal-case">(Same as Bill To)</span>}
            </div>
            <div className="bg-gray-50 px-3 pt-3 pb-3 text-xs break-words flex-1 leading-relaxed">
              {q.same_as_billing ? (
                <>
                  {q.client_company && (
                    <div className="text-[15px] font-extrabold uppercase break-words mb-1" style={{ color: "#1e3a5f", letterSpacing: "0.3px", borderBottom: "2px solid #e88226", paddingBottom: "2px", display: "inline-block" }}>
                      {q.client_company}
                    </div>
                  )}
                  <div className="font-semibold break-words">{q.client_name || "—"}</div>
                  {q.client_address && <div className="text-gray-700 whitespace-pre-line break-words">{q.client_address}</div>}
                  {(q.client_state || q.client_pincode) && (
                    <div className="text-gray-700 break-words">
                      {q.client_state}{q.client_state && q.client_pincode ? " — " : ""}{q.client_pincode}
                    </div>
                  )}
                  {q.site_location && <div className="text-gray-700 break-words">Site: {q.site_location}</div>}
                </>
              ) : (
                <>
                  {(q.ship_to_company || q.client_company) && (
                    <div className="text-[15px] font-extrabold uppercase break-words mb-1" style={{ color: "#1e3a5f", letterSpacing: "0.3px", borderBottom: "2px solid #e88226", paddingBottom: "2px", display: "inline-block" }}>
                      {q.ship_to_company || q.client_company}
                    </div>
                  )}
                  <div className="font-semibold break-words">{q.ship_to_name || q.client_name || "—"}</div>
                  {q.ship_to_address && <div className="text-gray-700 whitespace-pre-line break-words">{q.ship_to_address}</div>}
                  {(q.ship_to_state || q.ship_to_pincode) && (
                    <div className="text-gray-700 break-words">
                      {q.ship_to_state}{q.ship_to_state && q.ship_to_pincode ? " — " : ""}{q.ship_to_pincode}
                    </div>
                  )}
                  {q.ship_to_gst && <div className="mt-0.5 break-all">GSTIN: <span className="font-mono">{q.ship_to_gst}</span></div>}
                  {q.ship_to_contact && <div className="text-gray-700 break-words">Contact: {q.ship_to_contact}</div>}
                  {q.ship_to_phone && <div className="text-gray-700 break-words">Phone: {q.ship_to_phone}</div>}
                  {q.site_location && <div className="text-gray-700 break-words">Site: {q.site_location}</div>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full mt-4 text-xs border-collapse">
          <thead>
            <tr className="text-white" style={{ background: "#1e3a5f" }}>
              <th className="p-1.5 text-left">S.N</th>
              <th className="p-1.5 text-left">Product / Description</th>
              <th className="p-1.5 text-left">HSN/SAC</th>
              <th className="p-1.5 text-left">Size (L×W×H ft)</th>
              <th className="p-1.5 text-right">Qty</th>
              <th className="p-1.5 text-left">Unit</th>
              <th className="p-1.5 text-right">Rate</th>
              <th className="p-1.5 text-right">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const groups = groupByCabin(q.items, cabins) ?? [{ cabin: null as CabinSection | null, items: q.items }];
              let sn = 0;
              return groups.map((g) => {
                const gSubtotal = g.items.reduce((s, it) => s + itemAmount(it), 0);
                return (
              <Fragment key={g.cabin?.id ?? "flat"}>
                {g.cabin && (
                  <tr>
                    <td colSpan={8} className="p-1.5 font-bold text-white text-[11px] tracking-wide" style={{ background: "#2c5282" }}>{g.cabin.name}</td>
                  </tr>
                )}
                {g.items.map((it) => { sn++; const rowSn = sn; return (
              <tr key={it.id} className={rowSn % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="p-1.5 border-b">{rowSn}</td>
                <td className="p-1.5 border-b align-top">
                  <div className="font-semibold text-gray-900 inline-block border-b-2 border-blue-600 pb-0.5 leading-tight">
                    {it.product_name || "—"}
                  </div>
                  {it.cabin_type && (
                    <div className="text-[10px] text-blue-700 font-medium mt-0.5 inline-block border-b border-dotted border-blue-400 pb-px">
                      {it.cabin_type}
                    </div>
                  )}
                  {it.description_points && it.description_points.trim() && (
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10px] text-gray-700">
                      {it.description_points.split("\n").map((ln, idx) => {
                        const t = ln.trim().replace(/^[-•*]\s*/, "");
                        return t ? <li key={idx}>{t}</li> : null;
                      })}
                    </ul>
                  )}
                </td>
                <td className="p-1.5 border-b font-mono text-[10px]">{it.hsn_code || q.default_hsn || "—"}</td>
                <td className="p-1.5 border-b whitespace-nowrap text-[10px]">
                  {(() => {
                    const parts = [
                      it.length ? `L: ${it.length} ft` : null,
                      it.width ? `W: ${it.width} ft` : null,
                      it.height ? `H: ${it.height} ft` : null,
                    ].filter(Boolean);
                    return parts.length ? parts.join(" × ") : "—";
                  })()}
                </td>
                <td className="p-1.5 border-b text-right">{it.quantity}</td>
                <td className="p-1.5 border-b">{it.unit}</td>
                <td className="p-1.5 border-b text-right">{fmt(it.unit_rate)}</td>
                <td className="p-1.5 border-b text-right font-semibold">{fmt(itemAmount(it))}</td>
              </tr>
                ); })}
                {g.cabin && g.items.length > 0 && (
                  <tr>
                    <td colSpan={7} className="p-1.5 text-right text-[11px] font-semibold border-b" style={{ background: "#eef4fb" }}>{g.cabin.name} Subtotal</td>
                    <td className="p-1.5 text-right text-[11px] font-bold border-b" style={{ background: "#eef4fb" }}>{fmt(gSubtotal)}</td>
                  </tr>
                )}
              </Fragment>
                );
              });
            })()}
          </tbody>
        </table>

        {/* Totals — combined, or one standalone quote per cabin when "Separate Cabin Totals" is on */}
        {(() => {
          const ladder = (t: ReturnType<typeof calcTotals>) => (
            <>
              <div className="flex justify-between"><span>Basic Value:</span><span>{fmt(t.subtotal)}</span></div>
              {t.discountBefore > 0 && (
                <>
                  <div className="flex justify-between"><span>Discount (Before Tax){q.discount_before_type === "percent" ? ` @ ${q.discount_before_value}%` : ""}:</span><span>- {fmt(t.discountBefore)}</span></div>
                  <div className="flex justify-between"><span>Taxable Value:</span><span>{fmt(t.taxable)}</span></div>
                </>
              )}
              {q.include_gst === false ? (
                <div className="flex justify-between"><span>GST:</span><span>Not Applicable</span></div>
              ) : activeGstMode === "cgst_sgst" ? (
                <>
                  <div className="flex justify-between"><span>CGST @ {(q.gst_percent / 2).toFixed(2)}%:</span><span>{fmt(t.cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST @ {(q.gst_percent / 2).toFixed(2)}%:</span><span>{fmt(t.sgst)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span>IGST @ {q.gst_percent}%:</span><span>{fmt(t.igst)}</span></div>
              )}
              {t.discountAfter > 0 && (
                <div className="flex justify-between"><span>Discount (After Tax){q.discount_after_type === "percent" ? ` @ ${q.discount_after_value}%` : ""}:</span><span>- {fmt(t.discountAfter)}</span></div>
              )}
              <div className="flex justify-between font-bold text-white px-2 py-1.5 mt-1" style={{ background: "#e88226" }}>
                <span>GRAND TOTAL:</span><span>{fmt(t.total)}</span>
              </div>
              {t.advancePaid > 0 && (
                <>
                  <div className="flex justify-between"><span>Advance Paid{q.advance_paid_type === "percent" ? ` @ ${q.advance_paid_value}%` : ""}:</span><span>- {fmt(t.advancePaid)}</span></div>
                  <div className="flex justify-between font-bold text-white px-2 py-1.5" style={{ background: "#1e3a5f" }}>
                    <span>BALANCE DUE:</span><span>{fmt(t.balanceDue)}</span>
                  </div>
                </>
              )}
            </>
          );
          if (q.separate_cabin_totals && cabins.length > 0) {
            return (
              <div className="flex flex-col items-end gap-3 mt-3">
                {calcCabinTotals(q)!.map(({ cabin, totals: ct }) => (
                  <div key={cabin.id} className="w-72 text-xs space-y-1">
                    <div className="text-[11px] font-bold text-white px-2 py-1" style={{ background: "#2c5282" }}>{cabin.name} — Separate Quote</div>
                    {ladder(ct)}
                  </div>
                ))}
                <div className="w-72 text-[10px] text-gray-500 italic text-right">Each cabin is quoted separately — no combined grand total.</div>
              </div>
            );
          }
          return (
            <div className="flex justify-end mt-3">
              <div className="w-72 text-xs space-y-1">{ladder(totals)}</div>
            </div>
          );
        })()}

        {/* Optional Items — add-ons, NOT included in the total above */}
        {q.include_optional_items && optionalItems.length > 0 && (
          <div className="mt-4">
            <div className="text-white text-center font-bold text-xs py-1.5 tracking-wide" style={{ background: "#e88226" }}>
              OPTIONAL ITEMS — Add-ons, not included in the total above
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-white" style={{ background: "#1e3a5f" }}>
                  <th className="p-1.5 text-left">S.N</th>
                  <th className="p-1.5 text-left">Product / Description</th>
                  <th className="p-1.5 text-left">HSN/SAC</th>
                  <th className="p-1.5 text-left">Size (L×W×H ft)</th>
                  <th className="p-1.5 text-right">Qty</th>
                  <th className="p-1.5 text-left">Unit</th>
                  <th className="p-1.5 text-right">Rate</th>
                  <th className="p-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const groups = groupByCabin(optionalItems, cabins) ?? [{ cabin: null as CabinSection | null, items: optionalItems }];
                  let sn = 0;
                  return groups.map((g) => (
                  <Fragment key={g.cabin?.id ?? "flat"}>
                    {g.cabin && g.items.length > 0 && (
                      <tr><td colSpan={8} className="p-1.5 font-bold text-white text-[11px]" style={{ background: "#b45309" }}>{g.cabin.name}</td></tr>
                    )}
                    {g.items.map((it) => { sn++; const rowSn = sn; return (
                  <tr key={it.id} className={rowSn % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="p-1.5 border-b">{rowSn}</td>
                    <td className="p-1.5 border-b align-top">
                      <div className="font-semibold text-gray-900">{it.product_name || "—"}</div>
                      {it.cabin_type && <div className="text-[10px] text-blue-700 font-medium mt-0.5">{it.cabin_type}</div>}
                      {it.description_points && it.description_points.trim() && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10px] text-gray-700">
                          {it.description_points.split("\n").map((ln, idx) => { const t = ln.trim().replace(/^[-•*]\s*/, ""); return t ? <li key={idx}>{t}</li> : null; })}
                        </ul>
                      )}
                    </td>
                    <td className="p-1.5 border-b font-mono text-[10px]">{it.hsn_code || q.default_hsn || "—"}</td>
                    <td className="p-1.5 border-b whitespace-nowrap text-[10px]">
                      {(() => { const parts = [it.length ? `L: ${it.length} ft` : null, it.width ? `W: ${it.width} ft` : null, it.height ? `H: ${it.height} ft` : null].filter(Boolean); return parts.length ? parts.join(" × ") : "—"; })()}
                    </td>
                    <td className="p-1.5 border-b text-right">{it.quantity}</td>
                    <td className="p-1.5 border-b">{it.unit}</td>
                    <td className="p-1.5 border-b text-right">{fmt(it.unit_rate)}</td>
                    <td className="p-1.5 border-b text-right font-semibold">{fmt(itemAmount(it))}</td>
                  </tr>
                    ); })}
                  </Fragment>
                  ));
                })()}
              </tbody>
            </table>
            <div className="flex justify-end mt-1 text-xs">
              <div className="flex justify-between gap-6 font-semibold px-3 py-1.5 rounded" style={{ background: "#fdf3e7", color: "#b45309" }}>
                <span>Optional Items Total (not in Grand Total):</span><span>{fmt(optionalTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Option Items — customer-requested change options; base total stays the same */}
        {q.include_option_items && optionItems.length > 0 && (
          <div className="mt-4">
            <div className="text-white text-center font-bold text-xs py-1.5 tracking-wide" style={{ background: "#2c5282" }}>
              OPTION ITEMS — Change Options (base Grand Total stays {fmt(totals.total)})
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-white" style={{ background: "#1e3a5f" }}>
                  <th className="p-1.5 text-left">#</th>
                  <th className="p-1.5 text-left">Change Requested</th>
                  <th className="p-1.5 text-center">Effect</th>
                  <th className="p-1.5 text-right">Cost Difference</th>
                  <th className="p-1.5 text-right" style={{ background: "#e88226" }}>Revised Total</th>
                </tr>
              </thead>
              <tbody>
                {optionItems.map((o, i) => {
                  const inc = o.direction === "increase";
                  const delta = inc ? (o.amount || 0) : -(o.amount || 0);
                  return (
                    <tr key={o.id} className={i % 2 ? "bg-gray-50" : ""}>
                      <td className="p-1.5 border-b">{i + 1}</td>
                      <td className="p-1.5 border-b">{o.description || "—"}</td>
                      <td className="p-1.5 border-b text-center font-semibold" style={{ color: inc ? "#059669" : "#dc2626" }}>{inc ? "Increase" : "Reduction"}</td>
                      <td className="p-1.5 border-b text-right font-semibold" style={{ color: inc ? "#059669" : "#dc2626" }}>{inc ? "+ " : "− "}{fmt(o.amount || 0)}</td>
                      <td className="p-1.5 border-b text-right font-bold text-[13px]" style={{ background: "#fdf3e7", color: "#b45309" }}>{fmt(totals.total + delta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[10px] text-gray-500 mt-1 italic">Each option is an alternative applied to the base Grand Total on its own — options are not added together and do not change the base total.</div>
          </div>
        )}

        {/* Tech Specs */}
        {q.include_specs !== false && q.specs.some((s) => s.component || s.specification || s.material) && (
          <div className="mt-5">
            <div className="text-white text-center font-bold text-sm py-1.5 tracking-wide" style={{ background: "#1e3a5f" }}>TECHNICAL SPECIFICATIONS</div>
            <table className="w-full text-[10px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 text-left border align-top break-words">Category</th>
                  <th className="p-1 text-left border align-top break-words">Component</th>
                  <th className="p-1 text-left border align-top break-words">Specification</th>
                  <th className="p-1 text-left border align-top break-words">Material</th>
                  <th className="p-1 text-left border align-top break-words">Thk/Size</th>
                  <th className="p-1 text-left border align-top break-words">Brand</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filled = q.specs.filter((s) => s.component || s.specification || s.material || s.thickness || s.brand);
                  const groups = groupByCabin(filled, cabins) ?? [{ cabin: null as CabinSection | null, items: filled }];
                  return groups.map((g) => (
                  <Fragment key={g.cabin?.id ?? "flat"}>
                    {g.cabin && g.items.length > 0 && (
                      <tr><td colSpan={6} className="p-1 border font-bold text-white text-[10px]" style={{ background: "#2c5282" }}>{g.cabin.name} — Specifications</td></tr>
                    )}
                    {g.items.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="p-1 border font-medium align-top break-words" style={{ color: "#1e3a5f", wordBreak: "break-word" }}>{s.category}</td>
                    <td className="p-1 border align-top break-words" style={{ wordBreak: "break-word" }}>{s.component || "—"}</td>
                    <td className="p-1 border align-top break-words" style={{ wordBreak: "break-word" }}>{s.specification || "—"}</td>
                    <td className="p-1 border align-top break-words" style={{ wordBreak: "break-word" }}>{s.material || "—"}</td>
                    <td className="p-1 border align-top break-words" style={{ wordBreak: "break-word" }}>{s.thickness || "—"}</td>
                    <td className="p-1 border align-top break-words" style={{ wordBreak: "break-word" }}>{s.brand || "—"}</td>
                  </tr>
                    ))}
                  </Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Commercial Details */}
        {(q.payment_terms || q.delivery_timeline || q.transport_charges || q.notes) && (
          <div className="mt-4 border rounded-md overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: "#1e3a5f" }}>
              Commercial Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2 text-[10px]">
              {q.payment_terms && <div><span className="font-bold">Payment Terms:</span> {q.payment_terms}</div>}
              {q.delivery_timeline && <div><span className="font-bold">Delivery Timeline:</span> {q.delivery_timeline}</div>}
              {q.transport_charges && <div><span className="font-bold">Transportation:</span> {q.transport_charges}</div>}
              {q.gst_percent !== undefined && <div><span className="font-bold">GST Rate:</span> {q.gst_percent}%</div>}
              {q.notes && <div className="col-span-2"><span className="font-bold">Notes / Remarks:</span> {q.notes}</div>}
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="mt-4">
          <div className="font-bold text-xs mb-1" style={{ color: "#1e3a5f" }}>Terms & Conditions:</div>
          <ol className="text-[10px] text-gray-700 list-decimal list-inside space-y-0.5">
            {q.terms.filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </div>

        {/* Bank + UPI QR */}
        {(q.bank.bank_name || q.bank.account_number) && (
          <div className="mt-3 bg-gray-50 px-3 py-2 text-[10px] flex gap-3 items-stretch">
            <div className="flex-1">
              <div className="font-bold mb-1" style={{ color: "#1e3a5f" }}>Bank Details</div>
              <div className="grid grid-cols-2 gap-x-4">
                <div>Account Holder: <b>{q.bank.account_holder}</b></div>
                <div>Bank: <b>{q.bank.bank_name}</b></div>
                <div>A/C No: <b>{q.bank.account_number}</b></div>
                <div>IFSC: <b>{q.bank.ifsc}</b></div>
                <div>Branch: <b>{q.bank.branch}</b></div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="font-bold" style={{ color: "#1e3a5f" }}>UPI Payment</div>
                <div>UPI ID: <b>{COMPANY.upi_id}</b></div>
                <div>Payable Amount: <b>{fmt(payable)}</b></div>
                <div className="text-gray-600">Scan QR with any UPI app (GPay, PhonePe, Paytm, BHIM)</div>
              </div>
            </div>
            {upiQr && (
              <div className="flex flex-col items-center justify-center px-2 border-l border-gray-300">
                <img src={resolveImageUrl(upiQr)} alt="UPI Payment QR" className="w-24 h-24" />
                <div className="text-[9px] font-bold mt-1" style={{ color: "#e88226" }}>SCAN & PAY</div>
                <div className="text-[9px]">{fmt(payable)}</div>
              </div>
            )}
          </div>
        )}


        {/* Signature */}
        <div className="mt-8 flex justify-between items-end">
          <div className="text-[10px] text-gray-600">
            <div>Thank you for your business.</div>
            <div className="mt-1">For queries: {COMPANY.phone}</div>
          </div>
          <div className="text-right text-xs">
            <img src={resolveImageUrl(sealImg)} alt="Company Seal & Digital Signature" className="w-72 h-44 object-contain ml-auto" />
            <div className="mt-1">For <b>{COMPANY.name}</b></div>
            <div className="font-bold border-t pt-1 mt-1">Authorized Signatory (Digitally Signed)</div>
            {approver && (
              <div
                className="mt-2 ml-auto inline-block rounded-md border-2 px-3 py-1.5 text-right"
                style={{ borderColor: "#1e40af", color: "#1e40af", transform: "rotate(-3deg)", maxWidth: "18rem" }}
              >
                <div className="text-[9px] font-bold tracking-wider">APPROVED BY</div>
                <div className="text-[10px] font-bold leading-tight">{approver}</div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-center text-[9px] italic text-gray-500">
          This is a computer-generated document. No physical signature or seal is required.
        </div>

        {/* Footer */}
        <div className="mt-5 pt-2 border-t-2 text-center text-[9px] text-gray-600" style={{ borderColor: "#e88226" }}>
          {COMPANY.phone} | {COMPANY.website} | GST: {COMPANY.gst}
        </div>
        </div>{/* /relative z-10 */}
        <div className="text-center italic text-[9px] text-gray-500 mt-6 pt-2 border-t border-gray-200 px-4">
          This document is electronically generated and is valid without a physical signature or company seal as per applicable provisions of the Information Technology Act, 2000.
        </div>
      </div>{/* /qtn-print */}

      <style>{`
        @media print {
          body { background: white !important; }
          #qtn-print { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function KV({ k, v, full }: { k: string; v?: string | null; full?: boolean }) {
  if (!v) return null;
  return (
    <div className={`flex gap-2 min-w-0 ${full ? "col-span-2" : ""}`}>
      <span className="font-bold w-24 shrink-0">{k}:</span>
      <span className="min-w-0 break-words">{v}</span>
    </div>
  );
}
