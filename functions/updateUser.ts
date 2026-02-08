// User profile updates via service role — DEC-025 Phase 3c
// Only allows updating own profile with allowlisted fields.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWED_PROFILE_FIELDS = ['display_name', 'phone', 'home_region'];

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

    const { action, data } = body;

    if (action !== 'update_profile') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Response.json({ error: 'data object is required for update_profile' }, { status: 400 });
    }

    const allowed: Record<string, unknown> = {};
    for (const key of Object.keys(data as Record<string, unknown>)) {
      if (ALLOWED_PROFILE_FIELDS.includes(key)) {
        allowed[key] = (data as Record<string, unknown>)[key];
      }
    }

    const existing = await base44.asServiceRole.entities.User.get(user.id);
    const existingData = (existing as { data?: Record<string, unknown> })?.data || {};
    const mergedData = { ...existingData, ...allowed };

    await base44.asServiceRole.entities.User.update(user.id, {
      data: mergedData,
    });

    const updated = await base44.asServiceRole.entities.User.get(user.id);
    return Response.json(updated);
  } catch (error) {
    console.error('updateUser error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
