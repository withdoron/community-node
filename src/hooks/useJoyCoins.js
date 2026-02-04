import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const transferMutation = useMutation({
    mutationFn: async ({ recipientUserId, recipientName, amount }) => {
      if (!userId) throw new Error('Not authenticated');
      if (amount <= 0) throw new Error('Amount must be positive');
      if (recipientUserId === userId) throw new Error('Cannot transfer to yourself');

      const senderRecords = await base44.entities.JoyCoins.filter({ user_id: userId });
      if (senderRecords.length === 0) throw new Error('No Joy Coins account');
      const senderJoyCoins = senderRecords[0];
      const currentBalance = senderJoyCoins.balance ?? 0;
      if (amount > currentBalance) throw new Error('INSUFFICIENT_BALANCE');

      const now = new Date().toISOString();

      let recipientRecords = await base44.entities.JoyCoins.filter({ user_id: recipientUserId });
      let recipientJoyCoins;

      if (recipientRecords.length === 0) {
        recipientJoyCoins = await base44.entities.JoyCoins.create({
          user_id: recipientUserId,
          balance: 0,
          lifetime_earned: 0,
          lifetime_spent: 0
        });
      } else {
        recipientJoyCoins = recipientRecords[0];
      }

      const senderNewBalance = senderJoyCoins.balance - amount;
      await base44.entities.JoyCoins.update(senderJoyCoins.id, {
        balance: senderNewBalance
      });

      await base44.entities.JoyCoinTransactions.create({
        user_id: userId,
        type: 'transfer_out',
        amount: -amount,
        balance_after: senderNewBalance,
        transfer_to_user_id: recipientUserId,
        note: `Sent to ${recipientName || 'member'}`,
        created_at: now
      });

      const recipientNewBalance = (recipientJoyCoins.balance ?? 0) + amount;
      await base44.entities.JoyCoins.update(recipientJoyCoins.id, {
        balance: recipientNewBalance,
        lifetime_earned: (recipientJoyCoins.lifetime_earned ?? 0) + amount
      });

      await base44.entities.JoyCoinTransactions.create({
        user_id: recipientUserId,
        type: 'transfer_in',
        amount,
        balance_after: recipientNewBalance,
        transfer_from_user_id: userId,
        note: 'Received from member',
        created_at: now
      });

      return { amount, recipientName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joyCoins', userId] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsTransactions', userId] });
    }
  });

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
    refetchAll,
    transferCoins: transferMutation.mutateAsync,
    transferPending: transferMutation.isPending
  };
}
