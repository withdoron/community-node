// Event cancellation handler — refunds Joy Coins and notifies RSVP'd users
// Migrated from PunchPass to JoyCoins entities (DEC-041, 2026-02-07)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event: triggerEvent, data: eventData } = await req.json();
    
    if (!eventData || eventData.status !== 'cancelled') {
      return Response.json({ message: 'Event not cancelled, no action needed' });
    }

    const eventId = triggerEvent.entity_id;
    console.log(`Processing cancellation for event: ${eventId}`);

    // 1. Find Joy Coin reservations for this event
    const reservations = await base44.asServiceRole.entities.JoyCoinReservations.filter({ 
      event_id: eventId,
      status: 'held'
    });

    console.log(`Found ${reservations.length} Joy Coin reservations to refund`);

    for (const reservation of reservations) {
      try {
        // Get the user's Joy Coins balance
        const joyCoinsRecords = await base44.asServiceRole.entities.JoyCoins.filter({ user_id: reservation.user_id });
        const joyCoins = joyCoinsRecords[0];
        
        if (joyCoins) {
          const newBalance = joyCoins.balance + reservation.amount;

          // Refund the coins
          await base44.asServiceRole.entities.JoyCoins.update(joyCoins.id, {
            balance: newBalance
          });

          // Mark reservation as refunded
          await base44.asServiceRole.entities.JoyCoinReservations.update(reservation.id, {
            status: 'refunded',
            resolved_at: new Date().toISOString(),
            resolution_type: 'event_cancelled'
          });

          // Create refund transaction record
          await base44.asServiceRole.entities.JoyCoinTransactions.create({
            user_id: reservation.user_id,
            type: 'refund',
            amount: reservation.amount,
            balance_after: newBalance,
            event_id: eventId,
            reservation_id: reservation.id,
            note: `Event cancelled: ${eventData.title}`
          });
          
          console.log(`Refunded ${reservation.amount} Joy Coins to user ${reservation.user_id}`);
        }
      } catch (error) {
        console.error(`Error refunding Joy Coins for user ${reservation.user_id}:`, error);
      }
    }

    // 2. Send cancellation notifications
    const rsvps = await base44.asServiceRole.entities.RSVP.filter({ 
      event_id: eventId,
      status: 'confirmed'
    });

    console.log(`Found ${rsvps.length} RSVPs to notify`);

    for (const rsvp of rsvps) {
      try {
        const wasRefunded = reservations.some(r => r.user_id === rsvp.user_id);

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rsvp.user_email,
          subject: `Event Cancelled: ${eventData.title}`,
          body: `
            <h2>Event Cancellation Notice</h2>
            <p>Dear ${rsvp.user_name || 'Guest'},</p>
            <p>We regret to inform you that the following event has been cancelled:</p>
            <h3>${eventData.title}</h3>
            <p><strong>Date:</strong> ${new Date(eventData.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}</p>
            <p><strong>Location:</strong> ${eventData.location}</p>
            ${wasRefunded ? '<p><strong>Note:</strong> Your Joy Coins have been automatically refunded.</p>' : ''}
            <p>We apologize for any inconvenience.</p>
            <p>Best regards,<br/>The LocalLane Team</p>
          `
        });

        await base44.asServiceRole.entities.RSVP.update(rsvp.id, {
          status: 'cancelled'
        });

        console.log(`Sent cancellation email to ${rsvp.user_email}`);
      } catch (error) {
        console.error(`Error sending email to ${rsvp.user_email}:`, error);
      }
    }

    return Response.json({ 
      message: 'Event cancellation processed',
      refunded_reservations: reservations.length,
      notified_users: rsvps.length
    });

  } catch (error) {
    console.error('Error handling event cancellation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
