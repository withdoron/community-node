import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Single source of truth for FSPayment reads scoped to a project.
// All consumers (Project Detail header, Payments view, Client Portal) share the
// ['fs-payments', projectId] cache key — writes from Log invalidate it once.
export function useFSPayments(projectId) {
  return useQuery({
    queryKey: ['fs-payments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const list = await base44.entities.FSPayment.filter({ project_id: projectId });
        return (Array.isArray(list) ? list : list ? [list] : [])
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
