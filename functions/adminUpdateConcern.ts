import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { concern_id, updates } = await req.json();

    if (!concern_id) {
      return Response.json({ error: 'concern_id is required' }, { status: 400 });
    }

    const ALLOWED_FIELDS = ['status', 'admin_notes', 'resolved_date'];
    const safeUpdates = {};
    for (const field of ALLOWED_FIELDS) {
      if (updates && field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    const updated = await base44.asServiceRole.entities.Concern.update(concern_id, safeUpdates);

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});