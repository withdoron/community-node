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

// Has the workspace explicitly populated trade_categories_json? Distinct from
// getTradeCategories — that helper falls back to the 18-default seed when the
// field is empty, which is the right shape for render-time consumers (always
// return something to render). For "is Custom available as a preset choice?",
// the answer is NO when the field is empty — the user hasn't authored
// anything, the seed is platform fallback, not their custom list.
export function hasCustomTradeCategories(profile) {
  const tc = profile?.trade_categories_json;
  if (Array.isArray(tc) && tc.length > 0) return true;
  if (tc && typeof tc === 'object' && Array.isArray(tc.items) && tc.items.length > 0) return true;
  return false;
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
 * Derive a line item's trade category via name-bridging.
 *
 * Currently disconnected from the render path — kept as scaffolding after
 * the Phase 2.5 rollback. The single-trade-per-sub model (one
 * primary_trade_id per workers_json item, name-bridged into per-estimate
 * snapshots) collapsed across taxonomies: a sub mapped to "Tile" in the
 * GC preset has no name match in CSI MasterFormat, so the bridge silently
 * soft-failed in cross-taxonomy estimates. The user-visible derivation
 * (italic dropdown styling, info-dot tooltip) was rolled back to avoid
 * teaching contractors to distrust the visual cue. The primary_trade_id
 * field was removed from workers_json items via migration. Revisit when
 * per-taxonomy sub-to-trade mapping is the right shape (Phase 3+).
 *
 * Resolution order (direct field always wins, DEC-206):
 *   1. line.trade_category_id set       → { source: 'line' }
 *   2. line.sub_person_id linked sub
 *      with primary_trade_id            → name-bridge:
 *        workspace category id → name → snapshot category by NAME match
 *        - match found                   → { source: 'sub_person' }
 *        - bridge fails (orphan / no
 *          name match in snapshot)       → { id: '', source: null }
 *   3. Anything else                     → { id: '', source: null }
 *
 * Read-time only. Soft-fails to Unallocated when bridging fails — never
 * throws, never blocks render. Pure function (no React state); mirrors
 * deriveProjectClient shape. After the migration strip, every sub's
 * primary_trade_id is empty, so step 2 returns null source for every
 * call until the field is reintroduced.
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
