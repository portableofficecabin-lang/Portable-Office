/**
 * Labour Colony PROJECT model (spec §1 + §10) — the top-level, persisted shape
 * that composes the structure calculation (LabourColonyConfig), the civil-work
 * calculation (CivilWorkConfig) and the project/customer metadata. This is what
 * gets saved to the `labour_colony_projects` table (JSONB) and mirrored to
 * localStorage. Kept framework-free so the store and any report can reuse it.
 */

import { type LabourColonyConfig } from "./labourColony";
import { DEFAULT_CIVIL_CONFIG, type CivilWorkConfig } from "./labourColonyCivil";

export type SaleOrRental = "sale" | "rental";

export type LabourColonyType =
  | "labour_camp"
  | "workmen_accommodation"
  | "staff_colony"
  | "site_office_colony"
  | "mixed";

export const LABOUR_COLONY_TYPES: { id: LabourColonyType; label: string }[] = [
  { id: "labour_camp", label: "Labour camp" },
  { id: "workmen_accommodation", label: "Workmen accommodation" },
  { id: "staff_colony", label: "Staff / supervisor colony" },
  { id: "site_office_colony", label: "Site office + colony" },
  { id: "mixed", label: "Mixed / combined" },
];

export type ProjectStatus = "draft" | "enquiry" | "quoted" | "order" | "project";

export interface ProjectMeta {
  projectName: string;
  customerName: string;
  mobile: string;
  email: string;
  location: string;
  colonyType: LabourColonyType;
  workers: number;
  durationMonths: number;
  saleOrRental: SaleOrRental;
  requirementNotes: string;
  /** Linked customer record in `parties`. */
  partyId?: string;
  status: ProjectStatus;
}

export interface LabourColonyProject {
  id: string;
  projectNumber?: string;
  createdAt: string;
  updatedAt: string;
  meta: ProjectMeta;
  config: LabourColonyConfig;
  civil: CivilWorkConfig;
  /** Links produced by the convert-to flows (spec §10). */
  quotationId?: string;
  salesOrderId?: string;
  enquiryId?: string;
}

export function defaultProjectMeta(): ProjectMeta {
  return {
    projectName: "",
    customerName: "",
    mobile: "",
    email: "",
    location: "",
    colonyType: "labour_camp",
    workers: 100,
    durationMonths: 12,
    saleOrRental: "sale",
    requirementNotes: "",
    status: "draft",
  };
}

let _seq = 0;
export function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  _seq += 1;
  return `lc_${_seq}_${Math.floor(performance.now?.() ?? 0)}`;
}

/** Human-readable identity for lists. */
export function projectTitle(p: LabourColonyProject): string {
  const m = p.meta;
  if (m.projectName.trim()) return m.projectName.trim();
  if (m.customerName.trim()) return `${m.customerName.trim()} — labour colony`;
  return `${m.workers || p.config.capacity || 0}-worker colony`;
}
