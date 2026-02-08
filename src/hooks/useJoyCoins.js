import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useJoyCoins() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const {
    data: joyCoins,
    isLoading: balanceLoading,
    error: balanceError,
  } = useQuery({
    queryKey: ['joyCoins', userId],
    queryFn: async () => {
      if (!userId) return null;

      const records = await base44.entities.JoyCoins.filter({ user_id: userId });
      if (records.length > 0) return records[0];

      return null;
    },
    enabled: !!userId,
  });

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ['joyCoinsTransactions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const records = await base44.entities.JoyCoinTransactions.filter({ user_id: userId });
      return records
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    },
    enabled: !!userId,
  });

  const {
    data: activeReservations = [],
    isLoading: reservationsLoading,
  } = useQuery({
    queryKey: ['joyCoinsReservations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const records = await base44.entities.JoyCoinReservations.filter({
        user_id: userId,
        status: 'held',
      });
      return records;
    },
    enabled: !!userId,
  });

  const balance = joyCoins?.balance ?? 0;
  const reservedCoins = activeReservations.reduce((sum, reservation) => sum + (reservation.amount || 0), 0);
  const availableBalance = balance;

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['joyCoins', userId] });
    queryClient.invalidateQueries({ queryKey: ['joyCoinsTransactions', userId] });
    queryClient.invalidateQueries({ queryKey: ['joyCoinsReservations', userId] });
  };

  // Transfer feature removed — Joy Coins are non-transferable (DEC-041)

  return {
    balance,
    availableBalance,
    reservedCoins,
    lifetimeEarned: joyCoins?.lifetime_earned ?? 0,
    lifetimeSpent: joyCoins?.lifetime_spent ?? 0,
    hasJoyCoins: !!joyCoins,
    transactions,
    activeReservations,
    isLoading: balanceLoading || transactionsLoading || reservationsLoading,
    balanceLoading,
    transactionsLoading,
    reservationsLoading,
    error: balanceError,
    refetchAll
  };
}
