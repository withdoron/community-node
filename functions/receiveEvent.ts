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
    const {
      spoke_id,
      spoke_event_id,
      organization_name,
      title,
      description,
      start_date,
      end_date,
      location,
      images,
      is_free,
      price,
      event_types,
      networks,
      age_info,
      capacity,
      punch_pass_eligible,
      additional_notes,
      lat,
      lng
    } = payload;

    // Validate required fields
    if (!spoke_event_id || !title || !start_date || !location) {
      return Response.json({ error: 'Missing required fields: spoke_event_id, title, start_date, location' }, { status: 400 });
    }

    // Check if this spoke event already exists
    const existingSpokeEvents = await base44.asServiceRole.entities.SpokeEvent.filter({
      spoke_id: spoke.spoke_id,
      spoke_event_id: spoke_event_id
    });

    if (existingSpokeEvents && existingSpokeEvents.length > 0) {
      return Response.json({ error: 'Event already exists. Use PATCH to update.' }, { status: 409 });
    }

    // Create Event in Local Lane
    const eventData = {
      title,
      description: description || '',
      date: start_date,
      end_date: end_date || null,
      location,
      lat: lat || null,
      lng: lng || null,
      thumbnail_url: images && images.length > 0 ? images[0] : null,
      price: is_free ? 0 : (price || 0),
      organizer_name: organization_name || spoke.organization_name,
      event_type: event_types && event_types.length > 0 ? event_types[0] : 'community',
      network: networks && networks.length > 0 ? networks[0] : null,
      punch_pass_accepted: punch_pass_eligible || false,
      instructor_note: additional_notes || '',
      is_active: true
    };

    const event = await base44.asServiceRole.entities.Event.create(eventData);

    // Create SpokeEvent mapping
    await base44.asServiceRole.entities.SpokeEvent.create({
      spoke_id: spoke.spoke_id,
      spoke_event_id: spoke_event_id,
      local_event_id: event.id,
      last_synced_at: new Date().toISOString()
    });

    // Return event ID and URL
    const eventUrl = `${req.headers.get('origin')}/events/${event.id}`;
    
    return Response.json({
      id: event.id,
      url: eventUrl,
      message: 'Event created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error receiving event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});