import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isChangeOrderLocked } from '@/utils/fsEstimateLifecycle';

// Inline parseLineItems — same shape as the inline copies at
// FieldServiceProjects.jsx:1777 and FieldServiceClientPortal.jsx. Three
// callers means it's already a pattern; extract to fsLineItems.js once a
// fourth consumer surfaces (Living Feet, DEC-146 + DEC-148 threshold). For
// now, keep inline so this hook is self-contained and the existing inline
// copies stay where they are.
function parseLineItems(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : (raw?.items || []);
  if (typeof items[0] === 'string') {
    try {
      const parsed = JSON.parse(items[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return items;
}

/**
 * useContractLineItems — chronological union of estimate + signed/accepted CO
 * line items for a project. Per Phase 1.0 spec §9 + §12 Q5 lock (chronological
 * grouping default; estimate first, then signed COs in created order).
 *
 * Each returned item carries metadata for display + attribution:
 *   - `_origin`: 'estimate' | 'co'
 *   - `_co_number`: undefined for estimate items; the CO number for CO items
 *   - `_origin_label`: human-readable label ("Estimate" or "CO #1234")
 *
 * The item's own `id` is the FSPayment.line_item_id write target. ID stability
 * is load-bearing per spec §10 risk mitigation — the hook warns in dev when
 * any line item is missing an `id`. New items get ids via fsLineItems.makeItem
 * (already in place); existing pre-Phase-2.6 items had ids assigned via the
 * Phase 2.4 §0a workers_json migration pattern.
 */
export function useContractLineItems(projectId) {
  // Estimate spine — same query shape as FieldServiceProjects.jsx:373-389
  // (bidirectional link query: estimates by project_id first, then estimate.id
  // fallback). This hook reads only by project_id since the consumer flow
  // (LineItemPicker on Sub Payment / Client Payment forms) always has projectId.
  const { data: estimate } = useQuery({
    queryKey: ['fs-project-estimate-for-attribution', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      try {
        const list = await base44.entities.FSEstimate.filter({ project_id: projectId });
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        return arr[0] || null;
      } catch { return null; }
    },
    enabled: !!projectId,
  });

  // Signed/accepted COs only — drafts and awaiting-signature don't move the
  // contract per DEC-193's signChangeOrder + isChangeOrderLocked discipline.
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['fs-change-orders', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const list = await base44.entities.FSChangeOrder.filter({ project_id: projectId });
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        // Sort by created_date ascending — chronological order per §12 Q5.
        return arr.sort((a, b) =>
          (a.created_date || '').localeCompare(b.created_date || '')
        );
      } catch { return []; }
    },
    enabled: !!projectId,
  });

  return useMemo(() => {
    const items = [];
    let missingIdWarn = false;

    // Estimate spine
    const estItems = parseLineItems(estimate?.line_items);
    estItems.forEach((it) => {
      if (!it.id) missingIdWarn = true;
      items.push({
        ...it,
        _origin: 'estimate',
        _co_number: undefined,
        _origin_label: 'Estimate',
      });
    });

    // Signed/accepted COs in chronological order
    const countedCOs = changeOrders.filter(isChangeOrderLocked);
    countedCOs.forEach((co) => {
      const coItems = parseLineItems(co.line_items);
      const coLabel = `CO ${co.change_order_number || co.id?.slice(-6) || ''}`.trim();
      coItems.forEach((it) => {
        if (!it.id) missingIdWarn = true;
        items.push({
          ...it,
          _origin: 'co',
          _co_number: co.change_order_number,
          _origin_label: coLabel,
        });
      });
    });

    // Spec §10 risk mitigation: warn in dev if any line item is missing an
    // id. Stable ids are load-bearing for attribution — without them, the
    // FSPayment.line_item_id FK lands on undefined and the per-line rollup
    // silently goes blank. Warn loudly so a future estimate-edit refactor
    // that drops the spread doesn't break attribution unnoticed.
    if (missingIdWarn && import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[useContractLineItems] One or more line items are missing `id`. ' +
        'Attribution writes will silently lose the FK. Project:', projectId
      );
    }

    return items;
  }, [estimate, changeOrders, projectId]);
}
