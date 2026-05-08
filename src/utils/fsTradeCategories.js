/**
 * fsTradeCategories — shared trade-category helpers for Field Service.
 *
 * Trade categories drive the trade-grouped estimate render (Phase 2.1,
 * platform default per DEC-206). Workspaces store their taxonomy in
 * FieldServiceProfile.trade_categories_json; this helper falls back to
 * DEFAULT_TRADE_CATEGORIES when a profile has no explicit list.
 *
 * Phase 2.2 (taxonomy presets) will replace DEFAULT_TRADE_CATEGORIES
 * with a presets system — at that point this file becomes the seam for
 * preset selection. For now, the default seed list is the 18 trades that
 * shipped behind the is_insurance_estimate=true gate.
 *
 * Living Feet (DEC-146): every consumer of trade categories reads through
 * getTradeCategories(profile). FieldServiceEstimates renders the editor
 * + preview; ClientPortal renders the estimate for clients; Phase 2.2's
 * taxonomy presets editor will become the third consumer.
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
