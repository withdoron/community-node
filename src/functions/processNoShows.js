/**
 * Process no-shows for events that have ended.
 *
 * This function should be called periodically (e.g., every hour via scheduler)
 * or can be triggered manually from admin panel.
 *
 * Logic:
 * 1. Find events that ended > 2 hours ago
 * 2. Find RSVPs with status 'going', checked_in: false
 * 3. Update RSVP status to 'no_show'
 * 4. Forfeit Joy Coin reservations (status: 'forfeited', resolution_type: 'noshow')
 * 5. Create forfeit transaction (amount: 0, coins already deducted)
 *
 * NOTE: This should eventually move to a server-side scheduled function.
 * For now, it can be called from admin panel or via service role.
 */

import { base44 } from '@/api/base44Client';

const GRACE_PERIOD_HOURS = 2;

export async function processNoShows() {
  const now = new Date();
  const results = {
    eventsProcessed: 0,
    rsvpsMarkedNoShow: 0,
    reservationsForfeited: 0,
    errors: []
  };

  try {
    const allEvents = await base44.entities.Event.filter({ is_active: true }, '-date', 500);

    const cutoffTime = new Date(now.getTime() - GRACE_PERIOD_HOURS * 60 * 60 * 1000);

    const endedEvents = allEvents.filter((event) => {
      const eventEnd = event.end_date
        ? new Date(event.end_date)
        : new Date(
            new Date(event.date || event.start_date).getTime() +
              (event.duration_minutes || 60) * 60 * 1000
          );
      return eventEnd < cutoffTime;
    });

    for (const event of endedEvents) {
      try {
        const rsvps = await base44.entities.RSVP.filter({
          event_id: event.id,
          status: 'going',
          is_active: true
        });

        const uncheckedRsvps = rsvps.filter((r) => !r.checked_in);

        for (const rsvp of uncheckedRsvps) {
          try {
            await base44.entities.RSVP.update(rsvp.id, {
              status: 'no_show'
            });
            results.rsvpsMarkedNoShow++;

            if (rsvp.joy_coin_reservation_id) {
              const reservations = await base44.entities.JoyCoinReservations.filter({
                id: rsvp.joy_coin_reservation_id
              });

              if (reservations.length > 0 && reservations[0].status === 'held') {
                const reservation = reservations[0];
                const resolvedAt = now.toISOString();

                await base44.entities.JoyCoinReservations.update(reservation.id, {
                  status: 'forfeited',
                  resolved_at: resolvedAt,
                  resolution_type: 'noshow'
                });

                const joyCoinsRecords = await base44.entities.JoyCoins.filter({
                  user_id: rsvp.user_id
                });

                if (joyCoinsRecords.length > 0) {
                  await base44.entities.JoyCoinTransactions.create({
                    user_id: rsvp.user_id,
                    type: 'forfeit',
                    amount: 0,
                    balance_after: joyCoinsRecords[0].balance,
                    event_id: event.id,
                    rsvp_id: rsvp.id,
                    reservation_id: reservation.id,
                    business_id: event.business_id,
                    note: `No-show: ${event.title || 'Event'}`
                  });
                }

                results.reservationsForfeited++;
              }
            }
          } catch (rsvpError) {
            results.errors.push({
              type: 'rsvp',
              rsvpId: rsvp.id,
              error: rsvpError.message
            });
          }
        }

        results.eventsProcessed++;
      } catch (eventError) {
        results.errors.push({
          type: 'event',
          eventId: event.id,
          error: eventError.message
        });
      }
    }
  } catch (error) {
    results.errors.push({
      type: 'general',
      error: error.message
    });
  }

  return results;
}

/**
 * Process no-shows for a specific event.
 * Useful for manual processing from event management UI.
 */
export async function processNoShowsForEvent(eventId) {
  const now = new Date();
  const results = {
    rsvpsMarkedNoShow: 0,
    reservationsForfeited: 0,
    errors: []
  };

  try {
    const events = await base44.entities.Event.filter({ id: eventId });
    if (events.length === 0) {
      throw new Error('Event not found');
    }
    const event = events[0];

    const eventEnd = event.end_date
      ? new Date(event.end_date)
      : new Date(
          new Date(event.date || event.start_date).getTime() +
            (event.duration_minutes || 60) * 60 * 1000
        );

    if (eventEnd > now) {
      throw new Error('Event has not ended yet');
    }

    const rsvps = await base44.entities.RSVP.filter({
      event_id: event.id,
      status: 'going',
      is_active: true
    });

    const uncheckedRsvps = rsvps.filter((r) => !r.checked_in);

    for (const rsvp of uncheckedRsvps) {
      try {
        await base44.entities.RSVP.update(rsvp.id, {
          status: 'no_show'
        });
        results.rsvpsMarkedNoShow++;

        if (rsvp.joy_coin_reservation_id) {
          const reservations = await base44.entities.JoyCoinReservations.filter({
            id: rsvp.joy_coin_reservation_id
          });

          if (reservations.length > 0 && reservations[0].status === 'held') {
            const reservation = reservations[0];

            await base44.entities.JoyCoinReservations.update(reservation.id, {
              status: 'forfeited',
              resolved_at: now.toISOString(),
              resolution_type: 'noshow'
            });

            const joyCoinsRecords = await base44.entities.JoyCoins.filter({
              user_id: rsvp.user_id
            });

            if (joyCoinsRecords.length > 0) {
              await base44.entities.JoyCoinTransactions.create({
                user_id: rsvp.user_id,
                type: 'forfeit',
                amount: 0,
                balance_after: joyCoinsRecords[0].balance,
                event_id: event.id,
                rsvp_id: rsvp.id,
                reservation_id: reservation.id,
                business_id: event.business_id,
                note: `No-show: ${event.title || 'Event'}`
              });
            }

            results.reservationsForfeited++;
          }
        }
      } catch (rsvpError) {
        results.errors.push({
          rsvpId: rsvp.id,
          error: rsvpError.message
        });
      }
    }
  } catch (error) {
    results.errors.push({ error: error.message });
  }

  return results;
}
