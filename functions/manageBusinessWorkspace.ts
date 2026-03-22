// Business workspace management via service role — bypasses entity-level RLS.
// Handles cascade delete operations.
// Owner/admin gate: delete requires the caller to own the business or be admin.
// Mirrors manageFinanceWorkspace.ts / managePMWorkspace.ts fractal pattern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isBusinessOwnerOrAdmin(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  userRole: string,
  businessId: string
): Promise<boolean> {
  if (userRole === 'admin') return true;
  try {
    const business = await base44.asServiceRole.entities.Business.get(businessId);
    return !!business && business.owner_user_id === userId;
  } catch {
    return false;
  }
}

// Helper: filter + safe array
async function safeFilter(
  entity: { filter: (q: Record<string, unknown>) => Promise<unknown> },
  query: Record<string, unknown>
): Promise<Array<Record<string, unknown>>> {
  const result = await entity.filter(query);
  return Array.isArray(result) ? result : [];
}

// Helper: delete all records in a list, return count
async function deleteAll(
  entity: { delete: (id: string) => Promise<unknown> },
  records: Array<Record<string, unknown>>
): Promise<number> {
  let count = 0;
  for (const r of records) {
    await entity.delete(r.id as string);
    count++;
  }
  return count;
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

    const { action, business_id } = body;

    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }
    if (!business_id || typeof business_id !== 'string') {
      return Response.json({ error: 'business_id is required' }, { status: 400 });
    }

    // Gate: caller must own this business or be admin
    const canDelete = await isBusinessOwnerOrAdmin(base44, user.id, user.role || '', business_id as string);
    if (!canDelete) {
      return Response.json({ error: 'You do not have access to this workspace' }, { status: 403 });
    }

    const entities = base44.asServiceRole.entities;

    // ── delete_workspace_cascade ──────────────────────────────────────
    if (action === 'delete_workspace_cascade') {
      const bid = business_id as string;
      const deleted: Record<string, number> = {};

      try {
        // Delete in dependency order (children first)

        // 1. AccessWindows
        const accessWindows = await safeFilter(entities.AccessWindow, { business_id: bid });
        deleted.access_windows = await deleteAll(entities.AccessWindow, accessWindows);

        // 2. Locations
        const locations = await safeFilter(entities.Location, { business_id: bid });
        deleted.locations = await deleteAll(entities.Location, locations);

        // 3. Events (including RSVPs and reservations for each event)
        const events = await safeFilter(entities.Event, { business_id: bid });
        let totalRsvps = 0;
        let totalReservations = 0;
        for (const event of events) {
          const eid = event.id as string;
          // RSVPs
          const rsvps = await safeFilter(entities.RSVP, { event_id: eid });
          totalRsvps += await deleteAll(entities.RSVP, rsvps);
          // Joy Coin Reservations
          const reservations = await safeFilter(entities.JoyCoinReservation, { event_id: eid });
          totalReservations += await deleteAll(entities.JoyCoinReservation, reservations);
        }
        deleted.rsvps = totalRsvps;
        deleted.joy_coin_reservations = totalReservations;
        deleted.events = await deleteAll(entities.Event, events);

        // 4. Recommendations tied to this business
        const recommendations = await safeFilter(entities.Recommendation, { business_id: bid });
        deleted.recommendations = await deleteAll(entities.Recommendation, recommendations);

        // 5. SpokeEvents (spoke sync mappings)
        const spokeEvents = await safeFilter(entities.SpokeEvent, { business_id: bid });
        deleted.spoke_events = await deleteAll(entities.SpokeEvent, spokeEvents);

        // 6. Staff invites and roles (AdminSettings key-value records)
        const staffInvites = await safeFilter(entities.AdminSettings, { key: `staff_invites:${bid}` });
        deleted.staff_invites = await deleteAll(entities.AdminSettings, staffInvites);

        const staffRoles = await safeFilter(entities.AdminSettings, { key: `staff_roles:${bid}` });
        deleted.staff_roles = await deleteAll(entities.AdminSettings, staffRoles);

        // 7. Business record itself
        await entities.Business.delete(bid);
        deleted.business = 1;

        return Response.json({ success: true, deleted_counts: deleted });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('delete_workspace_cascade error:', message);
        return Response.json({
          error: 'Failed to delete workspace completely. Some data may have been removed.',
          deleted_so_far: deleted,
        }, { status: 500 });
      }
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageBusinessWorkspace error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
