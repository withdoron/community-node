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

  const { data: joyCoins } = useQuery({
    queryKey: ['joyCoins', userId],
    queryFn: async () => {
      if (!userId) return null;
      const records = await base44.entities.JoyCoins.filter({ user_id: userId });
      return records[0] || null;
    },
    enabled: !!userId
  });

  const recCount = recommendations.length;
  const hasJoyCoinActivity = joyCoins && ((joyCoins.lifetime_spent || 0) > 0 || (joyCoins.balance || 0) > 0);

  let state = 'explorer';
  if (recCount >= 5 || hasJoyCoinActivity) {
    state = 'connected';
  } else if (recCount > 0) {
    state = 'engaged';
  }

  return {
    state,
    recommendations,
    joyCoins,
    recCount
  };
}
