import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { excludeDeleted } from '@/utils/softDelete';

// Single source of truth for FSPayment reads scoped to a project.
// All consumers (Project Detail header, Payments view, Client Portal) share the
// ['fs-payments', projectId] cache key — writes from Log invalidate it once.
// Phase 1.0 commit 1: soft-deleted records (deleted_at set) excluded by default.
export function useFSPayments(projectId) {
  return useQuery({
    queryKey: ['fs-payments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const list = await base44.entities.FSPayment.filter({ project_id: projectId });
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        return excludeDeleted(arr)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      } catch {
        return [];
      }
    },
    enabled: !!projectId,
  });
}

// Direction-grouped totals. Used by the Project Detail four-metric banner and
// the view-only Payments section. Only counts settled rows (received/cleared);
// pending rows don't move the cash needle yet.
export function summarizePayments(payments) {
  const settled = (payments || []).filter(
    (p) => p.status === 'received' || p.status === 'cleared'
  );
  const received = settled
    .filter((p) => p.direction === 'received')
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paid = settled
    .filter((p) => p.direction === 'paid')
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  return { received, paid, net: received - paid };
}
