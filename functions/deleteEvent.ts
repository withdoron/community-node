import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate spoke using Bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Verify API key against Spoke entity
    const spokes = await base44.asServiceRole.entities.Spoke.filter({ api_key: apiKey, is_active: true });
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }
    const spoke = spokes[0];

    // Parse request body
    const payload = await req.json();
    const { spoke_event_id } = payload;

    // Validate required fields
    if (!spoke_event_id) {
      return Response.json({ error: 'Missing required field: spoke_event_id' }, { status: 400 });
    }

    // Find the spoke event mapping
    const spokeEvents = await base44.asServiceRole.entities.SpokeEvent.filter({
      spoke_id: spoke.spoke_id,
      spoke_event_id: spoke_event_id
    });

    if (!spokeEvents || spokeEvents.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const spokeEvent = spokeEvents[0];
    const localEventId = spokeEvent.local_event_id;

    // Delete Event from Local Lane
    await base44.asServiceRole.entities.Event.delete(localEventId);

    // Delete SpokeEvent mapping
    await base44.asServiceRole.entities.SpokeEvent.delete(spokeEvent.id);

    return Response.json({
      message: 'Event deleted successfully',
      deleted_event_id: localEventId
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});