// Event entity writes via service role — DEC-025 Phase 3b
// Client-facing create, update, delete (soft), cancel with authorization.
// (Spoke webhook uses updateEvent.ts.)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function canEditEvent(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  user: { id: string; role?: string },
  businessId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;

  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business) return false;
  if (business.owner_user_id === user.id) return true;

  const instructors = business.instructors || [];
  return instructors.includes(user.id);
}

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

    const { action, event_id, business_id, data } = body;
    const eventEntity = base44.asServiceRole.entities.Event;

    let resolvedBusinessId: string | null = null;

    if (action === 'create') {
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for create' }, { status: 400 });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for create' }, { status: 400 });
      }
      resolvedBusinessId = business_id;
    } else if (action === 'update' || action === 'delete' || action === 'cancel') {
      if (!event_id || typeof event_id !== 'string') {
        return Response.json({ error: 'event_id is required' }, { status: 400 });
      }
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required' }, { status: 400 });
      }
      const event = await eventEntity.get(event_id);
      if (!event) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
      }
      resolvedBusinessId = (event as { business_id?: string }).business_id || business_id;
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const allowed = await canEditEvent(base44, user, resolvedBusinessId);
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'create') {
      const created = await eventEntity.create(data as Record<string, unknown>);
      return Response.json(created);
    }

    if (action === 'update') {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for update' }, { status: 400 });
      }
      const updated = await eventEntity.update(event_id as string, data as Record<string, unknown>);
      return Response.json(updated);
    }

    if (action === 'delete') {
      const updated = await eventEntity.update(event_id as string, { is_active: false });
      return Response.json(updated);
    }

    if (action === 'cancel') {
      const updated = await eventEntity.update(event_id as string, {
        status: 'cancelled',
        is_active: false,
      });
      return Response.json(updated);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageEvent error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
