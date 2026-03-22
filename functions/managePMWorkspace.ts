// Property Management workspace management via service role — bypasses Creator Only RLS.
// Handles cascade deletes, settlement finalization, and recurring expense carry-forward.
// Owner-only gate: all actions require the caller to own the PM workspace profile.
// Mirrors manageTeamPlay.ts fractal pattern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isPMOwner(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  profileId: string
): Promise<boolean> {
  try {
    const profile = await base44.asServiceRole.entities.PMPropertyProfile.get(profileId);
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
    const isOwner = await isPMOwner(base44, user.id, profile_id as string);
    if (!isOwner) {
      return Response.json({ error: 'You do not have access to this workspace' }, { status: 403 });
    }

    const entities = base44.asServiceRole.entities;

    // ── delete_workspace_cascade ──────────────────────────────────────
    if (action === 'delete_workspace_cascade') {
      const deleted: Record<string, number> = {};
      const pid = profile_id as string;

      try {
        // Delete in dependency order (children first)
        const splits = await safeFilter(entities.PMDistributionSplit, { profile_id: pid });
        deleted.distribution_splits = await deleteAll(entities.PMDistributionSplit, splits);

        const stakes = await safeFilter(entities.PMOwnershipStake, { profile_id: pid });
        deleted.ownership_stakes = await deleteAll(entities.PMOwnershipStake, stakes);

        const labor = await safeFilter(entities.PMLaborEntry, { profile_id: pid });
        deleted.labor_entries = await deleteAll(entities.PMLaborEntry, labor);

        const expenses = await safeFilter(entities.PMExpense, { profile_id: pid });
        deleted.expenses = await deleteAll(entities.PMExpense, expenses);

        const maintenance = await safeFilter(entities.PMMaintenanceRequest, { profile_id: pid });
        deleted.maintenance_requests = await deleteAll(entities.PMMaintenanceRequest, maintenance);

        const settlements = await safeFilter(entities.PMSettlement, { profile_id: pid });
        deleted.settlements = await deleteAll(entities.PMSettlement, settlements);

        const guests = await safeFilter(entities.PMGuest, { profile_id: pid });
        deleted.guests = await deleteAll(entities.PMGuest, guests);

        const listings = await safeFilter(entities.PMListing, { profile_id: pid });
        deleted.listings = await deleteAll(entities.PMListing, listings);

        const properties = await safeFilter(entities.PMProperty, { profile_id: pid });
        deleted.properties = await deleteAll(entities.PMProperty, properties);

        const groups = await safeFilter(entities.PMPropertyGroup, { profile_id: pid });
        deleted.groups = await deleteAll(entities.PMPropertyGroup, groups);

        const owners = await safeFilter(entities.PMOwner, { profile_id: pid });
        deleted.owners = await deleteAll(entities.PMOwner, owners);

        // Finally delete the profile itself
        await entities.PMPropertyProfile.delete(pid);
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

    // ── delete_group_cascade ──────────────────────────────────────────
    if (action === 'delete_group_cascade') {
      const groupId = body.group_id as string;
      if (!groupId) {
        return Response.json({ error: 'group_id is required' }, { status: 400 });
      }

      // Verify group belongs to this profile
      const group = await entities.PMPropertyGroup.get(groupId);
      if (!group || group.profile_id !== profile_id) {
        return Response.json({ error: 'Group not found in this workspace' }, { status: 404 });
      }

      const deleted: Record<string, number> = {};

      try {
        // Delete related financial records first
        const expenses = await safeFilter(entities.PMExpense, { profile_id: profile_id as string });
        const groupExpenses = expenses.filter((e) => e.group_id === groupId);
        deleted.expenses = await deleteAll(entities.PMExpense, groupExpenses);

        const labor = await safeFilter(entities.PMLaborEntry, { profile_id: profile_id as string });
        const groupLabor = labor.filter((e) => e.group_id === groupId);
        deleted.labor_entries = await deleteAll(entities.PMLaborEntry, groupLabor);

        const maintenance = await safeFilter(entities.PMMaintenanceRequest, { profile_id: profile_id as string });
        const groupMaintenance = maintenance.filter((e) => e.group_id === groupId);
        deleted.maintenance_requests = await deleteAll(entities.PMMaintenanceRequest, groupMaintenance);

        const settlements = await safeFilter(entities.PMSettlement, { profile_id: profile_id as string });
        const groupSettlements = settlements.filter((e) => e.group_id === groupId);
        deleted.settlements = await deleteAll(entities.PMSettlement, groupSettlements);

        // Delete properties in the group
        const properties = await safeFilter(entities.PMProperty, { profile_id: profile_id as string });
        const groupProperties = properties.filter((p) => p.group_id === groupId);
        deleted.properties = await deleteAll(entities.PMProperty, groupProperties);

        // Delete the group itself
        await entities.PMPropertyGroup.delete(groupId);
        deleted.group = 1;

        return Response.json({ success: true, deleted });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('delete_group_cascade error:', message);
        return Response.json({
          error: 'Failed to delete group completely. Some data may have been removed.',
          deleted_so_far: deleted,
        }, { status: 500 });
      }
    }

    // ── delete_owner_cascade ──────────────────────────────────────────
    if (action === 'delete_owner_cascade') {
      const ownerId = body.owner_id as string;
      if (!ownerId) {
        return Response.json({ error: 'owner_id is required' }, { status: 400 });
      }

      // Verify owner belongs to this profile
      const owner = await entities.PMOwner.get(ownerId);
      if (!owner || owner.profile_id !== profile_id) {
        return Response.json({ error: 'Owner not found in this workspace' }, { status: 404 });
      }

      try {
        // Delete distribution splits involving this owner
        const allSplits = await safeFilter(entities.PMDistributionSplit, { profile_id: profile_id as string });
        const ownerSplits = allSplits.filter(
          (s) => s.from_owner_id === ownerId || s.to_owner_id === ownerId
        );
        const splitsDeleted = await deleteAll(entities.PMDistributionSplit, ownerSplits);

        // Delete ownership stakes for this owner
        const allStakes = await safeFilter(entities.PMOwnershipStake, { profile_id: profile_id as string });
        const ownerStakes = allStakes.filter((s) => s.owner_id === ownerId);
        const stakesDeleted = await deleteAll(entities.PMOwnershipStake, ownerStakes);

        // Delete the owner
        await entities.PMOwner.delete(ownerId);

        return Response.json({
          success: true,
          deleted: { splits: splitsDeleted, stakes: stakesDeleted, owner: 1 },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('delete_owner_cascade error:', message);
        return Response.json({ error: 'Failed to delete owner: ' + message }, { status: 500 });
      }
    }

    // ── finalize_settlement ───────────────────────────────────────────
    if (action === 'finalize_settlement') {
      const settlementId = body.settlement_id as string;
      const calculatedData = body.calculated_data as Record<string, unknown> | undefined;

      if (!settlementId) {
        return Response.json({ error: 'settlement_id is required' }, { status: 400 });
      }
      if (!calculatedData || typeof calculatedData !== 'object') {
        return Response.json({ error: 'calculated_data is required' }, { status: 400 });
      }

      // Verify settlement belongs to this profile
      const settlement = await entities.PMSettlement.get(settlementId);
      if (!settlement || settlement.profile_id !== profile_id) {
        return Response.json({ error: 'Settlement not found in this workspace' }, { status: 404 });
      }

      // Prevent double-finalize
      if (settlement.status === 'finalized') {
        return Response.json({ error: 'Settlement is already finalized' }, { status: 409 });
      }

      // Validate ownership stakes sum to 100% before finalizing
      const groupId = settlement.group_id as string;
      if (groupId) {
        const allStakes = await safeFilter(entities.PMOwnershipStake, { profile_id: profile_id as string });
        const groupStakes = allStakes.filter((s) => s.group_id === groupId);
        if (groupStakes.length > 0) {
          const totalPct = groupStakes.reduce((sum, s) => sum + (Number(s.ownership_pct) || 0), 0);
          const rounded = Math.round(totalPct * 100) / 100;
          if (rounded !== 100) {
            return Response.json({
              error: `Ownership stakes for this group total ${rounded}%, not 100%. Fix stakes before finalizing.`,
              total_pct: rounded,
            }, { status: 400 });
          }
        }
      }

      try {
        const updated = await entities.PMSettlement.update(settlementId, {
          status: 'finalized',
          locked: true,
          finalized_at: new Date().toISOString(),
          gross_rent: calculatedData.gross_rent,
          total_fixed_expenses: calculatedData.total_fixed_expenses,
          management_fee: calculatedData.management_fee,
          maintenance_reserve: calculatedData.maintenance_reserve,
          emergency_reserve: calculatedData.emergency_reserve,
          total_labor_costs: calculatedData.total_labor_costs,
          total_reimbursements: calculatedData.total_reimbursements ?? 0,
          net_distributable: calculatedData.net_distributable,
          distributions: typeof calculatedData.distributions === 'string'
            ? calculatedData.distributions
            : JSON.stringify(calculatedData.distributions),
        });

        return Response.json({ success: true, settlement: updated });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('finalize_settlement error:', message);
        return Response.json({ error: 'Failed to finalize settlement: ' + message }, { status: 500 });
      }
    }

    // ── unfinalize_settlement ─────────────────────────────────────────
    if (action === 'unfinalize_settlement') {
      const settlementId = body.settlement_id as string;

      if (!settlementId) {
        return Response.json({ error: 'settlement_id is required' }, { status: 400 });
      }

      const settlement = await entities.PMSettlement.get(settlementId);
      if (!settlement || settlement.profile_id !== profile_id) {
        return Response.json({ error: 'Settlement not found in this workspace' }, { status: 404 });
      }

      if (settlement.status !== 'finalized') {
        return Response.json({ error: 'Settlement is not finalized' }, { status: 400 });
      }

      try {
        const updated = await entities.PMSettlement.update(settlementId, {
          status: 'draft',
          locked: false,
          finalized_at: null,
        });

        return Response.json({ success: true, settlement: updated });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('unfinalize_settlement error:', message);
        return Response.json({ error: 'Failed to reopen settlement: ' + message }, { status: 500 });
      }
    }

    // ── carry_forward_recurring ────────────────────────────────────────
    if (action === 'carry_forward_recurring') {
      const groupId = body.group_id as string;
      const month = body.month as string; // "YYYY-MM" format
      const expenses = body.expenses as Array<Record<string, unknown>> | undefined;

      if (!groupId) {
        return Response.json({ error: 'group_id is required' }, { status: 400 });
      }
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return Response.json({ error: 'month is required in YYYY-MM format' }, { status: 400 });
      }
      if (!Array.isArray(expenses) || expenses.length === 0) {
        return Response.json({ error: 'expenses array is required' }, { status: 400 });
      }

      // Verify group belongs to this profile
      const group = await entities.PMPropertyGroup.get(groupId);
      if (!group || group.profile_id !== profile_id) {
        return Response.json({ error: 'Group not found in this workspace' }, { status: 404 });
      }

      // Check for existing expenses in this month to detect duplicates
      const existingExpenses = await safeFilter(entities.PMExpense, { profile_id: profile_id as string });
      const monthExpenses = existingExpenses.filter(
        (e) => e.group_id === groupId && String(e.date || '').startsWith(month)
      );

      const date = `${month}-01`;
      let created = 0;
      let skippedDuplicates = 0;

      for (const exp of expenses) {
        // Check if this recurring expense already exists for this month
        const isDuplicate = monthExpenses.some(
          (existing) =>
            existing.category === exp.category &&
            existing.description === exp.description &&
            Number(existing.amount) === Number(exp.amount)
        );

        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        await entities.PMExpense.create({
          profile_id: profile_id as string,
          group_id: groupId,
          property_id: (exp.property_id as string) || null,
          category: exp.category,
          description: exp.description || '',
          amount: Number(exp.amount) || 0,
          date,
          is_recurring: true,
          reconciled: false,
          reimbursement_status: 'not_applicable',
          paid_by: 'property',
          type: 'expense',
        });
        created++;
      }

      return Response.json({
        success: true,
        created,
        skipped_duplicates: skippedDuplicates,
      });
    }

    // ── validate_ownership_stakes ────────────────────────────────────
    if (action === 'validate_ownership_stakes') {
      const groupId = body.group_id as string;
      if (!groupId) {
        return Response.json({ error: 'group_id is required' }, { status: 400 });
      }

      const group = await entities.PMPropertyGroup.get(groupId);
      if (!group || group.profile_id !== profile_id) {
        return Response.json({ error: 'Group not found in this workspace' }, { status: 404 });
      }

      const allStakes = await safeFilter(entities.PMOwnershipStake, { profile_id: profile_id as string });
      const groupStakes = allStakes.filter((s) => s.group_id === groupId);
      const totalPct = groupStakes.reduce((sum, s) => sum + (Number(s.ownership_pct) || 0), 0);
      const rounded = Math.round(totalPct * 100) / 100;

      return Response.json({
        success: true,
        total_pct: rounded,
        valid: rounded === 100,
        stake_count: groupStakes.length,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('managePMWorkspace error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
