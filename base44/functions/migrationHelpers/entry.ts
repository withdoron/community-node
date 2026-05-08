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
//   create_fs_document_template     — create an FSDocumentTemplate, idempotent on business_id+title
//   migrate_flat_layout_inversion   — Phase 2.1: invert flat_layout on existing FSEstimate records
//                                     after the is_insurance_estimate → flat_layout schema rename
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

    // ─── create_fs_document_template ──────────────────────────────
    // Creates an FSDocumentTemplate record via service role. Idempotent on
    // business_id + title: if a template with both already exists, returns the
    // existing record id and marks skipped. AuditLog'd.
    if (action === 'create_fs_document_template') {
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      if (!fields.title || typeof fields.title !== 'string') {
        return Response.json({ error: 'fields.title is required (string)' }, { status: 400 });
      }
      if (!fields.profile_id || typeof fields.profile_id !== 'string') {
        return Response.json({ error: 'fields.profile_id is required (string)' }, { status: 400 });
      }
      if (!fields.content || typeof fields.content !== 'string') {
        return Response.json({ error: 'fields.content is required (string)' }, { status: 400 });
      }

      // Idempotency check: same business_id + title = same template
      const businessId = (fields.business_id as string | null | undefined) ?? null;
      const title = fields.title as string;
      const existing = await entities.FSDocumentTemplate.filter({ title });
      const hit = (Array.isArray(existing) ? existing : []).find((t: Record<string, unknown>) => {
        const tBiz = (t.business_id as string | null | undefined) ?? null;
        return tBiz === businessId;
      });
      if (hit) {
        return Response.json({
          success: true,
          skipped: true,
          reason: 'FSDocumentTemplate with matching business_id + title already exists',
          template_id: hit.id,
          dry_run: dryRun,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FSDocumentTemplate',
            action: 'create',
            new_value: {
              ...fields,
              content_length: String(fields.content).length,
              content: `<${String(fields.content).length} chars>`,
            },
          },
        });
      }

      const created = await entities.FSDocumentTemplate.create(fields);
      const audit = await writeAudit(base44, {
        entity_type: 'FSDocumentTemplate',
        entity_id: created.id as string,
        action: 'create',
        old_value: null,
        new_value: { ...fields, content: `<${String(fields.content).length} chars>` },
        source: 'migration',
      });
      return Response.json({
        success: true,
        template_id: created.id,
        record: created,
        audit_log_id: audit.id,
      });
    }

    // ─── migrate_flat_layout_inversion ────────────────────────────
    // Phase 2.1 schema migration. Pre-rename, FSEstimate.is_insurance_estimate
    // carried the semantic "this estimate is trade-grouped" (true = grouped).
    // After Base44 renames the field to flat_layout, the values are preserved
    // — so flat_layout=true initially still means "was trade-grouped." This
    // action inverts each record's flat_layout so the new semantic holds:
    // flat_layout=true → flat render, flat_layout=false → trade-grouped (the
    // platform default for new estimates per DEC-206 Phase 2.1).
    //
    // Idempotency: each inversion writes an AuditLog row with action
    // 'flat_layout_inverted' and entity_id=<estimate.id>. On re-run, the
    // action queries AuditLog for those rows and skips records that are
    // already migrated. Safe to re-run; double-inversion is structurally
    // prevented.
    if (action === 'migrate_flat_layout_inversion') {
      const all = await entities.FSEstimate.list();
      const records = (Array.isArray(all) ? all : []) as Record<string, unknown>[];

      // Look up prior audits to enforce idempotency.
      const priorAudits = await entities.AuditLog.filter({
        action: 'flat_layout_inverted',
      });
      const migratedIds = new Set(
        ((Array.isArray(priorAudits) ? priorAudits : []) as Record<string, unknown>[])
          .map((a) => a.entity_id as string)
      );

      const toInvert = records.filter((r) => !migratedIds.has(r.id as string));

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FSEstimate',
            action: 'flat_layout_inverted',
            scanned: records.length,
            already_migrated: records.length - toInvert.length,
            will_invert: toInvert.length,
            sample: toInvert.slice(0, 5).map((r) => ({
              id: r.id,
              estimate_number: r.estimate_number,
              title: r.title,
              old_flat_layout: r.flat_layout ?? false,
              new_flat_layout: !(r.flat_layout ?? false),
            })),
          },
        });
      }

      const results: Array<{ id: string; audit_log_id: string }> = [];
      for (const r of toInvert) {
        const id = r.id as string;
        const oldValue = (r.flat_layout as boolean | undefined) ?? false;
        const newValue = !oldValue;
        await entities.FSEstimate.update(id, { flat_layout: newValue });
        const audit = await writeAudit(base44, {
          entity_type: 'FSEstimate',
          entity_id: id,
          action: 'flat_layout_inverted',
          old_value: { flat_layout: oldValue },
          new_value: { flat_layout: newValue },
          source: 'migration',
        });
        results.push({ id, audit_log_id: audit.id as string });
      }

      return Response.json({
        success: true,
        scanned: records.length,
        inverted: results.length,
        already_migrated_skipped: records.length - toInvert.length,
        audit_log_ids: results.map((r) => r.audit_log_id),
      });
    }

    // ─── migrate_flat_layout_rename ──────────────────────────────
    // Phase 2.2 schema migration. Sequence:
    //   1. Base44 renames flat_layout → group_by_trade (values preserved).
    //   2. THIS action inverts each record's group_by_trade so the new
    //      semantic holds (true = trade-grouped, false = flat).
    // Pre-rename, flat_layout carried "true=flat / false=grouped." After
    // Base44 rename, group_by_trade still carries the OLD semantic until
    // this migration runs. Result after --apply: group_by_trade=true →
    // trade-grouped (the platform default), group_by_trade=false → flat.
    //
    // Idempotency: each inversion writes an AuditLog row with action
    // 'flat_layout_renamed_to_group_by_trade' and entity_id=<estimate.id>.
    // On re-run, the action skips records already migrated. Safe to re-run.
    if (action === 'migrate_flat_layout_rename') {
      const all = await entities.FSEstimate.list();
      const records = (Array.isArray(all) ? all : []) as Record<string, unknown>[];

      const priorAudits = await entities.AuditLog.filter({
        action: 'flat_layout_renamed_to_group_by_trade',
      });
      const migratedIds = new Set(
        ((Array.isArray(priorAudits) ? priorAudits : []) as Record<string, unknown>[])
          .map((a) => a.entity_id as string)
      );

      const toInvert = records.filter((r) => !migratedIds.has(r.id as string));

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FSEstimate',
            action: 'flat_layout_renamed_to_group_by_trade',
            scanned: records.length,
            already_migrated: records.length - toInvert.length,
            will_invert: toInvert.length,
            sample: toInvert.slice(0, 5).map((r) => ({
              id: r.id,
              estimate_number: r.estimate_number,
              title: r.title,
              old_group_by_trade: r.group_by_trade ?? false,
              new_group_by_trade: !(r.group_by_trade ?? false),
            })),
          },
        });
      }

      const results: Array<{ id: string; audit_log_id: string }> = [];
      for (const r of toInvert) {
        const id = r.id as string;
        const oldValue = (r.group_by_trade as boolean | undefined) ?? false;
        const newValue = !oldValue;
        await entities.FSEstimate.update(id, { group_by_trade: newValue });
        const audit = await writeAudit(base44, {
          entity_type: 'FSEstimate',
          entity_id: id,
          action: 'flat_layout_renamed_to_group_by_trade',
          old_value: { group_by_trade: oldValue, semantic: 'pre_rename_flat_layout_value' },
          new_value: { group_by_trade: newValue, semantic: 'post_phase_2_2_group_by_trade' },
          source: 'migration',
        });
        results.push({ id, audit_log_id: audit.id as string });
      }

      return Response.json({
        success: true,
        scanned: records.length,
        inverted: results.length,
        already_migrated_skipped: records.length - toInvert.length,
        audit_log_ids: results.map((r) => r.audit_log_id),
      });
    }

    // ─── backfill_trade_categories_snapshot ──────────────────────
    // Phase 2.2 backfill. Each FSEstimate gets its workspace's current
    // trade_categories_json frozen into trade_categories_snapshot. Run AFTER
    // migrate_flat_layout_rename has landed (so group_by_trade carries the
    // correct semantic before snapshots become render-authoritative).
    //
    // Resolution: workspace's trade_categories_json → resolved array shape
    // [{id, name, order}, ...]. Fallback to the platform default 18-trade
    // seed when the workspace has no list. Counter `backfilled_from_default`
    // surfaces this case so we know how many records inherited the default.
    //
    // Edge cases:
    //   - Orphaned FSEstimate (no FieldServiceProfile): skipped, counter
    //     `orphaned_skipped`. Don't block the run.
    //   - Existing snapshot present: skipped via AuditLog idempotency.
    //
    // Idempotency: AuditLog action 'trade_categories_snapshot_backfilled'.
    if (action === 'backfill_trade_categories_snapshot') {
      const all = await entities.FSEstimate.list();
      const records = (Array.isArray(all) ? all : []) as Record<string, unknown>[];

      const priorAudits = await entities.AuditLog.filter({
        action: 'trade_categories_snapshot_backfilled',
      });
      const migratedIds = new Set(
        ((Array.isArray(priorAudits) ? priorAudits : []) as Record<string, unknown>[])
          .map((a) => a.entity_id as string)
      );

      // Default 18-trade seed for fallback. Mirrors DEFAULT_TRADE_CATEGORIES
      // in src/utils/fsTradeCategories.js — kept in sync at code-review time.
      const DEFAULT_TRADE_CATEGORIES = [
        'General Conditions', 'Demolition', 'Framing', 'Roofing', 'Siding & Exterior',
        'Windows & Doors', 'Electrical', 'Plumbing', 'HVAC', 'Insulation',
        'Drywall', 'Painting', 'Flooring', 'Concrete & Foundation',
        'Cabinetry & Countertops', 'Appliances', 'Cleanup & Hauling', 'Other',
      ];

      // Resolve a profile's trade_categories_json into the canonical
      // [{id, name, order}, ...] shape used by the snapshot. Handles all three
      // legacy shapes: plain string array, {items: [...]} wrap, already-resolved.
      function resolveTradeCategories(rawTC: unknown): {
        categories: Array<{ id: string; name: string; order: number }>;
        usedDefault: boolean;
      } {
        // Already-resolved object array
        if (Array.isArray(rawTC) && rawTC.length > 0) {
          if (typeof rawTC[0] === 'object' && rawTC[0] !== null && 'id' in (rawTC[0] as object)) {
            return {
              categories: rawTC as Array<{ id: string; name: string; order: number }>,
              usedDefault: false,
            };
          }
          // Plain string array (legacy)
          return {
            categories: (rawTC as string[]).map((name, i) => ({ id: `cat_${i}`, name, order: i })),
            usedDefault: false,
          };
        }
        // {items: [...]} wrap
        if (rawTC && typeof rawTC === 'object' && 'items' in rawTC) {
          const items = (rawTC as { items?: unknown[] }).items;
          if (Array.isArray(items) && items.length > 0) {
            if (typeof items[0] === 'object' && items[0] !== null && 'id' in (items[0] as object)) {
              return {
                categories: items as Array<{ id: string; name: string; order: number }>,
                usedDefault: false,
              };
            }
            return {
              categories: (items as string[]).map((name, i) => ({ id: `cat_${i}`, name, order: i })),
              usedDefault: false,
            };
          }
        }
        // Default fallback
        return {
          categories: DEFAULT_TRADE_CATEGORIES.map((name, i) => ({ id: `cat_${i}`, name, order: i })),
          usedDefault: true,
        };
      }

      // Pre-resolve every workspace's snapshot once (avoid N profile reads
      // when many estimates share a profile).
      const allProfiles = await entities.FieldServiceProfile.list();
      const profileById = new Map<string, Record<string, unknown>>();
      for (const p of (Array.isArray(allProfiles) ? allProfiles : [])) {
        profileById.set(p.id as string, p as Record<string, unknown>);
      }

      const toBackfill = records.filter((r) => !migratedIds.has(r.id as string));
      const planned: Array<{
        id: string;
        estimate_number: unknown;
        title: unknown;
        profile_id: unknown;
        snapshot_size: number;
        used_default: boolean;
        orphaned: boolean;
      }> = [];
      let orphanedCount = 0;
      let usedDefaultCount = 0;

      for (const r of toBackfill) {
        const profileId = r.profile_id as string | undefined;
        const profile = profileId ? profileById.get(profileId) : undefined;
        if (!profile) {
          orphanedCount += 1;
          planned.push({
            id: r.id as string,
            estimate_number: r.estimate_number,
            title: r.title,
            profile_id: profileId,
            snapshot_size: 0,
            used_default: false,
            orphaned: true,
          });
          continue;
        }
        const { categories, usedDefault } = resolveTradeCategories(profile.trade_categories_json);
        if (usedDefault) usedDefaultCount += 1;
        planned.push({
          id: r.id as string,
          estimate_number: r.estimate_number,
          title: r.title,
          profile_id: profileId,
          snapshot_size: categories.length,
          used_default: usedDefault,
          orphaned: false,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FSEstimate',
            action: 'trade_categories_snapshot_backfilled',
            scanned: records.length,
            already_migrated: records.length - toBackfill.length,
            will_backfill: toBackfill.length - orphanedCount,
            orphaned_skipped: orphanedCount,
            backfilled_from_default: usedDefaultCount,
            sample: planned.slice(0, 5),
          },
        });
      }

      const results: Array<{ id: string; audit_log_id: string }> = [];
      for (let i = 0; i < toBackfill.length; i++) {
        const r = toBackfill[i];
        const meta = planned[i];
        if (meta.orphaned) continue;
        const profile = profileById.get(r.profile_id as string)!;
        const { categories, usedDefault } = resolveTradeCategories(profile.trade_categories_json);
        const id = r.id as string;
        // Base44 declares trade_categories_snapshot as type 'object' (dictionary),
        // not array. Same convention as line_items, trade_categories_json,
        // phase_labels — the {items: [...]} wrap is load-bearing at the storage
        // layer. Render helpers (getEstimateTradeCategories) accept both shapes
        // already, so frontend reads stay tolerant.
        await entities.FSEstimate.update(id, {
          trade_categories_snapshot: { items: categories },
        });
        const audit = await writeAudit(base44, {
          entity_type: 'FSEstimate',
          entity_id: id,
          action: 'trade_categories_snapshot_backfilled',
          old_value: { trade_categories_snapshot: r.trade_categories_snapshot ?? null },
          new_value: {
            trade_categories_snapshot_size: categories.length,
            used_default: usedDefault,
            source_profile_id: r.profile_id,
          },
          source: 'backfill',
        });
        results.push({ id, audit_log_id: audit.id as string });
      }

      return Response.json({
        success: true,
        scanned: records.length,
        backfilled: results.length,
        already_migrated_skipped: records.length - toBackfill.length,
        orphaned_skipped: orphanedCount,
        backfilled_from_default: usedDefaultCount,
        audit_log_ids: results.map((r) => r.audit_log_id),
      });
    }

    // ─── migrate_company_name_to_business_name ────────────────────
    // Phase 2.3: rename `company_name` → `business_name` on every item in
    // every FieldServiceProfile.workers_json blob. Subcontractor records
    // populated `company_name` historically; Phase 2.3 makes `business_name`
    // the canonical field reused across subcontractor + vendor roles.
    //
    // Scope:
    //   - Reads every FieldServiceProfile.
    //   - Parses workers_json across all three legacy shapes (bare array,
    //     {items: [...]} wrap, JSON-string).
    //   - Per item: if `company_name` exists, copy its value to
    //     `business_name` (only if `business_name` doesn't already carry a
    //     non-empty value — preserves any post-rename UI writes), then
    //     remove `company_name`.
    //   - Re-wraps and writes back.
    //
    // Idempotency: each profile gets one AuditLog row with action
    // 'company_name_renamed_to_business_name'. On re-run, the action skips
    // profiles already migrated. Profiles with no workers_json or empty
    // arrays still write an AuditLog row to mark them migrated (cheap;
    // prevents re-scan).
    //
    // Edge cases:
    //   - Profile has workers_json missing/null → AuditLog written, items=0.
    //   - Item has both company_name AND business_name → preserve
    //     business_name's existing value, drop company_name.
    //   - Item has company_name = '' (empty string) → migrate as null
    //     business_name (drop the empty company_name; don't add an empty
    //     business_name).
    if (action === 'migrate_company_name_to_business_name') {
      const all = await entities.FieldServiceProfile.list();
      const records = (Array.isArray(all) ? all : []) as Record<string, unknown>[];

      const priorAudits = await entities.AuditLog.filter({
        action: 'company_name_renamed_to_business_name',
      });
      const migratedIds = new Set(
        ((Array.isArray(priorAudits) ? priorAudits : []) as Record<string, unknown>[])
          .map((a) => a.entity_id as string)
      );

      const toMigrate = records.filter((r) => !migratedIds.has(r.id as string));

      // Inline parse — mirrors src/utils/wrapShape.js parseWrappedArray.
      // Deno function and frontend can't share the helper; kept in lockstep
      // by docstring + co-review at touch time.
      function parseItems(value: unknown): Record<string, unknown>[] {
        if (Array.isArray(value)) return value as Record<string, unknown>[];
        if (typeof value === 'string') {
          try {
            return parseItems(JSON.parse(value));
          } catch {
            return [];
          }
        }
        if (
          value &&
          typeof value === 'object' &&
          Array.isArray((value as { items?: unknown[] }).items)
        ) {
          return (value as { items: Record<string, unknown>[] }).items;
        }
        return [];
      }

      // Plan + execute helper. Returns the migrated items + a count of how
      // many were actually changed (had company_name to rename).
      function migrateItems(items: Record<string, unknown>[]): {
        next: Record<string, unknown>[];
        changedCount: number;
      } {
        let changedCount = 0;
        const next = items.map((item) => {
          if (!('company_name' in item)) return item;
          const companyName = item.company_name;
          const existingBusinessName = item.business_name;
          // Drop company_name from the new shape.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { company_name: _drop, ...rest } = item as {
            company_name?: unknown;
            business_name?: unknown;
            [k: string]: unknown;
          };
          changedCount += 1;
          // Preserve any existing non-empty business_name; otherwise pull
          // company_name into business_name (skip when the value is an
          // empty string — write null only for explicit non-falsy values).
          const hasExistingBusiness =
            typeof existingBusinessName === 'string' && existingBusinessName.trim() !== '';
          if (hasExistingBusiness) {
            return rest;
          }
          if (typeof companyName === 'string' && companyName.trim() !== '') {
            return { ...rest, business_name: companyName };
          }
          return rest;
        });
        return { next, changedCount };
      }

      const planned: Array<{
        profile_id: string;
        workspace_name: unknown;
        items_count: number;
        changed_count: number;
        sample_change: { before: unknown; after: unknown } | null;
      }> = [];
      let totalChanged = 0;

      for (const r of toMigrate) {
        const items = parseItems(r.workers_json);
        const { next, changedCount } = migrateItems(items);
        totalChanged += changedCount;
        const firstChangeIdx = items.findIndex(
          (it) => 'company_name' in it && it.company_name
        );
        const sampleChange =
          firstChangeIdx >= 0
            ? {
                before: { company_name: items[firstChangeIdx].company_name },
                after: { business_name: next[firstChangeIdx].business_name ?? null },
              }
            : null;
        planned.push({
          profile_id: r.id as string,
          workspace_name: r.workspace_name,
          items_count: items.length,
          changed_count: changedCount,
          sample_change: sampleChange,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FieldServiceProfile',
            action: 'company_name_renamed_to_business_name',
            scanned: records.length,
            already_migrated: records.length - toMigrate.length,
            will_migrate: toMigrate.length,
            total_items_changed: totalChanged,
            sample: planned.slice(0, 10),
          },
        });
      }

      const results: Array<{ id: string; audit_log_id: string; changed: number }> = [];
      for (let i = 0; i < toMigrate.length; i++) {
        const r = toMigrate[i];
        const meta = planned[i];
        const items = parseItems(r.workers_json);
        const { next, changedCount } = migrateItems(items);
        const id = r.id as string;
        await entities.FieldServiceProfile.update(id, {
          workers_json: { items: next },
        });
        const audit = await writeAudit(base44, {
          entity_type: 'FieldServiceProfile',
          entity_id: id,
          action: 'company_name_renamed_to_business_name',
          old_value: {
            workers_json_size: meta.items_count,
            sample_change: meta.sample_change,
          },
          new_value: {
            workers_json_size: meta.items_count,
            renamed_count: changedCount,
          },
          source: 'migration',
        });
        results.push({ id, audit_log_id: audit.id as string, changed: changedCount });
      }

      return Response.json({
        success: true,
        scanned: records.length,
        migrated: results.length,
        already_migrated_skipped: records.length - toMigrate.length,
        total_items_renamed: results.reduce((s, r) => s + r.changed, 0),
        audit_log_ids: results.map((r) => r.audit_log_id),
      });
    }

    // ─── add_workers_json_ids ────────────────────────────────────
    // Phase 2.4 §0a: backfill stable `id` field on every item in every
    // FieldServiceProfile.workers_json blob. Architecture proposal Approach A
    // included `id: string` in the post-2.3 data shape; Phase 2.3
    // implementation overlooked it. Phase 2.4 picker writes `sub_person_id`
    // (line items) and `party_id` (FSPayment, sub/vendor branch) — both
    // require stable ids on workers_json items to be reliable.
    //
    // Per item: if `id` is missing OR empty string, assign a fresh id using
    // the `worker_${ts}_${counter}` pattern. Items that already have an id
    // are left untouched (in case a future quick-add wrote one between this
    // migration's dry-run and apply windows).
    //
    // Idempotency: each profile gets one AuditLog row with action
    // 'workers_json_ids_backfilled'. On re-run, the action skips profiles
    // already migrated. Profiles with no workers_json or empty arrays still
    // write an AuditLog row to mark them migrated.
    if (action === 'add_workers_json_ids') {
      const all = await entities.FieldServiceProfile.list();
      const records = (Array.isArray(all) ? all : []) as Record<string, unknown>[];

      const priorAudits = await entities.AuditLog.filter({
        action: 'workers_json_ids_backfilled',
      });
      const migratedIds = new Set(
        ((Array.isArray(priorAudits) ? priorAudits : []) as Record<string, unknown>[])
          .map((a) => a.entity_id as string)
      );

      const toMigrate = records.filter((r) => !migratedIds.has(r.id as string));

      // Inline parser — mirrors src/utils/wrapShape.js parseWrappedArray.
      // Same convention as Phase 2.3 migrate_company_name_to_business_name.
      function parseItems(value: unknown): Record<string, unknown>[] {
        if (Array.isArray(value)) return value as Record<string, unknown>[];
        if (typeof value === 'string') {
          try {
            return parseItems(JSON.parse(value));
          } catch {
            return [];
          }
        }
        if (
          value &&
          typeof value === 'object' &&
          Array.isArray((value as { items?: unknown[] }).items)
        ) {
          return (value as { items: Record<string, unknown>[] }).items;
        }
        return [];
      }

      // Server-side id generator. Mirrors src/utils/fsWorkersRoles.js
      // newWorkerId() but the counter is per-request rather than per-session
      // (no shared module state on the server).
      let serverCounter = 1;
      const makeId = () => `worker_${Date.now()}_${serverCounter++}`;

      function migrateItems(items: Record<string, unknown>[]): {
        next: Record<string, unknown>[];
        assignedCount: number;
      } {
        let assignedCount = 0;
        const next = items.map((item) => {
          const existingId = item.id;
          if (typeof existingId === 'string' && existingId.trim() !== '') {
            return item;
          }
          assignedCount += 1;
          return { ...item, id: makeId() };
        });
        return { next, assignedCount };
      }

      const planned: Array<{
        profile_id: string;
        workspace_name: unknown;
        items_count: number;
        assigned_count: number;
        sample_assignment: { name: unknown; id: string } | null;
      }> = [];
      let totalAssigned = 0;

      for (const r of toMigrate) {
        const items = parseItems(r.workers_json);
        const { next, assignedCount } = migrateItems(items);
        totalAssigned += assignedCount;
        const firstAssignedIdx = items.findIndex(
          (it) => typeof it.id !== 'string' || (it.id as string).trim() === ''
        );
        const sampleAssignment =
          firstAssignedIdx >= 0
            ? {
                name: items[firstAssignedIdx].name,
                id: next[firstAssignedIdx].id as string,
              }
            : null;
        planned.push({
          profile_id: r.id as string,
          workspace_name: r.workspace_name,
          items_count: items.length,
          assigned_count: assignedCount,
          sample_assignment: sampleAssignment,
        });
      }

      if (dryRun) {
        return Response.json({
          success: true,
          dry_run: true,
          planned: {
            entity_type: 'FieldServiceProfile',
            action: 'workers_json_ids_backfilled',
            scanned: records.length,
            already_migrated: records.length - toMigrate.length,
            will_migrate: toMigrate.length,
            total_items_assigned: totalAssigned,
            sample: planned.slice(0, 10),
          },
        });
      }

      const results: Array<{ id: string; audit_log_id: string; assigned: number }> = [];
      for (let i = 0; i < toMigrate.length; i++) {
        const r = toMigrate[i];
        const meta = planned[i];
        const items = parseItems(r.workers_json);
        const { next, assignedCount } = migrateItems(items);
        const id = r.id as string;
        await entities.FieldServiceProfile.update(id, {
          workers_json: { items: next },
        });
        const audit = await writeAudit(base44, {
          entity_type: 'FieldServiceProfile',
          entity_id: id,
          action: 'workers_json_ids_backfilled',
          old_value: {
            workers_json_size: meta.items_count,
            sample_pre_assignment: meta.sample_assignment
              ? { name: meta.sample_assignment.name }
              : null,
          },
          new_value: {
            workers_json_size: meta.items_count,
            assigned_count: assignedCount,
            sample_post_assignment: meta.sample_assignment,
          },
          source: 'migration',
        });
        results.push({ id, audit_log_id: audit.id as string, assigned: assignedCount });
      }

      return Response.json({
        success: true,
        scanned: records.length,
        migrated: results.length,
        already_migrated_skipped: records.length - toMigrate.length,
        total_items_assigned: results.reduce((s, r) => s + r.assigned, 0),
        audit_log_ids: results.map((r) => r.audit_log_id),
      });
    }

    return Response.json({ error: `Unknown action: ${String(action)}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('migrationHelpers error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
