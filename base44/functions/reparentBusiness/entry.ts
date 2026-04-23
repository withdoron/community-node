// reparentBusiness — Phase 2 reparenting machinery.
//
// Auth: shared secret in `X-Migration-Secret` header, compared to the
// MIGRATION_SECRET env var. Base44 API-key auth does not populate
// caller.role, so we don't rely on role-based gating for migration work.
// All entity I/O uses base44.asServiceRole.
//
// Actions:
//   reparent : set a Business's parent_business_id to newParentId (or null).
//   rollback : read an AuditLog entry and reverse the reparent it recorded.
//
// Both actions support `dry_run: true` which returns the planned before/after
// state without mutating. Idempotent: if current parent_business_id already
// matches, no mutation or AuditLog is written.
//
// AuditLog user_id is the acting admin (Doron) per Phase 1 schema spec:
// "For server-driven actions, use the acting admin's user ID (DEC-139)."

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

type Base44Client = Awaited<ReturnType<typeof createClientFromRequest>>;

const ACTING_ADMIN_USER_ID = '69308d4dd5ee90afc9b011d4'; // Doron, per MANIFEST-2026-04-22

async function writeAudit(
  base44: Base44Client,
  entry: {
    entity_type: string;
    entity_id: string;
    action: string;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    source: string;
  }
): Promise<Record<string, unknown>> {
  return await base44.asServiceRole.entities.AuditLog.create({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    old_value: entry.old_value === null ? null : JSON.stringify(entry.old_value),
    new_value: entry.new_value === null ? null : JSON.stringify(entry.new_value),
    user_id: ACTING_ADMIN_USER_ID,
    source: entry.source,
    timestamp: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    const expectedSecret = Deno.env.get('MIGRATION_SECRET');
    if (!expectedSecret) {
      return Response.json(
        { error: 'Server misconfigured: MIGRATION_SECRET not set' },
        { status: 500 }
      );
    }
    const presented = req.headers.get('x-migration-secret') || '';
    if (presented !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const action = body.action;
    const dryRun = body.dry_run === true;
    const entities = base44.asServiceRole.entities;

    // ────────────────────────────────────────────────────────────
    // action: reparent
    // ────────────────────────────────────────────────────────────
    if (action === 'reparent') {
      const businessId = body.business_id as string | undefined;
      const newParentId = (body.new_parent_id ?? null) as string | null;
      const reason = (body.reason as string | undefined) ?? '';

      if (!businessId || typeof businessId !== 'string') {
        return Response.json({ error: 'business_id is required' }, { status: 400 });
      }

      const child = await entities.Business.get(businessId);
      if (!child) {
        return Response.json({ error: `Business ${businessId} not found` }, { status: 404 });
      }

      // Parent existence is only verified on apply. In dry-run the parent may
      // be a symbolic placeholder (e.g. "<pending>") because earlier dry-run
      // steps haven't created it yet.
      if (!dryRun && newParentId !== null) {
        const parent = await entities.Business.get(newParentId);
        if (!parent) {
          return Response.json(
            { error: `New parent Business ${newParentId} not found` },
            { status: 404 }
          );
        }
      }

      const oldParent = (child.parent_business_id ?? null) as string | null;

      if (String(oldParent) === String(newParentId)) {
        return Response.json({
          success: true,
          skipped: true,
          reason: 'parent_business_id already matches new_parent_id',
          business_id: businessId,
          parent_business_id: oldParent,
          dry_run: dryRun,
        });
      }

      const oldValue = { parent_business_id: oldParent };
      const newValue = { parent_business_id: newParentId };

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: { entity_type: 'Business', entity_id: businessId, action: 'reparent', old_value: oldValue, new_value: newValue, reason },
        });
      }

      await entities.Business.update(businessId, newValue);
      const audit = await writeAudit(base44, {
        entity_type: 'Business',
        entity_id: businessId,
        action: 'reparent',
        old_value: { ...oldValue, reason },
        new_value: newValue,
        source: 'reparent_function',
      });

      return Response.json({
        success: true,
        business_id: businessId,
        old_value: oldValue,
        new_value: newValue,
        audit_log_id: audit.id,
      });
    }

    // ────────────────────────────────────────────────────────────
    // action: rollback
    // ────────────────────────────────────────────────────────────
    if (action === 'rollback') {
      const auditLogId = body.audit_log_id as string | undefined;
      if (!auditLogId || typeof auditLogId !== 'string') {
        return Response.json({ error: 'audit_log_id is required' }, { status: 400 });
      }

      const log = await entities.AuditLog.get(auditLogId);
      if (!log) {
        return Response.json({ error: `AuditLog ${auditLogId} not found` }, { status: 404 });
      }
      if (log.entity_type !== 'Business' || log.action !== 'reparent') {
        return Response.json(
          { error: `AuditLog ${auditLogId} is not a Business reparent entry` },
          { status: 400 }
        );
      }

      let oldValue: Record<string, unknown>;
      try {
        oldValue = log.old_value ? JSON.parse(log.old_value as string) : {};
      } catch {
        return Response.json({ error: 'AuditLog old_value is not valid JSON' }, { status: 500 });
      }

      const businessId = log.entity_id as string;
      const current = await entities.Business.get(businessId);
      if (!current) {
        return Response.json({ error: `Business ${businessId} no longer exists` }, { status: 404 });
      }

      const targetParent = (oldValue.parent_business_id ?? null) as string | null;
      const currentParent = (current.parent_business_id ?? null) as string | null;

      if (String(currentParent) === String(targetParent)) {
        return Response.json({
          success: true,
          skipped: true,
          reason: 'Business already at pre-reparent state',
          business_id: businessId,
          parent_business_id: currentParent,
          dry_run: dryRun,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'Business',
            entity_id: businessId,
            action: 'rollback',
            old_value: { parent_business_id: currentParent },
            new_value: { parent_business_id: targetParent },
            rolls_back_audit_log_id: auditLogId,
          },
        });
      }

      await entities.Business.update(businessId, { parent_business_id: targetParent });
      const audit = await writeAudit(base44, {
        entity_type: 'Business',
        entity_id: businessId,
        action: 'rollback',
        old_value: { parent_business_id: currentParent, rolls_back_audit_log_id: auditLogId },
        new_value: { parent_business_id: targetParent },
        source: 'reparent_function',
      });

      return Response.json({
        success: true,
        business_id: businessId,
        rolled_back_to: targetParent,
        audit_log_id: audit.id,
      });
    }

    return Response.json({ error: `Unknown action: ${String(action)}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('reparentBusiness error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
