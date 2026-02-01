import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserState(userId) {
  const { data: recommendations = [] } = useQuery({
    queryKey: ['user-recommendations', userId],
    queryFn: async () => {
      if (!userId) return [];
      return base44.entities.Recommendation.filter(
        { user_id: userId, is_active: true },
        '-created_date',
        100
      );
    },
    enabled: !!userId
  });

  const { data: punchPass } = useQuery({
    queryKey: ['punchPass', userId],
    queryFn: async () => {
      if (!userId) return null;
      const passes = await base44.entities.PunchPass.filter({ user_id: userId });
      return passes[0] || null;
    },
    enabled: !!userId
  });

  const recCount = recommendations.length;
  const hasPunchActivity = punchPass && (punchPass.total_used > 0 || (punchPass.current_balance || 0) > 0);

  let state = 'explorer';
  if (recCount >= 5 || hasPunchActivity) {
    state = 'connected';
  } else if (recCount > 0) {
    state = 'engaged';
  }

  return {
    state,
    recommendations,
    punchPass,
    recCount
  };
}
