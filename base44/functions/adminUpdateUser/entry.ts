import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_id, updates } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const ALLOWED_FIELDS = ['status', 'tier', 'admin_notes'];
    const safeUpdates = {};
    for (const field of ALLOWED_FIELDS) {
      if (updates && field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    const updated = await base44.asServiceRole.entities.User.update(user_id, safeUpdates);

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});