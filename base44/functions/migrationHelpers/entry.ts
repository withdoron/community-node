// migrationHelpers — Phase 2 helper surface for the production migration.
//
// Auth: shared secret in `X-Migration-Secret` header, compared to the
// MIGRATION_SECRET env var. Base44 API-key auth does not populate
// caller.role, so we don't rely on role-based gating. All entity I/O
// uses base44.asServiceRole.
//
// Actions (mutations):
//   create_business                 — generic Business.create with audit
//   create_business_from_fs_profile — promote an FS profile to a real Business + link back
//   archive_business                — set archived_at / archived_by
//   unarchive_business              — clear archive fields
//   archive_fs_profile              — same, for FieldServiceProfile
//   unarchive_fs_profile            — reverse
//   mark_legacy_user                — set is_legacy_user: true on a User
//   unmark_legacy_user              — clear the flag
//
// Actions (read-only, for migration lookups):
//   find_user_by_email              — returns a User record or null
//
// Every mutation supports `dry_run: true` which returns the planned
// change without writing. Every mutation writes an AuditLog row.
//
// AuditLog user_id is the acting admin (Doron) per Phase 1 spec (DEC-139).

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

function nowIso(): string {
  return new Date().toISOString();
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

    const action = body.action as string | undefined;
    const dryRun = body.dry_run === true;
    const entities = base44.asServiceRole.entities;

    // ─── find_user_by_email ───────────────────────────────────────
    if (action === 'find_user_by_email') {
      const email = body.email as string | undefined;
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }
      const results = await entities.User.filter({ email });
      const list = Array.isArray(results) ? results : [];
      return Response.json({ success: true, user: list[0] ?? null, count: list.length });
    }

    // ─── create_business ───────────────────────────────────────────
    if (action === 'create_business') {
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      if (!fields.name) {
        return Response.json({ error: 'fields.name is required' }, { status: 400 });
      }

      const idempotencyKey = body.idempotency_key as string | undefined;
      if (idempotencyKey) {
        const existing = await entities.Business.filter({ name: fields.name });
        const hit = (Array.isArray(existing) ? existing : []).find(
          (b: Record<string, unknown>) =>
            b.legal_name === fields.legal_name && b.name === fields.name
        );
        if (hit) {
          return Response.json({
            success: true,
            skipped: true,
            reason: 'Business with matching name + legal_name already exists',
            business_id: hit.id,
            dry_run: dryRun,
          });
        }
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: { entity_type: 'Business', action: 'create', new_value: fields },
        });
      }

      const created = await entities.Business.create(fields);
      const audit = await writeAudit(base44, {
        entity_type: 'Business',
        entity_id: created.id as string,
        action: 'create',
        old_value: null,
        new_value: fields,
        source: 'migration',
      });
      return Response.json({ success: true, business_id: created.id, record: created, audit_log_id: audit.id });
    }

    // ─── create_business_from_fs_profile ──────────────────────────
    if (action === 'create_business_from_fs_profile') {
      const profileId = body.profile_id as string | undefined;
      const parentBusinessId = (body.parent_business_id ?? null) as string | null;
      const overrides = (body.overrides ?? {}) as Record<string, unknown>;

      if (!profileId) {
        return Response.json({ error: 'profile_id is required' }, { status: 400 });
      }

      const profile = await entities.FieldServiceProfile.get(profileId);
      if (!profile) {
        return Response.json({ error: `FieldServiceProfile ${profileId} not found` }, { status: 404 });
      }

      if (profile.business_id) {
        const existing = await entities.Business.get(profile.business_id as string);
        return Response.json({
          success: true,
          skipped: true,
          reason: 'FS profile already linked to a Business',
          profile_id: profileId,
          business_id: profile.business_id,
          business: existing,
          dry_run: dryRun,
        });
      }

      const businessFields: Record<string, unknown> = {
        name: profile.business_name ?? profile.workspace_name ?? 'Unnamed Business',
        owner_user_id: profile.user_id,
        owner_email: profile.email ?? profile.created_by,
        email: profile.email ?? profile.created_by,
        phone: profile.phone ?? '',
        website: profile.website ?? '',
        tagline: profile.tagline ?? '',
        logo_url: profile.logo_url ?? '',
        brand_color: profile.brand_color ?? '',
        listed_in_directory: true,
        subscription_tier: null,
        is_active: true,
        parent_business_id: parentBusinessId,
        ...overrides,
      };

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: [
            { entity_type: 'Business', action: 'create', new_value: businessFields },
            {
              entity_type: 'FieldServiceProfile',
              entity_id: profileId,
              action: 'update',
              old_value: { business_id: null },
              new_value: { business_id: '<new-business-id>' },
            },
          ],
        });
      }

      const created = await entities.Business.create(businessFields);
      const createAudit = await writeAudit(base44, {
        entity_type: 'Business',
        entity_id: created.id as string,
        action: 'create',
        old_value: null,
        new_value: businessFields,
        source: 'migration',
      });

      await entities.FieldServiceProfile.update(profileId, { business_id: created.id });
      const linkAudit = await writeAudit(base44, {
        entity_type: 'FieldServiceProfile',
        entity_id: profileId,
        action: 'backfill',
        old_value: { business_id: null },
        new_value: { business_id: created.id },
        source: 'migration',
      });

      return Response.json({
        success: true,
        business_id: created.id,
        profile_id: profileId,
        business: created,
        audit_log_ids: { create: createAudit.id, link: linkAudit.id },
      });
    }

    // ─── archive_business / unarchive_business ────────────────────
    if (action === 'archive_business' || action === 'unarchive_business') {
      const businessId = body.business_id as string | undefined;
      if (!businessId) {
        return Response.json({ error: 'business_id is required' }, { status: 400 });
      }
      const current = await entities.Business.get(businessId);
      if (!current) {
        return Response.json({ error: `Business ${businessId} not found` }, { status: 404 });
      }

      const oldValue = { archived_at: current.archived_at ?? null, archived_by: current.archived_by ?? null };
      const newValue = action === 'archive_business'
        ? { archived_at: nowIso(), archived_by: ACTING_ADMIN_USER_ID }
        : { archived_at: null, archived_by: null };

      const alreadyAtTarget = action === 'archive_business'
        ? !!current.archived_at
        : !current.archived_at;

      if (alreadyAtTarget) {
        return Response.json({
          success: true,
          skipped: true,
          reason: action === 'archive_business' ? 'already archived' : 'already unarchived',
          business_id: businessId,
          dry_run: dryRun,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: { entity_type: 'Business', entity_id: businessId, action: action === 'archive_business' ? 'archive' : 'update', old_value: oldValue, new_value: newValue },
        });
      }

      await entities.Business.update(businessId, newValue);
      const audit = await writeAudit(base44, {
        entity_type: 'Business',
        entity_id: businessId,
        action: action === 'archive_business' ? 'archive' : 'update',
        old_value: oldValue,
        new_value: newValue,
        source: 'migration',
      });
      return Response.json({ success: true, business_id: businessId, audit_log_id: audit.id });
    }

    // ─── archive_fs_profile / unarchive_fs_profile ────────────────
    if (action === 'archive_fs_profile' || action === 'unarchive_fs_profile') {
      const profileId = body.profile_id as string | undefined;
      if (!profileId) {
        return Response.json({ error: 'profile_id is required' }, { status: 400 });
      }
      const current = await entities.FieldServiceProfile.get(profileId);
      if (!current) {
        return Response.json({ error: `FieldServiceProfile ${profileId} not found` }, { status: 404 });
      }

      const oldValue = { archived_at: current.archived_at ?? null, archived_by: current.archived_by ?? null };
      const newValue = action === 'archive_fs_profile'
        ? { archived_at: nowIso(), archived_by: ACTING_ADMIN_USER_ID }
        : { archived_at: null, archived_by: null };

      const alreadyAtTarget = action === 'archive_fs_profile'
        ? !!current.archived_at
        : !current.archived_at;

      if (alreadyAtTarget) {
        return Response.json({
          success: true,
          skipped: true,
          reason: action === 'archive_fs_profile' ? 'already archived' : 'already unarchived',
          profile_id: profileId,
          dry_run: dryRun,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: { entity_type: 'FieldServiceProfile', entity_id: profileId, action: action === 'archive_fs_profile' ? 'archive' : 'update', old_value: oldValue, new_value: newValue },
        });
      }

      await entities.FieldServiceProfile.update(profileId, newValue);
      const audit = await writeAudit(base44, {
        entity_type: 'FieldServiceProfile',
        entity_id: profileId,
        action: action === 'archive_fs_profile' ? 'archive' : 'update',
        old_value: oldValue,
        new_value: newValue,
        source: 'migration',
      });
      return Response.json({ success: true, profile_id: profileId, audit_log_id: audit.id });
    }

    // ─── mark_legacy_user / unmark_legacy_user ────────────────────
    if (action === 'mark_legacy_user' || action === 'unmark_legacy_user') {
      const userId = body.user_id as string | undefined;
      if (!userId) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      const user = await entities.User.get(userId);
      if (!user) {
        return Response.json({ error: `User ${userId} not found` }, { status: 404 });
      }

      const targetFlag = action === 'mark_legacy_user';
      const currentFlag = user.is_legacy_user === true;

      if (currentFlag === targetFlag) {
        return Response.json({
          success: true,
          skipped: true,
          reason: `is_legacy_user already ${targetFlag}`,
          user_id: userId,
          dry_run: dryRun,
        });
      }

      const oldValue = { is_legacy_user: currentFlag };
      const newValue = { is_legacy_user: targetFlag };

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: { entity_type: 'User', entity_id: userId, action: 'update', old_value: oldValue, new_value: newValue },
        });
      }

      await entities.User.update(userId, newValue);
      const audit = await writeAudit(base44, {
        entity_type: 'User',
        entity_id: userId,
        action: 'update',
        old_value: oldValue,
        new_value: newValue,
        source: 'migration',
      });
      return Response.json({ success: true, user_id: userId, audit_log_id: audit.id });
    }

    return Response.json({ error: `Unknown action: ${String(action)}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('migrationHelpers error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
