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

/**
 * Derive a line item's trade category via name-bridging. Phase 2.5
 * empty-field derivation (DEC-206 discipline applied to a fourth surface,
 * after the three project↔estimate derivations in useProjectLinkedEstimates).
 *
 * Resolution order (direct field always wins):
 *   1. line.trade_category_id set       → { source: 'line' }
 *   2. line.sub_person_id linked sub
 *      with primary_trade_id            → name-bridge:
 *        workspace category id → name → snapshot category by NAME match
 *        - match found                   → { source: 'sub_person' }
 *        - bridge fails (orphan / no
 *          name match in snapshot)       → { id: '', source: null }
 *   3. Anything else                     → { id: '', source: null }
 *
 * Why name-bridging vs storing snapshot ids on workers_json: workers_json's
 * primary_trade_id references the workspace's CURRENT trade_categories_json
 * (Phase 2.3 lock-in). Estimates carry frozen taxonomy snapshots (Phase 2.2).
 * The bridge resolves at read time so taxonomy changes propagate correctly.
 *
 * Read-time only. Soft-fails to Unallocated when bridging fails — never
 * throws, never blocks render. Pure function (no React state); call from
 * inside the consumer's existing useMemo for grouping or directly in
 * editor render path. Mirrors deriveProjectClient shape.
 *
 * @param {Object} line - Line item (may be undefined)
 * @param {Object} peopleMap - { [person_id]: workers_json item }
 * @param {Array}  snapshotCategories - Estimate's frozen taxonomy [{id, name, order}]
 * @param {Array}  workspaceCategories - Workspace's current taxonomy [{id, name, order}]
 * @returns {{ id: string, name: string, source: 'line' | 'sub_person' | null }}
 */
export function deriveLineTrade(line, peopleMap, snapshotCategories, workspaceCategories) {
  const snap = Array.isArray(snapshotCategories) ? snapshotCategories : [];
  const ws = Array.isArray(workspaceCategories) ? workspaceCategories : [];

  // Direct field always wins (DEC-206). Resolve display name from snapshot
  // when possible — falls through to '' for ids that point at a deleted
  // snapshot category (renders as Unallocated downstream).
  if (line?.trade_category_id) {
    const snapCat = snap.find((c) => c.id === line.trade_category_id);
    return {
      id: line.trade_category_id,
      name: snapCat?.name || '',
      source: 'line',
    };
  }

  // No sub linked → no derivation possible.
  const sub = line?.sub_person_id ? peopleMap?.[line.sub_person_id] : null;
  if (!sub?.primary_trade_id) {
    return { id: '', name: '', source: null };
  }

  // Workspace id → name. Workspace categories are the source of truth for
  // sub.primary_trade_id (Phase 2.3 lock-in). If the contractor deleted the
  // category from workspace settings since assigning it to the sub, the
  // lookup fails — soft-fail to Unallocated, contractor can pick explicitly.
  const wsCat = ws.find((c) => c.id === sub.primary_trade_id);
  if (!wsCat) {
    return { id: '', name: '', source: null };
  }

  // Name → snapshot id. Exact match (not fuzzy). When the estimate was
  // created under a different preset that doesn't include this category by
  // name, the lookup fails — soft-fail to Unallocated.
  const snapCat = snap.find((c) => c.name === wsCat.name);
  if (!snapCat) {
    return { id: '', name: '', source: null };
  }

  return {
    id: snapCat.id,
    name: snapCat.name,
    source: 'sub_person',
  };
}
