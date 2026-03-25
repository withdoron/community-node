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
      status,
      start_date,
      end_date,
      duration_minutes,
      is_all_day,
      location,
      is_location_tbd,
      lat,
      lng,
      is_virtual,
      virtual_url,
      virtual_platform,
      images,
      pricing_type,
      is_free,
      price,
      is_pay_what_you_wish,
      min_price,
      ticket_types,
      accepts_rsvps,
      is_recurring,
      recurring_pattern,
      recurring_days,
      recurring_end_date,
      recurring_series_id,
      event_types,
      networks,
      age_info,
      capacity,
      punch_pass_eligible,
      additional_notes,
      accessibility_features
    } = payload;

    // Validate required fields
    if (!spoke_event_id || !title || !start_date || !location) {
      return Response.json({ error: 'Missing required fields: spoke_event_id, title, start_date, location' }, { status: 400 });
    }

    // Only sync published events
    if (status && status !== 'published') {
      return Response.json({ error: 'Only published events can be synced to Local Lane Hub' }, { status: 400 });
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
      status: status || 'published',
      date: start_date,
      end_date: end_date || null,
      duration_minutes: duration_minutes || null,
      is_all_day: is_all_day || false,
      location,
      is_location_tbd: is_location_tbd || false,
      lat: lat || null,
      lng: lng || null,
      is_virtual: is_virtual || false,
      virtual_url: virtual_url || null,
      virtual_platform: virtual_platform || null,
      thumbnail_url: images && images.length > 0 ? images[0] : null,
      pricing_type: pricing_type || (is_free ? 'free' : 'single_price'),
      price: is_free ? 0 : (price || 0),
      is_pay_what_you_wish: is_pay_what_you_wish || false,
      min_price: min_price || null,
      ticket_types: ticket_types || [],
      accepts_rsvps: accepts_rsvps || false,
      is_recurring: is_recurring || false,
      recurring_pattern: recurring_pattern || null,
      recurring_days: recurring_days || [],
      recurring_end_date: recurring_end_date || null,
      recurring_series_id: recurring_series_id || null,
      organizer_name: organization_name || spoke.organization_name,
      event_type: event_types && event_types.length > 0 ? event_types[0] : 'community',
      network: networks && networks.length > 0 ? networks[0] : null,
      punch_pass_accepted: punch_pass_eligible || false,
      accessibility_features: accessibility_features || [],
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