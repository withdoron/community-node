/**
 * fsTradeCategories — shared trade-category helpers for Field Service.
 *
 * Trade categories drive the trade-grouped estimate render (DEC-206 platform
 * default). Two layers, two helpers:
 *
 *   getTradeCategories(profile) — reads the workspace's editable working list
 *     from FieldServiceProfile.trade_categories_json. Falls back to the
 *     18-default seed when the profile has no list. Used by Settings UI
 *     (workspace-level edits).
 *
 *   getEstimateTradeCategories(estimate, profile) — reads the per-estimate
 *     frozen snapshot first (FSEstimate.trade_categories_snapshot, written
 *     at preset-pick time per Phase 2.2). Falls back to workspace's working
 *     list only if the snapshot is null (legacy estimates pre-backfill).
 *     Used by EstimatePreview, EstimateForm, ClientPortal — every render
 *     surface that shows an estimate's line items.
 *
 * Phase 2.2 architecture: the snapshot freezes the estimate's identity at
 * preset-pick time. Workspace mutations (Settings → Trade Categories edit)
 * do not retroactively touch shipped estimates. Estimates are documents
 * with frozen identity (Two-World Architecture, DEC-203).
 *
 * Living Feet (DEC-146): every render-time consumer reads through
 * getEstimateTradeCategories. Three sites today (EstimatePreview, EstimateForm,
 * ClientPortal); future consumers (FSChangeOrder render, Estimate PDF
 * variants) plug in via the same call.
 */

export const DEFAULT_TRADE_CATEGORIES = [
  'General Conditions', 'Demolition', 'Framing', 'Roofing', 'Siding & Exterior',
  'Windows & Doors', 'Electrical', 'Plumbing', 'HVAC', 'Insulation',
  'Drywall', 'Painting', 'Flooring', 'Concrete & Foundation',
  'Cabinetry & Countertops', 'Appliances', 'Cleanup & Hauling', 'Other',
];

export function getTradeCategories(profile) {
  const tc = profile?.trade_categories_json;
  if (Array.isArray(tc) && tc.length > 0) return tc;
  if (tc && typeof tc === 'object' && Array.isArray(tc.items) && tc.items.length > 0) return tc.items;
  return DEFAULT_TRADE_CATEGORIES.map((name, i) => ({ id: `cat_${i}`, name, order: i }));
}

// Per-estimate trade categories. Snapshot first (frozen at preset-pick time,
// survives workspace mutations); workspace working list as fallback for legacy
// estimates pre-backfill. Both shapes — plain array and {items: [...]} wrap —
// are handled, mirroring getTradeCategories. The snapshot backfill migration
// always writes the resolved array shape going forward.
export function getEstimateTradeCategories(estimate, profile) {
  const snap = estimate?.trade_categories_snapshot;
  if (Array.isArray(snap) && snap.length > 0) return snap;
  if (snap && typeof snap === 'object' && Array.isArray(snap.items) && snap.items.length > 0) return snap.items;
  return getTradeCategories(profile);
}
