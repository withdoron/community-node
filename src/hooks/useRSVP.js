import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Determines if a Joy Coin RSVP cancellation is eligible for refund based on event policy.
 * flexible: refund if > 2 hours before event start
 * moderate: refund if > 24 hours before event start
 * strict: never refund
 */
export function getRefundEligibility(event) {
  if (!event) return false;
  const now = new Date();
  const eventStart = new Date(event.date || event.start_date);
  const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

  const policy = event.refund_policy || 'moderate';

  switch (policy) {
    case 'flexible':
      return hoursUntilEvent > 2;
    case 'moderate':
      return hoursUntilEvent > 24;
    case 'strict':
      return false;
    default:
      return hoursUntilEvent > 24;
  }
}

export function useRSVP(eventId, currentUser) {
  const queryClient = useQueryClient();
  const userId = currentUser?.id;

  // Fetch the current user's RSVP for this event
  const { data: userRSVP, isLoading: rsvpLoading } = useQuery({
    queryKey: ['user-rsvp', eventId, userId],
    queryFn: async () => {
      const rsvps = await base44.entities.RSVP.filter({
        event_id: eventId,
        user_id: userId,
        is_active: true
      });
      return rsvps[0] || null;
    },
    enabled: !!eventId && !!userId
  });

  // Fetch total attendee count for this event
  const { data: attendees = [], isLoading: attendeesLoading } = useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      return await base44.entities.RSVP.filter({
        event_id: eventId,
        is_active: true
      });
    },
    enabled: !!eventId
  });

  // RSVP "I'm Going" — server function handles Joy Coin reservation + deduction
  const rsvpGoing = useMutation({
    mutationFn: async (variables = {}) => {
      const result = await base44.functions.invoke('manageRSVP', {
        action: 'rsvp',
        event_id: eventId,
        party_size: variables.partySize ?? 1,
        party_composition: variables.partyComposition ?? undefined,
      });
      const data = result?.data ?? result;
      if (data?.error === 'INSUFFICIENT_JOY_COINS') {
        throw new Error('INSUFFICIENT_JOY_COINS');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rsvp', eventId, userId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-rsvps'] });
      queryClient.invalidateQueries({ queryKey: ['all-events-for-rsvp'] });
      queryClient.invalidateQueries({ queryKey: ['joyCoins', userId] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsTransactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsReservations', userId] });
    }
  });

  // Cancel RSVP — server function handles refund/forfeit
  const rsvpCancel = useMutation({
    mutationFn: async (variables = {}) => {
      if (!userRSVP) return;

      const result = await base44.functions.invoke('manageRSVP', {
        action: 'cancel',
        event_id: eventId,
        rsvp_id: userRSVP.id,
        event: variables.event ?? undefined,
      });
      const data = result?.data ?? result;
      if (data?.error) {
        throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rsvp', eventId, userId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-rsvps'] });
      queryClient.invalidateQueries({ queryKey: ['all-events-for-rsvp'] });
      queryClient.invalidateQueries({ queryKey: ['joyCoins', userId] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsTransactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsReservations', userId] });
    }
  });

  const isGoing = !!userRSVP;
  const attendeeCount = attendees.length;
  const attendeeNames = attendees
    .filter(a => a.user_id !== userId)
    .map(a => a.user_name)
    .slice(0, 3);

  return {
    isGoing,
    attendeeCount,
    attendeeNames,
    userRSVP,
    rsvpLoading,
    attendeesLoading,
    rsvpGoing,
    rsvpCancel
  };
}
