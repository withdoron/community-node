// One-time migration: backfill original_budget from total_budget on FSProject records
// where original_budget is null. Admin-only. Safe to run multiple times (idempotent).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const all = await base44.asServiceRole.entities.FSProject.list();
    const projects = Array.isArray(all) ? all : [];

    const toBackfill = projects.filter(
      (p) => (p.original_budget === null || p.original_budget === undefined) && p.total_budget != null
    );

    const results = [];
    for (const p of toBackfill) {
      await base44.asServiceRole.entities.FSProject.update(p.id, {
        original_budget: p.total_budget,
      });
      results.push({ id: p.id, name: p.name, original_budget_set_to: p.total_budget });
    }

    return Response.json({ migrated: results.length, records: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});