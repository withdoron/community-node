/**
 * Shared hook: is the current user staff/co-owner on at least one business?
 * Used for: Dashboard nav visibility (with useUserOwnedBusinesses).
 * Same query key as BusinessDashboard staffBusinesses so cache stays in sync.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserStaffBusinesses(currentUser) {
  const { data: staffBusinesses = [], isLoading } = useQuery({
    queryKey: ['staffBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      if (currentUser.associated_businesses?.length) {
        const businesses = await Promise.all(
          currentUser.associated_businesses.map((id) =>
            base44.entities.Business.filter({ id }, '', 1).then((r) => r?.[0] ?? null)
          )
        );
        const found = businesses.filter(Boolean);
        return found.filter(
          (b) =>
            b.instructors?.includes(currentUser.id) &&
            b.owner_user_id !== currentUser.id
        );
      }
      const allBusinesses = await base44.entities.Business.list('-created_date', 500);
      return (allBusinesses || []).filter(
        (b) =>
          b.instructors?.includes(currentUser.id) &&
          b.owner_user_id !== currentUser.id
      );
    },
    enabled: !!currentUser?.id,
  });

  return {
    staffBusinesses,
    hasStaffBusinesses: staffBusinesses.length > 0,
    isLoading,
  };
}
