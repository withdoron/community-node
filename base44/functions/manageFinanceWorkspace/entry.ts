// Finance workspace management via service role — bypasses Creator Only RLS.
// Handles cascade delete and bulk import operations.
// Owner-only gate: all actions require the caller to own the Finance workspace profile.
// Mirrors managePMWorkspace.ts fractal pattern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isFinanceOwner(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  profileId: string
): Promise<boolean> {
  try {
    const profile = await base44.asServiceRole.entities.FinancialProfile.get(profileId);
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
    const isOwner = await isFinanceOwner(base44, user.id, profile_id as string);
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
        // 1. DebtPayments (child of Debt)
        const debts = await safeFilter(entities.Debt, { profile_id: pid });
        let totalPayments = 0;
        for (const debt of debts) {
          const payments = await safeFilter(entities.DebtPayment, { debt_id: debt.id as string });
          totalPayments += await deleteAll(entities.DebtPayment, payments);
        }
        deleted.debt_payments = totalPayments;

        // 2. Debts
        deleted.debts = await deleteAll(entities.Debt, debts);

        // 3. RecurringTransactions
        const recurring = await safeFilter(entities.RecurringTransaction, { profile_id: pid });
        deleted.recurring_transactions = await deleteAll(entities.RecurringTransaction, recurring);

        // 4. Transactions
        const transactions = await safeFilter(entities.Transaction, { profile_id: pid });
        deleted.transactions = await deleteAll(entities.Transaction, transactions);

        // 5. Profile itself
        await entities.FinancialProfile.delete(pid);
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

    // ── bulk_import_transactions ───────────────────────────────────────
    if (action === 'bulk_import_transactions') {
      const transactions = body.transactions as Array<Record<string, unknown>> | undefined;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return Response.json({ error: 'transactions array is required' }, { status: 400 });
      }

      // Load existing transactions for duplicate detection
      const existing = await safeFilter(entities.Transaction, { profile_id: profile_id as string });

      let created = 0;
      let skippedDuplicates = 0;
      const errors: string[] = [];

      for (const txn of transactions) {
        // Validate required fields
        if (!txn.amount || Number(txn.amount) <= 0) {
          errors.push(`Skipped: invalid amount ${txn.amount}`);
          continue;
        }
        if (!txn.date) {
          errors.push(`Skipped: missing date for "${txn.description || 'unnamed'}"`);
          continue;
        }

        // Duplicate detection: date + amount + description
        const isDuplicate = existing.some(
          (e) =>
            String(e.date).slice(0, 10) === String(txn.date).slice(0, 10) &&
            Number(e.amount) === Number(txn.amount) &&
            String(e.description || '').toLowerCase() === String(txn.description || '').toLowerCase()
        );

        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        try {
          await entities.Transaction.create({
            profile_id: profile_id as string,
            user_id: user.id,
            type: txn.type || 'expense',
            amount: Number(txn.amount),
            date: txn.date,
            description: txn.description || '',
            context: txn.context || 'personal',
            category: txn.category || 'other',
            notes: txn.notes || '',
            source_node: 'import',
            is_recurring_instance: false,
          });
          created++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Failed: "${txn.description || 'unnamed'}": ${message}`);
        }
      }

      return Response.json({
        success: true,
        created,
        skipped_duplicates: skippedDuplicates,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageFinanceWorkspace error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
