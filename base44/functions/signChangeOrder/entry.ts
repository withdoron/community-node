import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// signChangeOrder — handles e-signature saves from the unauthenticated client portal
// for FSChangeOrder records. Mirrors signEstimate / signDocument patterns.
//
// In addition to marking the CO signed, this function recomputes the parent
// FSProject's total_budget = original_budget + sum(FSChangeOrder.amount where status = 'signed').
// Both writes use asServiceRole — FSChangeOrder.security.update and FSProject.security.update
// are relaxed to "No restrictions" (per Phase 1 Item 2c Base44 prompt).
//
// Per the Phase 1 architectural primitive, the recompute reads `amount`, not `total`.
// `total` is the line-items working number; `amount` is the canonical net contract adjustment.
// For COs without an `amount` field set (legacy records), we fall back to `total`.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { change_order_id, portal_token, signature_data } = await req.json();

    if (!change_order_id || !portal_token || !signature_data) {
      return Response.json(
        { error: 'Missing required fields: change_order_id, portal_token, signature_data' },
        { status: 400 },
      );
    }

    const co = await base44.asServiceRole.entities.FSChangeOrder.get(change_order_id);
    if (!co) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    if (co.portal_token !== portal_token) {
      return Response.json({ error: 'Invalid signing link' }, { status: 403 });
    }

    const signableStatuses = ['awaiting_signature', 'sent'];
    if (!signableStatuses.includes(co.status)) {
      return Response.json({ error: 'Change order is not awaiting signature' }, { status: 400 });
    }

    if (co.portal_link_active === false) {
      return Response.json({ error: 'This signing link has been recalled' }, { status: 400 });
    }

    // 1. Mark CO signed
    const signedAt = new Date().toISOString();
    const updatedCO = await base44.asServiceRole.entities.FSChangeOrder.update(change_order_id, {
      status: 'signed',
      signature_data:
        typeof signature_data === 'string' ? signature_data : JSON.stringify(signature_data),
      signed_at: signedAt,
      portal_link_active: false,
    });

    // 2. Recompute parent project's total_budget
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
          // amount is canonical; fall back to total for legacy records that pre-date the amount field.
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
        // Log but don't fail the signing. The CO is signed; total_budget recompute
        // is recoverable (a future signing event will repair it).
        console.error('signChangeOrder: total_budget recompute failed:', recomputeError);
      }
    }

    return Response.json({ success: true, change_order: updatedCO });
  } catch (error) {
    console.error('signChangeOrder error:', error);
    return Response.json(
      { error: (error as any)?.message || 'Failed to save signature' },
      { status: 500 },
    );
  }
});
