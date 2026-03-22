// Field Service workspace management via service role — bypasses entity-level RLS.
// Handles cascade delete operations.
// Owner-only gate: all actions require the caller to own the FS workspace profile.
// Mirrors manageFinanceWorkspace.ts fractal pattern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isFSOwner(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  profileId: string
): Promise<boolean> {
  try {
    const profile = await base44.asServiceRole.entities.FieldServiceProfile.get(profileId);
    return !!profile && profile.user_id === userId;
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

    const { action, profile_id } = body;

    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }
    if (!profile_id || typeof profile_id !== 'string') {
      return Response.json({ error: 'profile_id is required' }, { status: 400 });
    }

    // Gate: caller must own this workspace
    const isOwner = await isFSOwner(base44, user.id, profile_id as string);
    if (!isOwner) {
      return Response.json({ error: 'You do not have access to this workspace' }, { status: 403 });
    }

    const entities = base44.asServiceRole.entities;

    // ── delete_workspace_cascade ──────────────────────────────────────
    if (action === 'delete_workspace_cascade') {
      const pid = profile_id as string;
      const deleted: Record<string, number> = {};

      try {
        // Delete in dependency order (children first)

        // 1. Signatures (child of estimates/documents)
        const signatures = await safeFilter(entities.FSSignature, { profile_id: pid });
        deleted.signatures = await deleteAll(entities.FSSignature, signatures);

        // 2. Daily photos (child of projects via daily logs)
        const photos = await safeFilter(entities.FSDailyPhoto, { profile_id: pid });
        deleted.daily_photos = await deleteAll(entities.FSDailyPhoto, photos);

        // 3. Material entries (child of projects/logs)
        const materials = await safeFilter(entities.FSMaterialEntry, { profile_id: pid });
        deleted.material_entries = await deleteAll(entities.FSMaterialEntry, materials);

        // 4. Labor entries (child of projects/logs)
        const labor = await safeFilter(entities.FSLaborEntry, { profile_id: pid });
        deleted.labor_entries = await deleteAll(entities.FSLaborEntry, labor);

        // 5. Daily logs
        const logs = await safeFilter(entities.FSDailyLog, { profile_id: pid });
        deleted.daily_logs = await deleteAll(entities.FSDailyLog, logs);

        // 6. Permits
        const permits = await safeFilter(entities.FSPermit, { profile_id: pid });
        deleted.permits = await deleteAll(entities.FSPermit, permits);

        // 7. Payments
        const payments = await safeFilter(entities.FSPayment, { profile_id: pid });
        deleted.payments = await deleteAll(entities.FSPayment, payments);

        // 8. Change orders (child of estimates)
        const changeOrders = await safeFilter(entities.FSChangeOrder, { profile_id: pid });
        deleted.change_orders = await deleteAll(entities.FSChangeOrder, changeOrders);

        // 9. Estimates
        const estimates = await safeFilter(entities.FSEstimate, { profile_id: pid });
        deleted.estimates = await deleteAll(entities.FSEstimate, estimates);

        // 10. Documents
        const documents = await safeFilter(entities.FSDocument, { profile_id: pid });
        deleted.documents = await deleteAll(entities.FSDocument, documents);

        // 11. Document templates
        const templates = await safeFilter(entities.FSDocumentTemplate, { profile_id: pid });
        deleted.document_templates = await deleteAll(entities.FSDocumentTemplate, templates);

        // 12. Projects
        const projects = await safeFilter(entities.FSProject, { profile_id: pid });
        deleted.projects = await deleteAll(entities.FSProject, projects);

        // 13. Clients
        const clients = await safeFilter(entities.FSClient, { workspace_id: pid });
        deleted.clients = await deleteAll(entities.FSClient, clients);

        // 14. Profile itself
        await entities.FieldServiceProfile.delete(pid);
        deleted.profile = 1;

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
    console.error('manageFieldServiceWorkspace error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
