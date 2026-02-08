// RSVP lifecycle + Joy Coin orchestration — DEC-025 Phase 3d
// Handles rsvp, cancel, checkin, no_show across RSVP, JoyCoins, JoyCoinReservations, JoyCoinTransactions.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getRefundEligibility(event: { date?: string; start_date?: string; refund_policy?: string } | null): boolean {
  if (!event) return false;
  const now = new Date();
  const eventStart = new Date((event.date || event.start_date) as string);
  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

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

async function canManageEvent(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  user: { id: string; role?: string },
  businessId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;
  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business) return false;
  if ((business as { owner_user_id?: string }).owner_user_id === user.id) return true;
  const instructors = (business as { instructors?: string[] }).instructors || [];
  return instructors.includes(user.id);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action, event_id, rsvp_id, party_size: rawPartySize, party_composition, event: eventPayload } = body;
    const Event = base44.asServiceRole.entities.Event;
    const RSVP = base44.asServiceRole.entities.RSVP;
    const JoyCoins = base44.asServiceRole.entities.JoyCoins;
    const JoyCoinReservations = base44.asServiceRole.entities.JoyCoinReservations;
    const JoyCoinTransactions = base44.asServiceRole.entities.JoyCoinTransactions;

    if (action === 'rsvp') {
      if (!event_id || typeof event_id !== 'string') {
        return Response.json({ error: 'event_id is required for rsvp' }, { status: 400 });
      }

      const event = await Event.get(event_id);
      if (!event) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
      }

      const ev = event as { joy_coin_cost?: number; joy_coin_enabled?: boolean; max_party_size?: number };
      const maxParty = ev.max_party_size != null ? ev.max_party_size : 10;
      const partySize = Math.max(1, Math.min(Number(rawPartySize) || 1, maxParty));
      const joyCoinCost = ev.joy_coin_cost ?? 0;
      const isJoyCoinEvent = ev.joy_coin_enabled && joyCoinCost > 0;
      const joyCoinTotal = isJoyCoinEvent ? partySize * joyCoinCost : 0;

      if (isJoyCoinEvent && joyCoinTotal > 0) {
        const joyCoinsRecords = await JoyCoins.filter({ user_id: user.id });
        const joyCoins = joyCoinsRecords[0];
        if (!joyCoins || ((joyCoins as { balance?: number }).balance ?? 0) < joyCoinTotal) {
          return Response.json({ error: 'INSUFFICIENT_JOY_COINS' }, { status: 400 });
        }
      }

      const existingList = await RSVP.filter({ event_id, user_id: user.id });
      const existing = existingList[0];

      if (existing) {
        await RSVP.update((existing as { id: string }).id, {
          status: 'going',
          is_active: true,
        });
        return Response.json({ success: true, rsvp_id: (existing as { id: string }).id });
      }

      const rsvpPayload: Record<string, unknown> = {
        event_id,
        user_id: user.id,
        user_name: (user.full_name as string) || (user.email as string) || '',
        status: 'going',
        is_active: true,
        created_date: new Date().toISOString(),
      };
      if (isJoyCoinEvent) {
        rsvpPayload.party_size = partySize;
        rsvpPayload.joy_coin_total = joyCoinTotal;
      }
      if (party_composition && Array.isArray(party_composition) && party_composition.length > 0) {
        rsvpPayload.party_composition = party_composition;
      }

      const rsvp = await RSVP.create(rsvpPayload) as { id: string };

      if (isJoyCoinEvent && joyCoinTotal > 0) {
        const reservation = await JoyCoinReservations.create({
          user_id: user.id,
          event_id,
          rsvp_id: rsvp.id,
          amount: joyCoinTotal,
          status: 'held',
          held_at: new Date().toISOString(),
        }) as { id: string };

        await RSVP.update(rsvp.id, { joy_coin_reservation_id: reservation.id });

        const joyCoinsRecords = await JoyCoins.filter({ user_id: user.id });
        const joyCoinsRecord = joyCoinsRecords[0] as { id: string; balance?: number; lifetime_spent?: number };
        const newBalance = Math.max(0, (joyCoinsRecord?.balance ?? 0) - joyCoinTotal);

        await JoyCoinTransactions.create({
          user_id: user.id,
          type: 'reservation',
          amount: -joyCoinTotal,
          balance_after: newBalance,
          event_id,
          rsvp_id: rsvp.id,
          reservation_id: reservation.id,
        });

        await JoyCoins.update(joyCoinsRecord.id, {
          balance: newBalance,
          lifetime_spent: (joyCoinsRecord?.lifetime_spent ?? 0) + joyCoinTotal,
        });
      }

      return Response.json({ success: true, rsvp_id: rsvp.id });
    }

    if (action === 'cancel') {
      if (!event_id || !rsvp_id || typeof rsvp_id !== 'string') {
        return Response.json({ error: 'event_id and rsvp_id are required for cancel' }, { status: 400 });
      }

      const rsvp = await RSVP.get(rsvp_id) as { user_id?: string; joy_coin_reservation_id?: string; joy_coin_total?: number } | null;
      if (!rsvp) {
        return Response.json({ error: 'RSVP not found' }, { status: 404 });
      }
      if (rsvp.user_id !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const reservationId = rsvp.joy_coin_reservation_id;
      const joyCoinTotal = rsvp.joy_coin_total ?? 0;
      const hasJoyCoinReservation = !!reservationId && joyCoinTotal > 0;

      let event = eventPayload as { date?: string; start_date?: string; refund_policy?: string } | null;
      if (!event && event_id) {
        event = await Event.get(event_id) as { date?: string; start_date?: string; refund_policy?: string } | null;
      }

      let refunded = false;
      if (hasJoyCoinReservation && event) {
        const reservationRecords = await JoyCoinReservations.filter({ id: reservationId });
        const reservation = reservationRecords[0] as { id: string; status?: string } | undefined;
        if (reservation && reservation.status === 'held') {
          const willRefund = getRefundEligibility(event);
          refunded = willRefund;
          const now = new Date().toISOString();

          if (willRefund) {
            await JoyCoinReservations.update(reservationId, {
              status: 'refunded',
              resolved_at: now,
              resolution_type: 'cancel_refund',
            });

            const joyCoinsRecords = await JoyCoins.filter({ user_id: user.id });
            const joyCoinsRecord = joyCoinsRecords[0] as { id: string; balance?: number; lifetime_spent?: number };
            const newBalance = (joyCoinsRecord?.balance ?? 0) + joyCoinTotal;

            await JoyCoinTransactions.create({
              user_id: user.id,
              type: 'refund',
              amount: joyCoinTotal,
              balance_after: newBalance,
              event_id,
              rsvp_id,
              reservation_id: reservationId,
              note: 'RSVP cancelled within refund window',
            });

            await JoyCoins.update(joyCoinsRecord.id, {
              balance: newBalance,
              lifetime_spent: Math.max(0, (joyCoinsRecord?.lifetime_spent ?? 0) - joyCoinTotal),
            });
          } else {
            await JoyCoinReservations.update(reservationId, {
              status: 'forfeited',
              resolved_at: now,
              resolution_type: 'cancel_forfeit',
            });

            const joyCoinsForForfeit = await JoyCoins.filter({ user_id: user.id });
            const currentBalance = (joyCoinsForForfeit[0] as { balance?: number })?.balance ?? 0;

            await JoyCoinTransactions.create({
              user_id: user.id,
              type: 'forfeit',
              amount: 0,
              balance_after: currentBalance,
              event_id,
              rsvp_id,
              reservation_id: reservationId,
              note: 'RSVP cancelled outside refund window',
            });
          }
        }
      }

      await RSVP.update(rsvp_id, { status: 'cancelled', is_active: false });
      return Response.json({ success: true, refunded });
    }

    if (action === 'checkin') {
      if (!event_id || !rsvp_id || typeof rsvp_id !== 'string') {
        return Response.json({ error: 'event_id and rsvp_id are required for checkin' }, { status: 400 });
      }

      const rsvp = await RSVP.get(rsvp_id) as { user_id?: string; joy_coin_reservation_id?: string } | null;
      if (!rsvp) {
        return Response.json({ error: 'RSVP not found' }, { status: 404 });
      }

      const event = await Event.get(event_id) as { business_id?: string } | null;
      if (!event?.business_id) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
      }

      const allowed = await canManageEvent(base44, user, event.business_id);
      if (!allowed) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const now = new Date().toISOString();
      await RSVP.update(rsvp_id, {
        checked_in: true,
        checked_in_at: now,
        checked_in_by: 'staff',
      });

      if (rsvp.joy_coin_reservation_id) {
        const reservationRecords = await JoyCoinReservations.filter({ id: rsvp.joy_coin_reservation_id });
        const reservation = reservationRecords[0] as { id: string; status?: string; amount?: number } | undefined;
        if (reservation && reservation.status === 'held') {
          await JoyCoinReservations.update(reservation.id, {
            status: 'redeemed',
            resolved_at: now,
            resolution_type: 'checkin',
          });

          const joyCoinsRecords = await JoyCoins.filter({ user_id: rsvp.user_id });
          if (joyCoinsRecords.length > 0) {
            const joyCoins = joyCoinsRecords[0] as { id: string; balance?: number };
            await JoyCoinTransactions.create({
              user_id: rsvp.user_id,
              type: 'redemption',
              amount: 0,
              balance_after: joyCoins.balance ?? 0,
              event_id,
              rsvp_id,
              reservation_id: reservation.id,
              business_id: event.business_id,
            });

            await JoyCoins.update(joyCoins.id, {
              lifetime_spent: ((joyCoins as { lifetime_spent?: number }).lifetime_spent ?? 0) + (reservation.amount ?? 0),
            });
          }
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'no_show') {
      if (!event_id || !rsvp_id || typeof rsvp_id !== 'string') {
        return Response.json({ error: 'event_id and rsvp_id are required for no_show' }, { status: 400 });
      }

      const rsvp = await RSVP.get(rsvp_id) as { user_id?: string; joy_coin_reservation_id?: string } | null;
      if (!rsvp) {
        return Response.json({ error: 'RSVP not found' }, { status: 404 });
      }

      const event = await Event.get(event_id) as { business_id?: string } | null;
      if (!event?.business_id) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
      }

      const allowed = await canManageEvent(base44, user, event.business_id);
      if (!allowed) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      await RSVP.update(rsvp_id, { status: 'no_show' });

      if (rsvp.joy_coin_reservation_id) {
        const reservationRecords = await JoyCoinReservations.filter({ id: rsvp.joy_coin_reservation_id });
        const reservation = reservationRecords[0] as { id: string; status?: string } | undefined;
        if (reservation && reservation.status === 'held') {
          const resolvedAt = new Date().toISOString();
          await JoyCoinReservations.update(reservation.id, {
            status: 'forfeited',
            resolved_at: resolvedAt,
            resolution_type: 'noshow',
          });

          const joyCoinsRecords = await JoyCoins.filter({ user_id: rsvp.user_id });
          if (joyCoinsRecords.length > 0) {
            const currentBalance = (joyCoinsRecords[0] as { balance?: number }).balance ?? 0;
            await JoyCoinTransactions.create({
              user_id: rsvp.user_id,
              type: 'forfeit',
              amount: 0,
              balance_after: currentBalance,
              event_id,
              rsvp_id,
              reservation_id: reservation.id,
              business_id: event.business_id,
              note: 'No-show',
            });
          }
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageRSVP error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
