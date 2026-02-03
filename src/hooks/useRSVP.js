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

  // RSVP "I'm Going"
  // NOTE: For Joy Coin events, coin deduction and reservation creation should migrate to a
  // service role function for atomicity. See JOY-COINS-SPEC.md §2.1 RSVP + Reservation Flow.
  const rsvpGoing = useMutation({
    mutationFn: async (variables = {}) => {
      const event = variables.event || null;
      const isJoyCoinEvent = event?.joy_coin_enabled && (event?.joy_coin_cost ?? 0) > 0;
      const partySize = 1;
      const joyCoinTotal = isJoyCoinEvent ? partySize * (event.joy_coin_cost || 0) : 0;

      if (isJoyCoinEvent && joyCoinTotal > 0) {
        const joyCoinsRecords = await base44.entities.JoyCoins.filter({ user_id: userId });
        const joyCoins = joyCoinsRecords[0];
        if (!joyCoins || (joyCoins.balance ?? 0) < joyCoinTotal) {
          throw new Error('INSUFFICIENT_JOY_COINS');
        }
      }

      const existing = await base44.entities.RSVP.filter({
        event_id: eventId,
        user_id: userId
      });

      if (existing.length > 0) {
        await base44.entities.RSVP.update(existing[0].id, {
          status: 'going',
          is_active: true
        });
      } else {
        const rsvpPayload = {
          event_id: eventId,
          user_id: userId,
          user_name: currentUser.full_name || currentUser.email,
          status: 'going',
          is_active: true,
          created_date: new Date().toISOString()
        };
        if (isJoyCoinEvent) {
          rsvpPayload.party_size = partySize;
          rsvpPayload.joy_coin_total = joyCoinTotal;
        }

        const rsvp = await base44.entities.RSVP.create(rsvpPayload);

        if (isJoyCoinEvent && joyCoinTotal > 0) {
          const reservation = await base44.entities.JoyCoinReservations.create({
            user_id: userId,
            event_id: eventId,
            rsvp_id: rsvp.id,
            amount: joyCoinTotal,
            status: 'held',
            held_at: new Date().toISOString()
          });

          await base44.entities.RSVP.update(rsvp.id, {
            joy_coin_reservation_id: reservation.id
          });

          const joyCoinsRecords = await base44.entities.JoyCoins.filter({ user_id: userId });
          const joyCoinsRecord = joyCoinsRecords[0];
          const newBalance = Math.max(0, (joyCoinsRecord?.balance ?? 0) - joyCoinTotal);

          await base44.entities.JoyCoinTransactions.create({
            user_id: userId,
            type: 'reservation',
            amount: -joyCoinTotal,
            balance_after: newBalance,
            event_id: eventId,
            rsvp_id: rsvp.id,
            reservation_id: reservation.id
          });

          await base44.entities.JoyCoins.update(joyCoinsRecord.id, {
            balance: newBalance,
            lifetime_spent: (joyCoinsRecord?.lifetime_spent ?? 0) + joyCoinTotal
          });
        }
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

  // Cancel RSVP
  // NOTE: Joy Coin refund/forfeit logic should migrate to a service role function for atomicity.
  const rsvpCancel = useMutation({
    mutationFn: async (variables = {}) => {
      if (!userRSVP) return;

      let event = variables.event || null;
      if (!event && eventId) {
        const events = await base44.entities.Event.filter({ id: eventId });
        event = events[0] || null;
      }
      const reservationId = userRSVP.joy_coin_reservation_id;
      const joyCoinTotal = userRSVP.joy_coin_total ?? 0;
      const hasJoyCoinReservation = !!reservationId && joyCoinTotal > 0;

      if (hasJoyCoinReservation && event) {
        const reservationRecords = await base44.entities.JoyCoinReservations.filter({ id: reservationId });
        const reservation = reservationRecords[0];
        if (!reservation || reservation.status !== 'held') {
          // Reservation already resolved, just cancel RSVP
        } else {
          const willRefund = getRefundEligibility(event);
          const now = new Date().toISOString();

          if (willRefund) {
            await base44.entities.JoyCoinReservations.update(reservationId, {
              status: 'refunded',
              resolved_at: now,
              resolution_type: 'cancel_refund'
            });

            const joyCoinsRecords = await base44.entities.JoyCoins.filter({ user_id: userId });
            const joyCoinsRecord = joyCoinsRecords[0];
            const newBalance = (joyCoinsRecord?.balance ?? 0) + joyCoinTotal;

            await base44.entities.JoyCoinTransactions.create({
              user_id: userId,
              type: 'refund',
              amount: joyCoinTotal,
              balance_after: newBalance,
              event_id: eventId,
              rsvp_id: userRSVP.id,
              reservation_id: reservationId,
              note: 'RSVP cancelled within refund window'
            });

            await base44.entities.JoyCoins.update(joyCoinsRecord.id, {
              balance: newBalance,
              lifetime_spent: Math.max(0, (joyCoinsRecord?.lifetime_spent ?? 0) - joyCoinTotal)
            });
          } else {
            await base44.entities.JoyCoinReservations.update(reservationId, {
              status: 'forfeited',
              resolved_at: now,
              resolution_type: 'cancel_forfeit'
            });

            const joyCoinsForForfeit = await base44.entities.JoyCoins.filter({ user_id: userId });
            const currentBalance = joyCoinsForForfeit[0]?.balance ?? 0;

            await base44.entities.JoyCoinTransactions.create({
              user_id: userId,
              type: 'forfeit',
              amount: 0,
              balance_after: currentBalance,
              event_id: eventId,
              rsvp_id: userRSVP.id,
              reservation_id: reservationId,
              note: 'RSVP cancelled outside refund window'
            });
          }
        }
      }

      await base44.entities.RSVP.update(userRSVP.id, {
        status: 'cancelled',
        is_active: false
      });
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
