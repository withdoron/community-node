import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { hmac } from 'npm:@noble/hashes@1.3.3/hmac';
import { sha256 } from 'npm:@noble/hashes@1.3.3/sha256';

/**
 * Utility function to send webhooks to spoke apps
 * Call this from other functions when events occur (RSVP, cancellations, etc.)
 */

async function generateSignature(payload, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = encoder.encode(secret);
  const signature = hmac(sha256, key, data);
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by other backend functions or automations
    // Payload should include: spoke_id, event_type, local_event_id, data
    const payload = await req.json();
    const { spoke_id, event_type, local_event_id, rsvp_count, data } = payload;

    if (!spoke_id || !event_type || !local_event_id) {
      return Response.json({ error: 'Missing required fields: spoke_id, event_type, local_event_id' }, { status: 400 });
    }

    // Get spoke information
    const spokes = await base44.asServiceRole.entities.Spoke.filter({ spoke_id, is_active: true });
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Spoke not found' }, { status: 404 });
    }
    const spoke = spokes[0];

    if (!spoke.webhook_url) {
      return Response.json({ error: 'Spoke has no webhook URL configured' }, { status: 400 });
    }

    // Get spoke event mapping to find spoke_event_id
    const spokeEvents = await base44.asServiceRole.entities.SpokeEvent.filter({
      spoke_id: spoke_id,
      local_event_id: local_event_id
    });

    if (!spokeEvents || spokeEvents.length === 0) {
      return Response.json({ error: 'Event not found in spoke mapping' }, { status: 404 });
    }
    const spokeEvent = spokeEvents[0];

    // Build webhook payload
    const webhookPayload = {
      event_type,
      event_id: local_event_id,
      spoke_event_id: spokeEvent.spoke_event_id,
      rsvp_count: rsvp_count || 0,
      data: data || {}
    };

    // Generate signature
    const signature = await generateSignature(webhookPayload, spoke.webhook_secret || '');

    // Send webhook to spoke
    const webhookResponse = await fetch(spoke.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-locallane-signature': signature
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      console.error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
      return Response.json({
        error: 'Webhook delivery failed',
        status: webhookResponse.status,
        message: await webhookResponse.text()
      }, { status: 500 });
    }

    return Response.json({
      message: 'Webhook sent successfully',
      spoke_id,
      event_type
    });

  } catch (error) {
    console.error('Error sending webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});