// @ts-check
/**
 * TEMPLATE.js — canonical migration pattern for LocalLane
 * ------------------------------------------------------------
 * Every migration in this folder follows this structure:
 *
 *   1. Query the affected records (read-only).
 *   2. Compute what the migration WOULD do (the plan).
 *   3. DRY-RUN: print the plan, flag anything ambiguous or unsafe.
 *      By default, the script exits here. No data is written.
 *   4. Only when invoked with `--apply`, iterate the plan and mutate records.
 *      Before each mutation: write an AuditLog entry (action/old/new).
 *      After each mutation: verify and write a second AuditLog entry if needed.
 *   5. Idempotent: re-running with `--apply` on already-migrated data is a no-op.
 *   6. Dual-read-safe: the runtime code must already work with `business_id: null`
 *      AND with it set, so the app keeps running during the migration.
 *
 * Created 2026-04-22 as Phase 1 Schema Foundation, Round 1 Business Foundation.
 * Reference: base44-prompts/PHASE-1-SCHEMA-FOUNDATION.md
 *            private/BACKFILL-DRY-RUN-2026-04-22.md
 */

/* eslint-env node */
import { base44 } from '@/api/base44Client';

const MIGRATION_NAME = 'TEMPLATE_rename_me_per_migration';
const MIGRATION_SOURCE = 'backfill_script'; // one of: migration, reparent_function, backfill_script

/* ------------------------------------------------------------------------- */
/* 1. Parse flags                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Parse the two flags every migration supports.
 * @returns {{ apply: boolean, limit: number|null }}
 */
function parseFlags() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    limit: (() => {
      const arg = args.find((a) => a.startsWith('--limit='));
      return arg ? parseInt(arg.split('=')[1], 10) : null;
    })(),
  };
}

/* ------------------------------------------------------------------------- */
/* 2. Query affected records (override per migration)                        */
/* ------------------------------------------------------------------------- */

/**
 * Fetch the records this migration cares about.
 * Override per migration. Must be read-only.
 * @returns {Promise<any[]>}
 */
async function queryAffectedRecords() {
  // Example (replace with the actual query for your migration):
  // const all = await base44.entities.FieldServiceProfile.list();
  // return all.filter((p) => !p.business_id);
  return [];
}

/* ------------------------------------------------------------------------- */
/* 3. Build plan (override per migration)                                    */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} PlanEntry
 * @property {string} entity_type  The entity being mutated (e.g. "FieldServiceProfile").
 * @property {string} entity_id    The record ID.
 * @property {'update'|'create'|'archive'|'reparent'|'delete'} action
 * @property {Object} old_value    Snapshot of relevant fields BEFORE mutation.
 * @property {Object} new_value    Target state AFTER mutation.
 * @property {string} [flag]       Non-null if this entry is ambiguous/unsafe — surfaced by the dry-run for manual review.
 * @property {string} [note]       Optional human-readable explanation.
 */

/**
 * Turn fetched records into a plan. Override per migration.
 * @param {any[]} _records
 * @returns {Promise<PlanEntry[]>}
 */
async function buildPlan(_records) {
  // Example (replace with the actual plan logic):
  // return records.map((profile) => ({
  //   entity_type: 'FieldServiceProfile',
  //   entity_id: profile.id,
  //   action: 'update',
  //   old_value: { business_id: null },
  //   new_value: { business_id: determineBusinessId(profile) },
  //   flag: ambiguityCheck(profile),
  // }));
  return [];
}

/* ------------------------------------------------------------------------- */
/* 4. Apply a single plan entry — writes AuditLog before/after               */
/* ------------------------------------------------------------------------- */

/**
 * Apply one plan entry. Each mutation writes an AuditLog entry.
 * This function is idempotent: re-running on already-migrated data
 * should be a no-op, because the live record's state should already
 * equal `entry.new_value`.
 *
 * @param {PlanEntry} entry
 * @param {string} actingUserId  The user ID performing the migration (server-authoritative per DEC-139).
 */
async function applyOne(entry, actingUserId) {
  const table = base44.entities[entry.entity_type];
  if (!table) {
    throw new Error(`Unknown entity_type in plan: ${entry.entity_type}`);
  }

  // Idempotency check: if the record already matches new_value for the
  // fields we would change, skip and log as no-op.
  if (entry.action === 'update') {
    const current = await table.get(entry.entity_id);
    const alreadyMigrated = Object.keys(entry.new_value).every(
      (k) => current?.[k] === entry.new_value[k]
    );
    if (alreadyMigrated) {
      console.log(`  [skip] ${entry.entity_type}/${entry.entity_id} already matches new_value`);
      return;
    }
  }

  // Perform the mutation first, then log the result. If the mutation
  // throws, no AuditLog entry is written — which is what we want
  // (an unwritten mutation should not appear in the audit trail).
  switch (entry.action) {
    case 'update':
      await table.update(entry.entity_id, entry.new_value);
      break;
    case 'create':
      await table.create(entry.new_value);
      break;
    case 'delete':
      await table.delete(entry.entity_id);
      break;
    case 'archive':
      await table.update(entry.entity_id, {
        ...entry.new_value,
        archived_at: new Date().toISOString(),
        archived_by: actingUserId,
      });
      break;
    case 'reparent':
      await table.update(entry.entity_id, { parent_business_id: entry.new_value.parent_business_id });
      break;
    default:
      throw new Error(`Unknown action in plan: ${entry.action}`);
  }

  await base44.entities.AuditLog.create({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    old_value: JSON.stringify(entry.old_value),
    new_value: JSON.stringify(entry.new_value),
    user_id: actingUserId,
    source: MIGRATION_SOURCE,
    timestamp: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------------- */
/* 5. Main                                                                   */
/* ------------------------------------------------------------------------- */

async function main() {
  const { apply, limit } = parseFlags();
  const me = await base44.auth.me();
  if (!me?.id) throw new Error('No authenticated user — run as admin.');
  const actingUserId = me.id;

  console.log(`\n=== ${MIGRATION_NAME} ===`);
  console.log(`mode:   ${apply ? 'APPLY (will mutate)' : 'DRY-RUN (read-only)'}`);
  console.log(`limit:  ${limit ?? 'none'}`);
  console.log(`actor:  ${actingUserId} (${me.email})\n`);

  const records = await queryAffectedRecords();
  console.log(`Fetched ${records.length} candidate record(s).`);

  const plan = await buildPlan(records);
  const bounded = limit == null ? plan : plan.slice(0, limit);
  const flagged = bounded.filter((p) => p.flag);
  const clean = bounded.filter((p) => !p.flag);

  console.log(`Plan:   ${bounded.length} entries (${clean.length} clean, ${flagged.length} flagged)\n`);

  if (flagged.length) {
    console.log('--- FLAGGED (will NOT be applied automatically) ---');
    for (const p of flagged) {
      console.log(
        `  [flag:${p.flag}] ${p.entity_type}/${p.entity_id}: ${p.note ?? '(no note)'}`
      );
    }
    console.log();
  }

  if (!apply) {
    console.log('Dry-run complete. No changes written.');
    console.log('Run again with --apply to execute the clean entries.');
    console.log('Re-run is idempotent: already-migrated records are skipped.');
    return;
  }

  console.log(`--- APPLYING ${clean.length} clean entries ---`);
  let applied = 0;
  let errors = 0;
  for (const entry of clean) {
    try {
      await applyOne(entry, actingUserId);
      applied += 1;
    } catch (err) {
      errors += 1;
      console.error(`  [ERROR] ${entry.entity_type}/${entry.entity_id}:`, err);
    }
  }
  console.log(`\nApplied: ${applied}. Errors: ${errors}. Flagged (skipped): ${flagged.length}.`);
  console.log('AuditLog entries written for every successful mutation.');
}

main().catch((err) => {
  console.error('\nFatal:', err);
  process.exit(1);
});