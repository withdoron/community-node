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
      spoke_event_id,
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
    if (!spoke_event_id) {
      return Response.json({ error: 'Missing required field: spoke_event_id' }, { status: 400 });
    }

    // Find the spoke event mapping
    const spokeEvents = await base44.asServiceRole.entities.SpokeEvent.filter({
      spoke_id: spoke.spoke_id,
      spoke_event_id: spoke_event_id
    });

    if (!spokeEvents || spokeEvents.length === 0) {
      return Response.json({ error: 'Event not found. Create it first with POST.' }, { status: 404 });
    }

    const spokeEvent = spokeEvents[0];
    const localEventId = spokeEvent.local_event_id;

    // Build update data (only include provided fields)
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (is_all_day !== undefined) updateData.is_all_day = is_all_day;
    if (location !== undefined) updateData.location = location;
    if (is_location_tbd !== undefined) updateData.is_location_tbd = is_location_tbd;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (is_virtual !== undefined) updateData.is_virtual = is_virtual;
    if (virtual_url !== undefined) updateData.virtual_url = virtual_url;
    if (virtual_platform !== undefined) updateData.virtual_platform = virtual_platform;
    if (images !== undefined && images.length > 0) updateData.thumbnail_url = images[0];
    if (pricing_type !== undefined) updateData.pricing_type = pricing_type;
    if (is_free !== undefined || price !== undefined) {
      updateData.price = is_free ? 0 : (price || 0);
    }
    if (is_pay_what_you_wish !== undefined) updateData.is_pay_what_you_wish = is_pay_what_you_wish;
    if (min_price !== undefined) updateData.min_price = min_price;
    if (ticket_types !== undefined) updateData.ticket_types = ticket_types;
    if (accepts_rsvps !== undefined) updateData.accepts_rsvps = accepts_rsvps;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurring_pattern !== undefined) updateData.recurring_pattern = recurring_pattern;
    if (recurring_days !== undefined) updateData.recurring_days = recurring_days;
    if (recurring_end_date !== undefined) updateData.recurring_end_date = recurring_end_date;
    if (recurring_series_id !== undefined) updateData.recurring_series_id = recurring_series_id;
    if (event_types !== undefined && event_types.length > 0) updateData.event_type = event_types[0];
    if (networks !== undefined && networks.length > 0) updateData.network = networks[0];
    if (punch_pass_eligible !== undefined) updateData.punch_pass_accepted = punch_pass_eligible;
    if (accessibility_features !== undefined) updateData.accessibility_features = accessibility_features;
    if (additional_notes !== undefined) updateData.instructor_note = additional_notes;

    // Update Event in Local Lane
    const updatedEvent = await base44.asServiceRole.entities.Event.update(localEventId, updateData);

    // Update last_synced_at
    await base44.asServiceRole.entities.SpokeEvent.update(spokeEvent.id, {
      last_synced_at: new Date().toISOString()
    });

    // Return event ID and URL
    const eventUrl = `${req.headers.get('origin')}/events/${updatedEvent.id}`;
    
    return Response.json({
      id: updatedEvent.id,
      url: eventUrl,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});