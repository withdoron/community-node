/**
 * Shared hook: does the current user own at least one business?
 * Used for: conditional Business Dashboard nav, MyLane business CTA.
 * Same query key as BusinessDashboard so cache stays in sync after onboarding.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserOwnedBusinesses(currentUser) {
  const { data: ownedBusinesses = [], isLoading } = useQuery({
    queryKey: ['ownedBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return base44.entities.Business.filter(
        { owner_user_id: currentUser.id },
        '-created_date',
        10
      );
    },
    enabled: !!currentUser?.id,
  });

  return {
    ownedBusinesses,
    hasOwnedBusinesses: ownedBusinesses.length > 0,
    isLoading,
  };
}
