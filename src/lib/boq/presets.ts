/**
 * REUSABLE COMPANY CONSTRUCTION PRESETS  (spec §1). Pure: no React, no DOM, no Supabase.
 *
 * A preset is nothing more than a named, reusable BoqSettings blob — the whole "construction method"
 * (section bindings via materialMap, spacing norms, charges, GST, wastage, competitive markup). Saved
 * presets live in `boq_templates` (see templateStore.ts); THIS file defines the BUILT-IN, always-present
 * "Company Standard" preset so a fresh install has a sensible company default with no DB write.
 *
 * The built-in equals defaultBoqSettings(kind) EXCEPT it pins the standard 2'-0" c/c framing spacings
 * (spec §4 joists, §6 studs, §9 rafters, §11 purlins). Every value stays editable — the admin duplicates
 * it to customise, sets any preset as the company default, or restores the built-in at any time. The
 * built-in is never written to the Material Master or the customer/GMC price; it only seeds the per-
 * quotation BoqSettings a new cabin starts from.
 */
import {
  DEFAULT_NORMS,
  defaultBoqSettings,
  ft2m,
  round,
  type BoqSettings,
  type BoqTemplateKind,
} from "@/lib/boq/types";
import type { BoqTemplateRecord } from "@/lib/boq/materialMaster";

/** 2'-0" centre-to-centre — the company standard framing pitch, in metres. */
export const SPACING_2FT = round(ft2m(2), 4); // 0.6096

export const ALL_TEMPLATE_KINDS: BoqTemplateKind[] = ["ms_cabin", "puf_cabin", "container", "labour_colony"];

const KIND_LABEL: Record<BoqTemplateKind, string> = {
  ms_cabin: "MS Cabin",
  puf_cabin: "PUF Cabin",
  container: "Container Cabin",
  labour_colony: "Labour Colony",
};

/** Stable id of the built-in company-standard preset for a kind. */
export function builtinPresetId(kind: BoqTemplateKind): string {
  return `builtin:company-standard:${kind}`;
}

/** True for any built-in (non-deletable) preset id. */
export function isBuiltinPresetId(id: string | undefined | null): boolean {
  return typeof id === "string" && id.startsWith("builtin:");
}

/**
 * The company-standard BoqSettings for a kind. Cabin kinds pin the 2'-0" framing pitch; the labour
 * colony derives its spacing from its own elevation grid (norms.postSpacing etc. are deliberately not
 * applied there — see colonyTakeoff notes), so it keeps the default norms.
 */
export function companyStandardSettings(kind: BoqTemplateKind): BoqSettings {
  const base = defaultBoqSettings(kind);
  const isCabin = kind !== "labour_colony";
  const norms = isCabin
    ? {
        ...DEFAULT_NORMS,
        ...base.norms,
        studSpacingM: SPACING_2FT, // §6 wall studs
        joistSpacingM: SPACING_2FT, // §4 floor cross members
        purlinSpacingM: SPACING_2FT, // §11 roof purlins
        trussSpacingM: SPACING_2FT, // §9 sloping rafters
      }
    : { ...DEFAULT_NORMS, ...base.norms };
  // §10 — the standard central roof ridge is a 50×25 member (distinct from the heavier rafter angle).
  // Applied as a per-line override so the DEFAULT take-off (and every existing quote) is untouched;
  // only cabins seeded from / applied with this preset get the 50×25 ridge.
  const overrides = isCabin
    ? { ...base.overrides, "roof:ridge": { materialKey: "rhs-50x25x2" } }
    : base.overrides;
  return {
    ...base,
    templateKind: kind,
    templateId: builtinPresetId(kind),
    norms,
    overrides,
  };
}

/** The built-in company-standard preset record for a kind (marked default). */
export function builtinPreset(kind: BoqTemplateKind): BoqTemplateRecord {
  return {
    id: builtinPresetId(kind),
    name: `Company Standard — ${KIND_LABEL[kind]}`,
    kind,
    description:
      "Built-in company construction standard (2'-0\" c/c framing). Fully editable — duplicate it to " +
      "customise, or set any of your own presets as the company default.",
    isDefault: true,
    data: companyStandardSettings(kind),
  };
}

/** All built-in presets, one per kind. Immutable and always present in the preset list. */
export const BUILTIN_PRESETS: BoqTemplateRecord[] = ALL_TEMPLATE_KINDS.map(builtinPreset);

/** Map kind → its built-in preset. */
export const COMPANY_STANDARD: Record<BoqTemplateKind, BoqTemplateRecord> = ALL_TEMPLATE_KINDS.reduce(
  (acc, kind) => {
    acc[kind] = builtinPreset(kind);
    return acc;
  },
  {} as Record<BoqTemplateKind, BoqTemplateRecord>,
);
