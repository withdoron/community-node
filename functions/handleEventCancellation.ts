import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is triggered by automation when an event status changes to 'cancelled'
    const { event: triggerEvent, data: eventData } = await req.json();
    
    if (!eventData || eventData.status !== 'cancelled') {
      return Response.json({ message: 'Event not cancelled, no action needed' });
    }

    const eventId = triggerEvent.entity_id;
    console.log(`Processing cancellation for event: ${eventId}`);

    // 1. Refund punch passes
    const punchPassUsages = await base44.asServiceRole.entities.PunchPassUsage.filter({ 
      event_id: eventId 
    });

    console.log(`Found ${punchPassUsages.length} punch pass usages to refund`);

    for (const usage of punchPassUsages) {
      try {
        // Get the user's punch pass
        const punchPass = await base44.asServiceRole.entities.PunchPass.get(usage.punch_pass_id);
        
        if (punchPass) {
          // Refund the punches
          await base44.asServiceRole.entities.PunchPass.update(usage.punch_pass_id, {
            current_balance: punchPass.current_balance + usage.punches_deducted,
            total_used: punchPass.total_used - usage.punches_deducted
          });

          // Mark the usage as refunded by deleting or updating it
          await base44.asServiceRole.entities.PunchPassUsage.delete(usage.id);
          
          console.log(`Refunded ${usage.punches_deducted} punches to user ${usage.user_id}`);
        }
      } catch (error) {
        console.error(`Error refunding punch pass for user ${usage.user_id}:`, error);
      }
    }

    // 2. Send cancellation notifications to all RSVP'd users
    const rsvps = await base44.asServiceRole.entities.RSVP.filter({ 
      event_id: eventId,
      status: 'confirmed'
    });

    console.log(`Found ${rsvps.length} RSVPs to notify`);

    for (const rsvp of rsvps) {
      try {
        // Send cancellation email
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
            ${punchPassUsages.some(u => u.user_id === rsvp.user_id) ? 
              '<p><strong>Note:</strong> Your punch pass has been automatically refunded.</p>' : ''}
            <p>We apologize for any inconvenience this may cause.</p>
            <p>Best regards,<br/>Local Lane Team</p>
          `
        });

        // Update RSVP status
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
      refunded_punches: punchPassUsages.length,
      notified_users: rsvps.length
    });

  } catch (error) {
    console.error('Error handling event cancellation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});