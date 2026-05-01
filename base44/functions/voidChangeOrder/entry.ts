import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// voidChangeOrder — voids a signed/accepted change order and recomputes the
// parent FSProject's total_budget so the voided amount no longer counts.
// Mirrors signChangeOrder's recompute pattern but inverted: instead of adding
// a CO to the contract total, this removes one.
//
// Per FINANCIAL-WORKFLOW-SPEC §2.1 + §2.4: signed COs are legal artifacts.
// Voiding preserves the record (status: voided, voided_at timestamp) for
// audit while excluding it from the active contract math. The client portal
// renders voided COs visibly as voided so the client sees what happened.
//
// Drafts hard-delete client-side without going through this function — there's
// no legal trail to preserve. Only signed/accepted COs are voidable here.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { change_order_id, reason } = await req.json();

    if (!change_order_id) {
      return Response.json(
        { error: 'Missing required field: change_order_id' },
        { status: 400 },
      );
    }

    const co = await base44.asServiceRole.entities.FSChangeOrder.get(change_order_id);
    if (!co) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    const voidableStatuses = ['signed', 'accepted'];
    if (!voidableStatuses.includes(co.status)) {
      return Response.json(
        { error: `Change order in status '${co.status}' cannot be voided. Only signed or accepted COs are voidable.` },
        { status: 400 },
      );
    }

    // 1. Mark CO voided. portal_link_active: false so any client-facing link
    // stops resolving — the client doesn't need to keep re-checking a voided
    // record.
    const voidedAt = new Date().toISOString();
    const updatedCO = await base44.asServiceRole.entities.FSChangeOrder.update(change_order_id, {
      status: 'voided',
      voided_at: voidedAt,
      voided_reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
      portal_link_active: false,
    });

    // 2. Recompute parent project's total_budget. Only `signed` COs count
    // toward the contract total (mirrors signChangeOrder's filter exactly —
    // 'voided' naturally excluded since it's its own status). Fall back to
    // `total` for legacy COs without `amount`.
    if (co.project_id) {
      try {
        const project = await base44.asServiceRole.entities.FSProject.get(co.project_id);
        if (project) {
          const allCOs = await base44.asServiceRole.entities.FSChangeOrder.filter({
            project_id: co.project_id,
          });
          const signedCOs = (Array.isArray(allCOs) ? allCOs : []).filter(
            (c: any) => c.status === 'signed',
          );
          const coTotal = signedCOs.reduce((sum: number, c: any) => {
            const adjustment =
              c.amount !== undefined && c.amount !== null
                ? parseFloat(c.amount)
                : parseFloat(c.total) || 0;
            return sum + (Number.isFinite(adjustment) ? adjustment : 0);
          }, 0);
          const originalBudget =
            project.original_budget !== undefined && project.original_budget !== null
              ? parseFloat(project.original_budget)
              : parseFloat(project.total_budget) || 0;
          const newTotal = (Number.isFinite(originalBudget) ? originalBudget : 0) + coTotal;

          await base44.asServiceRole.entities.FSProject.update(co.project_id, {
            total_budget: newTotal,
          });
        }
      } catch (recomputeError) {
        // Log but don't fail the void. The CO is voided; total_budget recompute
        // is recoverable (a future signing/voiding event will repair it).
        console.error('voidChangeOrder: total_budget recompute failed:', recomputeError);
      }
    }

    return Response.json({ success: true, change_order: updatedCO });
  } catch (error) {
    console.error('voidChangeOrder error:', error);
    return Response.json(
      { error: (error as any)?.message || 'Failed to void change order' },
      { status: 500 },
    );
  }
});
