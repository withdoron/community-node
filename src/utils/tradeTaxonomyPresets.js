// tradeTaxonomyPresets — hardcoded trade-taxonomy preset config (Phase 2.2).
//
// New estimates pick their preset per-estimate via the dropdown in the
// estimate form (no workspace default — the "Default Trade Taxonomy" setting
// was removed; FieldServiceProfile.default_taxonomy_preset_id is orphaned in
// code and will be dropped from the migration target schema per IF-011).
// On selection, the estimate freezes `trade_categories_snapshot` from the
// preset's `categories` array. The snapshot is the load-bearing render shape
// (per Phase 2.2 architecture consultation §2 — Push 2 normalization).
//
// Future direction (NOT building in 2.2): platform-admin-managed presets will
// move from this config file into an admin-editable surface. Architecture is
// friendly to the move — preset ids are stable slugs, categories are JSON-shaped
// `{id, name, order}`, replaceable without code changes once a Base44 entity
// (or post-migration Supabase table) backs them.
//
// Constraint: keep `id` slugs stable across releases. Estimates carry the slug
// in `taxonomy_preset_id`; renaming a slug would orphan every estimate that
// referenced the old name. Names and descriptions are display strings and may
// be polished without breaking references.

import { getTradeCategories, hasCustomTradeCategories } from './fsTradeCategories';

export const TRADE_TAXONOMY_PRESETS = [
  {
    id: 'general_contractor',
    name: 'General Contractor',
    description: 'Residential general contracting — permits, framing, plumbing, electrical, finish trades.',
    trade_count: 14,
    categories: [
      { id: 'permits_fees',          name: 'Permits & Fees',          order: 0 },
      { id: 'site_prep',             name: 'Site Prep',               order: 1 },
      { id: 'foundation',            name: 'Foundation',              order: 2 },
      { id: 'framing',               name: 'Framing',                 order: 3 },
      { id: 'plumbing',              name: 'Plumbing',                order: 4 },
      { id: 'electrical',            name: 'Electrical',              order: 5 },
      { id: 'hvac',                  name: 'HVAC',                    order: 6 },
      { id: 'roofing',               name: 'Roofing',                 order: 7 },
      { id: 'siding_exterior',       name: 'Siding & Exterior',       order: 8 },
      { id: 'insulation_drywall',    name: 'Insulation & Drywall',    order: 9 },
      { id: 'cabinets_countertops',  name: 'Cabinets & Countertops',  order: 10 },
      { id: 'painting',              name: 'Painting',                order: 11 },
      { id: 'flooring',              name: 'Flooring',                order: 12 },
      { id: 'subcontractor',         name: 'Subcontractor',           order: 13 },
    ],
  },
  {
    id: 'csi_masterformat',
    name: 'CSI MasterFormat',
    description: 'Construction Specifications Institute 16-division format — insurance and commercial work.',
    trade_count: 16,
    categories: [
      { id: 'div_01_general_requirements',  name: 'Division 01 — General Requirements',         order: 0 },
      { id: 'div_02_site_construction',     name: 'Division 02 — Site Construction',            order: 1 },
      { id: 'div_03_concrete',              name: 'Division 03 — Concrete',                     order: 2 },
      { id: 'div_04_masonry',               name: 'Division 04 — Masonry',                      order: 3 },
      { id: 'div_05_metals',                name: 'Division 05 — Metals',                       order: 4 },
      { id: 'div_06_wood_plastics',         name: 'Division 06 — Wood & Plastics',              order: 5 },
      { id: 'div_07_thermal_moisture',      name: 'Division 07 — Thermal & Moisture Protection', order: 6 },
      { id: 'div_08_doors_windows',         name: 'Division 08 — Doors & Windows',              order: 7 },
      { id: 'div_09_finishes',              name: 'Division 09 — Finishes',                     order: 8 },
      { id: 'div_10_specialties',           name: 'Division 10 — Specialties',                  order: 9 },
      { id: 'div_11_equipment',             name: 'Division 11 — Equipment',                    order: 10 },
      { id: 'div_12_furnishings',           name: 'Division 12 — Furnishings',                  order: 11 },
      { id: 'div_13_special_construction',  name: 'Division 13 — Special Construction',         order: 12 },
      { id: 'div_14_conveying_systems',     name: 'Division 14 — Conveying Systems',            order: 13 },
      { id: 'div_15_mechanical',            name: 'Division 15 — Mechanical',                   order: 14 },
      { id: 'div_16_electrical',            name: 'Division 16 — Electrical',                   order: 15 },
    ],
  },
  {
    id: 'simple_three_bucket',
    name: 'Simple Three-Bucket',
    description: 'Minimal taxonomy — Materials / Labor / Other. For contractors who don’t need trade-level detail.',
    trade_count: 3,
    categories: [
      { id: 'materials', name: 'Materials', order: 0 },
      { id: 'labor',     name: 'Labor',     order: 1 },
      { id: 'other',     name: 'Other',     order: 2 },
    ],
  },
  {
    id: 'service_provider_hourly',
    name: 'Service Provider — Hourly',
    description: 'Consulting and service-provider archetypes — strategy, build, audit, documentation, meetings.',
    trade_count: 7,
    categories: [
      { id: 'strategy',         name: 'Strategy',           order: 0 },
      { id: 'build',            name: 'Build',              order: 1 },
      { id: 'audit',            name: 'Audit',              order: 2 },
      { id: 'documentation',    name: 'Documentation',      order: 3 },
      { id: 'meeting',          name: 'Meeting',            order: 4 },
      { id: 'review',           name: 'Review',             order: 5 },
      { id: 'travel_expenses',  name: 'Travel & Expenses',  order: 6 },
    ],
  },
];

// Resolve a preset by its id slug. Returns the preset object or null. Used at
// preset-pick time inside the estimate form — both for first-time selection
// on a new estimate (no confirmation) and for changing between presets on
// an existing estimate (confirmation dialog surfaces stale-line count).
//
// 'custom' is a synthetic preset id sourced from the workspace's
// trade_categories_json (the editable working list managed in Settings →
// Trade Categories). When id === 'custom', profile must be passed and must
// have explicit items; otherwise returns null (empty Custom is not a valid
// preset choice). Pass-through for the four built-in slugs ignores profile.
export function resolvePresetById(id, profile) {
  if (!id) return null;
  if (id === 'custom') {
    if (!hasCustomTradeCategories(profile)) return null;
    const items = getTradeCategories(profile);
    return {
      id: 'custom',
      name: 'Custom',
      description: "Workspace's custom trade categories (Settings → Trade Categories).",
      trade_count: items.length,
      categories: items,
    };
  }
  return TRADE_TAXONOMY_PRESETS.find((p) => p.id === id) || null;
}
